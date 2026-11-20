import api from './api';
import type { PreparedPrint, PreparedPrintInfo, PrintSettings } from './printPrep';

export interface PrintDocumentOptions extends PrintSettings {
  documentId: string;
  fileType: 'PDF' | 'DOCX';
}

/** Builds a same-origin document URL from the configured API base. */
export function documentUrl(documentId: string, action: 'file' | 'download') {
  const apiBase = (api.defaults.baseURL || '/api').replace(/\/$/, '');
  return `${apiBase}/documents/${documentId}/${action}`;
}

function applyPageSettings(paperSize: string, orientation: string) {
  let style = document.getElementById('schoolprint-page-style') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'schoolprint-page-style';
    document.head.appendChild(style);
  }
  const size = ['A3', 'A4', 'A5'].includes(paperSize) ? paperSize : 'A4';
  style.textContent = `@page { size: ${size} ${orientation.toLowerCase()}; margin: 12mm; }`;
}

function getStage() {
  let stage = document.getElementById('schoolprint-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.id = 'schoolprint-stage';
    stage.className = 'print-stage';
    document.body.appendChild(stage);
  }
  return stage;
}

function waitForAfterPrint(extraTargets: EventTarget[] = []) {
  return new Promise<void>((resolve) => {
    const targets = [window, ...extraTargets];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      targets.forEach((target) => target.removeEventListener('afterprint', finish));
      resolve();
    };
    targets.forEach((target) => target.addEventListener('afterprint', finish));
    // The dialog blocks script execution, so this only runs after it closes.
    window.setTimeout(finish, 120000);
  });
}

async function printPdfBlob(stage: HTMLElement, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.className = 'print-frame';
  iframe.title = 'Document to print';
  iframe.src = url;
  stage.appendChild(iframe);

  await new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
    window.setTimeout(resolve, 12000);
  });

  const frameWindow = iframe.contentWindow;
  const finished = waitForAfterPrint(frameWindow ? [frameWindow] : []);
  try {
    if (frameWindow) {
      frameWindow.focus();
      frameWindow.print();
    } else {
      window.print();
    }
  } catch {
    window.print();
  }
  await finished;
  iframe.remove();
  URL.revokeObjectURL(url);
}

async function printOriginalPdf(stage: HTMLElement, documentId: string) {
  const iframe = document.createElement('iframe');
  iframe.className = 'print-frame';
  iframe.title = 'Document to print';
  iframe.src = documentUrl(documentId, 'file');
  stage.appendChild(iframe);

  await new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
    window.setTimeout(resolve, 12000);
  });

  const frameWindow = iframe.contentWindow;
  const finished = waitForAfterPrint(frameWindow ? [frameWindow] : []);
  try {
    if (frameWindow) {
      frameWindow.focus();
      frameWindow.print();
    } else {
      window.print();
    }
  } catch {
    window.print();
  }
  await finished;
  iframe.remove();
}

async function printDocx(stage: HTMLElement, options: PrintDocumentOptions): Promise<PreparedPrintInfo> {
  const { data } = await api.get(`/documents/${options.documentId}/print-html`);
  const html = data.data.html || '';
  const copies = Math.max(1, Math.min(30, Number(options.copies) || 1));
  const grayscale = options.printingType === 'BLACK_AND_WHITE';

  const container = document.createElement('div');
  container.className = 'docx-print-body';
  for (let i = 0; i < copies; i += 1) {
    const copy = document.createElement('div');
    copy.className = i < copies - 1 ? 'docx-print-copy docx-page-break' : 'docx-print-copy';
    copy.innerHTML = html;
    container.appendChild(copy);
  }
  stage.appendChild(container);

  document.body.classList.add('print-active');
  if (grayscale) document.body.classList.add('bw-print');
  const finished = waitForAfterPrint();
  try {
    window.print();
  } finally {
    await finished;
    container.remove();
    document.body.classList.remove('print-active', 'bw-print');
  }

  return {
    prepared: true,
    pageCount: (options.numberOfPages || 1) * copies,
    sourcePageCount: options.numberOfPages || 1,
    selectedPages: [],
    copies,
    grayscale,
    paperSize: options.paperSize,
    orientation: options.orientation,
    duplexRequested: options.sides === 'DOUBLE',
    note: grayscale
      ? 'Black & white and copies are prepared. In the dialog keep Copies = 1, choose Double-sided if needed, and press Print.'
      : 'Copies and paper size are prepared. In the dialog keep Copies = 1, choose Double-sided if needed, and press Print.',
  };
}

/**
 * Opens the browser print dialog with the document already loaded and the
 * request settings baked into the print output. Resolves when the dialog
 * closes, with details about what was applied.
 *
 * Browsers still require a human confirmation in the native dialog; copies,
 * pages and colour are embedded in the prepared file so the officer does not
 * have to type them in.
 */
export async function printDocument(options: PrintDocumentOptions): Promise<PreparedPrintInfo> {
  applyPageSettings(options.paperSize, options.orientation);
  const stage = getStage();

  if (options.fileType === 'DOCX') {
    return printDocx(stage, options);
  }

  let prepared: PreparedPrint | null = null;
  try {
    // Load the PDF libraries only when an officer actually prints, so the
    // normal app bundle stays small.
    const { preparePdfForPrint } = await import('./printPrep');
    prepared = await preparePdfForPrint(options.documentId, options);
  } catch (err) {
    // Never block printing because preparation failed (encrypted PDF, very
    // large job, unsupported canvas). The original document still prints.
    console.warn('Print preparation fell back to the original document:', err);
  }

  if (prepared) {
    await printPdfBlob(stage, prepared.blob);
    return prepared;
  }

  await printOriginalPdf(stage, options.documentId);
  return {
    prepared: false,
    pageCount: options.numberOfPages || 0,
    sourcePageCount: options.numberOfPages || 0,
    selectedPages: [],
    copies: options.copies,
    grayscale: options.printingType === 'BLACK_AND_WHITE',
    paperSize: options.paperSize,
    orientation: options.orientation,
    duplexRequested: options.sides === 'DOUBLE',
    note: 'Settings could not be embedded automatically. Check pages, copies and colour in the dialog before printing.',
  };
}
