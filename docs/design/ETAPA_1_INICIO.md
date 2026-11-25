# Etapa 1: o novo Início

Implementa a [proposta do Início](PROPOSTA_DASHBOARD.md), aprovada pelo Bruno a 25/11, sobre a
[base da etapa 0](ETAPA_0_BASE.md).

## Como fica

- **Telemóvel:** uma coluna, pela ordem Hoje → Tarefas → A seguir → A equipa → Atalhos.
- **Computador:** duas colunas. À esquerda, Hoje e Tarefas; à direita (400 px), A seguir, A equipa e Atalhos. O
  conteúdo não passa de 1120 px.

| Bloco        | O que mostra                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Saudação** | Uma linha ("Bom dia, Treinador A"), o dia, a equipa e a época. À direita: o estado da gravação, o modo sol, as notificações e as definições.                                                                                                                                                                                                                                                                     |
| **Hoje**     | **Jogo:** a hora em grande, o adversário, casa ou fora, a competição, os convocados e "Convocatória por fechar" (quando é o caso), com "Iniciar Modo Jogo" e "Ver Convocatória". **Treino:** "Abrir plano de treino" e "Presenças". **Evento.** **Jogo em curso.** **Dois eventos:** os dois, o mais cedo primeiro, e só o primeiro tem o botão verde. **Nada:** uma linha discreta, "Hoje não há nada marcado." |
| **Tarefas**  | Tudo o que espera pelo treinador, com contagem e por urgência: convocatória por fechar, presenças por marcar, castigos, resumo da semana por enviar, pedidos de acesso (só administrador), marcar o próximo treino, atletas com menos minutos, assiduidade baixa, foco da semana e aniversários. Cada linha abre onde se resolve. Sem nada: "Está tudo em dia."                                                  |
| **A seguir** | Os 2 próximos eventos depois de hoje (jogos, treinos e eventos do clube), com o dia em destaque.                                                                                                                                                                                                                                                                                                                 |
| **A equipa** | 4 valores, cada um ligado a uma decisão: últimos jogos (V, E, D, com cor e letra), disponíveis hoje, presença nos treinos (âmbar abaixo de 75 %) e atletas com poucos minutos (âmbar com ícone). Cada valor abre o módulo dele.                                                                                                                                                                                  |
| **Atalhos**  | Treino de hoje (presenças), Convocatória, Plantel e Análise.                                                                                                                                                                                                                                                                                                                                                     |
| Aniversários | Só no dia: quem faz anos, com o botão "Imagem de parabéns".                                                                                                                                                                                                                                                                                                                                                      |

## O que saiu do Início, e onde continua

| Saiu                                                         | Onde continua                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| O hero "Bem-vindo, Mister!" com o estádio e o emblema        | Passou a uma linha de saudação. O emblema está na barra lateral.            |
| O aviso do resumo da semana no topo ("Rever e enviar")       | É uma tarefa: "Enviar o resumo da semana", que abre o mesmo resumo.         |
| A faixa de pedidos de acesso (administrador)                 | É uma tarefa: "Aprovar N pedidos de acesso".                                |
| Próximo treino, Próximo jogo e o resumo de minutos da semana | A seguir (os dois próximos), Agenda e Treinos → Época (minutos por semana). |
| Objetivos do mês                                             | Treinos → Época.                                                            |
| Últimas atividades                                           | Agenda (os anteriores).                                                     |
| Frase do dia e "PLANEAR • TRABALHAR • EVOLUIR"               | Saíram (eram decoração).                                                    |
| Época em 4 números, gráfico dos últimos jogos e minutos      | A equipa (resumo); o detalhe está em Estatísticas.                          |
| Foco da semana                                               | É uma tarefa, que abre a Análise.                                           |
| Próximos 7 dias                                              | A seguir (2 eventos) e a Agenda (semana).                                   |
| Assistente                                                   | Mais → Assistente.                                                          |

**Não se perdeu nenhuma funcionalidade.** Os componentes que só o Início usava foram apagados, porque ficaram sem
uso: `DashboardHeader`, `DashboardHighlights`, `HomeOverview` e `NewsletterReminder`.

## Diferenças em relação à maqueta

- **O sol e as definições ficam na linha da saudação.** Ainda não há um menu de perfil para os receber, e assim
  nenhuma função se perde.
- **Os atalhos** são Treino de hoje, Convocatória, Plantel e Análise, em vez de Novo treino, Novo atleta, Presenças e
  Análise. A visita guiada aponta para "Treino de hoje" e "Convocatória". "Novo treino" e "Novo atleta" precisam de
  abrir formulários diretamente, o que fica para as etapas de Treinos e Plantel.
- **A pastilha "Guardado"** continua visível. Os testes de ecrã leem o estado dela.
- **Os perfis (staff, coordenador)** veem o que já viam. As tarefas por equipa para o coordenador ficam para depois,
  porque precisam de dados de várias equipas ao mesmo tempo.

## O que não mudou

- Regras de negócio, permissões, Firestore e dados.
- Nenhuma biblioteca nova. Os ícones novos (seta, aviso, carta, visto, play, bolo) são traços SVG no `Icon.tsx`,
  como os outros.

## Código

- **`src/lib/homeTasks.ts`** (novo): calcula as tarefas e "A equipa" a partir do que a app já guarda.
- **`src/components/dashboard/HomeBlocks.tsx`** (novo): saudação, Tarefas, A seguir, A equipa e Atalhos.
- **`TodayFocusCard.tsx`:** redesenhado. Mostra os dois eventos quando há dois no mesmo dia e tem o estado vazio
  discreto.
- **`HomeView.tsx`:** o novo arranjo.
- **`App.tsx`:** o aviso do resumo sai do topo do Início; o Início recebe `onOpenNewsletter`.

## Testes

- **Novo:** `src/__tests__/homeTasks.test.ts` (5 testes), que cobre:
  - a ordem das tarefas e o que cada uma abre;
  - o estado vazio;
  - "marcar o próximo treino" só quando não há treino nos 7 dias seguintes;
  - V/E/D, disponíveis e plantel.
- **Atualizado:** `e2e/ecras.e2e.ts`, no teste "entrar: escolha da equipa e painel inicial":
  - a região "Avisos" passa a "Tarefas";
  - a região "Resumo da época" passa a "A equipa";
  - o botão "Ver estatísticas" passa a "Estatísticas";
  - no teste do assistente, o "Pergunte à app" passa a abrir-se em Mais → Assistente.

## Capturas

- **Antes:** `capturas/etapa-0/depois/` (a app com a base preta e verde, antes desta etapa).
- **Depois:** `capturas/etapa-1/depois/`.
- **Resultados:**
  - tipos (`tsc`) sem erros;
  - os 770 testes unitários passam;
  - lint sem avisos nos ficheiros alterados.
- **Testes de ecrã (Playwright):** correm no CI deste PR. Neste computador não correram, porque falta o navegador do
  Playwright e instalá-lo obriga a descarregar ficheiros.
