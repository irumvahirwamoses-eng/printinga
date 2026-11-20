import multer from 'multer';
import path from 'path';
import { AppError } from './errorHandler';

const ALLOWED = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(file.mimetype) || !['.pdf', '.docx'].includes(ext)) {
      return cb(new AppError('Only PDF and DOCX files are allowed', 400));
    }
    cb(null, true);
  },
});
