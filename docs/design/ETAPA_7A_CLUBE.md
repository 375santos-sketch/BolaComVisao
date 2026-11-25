# Etapa 7a: Clube, Definições e Mais

Primeira parte da etapa 7 (restantes módulos) do [plano de evolução](PLANO_EVOLUCAO.md), feita depois de aprovada a
Análise (25/11). Estes ecrãs já usavam quase todo o Design System; esta parte acerta o que faltava.

## O que mudou

| Onde                        | Antes                                                                    | Depois                                                   |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| Emblema do clube (sem foto) | Escudo azul antigo                                                       | Escudo no verde da marca                                 |
| Clube: títulos dos grupos   | "CLUBE", "DADOS", "AJUDA" em maiúsculas pequenas                         | "Clube", "Dados", "Ajuda" em caixa normal, mais legíveis |
| Mais: títulos dos grupos    | "EQUIPA", "CLUBE", "A MINHA CONTA"                                       | Caixa normal, como no Clube                              |
| Pedidos de acesso           | ⏳ e "Ver →"                                                             | Ícone e seta de linha                                    |
| Definições do clube         | 🛡️ sem emblema, "📷 Carregar", "🗑️ Limpar a agenda", "👥 Abrir o painel" | Ícones de linha; botões de 40 a 44 px                    |

## O que não mudou

- Nenhuma função, dado, permissão ou regra.
- As mensagens de aviso rápidas (por exemplo "Agenda limpa 📅") ficam como estão.

## Testes

- Tipos, lint e os 770 testes unitários passam. Os testes de ecrã correm no CI do PR.

## Capturas

- **Antes:** `capturas/etapa-7a/antes/{mobile,desktop}/`.
- **Depois:** `capturas/etapa-7a/depois/{mobile,desktop}/`.
