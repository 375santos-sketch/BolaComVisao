# Etapa 7g: Página dos encarregados

Sétima parte da etapa 7 (restantes módulos) do [plano de evolução](PLANO_EVOLUCAO.md). A página já usava o Design
System; ficavam os emojis e alguns sublinhados.

## O que mudou

| Onde                 | Antes                                              | Depois                                   |
| -------------------- | -------------------------------------------------- | ---------------------------------------- |
| Para ver em casa     | 🎬 no título, ▶ em cada sessão                     | Ícone de linha; botões de 44 px          |
| O Meu Percurso       | 🎯 no título, "▶ Passar ao Modo atleta"            | Ícone de linha; botão principal de 48 px |
| Aviso de privacidade | 🔒 e letra de 11 px                                | Cadeado de linha e letra de 12 px        |
| Ligações             | "Esqueci-me…", "Deixar de acompanhar…" sublinhadas | Texto a negrito, área de toque de 40 px  |

## O que não mudou

- Nenhuma função, dado, permissão ou regra; o encarregado continua a ver só o seu educando.
- O texto publicado pela app do treinador (por exemplo "⚽ Dragões vs Abrantes"), que é o mesmo do calendário.

## Testes

- Tipos, lint e os 770 testes unitários passam. O teste de ecrã do percurso passa no telemóvel e no computador.
- O teste de ecrã do percurso passa a procurar "Passar ao Modo atleta".

## Capturas

- **Antes:** `capturas/etapa-7g/antes/{mobile,desktop}/`: g01 entrar, g02 aceitar o convite, g03 à espera,
  g04 página do encarregado (com p2) e g05 cartão do percurso.
- **Depois:** `capturas/etapa-7g/depois/{mobile,desktop}/`.
