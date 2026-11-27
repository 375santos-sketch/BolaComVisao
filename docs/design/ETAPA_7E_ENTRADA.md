# Etapa 7e: Entrada e criação de conta

Quinta parte da etapa 7 (restantes módulos) do [plano de evolução](PLANO_EVOLUCAO.md), feita depois de aprovada a Agenda
(27/11).

## O que mudou

| Onde                 | Antes                                                           | Depois                                                                  |
| -------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Topo                 | Logótipo com brilho, "GESTÃO TÁTICA & DESPORTIVA", 🛡️           | Logótipo sem brilho, "Gestão tática e desportiva", cadeado de linha     |
| Separadores          | "🔑 Entrar" e "✍️ Criar Conta" em verde                         | "Entrar" e "Criar conta", como os outros separadores da app             |
| Campos               | 👤 e 🔒 por cima do texto escrito; etiquetas a verde            | Ícones de linha com espaço próprio; etiquetas discretas em caixa normal |
| Botões principais    | "Entrar na Plataforma ➔", "🚀 Concluir Registo / Criar Conta ➔" | "Entrar" e "Criar conta", com seta de linha                             |
| Erros                | ⚠️ e "✕" pequeno                                                | Ícone de aviso e botão de fechar de 40 px                               |
| Criar conta          | ℹ️ 🎟️ 🧢 🏟️ ❌, etiquetas em maiúsculas                         | Só texto; "Sou treinador" e "Sou um clube"                              |
| A aguardar aprovação | ⏳ 📲 💬 📧 📋 🛡️ 🔄, títulos em maiúsculas, botão âmbar        | Ícones de linha; "Verificar a aprovação" é o único botão verde          |
| Sessão terminada     | Faixa cor-de-rosa com 🔑 e maiúsculas                           | Faixa de erro do Design System                                          |

## O que não mudou

- Nenhuma função, dado, permissão ou regra; a entrada e o registo funcionam como antes.
- O botão do Google fica branco, como o Google pede.
- As mensagens de aviso rápidas e o texto da mensagem enviada ao administrador.

## Testes

- Tipos, lint e os 770 testes unitários passam. Os testes de ecrã correm no CI do PR.

## Capturas

- **Antes:** `capturas/etapa-7e/antes/{mobile,desktop}/`. Os ficheiros são 01 entrar, 02 erro ao entrar, 03 criar conta
  (com p2 e p3) e 04 a aguardar aprovação (com p2).
- **Depois:** `capturas/etapa-7e/depois/{mobile,desktop}/`.
- Os dados são fictícios e vivem só no emulador. O guião cria uma conta de teste para mostrar o ecrã "a aguardar
  aprovação".
