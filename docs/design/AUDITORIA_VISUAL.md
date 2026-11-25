# Auditoria visual da BolaComVisão

**Fase 1 do projeto de evolução visual.** Nesta fase não se alterou nenhum código da app.

## Como foi feita

- **App avaliada:** a `main` em `53b529b`, a correr no computador e ligada só ao emulador do Firebase.
- **Dados:** os dados fictícios dos testes de ecrã: equipa "Dragões Sub-11", 10 atletas, 2 jogos e 2 treinos feitos,
  e um jogo hoje com o Abrantes.
- **Conta:** um treinador principal.
- **Capturas:** em `capturas/antes/`, de dois tamanhos:
  - **telemóvel**, Pixel 7 (412 × 915), em `mobile/`; os ficheiros `*-ecra.jpg` mostram o que se vê sem deslizar;
  - **computador**, 1440 × 900, em `desktop/`.
- **Também se leu o código:** os tokens em `src/index.css`, as classes `ui-*` e as contagens abaixo. Serviu para
  explicar o que se vê, não para substituir a avaliação visual.

**Limitações:**

- **Não captado:** o Pré-jogo no telemóvel, o Modo Jogo ao vivo, o Modo Carreira, o "O Meu Percurso", os ecrãs dos encarregados e o modo sol.
  Ficam para a auditoria de cada módulo.
- **Captura de ecrã inteiro:** a app desliza dentro de uma caixa própria e não na página, por isso as capturas de
  página inteira cortam o fim. As de ecrã (`*-ecra.jpg`) são as fiáveis.
- **O aviso "Offline" nas capturas de computador** vem do navegador de teste e não é um defeito da app.

### Números do código (contexto)

| O quê                                                                       | Quantidade            |
| --------------------------------------------------------------------------- | --------------------- |
| Ficheiros de componentes (`.tsx`)                                           | 99                    |
| Componentes de janela (`*Modal*`)                                           | 23                    |
| Usos das classes partilhadas `ui-btn` / `ui-card` / `ui-input` / `ui-badge` | 1140 / 317 / 288 / 93 |
| Tamanhos de letra soltos em píxeis (`text-[11px]`, …)                       | **997**               |
| Usos da letra de títulos (Chakra Petch)                                     | 219                   |
| Cores escritas à mão (`#xxxxxx`) nos componentes                            | 36                    |
| Sombras à medida (`shadow-[…]`)                                             | 58                    |

**Leitura:** já existe uma base de design boa (as cores `ui-*` e os botões, cartões e campos partilhados), mas os
ecrãs passam-lhe muitas vezes por cima. Isto vê-se sobretudo nos tamanhos de letra: há 997 tamanhos escritos à mão, e
por isso não há uma escala tipográfica real.

---

## Resumo: os 10 problemas principais

| #   | Problema                                                                                         | Gravidade     | Prioridade |
| --- | ------------------------------------------------------------------------------------------------ | ------------- | ---------- |
| P1  | A cor principal é azul-ciano, e não o verde da marca; o fundo é azul-marinho, e não preto        | Alta          | 1          |
| P2  | Títulos repetidos: o cabeçalho e um "hero" grande dizem a mesma coisa em quase todos os ecrãs    | Alta          | 1          |
| P3  | O Início não responde logo ao "o que tenho hoje / o que tenho de fazer"                          | Alta          | 1          |
| P4  | A navegação muda de forma de módulo para módulo (separadores em 3 níveis e em sítios diferentes) | Alta          | 2          |
| P5  | Cartões a mais: tudo é uma caixa com borda, incluindo números isolados                           | Média         | 2          |
| P6  | Tipografia sem escala: itálico gigante nos títulos e 997 tamanhos soltos                         | Média         | 2          |
| P7  | Emojis misturados com ícones de linha nos botões e campos                                        | Média         | 2          |
| P8  | Ações repetidas: o mesmo botão aparece 2 a 4 vezes no mesmo ecrã                                 | Média         | 3          |
| P9  | Cores sem significado fixo: verde, amarelo e ciano usados por gosto, não por estado              | Média         | 3          |
| P10 | Defeitos de pormenor: ícones por cima do texto, separadores cortados, avisos por cima de botões  | Baixa a média | 3          |

---

## Problemas em detalhe

### P1 · A cor e o fundo não são os da marca

- **Exemplos:**
  - Em todos os ecrãs, o botão principal, o separador ativo e as ligações são ciano `#22c3ee`.
  - Em Definições do clube (`mobile/12-definicoes-ecra.jpg`), a "Cor principal da app" vem com o ciano escolhido.
  - O fundo é `#0b1220` (azul-marinho) e as superfícies são `#111a2b`.
  - O verde só aparece como "sucesso" (pontos de estado, "Iniciar Jogo" na Agenda, visto da Convocatória).
- **Impacto:**
  - A identidade preto, verde e branco não se reconhece.
  - O verde da marca, quando aparece, confunde-se com "está tudo bem".
  - O azul-marinho dá um ar de "painel técnico" e não de produto desportivo premium.
- **Solução:**
  - Fundo **preto neutro** e superfícies em cinzento quase preto.
  - O **verde BolaComVisão** reservado para a ação principal e o estado ativo.
  - "Sucesso" usa um verde diferente e vai sempre com ícone e texto.
  - A cor do clube continua a poder ser escolhida; o verde passa a ser a cor de origem.
  - Ver o `DESIGN_SYSTEM.md`, §1.
- **Prioridade:** 1. Tudo o resto depende disto.

### P2 · Títulos repetidos e "heros" que gastam o ecrã

- **Exemplos:**
  - **Plantel** (`mobile/03-plantel-ecra.jpg`): o cabeçalho diz "Plantel · Dragões · Sub-11", o separador diz
    "Plantel 10" e o hero repete "Plantel · Dragões · Sub-11 · Época 2026/2027" em itálico gigante. São três vezes
    "Plantel" antes do primeiro atleta, e o primeiro atleta só aparece a 70 % da altura do ecrã.
  - **Agenda** (`mobile/05-agenda-ecra.jpg`): o cabeçalho diz "Agenda" e o hero diz "Planeamento". Os dois títulos não
    coincidem.
  - **Treinos** e **Época** (`06`, `07`): o mesmo padrão, título, hero e separadores.
  - **Início no computador** (`desktop/02-inicio.jpg`): "BolaComVisão" aparece na barra lateral e outra vez no hero.
    O hero "Bem-vindo, Mister!" ocupa 260 px e não dá nenhuma informação.
- **Impacto:**
  - O treinador desliza sempre antes de chegar ao que interessa.
  - No telemóvel, os heros comem entre 15 e 30 % do primeiro ecrã.
- **Solução:**
  - **Um só título por ecrã,** no cabeçalho.
  - **Tirar os heros dos módulos.** O contexto (equipa e época) fica numa linha pequena por baixo do título.
- **Prioridade:** 1.

### P3 · O Início não responde às três perguntas do treinador

- **Exemplos (`mobile/02-inicio-ecra.jpg`, `desktop/02-inicio.jpg`):**
  - **A ordem não ajuda:** primeiro o aviso do resumo da semana, depois o hero de boas-vindas, só depois o jogo de
    hoje, e depois "Próximo treino" e "Próximo jogo".
  - **O jogo repete-se:** no computador, o jogo com o Abrantes aparece duas vezes, no cartão "Hoje" e em "Próximo
    jogo".
  - **O resumo da semana repete-se:** o aviso no topo e o cartão "Resumo da semana".
  - **As tarefas estão espalhadas:** a convocatória por fechar só aparece como "⚠ Convocatória por fechar" dentro do
    cartão do próximo jogo.
- **Impacto:** "o que tenho de fazer" não tem resposta num só sítio, e as tarefas escondem-se em cartões
  diferentes.
- **Solução:**
  - Um Início com três blocos por esta ordem: **Hoje**, **Tarefas** e **A seguir**.
  - Os atalhos ficam numa fila.
  - Ver a proposta em `PROPOSTA_DASHBOARD.md`.
- **Prioridade:** 1, por ser o primeiro ecrã do plano.

### P4 · A navegação não segue uma regra única

- **Exemplos:**
  - **Telemóvel:** a barra de baixo tem cinco grupos (Início, Equipa, Planeamento, Jogo, Clube).
    - **Equipa:** os separadores ("Plantel 10 · Assiduidade · Testes · Equipa técnica · …") estão **dentro** da
      página e cortados à direita (`03-plantel-ecra.jpg`).
    - **Planeamento:** os separadores (Agenda · Treinos · Época) estão **por baixo do hero**. Em Treinos há ainda
      **um terceiro nível** (Sessões · Presenças · Exercícios), sublinhado (`06-treinos-ecra.jpg`).
    - **Jogo:** os separadores (Pré-jogo · Ao vivo · Resultados · Análise) estão **acima do cabeçalho**
      (`09-resultados-ecra.jpg`). Em Análise há ainda **mais um nível** (Visão geral · Atletas · Jogos ·
      Relatórios).
  - **Computador:** a barra lateral tem 11 entradas e nomes diferentes dos do telemóvel ("Pré-jogo e Modo Jogo" contra
    "Jogo").
  - **As engrenagens querem dizer coisas diferentes:** a do cabeçalho abre "Definições do clube"; no Plantel, cada
    atleta tem uma engrenagem que quer dizer "Editar".
- **Impacto:** o treinador tem de reaprender onde estão as coisas em cada módulo, e as funções de segundo nível ficam
  escondidas.
- **Solução:**
  - Uma só estrutura: **barra de baixo** (5 grupos), e depois **um** controlo segmentado, sempre logo por baixo do
    título.
  - Um terceiro nível só quando for mesmo preciso, como filtro e não como separador.
  - Nomes iguais no telemóvel e no computador.
- **Prioridade:** 2. Precisa da tua decisão sobre a estrutura (decisão 7 da auditoria anterior).

### P5 · Cartões a mais

- **Exemplos:**
  - **Plantel:** 4 cartões de números (Atletas, Disponíveis, Lesionados, Suspensos), cada um com borda, ícone e
    traço colorido, todos dentro de outro cartão (o hero).
  - **Época** (`07-epoca-ecra.jpg`): 4 cartões de números, depois um cartão com um anel de 0 %, depois um cartão dentro
    do cartão ("Objetivos do mês") e outro ("Trabalhado no mês").
  - **Treinos:** o "Sem treino agendado" é um cartão dentro de outro cartão.
- **Impacto:** o ecrã fica pesado. Tudo tem o mesmo peso visual, por isso nada se destaca, e os números a zero
  ocupam tanto espaço como os importantes.
- **Solução:**
  - **Cartão só para o que é uma unidade clicável ou um grupo com sentido.**
  - Os números passam a uma **faixa de indicadores** (uma linha, sem caixas), e os zeros ficam discretos.
  - Nunca cartão dentro de cartão.
- **Prioridade:** 2.

### P6 · Tipografia sem escala

- **Exemplos:**
  - **Itálico gigante:** os títulos dos heros ("Plantel", "Treinos", "Época", "Bem-vindo, Mister!", "Escolher
    Equipa") em Chakra Petch itálico extra-negrito, a 40 a 56 px.
  - **Etiquetas:** em maiúsculas com espaçamento largo ("ATLETAS", "TREINOS REALIZADOS", "PRÓXIMO TREINO"), que
    competem com os títulos.
  - **Escala:** 997 tamanhos soltos no código, do `text-[9px]` ao `text-[15px]`.
- **Impacto:** é difícil saber o que é título, o que é etiqueta e o que é valor. O itálico pesado também lembra um
  jogo de vídeo, mais do que um produto de gestão.
- **Solução:**
  - **Uma família para a interface** (Plus Jakarta Sans, já carregada) com 6 tamanhos.
  - **Chakra Petch só para marcadores e números grandes** (resultado, cronómetro), sem itálico.
  - As etiquetas passam a ser pequenas, em caixa normal e com peso médio.
- **Prioridade:** 2.

### P7 · Emojis misturados com ícones de linha

- **Exemplos:**
  - **Entrada** (`mobile/00-entrada.jpg`): 🔑 Entrar, ✍️ Criar Conta, 🛡️ no selo. Nos campos, 🕵️ e 🔒 aparecem
    **por cima** do texto de exemplo ("🕵️x: treinador…").
  - **Convocatória:** 🖼️ Equipa inicial, 🗺️ Como chegar, 💬 WhatsApp, 🖼️ Imagem para os pais.
  - **Análise:** 🔍 na pesquisa e ⚙️ em "Filtros avançados", ao lado de ícones de linha.
  - **Escolher equipa:** 🚪 para sair.
  - **Agenda:** 🏟️ em "Em casa" e 🏆 em "Jornada 5".
- **Impacto:** o aspeto fica amador e inconsistente. Os emojis também mudam de desenho entre Android, iPhone e
  Windows.
- **Solução:** usar só a família de ícones de linha que a app já tem na barra de navegação. Os emojis ficam só para o
  texto que se partilha (WhatsApp).
- **Prioridade:** 2. É barato e com muito ganho.

### P8 · A mesma ação repetida no mesmo ecrã

- **Exemplos:**
  - **Agenda:** "+ Treino" aparece três vezes (no cartão "Próximo treino", na fila "+ Treino / + Jogo / + Reunião" e
    no botão flutuante "+").
  - **Escolher equipa:** "Entrar →" no cartão e "Entrar no Dragões Sub-11 →" em baixo, com um aviso por cima.
  - **Início:** "Ver Convocatória" no cartão do jogo e "Convocatória por fechar" no cartão seguinte.
- **Impacto:** o treinador fica na dúvida se fazem coisas diferentes, e há mais ruído.
- **Solução:** **uma ação principal por ecrã**, e as secundárias num sítio previsível.
- **Prioridade:** 3.

### P9 · As cores não querem dizer sempre o mesmo

- **Exemplos:**
  - **Resultados** (`09-resultados-ecra.jpg`): o 0-0 aparece em amarelo e o 1-2 em verde. Não se percebe que o
    amarelo é "empate" e o verde é "vitória", porque o resultado está escrito na ordem casa-fora e o jogo foi fora.
  - **Convocatória:** o texto dos atletas aparece em amarelo (um alerta) e o visto em verde, na mesma linha.
  - **Análise:** "Repor" é um botão vermelho, como se apagasse alguma coisa.
- **Impacto:** a cor deixa de ajudar a ler, e um alerta perde força.
- **Solução:**
  - **Cores semânticas com regra:** verde para sucesso ou vitória, âmbar para aviso ou empate, vermelho para erro,
    derrota ou ação destrutiva.
  - Nos resultados, uma etiqueta **V / E / D** ao lado do resultado.
  - O vermelho fica só para o que apaga.
- **Prioridade:** 3.

### P10 · Defeitos de pormenor

| Onde                  | O quê                                                                              | Captura                               |
| --------------------- | ---------------------------------------------------------------------------------- | ------------------------------------- |
| Entrada               | Os ícones 🕵️ e 🔒 ficam por cima do texto de exemplo e dos pontos da palavra-passe | `mobile/00-entrada.jpg`               |
| Plantel               | Separadores cortados à direita, sem sinal de que há mais                           | `mobile/03-plantel-ecra.jpg`          |
| Plantel               | "Procurar atle…": a pesquisa fica cortada pelos 4 botões ao lado                   | `mobile/03-plantel-ecra.jpg`          |
| Escolher equipa       | O aviso "Bem-vindo, Treinador A!" fica por cima do botão de entrar                 | `mobile/01-escolher-equipa.jpg`       |
| Início (computador)   | O aviso "Modo Offline" fica por cima do botão do cartão "Próximo jogo"             | `desktop/02-inicio.jpg`               |
| Início                | "Época 2026/…" cortado no hero do telemóvel                                        | `mobile/02-inicio-ecra.jpg`           |
| Emblema               | Um "D" genérico num escudo azul em todo o lado, mas outro emblema em Definições    | `12-definicoes-ecra.jpg`              |
| Análise               | Linhas de tendência com apenas 2 pontos, que não dizem nada                        | `mobile/10-analise-ecra.jpg`          |
| Pré-jogo (computador) | Os campos de texto ocupam 1100 px de largura, demasiado para ler e escrever        | `desktop/08-pre-jogo-e-modo-jogo.jpg` |

---

## Avaliação por ecrã (de 1 a 5)

Pelos critérios que definiste: aspeto profissional, consistência, facilidade de uso, hierarquia, qualidade dos
componentes, telemóvel, identidade da marca e ausência de elementos a mais.

| Ecrã                | Profissional | Consistência | Facilidade | Hierarquia | Componentes | Telemóvel | Marca | Sem excessos | Nota |
| ------------------- | ------------ | ------------ | ---------- | ---------- | ----------- | --------- | ----- | ------------ | ---- |
| Entrada             | 3            | 2            | 4          | 3          | 2           | 4         | 2     | 3            | 2,9  |
| Escolher equipa     | 3            | 3            | 3          | 3          | 3           | 3         | 2     | 2            | 2,8  |
| Início              | 3            | 3            | 3          | 2          | 3           | 3         | 2     | 2            | 2,6  |
| Plantel             | 3            | 3            | 3          | 2          | 3           | 3         | 2     | 2            | 2,6  |
| Convocatória        | 3            | 3            | 4          | 3          | 3           | 4         | 2     | 3            | 3,1  |
| Agenda              | 3            | 2            | 3          | 3          | 3           | 3         | 2     | 2            | 2,6  |
| Treinos             | 3            | 3            | 3          | 3          | 3           | 3         | 2     | 2            | 2,8  |
| Época               | 3            | 3            | 3          | 2          | 3           | 3         | 2     | 2            | 2,6  |
| Resultados          | 3            | 3            | 4          | 3          | 3           | 4         | 2     | 4            | 3,3  |
| Análise             | 3            | 2            | 3          | 3          | 3           | 3         | 2     | 2            | 2,6  |
| Clube               | 4            | 4            | 4          | 4          | 4           | 4         | 2     | 4            | 3,8  |
| Definições do clube | 4            | 3            | 4          | 4          | 3           | 4         | 2     | 4            | 3,5  |

- **O melhor exemplo é o Clube** (`mobile/11-clube-ecra.jpg`): uma lista agrupada, um título só, ícones de linha
  coerentes e nenhum hero. É a base do estilo que proponho.
- **Os mais fracos são o Início, o Plantel, a Época e a Análise.** Coincidem com os primeiros da ordem que definiste,
  por isso o plano começa onde o ganho é maior.

## Acessibilidade (verificação de cores)

| Par                                              | Contraste | WCAG AA (4,5 texto normal)  |
| ------------------------------------------------ | --------- | --------------------------- |
| Texto `#e7eef7` em superfície `#111a2b`          | 14,9 : 1  | ✅                          |
| Texto discreto `#8b9bb4` em superfície `#111a2b` | 6,2 : 1   | ✅                          |
| Texto discreto `#8b9bb4` em superfície `#1c2a44` | 5,1 : 1   | ✅                          |
| Ciano `#22c3ee` em fundo `#0b1220` (ligações)    | 9,0 : 1   | ✅                          |
| Texto `#04202b` em botão ciano                   | 8,1 : 1   | ✅                          |
| Etiquetas de 11–12 px em maiúsculas espaçadas    | —         | ⚠️ legíveis, mas cansativas |

- **O contraste está bem tratado.** O problema de legibilidade está no tamanho e na forma das etiquetas, e no itálico.
- **Áreas de toque:** cumprem os 44 px na barra de baixo e nos botões principais. Os filtros em forma de pílula
  ("GR", "Defesas", …) ficam perto do limite (cerca de 36 px).
