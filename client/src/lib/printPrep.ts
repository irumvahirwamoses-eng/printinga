import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import { documentUrl } from './print';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/** Points (1/72 inch) for the paper sizes a teacher can request. */
const PAPER_POINTS: Record<string, [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
};

/** Guard against runaway output (a teacher could ask for 200 pages x 50 copies). */
const MAX_PREPARED_PAGES = 160;
const MAX_PREPARED_COPIES = 30;
const MARGIN_PT = 24;

export interface PrintSettings {
  paperSize: string;
  orientation: string;
  copies: number;
  printingType: string;
  pageSelection: string;
  pageRange?: string;
  sides?: string;
  numberOfPages?: number;
}

export interface PreparedPrintInfo {
  prepared: boolean;
  pageCount: number;
  sourcePageCount: number;
  selectedPages: number[];
  copies: number;
  grayscale: boolean;
  paperSize: string;
  orientation: string;
  duplexRequested: boolean;
  note: string;
}

export interface PreparedPrint extends PreparedPrintInfo {
  blob: Blob;
}

/** Turns "1-3, 5, 8-9" into a sorted, de-duplicated, in-bounds list. */
export function parsePageRange(input: string | undefined, pageCount: number): number[] {
  if (!input?.trim()) return [];
  const pages = new Set<number>();
  for (const chunk of input.split(',')) {
    const part = chunk.trim();
    if (!part) continue;
    const match = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!match) continue;
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    const from = Math.max(1, Math.min(start, end));
    const to = Math.min(pageCount, Math.max(start, end));
    for (let p = from; p <= to; p += 1) pages.add(p);
  }
  return [...pages].sort((a, b) => a - b);
}

function targetSize(paperSize: string, orientation: string, fallback: [number, number]): [number, number] {
  const base = PAPER_POINTS[paperSize] || fallback;
  const landscape = orientation === 'LANDSCAPE';
  const [w, h] = base;
  return landscape
    ? [Math.max(w, h), Math.min(w, h)]
    : [Math.min(w, h), Math.max(w, h)];
}

/**
 * Builds a print-ready PDF with the request settings already applied:
 * selected pages, one image per requested copy, black & white where asked,
 * and the requested paper size/orientation. The officer only has to leave the
 * native dialog's Copies at 1 and press Print.
 */
export async function preparePdfForPrint(documentId: string, settings: PrintSettings): Promise<PreparedPrint> {
  const response = await fetch(documentUrl(documentId, 'file'), { credentials: 'include' });
  if (!response.ok) throw new Error('Could not load the document for printing');

  const source = new Uint8Array(await response.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: source }).promise;
  const sourcePageCount = pdf.numPages;

  const parsed = settings.pageSelection === 'CUSTOM'
    ? parsePageRange(settings.pageRange, sourcePageCount)
    : [];
  const selectedPages = parsed.length ? parsed : Array.from({ length: sourcePageCount }, (_, i) => i + 1);
  const copies = Math.max(1, Math.min(MAX_PREPARED_COPIES, Number(settings.copies) || 1));
  if (selectedPages.length * copies > MAX_PREPARED_PAGES) {
    throw new Error(`This print job would create ${selectedPages.length * copies} pages. Reduce the copies or page range.`);
  }

  const grayscale = settings.printingType === 'BLACK_AND_WHITE';
  const duplexRequested = settings.sides === 'DOUBLE';
  const firstViewport = (await pdf.getPage(selectedPages[0])).getViewport({ scale: 1 });
  const [pageWidth, pageHeight] = targetSize(settings.paperSize, settings.orientation, [firstViewport.width, firstViewport.height]);
  const boxWidth = Math.max(50, pageWidth - MARGIN_PT * 2);
  const boxHeight = Math.max(50, pageHeight - MARGIN_PT * 2);

  const output = await PDFDocument.create();
  output.setTitle('SchoolPrint - prepared for printing');
  output.setProducer('SchoolPrint');

  for (const pageNumber of selectedPages) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    // Render at roughly 2x the target size so printed text stays sharp.
    const scale = Math.min(boxWidth / baseViewport.width, boxHeight / baseViewport.height) * 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not prepare the document for printing');
    if (grayscale) ctx.filter = 'grayscale(1)';
    await page.render({ canvasContext: ctx as any, viewport }).promise;

    const base64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1] || '';
    const imageBytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const image = await output.embedJpg(imageBytes);
    const drawWidth = Math.min(boxWidth, (viewport.width / 2));
    const drawHeight = Math.min(boxHeight, (viewport.height / 2));
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    for (let copy = 0; copy < copies; copy += 1) {
      const printPage = output.addPage([pageWidth, pageHeight]);
      printPage.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
    }
    page.cleanup();
  }

  const bytes = await output.save({ useObjectStreams: true });
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const note = duplexRequested
    ? 'Pages, copies, colour and paper are prepared. Keep Copies = 1 and Pages = All in the dialog, and choose Double-sided there (browsers cannot set duplex).'
    : 'Pages, copies, colour and paper are prepared. Keep Copies = 1 and Pages = All in the dialog, then press Print.';

  return {
    blob,
    prepared: true,
    pageCount: selectedPages.length * copies,
    sourcePageCount,
    selectedPages,
    copies,
    grayscale,
    paperSize: settings.paperSize,
    orientation: settings.orientation,
    duplexRequested,
    note,
  };
}
