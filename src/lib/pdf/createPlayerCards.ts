import { AppState } from '../../types';
import { getJsPDF } from './pdfLayout';
import { cardNumberOf, drawPlayerCard, PLAYER_CARD_SIZE, playerCardData } from '../playerCard';
import { loadDataImage } from '../shareImage';
import { teamSettings } from '../teamSettings';

/**
 * Equipa → ⋯ → 🃏 Cromos de todos: every athlete's card at the size of a real card (63 × 88 mm), nine per A4 page,
 * to print, cut and hand out at the end of the season. Without photos (the parents' permission is given one by one,
 * in the athlete's own card).
 */
export async function generatePlayerCardsPDF(state: AppState) {
  const players = (state.roster || [])
    .filter((p) => p && p.active !== false)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
  if (players.length === 0) return 0;
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await loadDataImage(state.clubLogoUrl);
  if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = PLAYER_CARD_SIZE.width;
  canvas.height = PLAYER_CARD_SIZE.height;
  const ctx = canvas.getContext('2d')!;
  const brand = teamSettings(state).clubColor;
  const [W, H, GAP] = [63, 88, 3];
  const x0 = (210 - (3 * W + 2 * GAP)) / 2;
  const y0 = (297 - (3 * H + 2 * GAP)) / 2;

  players.forEach((p, i) => {
    if (i > 0 && i % 9 === 0) doc.addPage();
    drawPlayerCard(ctx, playerCardData(state, p, brand, { ...cardNumberOf(state.roster, p.id), logo }));
    const slot = i % 9;
    doc.addImage(
      canvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      x0 + (slot % 3) * (W + GAP),
      y0 + Math.floor(slot / 3) * (H + GAP),
      W,
      H
    );
  });
  const name = (state.myClubName || 'Equipa').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Cromos_${name}_${(state.season || '').replace('/', '-')}.pdf`);
  return players.length;
}
