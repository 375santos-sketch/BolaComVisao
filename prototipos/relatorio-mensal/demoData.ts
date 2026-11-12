/**
 * DADOS FICTÍCIOS — DEMONSTRAÇÃO.
 * Nada disto vem da aplicação nem da base de dados: serve só para mostrar o protótipo do relatório mensal.
 * A forma dos dados segue os campos reais auditados (Training, Match, Player, SquadProfile.monthObjectives),
 * para que a implementação definitiva possa trocar esta fonte pelos dados reais sem mudar o desenho.
 */

export type AbsenceReason = 'doente' | 'lesionado' | 'escola' | 'familia' | 'injustificada';
export type Theme = 'aquecimento' | 'tecnica' | 'tatica' | 'fisico' | 'jogo' | 'bolas_paradas' | 'calma';

export interface DemoAthlete {
  id: string;
  name: string;
  number: number;
  position: string;
}

export interface DemoTraining {
  id: string;
  number: number;
  date: string; // YYYY-MM-DD
  time: string;
  /** realizado | por_fechar | agendado — as in planningSummary.trainingStatus */
  status: 'realizado' | 'por_fechar' | 'agendado';
  durationMinutes: number;
  focus: string; // Training.type
  objective?: string; // Training.sessionPlan.objective
  /** Blocks of the session plan: title, theme (category) and minutes (SessionBlock). */
  blocks: { title: string; theme: Theme; minutes: number }[];
  /** Absent athletes and the reason, when the coach wrote one (Training.absences + absenceReasons). */
  absences: Record<string, AbsenceReason | null>;
  notes?: string;
}

export interface DemoGame {
  id: string;
  date: string;
  time: string;
  opponent: string;
  home: boolean;
  competition: string;
  round?: string;
  /** From the pre-match plan / starting line-up (originalSchedule): the planned system, not a live record. */
  system?: string;
  halfMinutes: number;
  /** false = no clock recorded: minutes estimated with the age group's half duration. */
  clockRecorded: boolean;
  convocados: string[];
  lineup: string[];
  subs: { minute: number; outId: string; inId: string }[];
  goals: { minute: number; type: 'scored' | 'conceded'; scorerId?: string; assistId?: string }[];
  cards: { minute: number; playerId: string; color: 'Amarelo' | 'Vermelho' }[];
  /** undefined = not recorded (shown as "—", never as 0). */
  shots?: { for: number; against: number };
  corners?: { for: number; against: number };
  fouls?: { for: number; against: number };
  coachNotes?: string;
}

export const DEMO = {
  club: 'Clube Demonstração FC',
  team: 'Sub-11 A',
  format: 'Futebol de 7',
  season: '2026/2027',
  month: '2026-10',
  monthLabel: 'Outubro 2026',
  coach: 'Treinador Demo',
  generatedOn: '03/11/2026'
};

export const ATHLETES: DemoAthlete[] = [
  { id: 'a1', name: 'Atleta Demo 1', number: 1, position: 'GR' },
  { id: 'a2', name: 'Atleta Demo 2', number: 2, position: 'DD' },
  { id: 'a3', name: 'Atleta Demo 3', number: 3, position: 'DC' },
  { id: 'a4', name: 'Atleta Demo 4', number: 4, position: 'DE' },
  { id: 'a5', name: 'Atleta Demo 5', number: 5, position: 'MC' },
  { id: 'a6', name: 'Atleta Demo 6', number: 6, position: 'MC' },
  { id: 'a7', name: 'Atleta Demo 7', number: 7, position: 'EXT' },
  { id: 'a8', name: 'Atleta Demo 8', number: 8, position: 'EXT' },
  { id: 'a9', name: 'Atleta Demo 9', number: 9, position: 'PL' },
  { id: 'a10', name: 'Atleta Demo 10', number: 10, position: 'MC' },
  { id: 'a11', name: 'Atleta Demo 11', number: 11, position: 'PL' },
  { id: 'a12', name: 'Atleta Demo 12', number: 12, position: 'GR' }
];

const plan = (...b: [string, Theme, number][]) => b.map(([title, theme, minutes]) => ({ title, theme, minutes }));

export const TRAININGS: DemoTraining[] = [
  {
    id: 't1',
    number: 9,
    date: '2026-10-01',
    time: '18:30',
    status: 'realizado',
    durationMinutes: 75,
    focus: 'Tático',
    objective: 'Saída de bola curta a partir do guarda-redes',
    blocks: plan(
      ['Ativação com bola', 'aquecimento', 10],
      ['Rondo 4x2', 'tecnica', 15],
      ['Saída 3x2 + GR', 'tatica', 25],
      ['Jogo 5x5 condicionado', 'jogo', 20],
      ['Retorno à calma', 'calma', 5]
    ),
    absences: { a8: 'escola' }
  },
  {
    id: 't2',
    number: 10,
    date: '2026-10-03',
    time: '18:30',
    status: 'realizado',
    durationMinutes: 75,
    focus: 'Técnico / Finalização',
    objective: 'Finalização após cruzamento rasteiro',
    blocks: plan(
      ['Coordenação + passe', 'aquecimento', 10],
      ['Finalização em vagas', 'tecnica', 25],
      ['2x1 com finalização', 'tatica', 20],
      ['Jogo livre', 'jogo', 20]
    ),
    absences: { a8: 'escola', a11: null }
  },
  {
    id: 't3',
    number: 11,
    date: '2026-10-08',
    time: '18:30',
    status: 'realizado',
    durationMinutes: 75,
    focus: 'Tático',
    objective: 'Reação à perda nos 5 segundos seguintes',
    blocks: plan(
      ['Jogo de perseguição', 'aquecimento', 10],
      ['Rondo com transição', 'tatica', 20],
      ['Velocidade de reação', 'fisico', 10],
      ['Jogo 6x6 com regra dos 5 s', 'jogo', 30],
      ['Alongamentos', 'calma', 5]
    ),
    absences: { a4: 'doente' },
    notes: 'Boa intensidade na reação à perda; a comunicação ainda depende de poucos atletas.'
  },
  {
    id: 't4',
    number: 12,
    date: '2026-10-10',
    time: '18:30',
    status: 'realizado',
    durationMinutes: 60,
    focus: 'Bolas Paradas',
    objective: 'Cantos ofensivos e defensivos',
    blocks: plan(
      ['Ativação', 'aquecimento', 10],
      ['Cantos ofensivos', 'bolas_paradas', 20],
      ['Cantos defensivos', 'bolas_paradas', 15],
      ['Jogo reduzido', 'jogo', 15]
    ),
    absences: { a4: 'doente', a9: 'familia' }
  },
  {
    id: 't5',
    number: 13,
    date: '2026-10-15',
    time: '18:30',
    status: 'realizado',
    durationMinutes: 75,
    focus: 'Físico / Condição',
    objective: 'Velocidade com bola e mudanças de direção',
    blocks: plan(
      ['Escada de coordenação', 'fisico', 15],
      ['Condução com mudança de direção', 'tecnica', 20],
      ['Estafetas com bola', 'fisico', 15],
      ['Jogo 5x5', 'jogo', 20],
      ['Retorno à calma', 'calma', 5]
    ),
    absences: { a11: 'injustificada' }
  },
  {
    id: 't6',
    number: 14,
    date: '2026-10-17',
    time: '18:30',
    status: 'realizado',
    durationMinutes: 75,
    focus: 'Tático',
    objective: 'Ocupação do corredor central sem bola',
    blocks: plan(
      ['Ativação com bola', 'aquecimento', 10],
      ['Jogo posicional 4x4+2', 'tatica', 25],
      ['Basculação defensiva', 'tatica', 15],
      ['Jogo 6x6', 'jogo', 25]
    ),
    absences: {}
  },
  {
    id: 't7',
    number: 15,
    date: '2026-10-22',
    time: '18:30',
    status: 'realizado',
    durationMinutes: 75,
    focus: 'Jogo-Treino',
    blocks: [],
    absences: { a7: 'lesionado', a2: null },
    notes: 'Treino sem plano de sessão registado (só a duração e as presenças).'
  },
  {
    id: 't8',
    number: 16,
    date: '2026-10-24',
    time: '18:30',
    status: 'realizado',
    durationMinutes: 75,
    focus: 'Técnico / Finalização',
    objective: 'Remate de primeira e com o pé menos dominante',
    blocks: plan(
      ['Passe e receção', 'tecnica', 15],
      ['Remate de primeira', 'tecnica', 25],
      ['3x2 com finalização', 'tatica', 15],
      ['Jogo livre', 'jogo', 20]
    ),
    absences: { a7: 'lesionado' }
  },
  {
    id: 't9',
    number: 17,
    date: '2026-10-29',
    time: '18:30',
    status: 'por_fechar',
    durationMinutes: 75,
    focus: 'Tático',
    objective: 'Pressão alta após perda',
    blocks: plan(['Rondo', 'tecnica', 15], ['Pressão 4x3', 'tatica', 30], ['Jogo 6x6', 'jogo', 30]),
    absences: {}
  },
  {
    id: 't10',
    number: 18,
    date: '2026-10-31',
    time: '10:00',
    status: 'agendado',
    durationMinutes: 75,
    focus: 'Geral',
    blocks: [],
    absences: {}
  }
];

export const GAMES: DemoGame[] = [
  {
    id: 'g1',
    date: '2026-10-04',
    time: '10:30',
    opponent: 'Equipa Demo Norte',
    home: true,
    competition: 'Campeonato',
    round: 'Jornada 3',
    system: '2-3-1',
    halfMinutes: 25,
    clockRecorded: true,
    convocados: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11'],
    lineup: ['a1', 'a2', 'a3', 'a4', 'a5', 'a7', 'a9'],
    subs: [
      { minute: 15, outId: 'a7', inId: 'a8' },
      { minute: 25, outId: 'a9', inId: 'a11' },
      { minute: 25, outId: 'a2', inId: 'a6' },
      { minute: 35, outId: 'a5', inId: 'a10' }
    ],
    goals: [
      { minute: 8, type: 'scored', scorerId: 'a9', assistId: 'a5' },
      { minute: 21, type: 'conceded' },
      { minute: 33, type: 'scored', scorerId: 'a11', assistId: 'a8' },
      { minute: 44, type: 'scored', scorerId: 'a10' }
    ],
    cards: [],
    shots: { for: 11, against: 6 },
    corners: { for: 5, against: 2 },
    fouls: { for: 4, against: 7 },
    coachNotes:
      'Boa circulação na primeira fase de construção. Defensivamente sofremos nas costas do lateral direito; a entrada do Atleta 6 equilibrou o corredor.'
  },
  {
    id: 'g2',
    date: '2026-10-11',
    time: '09:00',
    opponent: 'Equipa Demo Sul',
    home: false,
    competition: 'Campeonato',
    round: 'Jornada 4',
    system: '3-2-1',
    halfMinutes: 25,
    clockRecorded: true,
    convocados: ['a1', 'a2', 'a3', 'a5', 'a6', 'a7', 'a8', 'a10', 'a11', 'a12'],
    lineup: ['a1', 'a2', 'a3', 'a6', 'a5', 'a8', 'a11'],
    subs: [
      { minute: 20, outId: 'a8', inId: 'a7' },
      { minute: 25, outId: 'a1', inId: 'a12' },
      { minute: 30, outId: 'a6', inId: 'a10' }
    ],
    goals: [
      { minute: 12, type: 'conceded' },
      { minute: 38, type: 'scored', scorerId: 'a7' }
    ],
    cards: [{ minute: 41, playerId: 'a3', color: 'Amarelo' }],
    shots: { for: 7, against: 9 },
    // corners and fouls not recorded in this game → shown as "—"
    coachNotes:
      'Jogo equilibrado num campo pequeno. Faltou profundidade na primeira parte; melhorámos com a entrada do Atleta 7 a fixar a largura.'
  },
  {
    id: 'g3',
    date: '2026-10-25',
    time: '10:00',
    opponent: 'Equipa Demo Este',
    home: true,
    competition: 'Torneio de Outono',
    round: 'Fase de grupos',
    halfMinutes: 20,
    clockRecorded: false,
    convocados: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a8', 'a9', 'a10', 'a11', 'a12'],
    lineup: ['a12', 'a4', 'a3', 'a6', 'a10', 'a8', 'a9'],
    subs: [
      { minute: 20, outId: 'a12', inId: 'a1' },
      { minute: 20, outId: 'a8', inId: 'a11' },
      { minute: 20, outId: 'a10', inId: 'a5' },
      { minute: 30, outId: 'a4', inId: 'a2' }
    ],
    goals: [
      { minute: 5, type: 'scored', scorerId: 'a9', assistId: 'a6' },
      { minute: 27, type: 'conceded' },
      { minute: 36, type: 'conceded' }
    ],
    cards: [],
    shots: { for: 8, against: 8 },
    corners: { for: 3, against: 4 }
  }
];

/** Next month's objectives as the coach writes them in Época → Objetivos do mês (SquadProfile.monthObjectives). */
export const NEXT_MONTH_OBJECTIVES = [
  'Consolidar a saída de bola com o guarda-redes',
  'Melhorar a ocupação dos corredores laterais',
  'Aumentar o número de remates de primeira'
];

/** Games already in the Agenda for next month (ScheduledMatch). */
export const NEXT_MONTH_GAMES = [
  { date: '2026-11-08', opponent: 'Equipa Demo Oeste', competition: 'Campeonato · Jornada 6' },
  { date: '2026-11-15', opponent: 'Equipa Demo Centro', competition: 'Campeonato · Jornada 7' },
  { date: '2026-11-29', opponent: 'Equipa Demo Norte', competition: 'Campeonato · Jornada 9' }
];
