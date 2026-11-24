# Tarefa 09 de desenvolvimento: P0-08, IA só para contas aprovadas, com limite diário

Ramo `fix/p0-08-ia-so-aprovados`, a partir de `main` em `1f719b7`.

## O que mudou

- **Novo `src/lib/aiAccess.ts`:**
  - `aiAccessFor` decide quem entra;
  - `createDailyLimiter` conta os pedidos por conta e por dia (UTC);
  - o limite é de 40 pedidos por dia, para ficar no plano grátis (decisão 12).
- **`server.ts`:**
  - `/api/cronica`, `/api/ler-jornada` e `/api/exercicio-ia` passam a exigir uma conta com sessão iniciada **e**
    aprovada (`users/{uid}.account.status == 'approved'`, com papel), ou o Administrador. O servidor lê o documento com o
    token do próprio, por isso valem as regras do Firestore. Uma conta pendente, rejeitada ou sem perfil recebe 403.
  - Os três pedidos partilham o mesmo limite diário: ao passar o limite, a resposta é 429. Um pedido inválido não
    conta.
  - **Administrador só por `admins/{uid}`.** O e-mail deixou de contar (sai o `MASTER_ADMIN_EMAIL` do servidor).
  - **`/api/admin/create-user` já não inventa uids.** Se o início de sessão por e-mail e palavra-passe estiver desligado no Firebase,
    responde 503 com a explicação.
- **`cloudAuthService.ts`:**
  - sai o mesmo atalho do lado da app, que criava um perfil "pré-autorizado" com um id falso;
  - o erro do servidor passa a ser mostrado ao Administrador.

## Testes

| Teste                                                                                                 | Resultado                                                                   |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `aiAccess.test.ts` (10 testes: aprovados, recusados, Administrador, limite, mudança de dia, servidor) | ✅                                                                          |
| Bateria unitária completa                                                                             | ✅ 118 ficheiros, 729 testes                                                |
| Tipos, lint, formatação                                                                               | ✅                                                                          |
| Testes de ecrã                                                                                        | Simulam estas rotas (`page.route`), por isso não são afetados; correm no CI |

Só dados fictícios.

## Riscos e limitações

- **O contador vive na memória do servidor:**
  - volta a zero quando o servidor reinicia;
  - cada cópia do servidor conta à parte.
  - Serve para travar abusos, não para faturar.
- **O acesso conta pelo modelo antigo** (`users/{uid}`), o das 5 contas reais. Depois da migração (P0-06), as contas que
  só existam em `organizations/{org}/members` vão precisar de outra verificação. Fica anotado para a P0-06.
- **Administrador:**
  - o inventário mostra 1 documento em `admins`;
  - se não for o da conta do Bruno, essa conta perde o "criar utilizador" e passa a contar como conta aprovada normal;
  - confirmar no primeiro uso.
- **No ecrã da app,** o Administrador continua a ser reconhecido também pelo e-mail. Isso só muda o que se vê, porque
  as regras do Firestore já usam `admins/{uid}`.
- **Treinadores criados sem conta real:** quem já foi criado assim (com um id falso) continua sem conseguir entrar. O
  inventário não mostra nenhum.

## Reversão

`git revert` do merge; no AI Studio, Pull e Publish. Não mexe em dados.
