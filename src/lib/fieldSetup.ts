import { Exercise, SessionBlock, Training } from '../types';

/**
 * 📐 Montar o campo: from the training's plan, where each exercise goes on the pitch the team has that day (a whole
 * 7-a-side pitch or half of one), with its cones and small goals, and the steps for whoever arrives first to set it
 * up, counted in big adult paces (about 1 m) from the corner flag. Everything is set up before the training: an
 * exercise only reuses another one's space when both do not fit at the same time, and only after that one is over.
 */

export type FieldKind = 'f7' | 'meio-f7';

/** Width (along the goal line) × length (from the goal line), in metres. */
export const FIELDS: Record<FieldKind, { w: number; l: number; label: string }> = {
  f7: { w: 40, l: 60, label: 'Campo de futebol 7' },
  'meio-f7': { w: 40, l: 30, label: 'Meio campo de futebol 7' }
};

/** Monday: the whole 7-a-side pitch; Thursday: half of it (until the coach chooses otherwise for a weekday). */
export const DEFAULT_TRAINING_FIELDS: Record<string, FieldKind> = { '1': 'f7', '4': 'meio-f7' };

interface Area {
  w: number;
  l: number;
}

export interface SetupZone {
  letter: string;
  color: string;
  title: string;
  /** Minutes of the training when it is used ("from–to"). */
  from: number;
  to: number;
  /** Where it is: the corner nearest the flag, in metres from it (x along the goal line, y into the pitch). */
  x: number;
  y: number;
  w: number;
  l: number;
  goals: number;
  /** Set up in the space of another zone (its letter) once that one is over. */
  after?: string;
}

export interface FieldSetup {
  field: FieldKind;
  zones: SetupZone[];
  /** Blocks left out: no size known (the coach is asked) or no space even after the others. */
  missing: string[];
  /** Exercises at the same time that do not fit together. */
  crowded: string[];
}

const COLORS = ['#fbbf24', '#f472b6', '#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#a3e635'];
const LETTERS = 'ABCDEFGHIJKL';
const MARGIN = 2; // from the lines of the pitch
const GAP = 3; // between two zones

const WORDS = /(quadrado|ret[âa]ngulo|espa[çc]o|campo|[áa]rea|zona|corredor|grelha)/i;

/** "20x15 m", "quadrado de 12 x 12", "30×20 passos" → 20 × 15 (player counts like "Jogo 5x5" or "4x2" are not sizes). */
export function parseArea(text: string | undefined): Area | null {
  const t = text || '';
  const re = /(\d{1,2}(?:[.,]\d)?)\s*[x×X]\s*(\d{1,2}(?:[.,]\d)?)\s*(m\b|metros|mts|passos)?/g;
  for (const m of t.matchAll(re)) {
    const a = Number(m[1].replace(',', '.'));
    const b = Number(m[2].replace(',', '.'));
    const before = t.slice(Math.max(0, (m.index || 0) - 25), m.index || 0);
    const sized = Boolean(m[3]) || WORDS.test(before);
    if (!sized || a < 4 || b < 4 || a > 70 || b > 70) continue;
    return { w: Math.round(a), l: Math.round(b) };
  }
  return null;
}

/** The size of a block's space: set by the coach (block or exercise), or written in the exercise. */
export function areaOf(block: SessionBlock, ex: Exercise | undefined, field: FieldKind): Area | null {
  const f = FIELDS[field];
  const set = block.area || ex?.area;
  if (set && set.w > 0 && set.l > 0) return set;
  const space = ex?.spaceDimensions || '';
  if (/campo inteiro/i.test(space)) return { w: f.w, l: f.l };
  if (/½|meio campo/i.test(space)) return field === 'f7' ? { w: f.w, l: f.l / 2 } : { w: f.w, l: f.l };
  if (/¼/.test(space)) return { w: f.w / 2, l: field === 'f7' ? f.l / 2 : f.l };
  return parseArea(space) || parseArea(ex?.description) || parseArea(block.notes) || parseArea(ex?.name);
}

/** The pitch of a training: chosen for it, or the usual one for its weekday, or the whole pitch. */
export function fieldOf(training: Pick<Training, 'date' | 'field'>, byWeekday?: Record<string, FieldKind>): FieldKind {
  if (training.field) return training.field;
  const day = String(new Date(`${training.date.slice(0, 10)}T12:00:00`).getDay());
  return (byWeekday || DEFAULT_TRAINING_FIELDS)[day] || 'f7';
}

interface Rect {
  x: number;
  y: number;
  w: number;
  l: number;
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.l + GAP && b.y < a.y + a.l + GAP;

/** The first free spot (row by row from the flag) for a w × l zone among the ones placed, or null. */
function freeSpot(placed: Rect[], w: number, l: number, field: Area): Rect | null {
  const xs = [MARGIN, ...placed.map((p) => p.x + p.w + GAP)];
  const ys = [MARGIN, ...placed.map((p) => p.y + p.l + GAP)];
  const spots = ys
    .flatMap((y) => xs.map((x) => ({ x, y, w, l })))
    .filter((r) => r.x + r.w <= field.w - MARGIN + 0.01 && r.y + r.l <= field.l - MARGIN + 0.01)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  return spots.find((r) => !placed.some((p) => overlaps(r, p))) || null;
}

/** Where each exercise of the plan goes on the pitch, and what is missing to draw the others. */
export function fieldSetup(
  blocks: SessionBlock[] | undefined,
  library: Exercise[] | undefined,
  field: FieldKind
): FieldSetup {
  const f = FIELDS[field];
  // One zone per exercise (an exercise used twice keeps its space), in the order they are used
  const groups: Array<{ key: string; title: string; from: number; to: number; area: Area | null; goals: number }> = [];
  let minute = 0;
  for (const b of blocks || []) {
    const from = minute;
    minute += b.durationMinutes || 0;
    const ex = b.exerciseId ? (library || []).find((e) => e && e.id === b.exerciseId) : undefined;
    const key = b.exerciseId || b.id;
    const known = groups.find((g) => g.key === key);
    if (known) {
      known.to = minute;
      continue;
    }
    const area = areaOf(b, ex, field);
    groups.push({
      key,
      title: (b.title || ex?.name || 'Exercício').trim(),
      from,
      to: minute,
      area: area ? { w: Math.min(area.w, f.w - 2 * MARGIN), l: Math.min(area.l, f.l - 2 * MARGIN) } : null,
      goals: Math.min(4, Math.max(0, Math.round(ex?.material?.balizas || 0)))
    });
  }

  const missing = groups.filter((g) => !g.area).map((g) => g.title);
  const sized = groups.filter((g) => g.area);
  const toZone = (g: (typeof groups)[number], spot: Rect, after?: string): SetupZone => ({
    title: g.title,
    from: g.from,
    to: g.to,
    goals: g.goals,
    letter: '',
    color: '',
    ...spot,
    ...(after ? { after } : {})
  });
  const place = (placed: Rect[], w: number, l: number) =>
    freeSpot(placed, w, l, f) || (w !== l ? freeSpot(placed, l, w, f) : null);

  // 1) Everything set up at once: bigger zones first, so the small ones fill the gaps
  let zones: SetupZone[] = [];
  let crowded: string[] = [];
  for (const g of [...sized].sort((a, b) => b.area!.w * b.area!.l - a.area!.w * a.area!.l)) {
    const spot = place(zones, g.area!.w, g.area!.l);
    if (!spot) break;
    zones.push(toZone(g, spot));
  }
  // 2) It does not all fit: in the order of the training, an exercise that has no free space goes in the space of
  // one that is over by then (the closest in size), and the cones are moved
  if (zones.length < sized.length) {
    zones = [];
    crowded = [];
    for (const g of sized) {
      const { w, l } = g.area!;
      const primaries = zones.filter((z) => !z.after);
      const spot = place(primaries, w, l);
      if (spot) {
        zones.push(toZone(g, spot));
        continue;
      }
      const busyUntil = (z: SetupZone) => Math.max(z.to, ...zones.filter((o) => o.after === z.title).map((o) => o.to));
      const host = primaries
        .filter((z) => busyUntil(z) <= g.from)
        .sort((a, b) => Math.abs(a.w * a.l - w * l) - Math.abs(b.w * b.l - w * l))[0];
      if (!host) {
        crowded.push(g.title);
        continue;
      }
      const fits = (ww: number, ll: number) => host.x + ww <= f.w - MARGIN && host.y + ll <= f.l - MARGIN;
      const [ww, ll] = fits(w, l)
        ? [w, l]
        : fits(l, w)
          ? [l, w]
          : [Math.min(w, f.w - MARGIN - host.x), Math.min(l, f.l - MARGIN - host.y)];
      zones.push(toZone(g, { x: host.x, y: host.y, w: ww, l: ll }, host.title));
    }
  }
  // Letters and colours in the order the exercises are used
  zones.sort((a, b) => a.from - b.from);
  zones.forEach((z, i) => {
    z.letter = LETTERS[i] || String(i + 1);
    z.color = COLORS[i % COLORS.length];
  });
  zones.forEach((z) => {
    if (z.after) z.after = zones.find((o) => o.title === z.after && !o.after)?.letter;
  });
  return { field, zones, missing, crowded };
}

/** Cones of a zone: its corners, and the middle of the sides longer than 20 m. */
export function conesOf(z: Pick<SetupZone, 'x' | 'y' | 'w' | 'l'>): Array<[number, number]> {
  const pts: Array<[number, number]> = [
    [z.x, z.y],
    [z.x + z.w, z.y],
    [z.x, z.y + z.l],
    [z.x + z.w, z.y + z.l]
  ];
  if (z.w > 20) pts.push([z.x + z.w / 2, z.y], [z.x + z.w / 2, z.y + z.l]);
  if (z.l > 20) pts.push([z.x, z.y + z.l / 2], [z.x + z.w, z.y + z.l / 2]);
  return pts;
}

/** Small goals: in the middle of the two short sides (two per side when there are 4). */
export function goalsOf(
  z: Pick<SetupZone, 'x' | 'y' | 'w' | 'l' | 'goals'>
): Array<{ x: number; y: number; across: boolean }> {
  if (!z.goals) return [];
  const alongW = z.w <= z.l; // short sides are the ones of width w
  const side = (end: 0 | 1, at: number) =>
    alongW
      ? { x: z.x + z.w * at, y: z.y + z.l * end, across: true }
      : { x: z.x + z.w * end, y: z.y + z.l * at, across: false };
  if (z.goals === 1) return [side(1, 0.5)];
  if (z.goals <= 3) return [side(0, 0.5), side(1, 0.5)];
  return [side(0, 1 / 3), side(0, 2 / 3), side(1, 1 / 3), side(1, 2 / 3)];
}

const r = (n: number) => Math.round(n);

/** The steps to set the pitch up, from the corner flag, in paces (or metres). */
export function setupSteps(
  setup: FieldSetup,
  unit: 'passos' | 'm' = 'passos'
): Array<{ zone?: string; color?: string; text: string; sub: string }> {
  const u = (n: number) => `${r(n)} ${unit === 'm' ? 'm' : r(n) === 1 ? 'passo' : 'passos'}`;
  const steps = setup.zones.map((z) => {
    const cones = conesOf(z).length;
    const goals = goalsOf(z).length;
    const shape = r(z.w) === r(z.l) ? 'um quadrado' : 'um retângulo';
    const where = z.after
      ? `Quando acabar a zona ${z.after}, muda os cones dela para ${shape} de ${u(z.w)} × ${u(z.l)}`
      : `Da 🚩, anda ${u(z.x)} ao longo da linha de fundo e ${u(z.y)} para dentro do campo: 1.º cone. Daí faz ${shape} de ${u(z.w)} (ao longo da linha de fundo) × ${u(z.l)} (para dentro)`;
    const extra = goals
      ? `. ${goals === 1 ? 'Uma baliza pequena' : `${goals} balizas pequenas`} nos lados mais curtos`
      : '';
    return {
      zone: z.letter,
      color: z.color,
      text: `${where}${extra}.`,
      sub: `Zona ${z.letter} · ${z.title} · ${cones} cones${goals ? ` e ${goals} ${goals === 1 ? 'baliza' : 'balizas'}` : ''}`
    };
  });
  return steps;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

/**
 * The pitch drawn (SVG, metres as units), with the zones, their cones, goals and sizes. The flag's corner is at the
 * bottom left. Same drawing in the app and in the assistant's link.
 */
export function fieldSvg(setup: FieldSetup, unit: 'passos' | 'm' = 'passos'): string {
  const f = FIELDS[setup.field];
  const P = 3; // around the pitch
  const Y = (y: number) => f.l - y; // y grows up the pitch
  const line = 'stroke="#ffffff" stroke-opacity=".85" stroke-width=".35" fill="none"';
  const box = (atBottom: boolean) => {
    const bw = Math.min(f.w - 6, 26);
    const bl = 9;
    const x = (f.w - bw) / 2;
    const y = atBottom ? Y(bl) : Y(f.l);
    const gx = (f.w - 6) / 2;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bl}" ${line}/><rect x="${gx}" y="${atBottom ? f.l : -1.2}" width="6" height="1.2" fill="#ffffff"/>`;
  };
  const marks =
    setup.field === 'f7'
      ? `${box(true)}${box(false)}<line x1="0" y1="${f.l / 2}" x2="${f.w}" y2="${f.l / 2}" ${line}/><circle cx="${f.w / 2}" cy="${f.l / 2}" r="6" ${line}/>`
      : `${box(true)}<line x1="0" y1="0" x2="${f.w}" y2="0" ${line} stroke-dasharray="1.2 1"/>`;
  const u = unit === 'm' ? 'm' : 'passos';
  const zones = setup.zones
    .map((z) => {
      const cones = conesOf(z)
        .map(([x, y]) => `<circle cx="${x}" cy="${Y(y)}" r=".9" fill="${z.color}" stroke="#fff" stroke-width=".3"/>`)
        .join('');
      const goals = goalsOf(z)
        .map((g) =>
          g.across
            ? `<rect x="${g.x - 1.5}" y="${Y(g.y) - 0.5}" width="3" height="1" rx=".2" fill="#fff"/>`
            : `<rect x="${g.x - 0.5}" y="${Y(g.y) - 1.5}" width="1" height="3" rx=".2" fill="#fff"/>`
        )
        .join('');
      const label = `${z.letter}${z.after ? ` · depois de ${z.after}` : ''}`;
      // The size: under the zone, or above it for a zone set up later in the same space (so they do not overlap)
      const dimY = z.after ? Y(z.y + z.l) - 0.8 : Y(z.y) + 1.9;
      return `<g><rect x="${z.x}" y="${Y(z.y + z.l)}" width="${z.w}" height="${z.l}" fill="${z.color}" fill-opacity="${z.after ? 0 : 0.14}" stroke="${z.color}" stroke-width=".35" stroke-dasharray="${z.after ? '.6 .6' : '1.2 .8'}"/>${cones}${goals}<text x="${z.after ? z.x + z.w - 1 : z.x + 1}" y="${Y(z.y + z.l) + 2.2}" font-size="1.6" font-weight="800" text-anchor="${z.after ? 'end' : 'start'}" fill="${z.color}" stroke="#0b3d1d" stroke-width=".45" paint-order="stroke">${esc(label)}</text><text x="${z.x + z.w / 2}" y="${dimY}" font-size="1.35" font-weight="700" text-anchor="middle" fill="#fff" stroke="#0b3d1d" stroke-width=".4" paint-order="stroke">${r(z.w)} × ${r(z.l)} ${u}</text></g>`;
    })
    .join('');
  const stripes = Array.from({ length: Math.ceil(f.l / 6) }, (_, i) =>
    i % 2 ? `<rect x="0" y="${i * 6}" width="${f.w}" height="6" fill="#1c7035"/>` : ''
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-P} ${-P} ${f.w + 2 * P} ${f.l + 2 * P}" role="img" aria-label="Campo com as zonas dos exercícios" style="width:100%;height:auto;display:block;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif"><rect x="${-P}" y="${-P}" width="${f.w + 2 * P}" height="${f.l + 2 * P}" rx="2" fill="#17602d"/><rect x="0" y="0" width="${f.w}" height="${f.l}" fill="#1f7a3a"/>${stripes}<rect x="0" y="0" width="${f.w}" height="${f.l}" ${line} stroke-width=".5"/>${marks}${zones}<text x="-1.6" y="${f.l + 2.2}" font-size="3">🚩</text></svg>`;
}

/** The setup checked when it comes back from the published plan (numbers kept inside the pitch). */
export function cleanSetup(raw: unknown): FieldSetup | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Record<string, any>;
  const field: FieldKind = s.field === 'meio-f7' ? 'meio-f7' : 'f7';
  const f = FIELDS[field];
  const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Number(v) || 0));
  const zones: SetupZone[] = (Array.isArray(s.zones) ? s.zones : []).slice(0, 12).map((z: any, i: number) => ({
    letter: String(z?.letter || LETTERS[i]).slice(0, 2),
    color: /^#[0-9a-f]{6}$/i.test(z?.color) ? z.color : COLORS[i % COLORS.length],
    title: String(z?.title || 'Exercício').slice(0, 80),
    from: num(z?.from, 300),
    to: num(z?.to, 300),
    x: num(z?.x, f.w),
    y: num(z?.y, f.l),
    w: num(z?.w, f.w),
    l: num(z?.l, f.l),
    goals: Math.round(num(z?.goals, 4)),
    ...(typeof z?.after === 'string' ? { after: z.after.slice(0, 2) } : {})
  }));
  if (!zones.length) return undefined;
  return { field, zones, missing: [], crowded: [] };
}
