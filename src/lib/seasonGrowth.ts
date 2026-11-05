import { Match, Player, TeamPhoto, Training } from '../types';
import { FITNESS_TESTS, ROUNDS, formatResult, roundKey } from './fitnessTests';

/**
 * 📸 Antes e depois da época: the team's photo from the start and from the end of the season side by side, with the
 * team's own numbers (trainings, goals, the average in the tests). Only team numbers: no athlete is compared with
 * another. The photos only go into the picture when the coach confirms the parents' authorisation.
 */

interface GrowthNumber {
  id: string;
  label: string; // "SPRINT 20 M (MÉDIA)"
  value: string; // "3,98 s"
  sub: string; // "eram 4,31 s · −0,33 s"
  /** Picked by default (the coach can take any out). */
  on: boolean;
}

const inSeason = (item: { season?: string }, season: string) => !item.season || item.season === season;

const pct = (n: number) => `${Math.round(n)}%`;
const num = (n: number, decimals: number) => n.toFixed(decimals).replace('.', ',');

/** The numbers of the season, in the order they go in the picture. */
export function growthNumbers(
  roster: Player[] | undefined,
  trainings: Training[] | undefined,
  matches: Match[] | undefined,
  season: string
): GrowthNumber[] {
  const out: GrowthNumber[] = [];
  const players = (roster || []).filter((p) => p && p.status !== 'inativo');

  const done = (trainings || []).filter((t) => t && t.completed !== false && inSeason(t, season));
  if (done.length) {
    const size = Math.max(1, players.length);
    const present = done.reduce((s, t) => s + Math.max(0, size - (t.absences || []).length), 0);
    out.push({
      id: 'treinos',
      label: 'TREINOS',
      value: String(done.length),
      sub: players.length ? `${pct((present / (done.length * size)) * 100)} de presenças` : 'feitos esta época',
      on: true
    });
  }

  const games = (matches || []).filter((m) => m && inSeason(m, season) && m.finished);
  if (games.length) {
    let scored = 0;
    let w = 0;
    let d = 0;
    let l = 0;
    for (const m of games) {
      const ours = (m.goals || []).filter((g) => g.type === 'scored').length;
      const theirs = (m.goals || []).length - ours;
      scored += ours;
      if (ours > theirs) w++;
      else if (ours === theirs) d++;
      else l++;
    }
    out.push({
      id: 'golos',
      label: 'GOLOS MARCADOS',
      value: String(scored),
      sub: `em ${games.length} ${games.length === 1 ? 'jogo' : 'jogos'}`,
      on: true
    });
    out.push({
      id: 'resultados',
      label: 'VITÓRIAS · EMPATES · DERROTAS',
      value: `${w} · ${d} · ${l}`,
      sub: '',
      on: false
    });
  }

  // Tests: the team's average in the first round with results and in the last one
  for (const test of FITNESS_TESTS) {
    const averages = ROUNDS.map((r) => {
      const vals = players
        .map((p) => p.fitnessTests?.[roundKey(season, r.id)]?.[test.id])
        .filter((v): v is number => typeof v === 'number');
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
    }).filter((v): v is number => v !== undefined);
    if (averages.length < 2) continue;
    const first = averages[0];
    const last = averages[averages.length - 1];
    const diff = last - first;
    const decimals = test.unit === 's' ? 2 : 0;
    const better = test.lowerIsBetter ? diff < 0 : diff > 0;
    out.push({
      id: test.id,
      label: `${test.name.toUpperCase()} (MÉDIA)`,
      value: formatResult(test, last),
      sub: `eram ${formatResult(test, first)} · ${diff > 0 ? '+' : diff < 0 ? '−' : ''}${num(Math.abs(diff), decimals)}${test.unit ? ` ${test.unit}` : ''}`,
      on: better && out.filter((o) => o.on).length < 4
    });
  }
  return out;
}

/** The team's photos for the season (start and end), the newest of each. */
export function seasonPhotos(photos: TeamPhoto[] | undefined, season: string) {
  const of = (moment: TeamPhoto['moment']) =>
    (photos || [])
      .filter((p) => p && p.season === season && p.moment === moment)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
  return { start: of('inicio'), end: of('fim') };
}

/** "2026/27" → ["Setembro 2026", "Junho 2027"]. */
export function seasonMonths(season: string): [string, string] {
  const y = Number(/^(\d{4})/.exec(season)?.[1]) || new Date().getFullYear();
  return [`Setembro ${y}`, `Junho ${y + 1}`];
}

interface GrowthPicture {
  club: string;
  category: string;
  season: string;
  color: string;
  numbers: GrowthNumber[];
  /** Only when the parents' authorisation was confirmed. */
  start?: HTMLImageElement | null;
  end?: HTMLImageElement | null;
}

const GROWTH_SIZE = { width: 1080, height: 1350 };

const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Draws the picture (1080 × 1350, the size WhatsApp and Instagram show whole). */
export function drawGrowthPicture(canvas: HTMLCanvasElement, p: GrowthPicture) {
  const { width: W, height: H } = GROWTH_SIZE;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, '#0b1d33');
  bg.addColorStop(0.6, '#082036');
  bg.addColorStop(1, '#06111d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const font = (weight: number, size: number) =>
    `${weight} ${size}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  const M = 56;

  // Club
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(M + 46, M + 46, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#062330';
  ctx.font = font(900, 44);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((p.club.trim()[0] || 'C').toUpperCase(), M + 46, M + 48);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.font = font(800, 44);
  ctx.fillText(p.club, M + 116, M + 40);
  ctx.fillStyle = p.color;
  ctx.font = font(800, 26);
  ctx.fillText(`${p.category ? `${p.category.toUpperCase()} · ` : ''}ÉPOCA ${p.season}`, M + 116, M + 82);

  // Title
  ctx.font = font(900, 62);
  ctx.fillStyle = '#fff';
  const t1 = 'Como ';
  const t2 = 'crescemos';
  ctx.fillText(t1, M, 250);
  const w1 = ctx.measureText(t1).width;
  ctx.fillStyle = p.color;
  ctx.fillText(t2, M + w1, 250);
  ctx.fillStyle = '#fff';
  ctx.fillText(' esta época', M + w1 + ctx.measureText(t2).width, 250);

  // Photos (or the two months only, without photos)
  const months = seasonMonths(p.season);
  const top = 290;
  const gap = 20;
  const pw = (W - 2 * M - gap) / 2;
  const ph = p.start || p.end ? pw * 0.75 : 120;
  [p.start, p.end].forEach((img, i) => {
    const x = M + i * (pw + gap);
    ctx.save();
    rounded(ctx, x, top, pw, ph, 24);
    ctx.clip();
    ctx.fillStyle = i ? '#155e75' : '#1e293b';
    ctx.fillRect(x, top, pw, ph);
    if (img) {
      const s = Math.max(pw / img.width, ph / img.height);
      ctx.drawImage(img, x + (pw - img.width * s) / 2, top + (ph - img.height * s) / 2, img.width * s, img.height * s);
    }
    ctx.restore();
    ctx.font = font(800, 24);
    const label = months[i];
    const lw = ctx.measureText(label).width + 30;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    rounded(ctx, x + 14, top + ph - 54, lw, 40, 18);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + 29, top + ph - 25);
  });
  // Arrow between them
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(W / 2, top + ph / 2, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0b1d33';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = '#062330';
  ctx.font = font(900, 40);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('→', W / 2, top + ph / 2 + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Numbers: two per row
  const chosen = p.numbers.filter((n) => n.on).slice(0, 6);
  const sy = top + ph + 40;
  const cw = (W - 2 * M - gap) / 2;
  const ch = 150;
  chosen.forEach((n, i) => {
    const x = M + (i % 2) * (cw + gap);
    const y = sy + Math.floor(i / 2) * (ch + gap);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    rounded(ctx, x, y, cw, ch, 22);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = font(800, 21);
    ctx.fillText(n.label, x + 24, y + 40, cw - 48);
    ctx.fillStyle = '#fff';
    ctx.font = font(800, 48);
    ctx.fillText(n.value, x + 24, y + 96, cw - 48);
    if (n.sub) {
      ctx.fillStyle = '#86efac';
      ctx.font = font(700, 23);
      ctx.fillText(n.sub, x + 24, y + 132, cw - 48);
    }
  });

  ctx.fillStyle = '#94a3b8';
  ctx.font = font(600, 24);
  ctx.fillText('Obrigado pela época! 💙', M, H - 44);
  ctx.textAlign = 'right';
  ctx.fillText('BolaComVisão', W - M, H - 44);
  ctx.textAlign = 'left';
}
