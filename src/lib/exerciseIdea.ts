import { ExerciseCategory } from '../types';

/**
 * ✨ Exercício a partir de um objetivo: the coach says what to work on (and with how many players, how long, how much
 * space) and Gemini proposes an exercise, answered in the same format as an exercise read from a photo
 * (EXERCISE_SCHEMA / cleanPrintExercise), so it opens in the same form to check and save.
 */

export const EXERCISE_SPACES = ['Quadrado pequeno', '¼ de campo', '½ campo', 'Campo inteiro'] as const;

export interface ExerciseIdeaRequest {
  goal: string;
  players: number;
  minutes: number;
  space: string;
  category: ExerciseCategory;
  ageGroup?: string; // "Sub-11"
  /** Names already proposed, so "Outra proposta" brings something different. */
  avoid?: string[];
}

const CATEGORIES: ExerciseCategory[] = ['aquecimento', 'tecnica', 'tatica', 'fisico', 'jogo', 'bolas_paradas'];
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** The request checked on the server (it comes from the phone). Null when there is no goal. */
export function cleanIdeaRequest(raw: unknown): ExerciseIdeaRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const goal = text(r.goal, 300);
  if (goal.length < 3) return null;
  const category = CATEGORIES.includes(r.category as ExerciseCategory) ? (r.category as ExerciseCategory) : 'tecnica';
  return {
    goal,
    players: int(r.players, 2, 30, 10),
    minutes: int(r.minutes, 5, 60, 15),
    space: text(r.space, 40) || '½ campo',
    category,
    ...(text(r.ageGroup, 20) ? { ageGroup: text(r.ageGroup, 20) } : {}),
    ...(Array.isArray(r.avoid)
      ? {
          avoid: r.avoid
            .map((a) => text(a, 80))
            .filter(Boolean)
            .slice(0, 8)
        }
      : {})
  };
}

const CATEGORY_WORDS: Record<ExerciseCategory, string> = {
  aquecimento: 'aquecimento',
  tecnica: 'técnico',
  tatica: 'tático',
  fisico: 'físico (sempre com bola, se possível)',
  jogo: 'jogo reduzido / condicionado',
  bolas_paradas: 'bolas paradas'
};

export function exerciseIdeaPrompt(r: ExerciseIdeaRequest): string {
  return `És um treinador de futebol de formação experiente. Propõe UM exercício de treino, em português de Portugal, para:
- Objetivo: ${r.goal}
- Escalão: ${r.ageGroup || 'formação (crianças)'}
- Jogadores: ${r.players}
- Duração: ${r.minutes} minutos
- Espaço: ${r.space}
- Tipo: ${CATEGORY_WORDS[r.category]}
${r.avoid?.length ? `- Não repitas estes exercícios: ${r.avoid.join('; ')}\n` : ''}Regras: adequado à idade, com muita bola e pouca fila; regras simples de explicar; usa exatamente o número de jogadores indicado (se for ímpar, usa um joker).
Responde com:
- name: nome curto do exercício
- category: ${r.category}
- durationMinutes: ${r.minutes}
- objective: o objetivo numa frase
- description: organização (espaço em metros, equipas, cores), como se joga, como se pontua, 2 pontos-chave para o treinador corrigir e 1 variante para facilitar ou dificultar. Texto simples com frases curtas, sem markdown.
- material: quantos cones, coletes, bolas, balizas (pequenas), estacas, arcos, barreiras e escadas são precisos (0 no que não se usa)
- drawing: w = 0 e h = 0`;
}
