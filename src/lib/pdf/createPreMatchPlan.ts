import { AppState, ScheduledMatch } from '../../types';
import {
  getJsPDF,
  drawDocumentHeader,
  addBolaComVisaoPageFooters,
  drawSectionTitle,
  pdfBrand,
  PDF_INK,
  PDF_MUTED,
  PDF_SOFT
} from './pdfLayout';
import { dayLabel, gameTitle } from './pdfBlocks';
import { competitionLabel, dateLabel } from '../preMatchPlan';
import { previousReports } from '../opponentReport';
import { shortName, slotPositions, systemLines } from '../startingLineup';

/**
 * PDF of the Pré-jogo plan, one page for the dressing room: the motto big, the system drawn on a pitch, the
 * objectives numbered and "com bola / sem bola" side by side.
 */
export async function buildPreMatchPlanPDF(game: ScheduledMatch, state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const p = game.preMatchPlan || {};
  const club = state.myClubName || 'A nossa equipa';
  const brand = pdfBrand(state);
  const away = game.location === 'fora';

  drawDocumentHeader(doc, state, 'Pré-jogo');
  let y = 38;
  y += gameTitle(doc, brand, away ? game.opponent : club, away ? club : game.opponent, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_MUTED);
  const details = [
    dayLabel(game.date, true),
    game.time,
    away ? 'Fora' : 'Casa',
    game.venue,
    competitionLabel(game),
    game.meetingTime || game.meetingPoint
      ? `Concentração ${[game.meetingTime, game.meetingPoint].filter(Boolean).join(' · ')}`
      : ''
  ].filter(Boolean);
  (doc.splitTextToSize(details.join('  ·  '), 180) as string[]).forEach((line) => {
    doc.text(line, 15, y + 3);
    y += 4.5;
  });
  y += 4;

  if (p.motto) {
    doc.setFillColor(...brand);
    doc.roundedRect(15, y, 180, 15, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    let size = 17;
    doc.setFontSize(size);
    const motto = `“${p.motto.trim()}”`;
    while (size > 10 && doc.getTextWidth(motto) > 170) doc.setFontSize(--size);
    doc.text(motto, 105, y + 9.8, { align: 'center' });
    y += 21;
  }

  // System on a small pitch (left) and the objectives (right)
  const objectives = (p.objectives || []).filter((o) => o && o.trim());
  const hasSystem = Boolean(p.system && p.system.trim());
  const colX = hasSystem ? 80 : 15;
  const colW = hasSystem ? 115 : 180;
  let left = y;
  if (hasSystem) {
    const size =
      (p.system || '')
        .split(/[^0-9]+/)
        .filter(Boolean)
        .map(Number)
        .reduce((a, b) => a + b, 0) + 1;
    const lines = systemLines(p.system, size);
    left += drawSectionTitle(doc, brand, `Sistema ${lines.join('-')}`, 15, left, 58);
    const px = 15;
    const pw = 58;
    const ph = 78;
    doc.setFillColor(233, 245, 236);
    doc.setDrawColor(156, 207, 169);
    doc.setLineWidth(0.5);
    doc.roundedRect(px, left, pw, ph, 3, 3, 'FD');
    doc.line(px, left + ph / 2, px + pw, left + ph / 2);
    doc.circle(px + pw / 2, left + ph / 2, 7, 'S');
    doc.rect(px + pw / 2 - 12, left + ph - 11, 24, 11, 'S');
    const players = new Map((state.roster || []).map((pl) => [pl.id, pl]));
    const slots = game.startingLineup?.slots?.length === size ? game.startingLineup.slots : [];
    slotPositions(lines).forEach((pos, i) => {
      const cx = px + 6 + pos.x * (pw - 12);
      const cy = left + 5 + pos.y * (ph - 10);
      doc.setFillColor(...brand);
      doc.circle(cx, cy, 3.2, 'F');
      const pl = slots[i] ? players.get(slots[i] as string) : undefined;
      if (pl) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(...PDF_INK);
        doc.text(shortName(pl), cx, cy + 6, { align: 'center' });
      }
    });
    left += ph + 4;
  }

  let right = y;
  right += drawSectionTitle(doc, brand, 'Objetivos', colX, right, colW);
  if (objectives.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_MUTED);
    doc.text('—', colX, right + 4);
    right += 8;
  }
  objectives.forEach((o, i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const text = doc.splitTextToSize(o, colW - 12) as string[];
    doc.setFillColor(...brand);
    doc.circle(colX + 3.5, right + 4, 3.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(String(i + 1), colX + 3.5, right + 5.2, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(...PDF_INK);
    text.forEach((line, k) => doc.text(line, colX + 10, right + 5.3 + k * 5.4));
    right += Math.max(10, text.length * 5.4 + 4.5);
  });
  y = Math.max(left, right) + 4;

  // With / without the ball, side by side
  const box = (title: string, color: [number, number, number], text: string, x: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(text || '—', 80) as string[];
    return {
      lines,
      draw: (h: number) => {
        doc.setFillColor(...PDF_SOFT);
        doc.roundedRect(x, y, 88, h, 2, 2, 'F');
        doc.setFillColor(...color);
        doc.rect(x, y, 88, 1.3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...color);
        doc.text(title.toUpperCase(), x + 4, y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(...PDF_INK);
        lines.forEach((line, k) => doc.text(line, x + 4, y + 13 + k * 4.8));
      }
    };
  };
  const withBall = box('Com bola', [16, 150, 105], p.withBall || '', 15);
  const withoutBall = box('Sem bola', [205, 45, 45], p.withoutBall || '', 107);
  const h = Math.max(withBall.lines.length, withoutBall.lines.length) * 4.8 + 16;
  withBall.draw(h);
  withoutBall.draw(h);
  y += h + 6;

  const section = (title: string, text: string) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    y += drawSectionTitle(doc, brand, title, 15, y, 180);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_INK);
    (doc.splitTextToSize(text, 180) as string[]).forEach((line) => {
      if (y > 278) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 15, y + 3);
      y += 4.8;
    });
    y += 4;
  };
  const last = previousReports(state.matches || [], game.opponent, game.date)[0];
  if (last?.opponentReport?.nextTime) {
    section(`Da última vez contra eles (${dateLabel(last.date)})`, last.opponentReport.nextTime);
  }
  if (p.notes) section('Notas', p.notes);

  addBolaComVisaoPageFooters(doc);
  return doc;
}

export async function generatePreMatchPlanPDF(game: ScheduledMatch, state: AppState) {
  const doc = await buildPreMatchPlanPDF(game, state);
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`PreJogo_${safe(game.opponent)}_${game.date}.pdf`);
}
