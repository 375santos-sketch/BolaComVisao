import { describe, expect, it } from 'vitest';
import { ageOn, athleteViewOf, stepsDone } from '../lib/athleteView';
import { activeInvites } from '../lib/familyView';
import { normalizeClubState } from '../lib/storage';

// Fictitious data, only for this test
const today = new Date('2026-11-17T10:00:00Z');
const NOW = '2026-11-17T10:00:00.000Z';
const challenge = (id: string, extra: object) => ({
  id,
  format: 'sessao',
  title: `Desafio ${id}`,
  competencies: [],
  status: 'publicado',
  items: [],
  createdAt: NOW,
  updatedAt: NOW,
  ...extra
});
const state = normalizeClubState({
  activeTeamId: 'eq1',
  myClubName: 'Clube Exemplo',
  category: 'Sub-15',
  season: '2026/2027',
  teams: [
    {
      id: 'eq1',
      clubName: 'Clube Exemplo',
      category: 'Sub-15',
      season: '2026/2027',
      roster: [
        {
          id: 'p1',
          name: 'Atleta Um',
          number: 7,
          positions: '',
          birthDate: '2013-01-10',
          active: true,
          coachNotes: 'NOTA INTERNA',
          phone: '910000000'
        },
        { id: 'p2', name: 'Atleta Dois', number: 8, positions: '', birthDate: '2015-06-01', active: true }
      ],
      exerciseLibrary: [
        {
          id: 'ex1',
          name: 'Receção em triângulo',
          category: 'tecnica',
          durationMinutes: 12,
          createdAt: '2026-11-01',
          image: 'data:image/jpeg;base64,IMAGEM'
        }
      ],
      vjSessions: [
        challenge('c1', {
          challengeType: 'pergunta',
          prompt: {
            id: 'q',
            at: 0,
            kind: 'escolha',
            question: 'Onde?',
            options: [{ id: 'a', text: 'Frente', correct: true }]
          }
        }),
        challenge('c2', { challengeType: 'pratico', exerciseId: 'ex1', completionCriteria: '5 seguidas' }),
        challenge('c3', { challengeType: 'reflexao', reflection: { prompts: ['O que correu bem?'] } }),
        challenge('c4', { status: 'rascunho', challengeType: 'reflexao' })
      ],
      missions: [
        {
          id: 'm1',
          title: 'Receção orientada',
          steps: [{ challengeId: 'c1' }, { challengeId: 'c2' }, { challengeId: 'c4' }],
          status: 'publicado',
          createdAt: NOW,
          updatedAt: NOW
        }
      ],
      assignments: [
        {
          id: 'a1',
          target: { kind: 'missao', id: 'm1' },
          to: ['p1', 'p2'],
          status: 'ativa',
          progress: { p1: { 0: '2026-11-15' }, p2: { 0: '2026-11-16', 1: '2026-11-16' } },
          createdAt: NOW,
          updatedAt: NOW
        },
        {
          id: 'a2',
          target: { kind: 'desafio', id: 'c3' },
          to: ['p2'],
          status: 'ativa',
          createdAt: NOW,
          updatedAt: NOW
        },
        {
          id: 'a3',
          target: { kind: 'desafio', id: 'c3' },
          to: 'equipa',
          status: 'cancelada',
          createdAt: NOW,
          updatedAt: NOW
        }
      ]
    }
  ]
} as never);
const p1 = state.teams[0].roster.find((p) => p.id === 'p1')!;

describe('MC2a — a página «O Meu Percurso»', () => {
  it("only this athlete's assignments, with only this athlete's ticks", () => {
    const v = athleteViewOf(state, p1, today);
    expect(v.assignments.map((a) => a.id)).toEqual(['a1']); // not a2 (another athlete), not a3 (cancelled)
    expect(stepsDone(v.assignments[0])).toBe(1); // p2 did 2, p1 did 1
    expect(v.assignments[0].steps[0]).toMatchObject({ type: 'pergunta', done: '2026-11-15' });
    expect(v.assignments[0].steps[1].exercise).toEqual({ name: 'Receção em triângulo', minutes: 12 });
    expect(v.assignments[0].steps[2].missing).toBe(true); // a draft is not shown
  });

  it('never notes, contacts, other athletes, nor pictures of the exercises', () => {
    const raw = JSON.stringify(athleteViewOf(state, p1, today));
    for (const secret of ['NOTA INTERNA', '910000000', 'Atleta Dois', 'p2', 'IMAGEM', '2026-11-16'])
      expect(raw).not.toContain(secret);
  });

  it('own account only from 13 (from the roster birth date)', () => {
    expect(ageOn('2013-01-10', today)).toBe(13);
    expect(ageOn('2013-12-01', today)).toBe(12);
    expect(ageOn(null, today)).toBeNull();
    expect(athleteViewOf(state, p1, today).canHaveOwnAccount).toBe(true);
    const p2 = state.teams[0].roster.find((p) => p.id === 'p2')!;
    expect(athleteViewOf(state, p2, today).canHaveOwnAccount).toBe(false);
  });

  it("the athlete's own invitation never takes a guardian's place (2 per athlete)", () => {
    const inv = (kind: 'encarregado' | 'atleta') =>
      ({ athleteId: 'p1', status: 'accepted', expiresAt: 0, kind }) as never;
    expect(activeInvites([inv('encarregado'), inv('atleta')], 1)).toHaveLength(1);
  });
});
