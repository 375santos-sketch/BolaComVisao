import { TimePeriodStat, NormalizedEventTiming } from './types';

/**
 * Parses minute inputs into an exact mathematical number for statistical calculations (Item 3 & 7).
 * Supports numbers, string representations ("32", "45'"), and stoppage time ("45+2" -> 47, "90+3" -> 93).
 */
export function parseMinuteToNumber(minuteVal: number | string | null | undefined): number | null {
  if (minuteVal === null || minuteVal === undefined || minuteVal === '') return null;
  if (typeof minuteVal === 'number') return isNaN(minuteVal) ? null : minuteVal;

  const clean = String(minuteVal).replace(/'/g, '').trim();
  if (!clean || clean.toLowerCase() === 'n/a' || clean.toLowerCase() === 'unknown') return null;

  if (clean.includes('+')) {
    const parts = clean.split('+').map((p) => parseInt(p.trim(), 10));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] + parts[1];
    }
  }

  const num = parseInt(clean, 10);
  return isNaN(num) ? null : num;
}

/**
 * Normalizes an event's minute into an ABSOLUTE MATCH MINUTE (Item 3 & 7).
 * E.g.:
 * - 1st half 24' -> 24'
 * - 2nd half 12' with 30m half -> 42'
 * - 2nd half 12' with 45m half -> 57'
 * - Already absolute minute (e.g. 57' in 2nd half) -> remains 57'
 */
export function resolveAbsoluteMinute(
  minuteVal: number | string | null | undefined,
  half?: number,
  periodStr?: string,
  halfDurationMinutes: number = 30
): number | null {
  if (minuteVal === null || minuteVal === undefined || minuteVal === '') {
    return null;
  }

  const parsed = parseMinuteToNumber(minuteVal);
  if (parsed === null) return null;

  const pStr = (periodStr || '').toLowerCase();
  const isSecondHalf = half === 2 || pStr.includes('2') || pStr.includes('segunda');

  if (isSecondHalf) {
    // If the entered number is less than or equal to half duration (e.g., entered as 12' of 2nd half)
    if (parsed <= halfDurationMinutes) {
      return halfDurationMinutes + parsed;
    }
  }

  return parsed;
}

/**
 * Formats a minute for display (e.g., "24'", "45+2'", "INT")
 */
export function formatDisplayMinute(minuteVal: number | string | null | undefined): string {
  if (minuteVal === null || minuteVal === undefined || minuteVal === '') return '—';
  const str = String(minuteVal).trim();
  if (str.toUpperCase() === 'INT' || str.toLowerCase() === 'intervalo') return 'INT';
  if (str.endsWith("'")) return str;
  return `${str}'`;
}

/**
 * Unified Canonical Event Timing Normalizer (Item 7).
 * Parses and resolves raw timing into display, absolute minute, half, and period once.
 */
export function normalizeEventTiming(
  minuteVal: number | string | null | undefined,
  half?: number,
  periodStr?: string,
  halfDurationMinutes: number = 30
): NormalizedEventTiming {
  const display = formatDisplayMinute(minuteVal);
  const absolute = resolveAbsoluteMinute(minuteVal, half, periodStr, halfDurationMinutes);

  let stoppage = 0;
  if (typeof minuteVal === 'string' && minuteVal.includes('+')) {
    const parts = minuteVal.split('+');
    if (parts.length >= 2) {
      stoppage = parseInt(parts[1], 10) || 0;
    }
  }

  let determinedHalf: 1 | 2 | 'extra' | null = null;
  let determinedPeriod: '1ª Parte' | '2ª Parte' | 'Prolongamento' | 'Intervalo' | 'Desconhecido' = 'Desconhecido';

  const pStr = (periodStr || '').toLowerCase();
  if (display === 'INT' || pStr.includes('intervalo')) {
    determinedPeriod = 'Intervalo';
  } else if (half === 1 || pStr.includes('1') || pStr.includes('primeira')) {
    determinedHalf = 1;
    determinedPeriod = '1ª Parte';
  } else if (half === 2 || pStr.includes('2') || pStr.includes('segunda')) {
    determinedHalf = 2;
    determinedPeriod = '2ª Parte';
  } else if (half === 3 || pStr.includes('prolong') || pStr.includes('extra')) {
    determinedHalf = 'extra';
    determinedPeriod = 'Prolongamento';
  } else if (absolute !== null) {
    if (absolute <= halfDurationMinutes) {
      determinedHalf = 1;
      determinedPeriod = '1ª Parte';
    } else if (absolute <= halfDurationMinutes * 2) {
      determinedHalf = 2;
      determinedPeriod = '2ª Parte';
    } else {
      determinedHalf = 'extra';
      determinedPeriod = 'Prolongamento';
    }
  }

  return {
    rawMinute: minuteVal ?? null,
    displayMinute: display,
    absoluteMinute: absolute,
    period: determinedPeriod,
    half: determinedHalf,
    stoppageMinutes: stoppage
  };
}

/**
 * Generates intuitive, generic time periods based on category half duration (Item 8).
 * E.g., for 45m halves (90m match): 0–15', 16–30', 31–45' | 46–60', 61–75', 76–90', 90+'
 * E.g., for 35m halves (70m match): 0–15', 16–30', 31–35' | 36–50', 51–65', 66–70', 70+'
 * E.g., for 30m halves (60m match): 0–15', 16–30' | 31–45', 46–60', 60+'
 * E.g., for <=20m halves (40m match): 0–10', 11–20' | 21–30', 31–40', 40+'
 */
export function generateTimePeriodsForDuration(halfDuration: number = 30): TimePeriodStat[] {
  const periods: TimePeriodStat[] = [];
  const totalRegular = halfDuration * 2;

  // Choose interval block: 10m for very short games (<=20m), 15m for all standard youth & senior games
  const step = halfDuration <= 20 ? 10 : 15;

  // 1st Half intervals
  for (let start = 0; start < halfDuration; start += step) {
    const end = Math.min(start + step, halfDuration);
    const startDisplay = start === 0 ? 0 : start + 1;
    const key = `${startDisplay}-${end}`;
    const label = `${startDisplay}–${end}' (1ª Parte)`;
    periods.push({
      key,
      label,
      half: 1,
      startMin: startDisplay,
      endMin: end,
      scored: 0,
      conceded: 0,
      scoredEvents: [],
      concededEvents: []
    });
  }

  // 2nd Half intervals
  for (let start = halfDuration; start < totalRegular; start += step) {
    const end = Math.min(start + step, totalRegular);
    const startDisplay = start + 1;
    const key = `${startDisplay}-${end}`;
    const label = `${startDisplay}–${end}' (2ª Parte)`;
    periods.push({
      key,
      label,
      half: 2,
      startMin: startDisplay,
      endMin: end,
      scored: 0,
      conceded: 0,
      scoredEvents: [],
      concededEvents: []
    });
  }

  // Extra time / Stoppage period after regular match duration
  const extraKey = `${totalRegular}+`;
  periods.push({
    key: extraKey,
    label: `${totalRegular}+' (Comp./Prolongamento)`,
    half: 'extra',
    startMin: totalRegular + 1,
    endMin: 999,
    scored: 0,
    conceded: 0,
    scoredEvents: [],
    concededEvents: []
  });

  return periods;
}

/**
 * Classifies an absolute minute into the corresponding period key.
 */
export function classifyIntoPeriod(
  absoluteMin: number | null,
  half: number | undefined,
  periods: TimePeriodStat[],
  halfDuration: number = 30
): string {
  if (absoluteMin === null) {
    // If unknown minute, place in first period of respective half
    if (half === 2) {
      const p2 = periods.find((p) => p.half === 2);
      return p2 ? p2.key : `${halfDuration * 2}+`;
    }
    const p1 = periods.find((p) => p.half === 1);
    return p1 ? p1.key : periods[0]?.key || '0-15';
  }

  for (const p of periods) {
    if (p.half === 'extra' && absoluteMin > halfDuration * 2) {
      return p.key;
    }
    if (absoluteMin >= p.startMin && absoluteMin <= p.endMin) {
      return p.key;
    }
  }

  // If beyond
  const extraPeriod = periods.find((p) => p.half === 'extra');
  return extraPeriod ? extraPeriod.key : periods[periods.length - 1].key;
}
