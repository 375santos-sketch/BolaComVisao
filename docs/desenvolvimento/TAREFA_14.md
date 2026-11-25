# Tarefa 14 de desenvolvimento: P1-05, IA com dados mínimos

Ramo `fix/p1-05-ia-dados-minimos`, a partir de `main`.

## O que mudou

- **Os nomes dos atletas já não vão para a IA.** Na crónica do jogo e na mensagem do resumo da semana, cada nome passa
  a um código (J1, J2…) antes de sair do aparelho. Quando o texto volta, os códigos são trocados outra vez pelos nomes,
  no próprio aparelho. O servidor e o Gemini só veem os códigos.
  - `src/lib/aiPseudonyms.ts`: os códigos, a troca no texto livre (nome completo, primeiro nome e alcunha, o mais
    longo primeiro, com acentos e sem olhar a maiúsculas) e a reposição.
  - `src/services/chronicle.ts`: `writeChronicle` e `writeNewsletterIntro` recebem o plantel e aplicam os códigos
    sempre. Nenhum ecrã consegue enviar os nomes por engano.
  - Na crónica, os marcadores vão em código. No resumo vão em código os marcadores e qualquer nome do plantel escrito
    nos destaques.
  - As instruções ao Gemini dizem que os jogadores vêm como códigos, para os escrever tal e qual e sem artigo antes
    ("golo de J1").
  - O texto simples que a app faz sozinha, quando a IA falha, continua com os nomes, porque nunca sai do aparelho.
- **Aviso nos destaques** do resumo da semana: ao tocar em «Escrever com IA», os destaques seguem para a IA com os
  nomes em código, e não se devem escrever dados de saúde nem outros dados pessoais dos atletas.
- **Registo mínimo de uso** no servidor: uma linha por pedido às rotas de IA (`/api/cronica`, `/api/ler-jornada`,
  `/api/exercicio-ia`), com a rota, a conta em hash curto (SHA-256, 10 caracteres), o resultado e a data. Nunca o
  uid, o e-mail ou o conteúdo do pedido ou da resposta (`aiUsageLine` em `src/lib/aiAccess.ts`).

## Testes

| Teste                                                                                                                      | Resultado  |
| -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `aiPseudonyms.test.ts`: códigos e reposição, acentos, maiúsculas, o nome mais longo primeiro, nomes repetidos, J1 e J10    | ✅ 7/7     |
| `aiMinimalData.test.ts`: o pedido da crónica e o do resumo não levam nenhum nome do plantel, e o texto final tem os certos | ✅         |
| `aiMinimalData.test.ts`: a linha de uso não tem o uid e o resultado vem do código HTTP                                     | ✅         |
| Testes já existentes da crónica, do resumo e do acesso à IA                                                                | ✅         |
| `npm test`                                                                                                                 | ✅ 758/758 |
| Tipos, lint, build                                                                                                         | ✅         |

Todos os testes usam dados fictícios.

**Falta, antes do merge:** um teste à mão com o Gemini real. Pedir uma crónica e uma mensagem do resumo e confirmar
que o texto sai natural, com os nomes certos e sem códigos à vista. A pré-visualização do aviso também não foi vista
no ecrã nesta tarefa; fica para os testes de ecrã do CI.

## Riscos e limitações

- **Palavras iguais a nomes:** nos destaques, uma palavra igual ao nome de um atleta passa a código. Por exemplo, num
  plantel com uma Vitória, "Grande vitória" vira "Grande J4" e o texto pode tratá-la como uma pessoa. É raro, mas
  convém rever o texto antes de publicar (já é o que a app pede).
- **O Gemini pode escrever "do J1"** apesar da instrução. Depois da reposição fica "do Rui", que está certo para
  rapazes, mas não para raparigas ("do Inês"). O teste com o Gemini real serve para ver se isto acontece.
- **Os destaques continuam a ser texto livre.** O aviso não impede ninguém de escrever lá dados de saúde: só avisa.
- **O registo de uso** fica nos registos do servidor (Cloud Run) e desaparece com eles. Não é uma base de dados.

## Deixado para decisão

- **O interruptor de IA por clube** (parte do objetivo da P1-05) não está feito. Falta decidir:
  - quem o desliga: o Administrador da plataforma ou o responsável do clube;
  - o valor por defeito: ligado ou desligado.

## Reversão

`git revert` do merge e um novo Pull no AI Studio. Não mexe em dados.
