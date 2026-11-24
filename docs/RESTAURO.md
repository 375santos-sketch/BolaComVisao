# Restauro de uma cópia cifrada (ensaio)

Este procedimento verifica que uma cópia `.bcvbak` volta a dar a base de dados completa. O restauro faz-se **só no
emulador local**, nunca na base real.

## Antes de começar

- **A cópia:** feita na app em Clube → Cópia cifrada da plataforma, pelo Administrador.
- **No computador:**
  - o clone do repositório, com `npm install --no-package-lock` já feito;
  - Java 21, de que o emulador precisa.
- **A frase-passe:** só o dono a escreve, no terminal, e não aparece no ecrã.

## Passos (PowerShell, na pasta do repositório)

```powershell
$env:BCV_COPIA = 'C:\caminho\bcv-backup-AAAA-MM-DD.bcvbak'
npm run ensaio:restauro
```

1. O emulador do Firestore arranca vazio e em memória.
2. O terminal pede a frase-passe.
3. A cópia é aberta e conferida com o manifesto.
4. O emulador é esvaziado e a cópia é escrita lá dentro.
5. Tudo é lido de volta e comparado.
6. O emulador fecha e desaparece: nada fica gravado no disco nem vai à nuvem.

## O relatório

Mostra só números, sem nomes nem e-mails:

- as coleções, com o número na cópia e depois do restauro;
- os documentos em falta, diferentes e a mais;
- se o SHA-256 do conjunto ficou igual;
- quanto tempo demorou.

**Aceitação:** a última linha diz `RESULTADO: OK`, com 0 em falta, 0 diferentes, 0 a mais e o SHA-256 igual.

## Depois do ensaio

- **A cópia `.bcvbak`:** fica onde estava. Guarda-a fora do computador, por exemplo numa pen, e não a ponhas no Drive.
- **Anotar:** a data, o resultado e o tempo, na tabela abaixo.

## Registo de ensaios

| Data       | Cópia de                | Documentos                                              | Resultado | Tempo total |
| ---------- | ----------------------- | ------------------------------------------------------- | --------- | ----------- |
| 24/11/2026 | 24/11/2026, 17:52 (UTC) | 316 (0 em falta, 0 diferentes, 0 a mais; SHA-256 igual) | ✅ OK     | 19,7 s      |
