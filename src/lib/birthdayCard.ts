/**
 * Birthday picture (Início / Equipa → 🎂): a festive picture to share with the team's parents on an athlete's (or
 * coach's) birthday. The photo only goes in with the parents' permission; otherwise the shirt number or initials.
 */

interface BirthdayCardData {
  clubName: string;
  category?: string;
  name: string;
  age: number;
  /** Shirt number (athletes) or initials (staff), shown when there is no photo. */
  badge: string;
  dateLabel: string; // "23 de outubro"
  photo?: HTMLImageElement | null;
  logo?: HTMLImageElement | null;
}

export const BIRTHDAY_CARD_SIZE = { width: 1080, height: 1350 };

/** Initials for the badge ("Rui Silva" → "RS"). */
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

// Confetti in fixed places (the same picture every time)
const CONFETTI: [number, number, number, string][] = [
  [90, 160, 14, '#facc15'],
  [980, 210, 12, '#00bef0'],
  [160, 520, 10, '#f472b6'],
  [930, 560, 16, '#facc15'],
  [70, 860, 12, '#00bef0'],
  [1010, 880, 10, '#f472b6'],
  [210, 1210, 14, '#00bef0'],
  [880, 1190, 12, '#facc15'],
  [60, 420, 9, '#f472b6'],
  [120, 680, 8, '#facc15'],
  [960, 700, 9, '#00bef0']
];

export function drawBirthdayCard(ctx: CanvasRenderingContext2D, d: BirthdayCardData) {
  const { width: W, height: H } = BIRTHDAY_CARD_SIZE;
  const font = (weight: number, size: number) => `${weight} ${size}px "Chakra Petch", "Segoe UI", Arial, sans-serif`;
  const fit = (text: string, weight: number, size: number, y: number, min = 28) => {
    let s = size;
    ctx.font = font(weight, s);
    while (ctx.measureText(text).width > W - 140 && s > min) {
      s -= 2;
      ctx.font = font(weight, s);
    }
    ctx.fillText(text, W / 2, y);
  };

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1e1b4b');
  bg.addColorStop(1, '#0a192a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  CONFETTI.forEach(([x, y, r, c]) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#f472b6';
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, H - 14, W, 14);

  ctx.textAlign = 'center';
  if (d.logo) ctx.drawImage(d.logo, W / 2 - 55, 55, 110, 110);
  ctx.fillStyle = '#ffffff';
  fit(d.clubName.toUpperCase(), 700, 40, d.logo ? 215 : 120);
  if (d.category) {
    ctx.fillStyle = '#c4b5fd';
    ctx.font = font(500, 30);
    ctx.fillText(d.category, W / 2, d.logo ? 258 : 163);
  }

  ctx.fillStyle = '#facc15';
  fit('🎉 PARABÉNS! 🎂', 800, 100, 390);

  // Photo (with permission) or badge in a circle
  const cx = W / 2;
  const cy = 640;
  const r = 185;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#312e81';
  ctx.fill();
  if (d.photo) {
    ctx.clip();
    const s = Math.max((2 * r) / d.photo.naturalWidth, (2 * r) / d.photo.naturalHeight);
    const w = d.photo.naturalWidth * s;
    const h = d.photo.naturalHeight * s;
    ctx.drawImage(d.photo, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = font(800, d.badge.length > 2 ? 120 : 180);
    ctx.textBaseline = 'middle';
    ctx.fillText(d.badge || '⚽', cx, cy + 8);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
  ctx.strokeStyle = '#f472b6';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  fit(d.name, 800, 92, 935, 48);
  ctx.fillStyle = '#facc15';
  fit(`${d.age} anos!`, 800, 72, 1030);
  ctx.fillStyle = '#e0e7ff';
  fit('Muitas felicidades da tua equipa! ⚽', 600, 40, 1110);
  ctx.fillStyle = '#c4b5fd';
  ctx.font = font(500, 30);
  ctx.fillText(d.dateLabel, W / 2, 1170);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = font(500, 26);
  ctx.fillText('BolaComVisão', W / 2, H - 40);
}
