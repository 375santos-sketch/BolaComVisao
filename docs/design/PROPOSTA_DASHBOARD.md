# Proposta: o novo Início do treinador

**Fase 3 do projeto de evolução visual.** É uma maqueta estática em `mockups/dashboard.html`, com os mesmos dados
fictícios da auditoria. **A app não foi alterada.**

| Antes                                      | Depois                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `capturas/antes/mobile/02-inicio-ecra.jpg` | `capturas/proposta/mobile-inicio-ecra.jpg` e `mobile-inicio-2.jpg` |
| `capturas/antes/desktop/02-inicio.jpg`     | `capturas/proposta/desktop-inicio.jpg`                             |

Para abrir a maqueta, dá dois cliques em `mockups/dashboard.html`. Para ver a versão de telemóvel, estreita a janela.

## As três perguntas, pela ordem do ecrã

| Pergunta                             | Bloco                      | O que mostra                                                                                                                                                                        |
| ------------------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. O que tenho hoje?**             | **Hoje**                   | O compromisso do dia (jogo ou treino): hora grande, adversário, local, convocados e o que falta. Uma ação principal ("Iniciar Modo Jogo" ou "Começar treino") e uma secundária.     |
| **2. O que tenho de fazer?**         | **Tarefas** (com contagem) | Tudo o que espera pelo treinador num só sítio, por urgência: convocatória por fechar, resumo da semana por enviar, treino por marcar, presenças por registar, resultado por fechar. |
| **3. Qual é o próximo compromisso?** | **A seguir**               | Os 2 próximos eventos da agenda, com a data em destaque.                                                                                                                            |

Depois, mais abaixo:

- **A equipa:** 4 indicadores numa faixa só, todos ligados a uma decisão. São a forma (V/E/D), os disponíveis, a
  presença nos treinos e os atletas com poucos minutos (em âmbar, quando há).
- **Atalhos:** 4 ações frequentes (novo treino, novo atleta, presenças, análise).

## O que sai do Início, e porquê

| Sai                                                   | Porquê                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| O hero "Bem-vindo, Mister!" com o estádio e o emblema | Ocupava 260 px sem informação. A saudação fica numa linha.              |
| "BolaComVisão" repetido no hero                       | Já está na barra lateral ou no ícone da app.                            |
| O cartão "Próximo jogo" quando o jogo é hoje          | Repetia o cartão "Hoje".                                                |
| O aviso do resumo da semana no topo                   | Passa a ser uma tarefa, onde estão as outras.                           |
| Os botões de sol e de definições no cabeçalho         | O sol vai para o menu do perfil; as definições do clube estão em Clube. |
| A pastilha "Guardado" ou "Offline" permanente         | Só aparece quando há um problema de gravação.                           |

**Nenhuma funcionalidade desaparece:** tudo o que saiu continua acessível no mesmo módulo de sempre.

## Regras de comportamento (para a implementação)

- **O bloco "Hoje":**
  - **com um jogo hoje,** mostra o jogo e o botão "Iniciar Modo Jogo";
  - **com um treino hoje,** mostra o treino e o botão "Começar treino";
  - **sem nada,** mostra "Hoje não há nada marcado" e passa o próximo evento para o topo de "A seguir";
  - **com dois eventos,** mostra os dois, primeiro o mais cedo.
- **As tarefas** calculam-se com os dados que a app já tem (não é preciso guardar nada novo):

  | Tarefa                    | Quando aparece                                                                      |
  | ------------------------- | ----------------------------------------------------------------------------------- |
  | Fechar a convocatória     | Há um jogo nas próximas 72 h e a convocatória não está fechada                      |
  | Enviar o resumo da semana | O resumo está pronto e não foi enviado                                              |
  | Marcar o próximo treino   | Não há nenhum treino nos próximos 7 dias                                            |
  | Registar presenças        | Houve um treino ontem ou hoje, já passou da hora, e as presenças não estão fechadas |
  | Fechar o resultado        | Houve um jogo e não está dado como acabado                                          |
  - Cada tarefa abre o ecrã onde se resolve.
  - Sem tarefas, o bloco diz "Está tudo em dia", em linha discreta.

- **Perfis:**
  - **Coordenador e diretor:** "Tarefas" mostra as das equipas que veem, com o nome da equipa.
  - **Staff:** não vê as tarefas de convocatória nem os indicadores de minutos, porque não lhes tem acesso.
  - As permissões **não mudam**; o Início só mostra o que cada perfil já podia ver.
- **No telemóvel:** a ordem fixa é Hoje → Tarefas → A seguir → A equipa → Atalhos. O primeiro ecrã mostra o bloco Hoje
  inteiro e o início das Tarefas.
- **No computador:** duas colunas. À esquerda, Hoje e Tarefas; à direita, A seguir, A equipa e Atalhos.

## Notas sobre a maqueta

- **O "B" verde** é o lugar do logótipo; a implementação usa o logótipo real.
- **O jogo "vs Esparteiros, 5 dez"** não está nos dados de teste; foi posto para mostrar como fica "A seguir" com dois
  eventos.
- **A barra lateral do computador** já usa a estrutura proposta, com os mesmos 5 grupos do telemóvel. Isso pertence
  à decisão de navegação (P4) e pode ser aprovado à parte do Início.
