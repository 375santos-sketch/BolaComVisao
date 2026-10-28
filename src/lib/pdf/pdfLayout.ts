import { AppState, Player } from '../../types';
import { defaultSeason } from '../utils';
import { teamSettings } from '../teamSettings';
import { inkFor, shade } from '../clubColors';

export async function getJsPDF() {
  const mod = await import('jspdf');
  return mod.default || (mod as any).jsPDF || mod;
}

type jsPDF = any;

export type Rgb = [number, number, number];

const hexRgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Colours of the printed documents: the club's colour (a little darker when it is light, to read on paper). */
export const PDF_INK: Rgb = [20, 32, 46];
export const PDF_MUTED: Rgb = [95, 111, 128];
export const PDF_LINE: Rgb = [221, 227, 234];
export const PDF_SOFT: Rgb = [245, 247, 250];

export function pdfBrand(state: Pick<AppState, 'teams' | 'activeTeamId'>): Rgb {
  const hex = teamSettings(state).clubColor;
  return hexRgb(inkFor(hex) === '#ffffff' ? hex : shade(hex, -0.3));
}

/** "RELATÓRIO MENSAL" → "Relatório mensal" (titles are written in normal case on the page). */
const sentence = (text: string) =>
  text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLocaleLowerCase('pt-PT') : text;

/** The club's symbol, or a round badge in the club's colour with its initial. */
function drawClubEmblem(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  clubName: string,
  brand: Rgb,
  logoUrl?: string
) {
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, x, y, size, size);
      return;
    } catch (e) {
      console.warn('Could not render club logo image:', e);
    }
  }
  doc.setFillColor(...brand);
  doc.circle(x + size / 2, y + size / 2, size / 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.85);
  doc.text((clubName.trim()[0] || 'C').toUpperCase(), x + size / 2, y + size / 2 + size * 0.15, { align: 'center' });
}

/**
 * Top of every document, light to print: the club's symbol, the title, "Clube · Escalão · Época" and the date, over a
 * thin line in the club's colour. Content starts below y = 40.
 */
export function drawDocumentHeader(doc: jsPDF, state: AppState, title: string, subtitle?: string) {
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O Meu Clube';
  const brand = pdfBrand(state);

  drawClubEmblem(doc, 15, 10, 17, myClub, brand, state.clubLogoUrl);

  doc.setTextColor(...PDF_INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(sentence(title), 37, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_MUTED);
  const line = [myClub, state.category, `Época ${state.season || defaultSeason()}`, subtitle]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(doc.splitTextToSize(line, 125)[0], 37, 25.5);

  doc.setFontSize(7.5);
  doc.text(`Emitido a ${new Date().toLocaleDateString('pt-PT')}`, 195, 19, { align: 'right' });

  doc.setDrawColor(...brand);
  doc.setLineWidth(0.8);
  doc.line(15, 31, 195, 31);
  doc.setLineWidth(0.2);
}

/** Section title: small capitals in the club's colour over a thin grey line. Returns the height used (mm). */
export function drawSectionTitle(doc: jsPDF, brand: Rgb, text: string, x: number, y: number, width: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...brand);
  doc.text(text.toUpperCase(), x, y + 3.5);
  doc.setDrawColor(...PDF_LINE);
  doc.setLineWidth(0.3);
  doc.line(x, y + 5.3, x + width, y + 5.3);
  return 8.5;
}

/**
 * Draws Player Avatar / Photo in PDF tables
 */
export function drawPlayerAvatar(doc: jsPDF, player: Player, x: number, y: number, size: number = 7.5) {
  let photoDrawn = false;
  if (player.photoUrl && player.photoUrl.trim()) {
    try {
      doc.addImage(player.photoUrl, x, y, size, size);
      photoDrawn = true;
      doc.saveGraphicsState();
      doc.setDrawColor(180, 210, 230);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, size, size, 1, 1, 'S');
      doc.restoreGraphicsState();
    } catch (_e) {
      photoDrawn = false;
    }
  }

  if (!photoDrawn) {
    doc.saveGraphicsState();
    doc.setFillColor(235, 243, 250);
    doc.roundedRect(x, y, size, size, 1, 1, 'F');
    doc.setDrawColor(190, 215, 235);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, size, size, 1, 1, 'S');

    const initials = (player.name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size > 8 ? 6.5 : 5.5);
    doc.setTextColor(0, 130, 200);
    doc.text(initials || String(player.number || 'J'), x + size / 2, y + size * 0.68, { align: 'center' });
    doc.restoreGraphicsState();
  }
}

/** Footer of every page: "BolaComVisão" and the page number, small, over a thin line. */
export function addBolaComVisaoPageFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PDF_LINE);
    doc.setLineWidth(0.3);
    doc.line(15, 285, 195, 285);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 162, 175);
    doc.text('BolaComVisão', 15, 289);
    doc.text(`Página ${i} de ${pageCount}`, 195, 289, { align: 'right' });
  }
}

/**
 * Simple top-to-bottom writer for text reports (section headings, wrapped paragraphs and bullet lists), with page
 * breaks. No emojis: the PDF fonts cannot draw them.
 */
export function createTextReportWriter(doc: jsPDF, startY: number, brand: Rgb = [14, 116, 144]) {
  const left = 14;
  const width = 182;
  let y = startY;
  const ensure = (h: number) => {
    if (y + h > 280) {
      doc.addPage();
      y = 18;
    }
  };
  const writer = {
    get y() {
      return y;
    },
    /** Starts a new page when the next h mm do not fit (for drawings placed at writer.y). */
    ensure,
    skip(mm: number) {
      y += mm;
    },
    centered(text: string, opts: { size: number; bold?: boolean; color?: [number, number, number] }) {
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(opts.size);
      doc.setTextColor(...(opts.color || [15, 23, 42]));
      doc.text(text, 105, y, { align: 'center' });
      y += opts.size * 0.5;
    },
    heading(text: string) {
      ensure(14);
      y += 2;
      y += drawSectionTitle(doc, brand, text, left, y - 4.5, width) - 2;
    },
    paragraph(text: string) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      (doc.splitTextToSize(text, width - 4) as string[]).forEach((line) => {
        ensure(5);
        doc.text(line, left + 2, y);
        y += 4.8;
      });
      y += 2;
    },
    list(items?: string[], numbered = false) {
      const clean = (items || []).filter((s) => s && s.trim());
      if (clean.length === 0) writer.paragraph('—');
      else clean.forEach((s, i) => writer.paragraph(`${numbered ? `${i + 1}.` : '•'}  ${s}`));
    }
  };
  return writer;
}
