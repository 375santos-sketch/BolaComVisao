# Tarefa 12 de desenvolvimento: P1-07, dependências vulneráveis

Ramo `chore/p1-07-dependencias`, a partir de `main` em `3762a78`.

## O que mudou

| Biblioteca                    | Antes                    | Depois                                      | Porquê                                                                              |
| ----------------------------- | ------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `xlsx`                        | 0.18.5 (npm, abandonada) | 0.20.3, a versão oficial da SheetJS         | Poluição de protótipo e ReDoS (altas) sem correção no npm                           |
| `express`                     | 4.22.2                   | 4.22.3                                      | Traz `qs` 6.16.2, `body-parser` 1.20.9 e `proxy-addr` 2.0.8 (esta era crítica)      |
| `@grpc/grpc-js` (do Firebase) | 1.9.16                   | 1.14.7, por `overrides` no `package.json`   | Alta; o `firebase` 12 ainda pede a versão antiga e o 13 é uma versão principal nova |
| Indiretas (`npm audit fix`)   | vite 6.4.3, dompurify, … | vite 6.4.6, dompurify 3.5.0, source-map-js… | Altas e moderadas, todas dentro da mesma versão principal                           |

- **A versão oficial da SheetJS** vem do endereço da própria SheetJS (`cdn.sheetjs.com`), porque a SheetJS deixou de
  publicar no npm.
- **Os dois ficheiros de bloqueio,** `package-lock.json` e `bun.lock`, foram refeitos. O CI e o AI Studio instalam pelo
  `bun.lock`.
- **Nenhuma versão principal mudou:** `firebase` 12, `express` 4, `vite` 6, `react` 19.
- **O código da app não muda.**

## Testes

| Teste                                                                                                 | Resultado                                                        |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `npm audit` (produção e desenvolvimento)                                                              | ✅ 0 vulnerabilidades (antes: 12, das quais 1 crítica e 9 altas) |
| `npm test`                                                                                            | ✅ 740/740                                                       |
| Testes de Excel: ler e escrever uma folha (`matchSheetImporter`, `teamDatabase`, exportação da ficha) | ✅                                                               |
| Testes de emulador (Firebase com o `grpc-js` novo)                                                    | ✅ 229/229 (\*)                                                  |
| Tipos, lint, build                                                                                    | ✅                                                               |

(\*) Num computador Windows, um teste de `clubCloud` falha por causa dos fins de linha CRLF do `firestore.rules`. Com
fins de linha Unix, como no CI, passa. Não tem a ver com esta tarefa.

**Um teste mudou:** a exportação da ficha de jogo. A versão antiga do `xlsx`, fora do navegador, gravava mesmo um
ficheiro `.xlsx` na pasta do projeto. A nova recusa, porque fora do navegador não há onde descarregar. O teste passa a
registar a chamada e a confirmar o nome do ficheiro, sem gravar nada no disco. No navegador, a exportação continua
igual.

## Riscos e limitações

- **O AI Studio pode reescrever o `bun.lock`.** Se voltar a fixar versões antigas, o `npm audit` volta a acusar. Depois
  do Pull no AI Studio, convém confirmar que o `package.json` ainda tem o `xlsx` da SheetJS e o `overrides`.
- **O `xlsx` vem de fora do npm.** Se o `cdn.sheetjs.com` estiver em baixo, a instalação falha. A versão está fixada
  (0.20.3) e o ficheiro tem a assinatura no `bun.lock` e no `package-lock.json`.
- **Teste manual em falta:** importar e exportar um Excel na app publicada (plantel e jogos), com um ficheiro sem dados
  reais.

## Reversão

`git revert` do merge e um novo Pull no AI Studio. Não mexe em dados.
