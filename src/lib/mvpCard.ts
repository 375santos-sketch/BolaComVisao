import { AppState, Match, Player } from '../types';
import { buildPlayerSeason } from './playerSeason';
import { homeFirstScore } from './utils';

/**
 * "Jogador do jogo" (Resultados → ⭐): the coach picks the game's standout athlete and the app draws a picture to
 * share with the parents. The photo only goes in with the parents' permission (the coach ticks it each time);
 * otherwise the picture shows the shirt number.
 */

export interface MvpLine {
  player: Player;
  minutes: number;
  goals: number;
  assists: number;
  started: boolean;
}

/**
 * Every athlete of the team: first those who played in the game, best contribution first (goals, assists, minutes),
 * then the rest of the squad by name (the coach may pick anyone, e.g. for attitude on the bench).
 */
export function mvpCandidates(state: Pick<AppState, 'matches' | 'trainings' | 'roster' | 'category'>, match: Match) {
  const ids = new Set([...(match.convocados || []), ...(match.lineup || [])].filter(Boolean) as string[]);
  const lines: MvpLine[] = (state.roster || [])
    .filter((p) => p && (p.active !== false || ids.has(p.id)))
    .map((player) => {
      const game = ids.has(player.id)
        ? buildPlayerSeason({ ...state, matches: [match] }, player.id).evolution.games[0]
        : undefined;
      return {
        player,
        minutes: game?.minutes || 0,
        goals: game?.goals || 0,
        assists: game?.assists || 0,
        started: Boolean(game?.started)
      };
    });
  return lines.sort(
    (a, b) =>
      Number(b.minutes > 0) - Number(a.minutes > 0) ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      b.minutes - a.minutes ||
      a.player.name.localeCompare(b.player.name, 'pt-PT')
  );
}

/** Athletes who played (minutes in the game): the parents vote among these. */
export const mvpPlayed = (lines: MvpLine[]) => lines.filter((l) => l.minutes > 0);

/** "2 golos · 1 assistência · 50 minutos" ("" for an athlete who did not play). */
export function mvpStatsLine(l: Pick<MvpLine, 'goals' | 'assists' | 'minutes'>): string {
  if (!l.minutes && !l.goals && !l.assists) return '';
  return [
    l.goals ? `${l.goals} ${l.goals === 1 ? 'golo' : 'golos'}` : '',
    l.assists ? `${l.assists} ${l.assists === 1 ? 'assistência' : 'assistências'}` : '',
    `${l.minutes} minutos`
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "Tramagal SU 1-10 Dragões" (home team first). */
export function mvpResultLine(match: Match, clubName: string, scored: number, conceded: number): string {
  const home = match.location !== 'fora';
  const score = homeFirstScore(scored, conceded, home);
  return home ? `${clubName} ${score} ${match.opponent}` : `${match.opponent} ${score} ${clubName}`;
}

interface MvpCardData {
  clubName: string;
  category?: string;
  result: string;
  date: string; // dd/mm/aaaa
  name: string;
  number?: string;
  position?: string;
  stats: string;
  photo?: HTMLImageElement | null;
  logo?: HTMLImageElement | null;
}

export const MVP_CARD_SIZE = { width: 1080, height: 1350 };

/** Draws the picture (1080×1350, the size Instagram and WhatsApp show whole). */
export function drawMvpCard(ctx: CanvasRenderingContext2D, d: MvpCardData) {
  const { width: W, height: H } = MVP_CARD_SIZE;
  const font = (weight: number, size: number) => `${weight} ${size}px "Chakra Petch", "Segoe UI", Arial, sans-serif`;
  /** Text centred and shrunk until it fits with a margin on both sides. */
  const fit = (text: string, weight: number, size: number, y: number, min = 28) => {
    let s = size;
    ctx.font = font(weight, s);
    while (ctx.measureText(text).width > W - 140 && s > min) {
      s -= 2;
      ctx.font = font(weight, s);
    }
    ctx.fillText(text, W / 2, y);
  };

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a192a');
  bg.addColorStop(1, '#0f2f4d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Pitch lines in the background
  ctx.strokeStyle = 'rgba(0, 190, 240, 0.08)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.47, 330, 0, Math.PI * 2);
  ctx.moveTo(0, H * 0.47);
  ctx.lineTo(W, H * 0.47);
  ctx.stroke();

  ctx.fillStyle = '#00bef0';
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, H - 14, W, 14);

  ctx.textAlign = 'center';
  if (d.logo) {
    ctx.drawImage(d.logo, W / 2 - 60, 60, 120, 120);
  }
  ctx.fillStyle = '#ffffff';
  fit(d.clubName.toUpperCase(), 700, 44, d.logo ? 235 : 130);
  if (d.category) {
    ctx.fillStyle = '#8fc7e6';
    ctx.font = font(500, 32);
    ctx.fillText(d.category, W / 2, d.logo ? 282 : 177);
  }

  ctx.fillStyle = '#facc15';
  fit('★ JOGADOR DO JOGO ★', 800, 80, 400);

  // Photo (with permission) or shirt number in a circle
  const cx = W / 2;
  const cy = 640;
  const r = 190;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#123a5c';
  ctx.fill();
  if (d.photo) {
    ctx.clip();
    const s = Math.max((2 * r) / d.photo.naturalWidth, (2 * r) / d.photo.naturalHeight);
    const w = d.photo.naturalWidth * s;
    const h = d.photo.naturalHeight * s;
    ctx.drawImage(d.photo, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = font(800, d.number ? 190 : 150);
    ctx.textBaseline = 'middle';
    ctx.fillText(d.number || '⚽', cx, cy + 8);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  fit(d.name, 800, 96, 945, 48);
  if (d.position) {
    ctx.fillStyle = '#8fc7e6';
    ctx.font = font(500, 36);
    ctx.fillText(d.position, W / 2, 1000);
  }

  if (d.stats) {
    ctx.fillStyle = '#00bef0';
    fit(d.stats, 700, 44, 1085);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(90, 1140, W - 180, 110);
  ctx.fillStyle = '#ffffff';
  fit(d.result, 700, 42, 1192);
  ctx.fillStyle = '#8fc7e6';
  ctx.font = font(500, 30);
  ctx.fillText(d.date, W / 2, 1232);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = font(500, 26);
  ctx.fillText('BolaComVisão', W / 2, H - 40);
}
