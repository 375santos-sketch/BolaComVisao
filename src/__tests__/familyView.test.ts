import { describe, expect, it } from 'vitest';
import { activeInvites, canInviteGuardians, canInviteMore, familyViewOf, inviteMessage } from '../lib/familyView';
import { normalizeClubState } from '../lib/storage';

// Fictitious data, only for this test
const today = new Date('2026-11-16T10:00:00Z');
const state = normalizeClubState({
  activeTeamId: 'eq1',
  myClubName: 'Clube Exemplo',
  category: 'Sub-11',
  season: '2026/2027',
  roster: [
    {
      id: 'p1',
      name: 'Atleta Um',
      number: 7,
      positions: '',
      birthDate: null,
      active: true,
      coachNotes: 'NOTA INTERNA',
      phone: '910000000',
      seasonMessages: { '2026/2027': 'Grande época!' }
    },
    { id: 'p2', name: 'Atleta Dois', number: 8, positions: '', birthDate: null, active: true }
  ],
  trainings: [
    { id: 't1', date: '2026-11-10', notes: '', absences: ['p1'], season: '2026/2027' },
    { id: 't2', date: '2026-11-12', notes: '', absences: [], season: '2026/2027' },
    { id: 't3', date: '2026-11-18', notes: '', absences: [], season: '2026/2027' }
  ],
  schedule: [
    {
      id: 'g1',
      opponent: 'Adversário',
      date: '2026-11-22',
      time: '10:00',
      type: 'Campeonato',
      location: 'casa',
      callup: ['p2'],
      callupFinalized: true
    }
  ]
} as never);

describe('E1 — página do educando', () => {
  it('shows only what the family may see', () => {
    const v = familyViewOf(state, state.roster[0], today);
    expect(v).toMatchObject({ athleteName: 'Atleta Um', clubName: 'Clube Exemplo', seasonMessage: 'Grande época!' });
    expect(v.trainings).toEqual({ attended: 1, total: 2 }); // the future training does not count
    expect(v.next.map((e) => e.kind)).toEqual(['treino', 'jogo']);
    expect(v.next.find((e) => e.kind === 'jogo')?.calledUp).toBe(false); // only THIS child's call-up
    const raw = JSON.stringify(v);
    for (const secret of ['NOTA INTERNA', '910000000', 'Atleta Dois', 'p2']) expect(raw).not.toContain(secret);
  });

  it('at most 2 guardians per athlete; expired invitations free the place', () => {
    const inv = (status: string, expiresAt = 2e12) => ({ athleteId: 'p1', status, expiresAt }) as never;
    expect(canInviteMore([inv('accepted'), inv('pending')], 'p1', 1e12)).toBe(false);
    expect(canInviteMore([inv('accepted'), inv('pending', 1)], 'p1', 1e12)).toBe(true);
    expect(canInviteMore([inv('accepted'), inv('revoked')], 'p1', 1e12)).toBe(true);
    expect(activeInvites([inv('left')], 1e12)).toEqual([]);
  });

  it('who invites: the coach or the director (and who manages the club)', () => {
    expect(canInviteGuardians({ orgId: 'o', orgRole: 'treinador' })).toBe(true);
    expect(canInviteGuardians({ orgId: 'o', orgRole: 'diretor' })).toBe(true);
    expect(canInviteGuardians({ orgId: 'o', orgRole: 'adjunto' })).toBe(false);
    expect(canInviteGuardians({ orgId: 'o', orgRole: 'staff' })).toBe(false);
    expect(canInviteGuardians({ orgId: 'o', orgRole: 'coordenador' })).toBe(false);
  });

  it('the WhatsApp message carries the link with the code', () => {
    expect(
      inviteMessage({ id: 'abc', athleteName: 'Atleta Um', clubName: 'Clube Exemplo' }, 'https://app.exemplo')
    ).toContain('https://app.exemplo/encarregado?c=abc');
  });
});
