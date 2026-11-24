# Tarefa 04 de desenvolvimento: P0-09, proteção do histórico

Ramo `fix/p0-09-proteger-historico`, a partir de `main` em `c74e174`. Aprovado pelo dono a 24/11/2026.

## O que mudou

1. **Confirmação escrita nas ações em massa** (`ConfirmModal`, opção `confirmWord`):
   - escrever **ELIMINAR** para eliminar todos os treinos, limpar o plantel, apagar uma equipa (Hub e Cópias) e limpar
     a agenda;
   - escrever **SUBSTITUIR** para repor uma cópia por cima dos dados;
   - as outras confirmações ficam iguais (um toque).
2. **Aviso visível do travão de apagamentos:**
   - `pushClubRecords` devolve `blockedDeletions` e a app mostra o aviso (`massDeleteNotice`), uma vez por caso;
   - antes, só a consola dizia que o travão tinha atuado.
3. **Avaliações antigas (1–5):** apagar pede duas confirmações. A decisão 9 ainda está pendente, por isso o apagar não
   foi retirado.
4. **Lógica pura** em `src/lib/destructiveActions.ts` (palavra, travão e aviso), usada pelo `clubCloud`. O travão
   tem as mesmas regras de antes: mais de 20 apagamentos e mais de metade dos registos.

## Ficheiros

- **Novos:**
  - `src/lib/destructiveActions.ts`;
  - `src/__tests__/destructiveActions.test.ts` (6 testes);
  - `src/__emulator__/massDelete.emulator.ts` (3 testes).
- **Alterados:**
  - `ConfirmModal.tsx`, `App.tsx`;
  - `clubCloud.ts`, `firebase.ts`;
  - `TrainingsView.tsx`, `SquadToolbar.tsx`, `SquadView.tsx`, `TeamsHubView.tsx`, `DatabaseModal.tsx`,
    `SettingsModal.tsx`;
  - `PlayerEvolutionSection.tsx`.
- **Não alterados:** regras, dados, dependências.

## Testes (24/11/2026, Windows)

| Teste                                                                                | Resultado                                                                                                             |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Testes novos (lógica)                                                                | ✅ 6/6                                                                                                                |
| Integração do travão (30 retidos e avisados; 10 passam; autorização explícita passa) | ✅ 3/3                                                                                                                |
| Unitários (toda a bateria)                                                           | ✅ 115 ficheiros, 710 testes                                                                                          |
| Tipos, lint, formatação, build                                                       | ✅                                                                                                                    |
| Integração (toda a bateria)                                                          | 228/229. A única falha é a já conhecida de `clubCloud`, por fins de linha no Windows; passa no CI.                    |
| Testes de ecrã                                                                       | Não corridos localmente (sem o navegador do Playwright). Nenhum teste de ecrã usa estas ações em massa; correm no CI. |

## Riscos e limitações

- **Uma ação em massa confirmada pode continuar retida pelo travão** se apagar mais de metade dos registos do clube
  (por exemplo, eliminar os treinos de um clube pequeno). Agora aparece o aviso, que sugere apagar em partes de até 20. Deixar passar os apagamentos confirmados com a palavra é uma melhoria possível, numa tarefa à parte.
- O ecrã da confirmação escrita não foi visto no navegador: falta a verificação visual.

## Reversão

- **Antes do merge:** fechar o PR.
- **Depois do merge:** `git revert` do merge, PR, e no AI Studio Pull e Publish.
- **Efeito nos dados:** nenhum.
