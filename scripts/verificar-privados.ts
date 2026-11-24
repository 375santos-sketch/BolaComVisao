/**
 * P0-05 · F3.3 — Verifica, numa cópia cifrada (.bcvbak), se as cópias dos dados privados batem certo com o perfil
 * desportivo de cada atleta. Só lê o ficheiro: não liga à base real nem ao emulador, e não escreve nada.
 *
 *   $env:BCV_COPIA = 'C:\caminho\bcv-backup-AAAA-MM-DD.bcvbak'
 *   npm run verificar:privados
 *
 * A frase-passe é pedida aqui e não aparece no ecrã. O relatório só mostra números e o identificador de cada clube.
 */
import { readFile } from 'node:fs/promises';
import { openBackupFile } from '../src/lib/encryptedBackup';
import { checkPrivateCopies } from '../src/lib/privateCheck';
import { PRIVATE_KINDS } from '../src/lib/privateRecords';
import { askHidden } from './askHidden';

const KIND_LABEL: Record<string, string> = {
  pcontact: 'contactos e saúde',
  peval: 'avaliações',
  pnotes: 'notas',
  pgoals: 'objetivos',
  mratings: 'notas dos jogos'
};

async function main() {
  const file = (process.env.BCV_COPIA || process.argv[2] || '').trim().replace(/^"|"$/g, '');
  if (!file) throw new Error('Falta o caminho da cópia: $env:BCV_COPIA = "C:\\...\\bcv-backup-....bcvbak"');
  const text = await readFile(file, 'utf8');
  const pass = await askHidden('Frase-passe da cópia (não aparece no ecrã): ');
  const opened = await openBackupFile(JSON.parse(text), pass);
  if (opened.ok === false) throw new Error(opened.reason);
  const r = checkPrivateCopies(opened.payload.documents);

  console.log('\n=== Verificação dos dados privados, F3.3 (só números) ===');
  console.log(`Cópia feita em: ${opened.payload.manifest.createdAt}`);
  console.log(`Clubes com a escrita dupla ligada: ${r.linkedClubs}`);
  for (const c of r.clubs) {
    console.log(`\nClube ${c.club} · escrita dupla ${c.linked ? 'LIGADA' : 'desligada'}`);
    console.log(`  atletas: ${c.athletes} · jogos: ${c.games}`);
    console.log(`  cópias privadas esperadas: ${c.expected} · iguais: ${c.equal} · em falta: ${c.missing}`);
    console.log(`  diferentes: ${c.different} · a mais: ${c.extra}`);
    for (const k of PRIVATE_KINDS) {
      const n = c.byKind[k];
      if (n.expected) {
        console.log(
          `    ${KIND_LABEL[k]}: ${n.expected} esperadas, ${n.equal} iguais, ${n.missing} em falta, ${n.different} diferentes`
        );
      }
    }
  }
  if (r.linkedClubs === 0)
    console.log('\nRESULTADO: nenhum clube tem a escrita dupla ligada; não há cópias a verificar.');
  else if (r.ok) console.log('\nRESULTADO: OK, nos clubes ligados as cópias privadas batem certo com o perfil.');
  else console.log('\nRESULTADO: HÁ DIFERENÇAS nos clubes ligados (ver números acima).');
  process.exit(r.linkedClubs === 0 || r.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nERRO: ${(err as Error)?.message || err}`);
  process.exit(1);
});
