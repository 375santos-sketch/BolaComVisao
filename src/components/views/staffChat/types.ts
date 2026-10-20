import { StaffMessageType } from '../../../types';

export interface ChatSenderProfile {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export type StaffChatViewMode = 'conversa' | 'painel';

export const MESSAGE_TYPE_CONFIG: Record<
  StaffMessageType,
  { label: string; icon: string; badgeVariant: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate' }
> = {
  geral: { label: 'Conversa Geral', icon: '💬', badgeVariant: 'slate' },
  recado: { label: 'Recado Técnico', icon: '📌', badgeVariant: 'amber' },
  reuniao: { label: 'Reunião Marcada', icon: '📅', badgeVariant: 'cyan' },
  urgente: { label: 'Aviso Urgente', icon: '🚨', badgeVariant: 'rose' },
  treino_jogo: { label: 'Nota Jogo / Treino', icon: '⚽', badgeVariant: 'emerald' },
  indisponibilidade: { label: 'Indisponibilidade', icon: '⚠️', badgeVariant: 'purple' }
};

export const QUICK_MESSAGE_PRESETS = [
  '⚽ Treino confirmado e pronto.',
  '📋 Convocatória atualizada no sistema.',
  '🚨 Reunião técnica antes do treino.',
  '⏳ Atraso de 10 minutos.',
  '👍 OK, ciente e confirmado!',
  '⚠️ Relatório médico disponível para consulta.'
];
