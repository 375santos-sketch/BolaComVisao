# Tarefa 08 de desenvolvimento: avaliações antigas (1–5) só de leitura

Ramo `fix/avaliacoes-antigas-so-leitura`, a partir de `main` em `1f719b7`. Decisão 9 do dono (24/11/2026): "o botão de
apagar sai".

## O que mudou

- **`PlayerEvolutionSection.tsx`:** sai o botão ✕ (e as duas confirmações da P0-09) das avaliações antigas.
  - A lista, o radar e as notas continuam visíveis, como histórico.
  - O título diz "histórico só de leitura".
- **Novo teste `oldEvaluationsReadOnly.test.ts`:** nenhum ecrã da ficha do atleta cria nem apaga avaliações antigas,
  e a lista continua a ser mostrada.
- **Sem mudança nos dados:**
  - as avaliações guardadas ficam como estão;
  - `withoutEvaluation`/`withEvaluation` ficam em `lib/playerEvolution.ts`, usadas só pelos testes dessa biblioteca;
  - as competências (1–4) não mudam.

## Testes

| Teste                                                                               | Resultado                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------- |
| `oldEvaluationsReadOnly.test.ts`, `playerEvolution.test.ts`, `competencies.test.ts` | ✅ 10/10                                    |
| Tipos, lint, formatação                                                             | ✅                                          |
| Testes de ecrã                                                                      | Nenhum usava o botão retirado; correm no CI |

## Reversão

`git revert` do merge; no AI Studio, Pull e Publish. Sem efeito nos dados.
