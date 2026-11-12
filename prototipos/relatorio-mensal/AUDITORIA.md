# Relatório mensal de atividade e desenvolvimento — auditoria e protótipo

> Etapas 1 a 3 e 5. Não é implementação definitiva. Não muda Firestore, regras, autenticação, permissões,
> sincronização nem a lógica de Treinos, Jogo ou Plantel. O protótipo usa **dados fictícios** e fica fora da aplicação.

## 1. Diagnóstico

A BolaComVisão já guarda quase tudo o que o relatório precisa, e **já existe um relatório mensal simples**:

- `src/lib/monthlyReport.ts` (+ teste `src/__tests__/monthlyReport.test.ts`) — jogos e resultados do mês, assiduidade,
  minutos, golos e assistências por atleta, objetivos dos treinos e dos pré-jogos.
- `src/components/MonthlyReportModal.tsx` — Mais → Relatório mensal (escolher o mês, notas, PDF). As notas **não são
  guardadas**.
- `src/lib/pdf/createMonthlyReport.ts` — PDF com jsPDF (`src/lib/pdf/pdfLayout.ts`).

O novo módulo deve **evoluir** este relatório (mesmas regras de cálculo), não criar um segundo.

### Onde estão os dados

Tudo é guardado por registo em `club_workspace/{clube}/records/{tipo__equipa__id}` (`src/services/clubCloud.ts`,
tipos `player`, `match`, `training`, `schedule`, `club`…). As regras (`firestore.rules`, `match /club_workspace/…/records`)
dão leitura e escrita a quem tem acesso ao clube. Cada treinador vê as suas equipas (`src/lib/permissionsEngine.ts`,
`getUserAccessibleTeams`). Não existe hoje um papel «Coordenador»: os papéis são Administrador, Diretor, Treinador
Principal/Adjunto/GR, Preparador Físico, Analista e Fisioterapeuta (`UserClubRole` em `src/types.ts`).

| Entidade      | Tipo (src/types.ts) | Campos usados                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Treino        | `Training`          | `date`, `time`, `durationMinutes`, `completed`, `type` (foco), `notes`, `absences`, `absenceReasons`, `sessionPlan.objective`, `sessionPlan.blocks[].{title,category,durationMinutes,notes}`, `trainingNumber`                                                                                                                                                                       |
| Jogo agendado | `ScheduledMatch`    | `date`, `opponent`, `type`, `phase`, `tournamentName`, `callup`, `preMatchPlan.{system,objectives}`, `startingLineup.system`                                                                                                                                                                                                                                                         |
| Jogo          | `Match`             | `date`, `opponent`, `type`, `phase`/`competitionPhase`, `tournamentName`, `location`, `finished`, `lineup`, `lineupSecondHalf`, `lineupSize`, `convocados`, `subs[]`, `goals[]` (`scorerId`, `assistId`, `minute`, `period`), `cards[]`, `timer`, `halfDurationMinutes`, `cantos/cantosAdv`, `faltas/faltasAdv`, `rematesDentroArea…`, `notes`, `opponentReport`, `originalSchedule` |
| Atleta        | `Player`            | `name`, `number`, `positions`, `status`, `statusUntil`, `active`, `inactiveSince`                                                                                                                                                                                                                                                                                                    |
| Equipa        | `SquadProfile`      | `category`, `season`, `monthObjectives["AAAA-MM"]`                                                                                                                                                                                                                                                                                                                                   |

Cálculos já existentes que o relatório deve reutilizar:

- `src/lib/planningSummary.ts` → `trainingStatus` (realizado · por fechar · agendado) e minutos por tema.
- `src/lib/utils.ts` → `calcPlayerMinutes` (minutos por atleta a partir de titulares e substituições).
- `src/lib/playingTime.ts` → `getCalledUpPlayers`, `withPlayableDurations`, `computeSeasonPlayingTime`,
  `gamesMissingStarters`.
- `src/lib/playerSeason.ts` → `buildPlayerSeason` (convocado, jogou, titular, minutos, golos, assistências, cartões,
  presenças e motivos das faltas).

## 2. Mapa de dados

| Dado                                   | Estado                   | Origem                                                            | Nota                                                                                                                                                   |
| -------------------------------------- | ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Treinos realizados                     | DISPONÍVEL               | `Training.completed` + data → `trainingStatus`                    | Realizado = fechado (ou antigo sem estado e com data passada).                                                                                         |
| Treinos futuros / por fechar           | DISPONÍVEL               | `trainingStatus`                                                  | Por fechar = `completed:false` com data passada.                                                                                                       |
| Treinos cancelados                     | INDISPONÍVEL             | —                                                                 | Não há estado «cancelado»: um treino apagado desaparece (fica só um registo `deleted`).                                                                |
| Duração dos treinos                    | DISPONÍVEL               | `Training.durationMinutes`                                        |                                                                                                                                                        |
| Objetivo da sessão                     | PARCIAL                  | `sessionPlan.objective`                                           | Opcional; muitos treinos não o têm.                                                                                                                    |
| Conteúdos técnicos/táticos/físicos     | PARCIAL                  | `sessionPlan.blocks[].category` + `durationMinutes`               | Só nos treinos com plano. Categorias: aquecimento, técnica, tática, físico, jogo, bolas paradas, calma.                                                |
| Conteúdos psicológicos/comportamentais | INDISPONÍVEL             | —                                                                 | Não há categoria nem campo.                                                                                                                            |
| Exercícios realizados                  | PARCIAL                  | `sessionPlan.blocks[].title/exerciseId`                           | O plano é o previsto; não se marca o que foi mesmo feito (há `level` «como correu» opcional).                                                          |
| Observações do treinador (treino)      | DISPONÍVEL               | `Training.notes`                                                  |                                                                                                                                                        |
| Presenças                              | DISPONÍVEL               | `Training.absences` (quem faltou)                                 | Presente = não está em `absences`.                                                                                                                     |
| Faltas justificadas / injustificadas   | PARCIAL                  | `Training.absenceReasons`                                         | Motivo opcional. `injustificada` explícita; doente/lesionado/escola/família = justificada; sem motivo = desconhecido (nunca contar como uma ou outra). |
| Jogos realizados                       | DISPONÍVEL               | `Match.finished`                                                  |                                                                                                                                                        |
| Adversário, data, competição, jornada  | DISPONÍVEL               | `Match.opponent/date/type/tournamentName/phase`                   |                                                                                                                                                        |
| Resultado                              | DISPONÍVEL               | `calculateMatchScore` (golos) / `finalScore`                      |                                                                                                                                                        |
| Sistema tático                         | PARCIAL                  | `originalSchedule.preMatchPlan.system` ou `startingLineup.system` | É o sistema **planeado**; mudanças durante o jogo não ficam registadas.                                                                                |
| Titulares                              | DISPONÍVEL               | `Match.lineup` (+ `lineupSecondHalf`)                             | Jogos importados sem titulares: `gamesMissingStarters`.                                                                                                |
| Convocados                             | DISPONÍVEL               | `Match.convocados` (ou `getCalledUpPlayers`)                      | Sem lista, usa quem participou.                                                                                                                        |
| Suplentes utilizados                   | DISPONÍVEL               | `subs[].inId`                                                     | Convocado ≠ utilizado (utilizado = mais de 0 minutos).                                                                                                 |
| Substituições e minutos                | DISPONÍVEL               | `subs[].{minute,minuteInHalf,half,isHalftime}`                    |                                                                                                                                                        |
| Minutos por atleta                     | DISPONÍVEL               | `calcPlayerMinutes` + `withPlayableDurations`                     | Sem relógio, usa a duração do escalão (**estimado**).                                                                                                  |
| Golos                                  | DISPONÍVEL               | `goals[]` `type:'scored'`, `scorerId`                             |                                                                                                                                                        |
| Assistências                           | PARCIAL                  | `goals[].assistId`                                                | Só quando o treinador a indica.                                                                                                                        |
| Remates                                | PARCIAL                  | `rematesDentroArea/ForaArea(+Adv)`                                | Opcional; `undefined` = não registado.                                                                                                                 |
| Cantos                                 | PARCIAL                  | `cantos/cantosAdv` (`cornersFor/Against` antigos)                 | Idem.                                                                                                                                                  |
| Faltas                                 | PARCIAL                  | `faltas/faltasAdv`                                                | Idem.                                                                                                                                                  |
| Cartões                                | DISPONÍVEL               | `cards[]`                                                         |                                                                                                                                                        |
| Cronologia                             | DISPONÍVEL               | `goals/cards/subs` com minuto + `timeline`                        |                                                                                                                                                        |
| Estatísticas coletivas                 | PARCIAL                  | soma dos jogos                                                    | Só somar os jogos com registo e dizer em quantos.                                                                                                      |
| Posições utilizadas                    | PARCIAL                  | `Player.positions`                                                | Posição principal da ficha; a posição em cada jogo não é registada.                                                                                    |
| Disponibilidade para os jogos          | PARCIAL                  | `Player.status/statusUntil`                                       | É o estado **atual**; não há histórico por jogo.                                                                                                       |
| Análise do treinador (jogo)            | PARCIAL                  | `Match.notes`                                                     | Opcional. `opponentReport` é sobre o adversário.                                                                                                       |
| Avaliação mensal da equipa             | INDISPONÍVEL             | —                                                                 | Não existe; seria um registo novo (exige autorização).                                                                                                 |
| Objetivos para o mês seguinte          | DISPONÍVEL               | `SquadProfile.monthObjectives["AAAA-MM"]`                         | Lista de textos (Época → Objetivos do mês). Sem separação técnico/tático/físico.                                                                       |
| Jogos previstos no mês seguinte        | DISPONÍVEL               | `schedule` (`ScheduledMatch`)                                     |                                                                                                                                                        |
| Avaliações individuais                 | DISPONÍVEL, **não usar** | `Player.evaluations`                                              | Por regra da app, ficam só para os treinadores, nunca em relatórios.                                                                                   |

## 3. Limitações e regras de cálculo

- **Não registado ≠ zero.** Remates, cantos, faltas e assistências podem não ter sido registados. O relatório mostra «—»
  e conta os jogos com registo («2 de 3 jogos»); a média divide por esses jogos.
- **Convocado ≠ utilizado ≠ titular.** Convocado = na lista; utilizado = mais de 0 minutos; titular = na 1.ª parte.
- **Agendado ≠ realizado.** Só os treinos realizados entram nas presenças. Os por fechar aparecem à parte com aviso.
- **Minutos previstos ≠ realizados.** Os minutos vêm do relógio do jogo. Sem relógio (jogo importado), usa a duração do
  escalão e marca «estimado».
- **Ausência ≠ indisponibilidade.** Falta = não esteve no treino. Indisponível = lesionado ou castigado. A app só guarda
  a indisponibilidade atual.
- **Prolongamento.** O tipo `MatchPeriod` tem `prolongamento` (para golos e cartões), mas o cálculo dos minutos usa só 2
  partes. No relatório, os minutos de jogos com prolongamento devem ser marcados como «sem prolongamento».
- **Interrupções.** O relógio parado (pausa) não conta: a duração de cada parte é o tempo com o relógio a correr.
- **Registos incompletos.** Jogos sem titulares completos (`gamesMissingStarters`) dão minutos a menos e devem ser
  assinalados em «Informação em falta».
- **Outros formatos.** `lineupSize` (por defeito 7) e a duração por escalão (`getNominalHalfDuration`) já permitem
  futebol de 5, 7, 9 ou 11; o relatório mostra «Titulares (N)».

## 4. Proposta de estrutura definitiva

1. **Capa e resumo executivo** — clube, equipa, época, mês, treinador; treinos, jogos, assiduidade, minutos; resumo
   escrito pelo treinador.
2. **Treinos** — lista (realizados, por fechar e agendados separados), conteúdos por tema em minutos de exercício
   (separados dos minutos totais), observações.
3. **Jogos** (1 a 2 por página) — resultado, sistema planeado, titulares, suplentes utilizados, substituições, estatísticas
   («—» se não registado), acontecimentos, análise do treinador. Depois, **estatísticas coletivas** com «registado em N jogos».
4. **Estatísticas individuais** — tabela por número (sem rankings) e ficha individual do atleta escolhido.
5. **Assiduidade** — equipa, por atleta, justificadas / injustificadas / sem motivo, convocados vs utilizados.
6. **Análise e desenvolvimento** — 7 campos de texto e 8 dimensões (Em desenvolvimento · Satisfatório · Bom · Muito bom),
   sempre do treinador.
7. **Mês seguinte** — 6 campos + jogos já marcados na Agenda (+ objetivos do mês, se escritos em Época).
8. **Validação** — treinador, data, estado, validação e observações do coordenador.

Para a implementação definitiva será preciso **autorização** para:

- um registo novo `report` com os textos do treinador, as dimensões e o estado (Rascunho → Validado → Entregue);
- as regras do Firestore para esse registo;
- eventualmente um papel ou acesso de **Coordenador** só de leitura a todas as equipas.

## 5. Protótipo

- `prototipos/relatorio-mensal/index.html` — página isolada. A versão publicada só constrói `index.html` e `votar.html`
  (`vite.config.ts`), por isso o protótipo não vai para produção.
- `demoData.ts` — dados fictícios com a forma dos campos reais.
- `reportModel.ts` — contas com as regras acima.
- `ReportPages.tsx` + `reportFields.ts` — as 9 páginas A4.
- `Prototipo.tsx` — ecrã «Relatórios» (equipa e mês, dados recolhidos, em falta, avaliação, estado, pré-visualização, PDF).
- `relatorio.css` — estilos (M1) e impressão A4.

Para abrir: `npx vite` e depois `http://localhost:5173/prototipos/relatorio-mensal/index.html` (Gerar PDF usa a
impressão do navegador → «Guardar como PDF»).
