import { AppState, Player } from '../../types';
import { defaultSeason } from '../utils';
import { APP, PdfTheme, Rgb, applyPdfTheme } from './pdfTheme';

export type { Rgb } from './pdfTheme';

/**
 * jsPDF with the app's look: navy pages and the app's colours (see pdfTheme). The training plan, written on by hand,
 * asks for the 'light' version.
 */
export async function getJsPDF(theme: PdfTheme = 'dark') {
  const mod = await import('jspdf');
  const Base = mod.default || (mod as any).jsPDF || mod;
  return class ThemedPDF extends (Base as any) {
    constructor(...args: any[]) {
      super(...args);
      applyPdfTheme(this, theme);
    }
  } as any;
}

type jsPDF = any;

/** Colours of the documents: the app's own (navy surfaces, light text, cyan accent). */
export const PDF_INK: Rgb = APP.text;
export const PDF_MUTED: Rgb = APP.muted;
export const PDF_LINE: Rgb = APP.line;
export const PDF_SOFT: Rgb = APP.surface;

/** The accent of the documents: the app's cyan (the same for every club, like the app). */
export function pdfBrand(_state?: Pick<AppState, 'teams' | 'activeTeamId'>): Rgb {
  return APP.brand;
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
  doc.setTextColor(...APP.brandInk);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.85);
  doc.text((clubName.trim()[0] || 'C').toUpperCase(), x + size / 2, y + size / 2 + size * 0.15, { align: 'center' });
}

/**
 * Top of every document, like the app's header: "BOLACOMVISÃO" in cyan, the club's symbol, the title, "Clube · Escalão ·
 * Época" and the date in a pill, over a thin line with a cyan start. Content starts below y = 38.
 */
export function drawDocumentHeader(doc: jsPDF, state: AppState, title: string, subtitle?: string) {
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O Meu Clube';
  const brand = pdfBrand(state);

  drawClubEmblem(doc, 15, 10, 17, myClub, brand, state.clubLogoUrl);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...brand);
  doc.text('BOLACOMVISÃO', 37, 11.5, { charSpace: 0.6 });

  doc.setTextColor(...PDF_INK);
  doc.setFontSize(19);
  doc.text(sentence(title), 37, 19.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_MUTED);
  const line = [myClub, state.category, `Época ${state.season || defaultSeason()}`, subtitle]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(doc.splitTextToSize(line, 118)[0], 37, 26);

  const issued = `Emitido a ${new Date().toLocaleDateString('pt-PT')}`;
  doc.setFontSize(7.5);
  const pillW = doc.getTextWidth(issued) + 7;
  doc.setFillColor(...APP.surface2);
  doc.setDrawColor(...PDF_LINE);
  doc.setLineWidth(0.25);
  doc.roundedRect(195 - pillW, 14.5, pillW, 6.5, 3.25, 3.25, 'FD');
  doc.setTextColor(...PDF_MUTED);
  doc.text(issued, 195 - pillW / 2, 18.8, { align: 'center' });

  doc.setDrawColor(...PDF_LINE);
  doc.setLineWidth(0.3);
  doc.line(15, 31, 195, 31);
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.9);
  doc.line(15, 31, 45, 31);
  doc.setLineWidth(0.2);
}

/** Section title: a cyan mark and small light capitals over a thin line. Returns the height used (mm). */
export function drawSectionTitle(doc: jsPDF, brand: Rgb, text: string, x: number, y: number, width: number) {
  doc.setFillColor(...brand);
  doc.roundedRect(x, y + 0.6, 1.3, 3.6, 0.6, 0.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_INK);
  doc.text(text.toUpperCase(), x + 3.2, y + 3.5, { charSpace: 0.2 });
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
      doc.setDrawColor(...APP.lineStrong);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, size, size, 1, 1, 'S');
      doc.restoreGraphicsState();
    } catch (_e) {
      photoDrawn = false;
    }
  }

  if (!photoDrawn) {
    doc.saveGraphicsState();
    doc.setFillColor(...APP.surface3);
    doc.roundedRect(x, y, size, size, 1, 1, 'F');
    doc.setDrawColor(...APP.lineStrong);
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
    doc.setTextColor(...APP.brand);
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...APP.brand);
    doc.text('BolaComVisão', 15, 289);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_MUTED);
    doc.text(`Página ${i} de ${pageCount}`, 195, 289, { align: 'right' });
  }
}

/**
 * Simple top-to-bottom writer for text reports (section headings, wrapped paragraphs and bullet lists), with page
 * breaks. No emojis: the PDF fonts cannot draw them.
 */
export function createTextReportWriter(doc: jsPDF, startY: number, brand: Rgb = APP.brand) {
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
      doc.setTextColor(...(opts.color || PDF_INK));
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
      doc.setTextColor(...PDF_INK);
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
