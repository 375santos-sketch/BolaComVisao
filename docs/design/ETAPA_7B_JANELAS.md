# Etapa 7b: Janelas

Segunda parte da etapa 7 (restantes módulos) do [plano de evolução](PLANO_EVOLUCAO.md), feita depois de aprovado o
Clube (25/11).

## O que mudou

| Janela                                                                                               | Antes                                                | Depois                                               |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Todas (WhatsApp, imagem para os pais, equipa inicial, painel, relatório do treinador, bolas paradas) | Fechar com "✕" pequeno                               | Ícone de fechar numa área de 40 px                   |
| Títulos                                                                                              | "🖼️ EQUIPA INICIAL", "📊 PAINEL", "🎯 BOLAS PARADAS" | "Equipa inicial", "Painel · Equipa", "Bolas paradas" |
| Botões                                                                                               | 📲 📄 📊 🖨️ ➕ 📷 🔄                                 | Ícones de linha (ou só o texto)                      |
| WhatsApp                                                                                             | Fundo encaixado, botões de 32 px                     | Cartão do Design System, botões de 44 px             |
| Relatório do treinador                                                                               | 🧠, 🥇🥈🥉, cada cartão com emoji, degradê           | Sem emojis; pódio 1.º 2.º 3.º; cartão liso           |
| Cores                                                                                                | Cinzentos azulados antigos e branco puro             | Tokens do Design System                              |

## O que não mudou

- Nenhuma função, dado, permissão ou regra.
- **O conteúdo das imagens partilhadas** (imagem para os pais, equipa inicial) e as **mensagens** de WhatsApp.
- **As conclusões do relatório do treinador** vêm do motor de análise (texto gerado) e mantêm o seu ícone.
- As mensagens de aviso rápidas.

## Testes

- Tipos, lint e os 770 testes unitários passam. Os testes de ecrã correm no CI do PR.

## Capturas

- **Antes:** `capturas/etapa-7b/antes/{mobile,desktop}/` (01 WhatsApp, 02 imagem para os pais, 03 equipa inicial,
  04 bolas paradas, 05 painel, 06 relatório do treinador).
- **Depois:** `capturas/etapa-7b/depois/{mobile,desktop}/`.
