import { describe, it, expect } from 'vitest';
import { upcomingGames, cleanPlan, hasPlan, buildPreMatchText, competitionLabel } from '../lib/preMatchPlan';
import { normalizeClubState, resetOldPreMatchFlags } from '../lib/storage';
import { AppState, Match, ScheduledMatch } from '../types';

const game = (id: string, date: string, extra: Partial<ScheduledMatch> = {}): ScheduledMatch => ({
  id,
  opponent: 'Tramagal SU',
  date,
  time: '10:30',
  type: 'campeonato',
  phase: 'Jornada 5',
  location: 'casa',
  callup: [],
  ...extra
});

describe('Pré-jogo', () => {
  it('lists the games still to play, soonest first', () => {
    const list = upcomingGames(
      [game('c', '2026-11-08'), game('a', '2026-10-01'), game('b', '2026-10-25'), game('t', '2026-10-21')],
      '2026-10-21'
    );
    expect(list.map((g) => g.id)).toEqual(['t', 'b', 'c']);
  });

  it('an untouched form saves no plan; objectives are trimmed and capped at 3', () => {
    expect(hasPlan(cleanPlan({ system: ' ', objectives: ['', ' '], motto: '' }))).toBe(false);
    const p = cleanPlan({ objectives: [' Ganhar duelos ', '', 'Pressão alta', 'Bolas paradas', 'Quarto'] }, 'Bruno');
    expect(p.objectives).toEqual(['Ganhar duelos', 'Pressão alta', 'Bolas paradas']);
    expect(p.updatedBy).toBe('Bruno');
    expect(hasPlan(p)).toBe(true);
  });

  it('WhatsApp summary includes the plan and last time against them', () => {
    const lastTime = {
      id: 'm',
      opponent: 'TRAMAGAL SU',
      date: '2026-03-01',
      finished: true,
      goals: [],
      opponentReport: { nextTime: 'Pressionar a saída de bola' }
    } as unknown as Match;
    const text = buildPreMatchText(
      game('g', '2026-10-25', {
        meetingTime: '09:30',
        venue: 'Campo do Tramagal',
        preMatchPlan: { system: '2-3-1', objectives: ['Ganhar duelos'], withoutBall: 'Pressão alta', motto: 'Juntos!' }
      }),
      { myClubName: 'Dragões', matches: [lastTime] } as unknown as AppState
    );
    expect(text).toContain('Dragões vs Tramagal SU');
    expect(text).toContain('25/10/2026 às 10:30 · Casa · Campo do Tramagal');
    expect(text).toContain('Concentração: 09:30');
    expect(text).toContain('🔥 *Juntos!*');
    expect(text).toContain('1. Ganhar duelos');
    expect(text).toContain('Da última vez contra eles: Pressionar a saída de bola');
    expect(competitionLabel(game('x', '2026-10-25'))).toBe('Campeonato – Jornada 5');
  });

  it('PDF with the plan', async () => {
    const { buildPreMatchPlanPDF } = await import('../lib/pdf/createPreMatchPlan');
    const doc = await buildPreMatchPlanPDF(
      game('g', '2026-10-25', { preMatchPlan: { system: '3-2-1', withBall: 'Sair a jogar curto' } }),
      normalizeClubState({ myClubName: 'Dragões' } as AppState)
    );
    const raw = doc.output() as string;
    expect(raw).toContain('Sair a jogar curto');
    expect(raw).toContain('3-2-1');
  });

  it('old "plan finalized" marks are cleared once; a game with a new plan keeps its mark', () => {
    const old = normalizeClubState({
      version: 2,
      activeTeamId: 't',
      teams: [
        {
          id: 't',
          clubName: 'Dragões',
          category: 'Sub-11',
          season: '2026/2027',
          schedule: [
            game('a', '2026-10-25', { preMatchFinalized: true }),
            game('b', '2026-11-01', { preMatchFinalized: true, preMatchPlan: { motto: 'Foco' } })
          ]
        } as any
      ]
    } as AppState);
    expect(old.schedule.find((g) => g.id === 'a')?.preMatchFinalized).toBeUndefined();
    expect(old.schedule.find((g) => g.id === 'b')?.preMatchFinalized).toBe(true);
    expect(old.version).toBe(3);
    // Runs once: a game marked ready afterwards (even without notes) keeps the mark
    const later = normalizeClubState({
      ...old,
      schedule: old.schedule.map((g) => (g.id === 'a' ? { ...g, preMatchFinalized: true } : g)),
      teams: old.teams.map((t) => ({
        ...t,
        schedule: (t.schedule || []).map((g) => (g.id === 'a' ? { ...g, preMatchFinalized: true } : g))
      }))
    });
    expect(later.schedule.find((g) => g.id === 'a')?.preMatchFinalized).toBe(true);
    expect(resetOldPreMatchFlags(later).version).toBe(3);
  });
});
