import { describe, it, expect } from 'vitest';
import {
  extractRecords,
  assembleState,
  mergeRecords,
  pendingRecordIds,
  buildCloudWrite,
  recordDocId,
  canonicalJson,
  hashData,
  CLUB_DOC_ID,
  CloudRecord,
  LocalRecord,
  SyncedHashes
} from '../lib/recordSync';
import { normalizeClubState } from '../lib/storage';
import { AppState, Match, Player } from '../types';

const player = (id: string, name: string): Player => ({
  id,
  name,
  number: 1,
  positions: '',
  birthDate: null,
  active: true
});
const match = (id: string, opponent: string, date = '2026-10-17'): Match =>
  ({
    id,
    teamId: 'sub11',
    opponent,
    date,
    season: '2026/2027',
    type: 'campeonato',
    location: 'casa',
    finished: true,
    goals: [],
    subs: [],
    lineup: [],
    capitao: null
  }) as Match;

const baseState = (): AppState =>
  normalizeClubState({
    activeTeamId: 'sub11',
    version: 2,
    myClubName: 'Dragões',
    roster: [player('p1', 'Rui'), player('p2', 'Tomás')],
    matches: [match('m1', 'Esparteiros', '2026-10-10'), match('m2', 'Tramagal SU')],
    teams: [
      {
        id: 'sub11',
        clubName: 'Dragões',
        category: 'Sub-11',
        season: '2026/2027',
        roster: [player('p1', 'Rui'), player('p2', 'Tomás')],
        matches: [match('m1', 'Esparteiros', '2026-10-10'), match('m2', 'Tramagal SU')]
      } as any
    ]
  });

const toCloud = (records: Map<string, LocalRecord>, updatedAt = 1000): Map<string, CloudRecord> =>
  new Map([...records].map(([id, r]) => [id, { ...r, updatedAt, deleted: false }]));
const syncedFrom = (records: Map<string, LocalRecord>): SyncedHashes =>
  Object.fromEntries([...records].map(([id, r]) => [id, hashData(r.data)]));
const withMatch = (state: AppState, m: Match): AppState => {
  const matches = state.matches.map((x) => (x.id === m.id ? m : x));
  if (!matches.some((x) => x.id === m.id)) matches.push(m);
  return normalizeClubState({ ...state, matches, teams: state.teams.map((t) => ({ ...t, matches })) });
};
const withoutMatch = (state: AppState, id: string): AppState => {
  const matches = state.matches.filter((x) => x.id !== id);
  return normalizeClubState({ ...state, matches, teams: state.teams.map((t) => ({ ...t, matches })) });
};
const mid = (id: string) => recordDocId('match', 'sub11', id);

describe('Registos separados — conversão', () => {
  it('splits the state into one record per entity plus the club record', () => {
    const records = extractRecords(baseState());
    expect([...records.keys()].sort()).toEqual(
      [
        CLUB_DOC_ID,
        mid('m1'),
        mid('m2'),
        recordDocId('player', 'sub11', 'p1'),
        recordDocId('player', 'sub11', 'p2')
      ].sort()
    );
    const club = records.get(CLUB_DOC_ID)!.data as any;
    expect(club.matches).toBeUndefined();
    expect(club.teams[0].matches).toBeUndefined();
    expect(club.currentUser).toBeUndefined();
    expect(club.myClubName).toBe('Dragões');
  });

  it('rebuilds the same state from its records (round trip is stable)', () => {
    const state = baseState();
    const records = extractRecords(state);
    const rebuilt = assembleState(records, state);
    expect(rebuilt.matches.map((m) => m.opponent)).toEqual(['Esparteiros', 'Tramagal SU']);
    expect(rebuilt.roster.map((p) => p.name)).toEqual(['Rui', 'Tomás']);
    // Re-extracting gives identical records → no spurious writes
    const again = extractRecords(rebuilt);
    expect(pendingRecordIds(again, syncedFrom(records))).toEqual([]);
  });

  it('keeps device-only fields (signed-in user) when rebuilding from the cloud', () => {
    const state = { ...baseState(), currentUser: { id: 'u1' } as any };
    const rebuilt = assembleState(extractRecords(baseState()), state);
    expect(rebuilt.currentUser?.id).toBe('u1');
  });

  it('produces Firestore-safe document ids', () => {
    expect(recordDocId('match', 'team_dragons_sub11', 'abc-123')).toBe('match__team_dragons_sub11__abc-123');
    const odd = recordDocId('player', 'equipa à', 'id/com espaços');
    expect(odd).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(odd.length).toBeLessThanOrEqual(128);
  });

  it('hashes ignore key order and undefined values', () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: 2 } })).toBe('{"a":{"c":2},"b":1}');
    expect(hashData({ a: 1, b: 2 })).toBe(hashData({ b: 2, a: 1 }));
  });
});

describe('Registos separados — fusão (merge a três vias)', () => {
  it('two coaches editing different matches: both changes survive', () => {
    const start = extractRecords(baseState());
    const synced = syncedFrom(start);

    // Coach A (this device) edits m1; coach B already saved an edit to m2 in the cloud
    const local = extractRecords(withMatch(baseState(), { ...match('m1', 'Esparteiros', '2026-10-10'), notes: 'A' }));
    const remote = toCloud(start);
    remote.set(mid('m2'), {
      ...remote.get(mid('m2'))!,
      data: { ...match('m2', 'Tramagal SU'), notes: 'B' } as any,
      updatedAt: 2000
    });

    const res = mergeRecords({ local, remote, synced, knownTeamIds: new Set(['sub11']), localMutationAt: 1500 });
    expect((res.records.get(mid('m1'))!.data as any).notes).toBe('A');
    expect((res.records.get(mid('m2'))!.data as any).notes).toBe('B');
    expect(res.toPush).toEqual([mid('m1')]);
    expect(res.changedLocally).toBe(true);
  });

  it('a match recorded offline is kept and sent (the cloud copy is older)', () => {
    const start = extractRecords(baseState());
    const local = extractRecords(withMatch(baseState(), match('m3', 'Ouriense', '2026-10-24')));
    const res = mergeRecords({
      local,
      remote: toCloud(start),
      synced: syncedFrom(start),
      knownTeamIds: new Set(['sub11']),
      localMutationAt: 5000
    });
    expect(res.records.has(mid('m3'))).toBe(true);
    expect(res.toPush).toContain(mid('m3'));
  });

  it('a match deleted on another device disappears here', () => {
    const start = extractRecords(baseState());
    const remote = toCloud(start);
    remote.set(mid('m1'), { ...remote.get(mid('m1'))!, deleted: true, data: {}, updatedAt: 3000 });
    const res = mergeRecords({
      local: start,
      remote,
      synced: syncedFrom(start),
      knownTeamIds: new Set(['sub11']),
      localMutationAt: 1000
    });
    expect(res.records.has(mid('m1'))).toBe(false);
    expect(res.synced[mid('m1')]).toBeUndefined();
    expect(res.toPush).toEqual([]);
  });

  it('a match deleted here is sent as a tombstone, and the club document is never deleted', () => {
    const start = extractRecords(baseState());
    const local = extractRecords(withoutMatch(baseState(), 'm1'));
    const res = mergeRecords({
      local,
      remote: toCloud(start),
      synced: syncedFrom(start),
      knownTeamIds: new Set(['sub11']),
      localMutationAt: 5000
    });
    expect(res.toPush).toEqual([mid('m1')]);
    const write = buildCloudWrite(mid('m1'), local, start.get(mid('m1')), 6000, 'u1');
    expect(write).toMatchObject({ deleted: true, kind: 'match', teamId: 'sub11', entityId: 'm1', updatedBy: 'u1' });
    expect(buildCloudWrite(CLUB_DOC_ID, new Map(), start.get(CLUB_DOC_ID), 6000)).toBeNull();
  });

  it('same record changed on both sides: the newer change wins', () => {
    const start = extractRecords(baseState());
    const local = extractRecords(withMatch(baseState(), { ...match('m2', 'Tramagal SU'), notes: 'local' }));
    const remote = toCloud(start);
    remote.set(mid('m2'), {
      ...remote.get(mid('m2'))!,
      data: { ...match('m2', 'Tramagal SU'), notes: 'cloud' } as any,
      updatedAt: 9000
    });
    const args = { local, remote, synced: syncedFrom(start), knownTeamIds: new Set(['sub11']) };
    expect((mergeRecords({ ...args, localMutationAt: 5000 }).records.get(mid('m2'))!.data as any).notes).toBe('cloud');
    expect((mergeRecords({ ...args, localMutationAt: 9500 }).records.get(mid('m2'))!.data as any).notes).toBe('local');
  });

  it('first sync on a device with stale data takes the cloud version', () => {
    const cloudState = withMatch(baseState(), { ...match('m2', 'Tramagal SU'), notes: 'final' });
    const res = mergeRecords({
      local: extractRecords(baseState()),
      remote: toCloud(extractRecords(cloudState), 9000),
      synced: {},
      knownTeamIds: new Set(['sub11']),
      localMutationAt: 1000
    });
    expect((res.records.get(mid('m2'))!.data as any).notes).toBe('final');
    expect(res.toPush).toEqual([]);
  });

  it('first upload (migration): everything local is pending, nothing is lost', () => {
    const local = extractRecords(baseState());
    const res = mergeRecords({
      local,
      remote: new Map(),
      synced: {},
      knownTeamIds: new Set(['sub11']),
      localMutationAt: 1
    });
    expect(res.toPush.sort()).toEqual([...local.keys()].sort());
    expect(pendingRecordIds(local, {}).length).toBe(local.size);
  });

  it('leaves records of teams this device does not know yet untouched', () => {
    const start = extractRecords(baseState());
    const remote = toCloud(start);
    const foreignId = recordDocId('match', 'sub13', 'x1');
    remote.set(foreignId, {
      kind: 'match',
      teamId: 'sub13',
      entityId: 'x1',
      data: { id: 'x1' },
      updatedAt: 1,
      deleted: false
    });
    const res = mergeRecords({
      local: start,
      remote,
      synced: syncedFrom(start),
      knownTeamIds: new Set(['sub11']),
      localMutationAt: 1
    });
    expect(res.toPush).toEqual([]);
    expect(res.synced[foreignId]).toBeUndefined();
  });

  it('applying a merge and re-extracting produces no new pending writes', () => {
    const start = extractRecords(baseState());
    const remote = toCloud(start);
    remote.set(mid('m2'), {
      ...remote.get(mid('m2'))!,
      data: { ...match('m2', 'Tramagal SU'), notes: 'B' } as any,
      updatedAt: 2000
    });
    const res = mergeRecords({
      local: start,
      remote,
      synced: syncedFrom(start),
      knownTeamIds: new Set(['sub11']),
      localMutationAt: 1
    });
    const state = assembleState(res.records, baseState());
    expect(state.matches.find((m) => m.id === 'm2')?.notes).toBe('B');
    expect(pendingRecordIds(extractRecords(state), res.synced)).toEqual([]);
  });
});

describe('Registos separados — estado completo', () => {
  it('round trip is stable with trainings, schedule, staff messages and scouting reports', () => {
    const trainings = [
      { id: 't1', date: '2026-10-14', notes: 'x', absences: ['p2'], completed: true },
      { id: 't2', date: '2026-10-16', notes: '', absences: [] }
    ] as any;
    const state = normalizeClubState({
      ...baseState(),
      trainings,
      schedule: [
        {
          id: 's1',
          opponent: 'Ouriense',
          date: '2026-10-24',
          time: '10:00',
          location: 'casa',
          type: 'campeonato',
          callup: []
        }
      ] as any,
      staffMessages: [{ id: 'msg1', senderId: 'u', text: 'olá', createdAt: 1 }] as any,
      opponentScouting: [{ id: 'sc1', opponentName: 'Ouriense', updatedAt: 1 }] as any,
      teams: baseState().teams.map((t) => ({ ...t, trainings }))
    });
    const records = extractRecords(state);
    expect(new Set([...records.values()].map((r) => r.kind))).toEqual(
      new Set(['club', 'player', 'match', 'training', 'schedule', 'message', 'scouting'])
    );
    const rebuilt = assembleState(records, state);
    expect(pendingRecordIds(extractRecords(rebuilt), syncedFrom(records))).toEqual([]);
  });
});
