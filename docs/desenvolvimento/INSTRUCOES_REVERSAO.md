# Instruções de reversão

## Tarefa 01: P0-04

Esta intervenção só acrescenta um ficheiro de teste e documentação. Não mexe na app, nas regras nem nos dados.

- **Antes do merge:** fechar o PR e apagar o ramo `test/p0-04-base-acessos`.
- **Depois do merge:** `git revert <commit>` num ramo novo, PR e merge. Em alternativa, apagar
  `src/__emulator__/accessBaseline.emulator.ts`.
- **Efeito da reversão:** nenhum na app nem nos dados. Só se perde a base de comparação para a F3, a migração de
  `main` e as regras estritas.
- **AI Studio:** não é preciso publicar nada; os testes não fazem parte da app publicada.
