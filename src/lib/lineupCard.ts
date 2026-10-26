/**
 * "Equipa inicial" picture (1080×1350, the size WhatsApp and Instagram show whole): the pitch with the starters in
 * their places (number and name, goalkeeper in yellow, captain with a "C") and the substitutes on the side.
 */

export const LINEUP_CARD_SIZE = { width: 1080, height: 1350 };

interface LineupCardPlayer {
  number?: string;
  name: string;
  /** Place on the pitch: fractions from left (x) and from the far goal (y). */
  x: number;
  y: number;
  goalkeeper?: boolean;
  captain?: boolean;
}

interface LineupCardData {
  clubName: string;
  category?: string;
  game: string; // "Dragões vs AD Mação"
  details: string; // "Sábado, 01/11 · 10:00 · Campo Municipal · Sistema 2-3-1"
  starters: LineupCardPlayer[];
  subs: { number?: string; name: string }[];
  extras: [string, string][]; // [["Concentração", "09:15"], …]
  logo?: HTMLImageElement | null;
}

/** Rounded rectangle path (also on phones whose browser lacks ctx.roundRect). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const font = (weight: number, size: number, display = false) =>
  `${weight} ${size}px ${display ? '"Chakra Petch", ' : ''}"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif`;

export function drawLineupCard(ctx: CanvasRenderingContext2D, d: LineupCardData) {
  const { width: W, height: H } = LINEUP_CARD_SIZE;
  const fit = (text: string, maxW: number, weight: number, size: number, display = false, min = 16) => {
    let s = size;
    ctx.font = font(weight, s, display);
    while (ctx.measureText(text).width > maxW && s > min) {
      s -= 1;
      ctx.font = font(weight, s, display);
    }
  };

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a192a');
  bg.addColorStop(1, '#0f2f4d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#00bef0';
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, H - 14, W, 14);

  // Header
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (d.logo) ctx.drawImage(d.logo, 60, 40, 110, 110);
  ctx.fillStyle = '#ffffff';
  fit(d.clubName.toUpperCase(), 700, 700, 40, true);
  ctx.fillText(d.clubName.toUpperCase(), W / 2, 88);
  if (d.category) {
    ctx.fillStyle = '#8fc7e6';
    ctx.font = font(500, 26);
    ctx.fillText(d.category, W / 2, 124);
  }
  ctx.fillStyle = '#facc15';
  ctx.font = font(800, 64, true);
  ctx.fillText('EQUIPA INICIAL', W / 2, 200);
  ctx.fillStyle = '#ffffff';
  fit(d.game, W - 120, 500, 30);
  ctx.fillText(d.game, W / 2, 252);
  ctx.fillStyle = '#8fc7e6';
  fit(d.details, W - 100, 500, 24);
  ctx.fillText(d.details, W / 2, 290);

  // Pitch
  const px = 70;
  const py = 330;
  const pw = 640;
  const ph = 880;
  const r = 18;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, px, py, pw, ph, r);
  ctx.clip();
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#2a8044' : '#2e8b4a';
    ctx.fillRect(px, py + i * 110, pw, 110);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(px, py + ph / 2);
  ctx.lineTo(px + pw, py + ph / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + pw / 2, py + ph / 2, 75, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(px + 170, py - 4, 300, 110);
  ctx.strokeRect(px + 170, py + ph - 106, 300, 110);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  roundRect(ctx, px, py, pw, ph, r);
  ctx.stroke();

  // Starters
  const margin = 70;
  d.starters.forEach((p) => {
    const cx = px + margin + p.x * (pw - 2 * margin);
    const cy = py + 70 + p.y * (ph - 160);
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fillStyle = p.goalkeeper ? '#facc15' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = p.goalkeeper ? '#ffffff' : '#00bef0';
    ctx.stroke();
    ctx.fillStyle = '#0a192a';
    ctx.textBaseline = 'middle';
    ctx.font = font(800, p.number && p.number.length > 2 ? 34 : 46, true);
    ctx.fillText(p.number || '•', cx, cy + 3);
    if (p.captain) {
      ctx.beginPath();
      ctx.arc(cx + 36, cy - 34, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0a192a';
      ctx.stroke();
      ctx.fillStyle = '#0a192a';
      ctx.font = font(800, 22);
      ctx.fillText('C', cx + 36, cy - 33);
    }
    // Name on a dark label, in up to two lines
    ctx.font = font(800, 25);
    const words = p.name.split(/\s+/);
    const lines =
      words.length > 1 && ctx.measureText(p.name).width > 150 ? [words[0], words.slice(1).join(' ')] : [p.name];
    const labelW = Math.min(190, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20);
    const labelH = lines.length * 30 + 8;
    ctx.fillStyle = 'rgba(10,25,42,0.82)';
    ctx.beginPath();
    roundRect(ctx, cx - labelW / 2, cy + 56, labelW, labelH, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    lines.forEach((l, i) => {
      fit(l, 180, 800, 25);
      ctx.fillText(l, cx, cy + 56 + 19 + i * 30);
    });
    ctx.textBaseline = 'alphabetic';
  });

  // Substitutes
  const sx = 740;
  let sy = 360;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#facc15';
  ctx.font = font(800, 32, true);
  ctx.fillText('SUPLENTES', sx, sy);
  sy += 30;
  const rowH = d.subs.length > 8 ? 62 : 74;
  d.subs.slice(0, 11).forEach((s) => {
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    roundRect(ctx, sx, sy, 290, rowH - 10, 14);
    ctx.fill();
    const cy = sy + (rowH - 10) / 2;
    ctx.beginPath();
    ctx.arc(sx + 38, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#0a192a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(800, 26, true);
    ctx.fillText(s.number || '•', sx + 38, cy + 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    fit(s.name, 200, 700, 24);
    ctx.fillText(s.name, sx + 78, cy + 1);
    ctx.textBaseline = 'alphabetic';
    sy += rowH;
  });
  if (d.subs.length === 0) {
    ctx.fillStyle = '#8fc7e6';
    ctx.font = font(500, 22);
    ctx.fillText('Sem suplentes', sx, sy + 20);
    sy += 40;
  }
  sy += 24;
  d.extras.forEach(([label, value]) => {
    ctx.font = font(500, 22);
    ctx.fillStyle = '#8fc7e6';
    ctx.fillText(label, sx, sy);
    const lw = ctx.measureText(`${label} `).width;
    ctx.fillStyle = '#ffffff';
    ctx.font = font(800, 22);
    fit(value, 290 - lw, 800, 22, false, 14);
    ctx.fillText(value, sx + lw, sy);
    sy += 34;
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = font(500, 22);
  ctx.fillText('BolaComVisão', W / 2, H - 40);
}
