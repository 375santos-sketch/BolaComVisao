import { DEFAULT_CLUB_COLOR } from './teamSettings';

/**
 * Club colours (Definições → Clube): the app's accent (the cyan of buttons, tabs, titles…) becomes the club's main
 * colour. Tailwind reads its colours from CSS variables, so the whole cyan scale (50…950) and the design-system
 * brand tokens are replaced by shades of the chosen colour; the default colour leaves the original palette.
 */

export const CLUB_COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Azul BolaComVisão', hex: DEFAULT_CLUB_COLOR },
  { name: 'Azul', hex: '#2f7cf6' },
  { name: 'Vermelho', hex: '#e23b3b' },
  { name: 'Verde', hex: '#1fae5b' },
  { name: 'Amarelo', hex: '#f5c518' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Roxo', hex: '#8b5cf6' },
  { name: 'Branco', hex: '#e5e7eb' }
];

const STEPS: [string, number][] = [
  ['50', 0.9],
  ['100', 0.8],
  ['200', 0.6],
  ['300', 0.4],
  ['400', 0.2],
  ['500', 0],
  ['600', -0.15],
  ['700', -0.3],
  ['800', -0.45],
  ['900', -0.6],
  ['950', -0.75]
];

export const isHexColor = (v?: string) => /^#[0-9a-f]{6}$/i.test(v || '');

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** Lighter (amount > 0, towards white) or darker (amount < 0, towards the app's dark blue) shade. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = rgb(hex);
  const target = amount >= 0 ? [255, 255, 255] : [4, 10, 18];
  const t = Math.abs(amount);
  return toHex([r + (target[0] - r) * t, g + (target[1] - g) * t, b + (target[2] - b) * t]);
}

/** Text colour that reads well on the colour (dark on light colours, white on dark ones). */
export function inkFor(hex: string): string {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? '#03131f' : '#ffffff';
}

/** CSS variables for the colour (empty for the default colour: the original palette stays). */
export function clubColorVars(hex?: string): Record<string, string> {
  if (!isHexColor(hex) || hex!.toLowerCase() === DEFAULT_CLUB_COLOR) return {};
  const base = hex!.toLowerCase();
  const vars: Record<string, string> = {};
  STEPS.forEach(([step, amount]) => (vars[`--color-cyan-${step}`] = shade(base, amount)));
  vars['--color-ui-brand'] = base;
  vars['--color-ui-brand-strong'] = shade(base, -0.15);
  vars['--color-ui-brand-ink'] = inkFor(base);
  vars['--gold'] = base;
  vars['--btn-gold-txt'] = inkFor(base);
  return vars;
}

const APPLIED_KEY = '__bcvClubColorVars';

/** Applies the club colour to the page (and removes the previous one). */
export function applyClubColor(hex?: string, root: HTMLElement = document.documentElement) {
  const previous = ((root as unknown as Record<string, string[]>)[APPLIED_KEY] || []) as string[];
  previous.forEach((name) => root.style.removeProperty(name));
  const vars = clubColorVars(hex);
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  (root as unknown as Record<string, string[]>)[APPLIED_KEY] = Object.keys(vars);
}
