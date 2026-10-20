/**
 * Game Analysis Utility Layer
 * Re-exports and integrates the modular Game Analysis engine with backward-compatible signatures.
 */

import { Match } from '../types';
import {
  AnalysisFilters,
  AggregatedAnalysis,
  computeGameAnalysis,
  parseMinuteToNumber,
  formatDisplayMinute,
  resolveAbsoluteMinute
} from './gameAnalysis';

export * from './gameAnalysis';

/**
 * Backward compatibility wrapper for computeAggregatedAnalysis
 */
export function computeAggregatedAnalysis(
  matches: Match[],
  filters: AnalysisFilters,
  categoryName?: string
): AggregatedAnalysis {
  return computeGameAnalysis(matches, filters, categoryName);
}

/**
 * Backward-compatible TIME_PERIOD_LABELS map
 */
export const TIME_PERIOD_LABELS: Record<string, string> = {
  '0-5': '0–5 min',
  '6-10': '6–10 min',
  '11-15': '11–15 min',
  '16-20': '16–20 min',
  '21-25': '21–25 min',
  '26-30': '26–30 min',
  '31-35': '31–35 min',
  '36-40': '36–40 min',
  '41-45': '41–45 min',
  '46-50': '46–50 min',
  '51-55': '51–55 min',
  '56-60': '56–60 min',
  '60+': '60+ min',
  '61-75': '61–75 min',
  '76-90': '76–90 min',
  '90+': '90+ min'
};

export { parseMinuteToNumber, formatDisplayMinute as formatMinute };

/**
 * Classifies a minute into 5-minute periods for Sub-11 (backward-compatible function)
 */
export function classifyTimePeriod(
  minuteVal: number | string | null | undefined,
  half?: number,
  halfDuration: number = 30
): string {
  if (minuteVal === null || minuteVal === undefined || minuteVal === '') {
    return '0-5';
  }
  const abs = resolveAbsoluteMinute(minuteVal, half, undefined, halfDuration);
  if (abs === null) return '0-5';

  if (typeof minuteVal === 'string' && minuteVal.startsWith('30+')) {
    return '26-30';
  }

  if (abs <= 5) return '0-5';
  if (abs <= 10) return '6-10';
  if (abs <= 15) return '11-15';
  if (abs <= 20) return '16-20';
  if (abs <= 25) return '21-25';
  if (abs <= 30) return '26-30';
  if (abs <= 35) return '31-35';
  if (abs <= 40) return '36-40';
  if (abs <= 45) return '41-45';
  if (abs <= 50) return '46-50';
  if (abs <= 55) return '51-55';
  if (abs <= 60) return '56-60';
  return '60+';
}
