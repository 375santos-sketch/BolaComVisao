import { Player, Match, ThemeName, AppState, ScheduledMatch, MatchType, ClubSeason } from '../types';
import { getLineupSize } from './constants';

/**
 * Sanitizes text from Excel:
 * - converts to string, trims and collapses multiple spaces into one;
 * - removes diacritics/accents with normalize('NFD') and removal of \u0300-\u036f (Ç→C, Ã→A, É→E);
 * - removes all characters except A-Z, 0-9 and space;
 * - converts to uppercase;
 * - returns '' for null/undefined/empty.
 */
export function sanitizeExcelText(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (!str) return '';
  if (str.toUpperCase() === 'UNDEFINED' || str.toUpperCase() === 'NULL') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes a raw Excel cell right after sheet_to_json, preserving structured data
 * types (dates, times, scores, emails, numbers, height, weight) without corruption.
 */
export function sanitizeExcelRawCell(value: unknown): any {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return isNaN(value) ? '' : value;
  }
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (!str) return '';
  if (str.toUpperCase() === 'UNDEFINED' || str.toUpperCase() === 'NULL') return '';

  // Email exception: preserve in lowercase and intact (@ and . are required)
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    return str.toLowerCase();
  }

  // Date in ISO format or DD/MM/YYYY / DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Time format: HH:MM or HHhMM
  const timeMatch = str.match(/^([01]?[0-9]|2[0-3])[:hH]([0-5][0-9])$/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }

  // Score format: "3-1", "3 - 1", "2x0", "1:0"
  if (/^\d+\s*[-x:]\s*\d+$/.test(str)) {
    return str.replace(/\s+/g, '');
  }

  // Height format: e.g. 1.82m, 1,82, 182cm -> 1.82 M
  const heightDecMatch = str.match(/^([12])[,.]([0-9]{1,2})\s*(?:m|metros)?$/i);
  if (heightDecMatch) {
    return `${heightDecMatch[1]}.${heightDecMatch[2].padEnd(2, '0')} M`;
  }
  const heightCmMatch = str.match(/^([12][0-9]{2})\s*(?:cm|centimetros)?$/i);
  if (heightCmMatch) {
    return `${(parseInt(heightCmMatch[1], 10) / 100).toFixed(2)} M`;
  }

  // Weight format: e.g. 75kg, 75 kg, 75.5kg -> 75 KG
  const weightMatch = str.match(/^([0-9]{2,3}(?:[,.][0-9])?)\s*(?:kg|quilos)?$/i);
  if (weightMatch && (str.toLowerCase().includes('kg') || str.toLowerCase().includes('quilo'))) {
    return `${weightMatch[1].replace(',', '.')} KG`;
  }

  // All other text: convert to uppercase without accents or symbols
  return sanitizeExcelText(str);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function escapeHTML(str: string): string {
  if (!str) return '';
  return String(str).replace(
    /[&<>'"]/g,
    (match) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[match] || match
  );
}

export function computeAge(birthDateStr: string | null): number | null {
  if (!birthDateStr) return null;
  const b = new Date(birthDateStr);
  if (isNaN(b.getTime())) return null;
  const tc = new Date();
  let age = tc.getFullYear() - b.getFullYear();
  const mDiff = tc.getMonth() - b.getMonth();
  if (mDiff < 0 || (mDiff === 0 && tc.getDate() < b.getDate())) age--;
  return age;
}

export function getPositionRank(posStr?: string): number {
  if (!posStr) return 99;
  const p = posStr.toLowerCase();

  if (p.includes('guarda') || p.includes('gr') || p.includes('gk') || p.includes('baliza')) return 1;

  if (p.includes('defesa central') || p.includes('dc') || p.includes('cb')) return 2;
  if (p.includes('lateral direito') || p.includes('ld') || p.includes('rb')) return 3;
  if (p.includes('lateral esquerdo') || p.includes('le') || p.includes('lb')) return 4;
  if (p.includes('defesa') || p.includes('def')) return 5;

  if (p.includes('defensivo') || p.includes('mdf') || p.includes('cdm')) return 6;
  if (p.includes('médio centro') || p.includes('medio centro') || p.includes('mc') || p.includes('cm')) return 7;
  if (p.includes('médio ofensivo') || p.includes('medio ofensivo') || p.includes('mo') || p.includes('cam')) return 8;
  if (p.includes('médio') || p.includes('medio') || p.includes('med')) return 9;

  if (p.includes('extremo direito') || p.includes('ed') || p.includes('rw')) return 10;
  if (p.includes('extremo esquerdo') || p.includes('ee') || p.includes('lw')) return 11;
  if (p.includes('extremo')) return 12;
  if (
    p.includes('avançado') ||
    p.includes('avancado') ||
    p.includes('pl') ||
    p.includes('ac') ||
    p.includes('st') ||
    p.includes('cf')
  )
    return 13;

  return 20;
}

export function sortPlayerObjs(arr: Player[]): Player[] {
  return [...arr].sort((a, b) => {
    const rankA = getPositionRank(a.positions);
    const rankB = getPositionRank(b.positions);
    if (rankA !== rankB) return rankA - rankB;

    const numA = a.number !== null && a.number !== undefined && !isNaN(Number(a.number)) ? Number(a.number) : 9999;
    const numB = b.number !== null && b.number !== undefined && !isNaN(Number(b.number)) ? Number(b.number) : 9999;
    if (numA !== numB) return numA - numB;

    const nameA = a && a.name ? String(a.name) : '';
    const nameB = b && b.name ? String(b.name) : '';
    return nameA.localeCompare(nameB);
  });
}

export function playerLabel(p?: Player, noNameFallback = 'Sem Nome'): string {
  if (!p) return noNameFallback;
  return p.number ? `${p.number} - ${p.name}` : p.name || noNameFallback;
}

/** Football season ("2026/2027") a date belongs to; seasons run from July to June. */
export function seasonFromDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T12:00:00`) : date;
  if (Number.isNaN(d.getTime())) return defaultSeason();
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export function defaultSeason(): string {
  return seasonFromDate(new Date());
}

/** Previous, current and next season (by today's date), with the current one marked. */
export function buildDefaultSeasons(currentName: string = defaultSeason()): ClubSeason[] {
  const startYear = Number(currentName.slice(0, 4)) || new Date().getFullYear();
  return [startYear, startYear - 1, startYear + 1].map((y) => ({
    id: `season_${String(y).slice(2)}${String(y + 1).slice(2)}`,
    name: `${y}/${y + 1}`,
    startDate: `${y}-07-01`,
    endDate: `${y + 1}-06-30`,
    isCurrent: y === startYear
  }));
}

export function normalizeSeasonString(s?: string | null): string {
  if (!s) return '';
  const clean = s.trim();
  const match2 = clean.match(/^(\d{4})\/(\d{2})$/);
  if (match2) {
    const century = match2[1].slice(0, 2);
    return `${match2[1]}/${century}${match2[2]}`;
  }
  return clean;
}

export function isSeasonMatching(matchSeason?: string | null, filterSeason?: string | null): boolean {
  if (!filterSeason || filterSeason === 'todas') return true;
  if (!matchSeason) return filterSeason === 'Sem época';
  const normM = normalizeSeasonString(matchSeason);
  const normF = normalizeSeasonString(filterSeason);
  return normM === normF || matchSeason === filterSeason;
}

export function formatMinute(min: number | string | null | undefined): string {
  if (min === null || min === undefined || min === '') return '';
  const str = String(min).trim();
  if (str.toUpperCase() === 'INT' || str.toLowerCase() === 'intervalo') return 'INT';
  if (str.endsWith("'")) return str;
  return `${str}'`;
}

export function parseMinuteOrder(min: number | string | null | undefined, period?: string): number {
  if (min === null || min === undefined || min === '') return 999;
  const str = String(min).trim().toUpperCase();
  if (str === 'INT' || str === 'INTERVALO') return 45.5;
  if (str.includes('+')) {
    const parts = str.replace("'", '').split('+');
    const base = parseFloat(parts[0]) || 0;
    const add = (parseFloat(parts[1]) || 0) * 0.01;
    return base + add;
  }
  const numeric = parseFloat(str.replace("'", ''));
  if (!isNaN(numeric)) {
    if (period === '2.ª parte' && numeric <= 45) return numeric + 45;
    return numeric;
  }
  return 999;
}

export function calculateMatchScore(match: Match): { scored: number; conceded: number } {
  const scored = (match.goals || []).filter((g) => g.type === 'scored').length;
  const conceded = (match.goals || []).filter((g) => g.type === 'conceded').length;
  return { scored, conceded };
}

export function formatMatchTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mm = Math.floor(totalSecs / 60);
  const ss = totalSecs % 60;
  return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}

export function getMatchElapsedMs(m: Match): number {
  if (!m.timer) return 0;
  let total = m.timer.elapsedMs || 0;
  if (m.timer.isRunning && m.timer.lastStartTs) {
    total += Date.now() - m.timer.lastStartTs;
  }
  return total;
}

export function getMatchMinute(m: Match): number {
  return Math.floor(getMatchElapsedMs(m) / 60000);
}

export function timeToMins(tStr?: string): number {
  if (!tStr) return 0;
  const parts = tStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function getHalfDuration(m: Match, half: 1 | 2): number {
  if (half === 1) {
    if (m.timer && m.timer.half1DurationMs != null) return Math.floor(m.timer.half1DurationMs / 60000);
    if (m.timeline) {
      if (m.timeline.halftime) {
        const diff = timeToMins(m.timeline.halftime) - timeToMins(m.timeline.kickoff);
        return diff < 0 ? diff + 1440 : diff;
      }
      if (m.timeline.kickoff && !m.timeline.halftime) return getMatchMinute(m);
    }
    if (m.firstHalfDurationMinutes) return m.firstHalfDurationMinutes;
    if (m.halfDurationMinutes) return m.halfDurationMinutes;
    return 0;
  } else {
    if (m.timer && m.timer.half2DurationMs != null) return Math.floor(m.timer.half2DurationMs / 60000);
    if (m.timeline) {
      if (m.timeline.fullTime && m.timeline.secondHalfStart) {
        const diff = timeToMins(m.timeline.fullTime) - timeToMins(m.timeline.secondHalfStart);
        return diff < 0 ? diff + 1440 : diff;
      }
      if (m.timeline.secondHalfStart && !m.timeline.fullTime) return getMatchMinute(m);
    }
    if (m.secondHalfDurationMinutes) return m.secondHalfDurationMinutes;
    if (m.halfDurationMinutes) return m.halfDurationMinutes;
    return 0;
  }
}

export function getPlayersOnPitchAtEndOfHalf(m: Match, half: 1 | 2): string[] {
  const lineupSize = getLineupSize(m);
  const hasLineup2 = Boolean(m.lineupSecondHalf && m.lineupSecondHalf.length === lineupSize);

  if (half === 1) {
    let current = [...(m.lineup || [])];
    const subs = (m.subs || [])
      .filter((s) => (s.half ?? 1) <= 1)
      .sort((a, b) => {
        const halfA = a.half ?? 1;
        const halfB = b.half ?? 1;
        if (halfA !== halfB) return halfA - halfB;
        const minA = a.isHalftime ? 9999 : a.minuteInHalf != null ? a.minuteInHalf : parseMinuteOrder(a.minute);
        const minB = b.isHalftime ? 9999 : b.minuteInHalf != null ? b.minuteInHalf : parseMinuteOrder(b.minute);
        return minA - minB;
      });

    subs.forEach((s) => {
      current = current.filter((id) => id !== s.outId);
      current.push(s.inId);
    });
    return current;
  }

  // half === 2
  let current = hasLineup2 ? [...(m.lineupSecondHalf || [])] : getPlayersOnPitchAtEndOfHalf(m, 1);

  const subs = (m.subs || [])
    .filter((s) => {
      const subHalf = s.half ?? 1;
      if (subHalf !== 2) return false;
      if (hasLineup2 && s.isHalftime) return false;
      return true;
    })
    .sort((a, b) => {
      const minA = a.minuteInHalf != null ? a.minuteInHalf : parseMinuteOrder(a.minute);
      const minB = b.minuteInHalf != null ? b.minuteInHalf : parseMinuteOrder(b.minute);
      return minA - minB;
    });

  subs.forEach((s) => {
    current = current.filter((id) => id !== s.outId);
    current.push(s.inId);
  });
  return current;
}

export function calcPlayerMinutes(m: Match, pId: string): number {
  let mins = 0;
  const lineupSize = getLineupSize(m);
  const hasLineup2 = Boolean(m.lineupSecondHalf && m.lineupSecondHalf.length === lineupSize);

  ([1, 2] as const).forEach((half) => {
    const duration = Math.max(0, getHalfDuration(m, half));
    let onPitch =
      half === 1
        ? (m.lineup || []).includes(pId)
        : hasLineup2
          ? (m.lineupSecondHalf || []).includes(pId)
          : getPlayersOnPitchAtEndOfHalf(m, 1).includes(pId);
    let timeOn = 0;

    const subsInHalf = (m.subs || [])
      .filter((s) => {
        const subHalf = s.half ?? 1;
        if (subHalf !== half) return false;
        // Quando existe lineupSecondHalf, ignora as substituições feitas ao intervalo no cálculo de minutos (a lista da 2.ª parte já as inclui)
        if (hasLineup2 && (s.isHalftime || s.period === 'Intervalo' || s.minute === 'INT')) {
          return false;
        }
        return !s.isHalftime;
      })
      .sort((a, b) => {
        const minA = a.minuteInHalf != null ? a.minuteInHalf : parseMinuteOrder(a.minute);
        const minB = b.minuteInHalf != null ? b.minuteInHalf : parseMinuteOrder(b.minute);
        return minA - minB;
      });

    subsInHalf.forEach((sub) => {
      const subMin = Math.max(0, sub.minuteInHalf != null ? sub.minuteInHalf : parseMinuteOrder(sub.minute));
      if (sub.outId === pId && onPitch) {
        mins += Math.max(0, subMin - timeOn);
        onPitch = false;
      }
      if (sub.inId === pId && !onPitch) {
        timeOn = subMin;
        onPitch = true;
      }
    });

    if (onPitch) {
      mins += Math.max(0, duration - timeOn);
    }
  });

  return Math.max(0, mins);
}

export const themes: Record<ThemeName, Record<string, string>> = {
  original: {
    '--bg': '#08141e',
    '--surface': '#0f2232',
    '--surface-2': '#173248',
    '--chalk': '#ffffff',
    '--muted': '#7dd3fc',
    '--gold': '#00d2ff',
    '--gold-dim': '#0a3e56',
    '--red': '#ef4444',
    '--red-dim': '#450a0a',
    '--yellow': '#f59e0b',
    '--green': '#00e676',
    '--green-dim': '#084d2a',
    '--line': 'rgba(0,210,255,0.16)',
    '--btn-gold-txt': '#041525',
    '--btn-red-txt': '#ffffff',
    '--btn-green-txt': '#041525'
  },
  luzsolar: {
    '--bg': '#F4F7F6',
    '--surface': '#FFFFFF',
    '--surface-2': '#E2E8F0',
    '--chalk': '#1A202C',
    '--muted': '#64748B',
    '--gold': '#C58B2E',
    '--gold-dim': '#FEEBC8',
    '--red': '#DC2626',
    '--red-dim': '#FEE2E2',
    '--yellow': '#D97706',
    '--green': '#16A34A',
    '--green-dim': '#DCFCE7',
    '--line': 'rgba(0,0,0,0.12)',
    '--btn-gold-txt': '#FFFFFF',
    '--btn-red-txt': '#FFFFFF',
    '--btn-green-txt': '#FFFFFF'
  },
  oceanonoturno: {
    '--bg': '#0F172A',
    '--surface': '#1E293B',
    '--surface-2': '#334155',
    '--chalk': '#F8FAFC',
    '--muted': '#94A3B8',
    '--gold': '#0EA5E9',
    '--gold-dim': '#0C4A6E',
    '--red': '#EF4444',
    '--red-dim': '#450A0A',
    '--yellow': '#F59E0B',
    '--green': '#10B981',
    '--green-dim': '#064E3B',
    '--line': 'rgba(255,255,255,0.10)',
    '--btn-gold-txt': '#000000',
    '--btn-red-txt': '#FFFFFF',
    '--btn-green-txt': '#000000'
  }
};

export function applyThemeCSS(themeName: ThemeName) {
  const root = document.documentElement;
  const th = themes[themeName] || themes.original;
  for (const k in th) {
    root.style.setProperty(k, th[k]);
  }
  const metaColor = document.querySelector('meta[name="theme-color"]');
  if (metaColor) metaColor.setAttribute('content', th['--bg']);
}

export interface MatchCompetitionDetails {
  type: MatchType;
  typeLabel: string; // "Campeonato", "Jogo Amigável", "Torneio"
  phase: string; // e.g. "Jornada 5", "Fase de Grupos", "1ª Jornada"
  faseJornadaText: string; // Clean text for "fase/jornada": e.g. "Jornada 5" or "—"
  rawType: MatchType;
  tournamentName?: string;
  source: 'agenda' | 'match' | 'default';
  scheduledMatch?: ScheduledMatch;
}

/**
 * Procura e recupera as informações de competição e fase/jornada
 * correspondentes na Agenda (state.schedule) para um jogo / ficha de jogo.
 * Permite que ao gerar PDF ou Excel do modo jogo apareça exatamente:
 * tipo: campeonato / amigável / torneio
 * fase/jornada: Jornada X / Fase de Grupos / etc.
 */
export function getMatchCompetitionDetails(match: Match, state?: AppState): MatchCompetitionDetails {
  const schedule: ScheduledMatch[] = [
    ...(Array.isArray(state?.schedule) ? state.schedule : []),
    ...(Array.isArray(state?.teams) ? state.teams.flatMap((t) => t.schedule || []) : [])
  ];

  let scheduled: ScheduledMatch | undefined = undefined;

  // 1. Procurar na agenda atual por ID do jogo
  if (match.id) {
    scheduled = schedule.find((s) => s.id === match.id);
  }

  // 2. Procurar na agenda por ID referenciado em originalSchedule
  if (!scheduled && match.originalSchedule?.id) {
    scheduled = schedule.find((s) => s.id === match.originalSchedule?.id);
  }

  // 3. Procurar na agenda por data e nome de adversário exatos
  const matchOpp = (match.opponent || '').trim().toLowerCase();
  const matchDate = (match.date || '').trim();
  if (!scheduled && matchOpp && matchDate) {
    scheduled = schedule.find((s) => s.date === matchDate && (s.opponent || '').trim().toLowerCase() === matchOpp);
  }

  // 4. Procurar na agenda por nome de adversário
  if (!scheduled && matchOpp) {
    scheduled = schedule.find((s) => (s.opponent || '').trim().toLowerCase() === matchOpp);
  }

  // 5. Se não encontrou na agenda ativa, usar o snapshot salvo no próprio jogo (originalSchedule)
  if (!scheduled && match.originalSchedule) {
    scheduled = match.originalSchedule;
  }

  // Obter o tipo (agenda tem prioridade, depois match, default 'campeonato')
  const rawType: MatchType = scheduled?.type || match.type || 'campeonato';
  const rawPhase = (scheduled?.phase || match.phase || '').trim();
  const rawTournament = (scheduled?.tournamentName || match.tournamentName || '').trim();

  let typeLabel = 'Campeonato';
  if (rawType === 'amigavel') {
    typeLabel = 'Jogo Amigável';
  } else if (rawType === 'torneio') {
    typeLabel = rawTournament ? `Torneio (${rawTournament})` : 'Torneio';
  }

  const faseJornadaText = rawPhase || (rawType === 'amigavel' ? 'Jogo Único' : '—');

  return {
    type: rawType,
    typeLabel,
    phase: rawPhase,
    faseJornadaText,
    rawType,
    tournamentName: rawTournament || undefined,
    source: scheduled ? 'agenda' : match.type || match.phase ? 'match' : 'default',
    scheduledMatch: scheduled
  };
}
