import { Exercise, ExerciseMaterial, MaterialId, SessionBlock } from '../types';

/**
 * 🎒 Lista do saco: the material each exercise needs (cones, bibs, balls…) and what to take to a training. The
 * material moves from one exercise to the next, so the training needs the most any one exercise asks for, not the sum.
 */

export const MATERIALS: { id: MaterialId; emoji: string; one: string; many: string }[] = [
  { id: 'cones', emoji: '🔺', one: 'cone', many: 'cones' },
  { id: 'coletes', emoji: '🦺', one: 'colete', many: 'coletes' },
  { id: 'bolas', emoji: '⚽', one: 'bola', many: 'bolas' },
  { id: 'balizas', emoji: '🥅', one: 'baliza pequena', many: 'balizas pequenas' },
  { id: 'estacas', emoji: '📍', one: 'estaca', many: 'estacas' },
  { id: 'arcos', emoji: '⭕', one: 'arco', many: 'arcos' },
  { id: 'barreiras', emoji: '🚧', one: 'mini-barreira', many: 'mini-barreiras' },
  { id: 'escadas', emoji: '🪜', one: 'escada de coordenação', many: 'escadas de coordenação' }
];

export const MAX_PER_MATERIAL = 99;

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
  id: MaterialId;
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
  return MATERIALS.filter((m) => most[m.id]).map((m) => ({
    id: m.id,
    emoji: m.emoji,
    count: most[m.id]!,
    label: materialLabel(m.id, most[m.id]!)
  }));
}

/** Text to copy or send: "🎒 Treino de 02/11 (19:15)\n• 16 cones\n…" */
export function kitBagText(items: KitItem[], date: string, time?: string): string {
  const day = date.slice(0, 10).split('-').reverse().join('/');
  return [`🎒 Material para o treino de ${day}${time ? ` (${time})` : ''}`, ...items.map((i) => `• ${i.label}`)].join(
    '\n'
  );
}
