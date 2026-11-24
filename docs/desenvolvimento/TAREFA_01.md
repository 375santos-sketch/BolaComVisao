# Tarefa 01 de desenvolvimento: P0-04, base de comparação dos acessos

Ramo: `test/p0-04-base-acessos`, a partir de `main` em `865092e`. Plano de referência: `PLANO_INTERVENCAO.md` (P0-04)
e `ROADMAP_TECNICO.md` (Etapa 1, passo 1).

## Porque é esta a primeira intervenção

O pedido dava prioridade à F3 (dados privados dos atletas) **se estivesse validada**. Não está:

- a F3 precisa das decisões 2 e 3 (política de saúde) e de parecer jurídico ⚖️;
- precisa do inventário de produção (P0-01) e do ensaio de restauro (P1-04);
- a fase F3.6 é uma migração de dados.

Nada disto foi aprovado. Pelas regras do pedido ("migrações de dados, permissões com impacto não validado →
proposta primeiro"), a F3 não pode começar.

A P0-04 é o primeiro passo do roadmap que não precisa de decisões, não mexe em dados nem em regras, e é **pré-requisito
direto da F3, da migração de `main` e das regras estritas**. Fixa o "antes", para cada um desses passos mostrar
exatamente o que mudou.

## Problema

O comportamento atual das regras nos pontos fracos identificados na auditoria não estava fixado em testes. O teste
`privateRecords.emulator.ts` (F3.1) cobre os registos privados separados, mas usa perfis de atleta **sem** campos
privados. Não havia testes para:

1. o staff a receber os campos privados que ainda estão dentro do perfil `player`;
2. o modelo antigo a ler todas as equipas do clube;
3. uma conta aprovada sem clube a ler e a convidar para `main`;
4. a coleção `clubs/{clube}/{qualquer}/{doc}` sem validação;
5. `system/*` lido por qualquer conta com sessão;
6. o conteúdo (`data`) dos registos sem validação.

## Comportamento atual

Medido pelos testes novos, com as regras reais de `firestore.rules` no emulador:

- o staff lê `phone`, `statusNote`, `coachNotes` e `evaluations` no registo `player`, também pela API REST direta;
- no modelo antigo, uma conta aprovada lê os atletas das duas equipas do clube, e a lista inteira sem filtro;
- uma conta aprovada sem `clubId` lê o `main` e **cria convites para `main`**: era uma suspeita [S] na Tarefa 02 e
  agora está confirmada [F];
- um membro escreve em `clubs/{o seu clube}/…` um documento de cerca de 200 KB com 60 chaves livres;
- uma conta sem clube lê `system/dadosPrivados`;
- um registo `player` aceita 80 chaves livres em `data` (o envelope continua validado).

## Comportamento pretendido nesta intervenção

**Nenhuma mudança de comportamento.** Só testes. O comportamento a manter e os pontos fracos ficam escritos como estão
hoje. Cada ponto fraco tem no nome a tarefa que o vai corrigir (`[A CORRIGIR … · P0-0x]`).

Quando essa tarefa mudar as regras, o teste falha de propósito e é atualizado no mesmo PR para "recusado".

## Ficheiros, dados e módulos envolvidos

- **Novo:** `src/__emulator__/accessBaseline.emulator.ts` (14 testes).
- **Lidos, sem alterações:** `firestore.rules`, `src/services/firebase.ts` (ligação ao emulador).
- **Dados:** só fictícios, criados no emulador com as regras abertas e verificados depois com as regras reais. Nenhum
  dado real.

## Dependências e riscos de regressão

- O teste corre na suite `npm run test:emulator` (CI "Testes de ecrã e de integração").
- Limpa o emulador no início, como os outros ficheiros desta pasta. A suite corre os ficheiros um de cada vez
  (`fileParallelism: false`), por isso não interfere com os outros.
- Não há risco para a app: nenhum ficheiro de produção foi alterado.

## Reversão

Ver `INSTRUCOES_REVERSAO.md`: apagar um ficheiro de teste, sem efeito na app nem nos dados.
