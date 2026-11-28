# Etapa 6: Estatísticas e análise

Sexta etapa do [plano de evolução](PLANO_EVOLUCAO.md), feita depois de aprovadas as Convocatórias (25/11). Cobre o
ecrã Análise: Visão geral, Atletas (as Estatísticas), Jogos e Relatórios.

## O que mudou

| Onde                       | Antes                                                                         | Depois                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Topo                       | Hero "Análise 360°" em itálico, com brilho azul e uma grelha no fundo         | Uma linha: época e número de jogos, com "Exportar" (ícone) à direita                   |
| Partes da análise          | Pílulas com o ativo azul a brilhar                                            | Controlo segmentado igual ao de Treinos (ativo em branco, sem brilho)                  |
| Filtros                    | Cartão próprio, lupa em emoji, "⚙️ Filtros Avançados ▼", "✕ Repor" a vermelho | Sem cartão; pesquisa com lupa, "Mais filtros" e "Repor" como botões secundários, 44 px |
| Opções dos filtros         | Cada opção com emoji (⚽ 🎯 🚩 🟨 …)                                          | Só o texto                                                                             |
| Cartões                    | Linha de luz azul por cima de cada cartão; títulos em maiúsculas com emoji    | Cartões lisos; títulos em caixa normal, sem emoji                                      |
| Destaques (janelas)        | Degradês fortes, 🔥 e ⚠️ grandes                                              | Fundos lisos de sucesso e de perigo do Design System                                   |
| Cartões amarelos/vermelhos | 🟨 🟥                                                                         | Marcas de cartão desenhadas, com nome para leitores de ecrã                            |
| Casa / Fora                | "🏠 Casa" / "✈️ Fora"                                                         | "Casa" / "Fora"                                                                        |
| Minutos de jogo            | Cartão azul antigo                                                            | Cartão do Design System                                                                |
| Relatórios                 | Ícones em carácter (✦ 📑 📋 ▦ ⤓ ⊞) com brilho                                 | Ícones de linha, sem brilho                                                            |

## O que não mudou

- Nenhum cálculo, dado, permissão ou regra. Os filtros, os números e as exportações são os mesmos.
- **Os títulos** continuam na letra da app para títulos (Chakra Petch), como nos outros ecrãs.
- **As janelas** (Painel de estatísticas, Relatório do treinador, Relatório mensal) e a **Visão do treinador**
  (fechada por defeito) ficam para a etapa 7.

## Código

- **`GameAnalysisDashboard.tsx`:** topo sem hero, Exportar, Relatórios e a janela do período.
- **`gameAnalysis/*`** (12 ficheiros), **`stats/PlayingTimeSection.tsx`**, **`trends/TeamTrends.tsx`:** sem emojis e
  sem maiúsculas; destaques lisos.
- **`gameAnalysis/AnalysisFilters.tsx`:** a barra de filtros.
- **`index.css`:** sai a "sala de dados" (grelha, brilho, linha de luz); separadores e linhas com tokens.
- **`ui/Icon.tsx`:** ícone novo (descarregar).

## Testes

- **Tipos (`tsc`):** sem erros.
- **Unitários:** os 770 passam.
- **Lint:** sem avisos.
- **Testes de ecrã:** correm no CI do PR. Os nomes que procuram mantêm-se ("Partes da análise", "Remates", "Minutos
  de jogo", "Abrir painel", …).

## Capturas

- **Antes:** `capturas/etapa-6/antes/{mobile,desktop}/`.
- **Depois:** `capturas/etapa-6/depois/{mobile,desktop}/`.
- `-p2` e `-p3` são a mesma parte mais abaixo na página.
