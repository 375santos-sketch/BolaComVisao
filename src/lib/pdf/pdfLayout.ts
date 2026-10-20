import { AppState, Player } from '../../types';
import bolacomvisaoLogoImg from '../../assets/images/bolacomvisao_logo_1786622535530.jpg';
import { defaultSeason } from '../utils';

export async function getJsPDF() {
  const mod = await import('jspdf');
  return mod.default || (mod as any).jsPDF || mod;
}

export type jsPDF = any;

/**
 * Draws the Club Emblem / Shield in the top-left corner
 */
export function drawClubEmblem(doc: jsPDF, x: number, y: number, size: number, clubName: string, logoUrl?: string) {
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, x, y, size, size);
      return;
    } catch (e) {
      console.warn('Could not render club logo image:', e);
    }
  }

  // Fallback: Professional Club Shield / Crest
  doc.saveGraphicsState();
  doc.setFillColor(15, 30, 52);
  doc.roundedRect(x, y, size, size, 3, 3, 'F');
  doc.setDrawColor(0, 190, 240);
  doc.setLineWidth(0.7);
  doc.roundedRect(x, y, size, size, 3, 3, 'S');

  // Inner circular emblem
  doc.setFillColor(24, 48, 80);
  doc.circle(x + size / 2, y + size / 2 - 1, size * 0.36, 'F');
  doc.setDrawColor(217, 164, 65);
  doc.setLineWidth(0.4);
  doc.circle(x + size / 2, y + size / 2 - 1, size * 0.36, 'S');

  // Club initial letters or default
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  const initials = (clubName || 'CLUBE')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  doc.setFontSize(size > 22 ? 10 : 8.5);
  doc.text(initials || 'FC', x + size / 2, y + size / 2 + 2, { align: 'center' });

  // Subtitle 'CLUBE'
  doc.setFontSize(5);
  doc.setTextColor(0, 210, 255);
  doc.text('CLUBE', x + size / 2, y + size - 2.2, { align: 'center' });

  doc.restoreGraphicsState();
}

/**
 * Draws the BolaComVisao Symbol / Logo in the top-right corner
 */
export function drawBolaComVisaoEmblem(doc: jsPDF, x: number, y: number, size: number) {
  let rendered = false;
  if (bolacomvisaoLogoImg) {
    try {
      doc.addImage(bolacomvisaoLogoImg, x, y, size, size);
      rendered = true;
    } catch (_e) {
      // fallback
    }
  }

  if (!rendered) {
    doc.saveGraphicsState();
    doc.setFillColor(8, 20, 38);
    doc.roundedRect(x, y, size, size, 3, 3, 'F');
    doc.setDrawColor(0, 210, 255);
    doc.setLineWidth(0.7);
    doc.roundedRect(x, y, size, size, 3, 3, 'S');

    // Central circular glow
    doc.setFillColor(16, 40, 72);
    doc.circle(x + size / 2, y + size / 2 - 1, size * 0.36, 'F');
    doc.setDrawColor(0, 210, 255);
    doc.setLineWidth(0.4);
    doc.circle(x + size / 2, y + size / 2 - 1, size * 0.36, 'S');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size > 22 ? 9 : 7);
    doc.text('BV', x + size / 2, y + size / 2 + 1.8, { align: 'center' });

    doc.setFontSize(4.5);
    doc.setTextColor(0, 210, 255);
    doc.text('BOLACOMVISÃO', x + size / 2, y + size - 2.2, { align: 'center' });

    doc.restoreGraphicsState();
  }
}

/**
 * Standard PDF Header with:
 * - Top-Left: Club Symbol
 * - Top-Right: BolaComVisao Symbol
 * - Center: Club Name, Document Title, Category / Season & Date
 */
export function drawDocumentHeader(doc: jsPDF, state: AppState, title: string, subtitle?: string) {
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O Meu Clube';

  // Header Banner Background
  const brandDark = [10, 25, 42];
  const brandCyan = [0, 190, 240];

  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(0, 0, 210, 37, 'F');

  doc.setFillColor(brandCyan[0], brandCyan[1], brandCyan[2]);
  doc.rect(0, 37, 210, 2.5, 'F');

  // 1. Top-Left Corner: Club Symbol
  drawClubEmblem(doc, 12, 5, 27, myClub, state.clubLogoUrl);

  // 2. Top-Right Corner: BolaComVisao Symbol
  drawBolaComVisaoEmblem(doc, 171, 5, 27);

  // 3. Center Info
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(myClub.toUpperCase(), 105, 13, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(brandCyan[0], brandCyan[1], brandCyan[2]);
  doc.text(title.toUpperCase(), 105, 20.5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(185, 215, 235);
  const catSeason = `${state.category || 'Futebol'} • Época ${state.season || defaultSeason()}${subtitle ? ' • ' + subtitle : ''}`;
  doc.text(catSeason, 105, 27.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(140, 175, 200);
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-PT')}`, 105, 33.5, { align: 'center' });
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

/**
 * Adds footer branding to every page (without diagonal watermark)
 */
export function addBolaComVisaoPageFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 150, 165);
    doc.text(`BolaComVisão • Plataforma de Gestão Desportiva  |  Página ${i} de ${pageCount}`, 105, 290, {
      align: 'center'
    });
  }
}

/**
 * Backwards compatible alias
 */
export function addBolaComVisaoWatermark(doc: jsPDF) {
  addBolaComVisaoPageFooters(doc);
}
