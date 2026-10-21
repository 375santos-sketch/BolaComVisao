# BolaComVisão — Registo de Jogos e Gestão de Equipas

> **Antes de alterar código, ler [docs/NOTAS_DE_PASSAGEM.md](docs/NOTAS_DE_PASSAGEM.md)** (como a app guarda os dados, como se publica, armadilhas conhecidas).

Aplicação de gestão tática, registo de jogos e coordenação de equipas técnicas com sincronização em tempo real na Cloud (Firebase Firestore & Firebase Authentication).

---

## Ativar Autenticação por Email/Palavra-passe (Firebase Authentication)

Para permitir que os utilizadores e treinadores se registem e iniciem sessão diretamente com utilizador/email e palavra-passe:

1. Acede à [Consola do Firebase](https://console.firebase.google.com/).
2. Seleciona o teu projeto (**ai-studio-registodejogosge-...**).
3. No menu lateral esquerdo, clica em **Authentication** (ou _Autenticação_).
4. Clica no separador **Sign-in method** (ou _Método de início de sessão_).
5. Na lista de fornecedores, clica em **Email/Password** (ou _E-mail/palavra-passe_).
6. Ativa o comutador **Enable** (ou _Ativar_) e clica em **Guardar** (_Save_).

> **Nota:** Se este método estiver desativado, o Firebase devolve o erro `auth/operation-not-allowed`. Enquanto não estiver ativo, os utilizadores podem também utilizar o botão **"Registar com a Conta Google"**.

---

## Publicação e Atualização das Regras do Firestore

O ficheiro de regras de segurança `firestore.rules` define as políticas de acesso e segurança à base de dados Firestore (acesso do Administrador Mestre, aprovação de treinadores, isolamento multi-tenant e validação de esquemas).

### Opção 1: Publicação Automática via GitHub Actions (Recomendado)

O repositório inclui um fluxo de CI/CD automatizado em `.github/workflows/firestore-rules.yml` que valida e publica as regras no Firebase sempre que o ficheiro `firestore.rules` é modificado na branch principal.

Para ativar o deploy automático:

1. No seu terminal local, gere um token da Firebase CLI correndo:
   ```bash
   npx firebase-tools login:ci
   ```
2. Copie o token de autenticação gerado.
3. No GitHub, aceda ao repositório -> **Settings** -> **Secrets and variables** -> **Actions**.
4. Crie um novo Repository Secret chamado `FIREBASE_TOKEN` e cole o token.
5. A partir deste momento, qualquer push ou merge com alterações a `firestore.rules` faz o deploy automático para o Firebase.

---

### Opção 2: Fallback Manual via Consola Firebase

1. Aceda à [Consola do Firebase](https://console.firebase.google.com/).
2. Selecione o projeto **ai-builder-project** (`glowing-orbit-vk8sk`).
3. No menu lateral esquerdo, clique em **Firestore Database**, escolha no topo a base de dados **ai-studio-registodejogosge-…** (não a `(default)`) e selecione o separador **Regras** (_Rules_).
4. Abra o ficheiro `firestore.rules` deste projeto, copie todo o seu conteúdo e cole-o no editor de regras da consola.
5. Clique no botão **Publicar** (_Publish_).

### Opção 3: Fallback Manual via Firebase CLI Local

Caso tenha a Firebase CLI instalada e autenticada localmente:

```bash
firebase deploy --only firestore:rules
```

---

## Estrutura de Permissões e Acessos

- **Administrador Mestre Padrão**: Definido centralmente em `src/lib/constants.ts` (`375.santos@gmail.com`).
- **Treinadores & Equipa Técnica**: Registam-se com conta Google ou credenciais e entram em estado pendente até aprovação do Administrador no painel de **Gestão de Acessos & Treinadores**.

### Procedimento de Recuperação de Acesso de Administrador

Caso a conta de email `375.santos@gmail.com` fique inacessível ou seja necessário promover um novo utilizador a Administrador com soberania total, existem duas abordagens suportadas pelas regras do Firestore:

#### Método A: Atribuição de Custom Claim via Firebase Admin SDK (Node.js)

As regras de segurança validam o token de autenticação verificando `request.auth.token.admin == true` ou `request.auth.token.role == 'admin'`. Pode atribuir este privilégio a qualquer `UID` de utilizador correndo o seguinte script com o Firebase Admin SDK:

```javascript
// recover-admin.js (executado com credenciais de Service Account)
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function grantAdminPrivileges(targetUid) {
  // Define o custom claim 'admin' e 'role' no utilizador Firebase Auth
  await admin.auth().setCustomUserClaims(targetUid, {
    admin: true,
    role: 'Administrador'
  });
  console.log(`Sucesso: O utilizador com UID "${targetUid}" agora é Administrador Mestre.`);
}

// Substitua pelo UID do utilizador que deve receber privilégios de Administrador
grantAdminPrivileges('UID_DO_UTILIZADOR_AQUI');
```

#### Método B: Criação de Documento na Coleção `/admins` (Consola Firestore)

1. Aceda à [Consola do Firebase](https://console.firebase.google.com/) -> **Firestore Database**.
2. Na lista de coleções, crie ou selecione a coleção `admins`.
3. Crie um novo documento com o **ID do Documento igual ao UID do utilizador** (ex: `AbC123XyZ456` obtido no separador Authentication).
4. Adicione os seguintes campos ao documento:
   - `uid` (string): `<UID_DO_UTILIZADOR>`
   - `email` (string): `novo.admin@clube.com`
   - `role` (string): `Administrador`
   - `grantedAt` (number): `1740398400000` (timestamp atual em ms)
5. No documento `/users/{UID_DO_UTILIZADOR}`, defina `account.role = "Administrador"` e `account.status = "approved"`.
6. O utilizador terá imediatamente acesso irrestrito de Administrador Mestre ao iniciar sessão.

## Testes

| Comando                 | O que testa                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `npm test`              | Regras de cálculo (minutos de jogo, épocas, sincronização…), sem navegador nem Firebase.      |
| `npm run test:emulator` | Sincronização e regras de segurança contra os emuladores do Firebase.                         |
| `npm run test:e2e`      | Ecrãs da app num navegador (tamanho de telemóvel) com dois treinadores, contra os emuladores. |

Os dois últimos precisam de Java (emuladores do Firebase). Os testes de ecrã usam dados fictícios (`e2e/seed.ts`)
e nunca tocam na base de dados real. Se um teste falhar, `npx playwright show-report` mostra o ecrã e o
passo onde falhou.
