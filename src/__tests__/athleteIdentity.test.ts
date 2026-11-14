import { describe, expect, it } from 'vitest';
import { athleteIdOf, careerOf, copyForNewTeam, linkCandidates, linkToPerson } from '../lib/athleteIdentity';
import { Player, SquadProfile } from '../types';

// Fictitious data, only for this test
const player = (id: string, name: string, birthDate: string | null, athleteId?: string): Player =>
  ({ id, name, number: 7, positions: 'Médio', birthDate, active: true, ...(athleteId ? { athleteId } : {}) }) as Player;
const team = (id: string, category: string, season: string, roster: Player[], played: string[] = []): SquadProfile =>
  ({
    id,
    clubName: 'Clube Exemplo',
    category,
    season,
    roster,
    matches: played.map((pid, i) => ({
      id: `${id}_m${i}`,
      date: `${season.slice(0, 4)}-10-${10 + i}`,
      season,
      opponent: 'Adversário',
      type: 'campeonato',
      location: 'casa',
      finished: true,
      goalsFor: 1,
      goalsAgainst: 0,
      goals: [{ id: `g${i}`, minute: 10, scorerId: pid, scorerName: 'x', period: '1.ª parte' }],
      startingLineup: [pid],
      calledUp: [pid]
    })),
    trainings: [],
    schedule: [],
    tactics: [],
    tacticFormat: 7
  }) as unknown as SquadProfile;

describe('F4 — o atleta é a mesma pessoa de época para época', () => {
  it('copying a squad to the next season keeps the person (new id, same athlete)', () => {
    const rui = player('p1', 'Rui Exemplo', '2015-03-02');
    const copy = copyForNewTeam(rui, 'p9');
    expect(copy.id).toBe('p9');
    expect(athleteIdOf(copy)).toBe('p1');
    // and again the season after: still the same person
    expect(athleteIdOf(copyForNewTeam(copy, 'p20'))).toBe('p1');
  });

  it('the sheet shows the other seasons of the same person, most recent first', () => {
    const a = player('a', 'Rui Exemplo', '2015-03-02');
    const b = copyForNewTeam(a, 'b');
    const c = copyForNewTeam(b, 'c');
    const teams = [
      team('t24', 'Sub-9', '2024/2025', [a], ['a']),
      team('t25', 'Sub-10', '2025/2026', [b], ['b', 'b']),
      team('t26', 'Sub-11', '2026/2027', [c])
    ];
    const career = careerOf({ teams }, 't26', 'c');
    expect(career.map((l) => l.label)).toEqual(['Sub-10 · 2025/2026', 'Sub-9 · 2024/2025']);
  });

  it('old copies (before F4) are only suggested with the same name AND date of birth; joining needs the coach', () => {
    const old = player('old', 'Gonçalo Exemplo', '2014-05-01');
    const now = player('now', 'goncalo exemplo', '2014-05-01'); // copied before F4: no link
    const other = player('x', 'Gonçalo Exemplo', '2014-09-09'); // same name, another date: not suggested
    const teams = [team('t25', 'Sub-12', '2025/2026', [old, other]), team('t26', 'Sub-13', '2026/2027', [now])];
    expect(careerOf({ teams }, 't26', 'now')).toEqual([]);
    const candidates = linkCandidates({ teams }, 't26', 'now');
    expect(candidates.filter((c) => c.suggested).map((c) => c.playerId)).toEqual(['old']);
    expect(candidates.map((c) => c.playerId)).toContain('x'); // can still be chosen by hand
    // The coach confirms: from then on the history appears together, and it is no longer suggested
    const joined = [teams[0], { ...teams[1], roster: [linkToPerson(now, old)] }];
    expect(careerOf({ teams: joined }, 't26', 'now').map((l) => l.label)).toEqual(['Sub-12 · 2025/2026']);
    expect(linkCandidates({ teams: joined }, 't26', 'now').some((c) => c.playerId === 'old')).toBe(false);
  });
});
