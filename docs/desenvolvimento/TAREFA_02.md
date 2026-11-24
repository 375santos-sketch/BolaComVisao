# Tarefa 02 de desenvolvimento: P0-02, troca de equipa testada e unificada

Ramo: `fix/p0-02-troca-de-equipa`, a partir de `main` em `835d01b` (depois do merge da P0-04). Plano: `PLANO_INTERVENCAO.md`
(P0-02). Aprovado pelo dono a 24/11/2026 ("podes avançar"), com o comportamento proposto: os jogos sem equipa marcada
ficam na equipa onde estão, e não são atribuídos pelo nome do clube.

## Problema

A lógica de "que dados são de que equipa" estava repetida em 4 sítios. Usava o **nome do clube** (com comparações
`includes`) e um caso especial escrito no código para clubes com "drag" no nome (Dragões).

Dois escalões do mesmo clube têm o mesmo nome de clube, e cada jogo agendado é gravado com `teamName` = nome do
clube. Com isso:

1. **[F, provado por teste] Agenda misturada a cada gravação (`lib/storage.ts`, `normalizeClubState`):**
   - os jogos agendados da equipa ativa eram copiados para os outros escalões do mesmo clube;
   - incluía jogos já marcados com o `teamId` da equipa ativa;
   - num clube com "drag" no nome, também os jogos sem equipa;
   - como `normalizeClubState` corre em cada gravação e leitura, a cópia repetia-se e ia para a nuvem.
2. **[F] Troca de equipa (`App.tsx`):**
   - a equipa de destino recebia jogos e agenda da equipa que se deixava, por nome parecido ou (jogos) **sem equipa
     marcada**;
   - se a equipa de destino não tinha plantel ou jogos, ficava **com o plantel ou os jogos da equipa anterior**.
3. **[F] Cartões das equipas (`TeamsHubView.tsx`, `DatabaseModal.tsx`):** os números (atletas, jogos, treinos)
   somavam dados de outras equipas pela mesma heurística. Só afetava o que se via.

## Comportamento pretendido (implementado)

- **Os dados de cada equipa são as suas próprias listas** em `teams[]`. As cópias de topo (`roster`, `matches`,
  `schedule`…) são as da equipa ativa.
- **Trocar de equipa** (`switchTeam`, `src/lib/teamSwitch.ts`):
  - a equipa que se deixa guarda o que estava a ser editado;
  - a nova mostra **exatamente** os seus dados;
  - uma equipa vazia aparece vazia;
  - uma equipa inexistente não muda nada.
- **Agenda das outras equipas** em `normalizeClubState`: é só a lista própria de cada uma. Deixou de se copiar a da
  equipa ativa.
- **Não se apaga nada já guardado:** se uma equipa tem na sua lista cópias antigas vindas da heurística, ficam lá.
  Limpá-las é uma reparação de dados à parte, a decidir depois da deteção em produção (P0-03).
- **Os jogos (`matches`) em `normalizeClubState` não mudam:** já eram atribuídos pelo `teamId`, senão pela lista onde
  estão, e têm testes desde antes (`teamMatchSeparation.test.ts`).
- **Os cartões das equipas** contam só os dados da própria equipa (`teamCounts`).

## Dados e módulos envolvidos

- **Estado local** (`AppState`, `teams[]`) e, por arrasto, os registos enviados para a nuvem (`recordSync`, que
  parte o estado normalizado).
- **Sem migração:** não se reescrevem nem apagam registos existentes. A partir desta versão, deixam só de ser criadas
  cópias novas.

## Riscos de regressão analisados

| Risco                                                                      | Análise                                                                                     | Resultado                                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Uma equipa deixa de mostrar jogos agendados que antes "apareciam" por nome | Esses jogos estão na lista da equipa onde foram criados (com o `teamId` dela); continuam lá | Esperado e correto                                                                   |
| Um jogo antigo sem equipa marcada deixa de aparecer noutra equipa          | Fica na equipa em cuja lista está (comportamento aprovado)                                  | Esperado                                                                             |
| Criar uma equipa nova e entrar nela                                        | `handleCreateTeam` já carrega a equipa vazia; `switchTeam` mantém isso                      | Coberto pelo teste "equipa vazia"                                                    |
| Sincronização entre aparelhos                                              | `recordSync` parte o estado normalizado por equipa; a mudança só retira cópias novas        | Toda a bateria de integração passa (211/212; a falha é anterior e local, ver testes) |
| Ecrã de escolha de equipa                                                  | Os números mudam só onde estavam inflacionados                                              | Teste de ecrã "entrar: escolha da equipa" corre no CI                                |

## Reversão

Ver `INSTRUCOES_REVERSAO.md`.
