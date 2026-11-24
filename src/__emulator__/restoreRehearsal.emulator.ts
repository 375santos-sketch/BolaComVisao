/**
 * P1-04 — The restore rehearsal (scripts/restoreRehearsal.ts) against the emulator, with a FICTITIOUS encrypted copy:
 * it restores into an empty database and reports everything equal; a wrong passphrase stops before touching anything.
 * Works on the app's named database of the emulator (the one of the e2e tests), not on the "(default)" one of the other
 * emulator tests.
 */
import { describe, it, expect } from 'vitest';
import { createBackupFile } from '../lib/encryptedBackup';
import { rehearseRestore } from '../../scripts/restoreRehearsal';
import { FIRESTORE, owner } from '../../e2e/seed';

const PASS = 'frase-passe de teste 2026';
const docs = [
  { path: 'club_workspace/clubeFicticio', data: { name: 'Clube Fictício', updatedAt: 1 } },
  {
    path: 'club_workspace/clubeFicticio/records/player__t1__p1',
    data: { kind: 'player', teamId: 't1', payload: { name: 'Atleta Teste', number: 7 } }
  },
  { path: 'club_workspace/clubeFicticio/records/match__t1__m1', data: { kind: 'match', teamId: 't1', goals: [1, 2] } },
  { path: 'users/uidTeste', data: { account: { status: 'approved', role: 'Treinador Principal' } } }
];

describe('P1-04 — ensaio de restauro (emulador, dados fictícios)', () => {
  it('restaura numa base vazia e fica tudo igual à cópia', async () => {
    // Something already in the emulator must be wiped before the restore
    await fetch(`${FIRESTORE}/sobra/doc1`, {
      method: 'PATCH',
      headers: owner,
      body: JSON.stringify({ fields: { x: { integerValue: '1' } } })
    });
    const file = await createBackupFile(docs, PASS, { iterations: 1000 });
    const report = await rehearseRestore(JSON.stringify(file), PASS);
    expect(report).toMatchObject({ ok: true, documents: 4, missing: 0, different: 0, extra: 0, sameHash: true });
    expect(report.collections.length).toBeGreaterThan(0);
    for (const c of report.collections) expect(c.restored, c.name).toBe(c.inCopy);
  });

  it('com a frase-passe errada para antes de mexer no emulador', async () => {
    const file = await createBackupFile(docs, PASS, { iterations: 1000 });
    await expect(rehearseRestore(JSON.stringify(file), 'frase errada mas longa')).rejects.toThrow(/Frase-passe errada/);
    // The previous restore is still there (nothing was wiped)
    const res = await fetch(`${FIRESTORE}/users/uidTeste`, { headers: owner });
    expect(res.ok).toBe(true);
  });
});
