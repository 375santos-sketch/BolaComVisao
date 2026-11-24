/**
 * F1.1a — Inventário da plataforma (só leitura).
 *
 * Turns what was read from Firestore into a summary for the platform Administrator: counts of everything and the
 * list of adult accounts. It never keeps athlete data: records are only counted (by kind and by team), and of the
 * shared club document it keeps only counts and field NAMES (for instance, whether it holds user accounts with an
 * email), never their values.
 *
 * Pure functions, no Firestore here: the reading is in services/inventoryReader.ts.
 */
import { canonicalJson } from './recordSync';

export const INVENTORY_FORMAT = 'bcv-inventario';
export const INVENTORY_VERSION = 1;

type Data = Record<string, unknown>;

/** One document as read: its id and its fields. */
export interface RawDoc {
  id: string;
  data: Data;
}

/** One club workspace as read (club_workspace/{id}, its records and the phones with notices). */
export interface RawWorkspace {
  id: string;
  /** The old single document club_workspace/{id} (null when it does not exist). */
  legacy: Data | null;
  records: RawDoc[];
  pushSubscriptions: RawDoc[];
  /** F3.2: the athletes' private records (club_workspace/{id}/private): only counted, never kept. */
  privateRecords?: RawDoc[];
  /** Why part of this workspace could not be read (shown, never hidden). */
  errors: string[];
}

export interface InventorySource {
  users: RawDoc[];
  /** uids in admins/{uid} (platform Administrators). */
  admins: string[];
  invitations: RawDoc[];
  workspaces: RawWorkspace[];
  /** Other collections, counted on the server (null = could not be counted). */
  collectionCounts: Record<string, number | null>;
  errors: string[];
}

/** An adult account: only what is needed to decide its place later (F1.8). Never the phone number. */
export interface InventoryAccount {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  /** The club in the account; null = none, so the rules place it in "main". */
  clubId: string | null;
  /** The workspace the account works in today (its club, or "main" when it has none). */
  workspace: string;
  assignedTeams: string[];
  teamRoles: number;
  platformAdmin: boolean;
  /** Registered with an invitation. */
  invited: boolean;
  createdAt: string;
  /**
   * How the document stores the account: in "account" (today's format), at the top of the document (an old
   * format), or nowhere (a document without account data). For the last two, `fields` lists the names of the
   * fields the document has (never their values), so the Administrator can find it in the Firebase console.
   */
  format: 'account' | 'antigo' | 'sem dados';
  fields: string[];
}

/** Users kept INSIDE a shared club document: how many and which fields they carry (names only, no values). */
export interface EmbeddedUsers {
  count: number;
  fields: Record<string, number>;
}

export interface SharedDocCheck {
  exists: boolean;
  /** Size of the document as JSON, in bytes (the limit of a Firestore document is about 1 MB). */
  bytes: number;
  users: EmbeddedUsers;
  invitations: number;
  teams: number;
  /** Staff contacts kept in the teams (adults, not accounts): counted only. */
  staffMembers: number;
}

export interface KindCount {
  live: number;
  deleted: number;
}

export interface TeamCount {
  teamId: string;
  label: string;
  live: number;
  byKind: Record<string, number>;
}

export interface InventoryWorkspace {
  id: string;
  /** Accounts that work in this workspace today. */
  accounts: number;
  mode: 'registos' | 'documento único' | 'vazio';
  /** The "club" record (records/club): the shared club document of the per-record format. */
  clubRecord: SharedDocCheck;
  /** The old single document club_workspace/{id}, kept as a backup after the migration. */
  legacyDoc: SharedDocCheck;
  records: { total: number; live: number; deleted: number; byKind: Record<string, KindCount>; unknownKind: number };
  teams: TeamCount[];
  pushSubscriptions: { phones: number; accounts: number };
  /** F3.2: the athletes' private records, counted by kind (live and deleted). */
  privateRecords: { live: number; deleted: number; byKind: Record<string, KindCount> };
  /** Public links switched on in the teams (calendar, coaches' calendar, assistant's plan, parents' live). */
  publicLinks: Record<string, number>;
  /** P0-03: signs of one team's data kept in another team (counts and team names only). */
  mixing: TeamMixingCheck;
  errors: string[];
}

/**
 * P0-03 — Escalões misturados: what the old change of team and the old schedule copy may have left in the data. Only
 * counts and team names (club · age group · season); never an athlete's or an opponent's name, never a date.
 */
export interface TeamMixingCheck {
  /** Where the teams' data was read: the per-record storage, the old single document, or nothing to read. */
  source: 'registos' | 'documento único' | 'nenhum';
  /** Teams listed in the club document. */
  knownTeams: number;
  /** Games and scheduled games with no team written in them (kept where they are; the app no longer moves them). */
  untagged: { match: number; schedule: number };
  /** Games and scheduled games saved in one team but written as another team's (copies made by the old rules). */
  inOtherTeam: {
    match: number;
    schedule: number;
    /** Of those, how many also exist in the team they belong to (a duplicate of the original). */
    duplicateOfOriginal: number;
    /** By the team that holds the copies. */
    byTeam: Record<string, number>;
  };
  /** Records (by kind) of a team that is not in the club's list of teams. */
  inUnknownTeam: Record<string, number>;
  /** The same game (same id) present in two or more teams. */
  sameGameInSeveralTeams: { match: number; schedule: number };
  /** Athletes (same athlete id) in two or more teams of the SAME season: possible copies, or playing up an age group. */
  athletesInTwoTeamsSameSeason: number;
  /** "sem sinais" when every count is 0. */
  verdict: 'sem sinais' | 'a verificar';
}

export interface Inventory {
  format: typeof INVENTORY_FORMAT;
  version: typeof INVENTORY_VERSION;
  generatedAt: string;
  accounts: {
    total: number;
    byStatus: Record<string, number>;
    byRole: Record<string, number>;
    byWorkspace: Record<string, number>;
    withoutClub: number;
    platformAdmins: number;
    /** Documents in users/ by format, and the field names found in those without "account" (never values). */
    byFormat: Record<string, number>;
    fieldsWithoutAccount: Record<string, number>;
    list: InventoryAccount[];
  };
  invitations: {
    total: number;
    byStatus: Record<string, number>;
    byClub: Record<string, number>;
    pendingExpired: number;
  };
  workspaces: InventoryWorkspace[];
  /** Answer to "does the shared club document hold user accounts?", per workspace. */
  sharedDocHoldsUsers: Array<{ workspace: string; clubRecord: number; legacyDoc: number }>;
  otherCollections: Record<string, number | null>;
  errors: string[];
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const asMap = (v: unknown): Data => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Data) : {});
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const bump = (map: Record<string, number>, key: string, by = 1) => {
  map[key] = (map[key] || 0) + by;
};
const sortedObject = <T>(map: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));

export const DEFAULT_WORKSPACE = 'main';

/** The workspace an account works in today: its club, or "main" when it has none (the rules' fallback). */
export const workspaceOfClub = (clubId: string | null | undefined): string =>
  clubId && clubId.trim() ? clubId.trim() : DEFAULT_WORKSPACE;

/** The account fields of a users/{uid} document (they live in "account"). */
const ACCOUNT_FIELDS = ['name', 'email', 'role', 'status', 'username'];

/** A date from a string or from milliseconds ("" when there is none). */
const dateOf = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' && v > 0 ? new Date(v).toISOString() : '';

function accountOf(doc: RawDoc, admins: Set<string>): InventoryAccount {
  const nested = asMap(doc.data.account);
  const hasNested = Object.keys(nested).length > 0;
  // An old format kept the account fields at the top of the document
  const flat = !hasNested && ACCOUNT_FIELDS.some((k) => typeof doc.data[k] === 'string');
  const account = hasNested ? nested : flat ? doc.data : {};
  const clubId = str(account.clubId) || null;
  return {
    uid: doc.id,
    name: str(account.name),
    email: str(account.email),
    role: str(account.role),
    status: str(account.status),
    clubId,
    workspace: workspaceOfClub(clubId),
    assignedTeams: asList(account.assignedTeams).filter((t): t is string => typeof t === 'string'),
    teamRoles: asList(account.teamRoles).length,
    platformAdmin: admins.has(doc.id),
    invited: Boolean(str(account.inviteCode)),
    createdAt: dateOf(account.createdAt) || dateOf(doc.data.createdAt),
    format: hasNested ? 'account' : flat ? 'antigo' : 'sem dados',
    fields: hasNested ? [] : Object.keys(doc.data).sort()
  };
}

/** Users kept inside a club document: their number and how many carry each field (no values). */
export function embeddedUsers(value: unknown): EmbeddedUsers {
  const list = asList(value);
  const fields: Record<string, number> = {};
  list.forEach((u) => Object.keys(asMap(u)).forEach((k) => bump(fields, k)));
  return { count: list.length, fields: sortedObject(fields) };
}

const PUBLIC_LINKS: Record<string, string> = {
  calendarToken: 'Calendário dos pais',
  coachCalendarToken: 'Calendário do treinador',
  planToken: 'Plano do adjunto',
  liveToken: 'Jogo ao vivo para os pais',
  newsletterToken: 'Resumo da semana para os pais'
};

/** Checks of a shared club document (counts and field names only). */
export function checkSharedDoc(state: Data | null, bytes: number): SharedDocCheck {
  if (!state)
    return { exists: false, bytes: 0, users: { count: 0, fields: {} }, invitations: 0, teams: 0, staffMembers: 0 };
  const teams = asList(state.teams);
  return {
    exists: true,
    bytes,
    users: embeddedUsers(state.users),
    invitations: asList(state.invitations).length,
    teams: teams.length,
    staffMembers: teams.reduce<number>((n, t) => n + asList(asMap(t).staffMembers).length, 0)
  };
}

const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value ?? null)).length;

const teamLabel = (team: Data) =>
  [str(team.clubName), str(team.category), str(team.season)].filter(Boolean).join(' · ') || str(team.id);

/** One game, scheduled game or athlete as found in the data: the team whose list holds it and its own fields. */
interface HeldItem {
  kind: 'match' | 'schedule' | 'player';
  holder: string;
  id: string;
  data: Data;
}

const MIXING_KINDS = ['match', 'schedule', 'player'] as const;
const LEGACY_LISTS: Record<HeldItem['kind'], string> = { match: 'matches', schedule: 'schedule', player: 'roster' };

/**
 * P0-03 — Counts the signs of escalões misturados in one club. Pure; reads only what the inventory already read (the
 * live records, or the old single document's teams when the club has no records yet).
 */
export function teamMixingOf(
  records: RawDoc[],
  legacyState: Data | null,
  clubLive: boolean,
  teams: Data[]
): TeamMixingCheck {
  const items: HeldItem[] = [];
  if (clubLive) {
    records.forEach((r) => {
      const kind = str(r.data.kind) as HeldItem['kind'];
      if (!MIXING_KINDS.includes(kind) || r.data.deleted === true) return;
      const data = asMap(r.data.data);
      items.push({ kind, holder: str(r.data.teamId), id: str(r.data.entityId) || str(data.id), data });
    });
  } else if (legacyState) {
    asList(legacyState.teams)
      .map(asMap)
      .forEach((t) =>
        MIXING_KINDS.forEach((kind) =>
          asList(t[LEGACY_LISTS[kind]])
            .map(asMap)
            .forEach((data) => items.push({ kind, holder: str(t.id), id: str(data.id), data }))
        )
      );
  }

  const known = new Map(teams.map((t) => [str(t.id), t] as const).filter(([id]) => Boolean(id)));
  const labelOf = (id: string) => (known.has(id) ? teamLabel(known.get(id)!) : id || '(sem equipa)');
  const check: TeamMixingCheck = {
    source: clubLive ? 'registos' : legacyState ? 'documento único' : 'nenhum',
    knownTeams: known.size,
    untagged: { match: 0, schedule: 0 },
    inOtherTeam: { match: 0, schedule: 0, duplicateOfOriginal: 0, byTeam: {} },
    inUnknownTeam: {},
    sameGameInSeveralTeams: { match: 0, schedule: 0 },
    athletesInTwoTeamsSameSeason: 0,
    verdict: 'sem sinais'
  };

  // Which teams hold each game (kind + id)
  const holders = new Map<string, Set<string>>();
  items.forEach((it) => {
    if (it.kind === 'player' || !it.id) return;
    const key = `${it.kind}|${it.id}`;
    (holders.get(key) || holders.set(key, new Set()).get(key)!).add(it.holder);
  });

  items.forEach((it) => {
    if (known.size > 0 && it.holder && !known.has(it.holder)) bump(check.inUnknownTeam, it.kind);
    if (it.kind === 'player') return;
    const writtenTeam = str(it.data.teamId);
    if (!writtenTeam) {
      check.untagged[it.kind] += 1;
    } else if (writtenTeam !== it.holder) {
      check.inOtherTeam[it.kind] += 1;
      bump(check.inOtherTeam.byTeam, labelOf(it.holder));
      if (holders.get(`${it.kind}|${it.id}`)?.has(writtenTeam)) check.inOtherTeam.duplicateOfOriginal += 1;
    }
  });
  holders.forEach((set, key) => {
    if (set.size > 1) check.sameGameInSeveralTeams[key.split('|')[0] as 'match' | 'schedule'] += 1;
  });

  // Athletes: the same person (athleteId, or the id before F4) in two teams of the same season
  const bySeason = new Map<string, Set<string>>();
  items.forEach((it) => {
    if (it.kind !== 'player') return;
    const person = str(it.data.athleteId) || it.id;
    const season = str(known.get(it.holder)?.season);
    if (!person || !season) return;
    const key = `${season}|${person}`;
    (bySeason.get(key) || bySeason.set(key, new Set()).get(key)!).add(it.holder);
  });
  bySeason.forEach((set) => {
    if (set.size > 1) check.athletesInTwoTeamsSameSeason += 1;
  });

  check.inOtherTeam.byTeam = sortedObject(check.inOtherTeam.byTeam);
  check.inUnknownTeam = sortedObject(check.inUnknownTeam);
  const signs =
    check.untagged.match +
    check.untagged.schedule +
    check.inOtherTeam.match +
    check.inOtherTeam.schedule +
    Object.values(check.inUnknownTeam).reduce((n, v) => n + v, 0) +
    check.sameGameInSeveralTeams.match +
    check.sameGameInSeveralTeams.schedule +
    check.athletesInTwoTeamsSameSeason;
  check.verdict = signs > 0 ? 'a verificar' : 'sem sinais';
  return check;
}

function summarizeWorkspace(ws: RawWorkspace, accounts: InventoryAccount[]): InventoryWorkspace {
  const clubDoc = ws.records.find((r) => r.id === 'club');
  const clubLive = clubDoc && clubDoc.data.deleted !== true ? clubDoc : null;
  const clubData = clubLive ? asMap(clubLive.data.data) : null;
  const legacyState = ws.legacy ? asMap(ws.legacy.state) : null;

  const byKind: Record<string, KindCount> = {};
  const byTeam = new Map<string, TeamCount>();
  let live = 0;
  let deleted = 0;
  let unknownKind = 0;
  ws.records.forEach((r) => {
    const kind = str(r.data.kind);
    if (!kind) {
      unknownKind += 1;
      return;
    }
    const isDeleted = r.data.deleted === true;
    const count = (byKind[kind] = byKind[kind] || { live: 0, deleted: 0 });
    if (isDeleted) {
      count.deleted += 1;
      deleted += 1;
      return;
    }
    count.live += 1;
    live += 1;
    if (kind === 'club') return;
    const teamId = str(r.data.teamId, '?');
    const team = byTeam.get(teamId) || { teamId, label: teamId, live: 0, byKind: {} };
    team.live += 1;
    bump(team.byKind, kind);
    byTeam.set(teamId, team);
  });

  // Team names (category · season) and the public links come from the club document in use
  const teamsSource = asList((clubData || legacyState || {}).teams).map(asMap);
  teamsSource.forEach((t) => {
    const id = str(t.id);
    if (!id) return;
    const team = byTeam.get(id) || { teamId: id, label: id, live: 0, byKind: {} };
    team.label = teamLabel(t);
    byTeam.set(id, team);
  });
  const publicLinks: Record<string, number> = {};
  Object.values(PUBLIC_LINKS).forEach((label) => (publicLinks[label] = 0));
  teamsSource.forEach((t) =>
    Object.entries(PUBLIC_LINKS).forEach(([field, label]) => {
      if (str(t[field])) bump(publicLinks, label);
    })
  );

  const privateByKind: Record<string, KindCount> = {};
  let privateLive = 0;
  (ws.privateRecords || []).forEach((r) => {
    const count = (privateByKind[str(r.data.kind, '?')] ||= { live: 0, deleted: 0 });
    if (r.data.deleted === true) count.deleted += 1;
    else {
      count.live += 1;
      privateLive += 1;
    }
  });

  const subscribers = new Set(ws.pushSubscriptions.map((s) => str(s.data.uid)).filter(Boolean));
  return {
    id: ws.id,
    accounts: accounts.filter((a) => a.workspace === ws.id).length,
    mode: clubLive ? 'registos' : ws.legacy ? 'documento único' : 'vazio',
    clubRecord: checkSharedDoc(clubData, clubLive ? jsonBytes(clubLive.data) : 0),
    legacyDoc: checkSharedDoc(legacyState, ws.legacy ? jsonBytes(ws.legacy) : 0),
    records: {
      total: ws.records.length,
      live,
      deleted,
      byKind: sortedObject(byKind),
      unknownKind
    },
    teams: [...byTeam.values()].sort((a, b) => a.label.localeCompare(b.label)),
    pushSubscriptions: { phones: ws.pushSubscriptions.length, accounts: subscribers.size },
    privateRecords: {
      live: privateLive,
      deleted: (ws.privateRecords || []).length - privateLive,
      byKind: sortedObject(privateByKind)
    },
    publicLinks,
    mixing: teamMixingOf(ws.records, legacyState, Boolean(clubLive), teamsSource),
    errors: ws.errors
  };
}

/** The inventory from what was read. `now` is passed in so the result can be tested. */
export function buildInventory(source: InventorySource, now: Date): Inventory {
  const admins = new Set(source.admins);
  const list = source.users
    .map((u) => accountOf(u, admins))
    .sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name, 'pt'));

  const byStatus: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  const byWorkspace: Record<string, number> = {};
  list.forEach((a) => {
    bump(byStatus, a.status || '(sem estado)');
    bump(byRole, a.role || '(sem papel)');
    bump(byWorkspace, a.workspace);
  });

  const invByStatus: Record<string, number> = {};
  const invByClub: Record<string, number> = {};
  let pendingExpired = 0;
  source.invitations.forEach((i) => {
    const status = str(i.data.status, '(sem estado)');
    bump(invByStatus, status);
    bump(invByClub, str(i.data.clubId, '(sem clube)'));
    const expiresAt = typeof i.data.expiresAt === 'number' ? i.data.expiresAt : 0;
    if (status === 'pending' && expiresAt && expiresAt < now.getTime()) pendingExpired += 1;
  });

  const workspaces = [...source.workspaces]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((ws) => summarizeWorkspace(ws, list));

  return {
    format: INVENTORY_FORMAT,
    version: INVENTORY_VERSION,
    generatedAt: now.toISOString(),
    accounts: {
      total: list.length,
      byStatus: sortedObject(byStatus),
      byRole: sortedObject(byRole),
      byWorkspace: sortedObject(byWorkspace),
      withoutClub: list.filter((a) => !a.clubId).length,
      platformAdmins: source.admins.length,
      byFormat: sortedObject(
        list.reduce<Record<string, number>>((m, a) => {
          bump(m, a.format);
          return m;
        }, {})
      ),
      fieldsWithoutAccount: sortedObject(
        list
          .filter((a) => a.format !== 'account')
          .reduce<Record<string, number>>((m, a) => {
            a.fields.forEach((f) => bump(m, f));
            return m;
          }, {})
      ),
      list
    },
    invitations: {
      total: source.invitations.length,
      byStatus: sortedObject(invByStatus),
      byClub: sortedObject(invByClub),
      pendingExpired
    },
    workspaces,
    sharedDocHoldsUsers: workspaces.map((w) => ({
      workspace: w.id,
      clubRecord: w.clubRecord.users.count,
      legacyDoc: w.legacyDoc.users.count
    })),
    otherCollections: sortedObject(source.collectionCounts),
    errors: source.errors
  };
}

/** The workspaces to read: those listed, plus the clubs named in accounts and invitations, plus "main". */
export function workspaceIdsToRead(
  listed: string[],
  users: RawDoc[],
  invitations: RawDoc[],
  orgIds: string[] = []
): string[] {
  // An organization's space may hold only records (no top document), so listing club_workspace does not show it
  const ids = new Set<string>([DEFAULT_WORKSPACE, ...listed, ...orgIds]);
  users.forEach((u) => {
    const account = asMap(u.data.account);
    ids.add(workspaceOfClub(str(account.clubId) || null));
    for (const org of [str(account.orgId), str(account.defaultOrgId)]) if (org) ids.add(org);
  });
  invitations.forEach((i) => {
    const club = str(i.data.clubId);
    if (club) ids.add(club);
  });
  return [...ids].sort();
}

/** SHA-256 (hex) of the inventory, over its canonical JSON (sorted keys): the same inventory, the same checksum. */
export async function inventoryChecksum(inventory: Inventory): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(inventory));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The downloaded file: the inventory and its checksum. */
export interface InventoryFile {
  format: typeof INVENTORY_FORMAT;
  version: typeof INVENTORY_VERSION;
  sha256: string;
  inventory: Inventory;
}

export async function inventoryFile(inventory: Inventory): Promise<InventoryFile> {
  return {
    format: INVENTORY_FORMAT,
    version: INVENTORY_VERSION,
    sha256: await inventoryChecksum(inventory),
    inventory
  };
}

/** Whether a downloaded file is intact (its checksum matches its content). */
export async function verifyInventoryFile(file: InventoryFile): Promise<boolean> {
  return file?.format === INVENTORY_FORMAT && (await inventoryChecksum(file.inventory)) === file.sha256;
}

// ---------- Time limit of each reading ----------

/** A reading of the cloud that does not answer within this time is given up (it never hangs the screen). */
export const READ_TIMEOUT_MS = 60_000;

export class ReadTimeoutError extends Error {
  code = 'timeout';
  constructor(label: string, ms: number) {
    super(`${label}: sem resposta do servidor ao fim de ${Math.round(ms / 1000)} s`);
  }
}

/** The promise, or a ReadTimeoutError when it takes longer than `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ReadTimeoutError(label, ms)), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

/** Plain words for why the cloud could not be read at all. */
export function serverProblemMessage(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const text = `${e?.code || ''} ${e?.message || ''}`;
  if (/resource-exhausted|quota/i.test(text)) {
    return 'A quota diária gratuita do Firestore está esgotada. Tente de novo amanhã (a quota renova-se às 8h00 em Portugal).';
  }
  if (/permission-denied/i.test(text)) {
    return 'A nuvem recusou a leitura: esta conta não está registada como Administrador da plataforma (coleção admins).';
  }
  if (e?.code === 'timeout') {
    return 'O servidor não respondeu. Causas prováveis: a quota diária gratuita do Firestore esgotada, ou a ligação à internet fraca. Tente de novo mais tarde, de preferência em Wi-Fi.';
  }
  return `Não foi possível ler a nuvem (${e?.code || e?.message || String(err)}).`;
}
