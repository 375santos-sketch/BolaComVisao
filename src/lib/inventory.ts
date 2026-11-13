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
  /** Public links switched on in the teams (calendar, coaches' calendar, assistant's plan, parents' live). */
  publicLinks: Record<string, number>;
  errors: string[];
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
function accountOf(doc: RawDoc, admins: Set<string>): InventoryAccount {
  const account = asMap(doc.data.account);
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
    createdAt: str(account.createdAt)
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
  liveToken: 'Jogo ao vivo para os pais'
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
    publicLinks,
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
export function workspaceIdsToRead(listed: string[], users: RawDoc[], invitations: RawDoc[]): string[] {
  const ids = new Set<string>([DEFAULT_WORKSPACE, ...listed]);
  users.forEach((u) => ids.add(workspaceOfClub(str(asMap(u.data.account).clubId) || null)));
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
