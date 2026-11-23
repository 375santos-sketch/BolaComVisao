import { CARD_MAX, NewsletterIssue, OUTCOME_LABEL, cardOf } from './weeklyNewsletter';

/**
 * 📰 The picture of the weekly summary's card in the parents' chat (1200×630, the size chat apps show), drawn on this
 * phone when the coach publishes: the BolaComVisão look (night blue, cyan line, Chakra Petch), the logo, the week's
 * score with win/draw/loss in colour, the opponent and the next game. Saved with the summary and served by the
 * server at /semana/{token}/cartao.jpg. Null when the phone cannot draw it (the card then shows without a picture).
 */

const W = 1200;
const H = 630;
const C = {
  bg: '#0b1220',
  panel: '#111a2b',
  line: '#22324d',
  text: '#e7eef7',
  muted: '#8b9bb4',
  brand: '#22c3ee',
  vitoria: '#22c55e',
  empate: '#94a3b8',
  derrota: '#ef4444'
};
const DISPLAY = '"Chakra Petch", "Plus Jakarta Sans", sans-serif';
const BODY = '"Plus Jakarta Sans", -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Cuts a text to fit `max` pixels, with "…". */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function drawNewsletterCard(teamName: string, issue: NewsletterIssue): Promise<string | null> {
  try {
    const info = cardOf(teamName, issue);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await Promise.all([document.fonts?.load(`700 120px ${DISPLAY}`), document.fonts?.load(`600 40px ${BODY}`)]).catch(
      () => undefined
    );

    // Ground: night blue, a faint pitch circle and the cyan line at the bottom (as in the app's header)
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(34,195,238,0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W - 120, 120, 230, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W - 120, 0);
    ctx.lineTo(W - 120, H);
    ctx.stroke();
    ctx.fillStyle = C.brand;
    ctx.fillRect(0, H - 12, W, 12);

    // Logo
    const logo = await loadImage('/icons/icon-512.png').catch(() => loadImage('/icons/icon-192.png'));
    roundRect(ctx, 64, 150, 300, 300, 28);
    ctx.save();
    ctx.clip();
    ctx.drawImage(logo, 64, 150, 300, 300);
    ctx.restore();
    roundRect(ctx, 64, 150, 300, 300, 28);
    ctx.strokeStyle = C.brand;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Texts
    const x = 420;
    const max = W - x - 64;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.muted;
    ctx.font = `600 30px ${BODY}`;
    ctx.fillText(fit(ctx, info.week.toUpperCase(), max), x, 200);

    ctx.fillStyle = C.text;
    ctx.font = `700 54px ${DISPLAY}`;
    ctx.fillText('Resumo da semana', x, 268);

    if (info.score && info.outcome) {
      ctx.font = `700 150px ${DISPLAY}`;
      ctx.fillStyle = C.text;
      ctx.fillText(info.score, x - 6, 420);
      const scoreW = ctx.measureText(info.score).width;
      const label = OUTCOME_LABEL[info.outcome].toUpperCase();
      ctx.font = `700 30px ${BODY}`;
      const pillW = ctx.measureText(label).width + 40;
      if (x + scoreW + 28 + pillW <= W - 40) {
        roundRect(ctx, x + scoreW + 28, 352, pillW, 54, 27);
        ctx.fillStyle = C[info.outcome];
        ctx.fill();
        ctx.fillStyle = C.bg;
        ctx.fillText(label, x + scoreW + 48, 390);
      }
    }
    ctx.fillStyle = C.text;
    ctx.font = `600 36px ${BODY}`;
    ctx.fillText(fit(ctx, info.opponent, max), x, info.score ? 478 : 400);
    if (info.next) {
      ctx.fillStyle = C.brand;
      ctx.font = `600 32px ${BODY}`;
      ctx.fillText(fit(ctx, info.next, max), x, info.score ? 532 : 454);
    }

    let quality = 0.85;
    let url = canvas.toDataURL('image/jpeg', quality);
    while (url.length > CARD_MAX && quality > 0.4) {
      quality -= 0.15;
      url = canvas.toDataURL('image/jpeg', quality);
    }
    return url.length <= CARD_MAX && url.startsWith('data:image/jpeg') ? url : null;
  } catch {
    return null;
  }
}
