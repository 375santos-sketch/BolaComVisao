/**
 * Test tools for the emulator only (never part of the app): read every document, and restore an encrypted copy
 * (F1.1b). Everything here talks to the local emulator with its admin access.
 */
import { FIRESTORE, owner, PASSWORD } from './seed';

const AUTH = 'http://127.0.0.1:9099';
export const PLATFORM_ADMIN = 'admin.plataforma@clube.pt';

type RestValue = Record<string, any>;

/** Firestore REST value → plain JSON (as the app's SDK returns it). */
export function fromRest(v: RestValue): unknown {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) {
    const ms = Date.parse(v.timestampValue);
    const nanos = Number((/\.(\d+)Z$/.exec(v.timestampValue)?.[1] || '0').padEnd(9, '0'));
    return { __bcvTimestamp: { seconds: Math.floor(ms / 1000), nanoseconds: nanos } };
  }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromRest);
  if ('mapValue' in v)
    return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromRest(x as RestValue)]));
  throw new Error(`valor do Firestore não suportado: ${JSON.stringify(v)}`);
}

/** Plain JSON → Firestore REST value (the way the app's SDK stores it: whole numbers as integers). */
export function toRest(v: unknown): RestValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toRest) } };
  const ts = (v as { __bcvTimestamp?: { seconds: number; nanoseconds: number } }).__bcvTimestamp;
  if (ts) {
    const iso = new Date(ts.seconds * 1000).toISOString().replace(/\.\d+Z$/, '');
    return { timestampValue: `${iso}.${String(ts.nanoseconds).padStart(9, '0')}Z` };
  }
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, toRest(x)]))
    }
  };
}

export interface StoredDoc {
  updateTime: string;
  data: Record<string, unknown> | null;
}

/** Every document in the emulator (path → update time and fields), walking all collections. */
export async function readWholeDatabase(): Promise<Map<string, StoredDoc>> {
  const all = new Map<string, StoredDoc>();
  const collectionsOf = async (parent: string): Promise<string[]> => {
    const res = await fetch(`${parent}:listCollectionIds`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ pageSize: 500 })
    });
    return ((await res.json()) as { collectionIds?: string[] }).collectionIds || [];
  };
  const walk = async (parent: string) => {
    for (const id of await collectionsOf(parent)) {
      let pageToken = '';
      do {
        const res = await fetch(
          `${parent}/${id}?pageSize=300&showMissing=true${pageToken ? `&pageToken=${pageToken}` : ''}`,
          { headers: owner }
        );
        const body = (await res.json()) as {
          documents?: Array<{ name: string; updateTime?: string; fields?: Record<string, RestValue> }>;
          nextPageToken?: string;
        };
        for (const d of body.documents || []) {
          const path = d.name.split('/documents/')[1];
          all.set(path, {
            updateTime: d.updateTime || '(sem documento)',
            data: d.updateTime ? (fromRest({ mapValue: { fields: d.fields || {} } }) as Record<string, unknown>) : null
          });
          await walk(`${FIRESTORE}/${path}`);
        }
        pageToken = body.nextPageToken || '';
      } while (pageToken);
    }
  };
  await walk(FIRESTORE);
  return all;
}

/** Deletes every document of the emulator (the accounts in the auth emulator stay). */
export async function wipeEmulatorDatabase() {
  const [project, database] = /projects\/([^/]+)\/databases\/([^/]+)\//.exec(`${FIRESTORE}/`)!.slice(1);
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${project}/databases/${database}/documents`, {
    method: 'DELETE'
  });
}

/** Writes the documents of an opened copy into the emulator (admin access). ONLY for the emulator. */
export async function restoreToEmulator(documents: Array<{ path: string; data: Record<string, unknown> }>) {
  if (!FIRESTORE.startsWith('http://127.0.0.1:')) throw new Error('O restauro só existe para o emulador.');
  for (const d of documents) {
    const res = await fetch(`${FIRESTORE}/${d.path}`, {
      method: 'PATCH',
      headers: owner,
      body: JSON.stringify({ fields: toRest(d.data).mapValue.fields })
    });
    if (!res.ok) throw new Error(`restauro ${d.path}: ${res.status} ${await res.text()}`);
  }
}

/** A platform Administrator (admins/{uid}) for the tests; created once, then reused. */
export async function ensurePlatformAdmin(): Promise<string> {
  const call = (op: string) =>
    fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:${op}?key=fake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PLATFORM_ADMIN, password: PASSWORD, returnSecureToken: true })
    }).then((r) => r.json() as Promise<{ localId?: string }>);
  const uid = (await call('signUp')).localId || (await call('signInWithPassword')).localId!;
  const s = (v: string) => ({ stringValue: v });
  const exists = await fetch(`${FIRESTORE}/admins/${uid}`, { headers: owner });
  if (exists.ok) return uid;
  await fetch(`${FIRESTORE}/users/${uid}`, {
    method: 'PATCH',
    headers: owner,
    body: JSON.stringify({
      fields: {
        account: {
          mapValue: {
            fields: {
              id: s(uid),
              username: s('admin.plataforma'),
              email: s(PLATFORM_ADMIN),
              name: s('Administrador P'),
              role: s('Administrador'),
              status: s('approved'),
              clubId: s('clubA'),
              assignedTeams: { arrayValue: { values: [s('all')] } },
              createdAt: s('2026-09-01T00:00:00Z')
            }
          }
        }
      }
    })
  });
  await fetch(`${FIRESTORE}/admins/${uid}`, {
    method: 'PATCH',
    headers: owner,
    body: JSON.stringify({ fields: { email: s(PLATFORM_ADMIN) } })
  });
  return uid;
}
