import { describe, expect, it } from 'vitest';
import { APP, darkColor, lightColor } from '../lib/pdf/pdfTheme';
import { generateMatchSheetPDF } from '../lib/pdf/createMatchReport';
import { normalizeClubState } from '../lib/storage';
import { AppState, Match } from '../types';

describe('PDF nas cores da app', () => {
  it('turns the old white-paper colours into the app colours', () => {
    expect(darkColor([255, 255, 255], 'fill')).toEqual(APP.surface);
    expect(darkColor([20, 30, 42], 'text')).toEqual(APP.text);
    expect(darkColor([16, 140, 70], 'text')).toEqual(APP.success);
    expect(darkColor([200, 40, 40], 'text')).toEqual(APP.danger);
    expect(darkColor([0, 140, 220], 'text')).toEqual(APP.brand);
    expect(darkColor(APP.brand, 'fill')).toEqual(APP.brand);
  });

  it('keeps white paper for the hand-written training plan', () => {
    expect(lightColor(APP.text)).toEqual([11, 18, 32]);
    expect(lightColor([200, 40, 40])).toEqual([200, 40, 40]);
  });

  it('draws the match report on navy pages with the same facts', async () => {
    const state = normalizeClubState({ myClubName: 'Clube Teste' } as AppState);
    const match = {
      id: 'm1',
      opponent: 'Equipa B',
      date: '2026-10-17',
      season: '2026/2027',
      type: 'campeonato',
      location: 'casa',
      finished: true,
      subs: [],
      lineup: [],
      capitao: null,
      goals: [{ id: 'g', type: 'scored', scorerId: null, assistId: null, minute: 5 }]
    } as unknown as Match;
    const raw = (await generateMatchSheetPDF(match, state, false)).doc.output() as string;
    expect(raw).toContain('(1 - 0)');
    expect(raw).toContain('VIT');
    // the page background in the app's navy
    expect(raw).toMatch(/0\.04 0\.07 0\.13 rg/);
  });
});
