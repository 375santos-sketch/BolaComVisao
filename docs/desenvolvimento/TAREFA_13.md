# Tarefa 13 de desenvolvimento: P0-05 · F3.3, verificar as cópias privadas

Ramo `fix/p0-05-f33-verificar-privados`, a partir do ramo da P1-04 (`fix/p1-04-ensaio-restauro`, PR 192), porque usa o
mesmo pedido de frase-passe. **O PR 192 deve entrar primeiro.**

## O que é o F3.3

É a primeira fase da P0-05 (MATRIZ, questão 2) e só lê. Confirma, clube a clube, que as cópias dos dados privados em
`club_workspace/{clube}/private` batem certo com o que está no perfil desportivo do atleta (`records/player`) e nas
notas dos jogos (`records/match`). Só depois de isto bater certo faz sentido o F3.4 (ligar a escrita dupla em todos os
clubes) e o F3.5 (a app passar a ler das cópias privadas).

## O que mudou

- **`src/lib/privateCheck.ts`:** `checkPrivateCopies(documentos)` calcula as cópias privadas que o perfil desportivo
  implica (com a mesma função que as escreve, `extractPrivateRecords`) e compara-as com as que existem. Conta, por clube
  e por tipo:
  - as esperadas, as iguais, as em falta e as diferentes;
  - as que estão a mais, porque o atleta ou o jogo já não existe, ou porque o campo foi esvaziado.
- **`npm run verificar:privados`:** abre uma cópia cifrada `.bcvbak`, pede a frase-passe sem a mostrar e imprime o
  relatório.
  - Não liga à base real nem ao emulador, e não escreve nada.
  - O relatório só tem números e o identificador de cada clube: nenhum nome, contacto ou nota.
- **`scripts/askHidden.ts`:** o pedido da frase-passe sai do ensaio de restauro e passa a ser partilhado pelos dois
  comandos.
- **A app não muda.**

## Como correr (PowerShell, na pasta do repositório)

```powershell
$env:BCV_COPIA = 'C:\caminho\bcv-backup-AAAA-MM-DD.bcvbak'
npm.cmd run verificar:privados
```

**Aceitação:** nos clubes com a escrita dupla ligada, 0 em falta e 0 diferentes (`RESULTADO: OK`). Os clubes
desligados aparecem só para mostrar quantas cópias o F3.4 vai criar.

## Testes

| Teste                                                                                                   | Resultado |
| ------------------------------------------------------------------------------------------------------- | --------- |
| `privateCheck.test.ts`: tudo igual dá OK                                                                | ✅        |
| Em falta, diferentes (incluindo uma cópia apagada) e a mais são contados, e o resultado deixa de ser OK | ✅        |
| Atletas apagados ignorados; clubes desligados mostrados sem contar para o resultado                     | ✅        |
| Sem clubes ligados, e um clube ligado vazio                                                             | ✅        |
| O relatório não contém nenhum nome, telefone, contacto ou nota (dados fictícios)                        | ✅        |
| Sobre uma cópia cifrada criada e aberta com a frase-passe, como faz o comando                           | ✅        |
| Tipos, lint                                                                                             | ✅        |

Todos os testes do repositório passam, menos um, que só falha neste computador. É o da exportação da ficha de jogo,
porque aqui as bibliotecas já estão atualizadas pela P1-07, e o PR 193 corrige-o. No CI, que instala as bibliotecas
deste ramo, passa.

## Riscos e limitações

- **A verificação é tão recente quanto a cópia.** As alterações feitas depois da cópia não entram. Para o F3.4, convém
  fazer uma cópia nova e repetir.
- **"Diferentes" não é sempre um erro.** Uma cópia privada só é atualizada quando grava alguém que pode escrever
  aquele tipo (D1–D8). Se, por exemplo, só o staff mexeu no atleta depois, a cópia fica para trás até ao próximo
  gravar de um treinador. O relatório mostra o tipo, para se perceber qual é.
- **Durante a verificação,** os dados decifrados estão só na memória do computador e desaparecem quando o comando
  acaba.

## Próximas fases (cada uma com a tua aprovação)

- **F3.4:** ligar a escrita dupla em todos os clubes. Reversível: desliga-se o interruptor.
- **F3.5:** a app passa a ler de `private/*`. Antes disto é preciso decidir a política de saúde (MATRIZ, questão 3):
  hoje o fisioterapeuta deixaria de ver o motivo da lesão.
- **F3.6:** limpar os campos do `player`. É uma migração de dados e só se faz com uma cópia cifrada nova.
- **F3.7:** as regras passam a recusar campos privados no `player`.

## Reversão

`git revert` do merge. Não mexe na app nem em dados.
