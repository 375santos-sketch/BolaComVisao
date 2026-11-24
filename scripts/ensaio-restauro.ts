/**
 * P1-04 — Ensaio de restauro de uma cópia cifrada (.bcvbak), SÓ no emulador local.
 *
 * Corre assim (o emulador nasce vazio, em memória, e desaparece no fim: nada fica gravado no disco nem vai à nuvem):
 *   $env:BCV_COPIA = 'C:\caminho\bcv-backup-AAAA-MM-DD.bcvbak'
 *   npm run ensaio:restauro
 *
 * A frase-passe é pedida aqui, no terminal, e não aparece no ecrã. O relatório só mostra números (sem nomes nem
 * e-mails).
 */
import { readFile } from 'node:fs/promises';
import { rehearseRestore } from './restoreRehearsal';
import { askHidden } from './askHidden';

async function main() {
  const file = (process.env.BCV_COPIA || process.argv[2] || '').trim().replace(/^"|"$/g, '');
  if (!file) throw new Error('Falta o caminho da cópia: $env:BCV_COPIA = "C:\\...\\bcv-backup-....bcvbak"');
  const text = await readFile(file, 'utf8');
  const pass = await askHidden('Frase-passe da cópia (não aparece no ecrã): ');
  console.log('\nA abrir a cópia e a restaurar no emulador (pode demorar um minuto)...');
  const r = await rehearseRestore(text, pass);

  console.log('\n=== Ensaio de restauro (só números) ===');
  console.log(`Cópia feita em: ${r.createdAt} · documentos: ${r.documents}`);
  console.log('Coleções (na cópia → depois do restauro):');
  for (const c of r.collections) console.log(`  ${c.name}: ${c.inCopy} → ${c.restored}`);
  console.log(`Documentos em falta: ${r.missing} · diferentes: ${r.different} · a mais: ${r.extra}`);
  console.log(`SHA-256 do conjunto igual ao da cópia: ${r.sameHash ? 'SIM' : 'NÃO'}`);
  console.log(`Tempo: abrir ${r.ms.open} ms · restaurar ${r.ms.restore} ms · total ${r.ms.total} ms`);
  console.log(r.ok ? '\nRESULTADO: OK, o restauro ficou igual à cópia.' : '\nRESULTADO: FALHOU (ver números acima).');
  process.exit(r.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nERRO: ${(err as Error)?.message || err}`);
  process.exit(1);
});
