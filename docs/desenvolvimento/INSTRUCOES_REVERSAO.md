# Instruções de reversão

## Tarefa 04: P0-09

- **Antes do merge:** fechar o PR e apagar o ramo `fix/p0-09-proteger-historico`.
- **Depois do merge:** `git revert <commit do merge>` num ramo novo, PR e merge; AI Studio → Pull → Publish.
- **Efeito nos dados:** nenhum. O travão tem as mesmas regras; só passa a avisar.

## Tarefa 03: P0-03

- **Antes do merge:** fechar o PR e apagar o ramo `feat/p0-03-detecao-escaloes`.
- **Depois do merge:** `git revert <commit do merge>` num ramo novo, PR e merge; AI Studio → Pull → Publish.
- **Efeito nos dados:** nenhum. A verificação só lê.
- **Ficheiros de inventário já descarregados:** continuam válidos (`version: 1`). Os antigos só não têm o campo
  `mixing`.

## Tarefa 02: P0-02

- **Antes do merge:** fechar o PR e apagar o ramo `fix/p0-02-troca-de-equipa`.
- **Depois do merge:**
  1. `git revert <commit do merge>` num ramo novo, PR e merge;
  2. no AI Studio, Pull e Publish;
  3. nos telemóveis, fechar e reabrir a app.
- **Efeito nos dados:** nenhum a desfazer. Esta alteração não apaga nem reescreve registos.
- **Atenção:** a reversão volta a ligar a cópia da agenda entre escalões do mesmo clube.

## Tarefa 01: P0-04

Esta intervenção só acrescenta um ficheiro de teste e documentação. Não mexe na app, nas regras nem nos dados.

- **Antes do merge:** fechar o PR e apagar o ramo `test/p0-04-base-acessos`.
- **Depois do merge:** `git revert <commit>` num ramo novo, PR e merge. Em alternativa, apagar
  `src/__emulator__/accessBaseline.emulator.ts`.
- **Efeito da reversão:** nenhum na app nem nos dados. Só se perde a base de comparação para a F3, a migração de
  `main` e as regras estritas.
- **AI Studio:** não é preciso publicar nada; os testes não fazem parte da app publicada.
