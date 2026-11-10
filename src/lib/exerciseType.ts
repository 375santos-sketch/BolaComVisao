import { Exercise, ExerciseCategory } from '../types';

/**
 * The exercise's type is written by the coach ("Rondo", "Finalização", "Jogo reduzido"…). The app still works out one
 * of its seven groups from it, for the colours of the plan and the "Montar o campo"/"nível certo" suggestions.
 */

const GROUP_NAMES: Record<ExerciseCategory, string> = {
  aquecimento: 'Aquecimento',
  tecnica: 'Técnica',
  tatica: 'Tática',
  fisico: 'Físico',
  jogo: 'Jogo',
  bolas_paradas: 'Bolas paradas',
  calma: 'Retorno à calma'
};

/** Suggestions while writing (the coach can write anything else). */
export const TYPE_SUGGESTIONS = [
  ...Object.values(GROUP_NAMES),
  'Rondo',
  'Posse de bola',
  'Finalização',
  'Jogo reduzido',
  'Coordenação',
  'Passe e receção',
  'Condução',
  '1x1',
  'Transição'
];

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The group a written type belongs to ("Finalização" → técnica, "Jogo reduzido" → jogo); `fallback` when unclear. */
export function categoryFromType(text: string, fallback: ExerciseCategory = 'tecnica'): ExerciseCategory {
  const t = norm(text);
  if (!t.trim()) return fallback;
  if (/aquec|ativa/.test(t)) return 'aquecimento';
  if (/calma|alongam|relaxa|retorno/.test(t)) return 'calma';
  if (/parad|canto|livre|penalti|lancamento/.test(t)) return 'bolas_paradas';
  if (/fisic|velocid|resist|forca|agilid|coordena|sprint/.test(t)) return 'fisico';
  if (/jogo|reduzid|\d\s*x\s*\d|partida/.test(t)) return 'jogo';
  if (/tatic|transi|press|posse|organiza|defens|ofensiv|saida/.test(t)) return 'tatica';
  if (/tecni|rondo|passe|rece|conduc|finaliz|remate|drible|1x1|cabece/.test(t)) return 'tecnica';
  return fallback;
}

/** The type shown for an exercise: what the coach wrote, or the name of its group. */
export const typeOf = (ex: Pick<Exercise, 'typeText' | 'category'>) =>
  ex.typeText?.trim() || GROUP_NAMES[ex.category] || '';
