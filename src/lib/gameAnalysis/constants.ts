import { StandardGoalType, GoalOriginCategory, EventTypeFilter } from './types';

/**
 * Standard Centralized Goal Types for the entire application (Item 8)
 */
export const STANDARD_GOAL_TYPES: readonly StandardGoalType[] = [
  'Bola jogada',
  'Recuperação de bola',
  'Canto',
  'Livre',
  'Penálti',
  'Pontapé de baliza',
  'Ressalto',
  'Outro'
] as const;

/**
 * Goal Origin categorization (Item 7: Bola Corrida vs Bola Parada)
 */
export const GOAL_ORIGIN_MAP: Record<StandardGoalType, GoalOriginCategory> = {
  'Bola jogada': 'bola_corrida',
  'Recuperação de bola': 'bola_corrida',
  'Ressalto': 'bola_corrida',
  'Canto': 'bola_parada',
  'Livre': 'bola_parada',
  'Penálti': 'bola_parada',
  'Pontapé de baliza': 'bola_parada',
  'Outro': 'outro'
};

/**
 * Normalizes any string representation of a goal type to the canonical standard.
 * Does NOT assume "Bola jogada" for unknown or unclassified types (Item 5).
 */
export function normalizeGoalType(rawType: string | null | undefined): StandardGoalType {
  if (!rawType || !rawType.trim()) return 'Outro';

  // Remove acentos antes de comparar: 'penálti'.includes('penal') é FALSE em JS
  // porque 'á' ≠ 'a' — isto garantia que o próprio valor canónico acentuado nunca
  // era reconhecido corretamente. Normalizar remove esta classe inteira de bugs.
  const clean = rawType
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (clean.includes('canto') || clean.includes('corner')) return 'Canto';
  if (clean.includes('livre') || clean.includes('freekick') || clean.includes('falta direta') || clean.includes('falta indirecta')) return 'Livre';
  if (clean.includes('penal') || clean.includes('penalty') || clean.includes('gp') || clean.includes('g.p.')) return 'Penálti';
  if (clean.includes('pontape de baliza') || clean.includes('saida') || clean.includes('baliza')) {
    return 'Pontapé de baliza';
  }
  if (clean.includes('recupera') || clean.includes('pressao') || clean.includes('roubo') || clean.includes('desarme')) {
    return 'Recuperação de bola';
  }
  if (clean.includes('ressalto') || clean.includes('sobra') || clean.includes('ricochete') || clean.includes('defesa incompleta')) return 'Ressalto';
  if (clean.includes('jogada') || clean.includes('construcao') || clean.includes('trabalhada') || clean.includes('bola corrida') || clean.includes('corrida') || clean.includes('transicao') || clean.includes('contra-ataque') || clean.includes('posicional')) {
    return 'Bola jogada';
  }
  if (clean.includes('outro') || clean.includes('desconhecido') || clean.includes('auto') || clean.includes('n/a') || clean.includes('sem registo')) return 'Outro';

  return 'Outro';
}

/**
 * Event type filters definitions (Item 1)
 */
export const EVENT_TYPE_OPTIONS: { id: EventTypeFilter; label: string; group: string; icon: string }[] = [
  { id: 'todos', label: 'Todos os Acontecimentos', group: 'Geral', icon: '📋' },
  { id: 'golos', label: 'Todos os Golos Marcados', group: 'Golos Marcados', icon: '⚽' },
  { id: 'golos_bola_jogada', label: 'Golos: Bola Jogada', group: 'Golos Marcados', icon: '🎯' },
  { id: 'golos_recuperacao', label: 'Golos: Recuperação de Bola', group: 'Golos Marcados', icon: '⚡' },
  { id: 'golos_canto', label: 'Golos: Canto', group: 'Golos Marcados', icon: '🚩' },
  { id: 'golos_livre', label: 'Golos: Livre', group: 'Golos Marcados', icon: '📐' },
  { id: 'golos_penalti', label: 'Golos: Penálti', group: 'Golos Marcados', icon: '🎯' },
  { id: 'golos_pontape_baliza', label: 'Golos: Pontapé de Baliza', group: 'Golos Marcados', icon: '🥅' },
  { id: 'golos_ressalto', label: 'Golos: Ressalto', group: 'Golos Marcados', icon: '🔄' },
  { id: 'golos_sofridos', label: 'Golos Sofridos', group: 'Defensivo', icon: '🛡️' },
  { id: 'cantos', label: 'Cantos (A favor e Contra)', group: 'Bolas Paradas', icon: '🚩' },
  { id: 'faltas_cometidas', label: 'Faltas Cometidas', group: 'Disciplina', icon: '⚠️' },
  { id: 'faltas_sofridas', label: 'Faltas Sofridas', group: 'Disciplina', icon: '🩹' },
  { id: 'amarelos', label: 'Cartões Amarelos', group: 'Disciplina', icon: '🟨' },
  { id: 'vermelhos', label: 'Cartões Vermelhos', group: 'Disciplina', icon: '🟥' },
  { id: 'substituicoes', label: 'Substituições', group: 'Gestão', icon: '🔄' }
];

/**
 * Standard Half Durations per Football Category in Portugal (Item 2)
 */
export const CATEGORY_DEFAULT_HALF_DURATION: Record<string, number> = {
  'Petizes': 20,
  'Traquinas': 20,
  'Sub-7': 20,
  'Sub-8': 20,
  'Sub-9': 20,
  'Benjamins': 30, // 2 x 30 min (Fut 7)
  'Sub-10': 30,
  'Sub-11': 30,
  'Infantis': 30, // 2 x 30 ou 2 x 35 min (Fut 7/9)
  'Sub-12': 30,
  'Sub-13': 35,
  'Iniciados': 35, // 2 x 35 min (Fut 11)
  'Sub-14': 35,
  'Sub-15': 40,
  'Juvenis': 40, // 2 x 40 ou 2 x 45 min
  'Sub-16': 40,
  'Sub-17': 45,
  'Juniores': 45, // 2 x 45 min
  'Sub-18': 45,
  'Sub-19': 45,
  'Seniores': 45, // 2 x 45 min
  'Veteranos': 45,
  'Feminino': 45
};

/**
 * Detects the standard half duration (in minutes) for a given category name.
 */
export function getCategoryHalfDuration(categoryName?: string): number {
  if (!categoryName) return 30; // Default Sub-11
  const catClean = categoryName.trim();

  for (const [key, dur] of Object.entries(CATEGORY_DEFAULT_HALF_DURATION)) {
    if (catClean.toLowerCase().includes(key.toLowerCase())) {
      return dur;
    }
  }

  // If contains "11" -> 30, "13" -> 35, "15" -> 40, "17" or "19" -> 45
  if (catClean.includes('11') || catClean.includes('10')) return 30;
  if (catClean.includes('12') || catClean.includes('13')) return 35;
  if (catClean.includes('14') || catClean.includes('15')) return 40;
  if (catClean.includes('16') || catClean.includes('17') || catClean.includes('19') || catClean.toLowerCase().includes('senior')) return 45;

  return 30;
}
