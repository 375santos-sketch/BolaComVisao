# Alterações realizadas

Registo por intervenção, a mais recente no topo.

## Tarefa 04: P0-09, proteção do histórico (24/11/2026)

Ramo `fix/p0-09-proteger-historico`. Pormenor em `TAREFA_04.md`.

| Ficheiro                                                                                       | Tipo           | O que mudou                                                                               |
| ---------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `src/lib/destructiveActions.ts`                                                                | Novo           | Palavras de confirmação, travão de apagamentos (mesmas regras de antes) e texto do aviso  |
| `src/components/ConfirmModal.tsx`                                                              | Alterado       | Opção `confirmWord`: o botão só funciona depois de escrever a palavra; tipo `ShowConfirm` |
| `src/App.tsx`                                                                                  | Alterado       | Uma só função `showConfirm`; aviso quando o travão retém apagamentos (uma vez por caso)   |
| `src/services/clubCloud.ts`, `src/services/firebase.ts`                                        | Alterado       | O travão usa a função pura e devolve `blockedDeletions`                                   |
| `TrainingsView`, `SquadToolbar`, `SquadView`, `TeamsHubView`, `DatabaseModal`, `SettingsModal` | Alterado       | ELIMINAR / SUBSTITUIR nas 6 ações em massa                                                |
| `PlayerEvolutionSection.tsx`                                                                   | Alterado       | Apagar uma avaliação antiga (1–5) pede duas confirmações                                  |
| `src/__tests__/destructiveActions.test.ts`, `src/__emulator__/massDelete.emulator.ts`          | Novos (testes) | 6 unitários e 3 de integração                                                             |

**Não alterados:** regras, dados, dependências.

## Tarefa 03: P0-03, deteção de escalões misturados (24/11/2026)

Ramo `feat/p0-03-detecao-escaloes`.

| Ficheiro                                  | Tipo            | O que mudou                                                                                      |
| ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `src/lib/inventory.ts`                    | Alterado (+140) | Tipo `TeamMixingCheck`, função pura `teamMixingOf` e campo `mixing` em cada espaço do inventário |
| `src/components/admin/InventoryModal.tsx` | Alterado (+56)  | Linha "Escalões misturados" no cartão de cada espaço (só para o Administrador)                   |
| `src/__tests__/inventoryMixing.test.ts`   | Novo (teste)    | 9 testes: cada sinal, registos apagados, documento antigo, privacidade                           |
| `docs/desenvolvimento/*.md`               | Documentação    | `TAREFA_03.md` e as secções da Tarefa 03                                                         |

**Não alterados:** `services/inventoryReader.ts` (a leitura), regras, dados, dependências.

## Tarefa 02: P0-02, troca de equipa testada e unificada (24/11/2026)

Ramo `fix/p0-02-troca-de-equipa`.

| Ficheiro                                | Tipo         | O que mudou                                                                                                           |
| --------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/lib/teamSwitch.ts`                 | Novo         | `teamsWithActiveSaved`, `switchTeam` e `teamCounts`: funções puras, uma só fonte                                      |
| `src/__tests__/teamSwitch.test.ts`      | Novo (teste) | 12 testes: agenda por equipa, troca de equipa, números dos cartões                                                    |
| `src/lib/storage.ts`                    | Alterado     | `normalizeClubState` deixa de copiar a agenda da equipa ativa para as outras por nome do clube ou "drag" (−18 linhas) |
| `src/App.tsx`                           | Alterado     | A troca de equipa usa `switchTeam` (−90 linhas de heurística)                                                         |
| `src/components/views/TeamsHubView.tsx` | Alterado     | Os cartões usam `teamCounts` (−70 linhas)                                                                             |
| `src/components/DatabaseModal.tsx`      | Alterado     | A lista de equipas usa `teamCounts` (−70 linhas)                                                                      |
| `docs/desenvolvimento/*.md`             | Documentação | `TAREFA_02.md` e as secções da Tarefa 02                                                                              |

O texto `'drag'` desapareceu do código da app.

**Não alterados:** regras, dados guardados, dependências, configuração.

## Tarefa 01: P0-04, base de comparação dos acessos (24/11/2026)

Ramo `test/p0-04-base-acessos`.

| Ficheiro                                      | Tipo                 | O que mudou                                                                  |
| --------------------------------------------- | -------------------- | ---------------------------------------------------------------------------- |
| `src/__emulator__/accessBaseline.emulator.ts` | Novo (teste)         | 14 testes de regras no emulador: 7 "a manter" e 7 "estado atual, a corrigir" |
| `docs/desenvolvimento/*.md`                   | Novos (documentação) | Esta pasta                                                                   |

**Não alterados:** código da app, `firestore.rules`, dados, dependências, configuração.

**Não incluídos neste ramo:** os documentos `docs/auditoria/` (Tarefas 01 e 02 da auditoria). Ficam fora porque o
repositório é **público** e esses documentos descrevem as fraquezas de segurança antes de estarem corrigidas.
Decisão D-13 da matriz, por decidir.

Os nomes dos testes "a corrigir" também tornam visíveis alguns pontos fracos. Mas o que mostram já se lê nas regras
públicas, e servem para os fechar. Fica à tua decisão enviar o ramo antes ou depois de o repositório passar a
privado.
