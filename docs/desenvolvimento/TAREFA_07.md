# Tarefa 07 de desenvolvimento: P1-02, uma só gravação ao voltar a rede

Ramo `fix/p1-02-gravacao-unica`, a partir de `main` em `a59b25e`. Aprovado pelo dono a 24/11/2026 ("Sim, avança
P1-02").

## Problema

Quando a rede voltava, `App.tsx` fazia **duas** gravações:

1. `pushStateToCloud`, que tem as proteções: uma de cada vez, sempre o estado mais recente, nunca de um papel só de
   leitura;
2. logo a seguir, `syncStateWithCloud` (`lib/syncEngine.ts`). Esta gravava **fora dessas proteções**, com a cópia do
   estado da altura em que o evento foi registado, e sem verificar o papel nem a quota.

Além disso:

- "processava" uma fila de alterações offline que nada enchia;
- mostrava "Sincronizadas N alterações" sem fundamento;
- em caso de erro respondia "Guardado em base de dados offline local" como se fosse sucesso;
- guardava duas cópias do clube inteiro no IndexedDB (`offline_state_backup`, `latest_cloud_synced_state`) que
  nada lia.

## Solução

- **Ao voltar a rede há uma só gravação**, pelo `pushStateToCloud`, com o estado mais recente
  (`latestStateRef.current`) e respeitando a quota.
  - Se falhar, o efeito de nova tentativa que já existia (a cada 15–60 s, enquanto houver alterações por enviar)
    continua a tentar.
  - O indicador de gravação mostra se ficou tudo na nuvem.
- **Retirados de `lib/syncEngine.ts`:** `syncStateWithCloud`, `processOfflineMutationsQueue` e as funções da fila.
  Ficam `defaultSyncState`, `saveToIndexedDB`, `loadFromIndexedDB` e `clearDeviceClubData`, que continuam em uso.
- **Limpeza única no arranque** (`removeUnusedOfflineCopies`): apaga do aparelho as cópias que nada lia
  (`offline_state_backup`, `latest_cloud_synced_state`, `archived_mutations_<n>`, `processed_queue_<n>`) e a fila
  antiga (`bolacomvisao_mutations_queue_v1`).
  - **Não toca na cópia da app** (`coach_active_state`, as chaves por conta e clube).
- **O tipo `OfflineMutation` e `SyncState.pendingMutations` ficam em `types.ts`:** podem existir em estados antigos
  guardados; retirá-los é uma limpeza à parte.

## Testes

| Teste                                                                                                                           | Resultado                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `offlineCopies.test.ts`: reconhece só as cópias sem uso; nunca a cópia da app; o App já não chama a segunda gravação nem a fila | ✅ 3/3                                                                                      |
| `deviceCache.test.ts` (terminar sessão continua a limpar tudo)                                                                  | ✅                                                                                          |
| Unitários (toda a bateria)                                                                                                      | ✅ 116 ficheiros, 713 testes                                                                |
| Tipos, lint, formatação, build                                                                                                  | ✅                                                                                          |
| Integração (toda a bateria, sincronização incluída)                                                                             | 228/229. Só a falha antiga e local de `clubCloud` (fins de linha no Windows)                |
| **Navegador:** com as 4 cópias antigas, a fila e a cópia da app no aparelho, recarregar a app                                   | ✅ As 4 cópias e a fila desapareceram; **`coach_active_state` e o estado guardado ficaram** |

**Não verificado:** o voltar da rede com sessão iniciada e alterações por enviar, no navegador. Precisa de login (só
com emuladores) e de cortar a rede, o que o navegador da app não faz. A gravação usa o mesmo `pushStateToCloud` que já
é testado pela sincronização entre dois treinadores (`e2e/sincronizacao.e2e.ts`, no CI).

## Riscos e limitações

- A mensagem do voltar da rede passa a ser simples ("Ligação recuperada…"). O resultado real está no indicador de
  gravação, como no resto da app.
- Se algum aparelho antigo tiver lá alterações que só existiam nas cópias apagadas, não se perdem: essas cópias
  eram o estado inteiro, igual ao que a app guarda na sua própria cópia, e nada as lia.

## Reversão

`git revert` do merge; no AI Studio, Pull e Publish. As cópias apagadas não voltam, mas também não eram usadas.
