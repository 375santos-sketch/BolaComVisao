/**
 * Convocatória picture for the parents' group (1080×1350, the size WhatsApp shows whole): the game, the four facts
 * the families need (day, kick-off, meeting time and place), the pitch, the called-up players and the notices. Only
 * shirt numbers and names: no photos or birth dates.
 */

export const CALLUP_CARD_SIZE = { width: 1080, height: 1350 };

interface CallupCardData {
  clubName: string;
  subtitle: string; // "Sub-11 · Época 2026/2027"
  brand: string; // club colour, #rrggbb
  home: string;
  away: string;
  facts: [string, string][]; // [["DIA", "Sáb 07/11"], …]
  place?: string; // "Campo Municipal · Campeonato, Jornada 5"
  players: { number?: string; name: string }[];
  notes?: string;
  logo?: HTMLImageElement | null;
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

/** Lines of `text` that fit in `maxW` (at most `max` lines, the last one ending in "…" when cut). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > max) {
    const kept = lines.slice(0, max);
    kept[max - 1] = `${kept[max - 1].replace(/\s+\S*$/, '')}…`;
    return kept;
  }
  return lines;
}

export function drawCallupCard(ctx: CanvasRenderingContext2D, d: CallupCardData) {
  const { width: W, height: H } = CALLUP_CARD_SIZE;
  const L = 70;
  const fit = (text: string, maxW: number, weight: number, size: number, display = false, min = 18) => {
    let s = size;
    ctx.font = font(weight, s, display);
    while (ctx.measureText(text).width > maxW && s > min) ctx.font = font(weight, --s, display);
  };

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a192a');
  bg.addColorStop(1, '#0f2f4d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = d.brand;
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, H - 14, W, 14);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Club
  const cx = L + 55;
  const cy = 115;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 55, 0, Math.PI * 2);
  ctx.fillStyle = d.brand;
  ctx.fill();
  if (d.logo) {
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 55, cy - 55, 110, 110);
    ctx.drawImage(d.logo, cx - 50, cy - 50, 100, 100);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = font(700, 56, true);
    ctx.textAlign = 'center';
    ctx.fillText((d.clubName.trim()[0] || 'C').toUpperCase(), cx, cy + 20);
    ctx.textAlign = 'left';
  }
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  fit(d.clubName.toUpperCase(), 760, 700, 40, true);
  ctx.fillText(d.clubName.toUpperCase(), L + 136, 110);
  ctx.fillStyle = '#8fc7e6';
  ctx.font = font(500, 26);
  ctx.fillText(d.subtitle, L + 136, 148);

  // Title and game
  ctx.fillStyle = '#facc15';
  ctx.font = font(700, 76, true);
  ctx.fillText('CONVOCATÓRIA', L, 270);
  const vs = ' vs ';
  fit(`${d.home}${vs}${d.away}`, W - 2 * L, 700, 46, true, 26);
  let x = L;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(d.home, x, 334);
  x += ctx.measureText(d.home).width;
  ctx.fillStyle = d.brand;
  ctx.fillText(vs, x, 334);
  x += ctx.measureText(vs).width;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(d.away, x, 334);

  // Facts
  const gap = 16;
  const fw = (W - 2 * L - gap * (d.facts.length - 1)) / d.facts.length;
  d.facts.forEach(([label, value], i) => {
    const fx = L + i * (fw + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, fx, 370, fw, 120, 20);
    ctx.fill();
    ctx.fillStyle = '#8fc7e6';
    ctx.font = font(800, 20);
    ctx.fillText(label, fx + 20, 408);
    ctx.fillStyle = '#ffffff';
    const lines = (() => {
      fit(value, fw - 40, 700, 40, true, 26);
      if (ctx.measureText(value).width <= fw - 40) return [value];
      ctx.font = font(700, 26, true);
      return wrap(ctx, value, fw - 40, 2);
    })();
    lines.forEach((l, k) => ctx.fillText(l, fx + 20, (lines.length > 1 ? 444 : 460) + k * 30));
  });

  let y = 530;
  if (d.place) {
    ctx.fillStyle = '#cfe3f1';
    fit(d.place, W - 2 * L, 500, 26, false, 18);
    ctx.fillText(d.place, L, y + 10);
    y += 40;
  }

  // Players in two columns
  const players = d.players;
  const rows = Math.ceil(players.length / 2);
  const notesSpace = d.notes ? 150 : 40;
  const rowH = Math.min(72, Math.max(44, (H - 90 - notesSpace - y - 20) / Math.max(rows, 1)));
  const r = Math.min(29, rowH / 2 - 4);
  y += 20;
  players.forEach((p, i) => {
    const col = i < rows ? 0 : 1;
    const row = col === 0 ? i : i - rows;
    const px = L + col * 480;
    const py = y + row * rowH + rowH / 2;
    ctx.beginPath();
    ctx.arc(px + r, py, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#0a192a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(700, (p.number || '').length > 2 ? r * 0.75 : r, true);
    ctx.fillText(p.number || '–', px + r, py + 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    fit(p.name, 400 - 2 * r, 700, Math.min(32, rowH * 0.5), false, 18);
    ctx.fillText(p.name, px + 2 * r + 18, py + 1);
    ctx.textBaseline = 'alphabetic';
  });
  y += rows * rowH + 24;

  // Notices
  if (d.notes) {
    ctx.font = font(500, 26);
    const lines = wrap(ctx, d.notes, W - 2 * L - 50, 3);
    const h = lines.length * 34 + 30;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, L, y, W - 2 * L, h, 14);
    ctx.fill();
    ctx.fillStyle = d.brand;
    ctx.fillRect(L, y, 8, h);
    ctx.fillStyle = '#ffffff';
    lines.forEach((l, k) => ctx.fillText(l, L + 30, y + 40 + k * 34));
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = font(500, 22);
  ctx.fillText('BolaComVisão', W / 2, H - 40);
}
