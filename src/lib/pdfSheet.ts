import { Exercise, ExerciseCategory } from '../types';
import { PDFDocumentItem } from './pdfLibraryDB';
import { uid } from './utils';

/**
 * 📄 Fichas PDF: the exercise sheets imported in the old Biblioteca de PDFs stayed in the browser of the device they
 * were imported on (IndexedDB, never in the cloud). Each one becomes an exercise of the library: the first page as its
 * picture and the sheet's text as its explanation, so it reaches every device and the session plans.
 */

const CATEGORIES: ExerciseCategory[] = ['aquecimento', 'tecnica', 'tatica', 'fisico', 'jogo', 'bolas_paradas'];

/** Most of the explanation a sheet keeps (the library form shows it whole). */
const MAX_TEXT = 4000;

/** The text read from a PDF, tidied: one space between words, paragraphs kept, page numbers and blank lines out. */
export function sheetText(raw: string): string {
  return (raw || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter((l) => l && !/^(p[áa]g(ina)?\.?\s*)?\d{1,3}(\s*(\/|de)\s*\d{1,3})?$/i.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, MAX_TEXT)
    .trim();
}

/** "Rondo_4x2-v2.pdf" → "Rondo 4x2 v2" (the title the coach gave wins). */
export function sheetName(doc: Pick<PDFDocumentItem, 'title' | 'fileName'>): string {
  const name = (doc.title || doc.fileName || '')
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  return name.trim().slice(0, 80) || 'Ficha PDF';
}

/** The exercise made from a sheet (picture and text already read from the PDF). */
export function sheetExercise(
  doc: Pick<PDFDocumentItem, 'id' | 'title' | 'fileName' | 'category' | 'description'>,
  read: { image?: string; text?: string },
  now = new Date().toISOString()
): Exercise {
  const text = sheetText(read.text || '');
  const name = sheetName(doc);
  // The card shows the coach's note, or else the sheet's first line that is not its title
  const firstLine = text.split('\n').find((l) => l.toLowerCase() !== name.toLowerCase()) || '';
  const objective = ((doc.description || '').trim() || firstLine).slice(0, 160);
  return {
    id: uid(),
    name,
    category: CATEGORIES.includes(doc.category as ExerciseCategory) ? (doc.category as ExerciseCategory) : 'tecnica',
    durationMinutes: 15,
    createdAt: now,
    objective,
    ...(text ? { description: text } : {}),
    ...(read.image ? { image: read.image } : {}),
    fromPdfId: doc.id
  };
}

const dataBytes = (dataUrl: string) => {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

/** Reads a PDF (data URL): its first page as a small JPEG and the text of its first pages. */
export async function readPdfSheet(fileData: string): Promise<{ image?: string; text: string }> {
  const { loadPdfjs } = await import('./pdfjs');
  const { compressImageSource } = await import('./imageCompress');
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: dataBytes(fileData) }).promise;
  try {
    const texts: string[] = [];
    for (let n = 1; n <= Math.min(pdf.numPages, 4); n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      let line = '';
      for (const item of content.items as Array<{ str?: string; hasEOL?: boolean }>) {
        line += item.str || '';
        if (item.hasEOL) line += '\n';
        else if (item.str) line += ' ';
      }
      texts.push(line);
    }
    let image: string | undefined;
    try {
      const page = await pdf.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(3, 1400 / Math.max(base.width, base.height)) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        image = await compressImageSource(canvas.toDataURL('image/jpeg', 0.9), 1200, 220_000);
      }
    } catch (err) {
      console.warn('Imagem da ficha PDF:', err); // the text alone is still worth keeping
      image = undefined;
    }
    return { image, text: texts.join('\n') };
  } finally {
    pdf.cleanup();
  }
}

/** A PDF chosen now (File) as a data URL, to read it like the old sheets. */
export const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o ficheiro.'));
    reader.readAsDataURL(file);
  });
