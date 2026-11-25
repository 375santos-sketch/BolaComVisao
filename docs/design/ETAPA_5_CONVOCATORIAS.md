# Etapa 5: Convocatórias

Quinta etapa do [plano de evolução](PLANO_EVOLUCAO.md), feita depois de aprovado Jogos (25/11).

## O que mudou

| Onde                   | Antes                                                        | Depois                                                                                          |
| ---------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Cartão do jogo         | Barra de progresso verde-água, cores soltas (slate, emerald) | Barra no verde da marca; textos com os tokens do Design System                                  |
| Quatro ações           | Emojis (🖼️ 🗺️ 💬), 2 × 2 também no computador                | Ícones de linha, 44 px; numa só linha no computador                                             |
| Concentração e avisos  | Seta "▾" em texto                                            | Seta em ícone, que roda ao abrir; campo de avisos com o estilo do Design System                 |
| Atletas                | Título "ATLETAS (10/10)" em maiúsculas                       | "Atletas 10/10" em caixa normal; "Por assiduidade · Todos · Limpar" com área de toque maior     |
| Alertas                | 🟥 🟨 ⚠️ e cores rosa/âmbar soltas                           | Marcas de cartão desenhadas, ícone de alerta, cores de aviso e de perigo do Design System       |
| Cada atleta            | Visto "✓" em texto; lesão com 🏥 e castigo com 🟥            | Visto em ícone; lesão e castigo com ícone de alerta (a cor nunca está sozinha: há o texto)      |
| Bolas paradas          | Cartão azul antigo, "🎯 BOLAS PARADAS", link sublinhado      | Cartão do Design System, título em caixa normal, botão secundário "Criar caderno"               |
| PDF e Excel            | 📄 📊                                                        | Ícones de linha, 44 px                                                                          |
| Finalizar (computador) | Botão fixo a meio do ecrã, por cima dos botões PDF e Excel   | Barra presa ao fundo da página, botão à direita; no fim da página fica depois do PDF e do Excel |
| Finalizar (telemóvel)  | "✓ Finalizar Convocatória"                                   | Igual no sítio; ícone em vez do carácter "✓"                                                    |
| Sem jogos              | 📋 "Sem Jogos no Calendário", "+ Ir para Calendário"         | Ícone, "Sem jogos na Agenda", botão secundário "Ir para a Agenda"                               |

## O que não mudou

- Nenhuma função, dado, permissão ou regra: as mesmas escolhas, os mesmos alertas e os mesmos cálculos de minutos.
- **Os avisos rápidos** (por exemplo "Convocatória finalizada com sucesso! ✓") ficam como estão.
- **As janelas** (WhatsApp, imagem para os pais, equipa inicial) e o caderno de bolas paradas ficam para a etapa 7.
- **O histórico contra o adversário** (cartão partilhado com os Resultados) fica para a etapa 6.

## Código

- **`ConvocatoriaView.tsx`:** tokens, ícones e o botão principal no computador.
- **`setpieces/SetPiecesCard.tsx`:** o cartão de bolas paradas.
- **`ui/Icon.tsx`:** cinco ícones novos (imagem, ficheiro, mensagem, ordenar, visto simples).
- **`e2e/ecras.e2e.ts`:** o teste da lesão procura o texto sem o 🏥.

## Testes

- **Tipos (`tsc`):** sem erros.
- **Unitários:** os 770 passam.
- **Lint:** sem avisos.
- **Testes de ecrã:** correm no CI do PR. Os nomes que procuram mantêm-se ("Jogo da convocatória", "Finalizar
  Convocatória", "Enviar por WhatsApp", "Com menos minutos", "Bolas paradas", …).

## Capturas

- **Antes:** `capturas/etapa-5/antes/{mobile,desktop}/`.
- **Depois:** `capturas/etapa-5/depois/{mobile,desktop}/`.
