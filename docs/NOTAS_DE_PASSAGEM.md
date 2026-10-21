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

⚠️ O AI Studio às vezes faz commits sozinho (por exemplo, apagou o `package-lock.json`; o projeto usa `bun.lock`).
Fazer sempre `git pull` antes de começar.

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
- **Apagar = marcar** (`deleted: true`), guardando a última versão. É isso que permite "Resultados → 🗑️ Jogos
  apagados". Só o Administrador pode apagar documentos de verdade.
- **Proteção contra apagões:** pedidos para apagar mais de 20 registos e mais de 50% do total são ignorados (sinal
  de carregamento incompleto).
- **O documento `club` marca o fim da migração.** Se existir, o clube está no formato novo. Para voltar ao formato
  antigo (emergência): apagar a coleção `records`. O documento antigo continua intacto como cópia de segurança.
- **A sincronização em tempo real só arranca depois de o Firebase confirmar o login** (`authUid` em `App.tsx`). A
  app repõe o utilizador guardado no aparelho antes disso; sem esta espera, a ligação não arrancava e a migração
  nunca acontecia, sem mensagem nenhuma (problema de 21/10/2026).
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

## 7. Testes

| Comando                 | O que testa                                                                  | Precisa de |
| ----------------------- | ---------------------------------------------------------------------------- | ---------- |
| `npm run verify`        | Tipos, lint, formatação, 171 testes unitários, build                         | Node       |
| `npm run test:emulator` | Sincronização por registos e regras de segurança, nos emuladores do Firebase | Java       |
| `npm run test:e2e`      | 8 testes de ecrã (telemóvel, dois treinadores), nos emuladores do Firebase   | Java       |

Correr os três antes de um merge que mexa em sincronização, regras ou login. Os testes de ecrã correm na base com nome,
com as regras reais de `firestore.rules`. Os testes de regras usam a `(default)`, porque só nela o emulador aceita
trocar as regras a meio dos testes.

## 8. Histórico (outubro 2026)

| PR  | O quê                                                                                            |
| --- | ------------------------------------------------------------------------------------------------ |
| #1  | Erros técnicos, jogo do Tramagal SU recuperado, importação da Ficha de Jogo                      |
| #2  | Jogos separados por equipa, épocas pela data, indicador de gravação verdadeiro                   |
| #3  | Minutos de jogo por atleta (ao vivo e resumo da época)                                           |
| #4  | Armazenamento por registos (um documento por atleta, jogo e treino)                              |
| #5  | Importação sem dados inventados, sem dados de demonstração, jogos apagados, partilha com os pais |
| #6  | Segurança: acessos entre clubes fechados, dados apagados ao terminar sessão                      |
| #7  | Convites seguros, verificados pelas regras                                                       |
| #8  | Alertas de assiduidade, limpeza de dados inventados, app mais leve                               |
| #9  | Mensagens de diagnóstico da migração                                                             |
| #10 | Sincronização espera pelo login (a migração passou a acontecer)                                  |
| #11 | Testes automáticos aos ecrãs                                                                     |
| #12 | Notas de passagem                                                                                |
| #13 | Publicação automática das regras (testadas antes)                                                |
