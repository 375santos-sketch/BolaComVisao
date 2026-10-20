import { OpponentScouting, ScheduledMatch, TacticalPitchPlayer } from '../../types';

// Predefinições de Futebol de 7 para o Relvado Tático
export const SEVEN_A_SIDE_PRESETS: Record<string, TacticalPitchPlayer[]> = {
  '2-3-1': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 24, y: 68 },
    { id: 'p3', role: 'DD', name: 'Defesa Dir.', x: 76, y: 68 },
    { id: 'p4', role: 'ME', name: 'Ala / Médio Esq.', x: 18, y: 44 },
    { id: 'p5', role: 'MC', name: 'Médio Centro', x: 50, y: 46 },
    { id: 'p6', role: 'MD', name: 'Ala / Médio Dir.', x: 82, y: 44 },
    { id: 'p7', role: 'PL', name: 'Avançado', x: 50, y: 18 }
  ],
  '3-2-1': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 20, y: 68 },
    { id: 'p3', role: 'DC', name: 'Defesa Central', x: 50, y: 72 },
    { id: 'p4', role: 'DD', name: 'Defesa Dir.', x: 80, y: 68 },
    { id: 'p5', role: 'MC', name: 'Médio Esq.', x: 35, y: 44 },
    { id: 'p6', role: 'MC', name: 'Médio Dir.', x: 65, y: 44 },
    { id: 'p7', role: 'PL', name: 'Avançado', x: 50, y: 18 }
  ],
  '2-1-2-1': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 26, y: 70 },
    { id: 'p3', role: 'DD', name: 'Defesa Dir.', x: 74, y: 70 },
    { id: 'p4', role: 'MDF', name: 'Médio Defensivo', x: 50, y: 56 },
    { id: 'p5', role: 'ME', name: 'Ala Esq.', x: 20, y: 38 },
    { id: 'p6', role: 'MD', name: 'Ala Dir.', x: 80, y: 38 },
    { id: 'p7', role: 'PL', name: 'Avançado', x: 50, y: 18 }
  ],
  '3-1-2': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 20, y: 68 },
    { id: 'p3', role: 'DC', name: 'Defesa Central', x: 50, y: 72 },
    { id: 'p4', role: 'DD', name: 'Defesa Dir.', x: 80, y: 68 },
    { id: 'p5', role: 'MC', name: 'Médio Centro', x: 50, y: 46 },
    { id: 'p6', role: 'AV', name: 'Avançado Esq.', x: 35, y: 18 },
    { id: 'p7', role: 'AV', name: 'Avançado Dir.', x: 65, y: 18 }
  ],
  '2-2-2': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 26, y: 70 },
    { id: 'p3', role: 'DD', name: 'Defesa Dir.', x: 74, y: 70 },
    { id: 'p4', role: 'ME', name: 'Médio Esq.', x: 30, y: 45 },
    { id: 'p5', role: 'MD', name: 'Médio Dir.', x: 70, y: 45 },
    { id: 'p6', role: 'AV', name: 'Avançado Esq.', x: 35, y: 18 },
    { id: 'p7', role: 'AV', name: 'Avançado Dir.', x: 65, y: 18 }
  ],
  '1-3-2': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DC', name: 'Defesa Central', x: 50, y: 70 },
    { id: 'p3', role: 'ME', name: 'Ala Esq.', x: 18, y: 45 },
    { id: 'p4', role: 'MC', name: 'Médio Centro', x: 50, y: 46 },
    { id: 'p5', role: 'MD', name: 'Ala Dir.', x: 82, y: 45 },
    { id: 'p6', role: 'AV', name: 'Avançado Esq.', x: 35, y: 18 },
    { id: 'p7', role: 'AV', name: 'Avançado Dir.', x: 65, y: 18 }
  ]
};

export const COMMON_ROLES = ['GR', 'DC', 'DE', 'DD', 'MDF', 'MC', 'MO', 'ME', 'MD', 'ALA', 'EXT', 'PL', 'AV'];

export function formatMatchCompetition(match?: ScheduledMatch | null): string {
  if (!match) return 'Campeonato';
  const typeMap: Record<string, string> = {
    campeonato: 'Campeonato',
    torneio: match.tournamentName ? `Torneio: ${match.tournamentName}` : 'Torneio',
    amigavel: 'Jogo Amigável'
  };
  const baseType = typeMap[match.type] || match.type || 'Campeonato';
  if (match.phase && match.phase.trim()) {
    if (match.phase.toLowerCase().includes(baseType.toLowerCase())) {
      return match.phase;
    }
    return `${baseType} - ${match.phase}`;
  }
  return baseType;
}

export function getEffectiveTacticalPitch(scout?: OpponentScouting | null): TacticalPitchPlayer[] {
  if (scout?.ourTacticalPitch && Array.isArray(scout.ourTacticalPitch) && scout.ourTacticalPitch.length === 7) {
    return scout.ourTacticalPitch;
  }
  const formKey = scout?.ourFormation || '2-3-1';
  return SEVEN_A_SIDE_PRESETS[formKey] || SEVEN_A_SIDE_PRESETS['2-3-1'];
}
