import { Exercise, ExerciseMaterial, MaterialId, SessionBlock } from '../types';

/**
 * 🎒 Lista do saco: the material each exercise needs (cones, bibs, balls…) and what to take to a training. The
 * material moves from one exercise to the next, so the training needs the most any one exercise asks for, not the sum.
 */

const MATERIALS: { id: MaterialId; emoji: string; one: string; many: string }[] = [
  { id: 'cones', emoji: '🔺', one: 'cone', many: 'cones' },
  { id: 'coletes', emoji: '🦺', one: 'colete', many: 'coletes' },
  { id: 'bolas', emoji: '⚽', one: 'bola', many: 'bolas' },
  { id: 'balizas', emoji: '🥅', one: 'baliza pequena', many: 'balizas pequenas' },
  { id: 'estacas', emoji: '📍', one: 'estaca', many: 'estacas' },
  { id: 'arcos', emoji: '⭕', one: 'arco', many: 'arcos' },
  { id: 'barreiras', emoji: '🚧', one: 'mini-barreira', many: 'mini-barreiras' },
  { id: 'escadas', emoji: '🪜', one: 'escada de coordenação', many: 'escadas de coordenação' }
];

const MAX_PER_MATERIAL = 99;

const materialLabel = (id: MaterialId, n: number) => {
  const m = MATERIALS.find((x) => x.id === id)!;
  return `${n} ${n === 1 ? m.one : m.many}`;
};

/** Only known items with a whole quantity from 1 to 99 (also cleans what is read from a photo). */
export function cleanMaterial(raw: unknown): ExerciseMaterial | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: ExerciseMaterial = {};
  MATERIALS.forEach(({ id }) => {
    const n = Math.round(Number((raw as Record<string, unknown>)[id]));
    if (Number.isFinite(n) && n > 0) out[id] = Math.min(n, MAX_PER_MATERIAL);
  });
  return Object.keys(out).length ? out : undefined;
}

/** "8 cones · 6 coletes · 4 bolas" */
export const materialSummary = (material?: ExerciseMaterial) =>
  MATERIALS.filter((m) => (material?.[m.id] || 0) > 0)
    .map((m) => materialLabel(m.id, material![m.id]!))
    .join(' · ');

interface KitItem {
  id: string; // a material, or "outro:<text>" for something written that is not one of them
  emoji: string;
  count: number;
  label: string; // "16 cones"
}

/** What to take to a training: for each item, the most that one of its exercises needs. */
export function kitBag(blocks: SessionBlock[] | undefined, library: Exercise[] | undefined): KitItem[] {
  const most: Partial<Record<MaterialId, number>> = {};
  (blocks || []).forEach((b) => {
    const ex = b.exerciseId ? (library || []).find((e) => e && e.id === b.exerciseId) : undefined;
    const mat = cleanMaterial(ex?.material);
    if (!mat) return;
    (Object.keys(mat) as MaterialId[]).forEach((id) => {
      most[id] = Math.max(most[id] || 0, mat[id]!);
    });
  });
  const known = MATERIALS.filter((m) => most[m.id]).map((m) => ({
    id: m.id as string,
    emoji: m.emoji,
    count: most[m.id]!,
    label: materialLabel(m.id, most[m.id]!)
  }));
  // What was written without being one of the known items ("8 argolas", "apito") goes in as written
  const others = new Map<string, string>();
  (blocks || []).forEach((b) => {
    const ex = b.exerciseId ? (library || []).find((e) => e && e.id === b.exerciseId) : undefined;
    for (const o of parseMaterialText(ex?.materialText).others) others.set(norm(o), o);
  });
  return [...known, ...[...others].map(([key, label]) => ({ id: `outro:${key}`, emoji: '🎒', count: 1, label }))];
}

/** Text to copy or send: "🎒 Treino de 02/11 (19:15)\n• 16 cones\n…" */
export function kitBagText(items: KitItem[], date: string, time?: string): string {
  const day = date.slice(0, 10).split('-').reverse().join('/');
  return [`🎒 Material para o treino de ${day}${time ? ` (${time})` : ''}`, ...items.map((i) => `• ${i.label}`)].join(
    '\n'
  );
}

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Words that name each material (singular/plural, with or without the accent and "pequena"). */
const MATERIAL_WORDS: Record<MaterialId, RegExp> = {
  cones: /\b(cones?|sinalizadores?|pratos?|chapeus? chineses?)\b/,
  coletes: /\bcoletes?\b/,
  bolas: /\bbolas?\b/,
  balizas: /\b(mini[- ]?)?balizas?\b/,
  estacas: /\b(estacas?|varas?|postes?)\b/,
  arcos: /\b(arcos?|argolas?)\b/,
  barreiras: /\b(mini[- ]?)?barreiras?\b/,
  escadas: /\bescadas?\b/
};

/**
 * The material written by the coach ("16 cones, 2 balizas pequenas, coletes") read into quantities, for the list of
 * what to take; what is not one of the known items stays as written (`others`).
 */
export function parseMaterialText(text: string | undefined): { material?: ExerciseMaterial; others: string[] } {
  const out: ExerciseMaterial = {};
  const others: string[] = [];
  for (const raw of (text || '').split(/[\n,;·•]+|\s+e\s+/)) {
    const part = raw.trim().replace(/^[-–*]\s*/, '');
    if (!part) continue;
    const t = norm(part);
    const id = (Object.keys(MATERIAL_WORDS) as MaterialId[]).find((k) => MATERIAL_WORDS[k].test(t));
    const n = Number(/(\d{1,2})/.exec(t)?.[1] || 0);
    if (id) {
      if (n > 0) out[id] = Math.min(MAX_PER_MATERIAL, Math.max(out[id] || 0, n));
      else others.push(part);
    } else others.push(part);
  }
  return { material: cleanMaterial(out), others };
}

/** The material as it shows in the form and the library: what the coach wrote, or the quantities. */
export const materialTextOf = (ex: Pick<Exercise, 'materialText' | 'material'>) =>
  ex.materialText ?? materialSummary(ex.material);
