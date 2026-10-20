import { Player, Match, GoalEvent, CardEvent, SubEvent, Training, ScheduledMatch, AppState, GoalType } from '../types';
import { normalizeGoalType } from './gameAnalysis/constants';
import { uid, seasonFromDate } from './utils';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  entityId?: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  sanitized: T;
  errors: string[];
  warnings: string[];
  issues: ValidationIssue[];
}

/**
 * Validates and sanitizes a single GoalEvent.
 * Guarantees standard goalType normalization and prevents null/undefined corruption.
 */
export function validateAndSanitizeGoalEvent(raw: any, _index = 0): GoalEvent | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : uid();
  const type: 'scored' | 'conceded' = raw.type === 'conceded' ? 'conceded' : 'scored';
  const scorerId = raw.scorerId && typeof raw.scorerId === 'string' ? raw.scorerId.trim() : null;
  const assistId =
    raw.assistId && typeof raw.assistId === 'string' && raw.assistId !== 'none' ? raw.assistId.trim() : null;

  let minute: number | string | null = null;
  if (typeof raw.minute === 'number' && !isNaN(raw.minute) && raw.minute >= 0) {
    minute = raw.minute;
  } else if (typeof raw.minute === 'string' && raw.minute.trim()) {
    minute = raw.minute.trim();
  }

  const half: 1 | 2 = raw.half === 2 ? 2 : 1;
  const period = typeof raw.period === 'string' ? raw.period : half === 2 ? '2.ª parte' : '1.ª parte';
  const goalType: GoalType = normalizeGoalType(raw.goalType);
  const notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 500) : undefined;

  return {
    id,
    type,
    scorerId,
    assistId,
    minute,
    half,
    period,
    goalType,
    notes
  };
}

/**
 * Validates and sanitizes a SubEvent.
 */
export function validateAndSanitizeSubEvent(raw: any): SubEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : uid();
  const outId = typeof raw.outId === 'string' ? raw.outId.trim() : '';
  const inId = typeof raw.inId === 'string' ? raw.inId.trim() : '';
  if (!outId && !inId) return null;

  const half: 1 | 2 = raw.half === 2 ? 2 : 1;
  const period = typeof raw.period === 'string' ? raw.period : half === 2 ? '2.ª parte' : '1.ª parte';
  const isHalftime = Boolean(raw.isHalftime);
  const minute = typeof raw.minute === 'number' || typeof raw.minute === 'string' ? raw.minute : null;
  const notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 300) : undefined;

  return { id, outId, inId, half, period, isHalftime, minute, notes };
}

/**
 * Validates and sanitizes a CardEvent.
 */
export function validateAndSanitizeCardEvent(raw: any): CardEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : uid();
  const playerId = typeof raw.playerId === 'string' ? raw.playerId.trim() : '';
  if (!playerId) return null;

  const color: 'Amarelo' | 'Vermelho' = raw.color === 'Vermelho' ? 'Vermelho' : 'Amarelo';
  const half: 1 | 2 = raw.half === 2 ? 2 : 1;
  const period = typeof raw.period === 'string' ? raw.period : half === 2 ? '2.ª parte' : '1.ª parte';
  const minute = typeof raw.minute === 'number' || typeof raw.minute === 'string' ? raw.minute : null;

  return { id, playerId, color, half, period, minute };
}

/**
 * Validates and sanitizes a Player entity.
 */
export function validateAndSanitizePlayer(raw: any): ValidationResult<Player> {
  const issues: ValidationIssue[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      sanitized: {
        id: uid(),
        name: 'Jogador Inválido',
        number: null,
        positions: '',
        birthDate: null,
        active: true
      },
      errors: ['Objecto de jogador corrompido'],
      warnings: [],
      issues: [{ field: 'root', message: 'Objecto de jogador corrompido', severity: 'error' }]
    };
  }

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : uid();
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 100) : '';
  if (!name) {
    errors.push('Nome do jogador é obrigatório');
    issues.push({ field: 'name', message: 'Nome não pode ser vazio', severity: 'error', entityId: id });
  }

  let number: number | null = null;
  if (raw.number !== null && raw.number !== undefined && raw.number !== '') {
    const parsedNum = parseInt(String(raw.number), 10);
    if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 99) {
      number = parsedNum;
    } else {
      warnings.push(`Número de camisola inválido (${raw.number}) — reposto para vazio`);
      issues.push({ field: 'number', message: 'Número deve estar entre 1 e 99', severity: 'warning', entityId: id });
    }
  }

  const positions = typeof raw.positions === 'string' ? raw.positions.trim().slice(0, 60) : '';
  const birthDate = typeof raw.birthDate === 'string' && raw.birthDate.trim() ? raw.birthDate.trim() : null;
  const dominantFoot = ['Direito', 'Esquerdo', 'Ambidestro'].includes(raw.dominantFoot) ? raw.dominantFoot : undefined;
  const status = ['disponivel', 'lesionado', 'suspenso', 'inativo'].includes(raw.status) ? raw.status : 'disponivel';
  const active = raw.active !== false;

  const sanitized: Player = {
    id,
    name: name || 'Sem Nome',
    number,
    positions,
    birthDate,
    dominantFoot,
    status,
    active,
    height: typeof raw.height === 'string' ? raw.height.slice(0, 20) : undefined,
    weight: typeof raw.weight === 'string' ? raw.weight.slice(0, 20) : undefined,
    phone: typeof raw.phone === 'string' ? raw.phone.slice(0, 30) : undefined,
    email: typeof raw.email === 'string' ? raw.email.slice(0, 100) : undefined,
    emergencyContact: typeof raw.emergencyContact === 'string' ? raw.emergencyContact.slice(0, 100) : undefined,
    photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl : undefined
  };

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
    warnings,
    issues
  };
}

/**
 * Validates and sanitizes a Match entity.
 */
export function validateAndSanitizeMatch(raw: any): ValidationResult<Match> {
  const issues: ValidationIssue[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      sanitized: {
        id: uid(),
        opponent: 'Adversário',
        date: new Date().toISOString().split('T')[0],
        type: 'campeonato',
        season: '2025/2026',
        location: 'casa',
        finished: false,
        goals: [],
        subs: [],
        lineup: [],
        capitao: null
      },
      errors: ['Objecto de jogo corrompido'],
      warnings: [],
      issues: [{ field: 'root', message: 'Objecto de jogo corrompido', severity: 'error' }]
    };
  }

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : uid();
  const opponent = typeof raw.opponent === 'string' && raw.opponent.trim() ? raw.opponent.trim().slice(0, 100) : '';
  if (!opponent) {
    warnings.push('Nome do adversário não especificado');
    issues.push({ field: 'opponent', message: 'Adversário vazio', severity: 'warning', entityId: id });
  }

  const date =
    typeof raw.date === 'string' && raw.date.trim() ? raw.date.trim() : new Date().toISOString().split('T')[0];
  const type = ['amigavel', 'campeonato', 'torneio'].includes(raw.type) ? raw.type : 'campeonato';
  const location = raw.location === 'fora' ? 'fora' : 'casa';
  const season = typeof raw.season === 'string' && raw.season.trim() ? raw.season.trim() : seasonFromDate(date);
  const finished = Boolean(raw.finished);

  // Validate goals
  const goals: GoalEvent[] = Array.isArray(raw.goals)
    ? raw.goals
        .map((g: any, idx: number) => validateAndSanitizeGoalEvent(g, idx))
        .filter((g: any): g is GoalEvent => g !== null)
    : [];

  // Validate subs
  const subs: SubEvent[] = Array.isArray(raw.subs)
    ? raw.subs.map((s: any) => validateAndSanitizeSubEvent(s)).filter((s: any): s is SubEvent => s !== null)
    : [];

  // Validate cards
  const cards: CardEvent[] = Array.isArray(raw.cards)
    ? raw.cards.map((c: any) => validateAndSanitizeCardEvent(c)).filter((c: any): c is CardEvent => c !== null)
    : [];

  // Lineup validation
  const lineup: string[] = Array.isArray(raw.lineup)
    ? raw.lineup.filter((pid: any) => typeof pid === 'string' && pid.trim().length > 0)
    : [];

  const capitao = typeof raw.capitao === 'string' && raw.capitao.trim() ? raw.capitao.trim() : null;

  const sanitized: Match = {
    id,
    opponent: opponent || 'Adversário',
    date,
    type,
    location,
    season,
    finished,
    goals,
    subs,
    cards,
    lineup,
    capitao,
    phase: typeof raw.phase === 'string' ? raw.phase.slice(0, 50) : undefined,
    tournamentName: typeof raw.tournamentName === 'string' ? raw.tournamentName.slice(0, 100) : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 2000) : undefined,
    halfDurationMinutes: typeof raw.halfDurationMinutes === 'number' ? raw.halfDurationMinutes : undefined,
    cornersFor: typeof raw.cornersFor === 'number' ? Math.max(0, raw.cornersFor) : undefined,
    cornersAgainst: typeof raw.cornersAgainst === 'number' ? Math.max(0, raw.cornersAgainst) : undefined,
    foulsCommitted: typeof raw.foulsCommitted === 'number' ? Math.max(0, raw.foulsCommitted) : undefined,
    foulsSuffered: typeof raw.foulsSuffered === 'number' ? Math.max(0, raw.foulsSuffered) : undefined,
    timer: raw.timer && typeof raw.timer === 'object' ? raw.timer : undefined,
    timeline: raw.timeline && typeof raw.timeline === 'object' ? raw.timeline : undefined
  };

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
    warnings,
    issues
  };
}

/**
 * Validates and sanitizes a Training entity.
 */
export function validateAndSanitizeTraining(raw: any): ValidationResult<Training> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issues: ValidationIssue[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      sanitized: {
        id: uid(),
        date: new Date().toISOString().split('T')[0],
        notes: '',
        absences: [],
        completed: true
      },
      errors: ['Objecto de treino corrompido'],
      warnings: [],
      issues: [{ field: 'root', message: 'Objecto de treino corrompido', severity: 'error' }]
    };
  }

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : uid();
  const date =
    typeof raw.date === 'string' && raw.date.trim() ? raw.date.trim() : new Date().toISOString().split('T')[0];
  const notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 2000) : '';
  const absences = Array.isArray(raw.absences)
    ? raw.absences.filter((pid: any) => typeof pid === 'string' && pid.trim().length > 0)
    : [];
  const completed = raw.completed !== false;
  const durationMinutes = typeof raw.durationMinutes === 'number' && raw.durationMinutes > 0 ? raw.durationMinutes : 90;
  const trainingNumber =
    typeof raw.trainingNumber === 'number' && !isNaN(raw.trainingNumber) && raw.trainingNumber > 0
      ? Math.floor(raw.trainingNumber)
      : undefined;

  const sanitized: Training = {
    id,
    trainingNumber,
    date,
    notes,
    absences,
    completed,
    durationMinutes,
    time: typeof raw.time === 'string' ? raw.time.slice(0, 10) : undefined,
    location: typeof raw.location === 'string' ? raw.location.slice(0, 100) : undefined,
    type: typeof raw.type === 'string' ? raw.type.slice(0, 50) : undefined,
    season: typeof raw.season === 'string' ? raw.season.slice(0, 50) : undefined,
    sessionPlan: raw.sessionPlan && typeof raw.sessionPlan === 'object' ? raw.sessionPlan : undefined
  };

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
    warnings,
    issues
  };
}

/**
 * Deep validation and sanitization of full AppState before cloud sync or persistent storage.
 * Guarantees no corrupted, unbounded, or malformed entries crash the app or breach storage limits.
 */
export function validateAndSanitizeAppState(state: AppState): {
  sanitizedState: AppState;
  report: {
    playersCount: number;
    matchesCount: number;
    trainingsCount: number;
    totalWarnings: number;
    totalErrors: number;
    details: string[];
  };
} {
  const details: string[] = [];
  let totalWarnings = 0;
  let totalErrors = 0;

  // 1. Sanitize Roster
  const sanitizedRoster: Player[] = [];
  (state.roster || []).forEach((p, idx) => {
    const res = validateAndSanitizePlayer(p);
    if (!res.isValid) {
      totalErrors += res.errors.length;
      details.push(`Jogador #${idx + 1} (${p?.name || 'sem nome'}): ${res.errors.join(', ')}`);
    }
    if (res.warnings.length > 0) {
      totalWarnings += res.warnings.length;
    }
    sanitizedRoster.push(res.sanitized);
  });

  // 2. Sanitize Matches
  const sanitizedMatches: Match[] = [];
  (state.matches || []).forEach((m, idx) => {
    const res = validateAndSanitizeMatch(m);
    if (!res.isValid) {
      totalErrors += res.errors.length;
      details.push(`Jogo #${idx + 1} (${m?.opponent || 'sem adversário'}): ${res.errors.join(', ')}`);
    }
    if (res.warnings.length > 0) {
      totalWarnings += res.warnings.length;
    }
    sanitizedMatches.push(res.sanitized);
  });

  // 3. Sanitize Trainings
  const sanitizedTrainings: Training[] = [];
  (state.trainings || []).forEach((t, idx) => {
    const res = validateAndSanitizeTraining(t);
    if (!res.isValid) {
      totalErrors += res.errors.length;
      details.push(`Treino #${idx + 1} (${t?.date || 'sem data'}): ${res.errors.join(', ')}`);
    }
    sanitizedTrainings.push(res.sanitized);
  });

  // 4. Sanitize Schedule
  const sanitizedSchedule: ScheduledMatch[] = Array.isArray(state.schedule)
    ? state.schedule.map((s) => ({
        id: typeof s.id === 'string' && s.id.trim() ? s.id.trim() : uid(),
        opponent: typeof s.opponent === 'string' ? s.opponent.trim().slice(0, 100) : 'Adversário',
        date: typeof s.date === 'string' ? s.date : new Date().toISOString().split('T')[0],
        time: typeof s.time === 'string' ? s.time : '10:00',
        type: ['amigavel', 'campeonato', 'torneio'].includes(s.type) ? s.type : 'campeonato',
        location: s.location === 'fora' ? 'fora' : 'casa',
        callup: Array.isArray(s.callup) ? s.callup.filter((pid) => typeof pid === 'string') : [],
        venue: typeof s.venue === 'string' ? s.venue.slice(0, 100) : undefined,
        meetingTime: typeof s.meetingTime === 'string' ? s.meetingTime.slice(0, 10) : undefined,
        meetingPoint: typeof s.meetingPoint === 'string' ? s.meetingPoint.slice(0, 100) : undefined,
        callupNotes: typeof s.callupNotes === 'string' ? s.callupNotes.slice(0, 1000) : undefined,
        callupFinalized: typeof s.callupFinalized === 'boolean' ? s.callupFinalized : undefined,
        callupFinalizedAt: typeof s.callupFinalizedAt === 'number' ? s.callupFinalizedAt : undefined,
        preMatchFinalized: typeof s.preMatchFinalized === 'boolean' ? s.preMatchFinalized : undefined,
        preMatchFinalizedAt: typeof s.preMatchFinalizedAt === 'number' ? s.preMatchFinalizedAt : undefined,
        scoutingFinalized: typeof s.scoutingFinalized === 'boolean' ? s.scoutingFinalized : undefined,
        scoutingFinalizedAt: typeof s.scoutingFinalizedAt === 'number' ? s.scoutingFinalizedAt : undefined
      }))
    : [];

  const sanitizedState: AppState = {
    ...state,
    roster: sanitizedRoster,
    matches: sanitizedMatches,
    trainings: sanitizedTrainings,
    schedule: sanitizedSchedule
  };

  return {
    sanitizedState,
    report: {
      playersCount: sanitizedRoster.length,
      matchesCount: sanitizedMatches.length,
      trainingsCount: sanitizedTrainings.length,
      totalWarnings,
      totalErrors,
      details
    }
  };
}
