# Testes executados

## Tarefa 03: P0-03 (24/11/2026, Windows)

| Teste                                                                                                                    | Comando                                                | Resultado                    |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ---------------------------- |
| Testes novos                                                                                                             | `npx vitest run src/__tests__/inventoryMixing.test.ts` | ✅ 9/9                       |
| Inventário existente (incluindo "nenhuma função de escrita nos ficheiros do inventário" e "nunca leva dados de atletas") | `src/__tests__/inventory.test.ts`                      | ✅ 11/11                     |
| Tipos                                                                                                                    | `npm run typecheck`                                    | ✅                           |
| Lint (todo o projeto)                                                                                                    | `npm run lint`                                         | ✅                           |
| Formatação dos ficheiros alterados                                                                                       | `npx prettier --check`                                 | ✅                           |
| Unitários (toda a bateria)                                                                                               | `npm test`                                             | ✅ 114 ficheiros, 704 testes |
| Build                                                                                                                    | `npm run build`                                        | ✅                           |

**O que os testes novos verificam:**

- um clube sem misturas dá "sem sinais";
- conta as cópias da agenda num escalão do mesmo clube, quantas duplicam um original e em que equipa estão;
- conta os jogos e a agenda sem equipa, e os registos de equipas inexistentes;
- conta os atletas em duas equipas da **mesma** época, e não os de épocas diferentes;
- ignora os registos apagados;
- lê os clubes ainda no documento antigo;
- o JSON do inventário não leva nomes de atletas, adversários, datas nem contactos.

**Não executados localmente:**

- **Testes de ecrã:** o Playwright não tem o navegador instalado nesta máquina, e instalá-lo seria instalar
  dependências. O teste `inventario.e2e.ts` (só o Administrador vê; a base de dados fica **igual** antes e depois)
  corre no CI do PR.
- **Ecrã do Inventário no navegador:** precisa de emuladores, dados de teste e uma conta de Administrador. Fica
  coberto pelo teste de ecrã do CI.
- **Integração com emuladores:** não se aplica. A leitura (`inventoryReader.ts`) não mudou; a verificação é uma
  função pura.
- **Produção:** és tu que corres o inventário depois do Publish (só leitura).

## Tarefa 02: P0-02 (24/11/2026, Windows)

| Teste                                                              | Comando                                           | Resultado                                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Testes novos **contra o código antigo** (prova do problema)        | `npx vitest run src/__tests__/teamSwitch.test.ts` | ❌ 4/4 falharam como esperado: a agenda do Sub-11 aparecia no Sub-13 do mesmo clube, também com `teamId` do Sub-11; o clube "drag" recebia os jogos sem equipa; cada gravação voltava a copiar                                       |
| Testes novos com a correção                                        | idem                                              | ✅ 12/12                                                                                                                                                                                                                             |
| Testes da separação de jogos (já existiam)                         | `teamMatchSeparation.test.ts` (na bateria)        | ✅                                                                                                                                                                                                                                   |
| Tipos                                                              | `npm run typecheck`                               | ✅                                                                                                                                                                                                                                   |
| Lint (todo o projeto)                                              | `npm run lint`                                    | ✅                                                                                                                                                                                                                                   |
| Formatação dos ficheiros alterados                                 | `npx prettier --check`                            | ✅                                                                                                                                                                                                                                   |
| Unitários (toda a bateria)                                         | `npm test`                                        | ✅ 113 ficheiros, 695 testes                                                                                                                                                                                                         |
| Build                                                              | `npm run build`                                   | ✅                                                                                                                                                                                                                                   |
| Integração com emuladores (toda a bateria, sincronização incluída) | `npm run test:emulator`                           | ✅ 211/212. A única falha é a já conhecida de `clubCloud.emulator.ts`, de fins de linha no Windows, que também falha sem esta alteração (comparado com o código antigo: resultado igual). No CI (Linux) do PR 181 este teste passou. |

**Nota:** numa primeira execução completa falharam mais 4 testes de `clubCloud` por **tempo** (a execução demorou 272 s;
um teste parou no limite de 30 s). Comparei o ficheiro com e sem a alteração: o resultado foi igual. Uma segunda
execução completa deu 211/212. Conclusão: lentidão da máquina, não regressão.

**Testes de permissões:** esta tarefa não muda as regras. A base de acessos da P0-04 (`accessBaseline.emulator.ts`)
continua a passar no CI.

**Não executados localmente:**

- testes de ecrã (Playwright): o CI corre-os no PR, incluindo "entrar: escolha da equipa e painel inicial";
- a app aberta no navegador: o login Google não funciona em localhost. O fluxo está coberto pelo teste de ecrã do CI.

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
