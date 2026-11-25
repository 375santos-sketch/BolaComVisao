import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AppState } from '../types';
import { clubColorVars, shade } from '../lib/clubColors';
import { DEFAULT_CLUB_COLOR, LEGACY_DEFAULT_CLUB_COLOR, teamSettings } from '../lib/teamSettings';

/** Design · etapa 0: the base of the design system (preto, verde e branco). */
const css = readFileSync('src/index.css', 'utf8');
const theme = css.slice(css.indexOf('@theme {'), css.indexOf('@layer base'));
const token = (name: string) => theme.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();

describe('Design · base preto e verde', () => {
  it('the brand colour is the BolaComVisão green, on a black without blue', () => {
    expect(DEFAULT_CLUB_COLOR).toBe('#2edb74');
    expect(token('--color-ui-brand')).toBe(DEFAULT_CLUB_COLOR);
    expect(token('--color-ui-bg')).toBe('#0a0b0c');
    expect(token('--color-ui-success')).not.toBe(token('--color-ui-brand'));
  });

  it('the accent scale in the CSS is the same the club colour would build (no jump when a club changes colour)', () => {
    const steps: [string, number][] = [
      ['50', 0.9],
      ['300', 0.4],
      ['500', 0],
      ['700', -0.3],
      ['950', -0.75]
    ];
    steps.forEach(([step, amount]) => expect(token(`--color-cyan-${step}`)).toBe(shade(DEFAULT_CLUB_COLOR, amount)));
    expect(clubColorVars(DEFAULT_CLUB_COLOR)).toEqual({});
  });

  it('a team that saved the old cyan gets the green; any other colour stays the club’s', () => {
    const state = (clubColor?: string) =>
      ({ activeTeamId: 't1', teams: [{ id: 't1', clubColor }] }) as unknown as AppState;
    expect(teamSettings(state(LEGACY_DEFAULT_CLUB_COLOR)).clubColor).toBe(DEFAULT_CLUB_COLOR);
    expect(teamSettings(state('#22C3EE')).clubColor).toBe(DEFAULT_CLUB_COLOR);
    expect(teamSettings(state(undefined)).clubColor).toBe(DEFAULT_CLUB_COLOR);
    expect(teamSettings(state('#e23b3b')).clubColor).toBe('#e23b3b');
  });
});
