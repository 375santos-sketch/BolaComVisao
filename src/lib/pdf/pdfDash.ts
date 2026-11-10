import { APP, Rgb } from './pdfTheme';

/**
 * Dashboard pieces of the documents, in the app's colours: cards, big numbers (KPI), rings, bars, the score of a game
 * and tables whose header comes back on every new page. They only draw numbers the document already has.
 */

type Doc = any;

/** Lowest y for content before the footer. */
const PAGE_BOTTOM = 278;
/** Where content starts on a new page. */
const PAGE_TOP = 18;

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'muted' | 'text';
const toneColor = (tone: Tone = 'brand'): Rgb =>
  tone === 'muted' ? APP.muted : tone === 'text' ? APP.text : APP[tone];

/** A soft fill of a colour for pills: on white paper a pale tint, on the navy pages a dark one. */
function tint(doc: Doc, c: Rgb): Rgb {
  const base: Rgb = doc.pdfTheme === 'dark' ? APP.surface2 : [255, 255, 255];
  return c.map((v, i) => Math.round(base[i] + (v - base[i]) * (doc.pdfTheme === 'dark' ? 0.2 : 0.14))) as Rgb;
}

/** A rounded card: surface, thin line. */
export function card(doc: Doc, x: number, y: number, w: number, h: number, fill: Rgb = APP.surface) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...APP.line);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');
}

/** Shrinks the font until the text fits the width. */
function fit(doc: Doc, text: string, width: number, size: number, min = 6) {
  doc.setFontSize(size);
  while (size > min && doc.getTextWidth(text) > width) doc.setFontSize((size -= 0.5));
  return size;
}

interface Kpi {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}

/** A row of KPI cards: small label, big number, a line below. Returns the height used. */
export function kpiRow(doc: Doc, items: Kpi[], y: number, opts: { x?: number; width?: number; h?: number } = {}) {
  const x0 = opts.x ?? 15;
  const width = opts.width ?? 180;
  const h = opts.h ?? 21;
  const gap = 3;
  const w = (width - gap * (items.length - 1)) / items.length;
  items.forEach((k, i) => {
    const x = x0 + i * (w + gap);
    card(doc, x, y, w, h);
    doc.setFillColor(...toneColor(k.tone));
    doc.roundedRect(x + 3.5, y + 3, 6, 0.9, 0.45, 0.45, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...APP.muted);
    fit(doc, k.label.toUpperCase(), w - 7, 6.2, 5);
    doc.text(k.label.toUpperCase(), x + 3.5, y + 7.6);
    doc.setTextColor(...(k.tone && k.tone !== 'brand' ? toneColor(k.tone) : APP.text));
    fit(doc, k.value, w - 7, 17, 9);
    doc.text(k.value, x + 3.5, y + 15);
    if (k.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...APP.muted);
      fit(doc, k.sub, w - 7, 6.5, 5);
      doc.text(k.sub, x + 3.5, y + 18.6);
    }
  });
  return h;
}

/** A ring: the track and the share `frac` (0–1) in colour, clockwise from the top, with text in the middle. */
export function ring(
  doc: Doc,
  cx: number,
  cy: number,
  r: number,
  frac: number,
  color: Rgb,
  center: string,
  opts: { thickness?: number; label?: string } = {}
) {
  const t = opts.thickness ?? r * 0.24;
  doc.setLineCap?.('round');
  doc.setDrawColor(...APP.surface3);
  doc.setLineWidth(t);
  doc.circle(cx, cy, r, 'S');
  const f = Math.max(0, Math.min(1, frac || 0));
  if (f > 0) {
    doc.setDrawColor(...color);
    const steps = Math.max(2, Math.round(72 * f));
    let px = cx;
    let py = cy - r;
    for (let i = 1; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * f * Math.PI * 2;
      const nx = cx + r * Math.cos(a);
      const ny = cy + r * Math.sin(a);
      doc.line(px, py, nx, ny);
      px = nx;
      py = ny;
    }
  }
  doc.setLineCap?.('butt');
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...APP.text);
  fit(doc, center, r * 1.5, r * 1.15, 6);
  doc.text(center, cx, cy + r * 0.2, { align: 'center' });
  if (opts.label) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...APP.muted);
    fit(doc, opts.label, r * 4, 6.5, 5);
    doc.text(opts.label, cx, cy + r + t + 4, { align: 'center' });
  }
}

/**
 * "Nós | Adversário" bars for the same measure, the larger side brighter: each row reads
 * `ours  [====|==]  theirs` with the label above. Returns the height used.
 */
export function compareRows(
  doc: Doc,
  rows: { label: string; ours: number; theirs: number }[],
  x: number,
  y: number,
  w: number,
  heads: [string, string] = ['Nós', 'Adversário']
) {
  let cy = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...APP.brand);
  doc.text(heads[0].toUpperCase(), x, cy + 2);
  doc.setTextColor(...APP.muted);
  doc.text(heads[1].toUpperCase(), x + w, cy + 2, { align: 'right' });
  cy += 5;
  const mid = x + w / 2;
  const half = w / 2 - 12;
  rows.forEach((r) => {
    const max = Math.max(1, r.ours, r.theirs);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...APP.muted);
    doc.text(r.label, mid, cy + 2.2, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...APP.text);
    doc.text(String(r.ours), x, cy + 7.6);
    doc.text(String(r.theirs), x + w, cy + 7.6, { align: 'right' });
    const by = cy + 4.6;
    doc.setFillColor(...APP.surface3);
    doc.roundedRect(mid - half, by, half - 0.8, 3, 1.5, 1.5, 'F');
    doc.roundedRect(mid + 0.8, by, half - 0.8, 3, 1.5, 1.5, 'F');
    const ow = (half - 0.8) * (r.ours / max);
    const tw = (half - 0.8) * (r.theirs / max);
    if (ow > 0) {
      doc.setFillColor(...APP.brand);
      doc.roundedRect(mid - 0.8 - ow, by, ow, 3, 1.5, 1.5, 'F');
    }
    if (tw > 0) {
      doc.setFillColor(...APP.muted);
      doc.roundedRect(mid + 0.8, by, tw, 3, 1.5, 1.5, 'F');
    }
    cy += 9.5;
  });
  return cy - y;
}

/** A small pill with text (e.g. "VITÓRIA"). Returns its width. */
function pill(doc: Doc, text: string, x: number, y: number, tone: Tone, align: 'left' | 'center' = 'left') {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const w = doc.getTextWidth(text) + 6;
  const left = align === 'center' ? x - w / 2 : x;
  const c = toneColor(tone);
  doc.setFillColor(...tint(doc, c));
  doc.setDrawColor(...c);
  doc.setLineWidth(0.3);
  doc.roundedRect(left, y, w, 5.4, 2.7, 2.7, 'FD');
  doc.setTextColor(...c);
  doc.text(text, left + w / 2, y + 3.75, { align: 'center' });
  return w;
}

/**
 * The game's big card: competition on top, home team, score, away team, the result in a pill and the date/place
 * line. Returns the height used.
 */
export function scoreHero(
  doc: Doc,
  y: number,
  g: {
    kicker?: string;
    home: string;
    away: string;
    score: string;
    result?: { text: string; tone: Tone };
    meta?: string;
    oursHome?: boolean;
  }
) {
  const h = 40;
  card(doc, 15, y, 180, h, APP.surface);
  doc.setFillColor(...APP.brand);
  doc.roundedRect(15, y, 180, 1.2, 0.6, 0.6, 'F');
  if (g.kicker) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...APP.brand);
    doc.text(g.kicker.toUpperCase(), 105, y + 7.5, { align: 'center', charSpace: 0.4 });
  }
  // Team names on each side, ours in the light text, theirs muted
  const side = (name: string, x: number, align: 'right' | 'left', ours: boolean) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(ours ? APP.text : APP.muted));
    const lines = doc.splitTextToSize(name, 58) as string[];
    fit(doc, lines[0], 58, 13, 8);
    doc.text(lines[0], x, y + 19, { align });
  };
  side(g.home, 72, 'right', g.oursHome !== false);
  side(g.away, 138, 'left', g.oursHome === false);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...APP.text);
  doc.text(g.score, 105, y + 22, { align: 'center' });
  if (g.result) pill(doc, g.result.text, 105, y + 25.5, g.result.tone, 'center');
  if (g.meta) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...APP.muted);
    fit(doc, g.meta, 170, 8, 6);
    doc.text(g.meta, 105, y + 36, { align: 'center' });
  }
  return h;
}

interface Column {
  title: string;
  w: number;
  align?: 'left' | 'right' | 'center';
}
interface CellStyle {
  color?: Rgb;
  bold?: boolean;
  /** A small coloured pill around the text. */
  pill?: Tone;
}
type Cell = string | { text: string; style?: CellStyle };

/**
 * A table on navy: a header row in small capitals, alternating rows, and the header drawn again at the top of each
 * new page. Returns the y after the table.
 */
export function table(
  doc: Doc,
  cols: Column[],
  rows: Cell[][],
  y: number,
  opts: { x?: number; rowH?: number; size?: number; accent?: Rgb; top?: number; bottom?: number } = {}
) {
  const x0 = opts.x ?? 15;
  const rowH = opts.rowH ?? 7;
  const size = opts.size ?? 8;
  const width = cols.reduce((s, c) => s + c.w, 0);
  const top = opts.top ?? PAGE_TOP;
  const bottom = opts.bottom ?? PAGE_BOTTOM;
  const header = () => {
    doc.setFillColor(...APP.surface2);
    doc.roundedRect(x0, y, width, 6, 1.5, 1.5, 'F');
    doc.setFillColor(...(opts.accent || APP.brand));
    doc.rect(x0, y + 5.6, width, 0.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    doc.setTextColor(...APP.muted);
    let cx = x0;
    cols.forEach((c) => {
      const tx = c.align === 'right' ? cx + c.w - 2.5 : c.align === 'center' ? cx + c.w / 2 : cx + 2.5;
      doc.text(c.title.toUpperCase(), tx, y + 4, { align: c.align || 'left' });
      cx += c.w;
    });
    y += 6.5;
  };
  if (y + 6.5 + rowH > bottom) {
    doc.addPage();
    y = top;
  }
  header();
  rows.forEach((row, ri) => {
    if (y + rowH > bottom) {
      doc.addPage();
      y = top;
      header();
    }
    doc.setFillColor(...(ri % 2 === 0 ? APP.surface : APP.bg));
    doc.rect(x0, y, width, rowH, 'F');
    let cx = x0;
    row.forEach((cell, ci) => {
      const c = cols[ci];
      if (!c) return;
      const text = typeof cell === 'string' ? cell : cell.text;
      const style = typeof cell === 'string' ? {} : cell.style || {};
      doc.setFont('helvetica', style.bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const max = c.w - 5;
      let shown = text;
      if (doc.getTextWidth(shown) > max) {
        while (shown.length > 1 && doc.getTextWidth(`${shown}…`) > max) shown = shown.slice(0, -1);
        shown = `${shown}…`;
      }
      const ty = y + rowH / 2 + size * 0.13;
      if (style.pill) {
        doc.setFontSize(size - 1);
        const pw = Math.min(c.w - 3, doc.getTextWidth(shown) + 5);
        const tone = toneColor(style.pill);
        doc.setFillColor(...tint(doc, tone));
        doc.setDrawColor(...tone);
        doc.setLineWidth(0.25);
        doc.roundedRect(cx + 1.5, y + rowH / 2 - 2.4, pw, 4.8, 2.4, 2.4, 'FD');
        doc.setTextColor(...tone);
        doc.text(shown, cx + 1.5 + pw / 2, ty - 0.1, { align: 'center' });
      } else {
        doc.setTextColor(...(style.color || APP.text));
        const tx = c.align === 'right' ? cx + c.w - 2.5 : c.align === 'center' ? cx + c.w / 2 : cx + 2.5;
        doc.text(shown, tx, ty, { align: c.align || 'left' });
      }
      cx += c.w;
    });
    y += rowH;
  });
  return y;
}

/** A side panel: a card with a title and "label … value" lines. Returns the height used. */
export function sidePanel(doc: Doc, x: number, y: number, w: number, title: string, lines: [string, string, Tone?][]) {
  const h = 11 + lines.length * 7;
  card(doc, x, y, w, h);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...APP.muted);
  doc.text(title.toUpperCase(), x + 4, y + 6.5);
  lines.forEach(([label, value, tone], i) => {
    const ly = y + 13 + i * 7;
    doc.setDrawColor(...APP.line);
    doc.setLineWidth(0.2);
    if (i > 0) doc.line(x + 4, ly - 3.8, x + w - 4, ly - 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...APP.muted);
    doc.text(label, x + 4, ly);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(tone ? toneColor(tone) : APP.text));
    doc.text(value, x + w - 4, ly, { align: 'right' });
  });
  return h;
}

/**
 * Lines over the games, oldest first (e.g. goals scored and conceded per game), on a light grid with the values on
 * the left and "J1, J2…" below. Returns nothing (fills the box).
 */
export function lineChart(
  doc: Doc,
  series: { values: number[]; color: Rgb; label: string }[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  const n = Math.max(...series.map((s) => s.values.length));
  if (n === 0) return;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const left = x + 7;
  const bottom = y + h - 5;
  const top = y + 7;
  const step = max <= 5 ? 1 : Math.ceil(max / 5);
  const yOf = (v: number) => bottom - (v / (Math.ceil(max / step) * step)) * (bottom - top);
  const xOf = (i: number) => (n === 1 ? left + (w - 9) / 2 : left + 2 + (i / (n - 1)) * (w - 11));
  // legend
  let lx = x + w / 2 - series.length * 18;
  series.forEach((s) => {
    doc.setFillColor(...s.color);
    doc.circle(lx, y + 2, 1.1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...APP.muted);
    doc.text(s.label, lx + 2.2, y + 3);
    lx += doc.getTextWidth(s.label) + 9;
  });
  doc.setLineWidth(0.15);
  for (let v = 0; v <= Math.ceil(max / step) * step; v += step) {
    doc.setDrawColor(...APP.line);
    doc.line(left, yOf(v), x + w, yOf(v));
    doc.setFontSize(6.5);
    doc.setTextColor(...APP.muted);
    doc.text(String(v), left - 2, yOf(v) + 1, { align: 'right' });
  }
  const every = Math.ceil(n / 18);
  for (let i = 0; i < n; i += every) {
    doc.setFontSize(6);
    doc.setTextColor(...APP.muted);
    doc.text(`J${i + 1}`, xOf(i), bottom + 4, { align: 'center' });
  }
  series.forEach((s) => {
    doc.setDrawColor(...s.color);
    doc.setLineWidth(0.6);
    for (let i = 1; i < s.values.length; i++) doc.line(xOf(i - 1), yOf(s.values[i - 1]), xOf(i), yOf(s.values[i]));
    doc.setFillColor(...s.color);
    s.values.forEach((v, i) => doc.circle(xOf(i), yOf(v), 0.75, 'F'));
  });
  doc.setLineWidth(0.2);
}
