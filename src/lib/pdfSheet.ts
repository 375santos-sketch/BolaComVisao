import { Exercise } from '../types';
import { cleanPrintExercises } from './printExercise';
import { uid } from './utils';

/**
 * 📄 Fichas PDF: the exercise sheets imported in the old Biblioteca de PDFs stayed in the browser of the device they
 * were imported on (IndexedDB, never in the cloud). Each page is read by the AI, which finds every exercise on it:
 * each one goes to the library with only its own drawing (cut from the page) and its own explanation.
 */

/** Pages read from a sheet, at most (a long manual is read in its first pages). */
const MAX_SHEET_PAGES = 15;

/** The exercises of one page (the AI's answer cleaned), each with its drawing cut from the page by `crop`. */
export async function pageExercises(
  answer: unknown,
  page: number,
  pdfId: string | undefined,
  crop: (box: { x: number; y: number; w: number; h: number }) => Promise<string | undefined>,
  now = new Date().toISOString()
): Promise<Exercise[]> {
  const out: Exercise[] = [];
  for (const read of cleanPrintExercises(answer)) {
    const image = read.drawing ? await crop(read.drawing).catch(() => undefined) : undefined;
    out.push({
      id: uid(),
      name: read.name,
      category: read.category,
      durationMinutes: read.durationMinutes || 15,
      createdAt: now,
      objective: read.objective || '',
      ...(read.description ? { description: read.description } : {}),
      ...(read.material ? { material: read.material } : {}),
      ...(image ? { image } : {}),
      ...(pdfId ? { fromPdfId: pdfId } : {}),
      fromPdfPage: page
    });
  }
  return out;
}

/** The library with a sheet's new exercises in place of what had been made from it before. */
export function replaceSheetExercises(library: Exercise[], pdfId: string | undefined, made: Exercise[]): Exercise[] {
  return [...library.filter((e) => !pdfId || e.fromPdfId !== pdfId), ...made];
}

/** Whether a sheet is already in the library, split into its exercises (the first version kept whole pages). */
export const sheetDone = (library: Exercise[], pdfId: string) =>
  library.some((e) => e.fromPdfId === pdfId && e.fromPdfPage !== undefined);

const dataBytes = (dataUrl: string) => {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

/** Each page of a PDF (data URL) as a JPEG sharp enough for the AI to read and to cut the drawings from. */
export async function pdfPageImages(fileData: string, onPage?: (page: number, pages: number) => void) {
  const { loadPdfjs } = await import('./pdfjs');
  const { compressImageSource } = await import('./imageCompress');
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: dataBytes(fileData) }).promise;
  try {
    const pages = Math.min(pdf.numPages, MAX_SHEET_PAGES);
    const images: string[] = [];
    for (let n = 1; n <= pages; n++) {
      onPage?.(n, pages);
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(4, 2000 / Math.max(base.width, base.height)) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível preparar a página.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      images.push(await compressImageSource(canvas.toDataURL('image/jpeg', 0.92), 1800, 600_000));
    }
    return images;
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
