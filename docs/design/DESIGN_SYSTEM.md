# Design System BolaComVisão (proposta)

**Fase 2 do projeto de evolução visual.** Esta é uma proposta para aprovares e ainda não está aplicada na app. Para
ver como fica, há um exemplo real em `PROPOSTA_DASHBOARD.md` e em `mockups/dashboard.html`.

## Princípios

1. **Preto, verde, branco.** O verde é a cor da ação e do que está ativo, não da decoração.
2. **Um título, um objetivo.** Cada ecrã tem um só título e uma só ação principal.
3. **Menos caixas.** Um cartão é uma unidade clicável ou um grupo com sentido, e nunca há cartões dentro de cartões.
4. **Os números falam baixo até importarem.** Um zero é discreto, um alerta destaca-se.
5. **Primeiro o telemóvel, na mão do treinador, no campo:** toque confortável, contraste alto e as ações à vista.
6. **Construir sobre o que já existe.** As classes `ui-*` (`ui-btn`, `ui-card`, `ui-input`, `ui-badge`, …) mantêm
   os nomes e mudam por dentro. Não se cria uma segunda biblioteca de componentes.

---

## 1. Cor

### Escuro (o principal)

| Token (atual → proposto)   | Atual     | Proposto  | Uso                                                            |
| -------------------------- | --------- | --------- | -------------------------------------------------------------- |
| `--color-ui-bg`            | `#0b1220` | `#0A0B0C` | Fundo da app (preto neutro, sem azul)                          |
| `--color-ui-surface`       | `#111a2b` | `#131517` | Superfície: cartões, folhas, barra lateral                     |
| `--color-ui-surface-2`     | `#162238` | `#1B1E21` | Superfície elevada: campos, linhas ao passar o rato            |
| `--color-ui-surface-3`     | `#1c2a44` | `#24282C` | Selecionado, separador ativo neutro                            |
| `--color-ui-inset`         | `#0d1626` | `#0E1011` | Áreas encaixadas (por exemplo a fila dos indicadores)          |
| `--color-ui-line`          | `#22324d` | `#262A2E` | Linhas e bordas                                                |
| `--color-ui-line-strong`   | `#2f4466` | `#363B40` | Bordas de campos e foco neutro                                 |
| `--color-ui-text`          | `#e7eef7` | `#F5F7F6` | Texto principal (17,0 : 1 na superfície)                       |
| `--color-ui-muted`         | `#8b9bb4` | `#9BA3A0` | Texto secundário (7,1 : 1)                                     |
| `--color-ui-subtle` (novo) | —         | `#6B7370` | Só texto desativado e marcas de água (4,0 : 1)                 |
| `--color-ui-brand`         | `#22c3ee` | `#2EDB74` | **Verde BolaComVisão:** ação principal, ativo, foco (10,0 : 1) |
| `--color-ui-brand-strong`  | `#0ea5d0` | `#22B860` | Botão principal pressionado                                    |
| `--color-ui-brand-ink`     | `#04202b` | `#05210F` | Texto em cima do verde (9,3 : 1)                               |
| `--color-ui-success`       | `#22c55e` | `#34C3A0` | Sucesso, vitória: verde-água, diferente da marca (8,2 : 1)     |
| `--color-ui-warning`       | `#f5b301` | `#F2B33D` | Aviso, empate (9,8 : 1)                                        |
| `--color-ui-danger`        | `#ef4444` | `#F0605A` | Erro, derrota, apagar (5,7 : 1)                                |
| `--color-ui-*-soft`        | 12 %      | 12 %      | Fundo das etiquetas e dos avisos (a mesma regra de hoje)       |

### Modo sol (claro), para o campo ao sol

| Token   | Proposto  | Contraste                       |
| ------- | --------- | ------------------------------- |
| bg      | `#F4F6F5` | —                               |
| surface | `#FFFFFF` | —                               |
| text    | `#0B0C0D` | 19,6 : 1                        |
| muted   | `#5E6662` | 5,9 : 1                         |
| brand   | `#0E7A3A` | 5,4 : 1 (texto branco no botão) |
| success | `#0B735A` | 5,8 : 1                         |
| warning | `#8A5B0A` | 5,9 : 1                         |
| danger  | `#C2362F` | 5,4 : 1                         |

Todos os contrastes foram calculados (WCAG 2.1) e passam o AA para texto normal (4,5 : 1), exceto o `subtle`, que é só
para texto desativado.

### Regras da cor

- **Verde da marca:**
  - só no botão principal, no separador ou item ativo, nas ligações e no foco;
  - **no máximo um botão verde cheio por ecrã**.
- **As cores semânticas vão sempre com ícone ou texto,** nunca sozinhas:
  - nos resultados, uma etiqueta `V`, `E` ou `D` com a cor;
  - na disponibilidade, "Lesionado" em texto e não só o ponto.
- **O vermelho é só para erro, derrota e o que apaga.** "Repor filtros" não é vermelho.
- **A cor do clube** (Definições do clube → Cor principal) continua a funcionar. Substitui `--color-ui-brand`, e o
  verde passa a ser a cor de origem em vez do ciano. A app calcula `brand-ink` para manter o contraste com cores
  claras (amarelo, branco).
- **Nada de brilhos e gradientes azuis nos fundos** (os "heros" com estádio e luz). O fundo é liso; a marca está no
  verde e no logótipo.

---

## 2. Tipografia

**Uma família para a interface:** Plus Jakarta Sans, que já está carregada. Não entra nenhuma dependência nova.
**Chakra Petch** fica só para **marcadores e números grandes** (resultado, cronómetro, número da camisola na ficha),
sempre na vertical e nunca em itálico.

| Token              | Tamanho / linha | Peso | Uso                                               |
| ------------------ | --------------- | ---- | ------------------------------------------------- |
| `text-ui-display`  | 32 / 36         | 700  | Só números de destaque (resultado do jogo)        |
| `text-ui-headline` | 24 / 30         | 700  | Título do ecrã (um por ecrã)                      |
| `text-ui-title`    | 18 / 24         | 650  | Título de secção ou de cartão                     |
| `text-ui-lead`     | 16 / 24         | 500  | Texto principal no telemóvel, nomes nas listas    |
| `text-ui-body`     | 14 / 20         | 450  | Texto corrente, valores de tabela                 |
| `text-ui-caption`  | 12 / 16         | 500  | Etiquetas, datas e metadados, **em caixa normal** |

- **Os tokens já existem** (`--text-ui-*`). A mudança está em passar a **usá-los**: substituir aos poucos os
  `text-[Npx]` soltos, módulo a módulo, à medida que cada um é redesenhado.
- **As etiquetas em MAIÚSCULAS ESPAÇADAS desaparecem.** A exceção é o "kicker" de uma só palavra por cima de um
  número grande (por exemplo "HOJE").
- **Números em tabelas e indicadores:** `font-variant-numeric: tabular-nums`, para alinharem.

---

## 3. Espaçamento e grelha

- **Base de 4 px.** Escala: `4 · 8 · 12 · 16 · 24 · 32 · 48`.
- **Telemóvel:**
  - margem lateral de 16 px;
  - 12 px entre elementos do mesmo grupo e 24 px entre secções.
- **Computador:**
  - barra lateral de 240 px e conteúdo com um máximo de 1120 px;
  - grelha de 12 colunas com 24 px de intervalo;
  - **os formulários não passam de 640 px de largura**.
- **Altura mínima de toque: 44 px** (botões, itens de lista, separadores). Os filtros em pílula sobem de cerca de
  36 px para 40 px, com a área de toque alargada a 44.

## 4. Bordas, arredondamentos e sombras

| Token          | Valor         | Uso                                   |
| -------------- | ------------- | ------------------------------------- |
| `radius-ui-sm` | 8 px          | Etiquetas, campos pequenos, pílulas   |
| `radius-ui`    | 12 px         | Botões, campos, itens de lista        |
| `radius-ui-lg` | 16 px         | Cartões, folhas e janelas             |
| `shadow-ui-1`  | linha de 1 px | Cartões no escuro (sem sombra difusa) |
| `shadow-ui-2`  | difusa suave  | Só janelas, menus e folhas flutuantes |

- **No escuro, a profundidade dá-se pela superfície,** um tom mais claro, e não pela sombra.
- **Saem as 58 sombras à medida e os brilhos (`glow`) dos botões.**

## 5. Componentes

Todos já existem como classes `ui-*`. A proposta muda o desenho, não o nome, e por isso não mexe na lógica.

### Botões (`ui-btn`)

| Variante           | Aspeto                                     | Quando                                           |
| ------------------ | ------------------------------------------ | ------------------------------------------------ |
| `ui-btn-primary`   | Verde cheio, texto `brand-ink`             | A ação principal do ecrã (uma só)                |
| `ui-btn-secondary` | Superfície 2, borda de 1 px, texto branco  | Ações secundárias                                |
| `ui-btn-ghost`     | Sem fundo, texto branco ou cinzento        | Ações terciárias, "Mais tarde", "Cancelar"       |
| `ui-btn-danger`    | Vermelho em contorno; cheio só a confirmar | Apagar, remover                                  |
| `ui-btn-soft-*`    | Fundo a 12 % da cor                        | Ações de estado (por exemplo "Marcar lesionado") |

- **Tamanhos:** `sm` 36 px (só no computador), `md` 44 px e `lg` 52 px (a ação principal no telemóvel).
- **Conteúdo:** ícone de linha de 18 px à esquerda, opcional; **nunca emoji**.
- **Estados:** em espera (spinner no lugar do ícone e o texto mantém-se) e desativado (40 % de opacidade).
- **As variantes que se sobrepõem** (`ui-btn-success`, `ui-btn-warning` contra os `soft`) passam a ser só `soft-*`.

### Campos (`ui-input`, selects, áreas de texto)

- **Medidas:** 44 px de altura, superfície 2, borda `line-strong`.
- **Foco:** um anel verde de 2 px.
- **A etiqueta fica sempre por cima do campo,** nunca só o texto de exemplo.
- **Ícones:** de linha a 16 px, com o texto afastado (`padding-left` de 40 px). Corrige os 🕵️ e 🔒 por cima do texto.
- **Erro:** borda vermelha e uma mensagem por baixo, em `caption`.
- **Select:** o mesmo aspeto do campo, com uma seta de linha.

### Cartões (`ui-card`)

- **Superfície com uma linha de 1 px,** raio de 16 px e 16 px de margem interior (20 px no computador).
- **Quando usar:**
  - um objeto com ações (um jogo, um treino, um atleta numa grelha);
  - um grupo com título (por exemplo "Tarefas").
- **Quando não usar:** um número sozinho (vai para a faixa de indicadores), um aviso (é um "banner") ou um texto de
  vazio (é um estado vazio).
- **Interativo:** a superfície fica um tom mais clara ao passar o rato ou pressionar, e há uma seta só se abrir outra
  página.

### Faixa de indicadores (substitui os cartões de números)

- **Uma linha encaixada** (`inset`) com 2 a 4 valores separados por linhas verticais.
- **Cada valor:** número em `title`, com `tabular-nums`, e a etiqueta em `caption` por baixo.
- **Um valor com alerta ganha a cor semântica e um ícone.** Um zero fica em `muted`.

### Listas (o padrão do ecrã Clube)

- **Cada item:** 56 a 64 px de altura, ícone ou avatar à esquerda, título em `lead`, linha secundária em `muted`, e
  uma ação ou seta à direita.
- **Separadores:** linhas de 1 px entre itens, e o grupo dentro de um cartão com um título por cima.
- **É o componente principal da app** (atletas, convocatória, treinos, resultados, definições).

### Tabelas

- **Só no computador,** ou quando há mais de 3 colunas de números.
- **Linhas:** 44 px de altura, cabeçalho em `caption` e `muted`, números alinhados à direita com `tabular-nums`.
- **No telemóvel, a tabela passa a lista:** o nome e o valor principal, e o resto em linha secundária. Não há deslize
  na horizontal, exceto em quadros táticos e grelhas de minutos, que têm uma coluna fixa.

### Etiquetas (`ui-badge`)

- **Medidas:** 22 px de altura, raio de 8 px e texto `caption` com peso 600.
- **Cores:** `neutral`, `brand`, `success`, `warning` e `danger`, sempre com texto ("Em casa", "V", "Lesionado") e
  sem emoji.
- **A contagem num separador** é uma etiqueta neutra; num separador ativo, fica verde.

### Separadores e controlo segmentado

- **Um nível por ecrã:** o controlo segmentado logo por baixo do título, com no máximo 4 opções.
- **Com mais de 4 opções,** desliza na horizontal com um esbatido à direita, para se ver que há mais.
- **Ativo:** a superfície 3 com o texto branco e uma marca verde de 2 px; o verde cheio não se usa nos separadores.

### Janelas e folhas (`ui-overlay`)

- **Telemóvel:** folha de baixo para cima (raio de 16 px em cima, uma pega e 85 % da altura no máximo).
- **Computador:** janela centrada de 560 px (720 px nas grandes).
- **Estrutura igual em todas:**
  - um título em `title` com o fechar (×) à direita;
  - o conteúdo com deslize;
  - um rodapé fixo com a ação principal à direita e "Cancelar" em `ghost`.
- **Há 23 componentes de janela.** Passam a usar uma só moldura (`Sheet`) com estas regras; o conteúdo de cada um
  não muda.

### Navegação

- **Telemóvel:** a barra de baixo com 5 grupos (Início, Equipa, Planeamento, Jogo, Clube):
  - ícone de 24 px e etiqueta de 12 px;
  - o grupo ativo fica verde, com um fundo suave;
  - a barra fica igual em todos os ecrãs.
- **Computador:**
  - a barra lateral com os **mesmos 5 grupos e os mesmos nomes**, cada grupo com os seus ecrãs;
  - um logótipo pequeno no topo e o seletor de equipa logo por baixo.
- **Cabeçalho de cada ecrã:** o título, uma linha de contexto ("Dragões · Sub-11 · 2026/27") e, à direita, no
  máximo 2 ícones (notificações e mais ações). O estado de gravação fica no menu do perfil, e só se mostra quando
  há problema.

### Menus

- **Menu de ações** ("⋯"): uma lista simples com ícones de linha, onde o que apaga fica em último e a vermelho.
- **As ações importantes nunca vão só para o "⋯":** a ação principal de cada ecrã fica sempre visível.

### Ícones

- **Uma só família de linha,** a que a app já usa na barra de navegação (traço de 1,75 px, cantos redondos).
- **Tamanhos:** 16, 20 e 24 px.
- **A cor do ícone segue o texto ao lado.** O verde só se usa nos ícones de um item ativo.
- **Emojis:** só nos textos que se partilham (WhatsApp, imagens para os pais), nunca na interface.

### Gráficos

- **Cores:** a série principal em verde da marca, a comparação em `muted` e as séries semânticas (golos marcados e
  sofridos) em `success` e `danger`.
- **Eixos e grelha:** em `line`, e a legenda por baixo em `caption`.
- **Mínimo de dados:** uma linha de tendência só aparece com **4 ou mais pontos**; abaixo disso, mostra-se o número
  e "dados insuficientes para tendência".
- **Valores:** sempre com unidade e com `tabular-nums`.

## 6. Estados da interface

| Estado      | Desenho                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| A carregar  | Esqueleto (`ui-skeleton`) com a forma do conteúdo; nunca "A CARREGAR VISTA..." no ecrã inteiro |
| Vazio       | Ícone de linha de 24 px, uma frase do que falta e **um** botão para resolver ("Marcar treino") |
| Sucesso     | Um aviso de 3 s em baixo, por cima da barra, com um ícone verde-água, sem tapar botões         |
| Erro        | Um aviso vermelho com o que fazer ("Sem ligação: os dados ficam no telemóvel e sobem depois")  |
| Sem ligação | Uma etiqueta âmbar no cabeçalho só enquanto dura, e não um aviso a tapar o ecrã                |
| Desativado  | Opacidade de 40 % e o motivo ao tocar ("Só o treinador principal pode…")                       |

## 7. Movimento

- **Duração e curva:** 150 a 200 ms, com `ease-out`. Usa-se só em folhas, separadores e no aparecer dos avisos.
- **Sem animações de entrada nos cartões.**
- **`prefers-reduced-motion`:** com esta opção ligada no telemóvel, as animações desligam-se.

---

## Como se aplica (sem mexer em regras de negócio)

1. **Tokens:** só se mudam os valores em `src/index.css` (`@theme`). Com isto, toda a app muda de cor ao mesmo tempo,
   porque a maior parte já usa `ui-*`.
2. **Componentes:** redesenhar `ui-btn`, `ui-card`, `ui-input`, `ui-badge` e a moldura das janelas. Os nomes das
   classes mantêm-se.
3. **Ecrãs:** um módulo de cada vez, pela ordem que definiste (ver `PLANO_EVOLUCAO.md`). Em cada um:
   - tirar os heros;
   - trocar os emojis por ícones;
   - passar os números para a faixa de indicadores;
   - trocar os `text-[Npx]` pela escala;
   - capturas do antes e do depois, no telemóvel e no computador.

**O que não muda:** permissões, Firestore, dados, rotas e funcionalidades. Nenhuma biblioteca nova.
