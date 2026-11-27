# Etapa 7d: Agenda

Quarta parte da etapa 7 (restantes módulos) do [plano de evolução](PLANO_EVOLUCAO.md), feita depois de aprovada a 7c
(27/11).

## O que mudou

| Onde                         | Antes                                                                   | Depois                                                                      |
| ---------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Cartões (jogo, treino, etc.) | Títulos em letra de máquina e âmbar, setas ↗, "✓ Concluir", "↩ Reabrir" | Título branco com seta de linha; ícones ✓ e ↩ de linha; rótulos curtos      |
| Reunião / formação           | 👥 🎓 🏕️ 📌, "REUNIÃO", cartão com contorno próprio e brilho            | Ícones de linha, "Reunião", cartão do Design System                         |
| Dia, mês, ano                | ◀ ▶, ⚽ ⚡ 👥 🚫, botões em degradê e maiúsculas                        | Setas de linha; os quatro botões "+ Jogo / Treino / Reunião / Indisponível" |
| Mês                          | Hoje com brilho azul, contadores com emoji no telemóvel                 | Hoje em verde; no telemóvel só o número de eventos                          |
| Ano                          | "Época / Ano Desportivo", "⚽ 2 ⚡ 3", dias com degradê                 | "Ano 2026"; "2 jogos · 3 treinos"; sem degradê                              |
| Lista                        | "🚫 Mister Rui", "Treino 3 (⚡ Tático)", "ESTA SEMANA"                  | "Mister Rui (indisponível)", "Treino 3 (Tático)", "Esta semana"             |
| Janelas (jogo, treino, etc.) | Emoji no título, MAIÚSCULAS, "✕" pequeno, etiquetas em letra de máquina | Cartão do Design System, fechar de 40 px, etiquetas em caixa normal         |
| Importar jogos, calendário   | 📷 🏠 ✈️ 🟢 🍎 📆 📋                                                    | Só texto ou ícones de linha                                                 |

## O que não mudou

- Nenhuma função, dado, permissão ou regra.
- **Os tipos de treino gravados** (por exemplo "⚡ Tático") ficam iguais. Só a lista e as janelas os mostram sem o emoji.
- O texto das mensagens (WhatsApp e calendário para os pais) e o conteúdo do ficheiro do calendário.
- As mensagens de aviso rápidas.

## Testes

- Tipos, lint e os 770 testes unitários passam. Os testes de ecrã correm no CI do PR.
- Os testes de ecrã passam a procurar "Guardar no calendário" e "Iniciar jogo", com os textos novos.

## Capturas

- **Antes:** `capturas/etapa-7d/antes/{mobile,desktop}/`. Os ficheiros são 01 semana, 02 dia, 03 mês, 04 ano, 05 lista,
  06 a 09 cartões abertos (jogo, treino, reunião, indisponível), 10 a 13 janelas para adicionar, 14 importar jogos e
  15 calendário para os pais.
- **Depois:** `capturas/etapa-7d/depois/{mobile,desktop}/`.
- Os dados são fictícios e vivem só no emulador. O guião cria um treino, uma reunião e uma indisponibilidade para hoje.
