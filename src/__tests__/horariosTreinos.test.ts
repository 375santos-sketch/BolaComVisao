import { describe, expect, it } from 'vitest';
import { firstTrainingTime, teamSettings, trainingSlot, withTeamSettings } from '../lib/teamSettings';
import { trainingForToday } from '../lib/trainingQuick';
import { dayLabel } from '../lib/pdf/pdfBlocks';
import { AppState, Training } from '../types';

const state = { activeTeamId: 't1', teams: [{ id: 't1' }] } as unknown as AppState;

describe('horário dos treinos', () => {
  it('starts with Monday 19:15, Thursday 18:15 and 75 minutes', () => {
    const s = teamSettings(state);
    expect(s.trainingMinutes).toBe(75);
    expect(trainingSlot(s, '2026-10-26')).toEqual({ time: '19:15', durationMinutes: 75 }); // Monday
    expect(trainingSlot(s, '2026-10-29')).toEqual({ time: '18:15', durationMinutes: 75 }); // Thursday
    expect(trainingSlot(s, '2026-10-27')).toEqual({ durationMinutes: 75 }); // Tuesday: no team time
    expect(firstTrainingTime(s)).toBe('19:15');
  });

  it('follows what the coach sets for the team', () => {
    const teams = withTeamSettings(state, { trainingTimes: { '2': '18:00' }, trainingMinutes: 90 })!;
    const s = teamSettings({ ...state, teams });
    expect(trainingSlot(s, '2026-10-27')).toEqual({ time: '18:00', durationMinutes: 90 });
    expect(firstTrainingTime(s)).toBe('18:00');
  });

  it('"Treino de hoje" uses the team time over the last training', () => {
    const last = [{ id: 'a', date: '2026-10-22', time: '18:15', durationMinutes: 90, completed: true }] as Training[];
    const monday = trainingForToday(last, 1, '2026-10-26', trainingSlot(teamSettings(state), '2026-10-26'));
    expect([monday.training.time, monday.training.durationMinutes]).toEqual(['19:15', 75]);
    const tuesday = trainingForToday(last, 1, '2026-10-27', trainingSlot(teamSettings(state), '2026-10-27'));
    expect([tuesday.training.time, tuesday.training.durationMinutes]).toEqual(['18:15', 75]);
  });

  it('writes dates for people in the PDFs', () => {
    expect(dayLabel('2026-11-07')).toBe('Sáb 07/11');
    expect(dayLabel('2026-11-07', true)).toBe('Sábado 07/11');
  });
});
