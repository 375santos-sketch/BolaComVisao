import { describe, expect, it } from 'vitest';
import {
  PLAYER_PRIVATE_FIELDS,
  extractPrivateRecords,
  hasPrivateData,
  joinPrivate,
  privateKindsFor,
  readsPrivateData,
  stripPrivate
} from '../lib/privateRecords';
import { normalizeClubState } from '../lib/storage';
import { extractRecords } from '../lib/recordSync';

// Fictitious data, only for this test
const state = normalizeClubState({
  activeTeamId: 'eq1',
  teams: [
    {
      id: 'eq1',
      clubName: 'Clube Exemplo',
      category: 'Sub-13',
      season: '2026/2027',
      roster: [
        {
          id: 'p1',
          name: 'Atleta Um',
          number: 7,
          positions: 'Médio',
          birthDate: '2014-02-01',
          active: true,
          status: 'lesionado',
          statusUntil: '2026-12-01',
          statusNote: 'entorse',
          phone: '910000000',
          email: 'familia@exemplo.pt',
          emergencyContact: 'Mãe 920000000',
          height: '150',
          weight: '40',
          notes: 'observação',
          coachNotes: 'nota interna',
          seasonMessages: { '2026/2027': 'Boa época' },
          evaluations: [{ id: 'e1', date: '2026-10-01', scores: { tecnica: 4 } }],
          competencyEvaluations: [{ id: 'c1', date: '2026-10-02', levels: { passe: 3 } }],
          fitnessTests: { '2026/2027-set': { sprint20: 3.9 } },
          individualGoals: [{ id: 'g1', text: 'Melhorar o passe', createdAt: '2026-09-10' }]
        },
        { id: 'p2', name: 'Atleta Dois', number: 8, positions: '', birthDate: null, active: true, phone: '' }
      ],
      matches: [
        { id: 'm1', date: '2026-10-05', opponent: 'Adversário', goals: [], ratings: { p1: 4 } },
        { id: 'm2', date: '2026-10-12', opponent: 'Outro', goals: [] }
      ]
    },
    {
      id: 'eq2',
      clubName: 'Clube Exemplo',
      category: 'Sub-15',
      season: '2026/2027',
      roster: [{ id: 'q1', name: 'Atleta Três', number: 3, positions: '', birthDate: null, active: true, notes: 'x' }]
    }
  ]
} as never);

describe('F3.2 — separar e juntar os dados privados', () => {
  it('one record per athlete and kind (only when it holds something) and one per game with ratings', () => {
    const recs = extractPrivateRecords(state);
    expect([...recs.keys()].sort()).toEqual([
      'mratings__eq1__m1',
      'pcontact__eq1__p1',
      'peval__eq1__p1',
      'pgoals__eq1__p1',
      'pnotes__eq1__p1',
      'pnotes__eq2__q1'
    ]);
    expect(recs.get('pcontact__eq1__p1')!.data).toEqual({
      id: 'p1',
      phone: '910000000',
      email: 'familia@exemplo.pt',
      emergencyContact: 'Mãe 920000000',
      height: '150',
      weight: '40',
      statusNote: 'entorse'
    });
    // The availability (no diagnosis) stays in the sport profile
    expect(recs.get('pcontact__eq1__p1')!.data).not.toHaveProperty('status');
  });

  it('joining the private records back gives exactly the same state (nothing lost, nothing added)', () => {
    const back = joinPrivate(stripPrivate(state), extractPrivateRecords(state));
    expect(JSON.stringify(extractRecords(back))).toBe(JSON.stringify(extractRecords(state)));
  });

  it('the state without private data keeps the whole sport profile and nothing private', () => {
    const clean = stripPrivate(state);
    const text = JSON.stringify(clean);
    for (const secret of ['910000000', 'entorse', 'nota interna', 'Melhorar o passe', 'Boa época', 'sprint20'])
      expect(text).not.toContain(secret);
    expect(clean.teams[0].matches[0]).not.toHaveProperty('ratings');
    const p1 = clean.teams[0].roster[0];
    expect(p1).toMatchObject({ name: 'Atleta Um', number: 7, status: 'lesionado', statusUntil: '2026-12-01' });
    expect(hasPrivateData(state)).toBe(true);
    expect(hasPrivateData(clean)).toBe(false);
  });

  it('every private field of the athlete is in exactly one kind', () => {
    const all = Object.values(PLAYER_PRIVATE_FIELDS).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('F3.2 — quem escreve e quem lê (igual às regras)', () => {
  const as = (orgRole?: string, orgId = 'org1') => ({ orgId, orgRole });
  it('kinds per role (D1–D8)', () => {
    expect(privateKindsFor(as('treinador'))).toEqual(['pcontact', 'peval', 'pnotes', 'pgoals', 'mratings']);
    expect(privateKindsFor(as('adjunto'))).toHaveLength(5);
    expect(privateKindsFor(as('owner'))).toEqual(['pcontact', 'peval', 'pgoals']);
    expect(privateKindsFor(as('diretor'))).toEqual(['pcontact']);
    expect(privateKindsFor(as('coordenador'))).toEqual(['peval', 'pgoals']);
    expect(privateKindsFor(as('staff'))).toEqual([]);
    // the old access (no organization) has no private data
    expect(privateKindsFor({ orgRole: 'treinador' })).toEqual([]);
  });
  it('everyone in the club reads them except staff', () => {
    expect(readsPrivateData(as('treinador'))).toBe(true);
    expect(readsPrivateData(as('diretor'))).toBe(true);
    expect(readsPrivateData(as('staff'))).toBe(false);
    expect(readsPrivateData(as(undefined))).toBe(false);
  });
});
