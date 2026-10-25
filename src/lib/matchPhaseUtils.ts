import { Match, MatchGamePhase, MatchPeriod, Player } from '../types';
import { getLineupSize } from './constants';
import { getCategoryHalfDuration } from './gameAnalysis/constants';
import { getMatchElapsedMs } from './utils';

export function getNowTimestamp(): number {
  return Date.now();
}

export function getNowTimeString(): string {
  return new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Obtém a fase de jogo do Match com compatibilidade retroativa.
 * Por omissão: 'nao_iniciado'.
 * Em jogos antigos sem este campo: trata como 'parte2' se o jogo estiver terminado.
 */
export function getMatchPhase(match: Match | null | undefined): MatchGamePhase {
  if (!match) return 'nao_iniciado';

  // 1. Prioridade a matchPhase explícito
  if (
    match.matchPhase === 'nao_iniciado' ||
    match.matchPhase === 'parte1' ||
    match.matchPhase === 'intervalo' ||
    match.matchPhase === 'parte2'
  ) {
    return match.matchPhase;
  }

  // 2. Campo phase se contiver uma das fases do jogo
  if (
    match.phase === 'nao_iniciado' ||
    match.phase === 'parte1' ||
    match.phase === 'intervalo' ||
    match.phase === 'parte2'
  ) {
    return match.phase as MatchGamePhase;
  }

  // 3. Jogos antigos / guardados: se o jogo já estiver terminado, tratar como 'parte2'
  if (match.finished) {
    return 'parte2';
  }

  return 'nao_iniciado';
}

/**
 * Deriva automaticamente o período ('1.ª parte' | 'Intervalo' | '2.ª parte')
 * e half (1 | 2) a partir da fase do jogo.
 */
export function derivePeriodAndHalfFromPhase(phase: MatchGamePhase): {
  period: MatchPeriod;
  half: 1 | 2;
  isHalftime?: boolean;
} {
  if (phase === 'parte2') {
    return { period: '2.ª parte', half: 2 };
  }
  if (phase === 'intervalo') {
    return { period: 'Intervalo', half: 1, isHalftime: true };
  }
  return { period: '1.ª parte', half: 1 };
}

/**
 * Duração nominal de cada parte = match.firstHalfDurationMinutes || match.halfDurationMinutes || a duração por defeito do escalão.
 * Chama-lhe D.
 */
export function getNominalHalfDuration(match?: Match | null, category?: string): number {
  if (match?.firstHalfDurationMinutes) return match.firstHalfDurationMinutes;
  if (match?.halfDurationMinutes) return match.halfDurationMinutes;
  const cat = category || (match as any)?.category;
  return getCategoryHalfDuration(cat);
}

/**
 * Minuto de jogo contínuo (convenção única: MINUTO CONTÍNUO DE JOGO).
 * - Duração nominal de cada parte = match.firstHalfDurationMinutes || match.halfDurationMinutes || a duração por defeito do escalão. Chama-lhe D.
 * - 1.ª parte: m = floor(elapsedMs / 60000) + 1. Se m > D, mostrar "D+(m−D)" (ex.: "25+2").
 * - 2.ª parte: m2 = floor((elapsedMs − half1DurationMs) / 60000) + 1. O minuto de jogo é D + m2. Se m2 > D, mostrar "2D+(m2−D)".
 * - Devolve null em 'nao_iniciado' e 'intervalo'.
 */
export function getSuggestedMinute(match: Match | null | undefined, category?: string): string | null {
  if (!match) return null;
  const phase = getMatchPhase(match);
  if (phase === 'nao_iniciado' || phase === 'intervalo') {
    return null;
  }

  const D = getNominalHalfDuration(match, category);
  const elapsedMs = getMatchElapsedMs(match);

  if (phase === 'parte1') {
    const m = Math.floor(elapsedMs / 60000) + 1;
    if (m > D) {
      return `${D}+${m - D}`;
    }
    return String(m);
  }

  if (phase === 'parte2') {
    const half1DurationMs = match.timer?.half1DurationMs ?? D * 60000;
    const elapsedSecondHalfMs = Math.max(0, elapsedMs - half1DurationMs);
    const m2 = Math.floor(elapsedSecondHalfMs / 60000) + 1;
    const gameMin = D + m2;
    if (m2 > D) {
      return `${2 * D}+${m2 - D}`;
    }
    return String(gameMin);
  }

  return null;
}

/**
 * Calcula o minuto dentro da parte (minuteInHalf).
 * Na 1.ª parte: minuto dentro da 1.ª parte (ex.: 25+2 -> 27, ou 15 -> 15).
 * Na 2.ª parte: minuto de jogo − D (ex.: 35 com D=30 -> 5; 60+2 com D=30 -> 32).
 */
export function computeMinuteInHalf(
  minuteStr: string | number | null | undefined,
  half: 1 | 2,
  nominalHalfDuration: number
): number {
  if (minuteStr == null || minuteStr === '') return 0;
  const str = String(minuteStr).trim().toUpperCase();
  if (str === 'INT' || str === 'INTERVALO') {
    return nominalHalfDuration;
  }
  let gameMin: number;
  if (str.includes('+')) {
    const parts = str.replace("'", '').split('+');
    const base = parseFloat(parts[0]) || 0;
    const added = parseFloat(parts[1]) || 0;
    gameMin = base + added;
  } else {
    gameMin = parseFloat(str.replace("'", '')) || 0;
  }

  if (half === 2) {
    if (gameMin > nominalHalfDuration) {
      return Math.max(0, gameMin - nominalHalfDuration);
    }
    return Math.max(0, gameMin);
  }

  return Math.max(0, gameMin);
}

/**
 * Obtém os jogadores que terminaram a 1.ª parte em campo:
 * Parte do lineup inicial e aplica as substituições realizadas na 1.ª parte.
 */
export function getPlayersAtEndOfFirstHalf(match: Match): string[] {
  const pitch = new Set<string>(match.lineup || []);
  const subsFirstHalf = (match.subs || []).filter((s) => s.half === 1 || s.period === '1.ª parte');

  for (const s of subsFirstHalf) {
    pitch.delete(s.outId);
    pitch.add(s.inId);
  }

  return Array.from(pitch);
}

/**
 * Devolve os jogadores atualmente em campo com base na fase do jogo.
 * - nao_iniciado: lineup inicial da 1.ª parte
 * - parte1: lineup inicial da 1.ª parte + subs da 1.ª parte
 * - intervalo: quem terminou a 1.ª parte + subs feitas ao intervalo
 * - parte2: lineupSecondHalf (ou fim da 1.ª parte) + subs da 2.ª parte
 */
export function getCurrentPlayersOnPitch(match: Match): string[] {
  const phase = getMatchPhase(match);
  const lineupSize = getLineupSize(match);

  if (phase === 'nao_iniciado') {
    return match.lineup || [];
  }

  if (phase === 'parte1') {
    const pitch = new Set<string>(match.lineup || []);
    const subs1 = (match.subs || []).filter(
      (s) => (s.half === 1 || s.period === '1.ª parte') && s.period !== 'Intervalo' && s.minute !== 'INT'
    );
    for (const s of subs1) {
      pitch.delete(s.outId);
      pitch.add(s.inId);
    }
    return Array.from(pitch);
  }

  if (phase === 'intervalo') {
    const pitch = new Set<string>(getPlayersAtEndOfFirstHalf(match));
    const intSubs = (match.subs || []).filter((s) => s.period === 'Intervalo' || s.minute === 'INT');
    for (const s of intSubs) {
      pitch.delete(s.outId);
      pitch.add(s.inId);
    }
    return Array.from(pitch);
  }

  // parte2
  const baseLineup =
    match.lineupSecondHalf && match.lineupSecondHalf.length === lineupSize
      ? match.lineupSecondHalf
      : getPlayersAtEndOfFirstHalf(match);

  const pitch = new Set<string>(baseLineup);
  const subs2 = (match.subs || []).filter((s) => s.half === 2 || s.period === '2.ª parte');
  for (const s of subs2) {
    pitch.delete(s.outId);
    pitch.add(s.inId);
  }
  return Array.from(pitch);
}

/** Players called up for the match (the convocatória), falling back to the Agenda copy kept in the match. */
export function getMatchCallup(match: Match): string[] {
  return match.convocados?.length ? match.convocados : match.originalSchedule?.callup || [];
}

/**
 * Players offered in the live match (goals, cards, substitutions): the ones called up, plus anyone already used in
 * the match. Without a usable call-up (fewer players than the lineup) the whole active squad is offered.
 */
export function getMatchSquad(roster: Player[], match: Match | null | undefined): Player[] {
  const active = roster.filter((p) => p.active !== false);
  if (!match) return active;
  const callup = getMatchCallup(match);
  if (callup.length < getLineupSize(match)) return active;
  const inMatch = new Set<string>([
    ...callup,
    ...(match.lineup || []),
    ...(match.lineupSecondHalf || []),
    ...(match.subs || []).flatMap((s) => [s.outId, s.inId]),
    ...(match.goals || []).flatMap((g) => [g.scorerId || '', g.assistId || '']),
    ...(match.cards || []).map((c) => c.playerId)
  ]);
  return active.filter((p) => inMatch.has(p.id));
}
