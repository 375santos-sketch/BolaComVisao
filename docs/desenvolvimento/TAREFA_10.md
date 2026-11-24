# Tarefa 10 de desenvolvimento: P1-03 (versão grátis), lembrete semanal da cópia cifrada

Ramo `fix/p1-03-lembrete-copia`, a partir de `main` em `1f719b7`. Decisão 12 do dono (24/11/2026): não passar a
pago. Por isso, em vez de uma cópia automática no servidor, ficam um lembrete mais forte e a cópia cifrada manual.

## O que mudou

- **O lembrete do Início (só o Administrador)** passa a levar à **cópia cifrada da plataforma** (`.bcvbak`, com
  frase-passe).
  - Deixa de descarregar a cópia simples, sem cifra, com os dados dos atletas em claro.
  - A cópia simples continua disponível nas Definições.
- **A contagem começa na última cópia cifrada feita e verificada** neste aparelho, em `bcv-last-encrypted-backup-at`.
  - A data só é gravada depois de a cópia voltar a abrir com a mesma frase-passe.
- **Três níveis:**
  - menos de 7 dias: sem lembrete;
  - 7 a 13 dias: lembrete amarelo;
  - 14 dias ou mais, ou nunca: lembrete **vermelho**, "em atraso", com `role="alert"`.
- **"Mais tarde"** esconde o lembrete só até a app voltar a abrir.
- **O texto** pede para guardar o ficheiro fora do aparelho.

## Testes

| Teste                                                                                                                                                    | Resultado                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `backupReminder.test.ts` (8 testes: níveis, data guardada, a cópia simples não conta, o lembrete sem ficheiro em claro, a data só depois da verificação) | ✅                                    |
| Bateria unitária completa                                                                                                                                | ✅ 118 ficheiros, 727 testes          |
| Tipos, lint, formatação                                                                                                                                  | ✅                                    |
| Testes de ecrã                                                                                                                                           | Nenhum usava o lembrete; correm no CI |

Não vi o ecrã no navegador: o lembrete só aparece com sessão de Administrador, e o login Google não funciona em
localhost.

## Riscos e limitações

- **A data fica guardada só neste aparelho:** no primeiro arranque, o lembrete aparece vermelho em todos os aparelhos
  do Administrador, até ser feita uma cópia cifrada em cada um.
- **A cópia continua a depender do Administrador:** não há cópia automática (decisão 12). O critério "4 semanas
  seguidas" da P1-03 passa a depender dele.
- **A frase-passe é do Bruno:** se a perder, a cópia não abre.

## Reversão

`git revert` do merge; no AI Studio, Pull e Publish. Não mexe em dados. A chave nova do aparelho deixa de ser lida.
