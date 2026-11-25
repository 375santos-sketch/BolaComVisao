# Etapa 3: Treinos (com Agenda e Época)

Terceira etapa do [plano de evolução](PLANO_EVOLUCAO.md), feita depois de aprovado o Plantel (25/11).

## O que mudou

| Onde                                                       | Antes                                                                         | Depois                                                                                                                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topo de Agenda, Treinos e Época                            | Hero "Planeamento" (ou "Treinos", "Época") com estádio, mais os 3 botões      | Sai o hero; o título já está na barra de cima. Agenda · Treinos · Época ficam como um só nível de separadores, com linha verde no ativo                                                |
| Sessões · Presenças · Exercícios                           | Uma segunda fila de separadores sublinhados                                   | Um controlo segmentado (uma escolha dentro do ecrã), para não haver dois níveis de separadores iguais                                                                                  |
| "Esta semana"                                              | 3 caixas, com os zeros em verde                                               | Uma faixa com 3 valores; um zero fica cinzento                                                                                                                                         |
| Próximo treino vazio                                       | Cartão dentro de cartão                                                       | Um só bloco vazio, com uma ação ("+ Criar treino")                                                                                                                                     |
| Títulos (Esta semana, Últimas sessões, Minutos por semana) | MAIÚSCULAS ESPAÇADAS                                                          | Caixa normal                                                                                                                                                                           |
| Ações das sessões                                          | "✓ Treino de hoje" verde a toda a largura, "+ Novo" e "+ Vários" pequenos     | Treino de hoje (verde), Novo e Vários com ícones, todos a 44 px                                                                                                                        |
| Agenda: próximo treino e próximo jogo                      | Caixas encaixadas com rótulos em MAIÚSCULAS; vazias com "+ Treino" / "+ Jogo" | Cartões com rótulo em caixa normal e seta. **Vazios, mostram só uma linha discreta**: o "+ Treino" fica no dia (por baixo do calendário) e no botão "+", em vez de aparecer três vezes |

## O que não mudou

- Nenhuma função, dado, permissão ou regra.
- **O cartão do jogo na Agenda** (`ScheduleEventCard`, com emojis e vários botões verdes) **fica para a etapa 4 (Jogos)**, porque é o cartão do jogo.
- O calendário (dia, semana, mês, lista), o editor de treino, a biblioteca de exercícios e as presenças só herdam a base.
- **"Todas as sessões"** usa o `SectionHeader` partilhado por vários módulos. Muda quando esse componente mudar para todos.

## Código

- **`AgendaTabs.tsx`:** sem hero; separadores sublinhados. O `nav "Planeamento"` mantém-se.
- **`TrainingHeader.tsx`:** controlo segmentado.
- **`PlanningCards.tsx`:** "Esta semana" numa faixa, títulos em caixa normal e o estado vazio sem cartão duplo.
- **`TrainingList.tsx`:** botões com ícones e 44 px.
- **`NextUpCard.tsx`:** cartões novos; o estado vazio sem botão.

## Testes

- **Tipos (`tsc`):** sem erros.
- **Unitários:** os 770 passam.
- **Lint:** sem avisos.
- **Testes de ecrã:**
  - não foi preciso mudar nenhum, porque os nomes que procuram se mantêm ("Planeamento", "Treinos", "Época",
    "Treino de hoje", "+ Criar treino", "Sessões", "Exercícios", "Plano para o adjunto", "Próximo", "Últimas sessões");
  - correm no CI do PR.

## Capturas

- **Antes:** `capturas/etapa-1/depois/{mobile,desktop}/05-agenda*`, `06-treinos*`, `07-epoca*`.
- **Depois:** `capturas/etapa-3/depois/{mobile,desktop}/`.
