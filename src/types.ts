export type ThemeName = 'original' | 'luzsolar' | 'oceanonoturno';
export type Language = 'pt' | 'en';
export type MatchType = 'amigavel' | 'campeonato' | 'torneio';
export type MatchLocation = 'casa' | 'fora';

export type PlayerStatus = 'disponivel' | 'lesionado' | 'suspenso' | 'inativo';
export type DominantFoot = 'Direito' | 'Esquerdo' | 'Ambidestro';

export interface Player {
  id: string;
  name: string;
  number: number | null;
  positions: string;
  birthDate: string | null;
  dominantFoot?: DominantFoot;
  height?: string;
  weight?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  status?: PlayerStatus;
  /** Expected return date (YYYY-MM-DD) of an injury or suspension: available again from that day. */
  statusUntil?: string;
  /** Short reason shown in the call-up ("entorse", "2 jogos de castigo"). */
  statusNote?: string;
  photoUrl?: string;
  active: boolean;
  notes?: string;
  coachNotes?: string;
  /** Coach's message to the family in the end-of-season report, per season ("2026/2027" → text). */
  seasonMessages?: Record<string, string>;
  nickname?: string;
  captain?: boolean;
}

export type GoalType =
  | 'Canto'
  | 'Livre'
  | 'Penalti'
  | 'Penálti'
  | 'Recuperação de bola'
  | 'Saída do pontapé de baliza'
  | 'Pontapé de baliza'
  | 'Ressalto'
  | 'Boa jogada'
  | 'Bola jogada'
  | 'Outro';
// 'Intervalo' (capitalised) is the value persisted on halftime events; keep both spellings.
export type MatchPeriod = '1.ª parte' | '2.ª parte' | 'prolongamento' | 'intervalo' | 'Intervalo';

export interface GoalEvent {
  id: string;
  type: 'scored' | 'conceded';
  half?: 1 | 2;
  period?: MatchPeriod | string;
  scorerId: string | null;
  assistId: string | null;
  scorer?: string | null;
  assist?: string | null;
  minute: number | string | null;
  minuteBase?: 'game';
  minuteInHalf?: number;
  goalType?: GoalType | string;
  notes?: string;
}

export interface CardEvent {
  id: string;
  playerId: string;
  player?: string;
  color: 'Amarelo' | 'Vermelho';
  type?: string;
  reason?: string;
  half?: 1 | 2;
  period?: MatchPeriod | string;
  minute: number | string | null;
  minuteBase?: 'game';
  minuteInHalf?: number;
}

export interface SubEvent {
  id: string;
  outId: string;
  inId: string;
  playerOut?: string;
  playerIn?: string;
  half?: 1 | 2;
  period?: MatchPeriod | string;
  isHalftime?: boolean;
  minute: number | string | null;
  minuteBase?: 'game';
  minuteInHalf?: number;
  notes?: string;
}

export interface MatchTimer {
  isRunning: boolean;
  elapsedMs: number;
  lastStartTs: number | null;
  half1DurationMs?: number;
  half2DurationMs?: number;
}

export interface MatchTimeline {
  kickoff?: string;
  halftime?: string;
  secondHalfStart?: string;
  fullTime?: string;
}

export interface ScheduledMatch {
  id: string;
  opponent: string;
  date: string;
  time: string;
  type: MatchType;
  phase?: string;
  tournamentName?: string;
  season?: string;
  location: MatchLocation;
  callup: string[]; // Player IDs
  venue?: string;
  meetingTime?: string;
  meetingPoint?: string;
  callupNotes?: string;
  callupFinalized?: boolean;
  callupFinalizedAt?: number;
  preMatchFinalized?: boolean; // "Plano pronto" no Pré-jogo
  preMatchFinalizedAt?: number;
  preMatchPlan?: PreMatchPlan;
  scoutingFinalized?: boolean;
  scoutingFinalizedAt?: number;
  teamId?: string;
  teamName?: string;
}

/** Pré-jogo: the coaching staff's plan for a scheduled game (the game data comes from the Agenda). */
export interface PreMatchPlan {
  system?: string; // ex.: 2-3-1
  objectives?: string[]; // até 3
  withBall?: string; // Instruções com bola
  withoutBall?: string; // Instruções sem bola
  motto?: string; // Palavra de ordem
  notes?: string;
  updatedAt?: number;
  updatedBy?: string;
}

export type MatchGamePhase = 'nao_iniciado' | 'parte1' | 'intervalo' | 'parte2';

/** Video of a game (YouTube, Drive…) with where each half starts, to jump to each moment. */
export interface MatchVideo {
  url: string;
  /** Second of the video where the 1st half kicks off. */
  half1Start?: number;
  /** Second of the video where the 2nd half kicks off (a second video link can be used instead). */
  half2Start?: number;
  /** Optional separate link for the 2nd half. */
  url2?: string;
}

export interface MvpVote {
  token: string;
  closesAt: number;
  open: boolean;
  /** Votes per athlete id, as counted the last time the coach checked. */
  votes?: Record<string, number>;
  total?: number;
  countedAt?: number;
}

export interface Match {
  id: string;
  /** "Jogador do jogo" chosen by the coach after the game. */
  mvpId?: string | null;
  /** Parents' anonymous vote for the "Jogador do jogo" (public_votes/{token}); votes counted when last checked. */
  mvpVote?: MvpVote;
  /** Game video and where each half starts (Resultados → 🎥). */
  video?: MatchVideo;
  teamId?: string;
  teamName?: string;
  opponent: string;
  date: string;
  type: MatchType;
  phase?: MatchGamePhase | string;
  matchPhase?: MatchGamePhase;
  competitionPhase?: string;
  tournamentName?: string;
  season: string;
  location: MatchLocation;
  finished: boolean;
  goals: GoalEvent[];
  cards?: CardEvent[];
  subs: SubEvent[];
  lineup: string[]; // Starting XI/7 Player IDs (1.ª parte)
  lineupSecondHalf?: string[]; // 7 Titulares da 2.ª parte
  lineupSize?: number; // Tamanho de titulares configurável (por defeito 7)
  ratings?: Record<string, number>; // playerId -> 1..5
  capitao: string | null;
  notes?: string;
  timer?: MatchTimer;
  timeline?: MatchTimeline;
  originalSchedule?: ScheduledMatch;
  // Match stats & PDF reference
  halfDurationMinutes?: number;
  firstHalfDurationMinutes?: number;
  secondHalfDurationMinutes?: number;
  cornersFor?: number;
  cornersAgainst?: number;
  foulsCommitted?: number;
  foulsSuffered?: number;
  cantos?: number;
  cantosAdv?: number;
  faltas?: number;
  faltasAdv?: number;
  // Remates a favor e contra (dentro e fora da área)
  rematesDentroArea?: number; // Remates a favor (dentro da área)
  rematesDentroAreaAdv?: number; // Remates contra (dentro da área)
  rematesForaArea?: number; // Remates a favor (fora da área)
  rematesForaAreaAdv?: number; // Remates contra (fora da área)
  shotsInBoxFor?: number;
  shotsInBoxAgainst?: number;
  shotsOutBoxFor?: number;
  shotsOutBoxAgainst?: number;
  convocados?: string[];
  finalScore?: { scored: number; conceded: number };
  pdfDataUrl?: string;
  pdfGeneratedAt?: string;
  opponentReport?: OpponentReport; // Relatório do adversário pós-jogo
}

/** Post-match notes about the opponent (the numbers come from the match itself). */
export interface OpponentReport {
  system?: string; // Sistema tático que usaram
  strengths?: string[];
  weaknesses?: string[];
  dangerousPlayers?: string[]; // ex.: "Nº 7 – rápido, finta para dentro"
  notes?: string;
  nextTime?: string; // O que fazer da próxima vez (aparece no Pré-jogo)
  updatedAt?: number;
  updatedBy?: string;
}

export type AbsenceReason = 'doente' | 'lesionado' | 'escola' | 'familia' | 'injustificada';

export interface Training {
  id: string;
  trainingNumber?: number; // Sequential permanent number within team & season (e.g. 1, 2, 3...)
  date: string;
  time?: string;
  location?: string;
  type?: string;
  notes: string;
  absences: string[]; // Player IDs who missed
  absenceReasons?: Record<string, AbsenceReason>; // playerId -> why they missed (only absent players)
  completed?: boolean; // true = Concluído/Fechado (Entra nas estatísticas), false = Agendado/Planeado
  durationMinutes?: number;
  season?: string;
  sessionPlan?: SessionPlan;
}

export type NotificationType =
  | 'treino_24h'
  | 'convocatoria_quinta'
  | 'assiduidade_baixa'
  | 'geral'
  | 'novo_registo'
  | 'aniversario'
  | 'pre_match_pendente'
  | 'scouting_pendente'
  | 'pos_jogo_resumo'
  | 'qualidade_dados'
  | 'indisponibilidade';

export type SmartPriority = 'critico' | 'importante' | 'atencao' | 'informativo' | 'normal';

export type AlertCategory =
  | 'jogadores'
  | 'treinos'
  | 'jogos'
  | 'assiduidade'
  | 'convocatoria'
  | 'performance'
  | 'administracao'
  | 'aniversarios'
  | 'dados';

export type DashboardContextMode = 'match_day' | 'pre_match' | 'post_match' | 'training_day' | 'club_event' | 'normal';

export type AttendancePeriod = '7d' | '30d' | '90d' | 'season';
export type AttendanceTrend = 'melhorou' | 'diminuiu' | 'estavel' | 'insuficiente';
export type AttendanceCategory = 'excelente' | 'boa' | 'atencao' | 'baixa';

export type ExerciseCategory = 'aquecimento' | 'tecnica' | 'tatica' | 'fisico' | 'jogo' | 'bolas_paradas';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  description?: string;
  durationMinutes: number;
  tags?: string[];
  createdAt: string;
  intensity?: 'baixa' | 'moderada' | 'alta';
  playersCount?: string;
  spaceDimensions?: string;
  equipment?: string[];
  tacticalObjectives?: string;
  coachingPoints?: string[];
  variations?: string;
  /** What the exercise trains (shown in the session plan and its PDF). */
  objective?: string;
  /** Drawing or photo of the exercise, imported and compressed (JPEG data URL, about 150 KB at most). */
  image?: string;
}

export interface SessionBlock {
  id: string;
  exerciseId?: string; // Referência opcional a um Exercise da biblioteca
  pdfId?: string; // Referência opcional a um PDF da biblioteca
  pdfTitle?: string;
  pdfFileName?: string;
  title: string;
  category?: ExerciseCategory;
  durationMinutes: number;
  notes?: string;
}

export interface SessionPlan {
  objective?: string;
  totalDurationMinutes?: number;
  blocks: SessionBlock[];
}

export interface PlayerAttendanceSummary {
  playerId: string;
  playerName: string;
  playerNumber: number | null;
  position: string;
  status: PlayerStatus;
  totalTrainings: number;
  presences: number;
  absences: number;
  justifiedAbsences: number;
  rate: number; // 0 to 100 percentage
  trend: AttendanceTrend;
  trendDiff: number; // percentage points change vs previous period
  category: AttendanceCategory;
  lastAbsenceDate?: string;
  lastAbsenceReason?: string;
}

export interface PlayerEvolutionMetrics {
  playerId: string;
  playerName: string;
  totalMatches: number;
  starts: number; // titularidades (1.ª parte)
  startsSecondHalf?: number; // titularidades (2.ª parte)
  partesTitular?: number; // partes iniciadas como titular (0 a 2 por jogo)
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  avgRating: number;
  ratingsHistory: { matchId: string; opponent: string; date: string; rating: number }[];
  attendanceRate: number;
  attendancePresences: number;
  attendanceAbsences: number;
  consecutiveAbsences?: number;
  totalTrainings: number;
  monthlyAttendance?: {
    monthKey: string;
    monthName: string;
    totalTrainings: number;
    presences: number;
    absences: number;
    rate: number;
  }[];
  attendanceTrend: AttendanceTrend;
  ratingTrend: 'positiva' | 'negativa' | 'estavel' | 'insuficiente';
  ratingDiff: number;
  periodComparison: {
    periodLabel: string;
    currentAvgRating: number;
    prevAvgRating: number;
    ratingDiff: number;
    currentAttendance: number;
    prevAttendance: number;
    attendanceDiff: number;
  };
  summaryText: string;
  confidence: 'alta' | 'media' | 'insuficiente';
}

export interface PlayerStats {
  golos: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
  media: string;
  faltasTreino: number;
  jogosTitular: number; // Jogos a titular (1.ª parte)
  titularSegundaParte: number; // Titular 2.ª parte
  partesTitular: number; // Partes a titular (0 a 2)
  minutos: number;
  jogosRealizados?: number;
}

export interface SmartAlert {
  id: string;
  title: string;
  message: string;
  reason: string; // Explicação detalhada da origem da recomendação/alerta
  category: AlertCategory;
  priority: SmartPriority;
  timestamp: number;
  read?: boolean;
  targetTab?:
    'treinos' | 'convocatoria' | 'plantel' | 'calendario' | 'stats' | 'jogo' | 'jogos' | 'prejogo' | 'teams' | 'home';
  targetId?: string;
  actionLabel?: string;
  relatedCount?: number;
  relatedPlayerIds?: string[];
  resolved?: boolean;
}

export interface SmartRecommendation {
  id: string;
  title: string;
  message: string;
  rationale: string; // Explicação do porquê baseada em dados reais
  category: AlertCategory;
  priority: SmartPriority;
  confidence: 'alta' | 'media' | 'insuficiente';
  targetTab?:
    'treinos' | 'convocatoria' | 'plantel' | 'calendario' | 'stats' | 'jogo' | 'jogos' | 'prejogo' | 'teams' | 'home';
  targetId?: string;
  actionLabel: string;
  metricLabel?: string;
  metricValue?: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: 'alta' | 'media' | 'baixa' | SmartPriority;
  targetTab?:
    'treinos' | 'convocatoria' | 'plantel' | 'calendario' | 'stats' | 'jogo' | 'jogos' | 'prejogo' | 'teams' | 'home';
  targetId?: string;
  category?: string | AlertCategory;
  details?: string;
}

export interface WeeklyTrainingSlot {
  day: number; // 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
  time: string; // e.g. "19:00"
  label: string;
  location?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  notify24hTraining: boolean;
  notifyThursdayCallup: boolean;
  notifyLowAttendance: boolean;
  notifyBirthdays?: boolean;
  attendanceThreshold: number; // default 50%
  thursdayHour: number; // default 18 (18h)
  weeklyTrainingDays: WeeklyTrainingSlot[];
  adminContactEmail?: string; // e.g. "375.santos@gmail.com"
  adminContactPhone?: string; // e.g. "+351912345678"
}

export interface TacticPiece {
  id: string;
  kind: 'own' | 'opp' | 'ball';
  playerId: string | null;
  label: string;
  x: number; // Percentage 0..100
  y: number; // Percentage 0..100
}

export interface KeyPlayerInfo {
  name: string;
  number?: string | number;
  positions?: string;
  dominantFoot?: string;
  threats?: string;
  howToStop?: string;
}

export interface SetPieceTakers {
  leftCorner?: string;
  rightCorner?: string;
  directFreekick?: string;
  penalties?: string;
}

export interface MatchScheduleTimes {
  meetingTime?: string; // Hora de Concentração no Balneário
  talkTime?: string; // Hora da Preleção Técnica
  warmupTime?: string; // Início do Aquecimento
  entryTime?: string; // Entrada no Campo
}

export interface TeamKitInfo {
  jerseyColor?: string;
  shortsColor?: string;
  socksColor?: string;
  gkColor?: string;
}

export interface TacticalPitchPlayer {
  id: string;
  role: string; // e.g. "GR", "DE", "DC", "DD", "MC", "PL", "EXT"
  name?: string; // e.g. "João (1)", "Afonso (7)"
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface OpponentScouting {
  id: string;
  opponentName: string;
  matchId?: string; // Optional reference to ScheduledMatch.id
  date?: string;
  time?: string;
  location?: MatchLocation;
  matchType?: MatchType;
  phase?: string;
  stadium?: string;

  // A NOSSA EQUIPA (Plano Estratégico & Modelo de Jogo da Nossa Equipa)
  ourFormation?: string; // e.g. "2-3-1", "3-2-1", "2-1-2-1", "3-1-2", "2-2-2", "1-3-2", "4-3-3", "4-4-2"
  ourPlayingModel?: string; // e.g. "Pressão Alta & Domínio Posicional", "Bloco Médio Compacto & Saídas Rápidas"
  ourDefensiveBlock?: 'alto' | 'medio' | 'baixo';
  ourTacticalPitch?: TacticalPitchPlayer[]; // 7 Jogadores no Relvado Tático Editáveis

  // 4 Momentos de Jogo da Nossa Equipa
  offensiveOrganization?: string[]; // Instruções para quando temos a bola
  defensiveTransition?: string[]; // Reação imediata à perda
  defensiveOrganization?: string[]; // Instruções para quando não temos a bola
  offensiveTransition?: string[]; // Contra-ataque e transição ofensiva

  // Bolas Paradas da Nossa Equipa
  setPieceTakers?: SetPieceTakers;
  ourOffensiveSetPieces?: string; // Rotinas ofensivas (cantos ao 1º/2º poste, livres)
  ourDefensiveSetPieces?: string; // Sistema defensivo (marcação zona/mista, barreira, ressalto)

  // Balneário, Palavra de Ordem & 3 Objetivos Inegociáveis
  teamMotto?: string; // Palavra de Ordem / Lema do Jogo
  keyObjectives?: string[]; // 3 Objetivos Inegociáveis da Equipa
  lockerRoomTalk?: string; // Preleção Técnica / Discurso do Balneário

  // Cronograma, Equipamentos & Logística
  scheduleTimes?: MatchScheduleTimes;
  teamKit?: TeamKitInfo;
  checklist?: string[]; // Itens verificados da checklist pré-jogo (opcional)

  // ADVERSÁRIO (Scouting): ecrã removido a 21/10/2026, campos apagados pela limpeza em storage.ts (stripOpponentScouting)
  formation?: string; // e.g. "4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3", "4-1-4-1"
  playingStyle?: string; // e.g. "Bloco Médio / Transições", "Pressão Alta"
  strengths?: string[]; // Pontos Fortes
  weaknesses?: string[]; // Pontos Fracos
  keyPlayer?: KeyPlayerInfo; // Jogador Chave
  tacticalNotes?: string; // Tática & Dinâmicas (Organização Ofensiva/Defensiva)
  setPiecesNotes?: string; // Bolas Paradas
  gamePlan?: string; // Plano de Jogo da nossa equipa
  notes?: string; // Notas / Observações gerais
  preMatchFinalized?: boolean; // Se o Plano Pré-Jogo da nossa equipa foi finalizado
  preMatchFinalizedAt?: number;
  scoutingFinalized?: boolean; // Se a Análise de Scouting do Adversário foi finalizada
  scoutingFinalizedAt?: number;
  updatedAt: number;
}

export interface StaffUnavailability {
  id: string;
  name: string; // nome de quem está indisponível
  date: string; // YYYY-MM-DD
  endDate?: string; // opcional, para períodos de vários dias
  reason?: string; // motivo opcional
  createdAt: string;
}

export type ClubEventType = 'reuniao' | 'formacao' | 'estagio' | 'outro';

export interface ClubEvent {
  id: string;
  title: string; // Ex: "Reunião de Coordenação", "Formação UEFA", "Workshop de Nutrição"
  type: ClubEventType; // 'reuniao' | 'formacao' | 'estagio' | 'outro'
  date: string; // YYYY-MM-DD
  endDate?: string; // opcional, para períodos de vários dias
  time?: string; // HH:MM
  endTime?: string; // HH:MM
  location?: string; // Ex: "Auditório", "Sede do Clube", "Online (Zoom)"
  attendees?: string; // Ex: "Equipa Técnica", "Encarregados de Educação", "Plantel"
  notes?: string; // Ordem de trabalhos, apontamentos, objetivos
  isCompleted?: boolean; // Se o evento / reunião / formação já foi realizado
  completedAt?: string;
  createdAt: string;
}

export type StaffRole = 'Treinador Principal' | 'Treinador Adjunto' | 'Treinador de Guarda-Redes' | 'Diretor' | string;

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  birthDate?: string | null;
  photoUrl?: string;
  bio?: string;
  phone?: string;
  email?: string;
  createdAt?: string;
}

export type StaffMessageType = 'recado' | 'reuniao' | 'urgente' | 'geral' | 'treino_jogo' | 'indisponibilidade';

export interface StaffMeetingConfirmation {
  staffId: string;
  staffName: string;
  staffRole?: string;
  status: 'confirmado' | 'recusado' | 'pendente';
  timestamp: number;
  notes?: string;
}

export interface StaffMeetingDetails {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  endTime?: string; // HH:MM
  location: string;
  agenda?: string;
  confirmations?: StaffMeetingConfirmation[];
  addedToCalendar?: boolean;
  clubEventId?: string;
}

export interface StaffChatReply {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  content: string;
  createdAt: number;
  reactions?: { emoji: string; by: string; userName: string }[];
}

export interface StaffChatMessage {
  id: string;
  teamId?: string;
  senderId: string;
  senderName: string;
  senderRole: string; // e.g. "Treinador Principal", "Treinador Adjunto", "Diretor"
  senderAvatar?: string;
  type: StaffMessageType;
  title?: string;
  content: string;
  priority?: 'normal' | 'alta' | 'urgente';
  meetingDetails?: StaffMeetingDetails;
  targetStaffIds?: string[]; // If empty or undefined => "Toda a Equipa Técnica"
  targetLabel?: string;
  createdAt: number; // ms timestamp
  pinned?: boolean;
  reactions?: { emoji: string; by: string; userName: string }[];
  replies?: StaffChatReply[];
  alertSentVia?: ('push' | 'whatsapp' | 'sms' | 'share')[];
  readBy?: string[];
}

export type PreMatchReport = OpponentScouting;

export interface SquadProfile {
  id: string;
  clubName: string;
  category: string;
  season: string;
  clubLogoUrl?: string;
  createdAt: string;
  roster: Player[];
  staffMembers?: StaffMember[];
  staffMessages?: StaffChatMessage[];
  matches: Match[];
  trainings: Training[];
  lastTrainingNumber?: number;
  schedule: ScheduledMatch[];
  tactics: TacticPiece[];
  tacticFormat: 3 | 5 | 7 | 9 | 11;
  weeklyTrainingDays?: WeeklyTrainingSlot[];
  opponentScouting?: OpponentScouting[];
  staffUnavailability?: StaffUnavailability[];
  clubEvents?: ClubEvent[];
  exerciseLibrary?: Exercise[];
  /** Secret part of the parents' calendar link (/cal/{token}.ics); none = calendar not shared. */
  calendarToken?: string;
  /** Championship series (one per season): other games of the series, for the league table. */
  leagues?: LeagueSetup[];
  /** The team's rehearsed set pieces (corners, free kicks, throw-ins…), each its own cloud record. */
  setPieces?: SetPiece[];
}

export type SetPieceType = 'canto' | 'livre' | 'lancamento' | 'penalti' | 'pontape_saida';

/** One job in a set piece ("Marca", "1.º poste") and the athlete who does it. */
export interface SetPieceRole {
  label: string;
  playerId?: string | null;
}

export interface SetPiece {
  id: string;
  name: string;
  type: SetPieceType;
  side?: 'esquerda' | 'direita' | 'central';
  /** Drawing or photo (compressed JPEG data URL). */
  image?: string;
  notes?: string;
  roles: SetPieceRole[];
  createdAt: string;
}

/** A game of the championship series between two other teams (home team first). */
export interface LeagueGame {
  id: string;
  round?: number;
  date?: string; // YYYY-MM-DD
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

export interface LeagueSetup {
  id: string;
  season: string;
  /** Competition name ("Campeonato Distrital Sub-11 – Série B"). */
  name?: string;
  /** Teams of the series (teams that only appear in results are added on their own). */
  teams: string[];
  /** Results of the other games (the team's own championship games come from the app). */
  games: LeagueGame[];
  /** How the team is called in the table (default: the club name). */
  ourName?: string;
}

export type UserStatus = 'approved' | 'pending' | 'rejected';

export type UserClubRole =
  | 'Administrador'
  | 'Diretor'
  | 'Treinador Principal'
  | 'Treinador Adjunto'
  | 'Treinador de Guarda-Redes'
  | 'Preparador Físico'
  | 'Analista'
  | 'Fisioterapeuta';

export interface TeamRoleAssignment {
  teamId: string;
  teamName: string;
  role: UserClubRole;
  assignedAt: number;
}

export interface UserAccount {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: string;
  status: UserStatus;
  approvedBy?: string;
  approvedAt?: number;
  assignedTeams?: string[]; // Team IDs
  teamRoles?: TeamRoleAssignment[]; // Granular role per team
  clubId?: string;
  phoneNumber?: string;
  /** Invitation used to register (lets the security rules verify an invited, pre-approved account). */
  inviteCode?: string;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  name?: string;
  clubId: string;
  teamId: string;
  teamName: string;
  role: UserClubRole;
  inviteCode: string;
  invitedBy: string;
  invitedByName: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'revoked';
}

export interface ClubSeason {
  id: string;
  name: string; // e.g. "2025/2026", "2024/2025"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  notes?: string;
}

export type AuditActionType =
  | 'login'
  | 'logout'
  | 'create'
  | 'edit'
  | 'delete'
  | 'permission_change'
  | 'invite'
  | 'match_create'
  | 'match_edit'
  | 'match_event'
  | 'training_create'
  | 'training_attendance'
  | 'roster_edit'
  | 'report_export'
  | 'admin_change'
  | 'season_change'
  | 'sync_conflict';

export type AuditEntityType =
  | 'jogador'
  | 'jogo'
  | 'treino'
  | 'convocatoria'
  | 'utilizador'
  | 'equipa'
  | 'epoca'
  | 'relatorio'
  | 'sistema'
  | 'tatico';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditActionType;
  entityType: AuditEntityType;
  entityId?: string;
  clubId?: string;
  teamId?: string;
  teamName?: string;
  description: string;
  details?: Record<string, any>;
  clientInfo?: string;
}

export interface OfflineMutation {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  teamId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  status: 'queued' | 'syncing' | 'failed';
  retryCount: number;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  localTimestamp: number;
  remoteTimestamp: number;
  localData: any;
  remoteData: any;
  resolved: boolean;
  resolutionChoice?: 'local' | 'remote' | 'merged';
}

export interface TeamComparisonMetric {
  teamId: string;
  teamName: string;
  category: string;
  totalPlayers: number;
  activePlayers: number;
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number; // 0-100%
  goalsScored: number;
  goalsConceded: number;
  goalDiff: number;
  totalTrainings: number;
  avgAttendanceRate: number; // 0-100%
  staffCount: number;
  avgPlayerRating: number;
}

export interface ClubBoardSummary {
  clubName: string;
  season: string;
  totalTeams: number;
  totalPlayers: number;
  totalStaff: number;
  totalMatches: number;
  totalTrainings: number;
  overallWinRate: number;
  overallAttendanceRate: number;
  teamsComparison: TeamComparisonMetric[];
  lowAttendanceTeams: { teamName: string; rate: number }[];
  topScoringTeams: { teamName: string; goals: number }[];
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  isOnline: boolean;
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingChangesCount: number;
  syncId: string;
  lastSyncMessage?: string;
  autoSyncEnabled: boolean;
  deviceId?: string;
  pendingMutations?: OfflineMutation[];
  activeConflicts?: SyncConflict[];
}

export interface AppState {
  activeTeamId: string;
  teams: SquadProfile[];
  roster: Player[];
  staffMembers?: StaffMember[];
  staffMessages?: StaffChatMessage[];
  matches: Match[];
  trainings: Training[];
  lastTrainingNumber?: number;
  schedule: ScheduledMatch[];
  tactics: TacticPiece[];
  tacticFormat: 3 | 5 | 7 | 9 | 11;
  lastBackupDate: number | null;
  trackSubs: boolean;
  theme: ThemeName;
  lang: Language;
  myClubName: string;
  myClubStadium?: string;
  clubLogoUrl?: string;
  category?: string;
  season?: string;
  seasons?: ClubSeason[];
  currentUser?: UserAccount | null;
  users?: UserAccount[];
  invitations?: TeamInvitation[];
  auditLogs?: AuditLogEntry[];
  notifications?: AppNotification[];
  notificationSettings?: NotificationSettings;
  syncInfo?: SyncState;
  opponentScouting?: OpponentScouting[];
  staffUnavailability?: StaffUnavailability[];
  clubEvents?: ClubEvent[];
  /** Copy of the active team's set pieces (the teams hold them; see SquadProfile.setPieces). */
  setPieces?: SetPiece[];
  exerciseLibrary?: Exercise[];
  subscription?: ClubSubscription;
  updatedAt?: number;
  lastLocalMutationAt?: number;
  version?: number;
}

export type SubscriptionTierId = 'free_trial' | 'coach_pro' | 'club_standard' | 'academy_elite';

export interface CommercialPlan {
  id: SubscriptionTierId;
  name: string;
  badge: string;
  tagline: string;
  monthlyPriceEUR: number;
  yearlyPriceEUR: number;
  maxTeams: number;
  maxPlayersPerTeam: number;
  maxStaffAccounts: number;
  features: string[];
  recommended?: boolean;
}

export interface ClubSubscription {
  planId: SubscriptionTierId;
  planName: string;
  status: 'active' | 'trial' | 'expired' | 'grace_period';
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  activatedAt: string; // ISO date
  validUntil: string; // ISO date
  licenseKey?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  maxTeams: number;
  maxPlayers: number;
  isLifetime?: boolean;
}

export interface GeneratedLicenseKey {
  key: string;
  planId: SubscriptionTierId;
  planName: string;
  customerName: string;
  customerEmail?: string;
  durationMonths: number;
  createdAt: string;
  expiresAt: string;
  maxTeams: number;
  used?: boolean;
  usedByClubId?: string;
  usedAt?: string;
}

// ==============================================================================
// TEAM DATABASE (Per-Team Excel Database Model)
// ==============================================================================
export interface TeamDatabaseMeta {
  clubId: string;
  name: string;
  createdBy: string;
  updatedAt: number;
  updatedBy?: string;
}

export interface TeamDataset {
  id: string;
  name: string;
  columns: string[]; // max 40 columns
  rowCount: number; // max 5000 rows
  version: number;
  updatedAt: number;
  updatedBy: string;
}

export interface TeamDatabaseRow {
  id: string;
  data: Record<string, string | number | boolean | null>; // column -> value
  order: number;
  updatedAt: number;
  updatedBy: string;
}
