import type { jsPDF } from 'jspdf';
import { AppState } from '../../types';
import { SignatureDoc, signatureFor } from '../signature';
import { PDF_MUTED } from './pdfLayout';

/** The coach's signature above a signing line centred on `x` (only when the coach chose this kind of document). */
export function drawSignatureOnLine(
  doc: jsPDF,
  state: AppState,
  kind: SignatureDoc,
  x: number,
  lineY: number
): boolean {
  const image = signatureFor(state, kind);
  if (!image) return false;
  try {
    doc.addImage(image, 'PNG', x - 24, lineY - 16, 48, 16);
    return true;
  } catch {
    return false;
  }
}

/** A signing block at the end of a report (signature, line, name): returns the new y, on a new page if needed. */
export function drawSignatureBlock(doc: jsPDF, state: AppState, kind: SignatureDoc, y: number): number {
  if (!signatureFor(state, kind)) return y;
  let top = y + 4;
  if (top + 28 > 280) {
    doc.addPage();
    top = 24;
  }
  const lineY = top + 20;
  drawSignatureOnLine(doc, state, kind, 165, lineY);
  doc.setDrawColor(170, 180, 190);
  doc.setLineWidth(0.3);
  doc.line(135, lineY, 195, lineY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_MUTED);
  doc.text(`${state.currentUser?.name || 'O treinador'} · Treinador`, 165, lineY + 5, { align: 'center' });
  return lineY + 8;
}
