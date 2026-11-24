# Tarefa 05 de desenvolvimento: P1-06, logótipo leve

Ramo `perf/p1-06-logotipo-leve`, a partir de `main` em `c74e174`. Aprovado pelo dono a 24/11/2026 ("Avança").

## Problema

O logótipo usado no ecrã de entrada, na escolha de equipa, no banner de instalação e no menu Mais era um JPEG de
1024×1024 com **853 KB**. Era o maior ficheiro da primeira abertura, e com rede fraca junto ao campo atrasava a
entrada. O maior tamanho a que aparece é 80 px.

## Solução

- **Nova cópia da mesma imagem com 256×256** (`src/assets/images/bolacomvisao_logo_256.jpg`, **23 KB**, −97 %).
  - Foi gerada a partir do original com o System.Drawing do Windows (qualidade 85), sem instalar nada.
  - 256 px chegam para 80 px em ecrãs de alta densidade (3×).
- **Os 4 ecrãs passam a importar a cópia nova:** `AuthView`, `TeamsHubView`, `InstallPwaBanner`, `MoreDrawer`.
- **`public/sw.js`:** sai da lista de pré-cache o caminho `/assets/images/bolacomvisao_logo_1786622535530.jpg`, que
  não existe (o build renomeia os ficheiros; o pedido falhava em silêncio).
- **O JPEG original fica no repositório**, mas já não entra no build. Retirá-lo é uma limpeza à parte (P3-03).

## Verificação

| Verificação                                                     | Resultado                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Build                                                           | ✅ O único logótipo no `dist/assets` é o novo: **23 KB** (antes: 853 KB)             |
| Ecrã de entrada no navegador (`vite` local, sem iniciar sessão) | ✅ A imagem carrega (256×256, mostrada a 64 px), sem erros na consola; captura feita |
| Tipos, lint, formatação                                         | ✅ (o `sw.js` está excluído do lint, como antes)                                     |
| Unitários                                                       | ✅ 114 ficheiros, 704 testes                                                         |
| Testes de ecrã                                                  | No CI                                                                                |

Os outros 3 ecrãs (escolha de equipa, banner, menu Mais) precisam de sessão iniciada. Usam o mesmo import e as mesmas
classes de tamanho (40–48 px, 28 px e 36 px). Ficam cobertos pelos testes de ecrã do CI.

## Riscos e limitações

- A imagem fica um pouco menos nítida se algum dia for mostrada acima de 256 px (hoje o máximo é 80 px).
- Os telemóveis com a versão antiga em cache continuam a usar a imagem antiga até reabrirem a app depois do Publish.
- Os ficheiros comuns (`ALTERACOES_REALIZADAS.md` e os outros) recebem esta tarefa depois do merge do PR 184, para
  não haver conflitos entre PRs.

## Reversão

`git revert` do merge e, no AI Studio, Pull e Publish. Sem efeito nos dados.
