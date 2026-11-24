import { AppState, Match, Player, SquadProfile } from '../types';
import { PRIVATE_KINDS, PrivateKind, extractPrivateRecords } from './privateRecords';
import { canonicalJson } from './recordSync';

/**
 * P0-05 · F3.3 — Read-only check that the private copies (club_workspace/{club}/private) match what the sport
 * profile (records/player and records/match) holds, club by club. Works on the documents of an encrypted copy, so it
 * never reads the real database. The report holds only numbers and club ids: no names, contacts or notes. Pure.
 */

export interface CheckDoc {
  path: string;
  data: Record<string, unknown>;
}

export interface KindCount {
  expected: number;
  equal: number;
  missing: number;
  different: number;
}

export interface ClubCheck {
  club: string;
  /** Whether the double writing is switched on for this club (system/dadosPrivados.clubesLigados). */
  linked: boolean;
  athletes: number;
  games: number;
  /** Private records the sport profile implies (one per athlete and kind with something in it, one per rated game). */
  expected: number;
  equal: number;
  missing: number;
  different: number;
  /** Private records with no counterpart in the sport profile (athlete or game gone, or field emptied). */
  extra: number;
  byKind: Record<PrivateKind, KindCount>;
}

export interface PrivateCheckReport {
  clubs: ClubCheck[];
  linkedClubs: number;
  /** Every linked club has every expected private record, equal to the sport profile. */
  ok: boolean;
}

const emptyKinds = (): Record<PrivateKind, KindCount> =>
  Object.fromEntries(PRIVATE_KINDS.map((k) => [k, { expected: 0, equal: 0, missing: 0, different: 0 }])) as Record<
    PrivateKind,
    KindCount
  >;

const live = (d: Record<string, unknown>) => d.deleted !== true;

/** Splits "club_workspace/{club}/{sub}/{id}" (only those two-level documents). */
function parse(path: string): { club: string; sub: string; id: string } | null {
  const parts = path.split('/');
  if (parts.length !== 4 || parts[0] !== 'club_workspace') return null;
  return { club: parts[1], sub: parts[2], id: parts[3] };
}

export function checkPrivateCopies(docs: CheckDoc[]): PrivateCheckReport {
  const switchDoc = docs.find((d) => d.path === 'system/dadosPrivados')?.data;
  const linkedList = Array.isArray(switchDoc?.clubesLigados) ? (switchDoc.clubesLigados as unknown[]) : [];
  const linked = new Set(linkedList.filter((c): c is string => typeof c === 'string'));

  const byClub = new Map<
    string,
    { teams: Map<string, { roster: Player[]; matches: Match[] }>; privates: Map<string, unknown> }
  >();
  const club = (id: string) => {
    if (!byClub.has(id)) byClub.set(id, { teams: new Map(), privates: new Map() });
    return byClub.get(id)!;
  };

  for (const d of docs) {
    const at = parse(d.path);
    if (!at || !live(d.data)) continue;
    if (at.sub === 'private') {
      club(at.club).privates.set(at.id, d.data.data);
      continue;
    }
    if (at.sub !== 'records') continue;
    const kind = d.data.kind;
    if (kind !== 'player' && kind !== 'match') continue;
    const teamId = String(d.data.teamId ?? '');
    const data = d.data.data as Record<string, unknown> | undefined;
    if (!teamId || !data) continue;
    const teams = club(at.club).teams;
    if (!teams.has(teamId)) teams.set(teamId, { roster: [], matches: [] });
    if (kind === 'player') teams.get(teamId)!.roster.push(data as unknown as Player);
    else teams.get(teamId)!.matches.push(data as unknown as Match);
  }

  linked.forEach((id) => club(id)); // a linked club with nothing in the copy still shows (with zeros)
  const clubs: ClubCheck[] = [...byClub.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, c]) => {
      const state = {
        teams: [...c.teams.entries()].map(([teamId, t]) => ({ id: teamId, ...t }) as unknown as SquadProfile)
      } as AppState;
      const expected = extractPrivateRecords(state);
      const byKind = emptyKinds();
      let equal = 0;
      let missing = 0;
      let different = 0;
      expected.forEach((rec, docId) => {
        const k = byKind[rec.kind as unknown as PrivateKind];
        k.expected++;
        if (!c.privates.has(docId)) {
          k.missing++;
          missing++;
        } else if (canonicalJson(c.privates.get(docId)) !== canonicalJson(rec.data)) {
          k.different++;
          different++;
        } else {
          k.equal++;
          equal++;
        }
      });
      const extra = [...c.privates.keys()].filter((k) => !expected.has(k)).length;
      const teams = [...c.teams.values()];
      return {
        club: id,
        linked: linked.has(id),
        athletes: teams.reduce((n, t) => n + t.roster.length, 0),
        games: teams.reduce((n, t) => n + t.matches.length, 0),
        expected: expected.size,
        equal,
        missing,
        different,
        extra,
        byKind
      };
    });

  const linkedChecks = clubs.filter((c) => c.linked);
  return {
    clubs,
    linkedClubs: linkedChecks.length,
    ok: linkedChecks.every((c) => c.missing === 0 && c.different === 0)
  };
}
