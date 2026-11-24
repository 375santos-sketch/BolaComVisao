/**
 * P1-04 — the restore rehearsal itself: open an encrypted copy, restore it into an EMPTY local emulator and compare
 * everything with the copy. Used by scripts/ensaio-restauro.ts (real copy, passphrase typed by the owner) and by the
 * emulator test (fictitious copy). Returns only numbers.
 */
import { buildManifest, canonicalJson, openBackupFile } from '../src/lib/encryptedBackup';
import { readWholeDatabase, restoreToEmulator, wipeEmulatorDatabase } from '../e2e/emulatorData';
import { FIRESTORE } from '../e2e/seed';

export interface RehearsalReport {
  ok: boolean;
  createdAt: string;
  documents: number;
  collections: Array<{ name: string; inCopy: number; restored: number }>;
  missing: number;
  different: number;
  extra: number;
  sameHash: boolean;
  ms: { open: number; restore: number; total: number };
}

export async function rehearseRestore(fileText: string, passphrase: string): Promise<RehearsalReport> {
  if (!FIRESTORE.startsWith('http://127.0.0.1:')) throw new Error('O ensaio só corre contra o emulador local.');
  const t0 = Date.now();
  const opened = await openBackupFile(JSON.parse(fileText), passphrase);
  if (opened.ok === false) throw new Error(opened.reason);
  const { documents, manifest } = opened.payload;
  const tOpen = Date.now();

  await wipeEmulatorDatabase();
  const left = [...(await readWholeDatabase()).values()].filter((d) => d.data !== null).length;
  if (left !== 0) throw new Error(`O emulador não ficou vazio (${left} documentos).`);
  await restoreToEmulator(documents);
  const tRestore = Date.now();

  const restored = new Map(
    [...(await readWholeDatabase())].filter(([, d]) => d.data !== null).map(([p, d]) => [p, d.data!])
  );
  const missing = documents.filter((d) => !restored.has(d.path)).length;
  const different = documents.filter(
    (d) => restored.has(d.path) && canonicalJson(restored.get(d.path)) !== canonicalJson(d.data)
  ).length;
  const extra = restored.size - (documents.length - missing);
  const after = await buildManifest(
    [...restored].map(([path, data]) => ({ path, data })),
    manifest.createdAt,
    manifest.errors
  );
  const sameHash = after.total === manifest.total;
  return {
    ok: missing === 0 && different === 0 && extra === 0 && sameHash,
    createdAt: manifest.createdAt,
    documents: documents.length,
    collections: Object.entries(manifest.collections).map(([name, n]) => ({
      name,
      inCopy: n,
      restored: after.collections[name] ?? 0
    })),
    missing,
    different,
    extra,
    sameHash,
    ms: { open: tOpen - t0, restore: tRestore - tOpen, total: Date.now() - t0 }
  };
}
