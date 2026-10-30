import { AppState, Player } from '../types';
import { buildPlayerSeason } from './playerSeason';

/**
 * 🃏 Cromo do atleta: a collectable card for the end of the season, in the club's colours, with the shirt number, the
 * name and four numbers of the athlete's season (trainings as "attended/held"). The photo only goes in with the
 * parents' permission; otherwise the shirt number fills the circle. Size of a real card (63 × 88 mm).
 */

export const PLAYER_CARD_SIZE = { width: 750, height: 1048 };

interface PlayerCardData {
  clubName: string;
  category?: string;
  season?: string;
  brand: string; // club colour, #rrggbb
  number: string;
  name: string;
  position: string; // "MÉDIO", "GUARDA-REDES"
  captain: boolean;
  stats: [string, string][]; // [["18", "JOGOS"], …, ["57/85", "TREINOS"]]
  index?: number; // "Cromo 7 de 15"
  total?: number;
  photo?: HTMLImageElement | null;
  logo?: HTMLImageElement | null;
}

const isKeeper = (positions: string) => /\b(gr|guarda)/i.test(positions || '');

export function positionLabel(positions: string): string {
  const first = (positions || '').split(/[,;/]/)[0].trim();
  if (!first) return '';
  return (isKeeper(first) ? 'Guarda-redes' : first).toUpperCase();
}

/** The four numbers of the season: games, goals, assists (clean sheets for keepers), trainings attended/held. */
export function playerCardStats(
  state: Pick<AppState, 'matches' | 'trainings' | 'roster' | 'category'>,
  player: Player,
  season?: string
): [string, string][] {
  const s = buildPlayerSeason(state, player.id, season);
  const keeper = isKeeper(player.positions);
  const cleanSheets = s.evolution.games.filter((g) => g.minutes > 0 && g.conceded === 0).length;
  return [
    [String(s.games.played), s.games.played === 1 ? 'JOGO' : 'JOGOS'],
    keeper ? [String(cleanSheets), 'SEM SOFRER'] : [String(s.goals), s.goals === 1 ? 'GOLO' : 'GOLOS'],
    keeper ? [String(s.goals), s.goals === 1 ? 'GOLO' : 'GOLOS'] : [String(s.assists), 'ASSIST.'],
    [s.trainings.held > 0 ? `${s.trainings.present}/${s.trainings.held}` : '—', 'TREINOS']
  ];
}

export function playerCardData(
  state: AppState,
  player: Player,
  brand: string,
  extra: { index?: number; total?: number; photo?: HTMLImageElement | null; logo?: HTMLImageElement | null } = {}
): PlayerCardData {
  return {
    clubName: state.myClubName || 'A nossa equipa',
    category: state.category,
    season: state.season,
    brand,
    number: player.number !== null && player.number !== undefined ? String(player.number) : '',
    name: player.name,
    position: positionLabel(player.positions),
    captain: Boolean(player.captain),
    stats: playerCardStats(state, player, state.season),
    ...extra
  };
}

/** The athletes in shirt-number order: "Cromo 7 de 15". */
export function cardNumberOf(roster: Player[] | undefined, playerId: string): { index?: number; total?: number } {
  const active = (roster || [])
    .filter((p) => p && p.active !== false)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
  const i = active.findIndex((p) => p.id === playerId);
  return i >= 0 ? { index: i + 1, total: active.length } : {};
}

const font = (weight: number, size: number, display = false) =>
  `${weight} ${size}px ${display ? '"Chakra Petch", ' : ''}"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const mix = (hex: string, to: [number, number, number], t: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (to[i] - v) * t));
  return `rgb(${c.join(',')})`;
};

const GOLD = '#ffd76a';

export function drawPlayerCard(ctx: CanvasRenderingContext2D, d: PlayerCardData) {
  const { width: W, height: H } = PLAYER_CARD_SIZE;
  const brand = /^#[0-9a-f]{6}$/i.test(d.brand) ? d.brand : '#0e8fb0';
  const fit = (text: string, maxW: number, weight: number, size: number, display = false, min = 16) => {
    let s = size;
    ctx.font = font(weight, s, display);
    while (ctx.measureText(text).width > maxW && s > min) ctx.font = font(weight, --s, display);
  };
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // Gold frame
  const gold = ctx.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, '#ffe08a');
  gold.addColorStop(0.35, '#e2a400');
  gold.addColorStop(0.55, '#fff1b8');
  gold.addColorStop(1, '#c98d00');
  ctx.fillStyle = gold;
  roundRect(ctx, 0, 0, W, H, 48);
  ctx.fill();

  // Inside, in the club's colour
  const inner = ctx.createLinearGradient(0, 22, 0, H - 22);
  inner.addColorStop(0, brand);
  inner.addColorStop(0.55, mix(brand, [4, 20, 31], 0.7));
  inner.addColorStop(1, '#04141f');
  ctx.fillStyle = inner;
  roundRect(ctx, 22, 22, W - 44, H - 44, 32);
  ctx.fill();

  // Number and crest
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = font(700, 120, true);
  ctx.fillText(d.number || '–', 56, 160);
  const cx = W - 110;
  const cy = 110;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 52, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.clip();
  if (d.logo) ctx.drawImage(d.logo, cx - 44, cy - 44, 88, 88);
  else {
    ctx.fillStyle = brand;
    ctx.font = font(700, 54, true);
    ctx.textAlign = 'center';
    ctx.fillText((d.clubName.trim()[0] || 'C').toUpperCase(), cx, cy + 19);
  }
  ctx.restore();

  // Photo circle (or the number)
  const px = W / 2;
  const py = 400;
  const pr = 190;
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  const glow = ctx.createRadialGradient(px, py - 60, 20, px, py, pr);
  glow.addColorStop(0, mix(brand, [255, 255, 255], 0.25));
  glow.addColorStop(1, mix(brand, [4, 20, 31], 0.55));
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.clip();
  if (d.photo) {
    const s = Math.max((pr * 2) / d.photo.width, (pr * 2) / d.photo.height);
    const w = d.photo.width * s;
    const h = d.photo.height * s;
    ctx.drawImage(d.photo, px - w / 2, py - h / 2, w, h);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.textAlign = 'center';
    ctx.font = font(700, 220, true);
    ctx.fillText(d.number || '⚽', px, py + 78);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.lineWidth = 9;
  ctx.strokeStyle = GOLD;
  ctx.stroke();

  if (d.captain) {
    ctx.font = font(800, 24);
    const label = '★ CAPITÃO';
    const w = ctx.measureText(label).width + 40;
    ctx.fillStyle = GOLD;
    roundRect(ctx, px - w / 2, py + pr - 22, w, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#3a2a00';
    ctx.textAlign = 'center';
    ctx.fillText(label, px, py + pr + 9);
  }

  // Name, position, team
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  const name = d.name.toUpperCase();
  fit(name, W - 120, 700, 60, true, 30);
  ctx.fillText(name, W / 2, 692);
  ctx.fillStyle = GOLD;
  ctx.font = font(800, 26);
  ctx.fillText(d.position, W / 2, 734);
  ctx.fillStyle = '#bfe3f3';
  ctx.font = font(600, 24);
  const team = [d.clubName, d.category].filter(Boolean).join(' · ');
  fit(team, W - 120, 600, 24, false, 16);
  ctx.fillText(team, W / 2, 770);

  // Season numbers
  const n = d.stats.length;
  const gap = 12;
  const bx = 48;
  const bw = (W - 2 * bx - gap * (n - 1)) / n;
  d.stats.forEach(([value, label], i) => {
    const x = bx + i * (bw + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    roundRect(ctx, x, 808, bw, 130, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = GOLD;
    fit(value, bw - 16, 700, 50, true, 22);
    ctx.fillText(value, x + bw / 2, 875);
    ctx.fillStyle = '#d9eef7';
    fit(label, bw - 12, 800, 19, false, 13);
    ctx.fillText(label, x + bw / 2, 915);
  });

  ctx.fillStyle = '#bfe3f3';
  ctx.font = font(700, 21);
  const foot = [d.season ? `ÉPOCA ${d.season}` : '', d.index && d.total ? `CROMO ${d.index} DE ${d.total}` : '']
    .filter(Boolean)
    .join(' · ');
  ctx.fillText(foot, W / 2, H - 60);
}
