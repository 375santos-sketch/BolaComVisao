import { AppState, Player } from '../../types';
import { defaultSeason } from '../utils';
import { APP, PdfTheme, Rgb, applyPdfTheme } from './pdfTheme';

export type { Rgb } from './pdfTheme';

/** jsPDF with the app's colours on white paper (see pdfTheme). */
export async function getJsPDF(theme: PdfTheme = 'light') {
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

/** The app's navy, drawn as it is (the header, footer and section bars stay navy on paper). */
const NAVY: Rgb = [11, 18, 32];
const NAVY_2: Rgb = [17, 26, 43];
const ON_NAVY_MUTED: Rgb = [139, 155, 180];

/** Two slanted cyan stripes, like the app's mark, from x on a band of height h starting at y. */
function stripes(doc: jsPDF, x: number, y: number, h: number) {
  const slant = h * 0.55;
  [
    [0, 5, [34, 195, 238]],
    [7.5, 2.4, [8, 145, 178]]
  ].forEach(([dx, w, color]) => {
    doc.setFillColor(...(color as Rgb));
    const x0 = x + (dx as number);
    doc.lines(
      [
        [w as number, 0],
        [-slant, h],
        [-(w as number), 0],
        [slant, -h]
      ],
      x0 + slant,
      y,
      [1, 1],
      'F',
      true
    );
  });
}

/**
 * Top of every document: a navy band with the club's symbol, "BOLACOMVISÃO" in cyan, the title in white,
 * "Clube · Escalão · Época" and the date, with the app's cyan stripes. Content starts below y = 36.
 */
export function drawDocumentHeader(doc: jsPDF, state: AppState, title: string, subtitle?: string) {
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O Meu Clube';
  const brand = pdfBrand(state);
  const season = `Época ${state.season || defaultSeason()}`;
  doc.bolaFooter = `${myClub}  ·  ${season}`;
  const draw = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, 210, 32, 'F');
    stripes(doc, 140, 0, 32);
    doc.setFillColor(...brand);
    doc.rect(0, 32, 210, 0.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...brand);
    doc.text('BOLACOMVISÃO', 37, 11.5, { charSpace: 0.6 });

    doc.setTextColor(255, 255, 255);
    let size = 18;
    doc.setFontSize(size);
    while (size > 11 && doc.getTextWidth(sentence(title)) > 100) doc.setFontSize(--size);
    doc.text(sentence(title), 37, 19.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...ON_NAVY_MUTED);
    const line = [myClub, state.category, season, subtitle].filter(Boolean).join('  ·  ');
    doc.text(doc.splitTextToSize(line, 100)[0], 37, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...brand);
    doc.text(season, 195, 17, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ON_NAVY_MUTED);
    doc.text(`Emitido a ${new Date().toLocaleDateString('pt-PT')}`, 195, 22, { align: 'right' });
  };
  if (doc.rawColors) doc.rawColors(draw);
  else draw();
  drawClubEmblem(doc, 15, 7.5, 17, myClub, brand, state.clubLogoUrl);
  doc.setLineWidth(0.2);
}

/** Section title: a navy bar with the title in white capitals and a cyan mark. Returns the height used (mm). */
export function drawSectionTitle(doc: jsPDF, brand: Rgb, text: string, x: number, y: number, width: number) {
  const draw = () => {
    doc.setFillColor(...NAVY_2);
    doc.roundedRect(x, y - 0.6, width, 6.4, 1.2, 1.2, 'F');
    doc.setFillColor(...brand);
    doc.rect(x + 2.5, y + 1.2, 1.2, 2.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(255, 255, 255);
    doc.text(text.toUpperCase(), x + 5.5, y + 3.75, { charSpace: 0.2 });
  };
  if (doc.rawColors) doc.rawColors(draw);
  else draw();
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
    const draw = () => {
      doc.setFillColor(...NAVY);
      doc.rect(0, 286, 210, 11, 'F');
      stripes(doc, 186, 286, 11);
      doc.setFillColor(...APP.brand);
      doc.rect(0, 286, 210, 0.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('BolaComVisão', 15, 292.6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...ON_NAVY_MUTED);
      if (doc.bolaFooter) doc.text(doc.bolaFooter, 105, 292.6, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.text(`Página ${i} de ${pageCount}`, 182, 292.6, { align: 'right' });
    };
    if (doc.rawColors) doc.rawColors(draw);
    else draw();
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
