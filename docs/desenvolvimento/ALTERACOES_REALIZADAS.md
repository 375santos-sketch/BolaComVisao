# Alterações realizadas

Registo por intervenção, a mais recente no topo.

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
