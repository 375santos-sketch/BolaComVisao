import { PDF_INK, PDF_MUTED, PDF_SOFT, Rgb } from './pdfLayout';

/**
 * Pieces shared by the one-page documents (Convocatória, Pré-jogo, Plano de treino): the big facts in boxes, a note
 * with a coloured edge, and dates written for people ("Sáb 07/11").
 */

type Doc = any;

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** "Sáb 07/11" (short) or "Sábado 07/11" (long). */
export function dayLabel(iso: string, long = false): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return iso || '';
  const name = WEEKDAYS[new Date(`${iso.slice(0, 10)}T12:00:00`).getDay()];
  return `${long ? name : name.slice(0, 3)} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** A row of boxes with a small label and a big value (Dia, Hora, Concentração…). Returns the height used. */
export function factBoxes(doc: Doc, facts: [string, string][], y: number, x = 15, width = 180) {
  const gap = 3;
  const w = (width - gap * (facts.length - 1)) / facts.length;
  facts.forEach(([label, value], i) => {
    const bx = x + i * (w + gap);
    doc.setFillColor(...PDF_SOFT);
    doc.roundedRect(bx, y, w, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_MUTED);
    doc.text(label.toUpperCase(), bx + 3, y + 5);
    doc.setTextColor(...PDF_INK);
    let size = 13;
    doc.setFontSize(size);
    while (size > 8 && doc.getTextWidth(value) > w - 6) doc.setFontSize(--size);
    doc.text(value || '—', bx + 3, y + 12);
  });
  return 16;
}

/** Soft box with the club's colour on the left edge and wrapped text. Returns the height used. */
export function noteBox(doc: Doc, brand: Rgb, text: string, y: number, opts: { size?: number; bold?: boolean } = {}) {
  const size = opts.size || 10;
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, 168) as string[];
  const h = lines.length * size * 0.45 + 6;
  doc.setFillColor(...PDF_SOFT);
  doc.roundedRect(15, y, 180, h, 1.5, 1.5, 'F');
  doc.setFillColor(...brand);
  doc.rect(15, y, 1.4, h, 'F');
  doc.setTextColor(...PDF_INK);
  lines.forEach((line, i) => doc.text(line, 20, y + 4.6 + i * size * 0.45));
  return h;
}

/** "Clube vs Adversário" in big letters, the "vs" in the club's colour. Returns the height used. */
export function gameTitle(doc: Doc, brand: Rgb, home: string, away: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...PDF_INK);
  doc.text(home, 15, y + 6);
  let x = 15 + doc.getTextWidth(home) + 2;
  doc.setTextColor(...brand);
  doc.text('vs', x, y + 6);
  x += doc.getTextWidth('vs') + 2;
  doc.setTextColor(...PDF_INK);
  doc.text(away, x, y + 6);
  return 9;
}
