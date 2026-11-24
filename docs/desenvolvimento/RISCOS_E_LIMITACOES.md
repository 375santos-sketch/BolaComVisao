# Riscos e limitações conhecidos

## Tarefa 02: P0-02

1. **Cópias antigas continuam guardadas.**
   - As cópias de agenda que a heurística já pôs noutros escalões (e enviou para a nuvem) **não são apagadas**.
   - Continuam a aparecer nesses escalões até haver uma reparação de dados aprovada.
   - Saber se existem em produção é a P0-03 (deteção, só leitura).
2. **Um aparelho com a versão antiga da app** (em cache) continua a criar cópias até ser atualizado.
   - Depois do Publish no AI Studio, fechar e reabrir a app nos telemóveis dos treinadores.
3. **Os números dos cartões das equipas podem descer** nos clubes com vários escalões. Estavam inflacionados; os
   novos são os certos.
4. **Os jogos antigos sem equipa marcada** ficam na equipa onde estão (comportamento aprovado). Se algum estiver na
   equipa errada, corrige-se por reparação de dados, não por esta alteração.
5. **Não verificado no navegador:** o login Google não funciona em localhost. O teste de ecrã do CI cobre a escolha
   de equipa.

## Tarefa 01: P0-04

1. **Os testes "a corrigir" vão falhar de propósito** quando as tarefas P0-05, P0-06 e P0-07 mudarem as regras.
   - É o comportamento desejado: obriga a atualizar o teste no mesmo PR, de "aceite" para "recusado".
   - Quem fizer essas tarefas não deve apagar estes testes, deve invertê-los.
2. **Os testes medem o emulador, não a produção.** As regras são as mesmas (`firestore.rules`, publicadas pelo
   workflow a 24/11/2026), mas não dizem quantas contas ou atletas estão expostos. Isso precisa do inventário
   (P0-01).
3. **Falha local anterior, não relacionada:**
   - `clubCloud.emulator.ts` falha neste clone do Windows (provável causa: fins de linha CRLF; ver
     `TESTES_EXECUTADOS.md`);
   - no CI (Linux) passa;
   - correção possível numa tarefa própria: normalizar `\r\n` antes do recorte no teste.
4. **Confirmação nova [F]:** uma conta aprovada sem `clubId` **cria convites** para o clube `main`.
   - Era uma suspeita na Tarefa 02.
   - Fica corrigido com a migração de `main` (P0-06).
   - Até lá, o risco depende de existirem contas assim em produção (P0-01).
5. **Repositório público:** os nomes dos testes descrevem pontos fracos. O mesmo já se lê nas regras públicas. Ver a
   decisão sobre quando enviar o ramo.
6. **O staff com papel de fisioterapeuta** aparece aqui como "staff" (`staffA`), como nas regras atuais. A política
   de saúde (MATRIZ, questão 3) continua por decidir.
