/** P0-05 · F3.3 — The read-only check of the private copies against the sport profile (fictitious data only). */
import { describe, it, expect } from 'vitest';
import { checkPrivateCopies, CheckDoc } from '../lib/privateCheck';
import { recordDocId } from '../lib/recordSync';
import { createBackupFile, openBackupFile } from '../lib/encryptedBackup';

const player = (club: string, team: string, id: string, data: Record<string, unknown>, deleted = false): CheckDoc => ({
  path: `club_workspace/${club}/records/${recordDocId('player', team, id)}`,
  data: { kind: 'player', teamId: team, entityId: id, data: { id, name: 'Atleta Teste', ...data }, deleted }
});
const match = (club: string, team: string, id: string, data: Record<string, unknown>): CheckDoc => ({
  path: `club_workspace/${club}/records/${recordDocId('match', team, id)}`,
  data: { kind: 'match', teamId: team, entityId: id, data: { id, opponent: 'Adversário', ...data } }
});
const priv = (club: string, kind: string, team: string, id: string, data: unknown, deleted = false): CheckDoc => ({
  path: `club_workspace/${club}/private/${recordDocId(kind as never, team, id)}`,
  data: { kind, teamId: team, entityId: id, data, deleted }
});
const linked = (...clubs: string[]): CheckDoc => ({ path: 'system/dadosPrivados', data: { clubesLigados: clubs } });

describe('P0-05 · F3.3 — verificar as cópias privadas', () => {
  it('um clube ligado com tudo igual dá OK', () => {
    const r = checkPrivateCopies([
      linked('clubeA'),
      player('clubeA', 't1', 'p1', { phone: '900000000', notes: 'nota fictícia' }),
      player('clubeA', 't1', 'p2', {}), // nothing private: nothing expected
      match('clubeA', 't1', 'm1', { ratings: { p1: 4 } }),
      priv('clubeA', 'pcontact', 't1', 'p1', { id: 'p1', phone: '900000000' }),
      priv('clubeA', 'pnotes', 't1', 'p1', { id: 'p1', notes: 'nota fictícia' }),
      priv('clubeA', 'mratings', 't1', 'm1', { id: 'm1', ratings: { p1: 4 } })
    ]);
    expect(r.ok).toBe(true);
    expect(r.linkedClubs).toBe(1);
    expect(r.clubs[0]).toMatchObject({
      club: 'clubeA',
      linked: true,
      athletes: 2,
      games: 1,
      expected: 3,
      equal: 3,
      missing: 0,
      different: 0,
      extra: 0
    });
    expect(r.clubs[0].byKind.pcontact).toEqual({ expected: 1, equal: 1, missing: 0, different: 0 });
  });

  it('conta as cópias em falta, diferentes e a mais, e o resultado deixa de ser OK', () => {
    const r = checkPrivateCopies([
      linked('clubeA'),
      player('clubeA', 't1', 'p1', { phone: '900000000', individualGoals: ['objetivo'] }),
      player('clubeA', 't1', 'p2', { weight: 30 }),
      priv('clubeA', 'pcontact', 't1', 'p1', { id: 'p1', phone: '911111111' }), // different
      // pgoals of p1 missing; pcontact of p2 deleted (tombstone) = missing
      priv('clubeA', 'pcontact', 't1', 'p2', null, true),
      priv('clubeA', 'peval', 't1', 'pGone', { id: 'pGone', evaluations: [] }) // extra: athlete gone
    ]);
    expect(r.ok).toBe(false);
    expect(r.clubs[0]).toMatchObject({ expected: 3, equal: 0, missing: 2, different: 1, extra: 1 });
  });

  it('ignora os registos apagados e mostra os clubes desligados sem contar para o resultado', () => {
    const r = checkPrivateCopies([
      linked('clubeA'),
      player('clubeA', 't1', 'p1', { phone: '900000000' }, true), // deleted athlete: nothing expected
      player('clubeB', 't9', 'p1', { phone: '900000000' }) // club B is not linked: has no copies yet
    ]);
    expect(r.ok).toBe(true);
    const a = r.clubs.find((c) => c.club === 'clubeA')!;
    const b = r.clubs.find((c) => c.club === 'clubeB')!;
    expect(a).toMatchObject({ linked: true, athletes: 0, expected: 0 });
    expect(b).toMatchObject({ linked: false, athletes: 1, expected: 1, missing: 1 });
  });

  it('sem nenhum clube ligado não há nada a verificar', () => {
    const r = checkPrivateCopies([player('clubeA', 't1', 'p1', { phone: '900000000' })]);
    expect(r.linkedClubs).toBe(0);
    expect(r.clubs[0].linked).toBe(false);
  });

  it('um clube ligado sem nada na cópia aparece com zeros', () => {
    const r = checkPrivateCopies([linked('clubeVazio')]);
    expect(r.clubs).toEqual([expect.objectContaining({ club: 'clubeVazio', linked: true, expected: 0 })]);
  });

  it('o relatório só tem números e identificadores: nenhum nome, contacto ou nota', () => {
    const r = checkPrivateCopies([
      linked('clubeA'),
      player('clubeA', 't1', 'p1', { phone: '900000000', notes: 'nota fictícia', emergencyContact: 'Mãe Teste' }),
      priv('clubeA', 'pcontact', 't1', 'p1', { id: 'p1', phone: '911111111' })
    ]);
    const text = JSON.stringify(r);
    for (const secret of ['Atleta Teste', '900000000', '911111111', 'nota fictícia', 'Mãe Teste']) {
      expect(text).not.toContain(secret);
    }
  });

  it('funciona sobre uma cópia cifrada aberta com a frase-passe (como o comando)', async () => {
    const docs = [
      linked('clubeA'),
      player('clubeA', 't1', 'p1', { phone: '900000000' }),
      priv('clubeA', 'pcontact', 't1', 'p1', { id: 'p1', phone: '900000000' })
    ];
    const file = await createBackupFile(docs, 'frase-passe de teste 2026', { iterations: 1000 });
    const opened = await openBackupFile(JSON.parse(JSON.stringify(file)), 'frase-passe de teste 2026');
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(checkPrivateCopies(opened.payload.documents)).toMatchObject({ ok: true, linkedClubs: 1 });
  });
});
