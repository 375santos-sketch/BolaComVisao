/**
 * F1.1b — Cópia de segurança cifrada da plataforma (only reads the cloud; the copy never leaves the device in clear).
 *
 * File ".bcvbak" (JSON): a header in clear (format, version, date, KDF with its salt, cipher with its IV) and the
 * encrypted content. Encryption: AES-GCM 256 with a key derived from the Administrator's passphrase
 * (PBKDF2-SHA-256, 600 000 iterations, random 16-byte salt, random 12-byte IV per file). The passphrase is never
 * stored nor sent. Inside the encrypted content there is a manifest: counts per collection and per record kind, the
 * SHA-256 of each document and of the whole set. The AES-GCM tag detects any change to the file.
 *
 * Pure functions (Web Crypto): no Firestore here. Reading is in services/backupReader.ts; restoring exists only
 * in the test tools (to the emulator), never in the app.
 */

export const BACKUP_FORMAT = 'bcvbak';
export const BACKUP_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
export const MIN_PASSPHRASE = 12;

/** One document of the copy: its full path ("users/abc", "club_workspace/main/records/club") and its fields. */
export interface BackupDoc {
  path: string;
  data: Record<string, unknown>;
}

export interface BackupManifest {
  createdAt: string;
  /** Number of documents per collection path pattern ("club_workspace/*\/records"). */
  collections: Record<string, number>;
  /** Number of records per kind, per club workspace. */
  recordKinds: Record<string, Record<string, number>>;
  /** SHA-256 of each document (path → hash of its canonical JSON). */
  documents: Record<string, string>;
  /** SHA-256 of the whole set (the sorted list of "path:hash"). */
  total: string;
  /** What could not be read (shown, never hidden). */
  errors: string[];
}

export interface BackupPayload {
  manifest: BackupManifest;
  documents: BackupDoc[];
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; length: 256; iv: string };
  /** Encrypted content (base64), with the AES-GCM tag at the end. */
  data: string;
}

// ---------- Encoding ----------

/**
 * JSON with sorted keys and without undefined values (the same rule as the sync's canonicalJson), so a document
 * has one hash whatever the key order. Kept here so this module has no dependency on the app's storage.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : canonicalJson(v))).join(',')}]`;
  const map = value as Record<string, unknown>;
  return `{${Object.keys(map)
    .filter((k) => map[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(map[k])}`)
    .join(',')}}`;
}

const toBase64 = (bytes: Uint8Array): string => {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
};
const fromBase64 = (text: string): Uint8Array => {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/**
 * Firestore values that are not plain JSON (a Timestamp) become a tagged object, so the copy is plain JSON and the
 * restore can put them back. The app stores plain JSON today; this only protects the copy if that changes.
 */
export function toPlainValue(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (Array.isArray(value)) return value.map(toPlainValue);
  if (typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof v.toMillis === 'function' && typeof v.seconds === 'number' && typeof v.nanoseconds === 'number') {
      return { __bcvTimestamp: { seconds: v.seconds, nanoseconds: v.nanoseconds } };
    }
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, x]) => [k, toPlainValue(x)]));
  }
  return value;
}

// ---------- Manifest ----------

/** "club_workspace/main/records/club" → "club_workspace/*\/records" (ids replaced by *). */
export function collectionPattern(path: string): string {
  const parts = path.split('/');
  return parts
    .slice(0, -1)
    .map((p, i) => (i % 2 === 1 ? '*' : p))
    .join('/');
}

export async function buildManifest(documents: BackupDoc[], createdAt: string, errors: string[] = []) {
  const collections: Record<string, number> = {};
  const recordKinds: Record<string, Record<string, number>> = {};
  const hashes: Record<string, string> = {};
  for (const d of [...documents].sort((a, b) => a.path.localeCompare(b.path))) {
    const pattern = collectionPattern(d.path);
    collections[pattern] = (collections[pattern] || 0) + 1;
    const m = /^club_workspace\/([^/]+)\/records\//.exec(d.path);
    if (m) {
      const kind = typeof d.data.kind === 'string' ? d.data.kind : '(sem tipo)';
      const ws = (recordKinds[m[1]] = recordKinds[m[1]] || {});
      ws[kind] = (ws[kind] || 0) + 1;
    }
    hashes[d.path] = await sha256Hex(canonicalJson(d.data));
  }
  const total = await sha256Hex(
    Object.keys(hashes)
      .sort()
      .map((p) => `${p}:${hashes[p]}`)
      .join('\n')
  );
  return { createdAt, collections, recordKinds, documents: hashes, total, errors } satisfies BackupManifest;
}

// ---------- Encryption ----------

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveKey'
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** A passphrase is accepted from 12 characters, and the confirmation must match. */
export function passphraseProblem(passphrase: string, confirmation?: string): string | null {
  if (passphrase.length < MIN_PASSPHRASE) return `A frase-passe tem de ter pelo menos ${MIN_PASSPHRASE} caracteres.`;
  if (confirmation !== undefined && confirmation !== passphrase) return 'As duas frases-passe não são iguais.';
  return null;
}

/** Encrypts a payload into a file (exported for the tests; the app uses createBackupFile). */
export async function sealPayload(payload: BackupPayload, passphrase: string, iterations: number): Promise<BackupFile> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);
  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(payload))
  );
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: payload.manifest.createdAt,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toBase64(salt) },
    cipher: { name: 'AES-GCM', length: 256, iv: toBase64(iv) },
    data: toBase64(new Uint8Array(cipherText))
  };
}

/** The encrypted copy of these documents. `iterations` can only be lowered in tests. */
export async function createBackupFile(
  documents: BackupDoc[],
  passphrase: string,
  options: { now?: Date; errors?: string[]; iterations?: number } = {}
): Promise<BackupFile> {
  const problem = passphraseProblem(passphrase);
  if (problem) throw new Error(problem);
  const createdAt = (options.now || new Date()).toISOString();
  const plain = documents.map((d) => ({ path: d.path, data: toPlainValue(d.data) as Record<string, unknown> }));
  const payload: BackupPayload = { manifest: await buildManifest(plain, createdAt, options.errors), documents: plain };
  return sealPayload(payload, passphrase, options.iterations ?? PBKDF2_ITERATIONS);
}

export type VerifyResult =
  { ok: true; payload: BackupPayload; documents: number } | { ok: false; reason: string; payload?: BackupPayload };

/** Opens a copy: decrypts it and checks every document against the manifest. Nothing is written anywhere. */
export async function openBackupFile(file: unknown, passphrase: string): Promise<VerifyResult> {
  const f = file as BackupFile;
  if (!f || f.format !== BACKUP_FORMAT || f.version !== BACKUP_VERSION || !f.kdf || !f.cipher || !f.data) {
    return { ok: false, reason: 'Este ficheiro não é uma cópia cifrada do BolaComVisão.' };
  }
  let payload: BackupPayload;
  try {
    const key = await deriveKey(passphrase, fromBase64(f.kdf.salt), f.kdf.iterations);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(f.cipher.iv) as BufferSource },
      key,
      fromBase64(f.data) as BufferSource
    );
    payload = JSON.parse(new TextDecoder().decode(plain)) as BackupPayload;
  } catch {
    return { ok: false, reason: 'Frase-passe errada ou ficheiro alterado: não foi possível abrir a cópia.' };
  }
  const check = await buildManifest(payload.documents, payload.manifest.createdAt, payload.manifest.errors);
  if (check.total !== payload.manifest.total || canonicalJson(check) !== canonicalJson(payload.manifest)) {
    return { ok: false, reason: 'O conteúdo não confere com o manifesto.', payload };
  }
  return { ok: true, payload, documents: payload.documents.length };
}
