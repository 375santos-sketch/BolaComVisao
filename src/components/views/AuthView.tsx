import React, { useState } from 'react';
import { AppState, UserAccount, TeamInvitation } from '../../types';
import logoImg from '../../assets/images/bolacomvisao_logo_1786622535530.jpg';
import {
  registerCoachUser,
  loginCoachUser,
  loginWithGoogle,
  lookupInvitationByCode
} from '../../services/cloudAuthService';
import { loadMasterClubState } from '../../services/firebase';
import {
  openWhatsAppRegistrationRequest,
  openEmailRegistrationRequest,
  buildRegistrationNotificationMessage
} from '../../lib/notificationEngine';
import { MASTER_ADMIN_EMAIL } from '../../lib/constants';
import { loadBrand } from '../../lib/clubBrand';

interface AuthViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onLoginSuccess: () => void;
  onShowToast: (msg: string) => void;
}

const AuthErrorBanner: React.FC<{
  error: string;
  onClear: () => void;
  onShowToast: (msg: string) => void;
  onGuestLogin?: () => void;
}> = ({ error, onClear, onShowToast, onGuestLogin }) => {
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain =
    error.includes('unauthorized-domain') ||
    error.includes('Domínio não autorizado') ||
    error.includes('Domínios Autorizados');

  const copyDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      onShowToast(`Domínio "${currentHostname}" copiado para a área de transferência! 📋✓`);
    }
  };

  if (isUnauthorizedDomain) {
    return (
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/90 via-slate-900 to-red-950/80 border-2 border-amber-500/60 text-xs font-mono space-y-2.5 my-2 animate-in fade-in">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold font-['Chakra_Petch'] uppercase tracking-wider text-xs">
            <span className="text-base">⚠️</span>
            <span>Domínio Não Autorizado no Google Auth</span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-slate-400 hover:text-white text-sm px-1 cursor-pointer"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
          O Google Sign-In requer que o domínio atual (
          <code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-cyan-500/30">
            {currentHostname || 'domínio da app'}
          </code>
          ) esteja adicionado aos <strong>Domínios Autorizados</strong> no Firebase Console.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {currentHostname && (
            <button
              type="button"
              onClick={copyDomain}
              className="ui-btn ui-btn-soft py-1.5 px-3 text-[11px] flex items-center gap-1.5"
            >
              <span>📋</span>
              <span>
                Copiar Domínio (
                {currentHostname.length > 22 ? currentHostname.substring(0, 20) + '...' : currentHostname})
              </span>
            </button>
          )}

          {onGuestLogin && (
            <button
              type="button"
              onClick={onGuestLogin}
              className="ui-btn ui-btn-soft-warning py-1.5 px-3 text-[11px] flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Entrar como Convidado</span>
            </button>
          )}
        </div>

        <div className="ui-inset p-2 text-[10px] text-slate-400 leading-normal">
          💡 <span className="text-slate-300">Como resolver no Firebase:</span> Aceda a{' '}
          <strong className="text-slate-200">
            Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains
          </strong>{' '}
          e adicione o domínio copiado. Em alternativa, use as credenciais de clube abaixo.
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-mono flex items-start justify-between gap-2 shadow-inner my-1.5 animate-in fade-in">
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0">⚠️</span>
        <span className="leading-snug">{error}</span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-red-400 hover:text-white text-xs px-1 cursor-pointer shrink-0"
        title="Fechar"
      >
        ✕
      </button>
    </div>
  );
};

export const AuthView: React.FC<AuthViewProps> = ({ state, onUpdateState, onLoginSuccess, onShowToast }) => {
  // The club's symbol, name and colour kept on this phone from the last visit
  const [brand] = useState(loadBrand);
  const [mode, setMode] = useState<'login' | 'register' | 'pending'>('login');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pendingAccount, setPendingAccount] = useState<UserAccount | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('Treinador Principal');
  const [regError, setRegError] = useState<string | null>(null);
  // Código de convite: se preenchido e válido, o registo junta-se ao clube do convite já aprovado
  const [regInviteCode, setRegInviteCode] = useState('');
  const [resolvedInvite, setResolvedInvite] = useState<TeamInvitation | null>(null);
  const [inviteCheckError, setInviteCheckError] = useState<string | null>(null);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);

  const users = state.users || [];

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLoginError(null);
    setRegError(null);

    const res = await loginWithGoogle();
    setIsLoading(false);

    if (res.isPending && res.user) {
      setPendingAccount(res.user);
      setMode('pending');
      onShowToast('Conta Google associada! A aguardar autorização do Administrador. 🛡️');
      return;
    }

    if (res.isRejected) {
      setLoginError('O seu acesso à base de dados foi recusado ou suspenso pelo Administrador do Clube.');
      return;
    }

    if (res.success && res.user) {
      let finalCloudState = res.cloudState;
      if (!finalCloudState) {
        try {
          finalCloudState = (await loadMasterClubState(res.user.clubId || 'main')) || undefined;
        } catch (e) {
          console.warn('Erro ao carregar dados da nuvem no login Google:', e);
        }
      }

      if (finalCloudState) {
        onUpdateState({
          ...finalCloudState,
          currentUser: res.user,
          syncInfo: {
            ...state.syncInfo,
            isOnline: true,
            status: 'synced',
            lastSyncedAt: Date.now(),
            pendingChangesCount: 0,
            syncId: res.user.id,
            lastSyncMessage: 'Base de Dados Sincronizada com o Google ☁️'
          }
        });
      } else {
        onUpdateState({
          currentUser: res.user,
          syncInfo: {
            ...state.syncInfo,
            isOnline: true,
            status: 'synced',
            lastSyncedAt: Date.now(),
            syncId: res.user.id
          }
        });
      }
      onShowToast(`Bem-vindo, ${res.user.name}! ⚽ Sessão iniciada com o Google.`);
      onLoginSuccess();
    } else if (res.error) {
      setLoginError(res.error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const uInput = loginUsername.trim().toLowerCase();
    const pInput = loginPassword;

    if (!uInput || !pInput) {
      setLoginError('Por favor preencha o utilizador/email e a palavra-passe.');
      return;
    }

    setIsLoading(true);

    try {
      const cloudResult = await loginCoachUser(uInput, pInput);

      if (cloudResult.isPending && cloudResult.user) {
        setIsLoading(false);
        setPendingAccount(cloudResult.user);
        setMode('pending');
        return;
      }

      if (cloudResult.isRejected) {
        setIsLoading(false);
        setLoginError('O seu acesso à base de dados foi recusado ou suspenso pelo Administrador do Clube.');
        return;
      }

      if (cloudResult.success && cloudResult.user) {
        setIsLoading(false);

        let finalCloudState = cloudResult.cloudState;
        if (!finalCloudState) {
          try {
            finalCloudState = (await loadMasterClubState(cloudResult.user.clubId || 'main')) || undefined;
          } catch (e) {
            console.warn('Erro ao carregar dados da nuvem no login:', e);
          }
        }

        // If master club state was loaded from cloud, merge it!
        if (finalCloudState) {
          onUpdateState({
            ...finalCloudState,
            currentUser: cloudResult.user,
            syncInfo: {
              ...state.syncInfo,
              isOnline: true,
              status: 'synced',
              lastSyncedAt: Date.now(),
              pendingChangesCount: 0,
              syncId: cloudResult.user.id,
              lastSyncMessage: 'Base de dados do Clube sincronizada na Nuvem!'
            }
          });
        } else {
          onUpdateState({
            currentUser: cloudResult.user,
            syncInfo: {
              ...state.syncInfo,
              isOnline: true,
              status: 'synced',
              lastSyncedAt: Date.now(),
              syncId: cloudResult.user.id
            }
          });
        }

        onShowToast(`Bem-vindo, ${cloudResult.user.name}! ☁️ Base de Dados Partilhada Ativa`);
        onLoginSuccess();
        return;
      }

      setIsLoading(false);
      setLoginError(cloudResult.error || 'Utilizador ou palavra-passe incorretos.');
    } catch (err: any) {
      setIsLoading(false);
      const rawMsg = err?.message || '';
      if (rawMsg.includes('operation-not-allowed') || err?.code === 'auth/operation-not-allowed') {
        setLoginError(
          'O método de E-mail/Palavra-passe não está ativado na consola Firebase (Authentication > Sign-in method > Email/Password). Pode entrar com o botão "Entrar com a Conta Google".'
        );
      } else {
        setLoginError(rawMsg || 'Erro ao comunicar com o servidor de autenticação.');
      }
    }
  };

  const handleCheckInviteCode = async () => {
    if (!regInviteCode.trim()) {
      setResolvedInvite(null);
      setInviteCheckError(null);
      return;
    }
    setIsCheckingInvite(true);
    setInviteCheckError(null);
    const res = await lookupInvitationByCode(regInviteCode.trim());
    setIsCheckingInvite(false);
    if (res.success && res.invitation) {
      setResolvedInvite(res.invitation);
      if (res.invitation.name) setRegName(res.invitation.name);
      if (res.invitation.email) setRegEmail(res.invitation.email);
    } else {
      setResolvedInvite(null);
      setInviteCheckError(res.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim() || !regUsername.trim() || !regPassword) {
      setRegError('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('As palavras-passe não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const cloudRes = await registerCoachUser(
        regUsername,
        regPassword,
        regName,
        regRole,
        regEmail,
        resolvedInvite || undefined
      );

      if (cloudRes.success && cloudRes.user) {
        setIsLoading(false);
        const newUser = cloudRes.user;

        if (cloudRes.isPending) {
          setPendingAccount(newUser);
          setMode('pending');
          onShowToast('Registo submetido com sucesso! A aguardar autorização do Administrador. 🛡️');
          return;
        }

        // Admin is auto-approved
        const updatedUsers = [...users.filter((u) => u.username !== newUser.username), newUser];
        onUpdateState({
          users: updatedUsers,
          currentUser: newUser,
          syncInfo: {
            ...state.syncInfo,
            isOnline: true,
            status: 'synced',
            lastSyncedAt: Date.now(),
            syncId: newUser.id,
            lastSyncMessage: 'Administrador Registado e Nuvem Ativa'
          }
        });

        onShowToast(`Conta de Administrador criada! Bem-vindo, ${newUser.name}. 🚀`);
        onLoginSuccess();
        return;
      }

      if (cloudRes.error) {
        setIsLoading(false);
        setRegError(cloudRes.error);
        return;
      }
    } catch (err: any) {
      setIsLoading(false);
      const rawMsg = err?.message || '';
      if (rawMsg.includes('operation-not-allowed') || err?.code === 'auth/operation-not-allowed') {
        setRegError(
          'O método de E-mail/Palavra-passe não está ativado na consola Firebase. Aceda a Firebase Console > Authentication > Sign-in method > Email/Password e ative a opção (Enable). Em alternativa, utilize o botão "Registar com a Conta Google".'
        );
      } else {
        setRegError(rawMsg || 'Erro ao processar o registo. Verifique os dados e tente novamente.');
      }
    }
  };

  const handleCheckPendingStatus = async () => {
    if (!pendingAccount) return;
    const pwd = loginPassword || regPassword;
    if (!pwd) {
      onShowToast('Por favor introduza a sua palavra-passe no ecrã de início de sessão para verificar.');
      setMode('login');
      return;
    }

    setIsLoading(true);
    const res = await loginCoachUser(pendingAccount.username, pwd);
    setIsLoading(false);

    if (res.success && res.user) {
      if (res.cloudState) {
        onUpdateState({
          ...res.cloudState,
          currentUser: res.user,
          syncInfo: {
            ...state.syncInfo,
            isOnline: true,
            status: 'synced',
            lastSyncedAt: Date.now(),
            syncId: res.user.id,
            lastSyncMessage: 'Base de dados do Clube sincronizada!'
          }
        });
      } else {
        onUpdateState({ currentUser: res.user });
      }
      onShowToast(`Conta autorizada pelo Administrador! Bem-vindo, ${res.user.name}! ⚽`);
      onLoginSuccess();
    } else if (res.isPending) {
      onShowToast('O seu registo ainda aguarda aprovação pelo Administrador do Clube. ⏳');
    } else if (res.isRejected) {
      onShowToast('O seu pedido de acesso foi recusado pelo Administrador.');
    } else {
      onShowToast(res.error || 'Ainda não foi aprovado.');
    }
  };

  const handleGuestLogin = () => {
    const guestUser: UserAccount = {
      id: 'guest-' + Date.now(),
      username: 'convidado',
      name: 'Treinador Convidado',
      role: 'Modo Demo',
      status: 'approved',
      createdAt: new Date().toISOString()
    };
    onUpdateState({ currentUser: guestUser });
    onShowToast('Sessão iniciada como Treinador Convidado.');
    onLoginSuccess();
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-start p-3 sm:p-6 pb-36 font-sans relative">
      {/* Background visual accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auth Container */}
      <div className="ui-card w-full max-w-md p-4 sm:p-7 relative z-10 text-left my-2">
        {/* Glow corner decorations */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-4 relative text-center">
          {(brand.logo || brand.name) && (
            <div className="flex flex-col items-center mb-3" aria-label="Clube">
              {brand.logo && (
                <img
                  src={brand.logo}
                  alt={brand.name ? `Símbolo do ${brand.name}` : 'Símbolo do clube'}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-contain bg-white/95 p-1.5 border-4 border-cyan-400 shadow-lg"
                />
              )}
              {brand.name && (
                <div className="mt-2 text-lg sm:text-xl font-extrabold font-['Chakra_Petch'] uppercase tracking-wider text-cyan-300">
                  {brand.name}
                </div>
              )}
            </div>
          )}
          <div className={`relative group mb-2.5 ${brand.logo || brand.name ? 'scale-75 -mt-1 -mb-1' : ''}`}>
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
            <img
              src={logoImg}
              alt="BolaComVisão Logo"
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-cyan-400"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-['Chakra_Petch'] uppercase tracking-widest text-white">
            BolaComVisão
          </h1>
          <p className="text-[11px] font-mono text-cyan-300/80 mt-0.5 uppercase tracking-widest">
            Gestão Tática & Desportiva
          </p>

          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
            <span>🛡️ Base de Dados Partilhada com Aprovação</span>
          </div>
        </div>

        {/* PENDING APPROVAL SCREEN */}
        {mode === 'pending' && (
          <div className="text-center space-y-4 py-2 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-3xl mx-auto animate-pulse">
              ⏳
            </div>

            <div>
              <h2 className="text-lg font-bold font-['Chakra_Petch'] uppercase tracking-wider text-amber-300">
                Registo a Aguardar Aprovação
              </h2>
              <p className="text-xs text-slate-300 font-mono mt-1.5 leading-relaxed">
                A conta foi registada na Nuvem. Para aceder à base de dados do clube, o{' '}
                <strong className="text-cyan-300">Administrador</strong> tem de autorizar o perfil.
              </p>
            </div>

            {pendingAccount && (
              <div className="ui-inset p-3.5 text-left text-xs font-mono space-y-1.5">
                <div className="text-slate-400">
                  Nome: <span className="text-white font-bold">{pendingAccount.name}</span>
                </div>
                <div className="text-slate-400">
                  Utilizador: <span className="text-cyan-300">@{pendingAccount.username}</span>
                </div>
                <div className="text-slate-400">
                  Função Solicitada: <span className="text-amber-300 font-bold">{pendingAccount.role}</span>
                </div>
                <div className="text-slate-400">
                  Estado: <span className="text-amber-400 font-bold">⏳ Aguarda Aprovação</span>
                </div>
              </div>
            )}

            {/* SEÇÃO 1: NOTIFICAR ADMINISTRADOR (WHATSAPP / EMAIL) */}
            {pendingAccount && (
              <div className="bg-slate-950/90 border-2 border-emerald-500/40 rounded-2xl p-4 text-left space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📲</span>
                    <span className="text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider text-white">
                      Notificar o Administrador
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                    WhatsApp & E-mail
                  </span>
                </div>

                <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                  Envie o pedido com 1 toque diretamente para o WhatsApp ou E-mail do Administrador (
                  <strong className="text-cyan-300">
                    {state.notificationSettings?.adminContactEmail || MASTER_ADMIN_EMAIL}
                  </strong>
                  ) para autorização rápida:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      openWhatsAppRegistrationRequest(
                        pendingAccount,
                        state.notificationSettings?.adminContactPhone,
                        state.myClubName
                      );
                      onShowToast('A abrir WhatsApp com o pedido de aprovação... 💬');
                    }}
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  >
                    <span>💬</span>
                    <span>Enviar por WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      openEmailRegistrationRequest(
                        pendingAccount,
                        state.notificationSettings?.adminContactEmail || MASTER_ADMIN_EMAIL,
                        state.myClubName
                      );
                      onShowToast('A abrir cliente de e-mail... 📧');
                    }}
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  >
                    <span>📧</span>
                    <span>Enviar por E-mail</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const msg = buildRegistrationNotificationMessage(pendingAccount, state.myClubName);
                    navigator.clipboard.writeText(msg);
                    onShowToast('Mensagem de pedido copiada para a área de transferência! 📋✓');
                  }}
                  className="ui-btn ui-btn-secondary w-full py-2 px-3 text-[11px] flex items-center justify-center gap-1.5"
                >
                  <span>📋</span>
                  <span>Copiar Mensagem do Pedido para Colar</span>
                </button>
              </div>
            )}

            {/* AVISO INFORMATIVO DE SEGURANÇA E ACESSO */}
            <div className="ui-inset p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider">
                <span>🛡️</span>
                <span>Processo de Autorização</span>
              </div>
              <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                Após notificar o Administrador, o seu perfil será revisto e a função atribuída no painel de controlo.
                Assim que for aprovado, poderá entrar imediatamente na aplicação e aceder à base de dados da equipa.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCheckPendingStatus}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin text-sm">🔄</span>
                    <span>A verificar autorização...</span>
                  </>
                ) : (
                  <span>🔄 Verificar Estado de Aprovação</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setPendingAccount(null);
                }}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer py-1.5"
              >
                ← Voltar ao Início de Sessão
              </button>
            </div>
          </div>
        )}

        {/* AUTH FORMS (LOGIN / REGISTER) */}
        {mode !== 'pending' && (
          <>
            {/* Auth Switcher Tabs (Directly below Header) */}
            <div className="ui-inset flex p-1 mb-4">
              <button
                type="button"
                className={`flex-1 py-2.5 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
                onClick={() => {
                  setMode('login');
                  setLoginError(null);
                }}
              >
                🔑 Entrar
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
                onClick={() => {
                  setMode('register');
                  setRegError(null);
                }}
              >
                ✍️ Criar Conta
              </button>
            </div>

            {/* LOGIN MODE */}
            {mode === 'login' && (
              <div className="space-y-3.5">
                {/* Google Login */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold font-sans text-xs transition-all flex items-center justify-center gap-2.5 border border-slate-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Entrar com a Conta Google</span>
                </button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-mono">
                    <span className="bg-slate-900 px-3 text-slate-400">ou com credenciais do clube</span>
                  </div>
                </div>

                {/* LOGIN FORM */}
                <form onSubmit={handleLogin} className="space-y-3">
                  {loginError && (
                    <AuthErrorBanner
                      error={loginError}
                      onClear={() => setLoginError(null)}
                      onShowToast={onShowToast}
                      onGuestLogin={handleGuestLogin}
                    />
                  )}

                  <div>
                    <label className="block text-xs text-cyan-300 font-mono mb-1">Utilizador ou Email</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm">👤</span>
                      <input
                        type="text"
                        required
                        placeholder="ex: treinador ou treinador@email.com"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="ui-input w-full text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-cyan-300 font-mono mb-1">Palavra-passe</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm">🔒</span>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="ui-input w-full text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin text-sm">🔄</span>
                        <span>A autenticar na Nuvem...</span>
                      </>
                    ) : (
                      <span>Entrar na Plataforma ➔</span>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <span className="text-xs text-slate-400 font-mono">
                      Não tem conta?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('register')}
                        className="text-cyan-400 font-bold hover:underline cursor-pointer"
                      >
                        Registe-se aqui
                      </button>
                    </span>
                  </div>
                </form>
              </div>
            )}

            {/* REGISTER MODE */}
            {mode === 'register' && (
              <div className="space-y-3">
                {/* Google Sign up */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold font-sans text-xs transition-all flex items-center justify-center gap-2.5 border border-slate-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Registar com a Conta Google</span>
                </button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-mono">
                    <span className="bg-slate-900 px-3 text-slate-400">ou preencha os dados do perfil</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-mono text-cyan-300">
                  ℹ️ Os novos membros são integrados na base de dados centralizada após aprovação do Administrador.
                </div>

                {regError && (
                  <AuthErrorBanner
                    error={regError}
                    onClear={() => setRegError(null)}
                    onShowToast={onShowToast}
                    onGuestLogin={handleGuestLogin}
                  />
                )}

                <form onSubmit={handleRegister} className="space-y-2.5">
                  <div className="ui-card p-2.5 space-y-1.5">
                    <label className="block text-xs text-cyan-300 font-mono">🎟️ Código de Convite (opcional)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Ex: BCV-A1B2C"
                        value={regInviteCode}
                        onChange={(e) => {
                          setRegInviteCode(e.target.value.toUpperCase());
                          setResolvedInvite(null);
                          setInviteCheckError(null);
                        }}
                        className="ui-input flex-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleCheckInviteCode}
                        disabled={isCheckingInvite || !regInviteCode.trim()}
                        className="ui-btn ui-btn-soft px-3 py-2 text-xs"
                      >
                        {isCheckingInvite ? '...' : 'Verificar'}
                      </button>
                    </div>
                    {resolvedInvite && (
                      <p className="text-[11px] text-emerald-300">
                        ✓ Convite válido! Vais juntar-te a <strong>{resolvedInvite.teamName}</strong> como{' '}
                        <strong>{resolvedInvite.role}</strong>, já aprovado.
                      </p>
                    )}
                    {inviteCheckError && <p className="text-[11px] text-red-300">❌ {inviteCheckError}</p>}
                    {!resolvedInvite && !inviteCheckError && (
                      <p className="text-[11px] text-slate-500">
                        Sem código, vais criar o teu próprio clube novo (ficas Administrador dele automaticamente).
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-cyan-300 font-mono mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Prof. Carlos Silva"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="ui-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-cyan-300 font-mono mb-1">Nome de Utilizador *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: treinadorsilva"
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value);
                        setRegError(null);
                      }}
                      className="ui-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-cyan-300 font-mono mb-1">
                      E-mail Pessoal / Notificação (Opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: treinador@gmail.com"
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        setRegError(null);
                      }}
                      className="ui-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-cyan-300 font-mono mb-1">Função na Equipa Técnica *</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="ui-input w-full text-xs"
                    >
                      <option value="Treinador Principal">Treinador Principal</option>
                      <option value="Treinador Adjunto">Treinador Adjunto</option>
                      <option value="Treinador de Guarda-Redes">Treinador de Guarda-Redes</option>
                      <option value="Preparador Físico">Preparador Físico</option>
                      <option value="Analista / Observador">Analista / Observador</option>
                      <option value="Fisioterapeuta / Médico">Fisioterapeuta / Médico</option>
                      <option value="Diretor Desportivo">Diretor Desportivo</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-cyan-300 font-mono mb-1">Palavra-passe (min 6) *</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="ui-input w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-cyan-300 font-mono mb-1">Confirmar *</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="ui-input w-full text-xs"
                      />
                    </div>
                  </div>

                  {/* Primary High-Visibility Register Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-['Chakra_Petch'] font-extrabold text-xs sm:text-sm uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer border border-cyan-300/40"
                    >
                      {isLoading ? (
                        <>
                          <span className="animate-spin text-sm">🔄</span>
                          <span>A submeter registo...</span>
                        </>
                      ) : (
                        <>
                          <span>🚀 Concluir Registo / Criar Conta</span>
                          <span className="font-bold">➔</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <span className="text-xs text-slate-400 font-mono">
                      Já tem conta?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-cyan-400 font-bold hover:underline cursor-pointer"
                      >
                        Iniciar Sessão aqui
                      </button>
                    </span>
                  </div>
                </form>
              </div>
            )}

            {/* Guest Demo Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-mono">
                <span className="bg-slate-900 px-3 text-slate-500">ou acesso rápido</span>
              </div>
            </div>

            {/* Demo Fast Access Button */}
            <button
              type="button"
              onClick={handleGuestLogin}
              className="ui-btn ui-btn-soft w-full py-2.5 text-xs flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>Entrar sem Registo (Modo Convidado)</span>
            </button>
          </>
        )}

        {/* Hint footer */}
        <div className="mt-4 text-[10px] font-mono text-slate-500 text-center">
          BolaComVisão © 2026 · Base de Dados Partilhada do Clube
        </div>
      </div>
    </div>
  );
};
