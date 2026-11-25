# Etapa 0: a base do Design System (preto, verde e branco)

Primeira etapa do [plano de evolução](PLANO_EVOLUCAO.md), depois de aprovados o [Design System](DESIGN_SYSTEM.md) e
a [proposta do Início](PROPOSTA_DASHBOARD.md). **A app inteira muda de cor de uma só vez, mas nenhum ecrã muda de
estrutura.** A estrutura muda a partir da etapa 1, que é o Início.

## O que mudou

| Onde                                    | Antes                                 | Depois                                                                                                                            |
| --------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Fundo e superfícies                     | Azul-noite (`#0b1220`, `#111a2b`…)    | Preto neutro (`#0A0B0C`, `#131517`, `#1B1E21`, `#24282C`)                                                                         |
| Cor da marca (botões, ativo, foco)      | Ciano `#22c3ee`                       | Verde `#2EDB74`, com texto `#05210F` por cima                                                                                     |
| Sucesso e vitória                       | Verde `#22c55e`                       | Verde-água `#34C3A0`, para não se confundir com a marca                                                                           |
| Aviso e erro                            | `#f5b301` e `#ef4444`                 | `#F2B33D` e `#F0605A`                                                                                                             |
| Texto                                   | `#e7eef7` e `#8b9bb4` (azulados)      | `#F5F7F6` e `#9BA3A0`, mais `subtle` `#6B7370` para texto desativado                                                              |
| Escalas `slate` e `gray` (lado escuro)  | Azuladas                              | Cinzentos neutros, os mesmos das superfícies                                                                                      |
| Escala de destaque (`cyan-*` no código) | Ciano do Tailwind                     | Tons do verde, calculados com a mesma fórmula da cor do clube                                                                     |
| Escala `emerald-*` (sucesso nos ecrãs)  | Verde-esmeralda                       | Verde-água                                                                                                                        |
| Cartões                                 | Raio de 12 px, sombra                 | Raio de 16 px e uma linha de 1 px; o cartão em destaque sobe de superfície, sem sombra difusa                                     |
| Botão principal                         | Com brilho (`glow`)                   | Verde liso; mais escuro quando pressionado                                                                                        |
| Botão secundário ao passar o rato       | Borda ciano                           | Superfície um tom acima                                                                                                           |
| Campos                                  | Fundo encaixado, anel ciano de 3 px   | Superfície 2, borda verde mais anel verde (2 px no total)                                                                         |
| Etiquetas                               | Raio de 6 px                          | Raio de 8 px                                                                                                                      |
| Fundo das janelas                       | Azul-escuro a 72 %                    | Preto a 72 %                                                                                                                      |
| Janelas, menus e folhas                 | Sombra média                          | Sombra mais funda (só nestes)                                                                                                     |
| Modo sol                                | Azul `#0284c7` em fundo cinza-azulado | Verde `#0E7A3A` em `#F4F6F5`; sucesso `#0B735A`, aviso `#8A5B0A`, erro `#C2362F`, texto secundário `#5E6662` (todos AA em branco) |
| Gráficos do Painel de estatísticas      | Ciano fixo                            | A cor da marca (ou a do clube)                                                                                                    |
| Barra do telemóvel e ícone instalado    | `#060e17` e `#06b6d4`                 | `#0A0B0C`                                                                                                                         |

## A cor do clube (decisão 2)

- **Continua a funcionar como hoje.** O clube que escolheu outra cor (vermelho, azul, amarelo…) continua com ela.
- **O verde passa a ser a cor de origem.** A primeira opção da lista chama-se agora "Verde BolaComVisão".
- **O clube que tinha gravado o ciano antigo** (a antiga primeira opção, "Azul BolaComVisão") passa a ver o verde. Não se
  muda nenhum dado: a app só passa a ler esse valor antigo como "a cor de origem".

## O que não mudou

- **Nada** de regras de negócio, permissões, Firestore ou dados.
- **Nenhuma** funcionalidade, nenhum texto e nenhuma estrutura de ecrã.
- **Nenhuma** biblioteca nova.
- **Ficam para as etapas dos módulos**, porque fazem parte do redesenho de cada ecrã:
  - os "heros" com estádio e luz (Início, Plantel, Planeamento, Escolher Equipa), que ainda têm tons azuis;
  - as alturas de 44 px dos botões e dos campos;
  - os emojis nos botões;
  - as letras em itálico gigante;
  - as imagens geradas (resumo da semana, convocatória em imagem), que já usam a cor do clube e por isso passam a
    verde. O desenho delas não mudou.

## Capturas

Com os mesmos dados fictícios do emulador e os mesmos ecrãs da auditoria:

- **Antes:** `capturas/antes/mobile/` e `capturas/antes/desktop/`, tiradas na fase 1 da mesma versão da app.
- **Depois:** `capturas/etapa-0/depois/mobile/` e `capturas/etapa-0/depois/desktop/`.

## Testes

- **Novo:** `src/__tests__/designBase.test.ts` verifica:
  - que a marca é o verde, num fundo preto;
  - que o sucesso é diferente da marca;
  - que a escala verde do CSS é igual à que a cor do clube calcula (não há salto ao trocar de cor);
  - que o ciano antigo passa a verde e que as outras cores do clube ficam como estão.
- **Resultados:**
  - tipos (`tsc`) sem erros;
  - os 761 testes unitários passam;
  - lint sem avisos nos ficheiros alterados.
