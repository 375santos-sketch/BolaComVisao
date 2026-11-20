import { beforeEach, describe, expect, it, vi } from 'vitest';

// MC2a (correção): «O Meu Percurso» is published on its own (a coach's tick reaches the athlete even when the
// family's page did not change), and the athlete's own account never gets a family page. Fictitious data.
const published = vi.hoisted(() => ({ family: [] as string[], athlete: [] as string[] }));
vi.mock('../services/guardians', () => ({
  teamGuardianInvites: async () => [
    { id: 'MAE', kind: 'encarregado', status: 'accepted', athleteId: 'p1', clubId: 'clubeX', teamId: 'eq1' },
    { id: 'ATL', kind: 'atleta', status: 'accepted', athleteId: 'p1', clubId: 'clubeX', teamId: 'eq1' }
  ],
  careerClubs: async () => ['clubeX'],
  publishFamilyView: async (invite: { id: string }) => void published.family.push(invite.id),
  publishAthleteView: async (invite: { id: string }) => void published.athlete.push(invite.id)
}));

const storage = new Map<string, string>();
(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v)
};

const { publishFamilyViews } = await import('../services/familyPublisher');
const { normalizeClubState } = await import('../lib/storage');

const NOW = '2026-11-17T10:00:00.000Z';
const stateWith = (ticks: Record<string, string>) =>
  normalizeClubState({
    activeTeamId: 'eq1',
    currentUser: { id: 'treinador1', clubId: 'clubeX', name: 'Treinador', role: 'Treinador Principal' },
    teams: [
      {
        id: 'eq1',
        clubName: 'Clube X',
        category: 'Sub-15',
        season: '2026/2027',
        roster: [{ id: 'p1', name: 'Atleta Um', number: 7, positions: '', birthDate: '2012-01-10', active: true }],
        vjSessions: [
          {
            id: 'c1',
            format: 'sessao',
            title: 'Desafio 1',
            competencies: [],
            status: 'publicado',
            items: [],
            createdAt: NOW,
            updatedAt: NOW,
            challengeType: 'reflexao',
            reflection: { prompts: ['O que correu bem?'] }
          }
        ],
        assignments: [
          {
            id: 'a1',
            target: { kind: 'desafio', id: 'c1' },
            to: ['p1'],
            status: 'ativa',
            progress: Object.keys(ticks).length ? { p1: ticks } : undefined,
            createdAt: NOW,
            updatedAt: NOW
          }
        ]
      }
    ]
  } as never);

describe('MC2a — publicação das páginas', () => {
  beforeEach(() => {
    published.family = [];
    published.athlete = [];
  });

  it('the athlete own account gets only «O Meu Percurso», never a family page', async () => {
    await publishFamilyViews(stateWith({}));
    expect(published.family).toEqual(['MAE']);
    expect(published.athlete.sort()).toEqual(['ATL', 'MAE']);
  });

  it('a coach tick reaches the athlete pages although the family page did not change', async () => {
    await publishFamilyViews(stateWith({ 0: '2026-11-18' }));
    expect(published.family).toEqual([]); // the family page is the same: not written again
    expect(published.athlete.sort()).toEqual(['ATL', 'MAE']);
  });

  it('nothing is written again when nothing changed', async () => {
    await publishFamilyViews(stateWith({ 0: '2026-11-18' }));
    expect(published.family).toEqual([]);
    expect(published.athlete).toEqual([]);
  });
});
