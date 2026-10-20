import { PlayerStatus, DominantFoot } from '../../../types';

export interface PositionGroup {
  id: string;
  label: string;
  ranks: number[];
  shortTag: string;
}

export const POSITION_GROUPS: PositionGroup[] = [
  { id: 'gr', label: '🧤 Guarda-Redes', ranks: [1], shortTag: 'GR' },
  { id: 'def', label: '🛡️ Defesas', ranks: [2, 3, 4, 5], shortTag: 'DEF' },
  { id: 'med', label: '⚙️ Médios', ranks: [6, 7, 8, 9], shortTag: 'MED' },
  { id: 'ata', label: '⚡ Avançados & Extremos', ranks: [10, 11, 12, 13], shortTag: 'ATA' },
  { id: 'outros', label: '⚽ Outras Posições / Sem Posição', ranks: [20, 99], shortTag: 'OUT' }
];

export const POSITION_OPTIONS: string[] = [
  'Guarda-Redes (GR)',
  'Defesa Central (DC)',
  'Lateral Direito (LD)',
  'Lateral Esquerdo (LE)',
  'Médio Defensivo (MDF)',
  'Médio Centro (MC)',
  'Médio Ofensivo (MO)',
  'Extremo Direito (ED)',
  'Extremo Esquerdo (EE)',
  'Avançado Centro (PL/AC)'
];

export const STATUS_CONFIG: Record<
  PlayerStatus,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  disponivel: {
    label: 'Disponível',
    icon: '🟢',
    bg: 'bg-emerald-950/80',
    text: 'text-emerald-400',
    border: 'border-emerald-500/50'
  },
  lesionado: {
    label: 'Lesionado',
    icon: '🏥',
    bg: 'bg-red-950/80',
    text: 'text-red-400',
    border: 'border-red-500/50'
  },
  suspenso: {
    label: 'Suspenso',
    icon: '🟨',
    bg: 'bg-amber-950/80',
    text: 'text-amber-400',
    border: 'border-amber-500/50'
  },
  inativo: {
    label: 'Inativo',
    icon: '⏸️',
    bg: 'bg-slate-900',
    text: 'text-slate-400',
    border: 'border-slate-700'
  }
};

export type SquadTab = 'jogadores' | 'assiduidade' | 'equipa_tecnica' | 'chat_staff' | 'aniversarios';
export type SquadViewMode = 'lista' | 'grelha';
export type SquadSortBy = 'posicao' | 'numero' | 'nome';
export type SquadSortDirection = 'asc' | 'desc';

export interface PlayerStatsSummary {
  golos: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
  mediaAvaliacao: string;
  faltasTreino: number;
  presencasTreino: number;
  taxaAssiduidadeTreino: string;
  jogosTitular: number;
  titularSegundaParte: number;
  partesTitular: number;
  minutos: number;
  totalJogosRealizados: number;
  totalTreinosRealizados: number;
}
