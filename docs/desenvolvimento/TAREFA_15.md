# Tarefa 15 de desenvolvimento: P1-05, interruptor de IA do clube

Ramo `feat/p1-05-interruptor-ia`, a partir do ramo da Tarefa 14 (`fix/p1-05-ia-dados-minimos`, PR 195). Fazer o
merge depois do PR 195.

## Decisão do Bruno

- Há um botão e **qualquer pessoa do clube** pode ligar e desligar as funções de IA.
- **Começa ligado**: um clube que nunca escolheu tem a IA ligada, por isso nada muda para quem já a usa.

## O que mudou

- **Definições → Clube → «Funções de IA»**: dois botões, «Ligadas» e «Desligadas», como o das substituições. A
  escolha fica guardada com o clube (campo `aiEnabled` do estado) e chega a todos os aparelhos do clube.
- **Desligadas, nenhum pedido sai da app para a IA**: crónica do jogo, mensagem do resumo da semana, leitura de prints
  (classificação, calendário e exercícios) e exercício com IA. Quem tocar num destes botões vê o aviso «As funções de
  IA estão desligadas neste clube. Pode ligá-las em Definições → Clube.»
  - `src/lib/aiSwitch.ts`: `isAiEnabled(state)`, `setAiSwitch(on)` e `assertAiEnabled()`.
  - `App.tsx` mantém o interruptor igual ao estado do clube.
  - Cada chamada à IA passa por `assertAiEnabled()` antes do pedido: `chronicle.ts`, `readPrint.ts`,
    `exerciseIdea.ts` e a leitura de prints da `LeagueTableModal.tsx`.

## Testes

| Teste                                                                                  | Resultado  |
| -------------------------------------------------------------------------------------- | ---------- |
| `aiSwitch.test.ts`: ligado por defeito; só `false` desliga                             | ✅         |
| `aiSwitch.test.ts`: desligado, as quatro chamadas à IA dão o aviso e nenhum pedido sai | ✅         |
| `aiSwitch.test.ts`: ligado outra vez, os pedidos voltam a sair                         | ✅         |
| `aiSwitch.test.ts`: a escolha vai no registo partilhado do clube                       | ✅         |
| `npm test`                                                                             | ✅ 762/762 |
| Tipos, lint, build                                                                     | ✅         |

Todos os testes usam dados fictícios. O botão não foi visto no ecrã nesta tarefa.

## Riscos e limitações

- **O interruptor está na app, não no servidor.** O servidor continua a exigir uma conta aprovada (P0-08), mas não
  lê o interruptor do clube. Como qualquer pessoa do clube o pode mudar, serve para o clube escolher, não para impedir
  alguém de propósito.
- Os botões de IA continuam visíveis com a IA desligada; ao tocar, aparece o aviso.

## Reversão

`git revert` do merge e um novo Pull no AI Studio. O campo `aiEnabled` que fique guardado é ignorado.
