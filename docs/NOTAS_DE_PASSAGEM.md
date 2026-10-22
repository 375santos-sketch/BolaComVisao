# Notas de passagem — BolaComVisão

Para quem vier mexer na app (pessoa ou assistente de IA, incluindo o Gemini do AI Studio). Ler antes de alterar
código. Última atualização: 21/10/2026.

## 1. O que é

App de gestão de equipas de futebol de formação: plantel, jogos (incluindo modo jogo ao vivo no banco), treinos,
agenda, estatísticas, minutos de jogo, partilha de resultados com os pais. Vários treinadores do mesmo clube usam
a app ao mesmo tempo, em telemóveis e computadores.

- **Dono / Administrador:** Bruno Santos (375.santos@gmail.com).
- **Código:** este repositório (`375santos-sketch/BolaComVisao`), sincronizado com o Google AI Studio.
- **Firebase:** projeto `glowing-orbit-vk8sk` (na consola aparece como "ai-builder-project").
- **Base de dados:** Firestore **com nome** `ai-studio-registodejogosge-6bd85e71-c216-4bad-8acb-576b2f76745d`, e
  **não** a `(default)`. Está sujeita à "cota compartilhada de IA" (limites diários gratuitos).

## 2. Como se publica uma alteração

1. Alteração feita num ramo, com Pull Request no GitHub; merge para `main`.
2. AI Studio → **Pull** (do GitHub) → **Publish**.
3. Se a alteração mexeu em `firestore.rules`: o GitHub testa as regras no Pull Request e publica-as sozinho
   depois do merge (workflow **Regras do Firestore**, separador **Actions**; precisa do secret
   `FIREBASE_TOKEN`, ver README). Confirmar que ficou com ✅. Se falhar, publicar à mão: Consola Firebase
   → Firestore → escolher a base de dados com nome (lista no topo) → **Regras** → colar o ficheiro inteiro →
   **Publicar**.
4. Nos aparelhos dos treinadores: fechar e voltar a abrir a app (há service worker com rede primeiro).

O `firebase.json` indica a base de dados com nome: `firebase deploy --only firestore:rules --project
glowing-orbit-vk8sk` publica na base certa. Não remover o campo `database`, senão as regras vão para a `(default)`,
que a app não usa.

⚠️ O AI Studio às vezes faz commits sozinho (por exemplo, apagou o `package-lock.json` e, a 21/10, tirou o
`@playwright/test` do `bun.lock` sem o tirar do `package.json`). O projeto usa `bun.lock`; os testes no GitHub
instalam com `bun install` (sem `--frozen-lockfile`) para não pararem por isso. Fazer sempre `git pull` antes de
começar, e repor o `bun.lock` com `bun install --lockfile-only` se ficar desalinhado.

## 3. Tecnologia

React 19 + TypeScript + Vite 6 + Tailwind 4; `server.ts` (Express) para o AI Studio / Cloud Run; Firebase Auth +
Firestore; PWA. Ecrãs carregados por partes (`lazyWithRetry`); PDF e Excel só carregam quando são usados.

| Pasta / ficheiro                   | Conteúdo                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `src/App.tsx`                      | Estado global, navegação, sincronização em tempo real, login/logout             |
| `src/components/views/`            | Um ecrã por ficheiro; subpastas com as partes de cada ecrã                      |
| `src/services/firebase.ts`         | Ligação ao Firebase, documento antigo do clube, controlo de quota               |
| `src/services/clubCloud.ts`        | **Armazenamento por registos** (ler, escrever, migrar, ouvir em tempo real)     |
| `src/lib/recordSync.ts`            | Funções puras: estado ⇄ registos, junção de 3 vias, ids dos documentos          |
| `src/services/cloudAuthService.ts` | Login, registo por convite, utilizadores                                        |
| `src/lib/storage.ts`               | Estado local (`localStorage` `coach-app-data-v1` + IndexedDB `BolaComVisao_DB`) |
| `src/lib/cloudSyncStatus.ts`       | Estado do indicador "Guardado" (`SyncStatusBadge`)                              |
| `src/lib/playingTime.ts`           | Minutos de jogo                                                                 |
| `src/lib/matchSheetImporter.ts`    | Importar a Ficha de Jogo em Excel                                               |
| `firestore.rules`                  | Regras de segurança (ver secção 5)                                              |
| `e2e/`, `src/__emulator__/`        | Testes de ecrã e de integração (ver secção 7)                                   |

## 4. Como os dados são guardados na nuvem

Desde 21/10/2026 cada jogo, atleta, treino, etc. é um documento separado:

```
club_workspace/{clube}                      ← documento antigo (tudo num só). Já NÃO é escrito.
club_workspace/{clube}/records/{id}         ← um documento por registo
    match__{equipa}__{idDoJogo}
    player__{equipa}__{idDoAtleta}
    training__… schedule__… message__… scouting__…
    club                                    ← tudo o resto (equipas, definições); escrito em ÚLTIMO lugar
```

`{clube}` é o `clubId` do utilizador, ou `main` se não tiver. O clube do Bruno é `main`.

Regras importantes (cada uma corrige um problema real que já aconteceu):

- **Nunca gravar o estado inteiro por cima da nuvem.** Antes, um aparelho com dados antigos apagava o trabalho dos
  outros. Agora só se enviam os registos que mudaram, com uma junção de 3 vias por registo (local / nuvem / última
  versão sincronizada, guardada em `bcv-synced-records-{clube}`).
- **O registo `club` (definições e lista de equipas) junta-se campo a campo e equipa a equipa.** Guarda-se um hash
  por campo e por equipa (chaves `club#…` em `bcv-synced-records-{clube}`); só um campo ou equipa alterado nos dois
  aparelhos é decidido pela alteração mais recente.
- **A equipa escolhida (`activeTeamId`) é de cada aparelho** e as cópias de topo da equipa ativa (táticas, equipa
  técnica, escalão, época…) não vão para o registo `club`: cada equipa guarda as suas em `teams[]`. Os valores por
  defeito das equipas são preenchidos para todas antes de partilhar, para dois treinadores em equipas diferentes
  gravarem exatamente o mesmo `club` (senão regravavam-no sem parar).
- **Abrir um ecrã não pode gravar nada.** O Pré-jogo e o Adversário mostram um rascunho (id estável
  `report-{jogo}` / `scout-{jogo}`) que só é gravado quando o treinador o altera.
- **Cópia de segurança** (`src/lib/backup.ts`): ficheiro JSON com todas as equipas e os seus registos, sem dados de
  conta (utilizador, contactos dos treinadores, convites, auditoria). Repor um ficheiro novo repõe o clube todo;
  ficheiros antigos continuam a repor só a equipa ativa. O Administrador vê no Início um lembrete semanal (data da
  última cópia guardada por aparelho, `bcv-last-backup-at`).
- **Pré-jogo** (`ScheduledMatch.preMatchPlan`, `src/lib/preMatchPlan.ts`, `PreMatchView`): um plano simples por jogo
  da Agenda (sistema, 3 objetivos, com/sem bola, palavra de ordem, notas), "Plano pronto" (`preMatchFinalized`, ✓ na
  Agenda), PDF e WhatsApp. Abrir o ecrã não grava nada.
- **Adversários: só relatório pós-jogo** (`Match.opponentReport`, `src/lib/opponentReport.ts`). O "Para o próximo
  jogo" aparece no Pré-jogo quando o adversário é o mesmo (`isSameOpponent`: "GRD Os Esparteiros" = "Esparteiros").
- **O Pré-jogo antigo e o scouting do adversário foram removidos a 21/10/2026** (ambos guardados em
  `opponentScouting`): `withoutOpponentScouting` (em `normalizeClubState`) apaga esses dados sempre que aparecerem;
  `resetOldPreMatchFlags` (versão de dados 3, corre uma vez) tira o ✓ antigo dos jogos sem plano novo. O campo
  `opponentScouting` e o tipo de registo `scouting` ficam no código só para a sincronização apagar o que existia.
- **Removidos a 21/10/2026 a pedido do Administrador** (não voltar a pôr sem pedido): Módulos & Funcionalidades
  (planos comerciais; `licensingEngine` fica só para o registo de clubes), Chat da Equipa Técnica (as mensagens
  `staffMessages` ficam guardadas, sem ecrã), Biblioteca de Exercícios (e as Fichas PDF dos treinos), Relatórios da
  Direção, ecrã do Registo de Auditoria (o registo continua a ser gravado em `audit_logs`), ecrã Sincronização &
  Nuvem (tocar no indicador mostra o estado: `src/lib/syncView.ts`) e as definições dos alertas (os avisos do 🔔
  continuam com os valores atuais).
- **Apagar = marcar** (`deleted: true`), guardando a última versão. É isso que permite "Resultados → 🗑️ Jogos
  apagados". Só o Administrador pode apagar documentos de verdade.
- **Proteção contra apagões:** pedidos para apagar mais de 20 registos e mais de 50% do total são ignorados (sinal
  de carregamento incompleto).
- **O documento `club` marca o fim da migração.** Se existir, o clube está no formato novo. Para voltar ao formato
  antigo (emergência): apagar a coleção `records`. O documento antigo continua intacto como cópia de segurança.
- **A sincronização em tempo real só arranca depois de o Firebase confirmar o login** (`authUid` em `App.tsx`). A
  app repõe o utilizador guardado no aparelho antes disso; sem esta espera, a ligação não arrancava e a migração
  nunca acontecia, sem mensagem nenhuma (problema de 21/10/2026).
- **Sessão do Firebase terminada com o treinador ainda guardado no aparelho** ("Autenticação necessária para guardar
  na Nuvem"): aparece o aviso `SessionExpiredBanner` para entrar de novo (palavra-passe ou Google, mesma conta) sem
  apagar os dados do aparelho. "Terminar sessão" apagava as alterações ainda não enviadas.
- Escritas pendentes (offline) não contam como "guardado": o indicador só fica verde com confirmação do servidor.

## 5. Segurança e acessos

- **Administrador:** documento `admins/{uid}` (o do Bruno existe). Pode tudo.
- **Treinadores:** `users/{uid}` com `account.status == 'approved'`, `clubId` e `assignedTeams`. Só leem e escrevem
  o seu clube. Não podem alterar o próprio papel, estado, clube ou equipas.
- **Registo só por convite:** códigos `BCV-` + 8 caracteres aleatórios, validados nas regras
  (`isInvitedRegistration`). Os códigos antigos (antes de 20/10/2026) deixaram de servir.
- Utilizadores, convites e registos de auditoria só são visíveis a quem tem direito (ver `firestore.rules`).
- **Terminar sessão** apaga do aparelho os dados do clube (localStorage e IndexedDB).
- Os dados são de **menores**: não acrescentar partilhas públicas nem envios para serviços externos sem
  consentimento dos pais (RGPD).

Pendentes recomendados: repositório privado; restringir a chave web do Firebase ao domínio da app; recolher o
consentimento RGPD dos pais.

## 6. Problemas conhecidos e como diagnosticar

- **Indicador "Por enviar" ou "Erro"**: o texto do indicador (ao passar o rato por cima) explica o motivo. Na consola do navegador
  (F12, ou Ctrl+Shift+J), filtrar por `registos`, `Migração` ou `sincronização`. No AI Studio, a consola tem de
  estar no contexto `ais-dev-…` (lista `top ▾`), não no `aistudio.google.com`.
- **Quota diária esgotada**: a app deixa de tentar durante 15–30 min e trabalha só no aparelho. Os limites são
  diários; a opção definitiva é passar a base de dados para pagamento por uso.
- **Importações antigas de Excel** inventavam marcadores, minutos e titulares. A app deteta e oferece limpeza em
  Base de Dados → Equipas & Épocas (`inventedImportCleanup.ts`). Rever antes de limpar.
- Os jogos do Ouriense e o "Tramagal 1-0" com "Atleta Dragão" eram dados falsos e foram removidos.
- **`Match.phase` é a jornada/fase da competição** ("Jornada 5"); o estado do relógio do jogo ao vivo vai em
  `matchPhase` (`nao_iniciado`, `parte1`, `intervalo`, `parte2`). Até ao #28 o jogo ao vivo escrevia o relógio em
  `phase` e apagava a jornada; `withMatchRoundsRestored` (storage.ts) repara esses jogos com a cópia da Agenda.

- **Treinos**: `absences` (ids de quem faltou) continua a ser o dado principal; `absenceReasons` guarda o motivo só
  de quem faltou (`withAttendance` em `src/lib/trainingQuick.ts` mantém os dois coerentes).

- **Mensagens para o WhatsApp**: a convocatória sai sempre de `buildCallupMessage` (`src/lib/callupMessage.ts`) e o
  resultado para os pais de `buildParentsMessage`; ambas usam a janela `ShareMessageModal`.

- **Ficha do atleta**: os números saem de `buildPlayerSeason` (`src/lib/playerSeason.ts`), só da época ativa. O PDF
  é para mostrar (pais, coordenador): não leva contactos nem as notas confidenciais do treinador.

- **Início**: os avisos e o resumo da época saem de `homeNotices` e `seasonSummary` (`src/lib/homeSummary.ts`), no
  máximo 3 avisos, por ordem de urgência. Os detalhes (marcadores, cantos, etc.) ficam nas Estatísticas.

- **Painel e Power BI**: filtros e números em `src/lib/statsPanel.ts`; o ficheiro para o Power BI em
  `src/lib/powerBiExport.ts` (só dados desportivos). Guia de uso em `docs/POWER_BI.md`.

## 7. Testes

| Comando                 | O que testa                                                                  | Precisa de |
| ----------------------- | ---------------------------------------------------------------------------- | ---------- |
| `npm run verify`        | Tipos, lint, formatação, testes unitários, build                             | Node       |
| `npm run test:emulator` | Sincronização por registos e regras de segurança, nos emuladores do Firebase | Java       |
| `npm run test:e2e`      | 17 testes de ecrã (telemóvel, dois treinadores), nos emuladores do Firebase  | Java       |

O teste **"dia de jogo"** faz o percurso completo de um jogo (convocatória, titulares, relógio, golos,
substituição, cartão, intervalo, fim, minutos, resumo, partilha, relatório do adversário). O relógio do jogo é
adiantado mudando só a hora do navegador; o `page.clock` do Playwright não serve aqui, porque dispara todos os
temporizadores de uma vez e corta a ligação ao emulador do Firestore.

O GitHub corre os três em cada Pull Request e em cada alteração à `main` (workflow **Testes**). Não fazer merge com
❌; se os testes de ecrã falharem, o relatório com capturas fica nos artefactos da execução. Os testes de ecrã correm na base com nome,
com as regras reais de `firestore.rules`. Os testes de regras usam a `(default)`, porque só nela o emulador aceita
trocar as regras a meio dos testes.

## 8. Histórico (outubro 2026)

| PR  | O quê                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | Erros técnicos, jogo do Tramagal SU recuperado, importação da Ficha de Jogo                                                                     |
| #2  | Jogos separados por equipa, épocas pela data, indicador de gravação verdadeiro                                                                  |
| #3  | Minutos de jogo por atleta (ao vivo e resumo da época)                                                                                          |
| #4  | Armazenamento por registos (um documento por atleta, jogo e treino)                                                                             |
| #5  | Importação sem dados inventados, sem dados de demonstração, jogos apagados, partilha com os pais                                                |
| #6  | Segurança: acessos entre clubes fechados, dados apagados ao terminar sessão                                                                     |
| #7  | Convites seguros, verificados pelas regras                                                                                                      |
| #8  | Alertas de assiduidade, limpeza de dados inventados, app mais leve                                                                              |
| #9  | Mensagens de diagnóstico da migração                                                                                                            |
| #10 | Sincronização espera pelo login (a migração passou a acontecer)                                                                                 |
| #11 | Testes automáticos aos ecrãs                                                                                                                    |
| #12 | Notas de passagem                                                                                                                               |
| #13 | Publicação automática das regras (testadas antes)                                                                                               |
| #14 | Regras publicadas com o código de acesso da Firebase CLI (o projeto não permite chaves)                                                         |
| #15 | Todos os testes correm no GitHub em cada Pull Request                                                                                           |
| #16 | Separadores de Performance: Estatísticas a um toque                                                                                             |
| #17 | "Quando marcamos": gráfico a zeros corrigido; golos sem minuto já não vão para 0–15'                                                            |
| #18 | Definições do clube e equipas sem conflitos entre treinadores                                                                                   |
| #19 | Minutos de jogo certos em jogos importados (substituições da 2.ª parte; titulares deduzidos quando faltam)                                      |
| #20 | Equipa escolhida por aparelho; Pré-jogo e Adversário deixam de gravar só por abrir                                                              |
| #21 | Cantos e faltas a 0 na Análise (dois nomes para o mesmo dado: `src/lib/matchSetPieces.ts`)                                                      |
| #22 | Testes no GitHub tolerantes a `bun.lock` reescrito pelo AI Studio                                                                               |
| #23 | Remates e eficácia de finalização na Análise; cópia de segurança completa com lembrete semanal                                                  |
| #24 | Fim do scouting do adversário; relatório do adversário pós-jogo (números, notas, próximo jogo, PDF, WhatsApp)                                   |
| #25 | Pré-jogo novo, simples (sistema, objetivos, com/sem bola, palavra de ordem, PDF, WhatsApp); antigo apagado                                      |
| #26 | Aviso para entrar de novo quando a sessão na nuvem termina (sem perder os dados do aparelho)                                                    |
| #27 | Simplificação: saem planos comerciais, chat, biblioteca, relatórios da direção, auditoria, ecrã de sincronização e definições dos alertas       |
| #28 | Ensaio do dia de jogo: convocatória passa para o jogo, jornada já não é apagada, resumo pós-jogo aparece, nomes na cronologia, em campo/banco   |
| #29 | Treinos: "Treino de hoje" em poucos toques, repetir treino, motivo das faltas e faltas por atleta, lista abre em "Todos"                        |
| #30 | Ensaio da semana: Convocatória abre o jogo tocado, mensagem única de convocatória (WhatsApp/Partilhar/Copiar), minutos da época na Convocatória |
| #31 | Ficha do atleta por época (jogos, minutos, golos, assiduidade, faltas com motivo, últimos jogos) e PDF para pais/coordenador                    |
| #32 | Início simplificado: hoje/próximo jogo, 4 atalhos, avisos (máx. 3), resumo da época numa linha, próximos 7 dias                                 |
| #33 | Painel de estatísticas (equipa/atleta por jogo, confronto, fase, época, período) e exportação para Power BI                                     |
| #34 | PDF das estatísticas com golos e assistências, minutos por atleta e jogos com marcadores; PDF também no painel (por filtro)                     |
