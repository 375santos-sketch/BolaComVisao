/**
 * The look of every PDF: the app's own colours (navy background, cyan accent), like the app's screens.
 *
 * The documents were drawn for white paper, with many colours written by hand (light fills, dark text, pastel badges).
 * Instead of rewriting each of them, every colour a document sets goes through `themeColor`: light fills become the
 * app's navy surfaces, dark text becomes the app's light text, and blues, greens, reds and ambers become the app's
 * cyan, success, danger and warning. The content of the documents does not change, only their colours.
 *
 * The documents are printed, so they use the light version: white paper, the app's navy in the header, footer and
 * section bars, and the app's cyan for the marks. The dark version (navy pages) stays available.
 */

export type Rgb = [number, number, number];
export type PdfTheme = 'dark' | 'light';

/** The app's design tokens (src/index.css). */
export const APP = {
  bg: [11, 18, 32] as Rgb,
  surface: [17, 26, 43] as Rgb,
  surface2: [22, 34, 56] as Rgb,
  surface3: [28, 42, 68] as Rgb,
  line: [34, 50, 77] as Rgb,
  lineStrong: [47, 68, 102] as Rgb,
  text: [231, 238, 247] as Rgb,
  muted: [139, 155, 180] as Rgb,
  brand: [34, 195, 238] as Rgb,
  brandInk: [4, 32, 43] as Rgb,
  success: [34, 197, 94] as Rgb,
  warning: [245, 179, 1] as Rgb,
  danger: [239, 68, 68] as Rgb,
  violet: [167, 139, 250] as Rgb
};

/** The same tokens on white paper: navy text, light cards, the app's cyan for marks (a deeper cyan for text). */
const PAPER: Record<keyof typeof APP, Rgb> = {
  bg: [255, 255, 255],
  surface: [245, 247, 250],
  surface2: [236, 241, 247],
  surface3: [226, 233, 242],
  line: [221, 227, 234],
  lineStrong: [190, 201, 214],
  text: [11, 18, 32],
  muted: [84, 98, 120],
  brand: [8, 145, 178],
  brandInk: [4, 32, 43],
  success: [21, 128, 61],
  warning: [180, 120, 0],
  danger: [200, 40, 40],
  violet: [109, 40, 217]
};

const key = (c: Rgb) => c.join(',');
const TOKEN_OF = new Map<string, keyof typeof APP>(
  (Object.keys(APP) as (keyof typeof APP)[]).map((k) => [key(APP[k]), k])
);

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;

function hsl([r, g, b]: Rgb) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/** The app colour closest in meaning to a hue: blue/cyan → brand, green → success, red → danger, amber → warning. */
function accentOf(h: number): Rgb {
  if (h >= 345 || h < 18) return APP.danger;
  if (h < 65) return APP.warning;
  if (h < 165) return APP.success;
  if (h < 255) return APP.brand;
  return APP.violet;
}

type Kind = 'text' | 'fill' | 'draw';

/** A colour of the old white-paper documents → the app's dark theme. */
export function darkColor(c: Rgb, kind: Kind): Rgb {
  if (TOKEN_OF.has(key(c))) return c;
  const { h, s, l } = hsl(c);
  const grey = s < 0.2 || (l > 0.93 && s < 0.8);
  if (kind === 'text') {
    if (grey) return l < 0.42 || l > 0.82 ? APP.text : APP.muted;
    if (l < 0.42 && (s < 0.45 || l < 0.2)) return APP.text; // dark ink with a hint of colour
    return accentOf(h);
  }
  if (kind === 'fill') {
    if (grey) {
      if (l >= 0.995) return APP.surface;
      if (l >= 0.95) return APP.surface2;
      if (l >= 0.8) return APP.surface3;
      if (l >= 0.45) return APP.lineStrong;
      return APP.surface2;
    }
    if (l > 0.85) return mix(APP.surface2, accentOf(h), 0.16); // pastel badge
    if (l < 0.22) return APP.surface2; // dark navy bands
    return accentOf(h);
  }
  // lines
  if (grey) return l > 0.6 ? APP.line : APP.lineStrong;
  if (l > 0.8) return mix(APP.surface2, accentOf(h), 0.45);
  return accentOf(h);
}

/** The app's tokens on white paper; other colours stay as they were drawn. */
export function lightColor(c: Rgb, kind: Kind = 'text'): Rgb {
  const token = TOKEN_OF.get(key(c));
  if (token === 'brand' && kind !== 'text') return APP.brand; // bars, rings, lines: the app's own cyan
  return token ? PAPER[token] : c;
}

function parse(args: unknown[]): Rgb | null {
  if (args.length >= 3 && args.slice(0, 3).every((n) => typeof n === 'number') && args.length < 4) {
    return args.slice(0, 3) as Rgb;
  }
  if (args.length === 1 && typeof args[0] === 'number') return [args[0], args[0], args[0]] as Rgb;
  if (args.length === 1 && typeof args[0] === 'string' && /^#[0-9a-f]{6}$/i.test(args[0])) {
    const n = parseInt(args[0].slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return null;
}

/**
 * Applies the theme to a new jsPDF document: paints each page's background and passes every colour through the
 * theme. `doc.rawColors(fn)` draws with the colours exactly as given (for the pieces already drawn in app colours).
 */
export function applyPdfTheme(doc: any, theme: PdfTheme) {
  const orig = {
    setTextColor: doc.setTextColor.bind(doc),
    setFillColor: doc.setFillColor.bind(doc),
    setDrawColor: doc.setDrawColor.bind(doc),
    addPage: doc.addPage.bind(doc)
  };
  let raw = 0;
  const wrap = (name: 'setTextColor' | 'setFillColor' | 'setDrawColor', kind: Kind) => {
    doc[name] = (...args: unknown[]) => {
      const c = raw ? null : parse(args);
      if (!c) return orig[name](...args);
      const out = theme === 'dark' ? darkColor(c, kind) : lightColor(c, kind);
      return orig[name](...out);
    };
  };
  wrap('setTextColor', 'text');
  wrap('setFillColor', 'fill');
  wrap('setDrawColor', 'draw');

  const paint = () => {
    if (theme !== 'dark') return;
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    orig.setFillColor(...APP.bg);
    doc.rect(0, 0, w, h, 'F');
  };
  doc.addPage = (...args: unknown[]) => {
    const r = orig.addPage(...args);
    paint();
    return r;
  };
  doc.rawColors = (fn: () => void) => {
    raw++;
    try {
      fn();
    } finally {
      raw--;
    }
  };
  doc.pdfTheme = theme;
  paint();
  return doc;
}
