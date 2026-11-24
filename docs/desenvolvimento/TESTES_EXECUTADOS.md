# Testes executados

## Tarefa 01: P0-04 (24/11/2026, Windows, Node 26, Java 21, firebase-tools 13.35.1)

| Teste                                      | Comando                                                                                                                 | Resultado                                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Teste novo, sozinho                        | `firebase emulators:exec … "vitest run --config vitest.emulator.config.ts src/__emulator__/accessBaseline.emulator.ts"` | ✅ 14/14                                                                                                    |
| Tipos                                      | `npm run typecheck`                                                                                                     | ✅ sem erros                                                                                                |
| Lint do ficheiro novo                      | `npx eslint src/__emulator__/accessBaseline.emulator.ts`                                                                | ✅ sem avisos                                                                                               |
| Formatação do ficheiro novo                | `npx prettier --check`                                                                                                  | ✅                                                                                                          |
| Unitários (toda a bateria)                 | `npm test`                                                                                                              | ✅ 112 ficheiros, 683 testes                                                                                |
| Integração com emuladores (toda a bateria) | `npm run test:emulator`                                                                                                 | ⚠️ 225/226: 1 falha **anterior e não relacionada** (ver abaixo); os 21 ficheiros correram, incluindo o novo |

### Falha não relacionada: `clubCloud.emulator.ts` › "keeps working on the single document and never tries to migrate"

- **Falha também sem o ficheiro novo** (corrido sozinho). Erro: `could not strip the records rules`
  (`clubCloud.emulator.ts:45`).
- [S] A causa provável:
  - o teste recorta `firestore.rules` com uma expressão regular;
  - neste clone do Windows o ficheiro tem fins de linha CRLF (`core.autocrlf=true`);
  - no CI (Linux, LF) o mesmo teste passa no `main` (execução de 24/11/2026, 10:17).
- Não foi corrigido: está fora do âmbito desta tarefa. Fica registado em `RISCOS_E_LIMITACOES.md`.

## O que verifica cada teste novo

**A manter:**

- quem não tem sessão não lê nada (nem pela API REST);
- o treinador lê o seu atleta com os dados privados;
- no modelo novo, A não lê B nem B lê A;
- o staff não escreve no atleta nem lê `private/*`;
- o encarregado e a conta antiga de outro clube não leem o clube;
- uma conta pendente não lê o clube;
- uma conta antiga de um clube não convida para `main`.

**Estado atual, a corrigir:**

- o staff recebe os campos privados do `player` (P0-05);
- o modelo antigo lê todas as equipas (P0-07);
- uma conta sem clube lê `main` (P0-06);
- uma conta sem clube convida para `main` (P0-06);
- `clubs/*` aceita qualquer documento (P0-07);
- `system/*` legível sem clube (P0-07);
- `data` sem validação (P0-07, a rever).

Cada teste verifica os dois sentidos (o que passa e o que é recusado). Não se limita a "não dar erro".

## Testes que não foram executados

- **Testes de ecrã (Playwright):** não se aplicam (nenhum ecrã mudou). O CI corre-os quando o PR for aberto.
- **Produção:** nenhum teste toca na produção.
- **CI no GitHub:** ainda não correu, porque o ramo ainda não foi enviado (aguarda a tua autorização; ver
  `ALTERACOES_REALIZADAS.md`).
