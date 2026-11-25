# Plano de evolução visual, por módulos

Segue a ordem que definiste: **Dashboard → Plantel → Treinos → Jogos → Convocatórias → Estatísticas e análise →
restantes.**

## Regras de cada etapa

1. **Um módulo por vez,** num ramo e num PR próprios. Nunca integrado na `main` por mim.
2. **Capturas do antes e do depois** no telemóvel (412 px) e no computador (1440 px), com os dados fictícios do
   emulador, na pasta `docs/design/capturas/<módulo>/`. **Sem capturas, a alteração não se aprova.**
3. **Avaliação com os teus 8 critérios,** de 1 a 5, antes e depois. Só avança quando a nota sobe em todos e nenhum
   fica abaixo de 4.
4. **Os testes de ecrã (Playwright)** e os unitários continuam a passar. Os textos que os testes procuram só mudam se
   o próprio teste for atualizado no mesmo PR, e isso fica escrito no PR.
5. **Não mexe** em regras de negócio, permissões, Firestore, dados nem funcionalidades. Não entra nenhuma biblioteca
   nova.
6. **Paro e aguardo a tua aprovação** antes do módulo seguinte.

## As etapas

| Etapa | Módulo                                    | O que muda                                                                                                                                                                                                                                                          | Depende de                            |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **0** | **Base do Design System**                 | Os tokens de cor (preto e verde), a escala de letra, os raios e as sombras em `src/index.css`; o novo desenho de `ui-btn`, `ui-card`, `ui-input`, `ui-badge` e da moldura das janelas. A app inteira muda de cor de uma vez; os ecrãs ainda não mudam de estrutura. | A tua aprovação do `DESIGN_SYSTEM.md` |
| **1** | **Dashboard (Início)**                    | A proposta de `PROPOSTA_DASHBOARD.md`: Hoje, Tarefas, A seguir, A equipa, Atalhos.                                                                                                                                                                                  | Etapa 0                               |
| **2** | **Plantel**                               | Sai o hero; os números passam a faixa; a lista de atletas fica no padrão das listas; os separadores deslizam com aviso; a pesquisa ganha largura; a engrenagem por atleta passa a toque na linha.                                                                   | Etapa 0                               |
| **3** | **Treinos** (com Agenda e Época)          | Sai o hero "Planeamento"; um só nível de separadores; "+ Treino" uma só vez; os cartões de zeros passam a uma faixa; estado vazio com uma ação.                                                                                                                     | Etapa 0                               |
| **4** | **Jogos** (Pré-jogo, Ao vivo, Resultados) | Os separadores no mesmo sítio dos outros módulos; resultados com V/E/D; o Pré-jogo com formulário a 640 px; o marcador do Modo Jogo em Chakra Petch.                                                                                                                | Etapa 0                               |
| **5** | **Convocatórias**                         | Os emojis passam a ícones; o alerta de minutos fica numa linha clara; a ação "Finalizar" é a única verde.                                                                                                                                                           | Etapa 0                               |
| **6** | **Estatísticas e análise**                | Os filtros simplificados ("Repor" deixa de ser vermelho); os gráficos com a regra dos 4 pontos; as tabelas passam a listas no telemóvel.                                                                                                                            | Etapa 0                               |
| **7** | **Restantes**                             | Entrada e criação de conta, Escolher equipa, Clube e Definições, Mais, Modo Carreira, O Meu Percurso, a página dos encarregados, o modo sol. Um PR por grupo.                                                                                                       | Etapa 0                               |

## Decisões que preciso de ti

1. **Aprovar a paleta:** preto `#0A0B0C` e verde `#2EDB74` como cor de origem, com "sucesso" em verde-água
   `#34C3A0` para não se confundir com a marca. Ou outro tom de verde que já uses (por exemplo, o do logótipo ou o do
   Instagram).
2. **A cor do clube:** fica como está (o clube pode trocar a cor principal), ou a app passa a usar sempre o verde da
   marca e a cor do clube só no emblema?
3. **A navegação (P4):** os mesmos 5 grupos no telemóvel e no computador, com um só nível de separadores. Esta é a
   decisão 7 da auditoria anterior.
4. **A letra:** confirmar que as letras saem do itálico gigante e que o Chakra Petch fica só nos marcadores.
5. **O Início:** aprovar a proposta, ou dizer o que mudar.

## Estimativa

| Etapa           | Esforço | PRs          |
| --------------- | ------- | ------------ |
| 0 · Base        | M       | 1            |
| 1 · Dashboard   | M       | 1            |
| 2 a 6 · Módulos | M cada  | 1 por módulo |
| 7 · Restantes   | L       | 3 a 4        |
