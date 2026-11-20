import { Response } from 'express';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { cloudinary } from '../config/cloudinary';
import { DocumentModel, IDocument } from '../models/Document';
import { PrintRequest } from '../models/PrintRequest';
import mammoth from 'mammoth';
import sanitizeHtml from 'sanitize-html';

function hasValidSignature(buffer: Buffer, ext: string) {
  if (ext === '.pdf') return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  if (ext === '.docx') return buffer.subarray(0, 4).toString('latin1') === 'PK\x03\x04';
  return false;
}

function safeFilename(name: string) {
  return path.basename(name).replace(/[^\w.\- ]/g, '_').slice(0, 150) || 'document';
}

function uploadToCloudinary(buffer: Buffer, filename: string, folder: string): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw', public_id: path.parse(filename).name + '-' + Date.now() },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

// Cloudinary is remote; cache the fetched bytes briefly so a print click is fast
// and repeated prints do not re-download the same document.
interface CacheEntry<T> { value: T; expires: number }
const bufferCache = new Map<string, CacheEntry<Buffer>>();
const htmlCache = new Map<string, CacheEntry<string>>();
const CACHE_TTL = 10 * 60 * 1000;

function remember<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL });
  if (cache.size > 30) cache.delete(cache.keys().next().value as string);
}

function recall<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

async function loadDocumentBuffer(doc: IDocument): Promise<Buffer> {
  const cached = recall<Buffer>(bufferCache, String(doc._id));
  if (cached) return cached;

  let buffer: Buffer;
  if (doc.storageUrl.startsWith('data:')) {
    buffer = Buffer.from(doc.storageUrl.split(',')[1] || '', 'base64');
  } else {
    const response = await fetch(doc.storageUrl);
    if (!response.ok) throw new AppError('Could not load the stored document', 502);
    buffer = Buffer.from(await response.arrayBuffer());
  }
  remember(bufferCache, String(doc._id), buffer);
  return buffer;
}

async function findPrintable(id: string, user: { id: string; role: string }) {
  const doc = await DocumentModel.findById(id);
  if (!doc) throw new AppError('Document not found', 404);
  if (user.role === 'TEACHER' && doc.teacherId.toString() !== user.id) throw new AppError('Forbidden', 403);
  return doc;
}

export const uploadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError('File is required', 400);
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!hasValidSignature(req.file.buffer, ext)) {
    throw new AppError('File content does not match a valid PDF or DOCX document', 400);
  }
  const fileType = ext === '.pdf' ? 'PDF' : 'DOCX';
  const originalName = safeFilename(req.file.originalname);

  let storageUrl = '';
  let storagePublicId = '';
  // Cloudinary is required in production; the data-URL fallback is for local
  // development only (Render's filesystem is ephemeral).
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    const uploaded = await uploadToCloudinary(req.file.buffer, originalName, 'schoolprint');
    storageUrl = uploaded.url;
    storagePublicId = uploaded.publicId;
  } else {
    storageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    storagePublicId = `local-${Date.now()}`;
  }

  const doc = await DocumentModel.create({
    teacherId: req.user!.id,
    originalName,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storageUrl,
    storagePublicId,
    fileType,
  });
  res.status(201).json(ok({ id: doc._id, originalName: doc.originalName, fileType: doc.fileType, size: doc.size, storageUrl: doc.storageUrl }, 'Document uploaded'));
});

export const getDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const doc = await findPrintable(req.params.id, req.user!);
  res.json(ok(doc));
});

export const downloadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const doc = await findPrintable(req.params.id, req.user!);
  const buffer = await loadDocumentBuffer(doc);
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(doc.originalName)}"`);
  res.send(buffer);
});

/**
 * Same-origin inline document stream. Using a same-origin URL lets the browser
 * print the PDF directly from an iframe (cross-origin Cloudinary URLs cannot be
 * scripted for printing).
 */
export const getDocumentFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const doc = await findPrintable(req.params.id, req.user!);
  const buffer = await loadDocumentBuffer(doc);
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename(doc.originalName)}"`);
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.send(buffer);
});

/**
 * DOCX cannot be rendered natively in a browser. Convert it once to sanitized
 * HTML so the officer can print it with the same one-click flow as a PDF.
 */
export const getDocumentPrintHtml = asyncHandler(async (req: AuthRequest, res: Response) => {
  const doc = await findPrintable(req.params.id, req.user!);
  if (doc.fileType !== 'DOCX') throw new AppError('This endpoint is for DOCX documents', 400);

  const cached = recall<string>(htmlCache, String(doc._id));
  if (cached) {
    res.json(ok({ html: cached }));
    return;
  }

  const buffer = await loadDocumentBuffer(doc);
  const converted = await mammoth.convertToHtml({ buffer });
  const html = sanitizeHtml(converted.value, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'table', 'thead', 'tbody', 'tr', 'th', 'td']),
    allowedAttributes: { a: ['href'], img: ['src', 'alt', 'width', 'height'] },
    allowedSchemes: ['http', 'https', 'data'],
  });
  remember(htmlCache, String(doc._id), html);
  res.json(ok({ html, warnings: converted.messages.map((m) => m.message) }));
});
