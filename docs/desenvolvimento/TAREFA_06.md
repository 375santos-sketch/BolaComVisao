# Tarefa 06 de desenvolvimento: P1-01, offline garantido no dia de jogo

Ramo `perf/p1-01-offline`, a partir da correção do CI (`fix/ci-tipos-teste-travao`). Aprovado pelo dono a 24/11/2026
("Sim, avança P1-01").

## Problema

O service worker só guardava no telemóvel os ecrãs **já abertos com rede**. Um treinador que nunca tinha aberto o Ao
vivo (ou que acabou de receber uma versão nova, que muda os nomes dos ficheiros) não o conseguia abrir no campo sem
rede. Além disso, tudo era pedido primeiro à rede: com sinal fraco, cada ficheiro esperava antes de usar a cópia.

## Solução

- **`src/lib/precache.ts`:** escolhe os ficheiros a guardar na instalação.
  - Guarda sempre a entrada da app.
  - Guarda todos os ecrãs.
  - Guarda **tudo o que um ficheiro guardado importa de forma fixa**.
  - Ficam de fora só as bibliotecas pesadas carregadas a pedido: leitor de PDF, imagens para partilhar e mapas de
    código.
- **`vite.config.ts`:** um plugin escreve `precache-manifest.json` no build, com a lista e o id do build.
- **`src/main.tsx`:** regista `/sw.js?v=<id do build>`. Cada Publish instala um service worker novo com a lista nova.
- **`public/sw.js`:**
  - a cache tem o nome da versão;
  - na instalação guarda a lista, copiando da cache antiga os ficheiros que não mudaram (só se descarrega o que
    mudou);
  - os ficheiros de `/assets/` vêm **primeiro da cache** (o nome traz o conteúdo);
  - o HTML continua a vir da rede primeiro, para receber as atualizações;
  - as procuras na cache ignoram `Vary: Origin` (ver abaixo).

## Verificação no navegador (versão de produção, `vite preview`)

1. Abrir a app com o servidor ligado:
   - service worker ativo com `?v=<versão>`;
   - **118 ficheiros guardados, nenhum em falta**;
   - o Ao vivo guardado sem ter sido aberto.
2. Desligar o servidor (o mesmo que ficar sem rede) e recarregar:
   - **a app arranca** (ecrã de entrada);
   - **os 11 ecrãs principais abrem a partir do telemóvel, em 0–50 ms**: entrada, escolha de equipa, Início, Ao vivo,
     Convocatória, Pré-jogo, Resultados, Treinos, Agenda, Plantel e Análise.
3. Instalar uma versão nova: a cache antiga é apagada e a nova fica completa.

**Problemas encontrados e corrigidos durante a verificação:**

- **Excluir pelo nome partia ecrãs.** Pedaços pequenos da app com "pdf" no nome são importados de forma fixa. A
  lista passou a seguir as importações fixas indicadas pelo Rollup.
- **O servidor responde `Vary: Origin`.** Os ficheiros guardados a partir de pedidos de módulos não eram encontrados
  por pedidos sem esse cabeçalho, e a app não arrancava sem rede. A cache passou a ignorar o `Vary` em `/assets/`.
  É seguro, porque o nome traz o conteúdo.

## Testes

| Teste                                                                  | Resultado                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `precache.test.ts` (o que fica, o que sai, importações fixas, formato) | ✅ 6/6                                                                                                                                                                                                                                   |
| Unitários (toda a bateria)                                             | ✅ 116 ficheiros, 716 testes                                                                                                                                                                                                             |
| Tipos, lint, formatação, build                                         | ✅                                                                                                                                                                                                                                       |
| `sw.js` (sintaxe, `node --check`)                                      | ✅                                                                                                                                                                                                                                       |
| Prova sem rede no navegador                                            | ✅ (acima)                                                                                                                                                                                                                               |
| Teste de ecrã sem rede no CI                                           | ❌ **Não feito.** Os testes de ecrã correm no servidor de desenvolvimento, onde o service worker está desligado de propósito (`main.tsx`). Um teste automático precisaria de correr sobre o build de produção. Fica como tarefa à parte. |

## Riscos e limitações

- **Primeira instalação:** descarrega cerca de **4 MB** (a lista inteira), uma vez por aparelho. Nas atualizações, só
  os ficheiros que mudaram.
- **Sem rede não funciona:**
  - gerar PDFs e ler PDFs (as bibliotecas ficam de fora);
  - a importação e exportação de Excel funciona se o ecrã a tiver importado de forma fixa;
  - as funções de IA e o login (precisam do servidor).
- **O servidor do AI Studio** (`server.ts`, Express) serve o `precache-manifest.json` como ficheiro estático do
  `dist`, tal como serve os outros. Não foi testado no AI Studio: verificar depois do Publish.
- **Telemóveis com o service worker antigo:** passam ao novo na abertura seguinte com rede. A cache antiga
  (`bolacomvisao-cache-v5`) é apagada nessa altura.
- **Os dados** (jogos, atletas) já ficavam no aparelho antes. Esta tarefa trata só dos ficheiros da app.

## Reversão

`git revert` do merge e, no AI Studio, Pull e Publish. Os telemóveis voltam ao service worker anterior na abertura
seguinte com rede. Sem efeito nos dados.
