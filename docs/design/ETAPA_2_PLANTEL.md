# Etapa 2: Plantel

Segunda etapa do [plano de evolução](PLANO_EVOLUCAO.md), feita depois de aprovado o Início (25/11). Assenta no
ramo do Início, por causa dos ícones novos.

## O que mudou

| Onde                             | Antes                                                              | Depois                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Topo                             | Hero com estádio, "Plantel" em itálico gigante e 4 cartões grandes | Sai o hero. Os 4 números (Atletas, Disponíveis, Lesionados, Suspensos) ficam numa só faixa                |
| Números a zero                   | Coloridos como os outros                                           | Em cinzento; só têm cor quando há alguém                                                                  |
| Filtro pelos números             | Borda verde no cartão                                              | Fundo mais claro e uma linha verde por baixo do número escolhido                                          |
| Separadores                      | Botões; o ativo verde cheio                                        | Um só nível, com uma linha verde por baixo do ativo                                                       |
| Separadores no telemóvel         | Cortados, sem aviso                                                | Deslizam, com um esbatido à direita a dizer que há mais                                                   |
| "Aniversários"                   | "1 Hoje!" a saltar                                                 | "1 hoje", em verde suave, parado                                                                          |
| Pesquisa no telemóvel            | Espremida ("Procurar atle…")                                       | Uma linha só para ela, com a largura toda; os botões e o "+ Novo" ficam na linha de baixo                 |
| Botões e filtros                 | 42 px e 28 px                                                      | 44 px e 40 px                                                                                             |
| Lista                            | Cada atleta num cartão, com uma engrenagem                         | Uma lista numa só caixa, com uma linha por atleta. A linha inteira abre a ficha, onde está "Editar Dados" |
| Títulos dos grupos               | MAIÚSCULAS ESPAÇADAS com emoji ("🛡️ DEFESAS")                      | Caixa normal, sem emoji, com a contagem ao lado ("Defesas 4")                                             |
| Ordenar por número ou nome       | "🔢 Ordenado por Número da Camisola" e "Ordem: #1 ao Maior"        | "Por número da camisola" e "Por nome" (a seta de ordem continua ao lado de "Ordenar")                     |
| Estado (indisponíveis, inativos) | Emojis ⛔ e ⏸️                                                     | Ícones de linha                                                                                           |
| Cartões dos atletas              | Gradiente, e sobem ao passar o rato                                | Superfície lisa, um tom mais clara ao passar o rato                                                       |
| Plantel vazio                    | Emoji, letra Chakra em maiúsculas e "Importar" em verde            | Ícone, título normal, "Criar atleta" verde e "Importar de Excel" secundário                               |
| "Limpar filtros"                 | Com "✕"                                                            | Só o texto, em verde                                                                                      |

## O que não mudou

- **Nenhuma** função, nenhum dado, nenhuma permissão, nenhuma regra.
- **A ficha do atleta** (`AthleteSheet`), os formulários e os outros separadores (Assiduidade, Testes, Equipa
  técnica, Aniversários): só herdam a base da etapa 0. O redesenho deles fica para uma etapa própria, se quiseres.
- **A barra de cima** (`Header`): é a mesma em todos os módulos e muda numa etapa própria, para mudar em todos ao
  mesmo tempo.

## Código

- **`SquadToolbar.tsx`:** a faixa dos números, a pesquisa, os tamanhos e os ícones.
- **`SquadTabsNav.tsx`:** os separadores num só nível.
- **`SquadListView.tsx`:** a lista em linhas. Sai a engrenagem.
- **`SquadGridView.tsx`:** os títulos dos grupos.
- **`GroupHead.tsx`** (novo): o título de grupo usado nas duas vistas.
- **`SquadView.tsx`:** o estado vazio.
- **`index.css`:** o `.squad-card` fica liso.

## Testes

- **Tipos (`tsc`):** sem erros.
- **Unitários:** os 770 passam.
- **Lint:** sem avisos.
- **Testes de ecrã:**
  - nenhum precisou de mudar, porque os nomes que procuram continuam iguais ("Procurar atleta", "Mais ações do
    plantel", "Testes", "Plantel", "Editar Dados");
  - correm no CI do PR.

## Capturas

- **Antes:** `capturas/etapa-1/depois/mobile/03-plantel-ecra.jpg` e `capturas/etapa-1/depois/desktop/03-plantel.jpg`.
- **Depois:** `capturas/etapa-2/depois/{mobile,desktop}/03-plantel-cartoes.jpg` e `03-plantel-lista.jpg`.
