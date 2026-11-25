# Etapa 4: Jogos (Pré-jogo, Ao vivo, Resultados)

Quarta etapa do [plano de evolução](PLANO_EVOLUCAO.md), feita depois de aprovado Treinos (25/11).

## O que mudou

| Onde                                                              | Antes                                                           | Depois                                                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Separadores Pré-jogo · Ao vivo · Resultados · Análise (telemóvel) | Por cima da barra do título, em pílulas com o ativo verde cheio | Por baixo da barra do título, sublinhados, no mesmo sítio e com o mesmo desenho do Plantel e do Planeamento       |
| Resultados: cada jogo                                             | Resultado num quadrado colorido (só a cor dizia V, E ou D)      | O resultado em branco e uma etiqueta **V / E / D** com a cor (nunca só a cor)                                     |
| Resultados: pesquisa                                              | Campo azul antigo, sem ícone                                    | O campo do Design System, com lupa, a 44 px                                                                       |
| Resultados: "Classificação do campeonato"                         | Barra verde a toda a largura                                    | Botão secundário com ícone (o verde fica para a ação principal)                                                   |
| Resultados: torneios                                              | "🏆 Nome do torneio"                                            | Só o nome                                                                                                         |
| Pré-jogo                                                          | Formulário a toda a largura no computador                       | Até 640 px, centrado; o cartão do jogo sem a faixa de cor; títulos "Adversário" e "Bolas paradas" em caixa normal |
| Pré-jogo sem jogos                                                | "📅 Ir para a Agenda"                                           | Ícone e botão secundário                                                                                          |
| Modo Jogo: marcador                                               | Letra da interface, com brilho azul no fundo                    | Chakra Petch (a letra dos marcadores), fundo liso                                                                 |
| Agenda: cartão do jogo (e dos treinos, eventos e ausências)       | Cerca de 50 emojis (🗑️ ✏️ 🗺️ 📋 🏆 📅 📍 👥 🟢 …)               | Ícones de linha. "Em Casa 🏟️" e "Fora ✈️" passam a "Em casa" e "Fora"                                             |
| Agenda: botões do jogo                                            | "Como chegar" verde e "Iniciar Jogo" verde-água                 | "Como chegar" secundário; "Iniciar Jogo" é a única ação verde                                                     |

## O que não mudou

- Nenhuma função, dado, permissão ou regra.
- **Os textos de partilha** (WhatsApp, por exemplo) mantêm os emojis, porque são mensagens para os pais e não ecrã
  da app.
- **O ecrã do Modo Jogo ao vivo** (os botões usados sob pressão) só ganhou o marcador novo. Mexer nos botões precisa
  de um teste num jogo real.
- **Análise:** tem emojis próprios ("🏠 Casa", "✈️ Fora", "🏟️ Jogos"). Ficam para a etapa 6 (Estatísticas e
  análise).
- **O hero "Planeamento"** ainda aparece na captura da Agenda, porque este ramo saiu da `main` antes do PR #201
  (Treinos). Com os dois integrados, desaparece.

## Código

- **`headerBelow.ts`** (novo), **`Header.tsx`** e **`App.tsx`:** os separadores de Jogo passam por baixo da barra
  do título de cada ecrã.
- **`ui/SubNavTabs.tsx`:** separadores sublinhados. Só a área de Jogo os usa.
- **`ResultsView.tsx`:** V/E/D, pesquisa e botões.
- **`PreMatchView.tsx`:** 640 px, títulos e estado vazio.
- **`index.css`:** o marcador em Chakra Petch e sem brilho.
- **`ScheduleEventCard.tsx`** e **`scheduleService.ts`:** ícones em vez de emojis; pesos dos botões.
- **`ui/Icon.tsx`:** três ícones novos (caixote, lápis, alfinete).

## Testes

- **Tipos (`tsc`):** sem erros.
- **Unitários:** os 770 passam.
- **Lint:** sem avisos.
- **Testes de ecrã:**
  - os nomes que procuram mantêm-se ("Performance", "Resultado X-Y", "Como chegar", "Editar jogo", …);
  - correm no CI do PR.

## Capturas

- **Antes:** `capturas/etapa-1/depois/{mobile,desktop}/05-agenda*`, `08-pre-jogo*`, `09-resultados*`, `10-analise*`.
- **Depois:** `capturas/etapa-4/depois/{mobile,desktop}/`.
