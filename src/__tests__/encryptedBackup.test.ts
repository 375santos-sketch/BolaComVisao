import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BackupDoc,
  PBKDF2_ITERATIONS,
  collectionPattern,
  createBackupFile,
  openBackupFile,
  passphraseProblem,
  sealPayload,
  toPlainValue
} from '../lib/encryptedBackup';

// Fictitious data, only for this test
const PASS = 'frase de teste longa';
const docs: BackupDoc[] = [
  { path: 'users/u1', data: { account: { id: 'u1', name: 'Adulto Um', email: 'um@teste.pt' } } },
  {
    path: 'club_workspace/main/records/player__sub11__p1',
    data: { kind: 'player', teamId: 'sub11', data: { name: 'Atleta Secreto', birthDate: '2016-01-01' } }
  },
  { path: 'club_workspace/main/records/club', data: { kind: 'club', teamId: '_club', data: { teams: [] } } },
  { path: 'club_workspace/main', data: { state: { roster: [{ name: 'Atleta Secreto' }] }, updatedAt: 1 } }
];
const FAST = { iterations: 1000, now: new Date('2026-11-13T10:00:00Z') };

describe('F1.1b — cópia cifrada', () => {
  it('uses PBKDF2-SHA-256 with 600 000 iterations, a 16-byte salt and a 12-byte IV, AES-GCM 256', async () => {
    const file = await createBackupFile(docs, PASS);
    expect(file.kdf).toMatchObject({ name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS });
    expect(PBKDF2_ITERATIONS).toBe(600_000);
    expect(atob(file.kdf.salt)).toHaveLength(16);
    expect(atob(file.cipher.iv)).toHaveLength(12);
    expect(file.cipher).toMatchObject({ name: 'AES-GCM', length: 256 });
  });

  it('nothing readable in the file: names, emails and dates are only inside the encrypted part', async () => {
    const text = JSON.stringify(await createBackupFile(docs, PASS, FAST));
    ['Atleta Secreto', 'Adulto Um', 'um@teste.pt', '2016-01-01', 'player', 'users/u1'].forEach((secret) =>
      expect(text).not.toContain(secret)
    );
  });

  it('opens with the passphrase and every document matches the manifest', async () => {
    const result = await openBackupFile(JSON.parse(JSON.stringify(await createBackupFile(docs, PASS, FAST))), PASS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.documents).toBe(4);
    expect(result.payload.documents).toEqual(docs);
    expect(result.payload.manifest.collections).toEqual({
      club_workspace: 1,
      'club_workspace/*/records': 2,
      users: 1
    });
    expect(result.payload.manifest.recordKinds).toEqual({ main: { club: 1, player: 1 } });
    expect(Object.keys(result.payload.manifest.documents)).toHaveLength(4);
    expect(result.payload.manifest.total).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a wrong passphrase or any change to the file is refused', async () => {
    const file = await createBackupFile(docs, PASS, FAST);
    expect((await openBackupFile(file, 'outra frase longa')).ok).toBe(false);
    const bytes = atob(file.data);
    const flipped = String.fromCharCode(bytes.charCodeAt(10) ^ 1);
    const tampered = { ...file, data: btoa(bytes.slice(0, 10) + flipped + bytes.slice(11)) };
    expect(await openBackupFile(tampered, PASS)).toMatchObject({ ok: false });
    expect(await openBackupFile({ format: 'outro' }, PASS)).toMatchObject({ ok: false });
  });

  it('a document changed inside the copy no longer matches the manifest: refused', async () => {
    const opened = await openBackupFile(await createBackupFile(docs, PASS, FAST), PASS);
    if (!opened.ok) throw new Error('should open');
    const payload = JSON.parse(JSON.stringify(opened.payload));
    payload.documents[0].data.account.name = 'Alterado';
    const result = await openBackupFile(await sealPayload(payload, PASS, 1000), PASS);
    expect(result).toMatchObject({ ok: false, reason: 'O conteúdo não confere com o manifesto.' });
  });

  it('passphrase rules: at least 12 characters and the confirmation must match', async () => {
    expect(passphraseProblem('curta')).toMatch(/12/);
    expect(passphraseProblem('frase comprida aqui', 'outra')).toMatch(/iguais/);
    expect(passphraseProblem('frase comprida aqui', 'frase comprida aqui')).toBeNull();
    await expect(createBackupFile(docs, 'curta', FAST)).rejects.toThrow(/12/);
  });

  it('paths and Firestore timestamps', () => {
    expect(collectionPattern('club_workspace/main/records/club')).toBe('club_workspace/*/records');
    expect(collectionPattern('team_databases/t1/datasets/d1/rows/r1')).toBe('team_databases/*/datasets/*/rows');
    const ts = { seconds: 10, nanoseconds: 5, toMillis: () => 10005 };
    expect(toPlainValue({ a: [ts], b: null })).toEqual({
      a: [{ __bcvTimestamp: { seconds: 10, nanoseconds: 5 } }],
      b: null
    });
  });

  it('the copy files contain no Firestore write function and the app has no restore', () => {
    [
      'src/lib/encryptedBackup.ts',
      'src/services/backupReader.ts',
      'src/components/admin/EncryptedBackupModal.tsx'
    ].forEach((f) =>
      expect(readFileSync(f, 'utf8')).not.toMatch(
        /\b(setDoc|updateDoc|deleteDoc|addDoc|writeBatch|runTransaction|onUpdateState|updateState)\s*\(/
      )
    );
  });
});

describe('F1.1b — JSON canónico', () => {
  it('is the same as the sync one (same hashes for the same document)', async () => {
    const { canonicalJson: syncCanonical } = await import('../lib/recordSync');
    const { canonicalJson } = await import('../lib/encryptedBackup');
    const sample = { b: [1, { y: undefined, x: 'a' }], a: null, c: { z: 2, d: undefined } };
    expect(canonicalJson(sample)).toBe(syncCanonical(sample));
  });
});
