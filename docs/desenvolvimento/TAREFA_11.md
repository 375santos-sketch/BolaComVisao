# Tarefa 11 de desenvolvimento: P1-04, ensaio de restauro documentado

Ramo `fix/p1-04-ensaio-restauro`, a partir de `main` em `1f719b7`.

## O que mudou

- **`scripts/restoreRehearsal.ts`:** abre uma cópia cifrada, esvazia o emulador local, restaura a cópia lá dentro e
  compara documento a documento, mais o SHA-256 do conjunto. Recusa correr se não estiver ligado ao emulador
  (`127.0.0.1`).
- **`scripts/ensaio-restauro.ts`:**
  - pede a frase-passe no terminal, sem a mostrar, e recusa correr num terminal onde não a possa esconder;
  - imprime o relatório só com números.
- **`npm run ensaio:restauro`:** arranca o emulador do Firestore em memória, corre o ensaio e fecha.
- **`docs/RESTAURO.md`:** o procedimento e o registo dos ensaios.

## Testes

| Teste                                                                                                                                   | Resultado |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `restoreRehearsal.emulator.ts`: uma cópia fictícia é restaurada e fica igual; com a frase-passe errada, para antes de mexer no emulador | ✅ 2/2    |
| Tipos, lint, formatação                                                                                                                 | ✅        |

O ensaio com a cópia real é o próprio teste de aceitação: o dono corre-o e o resultado fica anotado em
`docs/RESTAURO.md`.

## Riscos e limitações

- **Durante o ensaio,** os dados reais ficam decifrados na memória do computador, dentro do emulador. Desaparecem
  quando o emulador fecha.
- **A cópia não inclui as contas do Firebase Auth:** só o Firestore. As palavras-passe dos treinadores não estão nas
  cópias.

## Reversão

`git revert` do merge. Não mexe na app nem em dados.
