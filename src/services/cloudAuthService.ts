import {
  db,
  auth,
  saveMasterClubState,
  loadMasterClubState,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  getFirestoreQuotaState,
  isQuotaExceededError,
  markQuotaExhausted
} from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { AppState, UserAccount, UserStatus, TeamInvitation } from '../types';
import { MASTER_ADMIN_EMAIL, MASTER_ADMIN_USERNAME } from '../lib/constants';
import { uid as generateUid } from '../lib/utils';

const LOCAL_SESSION_KEY = 'bolacomvisao_user_session_v1';

interface AuditLogEntry {
  id?: string;
  userId: string;
  userName: string;
  action:
    | 'login'
    | 'logout'
    | 'permission_change'
    | 'data_export'
    | 'data_import'
    | 'team_switch'
    | 'user_approval'
    | 'user_rejection'
    | 'user_deletion'
    | string;
  target?: string;
  details: string;
  timestamp?: number | string;
  clubId?: string;
}

/**
 * Logs an append-only audit event to Firestore for security monitoring.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const logId = generateUid();
    const logRef = doc(db, 'audit_logs', logId);
    await setDoc(
      logRef,
      cleanFirestoreData({
        ...entry,
        id: logId,
        timestamp: entry.timestamp || new Date().toISOString(),
        createdAt: Date.now()
      })
    );
  } catch (err) {
    console.warn('Falha ao registar log de auditoria (não-bloqueante):', err);
  }
}

/**
 * Deep sanitizes an object by stripping any undefined properties recursively
 * to ensure 100% compatibility with the Firestore Web SDK.
 */
function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  try {
    return JSON.parse(JSON.stringify(obj, (_key, value) => (value === undefined ? undefined : value)));
  } catch (err) {
    console.warn('cleanFirestoreData fallback:', err);
    return obj;
  }
}

/**
 * The single, definitive Master Administrator email for BolaComVisão.
 * Re-exported from central constants for backward compatibility.
 */
export const ADMIN_EMAIL = MASTER_ADMIN_EMAIL;

/**
 * Checks if an email strictly matches the designated Master Administrator.
 */
export function isStrictAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === MASTER_ADMIN_EMAIL.toLowerCase().trim();
}

/**
 * Formats Firebase Authentication errors into clear, friendly Portuguese messages with actionable advice.
 */
function formatFirebaseAuthError(err: any): string {
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const code = err?.code || '';
  const rawMsg = err?.message || String(err || '');

  if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
    return `Domínio não autorizado pelo Firebase Authentication ("${currentHostname || 'atual'}"). Para autenticar com a Conta Google neste endereço, adicione "${currentHostname || 'este domínio'}" na Consola Firebase (Authentication > Definições > Domínios Autorizados). Em alternativa, pode entrar diretamente através de Utilizador/Email e Palavra-passe do clube ou em Modo Convidado.`;
  }

  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    rawMsg.includes('popup-closed-by-user')
  ) {
    return 'A janela de autenticação Google foi fechada antes de concluir o início de sessão.';
  }

  if (code === 'auth/popup-blocked' || rawMsg.includes('popup-blocked')) {
    return 'A janela de popup foi bloqueada pelo navegador. Permita popups para este site ou utilize a entrada com utilizador e palavra-passe.';
  }

  if (
    code === 'auth/operation-not-allowed' ||
    rawMsg.includes('operation-not-allowed') ||
    rawMsg.includes('OPERATION_NOT_ALLOWED')
  ) {
    return 'Este método de autenticação não está ativo na consola Firebase (Authentication > Sign-in method). Ative o fornecedor pretendido ou entre com as credenciais do clube.';
  }

  if (code === 'auth/network-request-failed' || rawMsg.includes('network-request-failed')) {
    return 'Falha de comunicação com os servidores. Verifique a sua ligação à internet.';
  }

  if (code === 'auth/user-disabled' || rawMsg.includes('user-disabled')) {
    return 'Esta conta de utilizador foi desativada pelo Administrador.';
  }

  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    rawMsg.includes('invalid-credential') ||
    rawMsg.includes('INVALID_LOGIN_CREDENTIALS') ||
    rawMsg.includes('EMAIL_NOT_FOUND') ||
    rawMsg.includes('INVALID_PASSWORD')
  ) {
    return 'Utilizador ou palavra-passe incorretos.';
  }

  if (
    code === 'auth/email-already-in-use' ||
    rawMsg.includes('email-already-in-use') ||
    rawMsg.includes('EMAIL_EXISTS')
  ) {
    return 'Este endereço de email ou utilizador já se encontra registado.';
  }

  if (code === 'auth/weak-password' || rawMsg.includes('weak-password')) {
    return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  }

  if (code === 'auth/invalid-email' || rawMsg.includes('invalid-email')) {
    return 'Formato de email inválido.';
  }

  if (code === 'auth/too-many-requests' || rawMsg.includes('too-many-requests')) {
    return 'Muitas tentativas falhadas. Aguarde alguns instantes ou use outro método.';
  }

  return rawMsg || 'Erro na autenticação. Verifique os dados e tente novamente.';
}

/**
 * Checks if an active user account is an authenticated Administrator.
 */
export function isAppAdmin(user?: UserAccount | null): boolean {
  if (!user) return false;
  return user.role === 'Administrador' || isStrictAdminEmail(user.email);
}

/**
 * Signs in using Google Account with popup.
 * If the email is ADMIN_EMAIL -> role: 'Administrador' & status: 'approved'.
 * For all other users -> status: 'pending' (requires manual admin approval).
 */
export async function loginWithGoogle(): Promise<{
  success: boolean;
  user?: UserAccount;
  cloudState?: AppState;
  isPending?: boolean;
  isRejected?: boolean;
  error?: string;
}> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    const uid = fbUser.uid;
    const email = (fbUser.email || '').toLowerCase().trim();
    const name = fbUser.displayName || email.split('@')[0] || 'Treinador';

    const isAdmin = isStrictAdminEmail(email);

    if (isAdmin) {
      const adminDocRef = doc(db, 'admins', uid);
      setDoc(
        adminDocRef,
        cleanFirestoreData({ uid, email: ADMIN_EMAIL, role: 'Administrador', grantedAt: Date.now() }),
        { merge: true }
      ).catch((e) => {
        console.warn('Aviso não-bloqueante ao atualizar documento admin:', e);
      });
    }

    // Retrieve or create user profile in Firestore
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);

    let account: UserAccount;
    if (snap.exists()) {
      const data = snap.data();
      account = data.account as UserAccount;
      if (isAdmin && (account.role !== 'Administrador' || account.status !== 'approved')) {
        account.role = 'Administrador';
        account.status = 'approved';
        account.email = ADMIN_EMAIL;
        await setDoc(userDocRef, cleanFirestoreData({ account, updatedAt: Date.now() }), { merge: true });
      }
    } else {
      // Check if there is an existing pre-authorized account created with this email
      let preAuthAccount: UserAccount | null = null;
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('account.email', '==', email)));
        if (!usersSnap.empty) {
          const preDoc = usersSnap.docs[0];
          preAuthAccount = preDoc.data().account as UserAccount;
          if (preDoc.id !== uid) {
            deleteDoc(preDoc.ref).catch(() => {});
          }
        }
      } catch (searchErr) {
        console.warn('Busca de conta pré-autorizada por email:', searchErr);
      }

      if (preAuthAccount && preAuthAccount.status === 'approved') {
        account = {
          ...preAuthAccount,
          id: uid,
          email: email,
          name: name || preAuthAccount.name,
          status: 'approved'
        };
      } else {
        account = {
          id: uid,
          username: email.split('@')[0] || uid,
          email: email,
          name: name,
          role: isAdmin ? 'Administrador' : 'Treinador Principal',
          status: isAdmin ? 'approved' : 'pending',
          assignedTeams: isAdmin ? ['all'] : [],
          createdAt: new Date().toISOString()
        };
        if (isAdmin) {
          account.approvedBy = 'Sistema (Administrador Principal)';
          account.approvedAt = Date.now();
        }
      }
      await setDoc(userDocRef, cleanFirestoreData({ account, createdAt: Date.now(), updatedAt: Date.now() }), {
        merge: true
      });
    }

    if (account.status === 'pending') {
      try {
        await signOut(auth);
      } catch (signOutErr) {
        // Falha não-bloqueante no logout preventivo de conta com autorização pendente
        console.debug('Aviso no logout preventivo de conta pendente:', signOutErr);
      }
      return {
        success: false,
        isPending: true,
        user: account,
        error: 'A sua conta Google foi registada mas aguarda autorização do Administrador do Clube.'
      };
    }

    if (account.status === 'rejected') {
      try {
        await signOut(auth);
      } catch (signOutErr) {
        // Falha não-bloqueante no logout preventivo de conta rejeitada
        console.debug('Aviso no logout preventivo de conta rejeitada:', signOutErr);
      }
      return {
        success: false,
        isRejected: true,
        user: account,
        error: 'O seu acesso à base de dados foi recusado ou suspenso pelo Administrador.'
      };
    }

    try {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(account));
    } catch (storageErr) {
      console.warn('Aviso de persistência local:', storageErr);
    }

    const masterClubState = await loadMasterClubState(account.clubId || 'main');

    return {
      success: true,
      user: account,
      cloudState: masterClubState || undefined
    };
  } catch (err: any) {
    console.error('Google login error:', err);
    const msg = formatFirebaseAuthError(err);
    return { success: false, error: msg };
  }
}

/**
 * Checks if a session is currently active in Firebase Auth
 * and restores the user profile and master club state from Firestore.
 */
export async function checkCurrentAuthUser(): Promise<{
  user?: UserAccount;
  cloudState?: AppState;
} | null> {
  return new Promise((resolve) => {
    // If quota is currently exhausted, fallback gracefully to cached local session
    if (getFirestoreQuotaState().isExhausted) {
      try {
        const storedJson = localStorage.getItem(LOCAL_SESSION_KEY);
        if (storedJson) {
          const cachedAcc = JSON.parse(storedJson) as UserAccount;
          if (cachedAcc && cachedAcc.id && cachedAcc.status === 'approved') {
            resolve({ user: cachedAcc, cloudState: undefined });
            return;
          }
        }
      } catch (e) {
        console.warn('Aviso ao ler sessão local cached:', e);
      }
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      unsub();
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            const account = data.account as UserAccount;
            if (account && account.status === 'approved') {
              try {
                localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(account));
              } catch (storageErr) {
                console.warn('Aviso de persistência local:', storageErr);
              }
              const masterClubState = await loadMasterClubState(account.clubId || 'main');
              resolve({ user: account, cloudState: masterClubState || undefined });
              return;
            }
          } else {
            // Check if strict admin email
            const email = (fbUser.email || '').toLowerCase().trim();
            if (isStrictAdminEmail(email)) {
              if (!getFirestoreQuotaState().isExhausted) {
                setDoc(
                  doc(db, 'admins', fbUser.uid),
                  { uid: fbUser.uid, email: ADMIN_EMAIL, role: 'Administrador', grantedAt: Date.now() },
                  { merge: true }
                ).catch((e) => {
                  if (isQuotaExceededError(e)) markQuotaExhausted(30);
                  else console.warn('Aviso não-bloqueante ao registar doc admin:', e);
                });
              }
              const account: UserAccount = {
                id: fbUser.uid,
                username: MASTER_ADMIN_USERNAME,
                email: ADMIN_EMAIL,
                name: fbUser.displayName || 'Bruno Santos',
                role: 'Administrador',
                status: 'approved',
                assignedTeams: ['all'],
                createdAt: new Date().toISOString()
              };
              if (!getFirestoreQuotaState().isExhausted) {
                await setDoc(
                  userDocRef,
                  { account, createdAt: Date.now(), updatedAt: Date.now() },
                  { merge: true }
                ).catch((e) => {
                  if (isQuotaExceededError(e)) markQuotaExhausted(30);
                });
              }
              try {
                localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(account));
              } catch (storageErr) {
                console.warn('Aviso de persistência local:', storageErr);
              }
              const masterClubState = await loadMasterClubState('main');
              resolve({ user: account, cloudState: masterClubState || undefined });
              return;
            }
          }
          // Account not approved
          try {
            await signOut(auth);
          } catch (signOutErr) {
            // Falha não-bloqueante no logout preventivo de conta não aprovada
            console.debug('Aviso no logout preventivo de conta não aprovada:', signOutErr);
          }
          resolve(null);
          return;
        } catch (e) {
          if (isQuotaExceededError(e)) {
            markQuotaExhausted(30);
          } else {
            console.warn('Erro ao restaurar sessão Firebase Auth:', e);
          }
        }
      }

      // Check cached localStorage session if Firebase Auth instance is still initializing
      try {
        const storedJson = localStorage.getItem(LOCAL_SESSION_KEY);
        if (storedJson) {
          const cachedAcc = JSON.parse(storedJson) as UserAccount;
          if (cachedAcc && cachedAcc.id && cachedAcc.status === 'approved') {
            resolve({ user: cachedAcc, cloudState: undefined });
            return;
          }
        }
      } catch (e) {
        console.warn('Erro ao restaurar sessão local:', e);
      }

      resolve(null);
    });
  });
}

/**
 * Creates a coach registration in Firebase Auth as a self-service signup.
 * Sets status: 'pending' in Firestore and immediately signs out until approved by Admin.
 */
export async function registerCoachUser(
  username: string,
  pass: string,
  fullName: string,
  role: string,
  userEmail?: string,
  resolvedInvite?: TeamInvitation
): Promise<{ success: boolean; user?: UserAccount; isPending?: boolean; error?: string }> {
  try {
    const rawUsername = username.trim().toLowerCase();
    const cleanUsername = rawUsername.replace(/\s+/g, '.');
    const cleanName = fullName.trim();
    const cleanPass = pass.trim();

    if (!cleanName || !cleanUsername || !cleanPass) {
      return { success: false, error: 'Por favor preencha todos os campos obrigatórios.' };
    }

    if (cleanPass.length < 6) {
      return { success: false, error: 'A palavra-passe deve ter pelo menos 6 caracteres.' };
    }

    const email =
      userEmail && userEmail.trim().includes('@')
        ? userEmail.trim().toLowerCase()
        : cleanUsername.includes('@')
          ? cleanUsername
          : `${cleanUsername}@bolacomvisao.app`;

    const isAdmin = isStrictAdminEmail(email);
    let hasValidInvite = Boolean(resolvedInvite && resolvedInvite.status === 'pending');
    const assignedRole = isAdmin
      ? 'Administrador'
      : resolvedInvite?.role
        ? resolvedInvite.role
        : role === 'Administrador'
          ? 'Treinador Principal'
          : role || 'Treinador Principal';

    // Create Firebase Auth user
    const userCred = await createUserWithEmailAndPassword(auth, email, cleanPass);
    const uid = userCred.user.uid;

    // Re-check the invitation now that the user is signed in (it may have been used, revoked or expired meanwhile).
    if (resolvedInvite && !isAdmin) {
      const fresh = await lookupInvitationByCode(resolvedInvite.inviteCode);
      if (fresh.success && fresh.invitation) resolvedInvite = fresh.invitation;
      else hasValidInvite = false;
    }

    // Build UserAccount document without any undefined fields. Only a still-valid invitation grants a club, a team
    // and immediate approval; the security rules verify it against the invitation itself.
    const invite = hasValidInvite && !isAdmin ? resolvedInvite : undefined;
    const buildAccount = (withInvite: TeamInvitation | undefined): UserAccount => {
      const acc: UserAccount = {
        id: uid,
        username: cleanUsername,
        email: isAdmin ? ADMIN_EMAIL : email,
        name: cleanName,
        role: withInvite ? withInvite.role : assignedRole,
        status: isAdmin || withInvite ? 'approved' : 'pending',
        clubId: withInvite?.clubId || (isAdmin ? 'main' : undefined),
        assignedTeams: isAdmin ? ['all'] : withInvite ? [withInvite.teamId] : [],
        teamRoles: withInvite
          ? [
              {
                teamId: withInvite.teamId,
                teamName: withInvite.teamName,
                role: withInvite.role,
                assignedAt: Date.now()
              }
            ]
          : undefined,
        inviteCode: withInvite ? withInvite.inviteCode.toUpperCase() : undefined,
        createdAt: new Date().toISOString()
      };
      if (isAdmin) {
        acc.approvedBy = 'Sistema (Administrador Principal)';
        acc.approvedAt = Date.now();
      } else if (withInvite) {
        acc.approvedBy = `Convite (${withInvite.invitedByName || 'Administrador'})`;
        acc.approvedAt = Date.now();
      }
      return acc;
    };

    // Save profile in Firestore (if the invitation is refused by the rules, register as pending instead)
    const userDocRef = doc(db, 'users', uid);
    const saveAccount = (acc: UserAccount) =>
      setDoc(userDocRef, cleanFirestoreData({ account: acc, createdAt: Date.now(), updatedAt: Date.now() }), {
        merge: true
      });
    let account = buildAccount(invite);
    try {
      await saveAccount(account);
    } catch (err: any) {
      if (!invite || err?.code !== 'permission-denied') throw err;
      console.warn('Convite recusado pelas regras; conta registada como pendente.', err);
      account = buildAccount(undefined);
      await saveAccount(account);
    }
    const initialStatus: UserStatus = account.status;

    if (account.inviteCode) {
      try {
        const invDocRef = doc(db, 'invitations', account.inviteCode);
        await setDoc(invDocRef, { status: 'accepted', usedBy: uid, acceptedAt: Date.now() }, { merge: true });
      } catch (e) {
        console.warn('Erro ao marcar convite como aceite:', e);
      }
    }

    if (isAdmin) {
      const adminDocRef = doc(db, 'admins', uid);
      await setDoc(
        adminDocRef,
        cleanFirestoreData({ uid, email: ADMIN_EMAIL, role: 'Administrador', grantedAt: Date.now() }),
        { merge: true }
      );
      try {
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(account));
      } catch (storageErr) {
        console.warn('Aviso de persistência local:', storageErr);
      }
    } else if (initialStatus === 'approved') {
      try {
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(account));
      } catch (storageErr) {
        console.warn('Aviso de persistência local:', storageErr);
      }
    } else {
      // Sign out pending user immediately
      try {
        await signOut(auth);
      } catch (signOutErr) {
        console.debug('Aviso no logout preventivo de conta registada pendente:', signOutErr);
      }
    }

    return {
      success: true,
      user: account,
      isPending: initialStatus === 'pending'
    };
  } catch (err: any) {
    console.error('Firebase register error:', err);
    const msg = formatFirebaseAuthError(err);
    return { success: false, error: msg };
  }
}

/**
 * Creates a coach user directly as the Administrator WITHOUT switching or losing the admin's session!
 */
export async function createCoachUserAsAdmin(
  fullName: string,
  emailOrUsername: string,
  pass: string,
  role: string,
  assignedTeams: string[]
): Promise<{ success: boolean; user?: UserAccount; notice?: string; error?: string }> {
  try {
    const cleanName = fullName.trim();
    const cleanPass = pass.trim();
    let email = emailOrUsername.trim().toLowerCase();

    if (!cleanName || !email || !cleanPass) {
      return { success: false, error: 'Por favor preencha todos os campos obrigatórios.' };
    }

    if (cleanPass.length < 6) {
      return { success: false, error: 'A palavra-passe deve ter pelo menos 6 caracteres.' };
    }

    if (!email.includes('@')) {
      email = `${email.replace(/\s+/g, '.')}@bolacomvisao.app`;
    }

    let uid = '';
    let noticeMsg: string | undefined;

    // Step 1: Securely acquire current logged-in Administrator ID Token
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        if (idToken) {
          // Step 2: Request server-side creation with Bearer Authorization
          const resp = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({ email, password: cleanPass })
          });

          const data = await resp.json();
          if (resp.ok && data && data.success && data.uid) {
            uid = data.uid;
            noticeMsg = data.message;
          } else if (
            data?.error &&
            (data.error.includes('EMAIL_EXISTS') || data.error.includes('já se encontra registado'))
          ) {
            return {
              success: false,
              error: 'Este endereço de email já se encontra registado no sistema.'
            };
          }
        }
      } catch (apiErr) {
        console.warn('Aviso na criação server-side via API:', apiErr);
      }
    }

    // Step 2 Fallback: If Firebase Auth direct signup is restricted (e.g. OPERATION_NOT_ALLOWED),
    // generate a unique ID and write directly to Firestore as the logged-in Administrator.
    if (!uid) {
      uid = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      noticeMsg = 'Treinador pré-autorizado com sucesso na Base de Dados do Clube.';
    }

    // Step 3: As the logged-in Administrator, write the pre-approved user account to Firestore
    const safeRole = role === 'Administrador' ? 'Treinador Principal' : role || 'Treinador Principal';
    const account: UserAccount = {
      id: uid,
      username: email.split('@')[0],
      email: email,
      name: cleanName,
      role: safeRole,
      status: 'approved',
      approvedBy: ADMIN_EMAIL,
      approvedAt: Date.now(),
      assignedTeams: assignedTeams && assignedTeams.length > 0 ? assignedTeams : ['all'],
      createdAt: new Date().toISOString()
    };

    const userDocRef = doc(db, 'users', uid);
    await setDoc(
      userDocRef,
      cleanFirestoreData({
        account,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }),
      { merge: true }
    );

    return { success: true, user: account, notice: noticeMsg };
  } catch (err: any) {
    console.error('Erro ao criar treinador pelo Administrador:', err);
    const msg = formatFirebaseAuthError(err);
    return { success: false, error: msg };
  }
}

/**
 * Authenticates user strictly via Firebase Auth SDK.
 * Checks Firestore approval status for coaches.
 */
export async function loginCoachUser(
  usernameOrEmail: string,
  pass: string
): Promise<{
  success: boolean;
  user?: UserAccount;
  cloudState?: AppState;
  isPending?: boolean;
  isRejected?: boolean;
  error?: string;
}> {
  try {
    const input = usernameOrEmail.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!input || !cleanPass) {
      return { success: false, error: 'Por favor preencha o utilizador/email e a palavra-passe.' };
    }

    // Determine email candidates
    const emailsToTry: string[] = [];
    if (input.includes('@')) {
      emailsToTry.push(input);
    } else {
      if (input === MASTER_ADMIN_USERNAME || input === 'admin' || input === 'santos') {
        emailsToTry.push(ADMIN_EMAIL);
      }
      emailsToTry.push(`${input}@bolacomvisao.app`);
    }

    let userCred: any = null;
    let successfulEmail = emailsToTry[0];
    let authError: any = null;

    for (const em of emailsToTry) {
      try {
        userCred = await signInWithEmailAndPassword(auth, em, cleanPass);
        successfulEmail = em;
        break;
      } catch (e: any) {
        authError = e;
        if (
          e.code === 'auth/user-not-found' ||
          e.code === 'auth/invalid-credential' ||
          e.code === 'auth/wrong-password'
        ) {
          continue;
        }
        break;
      }
    }

    if (!userCred) {
      const msg = formatFirebaseAuthError(authError || new Error('Utilizador ou palavra-passe incorretos.'));
      return { success: false, error: msg };
    }

    const uid = userCred.user.uid;
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);

    let account: UserAccount;
    const isAdmin = isStrictAdminEmail(successfulEmail);

    if (snap.exists()) {
      const data = snap.data();
      account = data.account as UserAccount;
      if (isAdmin && (account.role !== 'Administrador' || account.status !== 'approved')) {
        account.role = 'Administrador';
        account.status = 'approved';
        await setDoc(userDocRef, cleanFirestoreData({ account, updatedAt: Date.now() }), { merge: true });
      }
    } else {
      account = {
        id: uid,
        username: input.split('@')[0],
        email: successfulEmail,
        name: isAdmin ? 'Bruno Santos' : input.split('@')[0],
        role: isAdmin ? 'Administrador' : 'Treinador Principal',
        status: isAdmin ? 'approved' : 'pending',
        assignedTeams: isAdmin ? ['all'] : [],
        createdAt: new Date().toISOString()
      };
      if (isAdmin) {
        account.approvedBy = 'Sistema (Administrador Principal)';
        account.approvedAt = Date.now();
      }
      await setDoc(userDocRef, cleanFirestoreData({ account, createdAt: Date.now(), updatedAt: Date.now() }), {
        merge: true
      });
    }

    if (isAdmin) {
      const adminDocRef = doc(db, 'admins', uid);
      await setDoc(
        adminDocRef,
        cleanFirestoreData({ uid, email: ADMIN_EMAIL, role: 'Administrador', grantedAt: Date.now() }),
        { merge: true }
      );
    }

    if (account.status === 'pending') {
      try {
        await signOut(auth);
      } catch (signOutErr) {
        console.debug('Aviso no logout de conta pendente:', signOutErr);
      }
      return {
        success: false,
        isPending: true,
        user: account,
        error: 'A sua conta foi registada mas aguarda autorização do Administrador do Clube.'
      };
    }

    if (account.status === 'rejected') {
      try {
        await signOut(auth);
      } catch (signOutErr) {
        console.debug('Aviso no logout de conta rejeitada:', signOutErr);
      }
      return {
        success: false,
        isRejected: true,
        user: account,
        error: 'O seu acesso à base de dados do clube foi recusado ou suspenso pelo Administrador.'
      };
    }

    try {
      await setDoc(userDocRef, cleanFirestoreData({ lastActiveAt: Date.now(), updatedAt: Date.now() }), {
        merge: true
      });
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(account));
    } catch (storageErr) {
      console.warn('Aviso de persistência local ao iniciar sessão:', storageErr);
    }

    const masterClubState = await loadMasterClubState(account.clubId || 'main');
    return {
      success: true,
      user: account,
      cloudState: masterClubState || undefined
    };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, error: formatFirebaseAuthError(err) };
  }
}

/**
 * Subscribes to all club registered users in real-time (for Administrator management)
 * Supports both signatures:
 * - subscribeToAllClubUsers(onUpdate, onError)
 * - subscribeToAllClubUsers(clubId, onUpdate, onError)
 */
export function subscribeToAllClubUsers(
  clubIdOrOnUpdate: string | ((users: UserAccount[]) => void),
  onUpdateOrOnError?: ((users: UserAccount[]) => void) | ((err: Error) => void),
  onErrorCallback?: (err: Error) => void
): Unsubscribe {
  if (getFirestoreQuotaState().isExhausted) {
    return () => {};
  }

  let onUpdate: (users: UserAccount[]) => void;
  let onError: ((err: Error) => void) | undefined;
  let targetClubId: string | undefined;

  if (typeof clubIdOrOnUpdate === 'function') {
    onUpdate = clubIdOrUpdateCallback(clubIdOrOnUpdate);
    onError = typeof onUpdateOrOnError === 'function' ? (onUpdateOrOnError as (err: Error) => void) : undefined;
  } else {
    targetClubId = clubIdOrOnUpdate;
    onUpdate =
      typeof onUpdateOrOnError === 'function' ? (onUpdateOrOnError as (users: UserAccount[]) => void) : () => {};
    onError = onErrorCallback;
  }

  function clubIdOrUpdateCallback(cb: (users: UserAccount[]) => void): (users: UserAccount[]) => void {
    return typeof cb === 'function' ? cb : () => {};
  }

  const usersCol = collection(db, 'users');
  return onSnapshot(
    usersCol,
    (snapshot) => {
      const usersList: UserAccount[] = [];
      let primaryAdminAccount: UserAccount | null = null;
      const seenUsernames = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.account) {
          const acc = { ...data.account, id: docSnap.id } as UserAccount;
          const userEmail = (acc.email || '').toLowerCase().trim();
          const isAdmin =
            isStrictAdminEmail(userEmail) || acc.role === 'Administrador' || acc.username === MASTER_ADMIN_USERNAME;

          if (isAdmin) {
            primaryAdminAccount = {
              ...acc,
              email: ADMIN_EMAIL,
              role: 'Administrador',
              status: 'approved'
            };
          } else {
            const cleanU = (acc.username || '').toLowerCase().trim();
            const matchesClub = !targetClubId || !acc.clubId || acc.clubId === targetClubId;
            if (!seenUsernames.has(cleanU) && !isStrictAdminEmail(acc.email) && matchesClub) {
              seenUsernames.add(cleanU);
              usersList.push(acc);
            }
          }
        }
      });

      const finalList: UserAccount[] = [];
      if (primaryAdminAccount) {
        finalList.push(primaryAdminAccount);
      } else {
        finalList.push({
          id: 'admin-santos',
          username: MASTER_ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          name: 'Administrador (Santos)',
          role: 'Administrador',
          status: 'approved',
          assignedTeams: ['all'],
          createdAt: new Date().toISOString()
        });
      }
      finalList.push(...usersList);

      if (typeof onUpdate === 'function') {
        onUpdate(finalList);
      }
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        markQuotaExhausted(30);
      } else {
        console.error('Erro na subscrição de utilizadores:', error);
      }
      if (typeof onError === 'function') onError(error);
    }
  );
}

/**
 * Admin action: Approve a pending user and assign role / team permissions
 */
export async function approveCoachUser(
  userId: string,
  adminName: string,
  newRole?: string,
  assignedTeams?: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      return { success: false, message: 'Utilizador não encontrado.' };
    }

    const currentAccount = snap.data().account as UserAccount;
    const safeRole =
      newRole === 'Administrador' ? 'Treinador Principal' : newRole || currentAccount.role || 'Treinador Principal';

    const updatedAccount: UserAccount = {
      ...currentAccount,
      status: 'approved',
      role: safeRole,
      approvedBy: adminName,
      approvedAt: Date.now(),
      assignedTeams: assignedTeams !== undefined ? assignedTeams : currentAccount.assignedTeams || []
    };

    await setDoc(
      userDocRef,
      cleanFirestoreData({
        account: updatedAccount,
        updatedAt: Date.now()
      }),
      { merge: true }
    );

    return {
      success: true,
      message: `Treinador ${updatedAccount.name} autorizado com sucesso como ${updatedAccount.role}!`
    };
  } catch (error: any) {
    console.error('Erro ao aprovar treinador:', error);
    return { success: false, message: error?.message || 'Erro ao autorizar treinador.' };
  }
}

/**
 * Admin action: Reject or suspend a user
 */
export async function rejectCoachUser(
  userId: string,
  adminName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      return { success: false, message: 'Utilizador não encontrado.' };
    }

    const currentAccount = snap.data().account as UserAccount;
    if (isStrictAdminEmail(currentAccount.email)) {
      return { success: false, message: 'A conta de Administrador Principal não pode ser suspensa.' };
    }

    const updatedAccount: UserAccount = {
      ...currentAccount,
      status: 'rejected',
      approvedBy: adminName,
      approvedAt: Date.now()
    };

    await setDoc(
      userDocRef,
      cleanFirestoreData({
        account: updatedAccount,
        updatedAt: Date.now()
      }),
      { merge: true }
    );

    return { success: true, message: `Acesso do utilizador ${updatedAccount.name} foi recusado/suspenso.` };
  } catch (error: any) {
    console.error('Erro ao recusar treinador:', error);
    return { success: false, message: error?.message || 'Erro ao atualizar estado.' };
  }
}

/**
 * Admin action: Update role of an approved user
 */
export async function updateCoachRole(userId: string, newRole: string): Promise<{ success: boolean; message: string }> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return { success: false, message: 'Utilizador não encontrado.' };

    const currentAccount = snap.data().account as UserAccount;
    // A atribuição da função 'Administrador' é feita exclusivamente via promoteUserToAdmin().
    const safeRole = newRole === 'Administrador' ? currentAccount.role : newRole;

    const updatedAccount: UserAccount = {
      ...currentAccount,
      role: safeRole
    };

    await setDoc(
      userDocRef,
      cleanFirestoreData({
        account: updatedAccount,
        updatedAt: Date.now()
      }),
      { merge: true }
    );

    return { success: true, message: 'Função atualizada com sucesso!' };
  } catch (error: any) {
    console.error('Erro ao alterar função:', error);
    return { success: false, message: error?.message || 'Erro ao alterar função.' };
  }
}

/**
 * Admin action: Update assigned teams of an approved coach
 */
export async function updateCoachAssignedTeams(
  userId: string,
  assignedTeams: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return { success: false, message: 'Utilizador não encontrado.' };

    const currentAccount = snap.data().account as UserAccount;
    const cleanTeams = Array.isArray(assignedTeams) ? assignedTeams : [];

    const updatedAccount: UserAccount = {
      ...currentAccount,
      assignedTeams: cleanTeams
    };

    await setDoc(
      userDocRef,
      cleanFirestoreData({
        account: updatedAccount,
        updatedAt: Date.now()
      }),
      { merge: true }
    );

    return {
      success: true,
      message: `Equipas atribuídas a ${updatedAccount.name} atualizadas com sucesso!`
    };
  } catch (error: any) {
    console.error('Erro ao atualizar equipas atribuídas:', error);
    return { success: false, message: error?.message || 'Erro ao atualizar equipas atribuídas.' };
  }
}

export async function promoteUserToAdmin(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return { success: false, message: 'Utilizador não encontrado.' };

    const currentAccount = snap.data().account as UserAccount;

    await setDoc(
      userDocRef,
      cleanFirestoreData({
        account: { ...currentAccount, role: 'Administrador', status: 'approved' },
        updatedAt: Date.now()
      }),
      { merge: true }
    );

    await setDoc(
      doc(db, 'admins', userId),
      cleanFirestoreData({
        uid: userId,
        email: currentAccount.email || '',
        role: 'Administrador',
        grantedAt: Date.now()
      })
    );

    return { success: true, message: `${currentAccount.name} promovido a Administrador! 👑` };
  } catch (error: any) {
    console.error('Erro ao promover administrador:', error);
    return { success: false, message: error?.message || 'Erro ao promover administrador.' };
  }
}

export async function demoteAdmin(
  userId: string,
  fallbackRole = 'Treinador Principal'
): Promise<{ success: boolean; message: string }> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return { success: false, message: 'Utilizador não encontrado.' };

    const currentAccount = snap.data().account as UserAccount;
    if (isStrictAdminEmail(currentAccount.email)) {
      return { success: false, message: 'O Administrador Principal não pode perder privilégios.' };
    }

    await setDoc(
      userDocRef,
      cleanFirestoreData({
        account: { ...currentAccount, role: fallbackRole },
        updatedAt: Date.now()
      }),
      { merge: true }
    );

    await deleteDoc(doc(db, 'admins', userId));

    return { success: true, message: `${currentAccount.name} deixou de ser Administrador.` };
  } catch (error: any) {
    console.error('Erro ao remover privilégios de administrador:', error);
    return { success: false, message: error?.message || 'Erro ao remover privilégios de administrador.' };
  }
}

/**
 * Admin action: Delete user account from Firestore
 */
export async function deleteCoachAccount(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const currentAccount = snap.data().account as UserAccount;
      if (isStrictAdminEmail(currentAccount.email)) {
        return { success: false, message: 'A conta de Administrador Principal não pode ser eliminada.' };
      }
    }

    await deleteDoc(userDocRef);
    return { success: true, message: 'Conta de treinador removida com sucesso.' };
  } catch (error: any) {
    console.error('Erro ao remover conta:', error);
    return { success: false, message: error?.message || 'Erro ao remover conta.' };
  }
}

/**
 * Creates or updates an invitation in Firestore /invitations/{inviteCode}
 */
export async function createTeamInvitation(invitation: TeamInvitation): Promise<{ success: boolean; message: string }> {
  try {
    const docRef = doc(db, 'invitations', invitation.inviteCode.toUpperCase());
    await setDoc(docRef, cleanFirestoreData(invitation), { merge: true });
    return { success: true, message: 'Convite gravado com sucesso!' };
  } catch (error: any) {
    console.error('Erro ao gravar convite na nuvem:', error);
    return { success: false, message: error?.message || 'Erro ao gravar convite na nuvem.' };
  }
}

/**
 * Revokes an invitation in Firestore
 */
export async function revokeTeamInvitation(inviteCode: string): Promise<{ success: boolean; message: string }> {
  try {
    const docRef = doc(db, 'invitations', inviteCode.toUpperCase());
    await setDoc(docRef, { status: 'revoked', updatedAt: Date.now() }, { merge: true });
    return { success: true, message: 'Convite revogado com sucesso.' };
  } catch (error: any) {
    console.error('Erro ao revogar convite na nuvem:', error);
    return { success: false, message: error?.message || 'Erro ao revogar convite na nuvem.' };
  }
}

/**
 * Looks up an invitation by invite code
 */
export async function lookupInvitationByCode(
  inviteCode: string
): Promise<{ success: boolean; invitation?: TeamInvitation; message: string }> {
  try {
    const cleanCode = inviteCode.trim().toUpperCase();
    const docRef = doc(db, 'invitations', cleanCode);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { success: false, message: 'Código de convite não encontrado ou inválido.' };
    }

    const inv = snap.data() as TeamInvitation;
    if (inv.status === 'revoked') {
      return { success: false, message: 'Este convite foi revogado.' };
    }
    if (inv.status === 'accepted') {
      return { success: false, message: 'Este convite já foi utilizado.' };
    }
    if (inv.expiresAt && Date.now() > inv.expiresAt) {
      return { success: false, message: 'Este convite expirou.' };
    }

    return { success: true, invitation: inv, message: 'Convite válido!' };
  } catch (error: any) {
    console.error('Erro ao verificar convite:', error);
    return { success: false, message: error?.message || 'Erro ao verificar convite.' };
  }
}

/**
 * Logout coach user from Firebase and local cache
 */
export async function logoutCoachUser(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch (storageErr) {
    console.warn('Aviso ao remover sessão local:', storageErr);
  }
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase signout error:', e);
  }
}

export { saveMasterClubState, getFirestoreQuotaState };
