# Etapa 7h: Antes e depois, modo sol e revisão final

Última parte da etapa 7 (restantes módulos) do [plano de evolução](PLANO_EVOLUCAO.md).

## O que mudou

| Onde                    | Antes                                                         | Depois                                                            |
| ----------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| Fundo da app            | Azul-escuro `#08141e` (tema antigo): faixa azulada na entrada | Preto do Design System `#0a0b0c`                                  |
| Temas antigos           | Ciano e dourado nas variáveis antigas (escuro e modo sol)     | Verde, preto e branco do Design System (escuro e modo sol)        |
| Avisos rápidos          | Letra de máquina e ⚽ ciano                                   | Letra normal e ícone de linha verde                               |
| Texto selecionado       | Ciano                                                         | Verde da marca                                                    |
| Antes e depois da época | 📸 📷 📲, "AS DUAS FOTOS DA EQUIPA", cinzentos antigos        | Ícones de linha, títulos em caixa normal, tokens do Design System |

## O que não mudou

- Nenhuma função, dado, permissão ou regra.
- O tema "Oceano noturno", que o treinador pode escolher na Aparência.
- O texto das mensagens de aviso rápidas e a imagem gerada para partilhar (o conteúdo da imagem).

## Testes

- Tipos, lint e os 770 testes unitários passam. Os testes de ecrã correm no CI do PR.
- O teste de ecrã do "Antes e depois" passa a procurar "Partilhar imagem".

## Capturas

- **Antes e depois:** `capturas/etapa-7h/{antes,depois}/{mobile,desktop}/`. Os ficheiros são 00 fundo da entrada
  (escuro), 01 a 09 os ecrãs principais em modo sol e a01 a a03 a janela "Antes e depois".
