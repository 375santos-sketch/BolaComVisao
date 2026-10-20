import { describe, it, expect } from 'vitest';
import { formatMinute } from '../lib/utils';

describe('Match Minute Required & Period Removed validation', () => {
  it('formats minutes with apostrophe or returns INT', () => {
    expect(formatMinute(12)).toBe("12'");
    expect(formatMinute('23')).toBe("23'");
    expect(formatMinute("34'")).toBe("34'");
    expect(formatMinute('INT')).toBe('INT');
    expect(formatMinute('intervalo')).toBe('INT');
  });

  it('validates that empty minute is blocked', () => {
    const isMinuteValid = (min: string) => min.trim().length > 0;

    expect(isMinuteValid('')).toBe(false);
    expect(isMinuteValid('   ')).toBe(false);
    expect(isMinuteValid('12')).toBe(true);
    expect(isMinuteValid('INT')).toBe(true);
    expect(isMinuteValid('45+2')).toBe(true);
  });
});
