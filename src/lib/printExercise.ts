import { ExerciseCategory } from '../types';

/**
 * Treinos → Exercícios → 📷 A partir de uma foto: what Gemini is asked to read from a photo of an exercise (a sheet,
 * a book, another phone's screen) and how its answer is cleaned before it fills the exercise form.
 */

export const EXERCISE_PROMPT = `Esta imagem é uma foto de um exercício de treino de futebol (de uma folha, de um livro ou do ecrã de outro telemóvel), em português ou noutra língua.
Lê o exercício e responde em português de Portugal:
- name: o nome do exercício (curto, por exemplo "Rondo 4x2"); inventa um nome curto se não houver
- category: uma de aquecimento, tecnica, tatica, fisico, jogo, bolas_paradas
- durationMinutes: a duração em minutos, se estiver escrita (senão 0)
- objective: o objetivo do exercício, numa frase
- description: como se faz (espaço, jogadores, regras, variantes), com as palavras da imagem, sem inventar
- drawing: se houver um desenho ou esquema do exercício, a caixa que o contém em frações da imagem (x e y do canto de cima à esquerda, w largura, h altura, de 0 a 1); se não houver desenho, w = 0 e h = 0.`;

export const EXERCISE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    category: { type: 'STRING' },
    durationMinutes: { type: 'NUMBER' },
    objective: { type: 'STRING' },
    description: { type: 'STRING' },
    drawing: {
      type: 'OBJECT',
      properties: { x: { type: 'NUMBER' }, y: { type: 'NUMBER' }, w: { type: 'NUMBER' }, h: { type: 'NUMBER' } }
    }
  },
  required: ['name', 'category']
};

interface PrintExercise {
  name: string;
  category: ExerciseCategory;
  durationMinutes?: number;
  objective?: string;
  description?: string;
  /** Where the drawing is in the photo (fractions 0..1), when there is one. */
  drawing?: { x: number; y: number; w: number; h: number };
}

const CATEGORIES: ExerciseCategory[] = ['aquecimento', 'tecnica', 'tatica', 'fisico', 'jogo', 'bolas_paradas'];

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+\n/g, '\n').trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v));
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** The exercise read from the photo, or null when nothing usable came back. */
export function cleanPrintExercise(raw: unknown): PrintExercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  const name = text(r.name, 80);
  const description = text(r.description, 4000);
  const objective = text(r.objective, 500);
  if (!name && !description) return null;
  const cat = text(r.category, 30).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_');
  const category: ExerciseCategory =
    CATEGORIES.find((c) => c === cat) ||
    (/aquec/.test(cat)
      ? 'aquecimento'
      : /tat/.test(cat)
        ? 'tatica'
        : /fis/.test(cat)
          ? 'fisico'
          : /jogo|game/.test(cat)
            ? 'jogo'
            : /parad/.test(cat)
              ? 'bolas_paradas'
              : 'tecnica');
  const minutes = Math.round(num(r.durationMinutes));
  const d = r.drawing && typeof r.drawing === 'object' ? r.drawing : null;
  let drawing: PrintExercise['drawing'];
  if (d) {
    const x = clamp(num(d.x));
    const y = clamp(num(d.y));
    const w = Math.min(clamp(num(d.w)), 1 - x);
    const h = Math.min(clamp(num(d.h)), 1 - y);
    // A box too small to be a drawing (or the whole page) is not cropped
    if (w >= 0.12 && h >= 0.12 && w * h < 0.95) drawing = { x, y, w, h };
  }
  return {
    name: name || 'Exercício da foto',
    category,
    ...(minutes > 0 && minutes <= 120 ? { durationMinutes: minutes } : {}),
    ...(objective ? { objective } : {}),
    ...(description ? { description } : {}),
    ...(drawing ? { drawing } : {})
  };
}
