import { Exercise, SessionBlock, Training } from '../types';
import { areaOf, FieldKind } from './fieldSetup';

/**
 * 🎚️ Exercício no nível certo: after each exercise the coach taps how it went (😓 difícil, 👌 certo, 😴 fácil). The
 * next time the exercise goes into a plan, the app proposes a variant to make it harder or easier (space, touches,
 * joker, a goal to reach), and the library shows how the team got on with it over time. Only for the coaches.
 */

export type ExerciseLevel = 'dificil' | 'certo' | 'facil';

export const LEVELS: Record<ExerciseLevel, { emoji: string; label: string }> = {
  dificil: { emoji: '😓', label: 'Difícil' },
  certo: { emoji: '👌', label: 'Certo' },
  facil: { emoji: '😴', label: 'Fácil' }
};

export interface LevelMark {
  date: string;
  level: ExerciseLevel;
}

/** How the exercise went each time it was rated, oldest first (before `beforeDate`, when given). */
export function levelHistory(trainings: Training[] | undefined, exerciseId: string, beforeDate?: string): LevelMark[] {
  const marks: LevelMark[] = [];
  for (const t of trainings || []) {
    const date = (t?.date || '').slice(0, 10);
    if (!date || (beforeDate && date >= beforeDate.slice(0, 10))) continue;
    for (const b of t.sessionPlan?.blocks || []) {
      if (b.exerciseId === exerciseId && b.level && LEVELS[b.level]) marks.push({ date, level: b.level });
    }
  }
  return marks.sort((a, b) => a.date.localeCompare(b.date));
}

const RANK: Record<ExerciseLevel, number> = { dificil: 0, certo: 1, facil: 2 };

/** One line about the trend, for the library ("A equipa evoluiu…"), or null when there is nothing to say yet. */
export function levelTrend(marks: LevelMark[]): { text: string; tone: 'up' | 'down' | 'ok' } | null {
  if (!marks.length) return null;
  const last = marks[marks.length - 1].level;
  const prev = marks.length > 1 ? marks[marks.length - 2].level : null;
  if (last === 'facil' && prev === 'facil')
    return { text: 'Fácil 2 vezes seguidas: está na altura da variante mais difícil.', tone: 'up' };
  if (last === 'dificil' && prev === 'dificil')
    return { text: 'Difícil 2 vezes seguidas: experimenta a versão mais fácil.', tone: 'down' };
  if (marks.length > 1 && RANK[last] > RANK[marks[0].level] && last === 'facil')
    return { text: 'A equipa evoluiu: está pronta para a variante mais difícil.', tone: 'up' };
  if (marks.length > 1 && RANK[last] > RANK[marks[0].level])
    return { text: 'A equipa está a evoluir neste exercício.', tone: 'ok' };
  if (last === 'facil') return { text: 'Da última vez foi fácil: da próxima, dificulta.', tone: 'up' };
  if (last === 'dificil') return { text: 'Da última vez foi difícil: da próxima, facilita.', tone: 'down' };
  return null;
}

interface Variant {
  id: string;
  label: string;
  /** What goes into the block's notes when applied. */
  note: string;
  /** New size of the space (metres), when the variant changes it. */
  area?: { w: number; l: number };
}

const JOKER = /joker|\+\s*1|\bapoio\b|superioridade/i;
const TOUCHES = /\b[12]\s*toques?\b/i;
const round = (n: number) => Math.max(4, Math.round(n));

/** Variants to make the exercise harder (it was easy) or easier (it was hard); none when it was right. */
export function variantsFor(
  level: ExerciseLevel,
  block: SessionBlock,
  ex: Exercise | undefined,
  field: FieldKind = 'f7'
): Variant[] {
  if (level === 'certo') return [];
  const text = `${ex?.name || ''} ${ex?.description || ''} ${block.title || ''} ${block.notes || ''}`;
  const area = areaOf(block, ex, field);
  const out: Variant[] = [];
  if (level === 'facil') {
    if (area) {
      const a = { w: round(area.w * 0.8), l: round(area.l * 0.8) };
      out.push({
        id: 'menor',
        label: `📐 Espaço mais pequeno: ${a.w}×${a.l} (era ${area.w}×${area.l})`,
        note: `espaço ${a.w}×${a.l}`,
        area: a
      });
    } else
      out.push({ id: 'menor', label: '📐 Espaço mais pequeno (menos tempo para pensar)', note: 'espaço mais pequeno' });
    if (!/\b1\s*toque/i.test(text))
      out.push({
        id: 'toques',
        label: TOUCHES.test(text) ? '✋ Só 1 toque' : '✋ Máximo 2 toques',
        note: TOUCHES.test(text) ? '1 toque' : 'máximo 2 toques'
      });
    if (JOKER.test(text)) out.push({ id: 'semjoker', label: '➖ Sem o joker (igualdade numérica)', note: 'sem joker' });
    out.push(
      ex?.category === 'jogo' || ex?.category === 'tatica'
        ? { id: 'objetivo', label: '⏱️ Golo só vale depois de 5 passes seguidos', note: 'golo só após 5 passes' }
        : { id: 'objetivo', label: '⏱️ 10 passes seguidos = 1 ponto', note: '10 passes seguidos = 1 ponto' }
    );
  } else {
    if (area) {
      const a = { w: round(area.w * 1.2), l: round(area.l * 1.2) };
      out.push({
        id: 'maior',
        label: `📐 Espaço maior: ${a.w}×${a.l} (era ${area.w}×${area.l})`,
        note: `espaço ${a.w}×${a.l}`,
        area: a
      });
    } else out.push({ id: 'maior', label: '📐 Espaço maior (mais tempo para decidir)', note: 'espaço maior' });
    if (!JOKER.test(text))
      out.push({ id: 'joker', label: '➕ Um joker para quem tem a bola', note: 'joker para quem tem a bola' });
    if (TOUCHES.test(text)) out.push({ id: 'livres', label: '✋ Toques livres', note: 'toques livres' });
    out.push({ id: 'pausa', label: '🗣️ Paragem a meio para corrigir (2 min)', note: 'paragem a meio para corrigir' });
  }
  return out.slice(0, 4);
}

/** The block with the chosen variants applied: a "Variante" line in its notes and, when it changes, its space. */
export function applyVariants(block: SessionBlock, level: ExerciseLevel, chosen: Variant[]): SessionBlock {
  const line = `${level === 'facil' ? '⬆️ Mais difícil' : '⬇️ Mais fácil'}: ${chosen.map((v) => v.note).join(', ')}.`;
  const area = chosen.find((v) => v.area)?.area;
  return {
    ...block,
    notes: [block.notes?.trim(), line].filter(Boolean).join('\n'),
    ...(area ? { area } : {}),
    levelChecked: true
  };
}
