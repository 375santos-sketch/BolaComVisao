# Tarefa 03 de desenvolvimento: P0-03, deteção de escalões misturados (só leitura)

Ramo: `feat/p0-03-detecao-escaloes`, a partir de `main` em `7537e4a` (depois do merge da P0-02). Plano:
`PLANO_INTERVENCAO.md` (P0-03). Aprovado pelo dono a 24/11/2026 ("avança com p0-03").

## Problema

A P0-02 corrigiu as regras que misturavam dados entre escalões, mas **não mexeu no que já estava guardado**.
Precisamos de saber, **sem alterar nada**, se a produção tem dados de um escalão guardados noutro:

- cópias da agenda feitas pela regra antiga;
- jogos sem equipa;
- registos de equipas apagadas;
- atletas repetidos.

Só depois se decide se é precisa uma reparação, que terá de ser aprovada.

## Solução

Uma verificação nova no **Inventário da plataforma** (Clube → Inventário, só para o Administrador). É só de leitura e
usa o que o inventário já lia. Por clube, mostra:

| Sinal                                  | O que conta                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Noutra equipa                          | Jogos e agenda guardados numa equipa mas marcados (`teamId`) como de outra; quantos duplicam um original que existe; em que equipa estão |
| Sem equipa marcada                     | Jogos e agenda sem `teamId` (ficam onde estão, como aprovado na P0-02)                                                                   |
| O mesmo jogo em várias equipas         | O mesmo id presente em duas ou mais equipas                                                                                              |
| De equipas que já não existem          | Registos de uma equipa que não está na lista do clube                                                                                    |
| Atletas em duas equipas da mesma época | O mesmo atleta (`athleteId`) em duas equipas da mesma época: pode ser um atleta a jogar acima do escalão, ou uma cópia                   |

O resultado é **"sem sinais"** ou **"a verificar"**. Também vai para o ficheiro JSON do inventário (campo `mixing` de
cada espaço).

- **Clubes já no formato de registos:** lê os registos ativos (os apagados não contam).
- **Clubes ainda no documento antigo:** lê as listas de cada equipa.

## Privacidade

Só **contagens** e os **nomes das equipas** (clube · escalão · época). Nunca nomes de atletas, adversários, datas
nem contactos. Há um teste que verifica isto.

## Ficheiros, dados e módulos

- **`src/lib/inventory.ts`:**
  - tipo `TeamMixingCheck`;
  - função pura `teamMixingOf`;
  - campo `mixing` em cada espaço do inventário.
- **`src/components/admin/InventoryModal.tsx`:** a linha "Escalões misturados" no cartão de cada espaço.
- **`src/__tests__/inventoryMixing.test.ts`:** 9 testes.
- **Não alterados:**
  - `services/inventoryReader.ts` (a leitura continua só com `getDocsFromServer`/`getDocFromServer`/`getCountFromServer`);
  - as regras e os dados.

## Comportamento atual e pretendido

- **Antes:** o inventário contava os registos por tipo e por equipa, mas não mostrava se havia dados no escalão
  errado.
- **Depois:** mostra-o, sem gravar nada.
- Nada mais muda no inventário: o formato do ficheiro continua `version: 1`, com um campo a mais.

## Riscos de regressão

- **Baixo.** É uma função pura sobre dados já lidos, e uma linha a mais no ecrã do Administrador.
- O teste existente "the inventory files contain no Firestore write function" continua a passar.
- O teste de ecrã `inventario.e2e.ts` (a base de dados fica igual antes e depois) corre no CI.

## Próximo passo, depois do merge

1. AI Studio → Pull → Publish.
2. Tu, na app publicada: **Clube → Inventário da plataforma → Fazer inventário**.
3. Ler a linha "Escalões misturados" de cada clube (ou enviar-me só essas linhas).
4. Com o resultado, decidimos se é preciso uma reparação (tarefa à parte, com aprovação).
