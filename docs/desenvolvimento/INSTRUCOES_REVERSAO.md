# Instruções de reversão

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
