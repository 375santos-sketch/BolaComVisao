import { SessionBlock } from '../../../types';

export interface TrainingFormData {
  id?: string;
  trainingNumber?: number;
  date: string;
  time: string;
  location: string;
  type: string;
  notes: string;
  absences: string[];
  completed: boolean;
  durationMinutes: number;
  sessionObjective: string;
  sessionBlocks: SessionBlock[];
}

export const TRAINING_TYPES = [
  '⚡ Tático',
  '🏃 Físico / Condição',
  '⚽ Técnico / Finalização',
  '🛡️ Bolas Paradas',
  '🏆 Jogo-Treino',
  '🔄 Recuperação',
  '🎯 Geral'
];

export type TrainingsTab = 'list' | 'library' | 'stats';
