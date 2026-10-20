import React, { useState, useEffect, useRef, Suspense } from 'react';
import { AppState, UserAccount, AppNotification } from './types';
import { loadAppState, saveAppState, clearAllAppState } from './lib/storage';
import { applyThemeCSS } from './lib/utils';
import { exportJSONBackup } from './lib/exportUtils';
import { evaluateSystemNotifications } from './lib/notificationEngine';
import { syncStateWithCloud, processOfflineMutationsQueue } from './lib/syncEngine';
import { recordAuditLog } from './lib/auditEngine';
import {
  saveAppStateToCloud,
  subscribeToCloudState,
  logoutCoachUser,
  subscribeToAllClubUsers,
  checkCurrentAuthUser,
  saveMasterClubState,
  isAppAdmin,
  getFirestoreQuotaState
} from './services/cloudAuthService';
import { Navbar, TabType } from './components/Navbar';
import { MoreDrawer } from './components/MoreDrawer';
import { ConfirmModal } from './components/ConfirmModal';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { ViewLoadingFallback } from './components/ViewLoadingFallback';
import { lazyWithRetry } from './lib/lazyWithRetry';

// Dynamic Lazy Views (Zero initial bundle cost + auto-recovery)
const AuthView = lazyWithRetry(() => import('./components/views/AuthView'), 'AuthView');
const HomeView = lazyWithRetry(() => import('./components/views/HomeView'), 'HomeView');
const TeamsHubView = lazyWithRetry(() => import('./components/views/TeamsHubView'), 'TeamsHubView');
const LiveMatchView = lazyWithRetry(() => import('./components/views/LiveMatchView'), 'LiveMatchView');
const ScheduleView = lazyWithRetry(() => import('./components/views/ScheduleView'), 'ScheduleView');
const ConvocatoriaView = lazyWithRetry(() => import('./components/views/ConvocatoriaView'), 'ConvocatoriaView');
const TrainingsView = lazyWithRetry(() => import('./components/views/TrainingsView'), 'TrainingsView');
const ResultsView = lazyWithRetry(() => import('./components/views/ResultsView'), 'ResultsView');
const StatsView = lazyWithRetry(() => import('./components/views/StatsView'), 'StatsView');
const GameAnalysisDashboard = lazyWithRetry(() => import('./components/views/GameAnalysisDashboard'), 'GameAnalysisDashboard');
const SquadView = lazyWithRetry(() => import('./components/views/SquadView'), 'SquadView');
const OpponentScoutingView = lazyWithRetry(() => import('./components/views/OpponentScoutingView'), 'OpponentScoutingView');
const PreMatchPlanView = lazyWithRetry(() => import('./components/views/PreMatchPlanView'), 'PreMatchPlanView');
const RelatoriosView = lazyWithRetry(() => import('./components/views/RelatoriosView'), 'RelatoriosView');

// Modals
import { AdminUsersModal } from './components/AdminUsersModal';
import { AuditLogModal } from './components/AuditLogModal';
import { DatabaseModal } from './components/DatabaseModal';
import { SettingsModal } from './components/SettingsModal';
import { SyncModal } from './components/SyncModal';
import { TeamInviteModal } from './components/TeamInviteModal';
import { SeasonSelectorModal } from './components/SeasonSelectorModal';
import { NotificationModal } from './components/NotificationModal';


export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [currentTab, setCurrentTab] = useState<TabType>('teams');
  const [targetOpponentId, setTargetOpponentId] = useState<string | undefined>(undefined);

  // Modals & Overlay state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDatabase, setShowDatabase] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showAdminUsers, setShowAdminUsers] = useState<boolean>(false);
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);
  const [showInviteStaff, setShowInviteStaff] = useState<boolean>(false);
  const [showSeasonSelector, setShowSeasonSelector] = useState<boolean>(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState<boolean>(false);
  const [pendingUsersCount, setPendingUsersCount] = useState<number>(0);
  const [latestPendingUser, setLatestPendingUser] = useState<UserAccount | null>(null);
  const prevPendingCountRef = useRef<number>(-1);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isRemoteSyncRef = useRef<boolean>(false);
  const cloudSyncDebounceTimerRef = useRef<any>(null);

  useEffect(() => {
    applyThemeCSS(state.theme || 'original');
  }, [state.theme]);

  // On Mount: Auto-check active cloud session and load latest master club state
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const session = await checkCurrentAuthUser();
        if (session && session.user && isMounted) {
          if (session.cloudState) {
            setState((prev) => {
              const merged = {
                ...session.cloudState,
                currentUser: session.user,
                syncInfo: {
                  ...prev.syncInfo,
                  isOnline: true,
                  status: 'synced' as const,
                  lastSyncedAt: Date.now(),
                  pendingChangesCount: 0,
                  syncId: session.user!.id,
                  lastSyncMessage: 'Sessão restaurada e base de dados sincronizada! ☁️'
                }
              };
              saveAppState(merged);
              return merged;
            });
          } else {
            // Keep local state with authenticated user without blindly overwriting master cloud
            setState((prev) => {
              const updated = {
                ...prev,
                currentUser: session.user
              };
              saveAppState(updated);
              return updated;
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar sessão inicial:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => {
      let syncedTeams = updates.teams !== undefined ? updates.teams : prev.teams;
      const targetTeamId = prev.activeTeamId || (Array.isArray(prev.teams) && prev.teams[0]?.id) || '';
      if (updates.teams === undefined && targetTeamId && Array.isArray(prev.teams)) {
        const hasActiveTeamChange =
          updates.roster !== undefined ||
          updates.matches !== undefined ||
          updates.trainings !== undefined ||
          updates.schedule !== undefined ||
          updates.tactics !== undefined ||
          updates.myClubName !== undefined ||
          updates.category !== undefined ||
          updates.season !== undefined ||
          updates.clubLogoUrl !== undefined ||
          updates.clubEvents !== undefined ||
          updates.staffUnavailability !== undefined ||
          updates.opponentScouting !== undefined;

        if (hasActiveTeamChange) {
          syncedTeams = prev.teams.map((t) => {
            if (t.id === targetTeamId) {
              return {
                ...t,
                roster: updates.roster !== undefined ? updates.roster : t.roster,
                matches: updates.matches !== undefined ? updates.matches : t.matches,
                trainings: updates.trainings !== undefined ? updates.trainings : t.trainings,
                schedule: updates.schedule !== undefined ? updates.schedule : t.schedule,
                tactics: updates.tactics !== undefined ? updates.tactics : t.tactics,
                clubName: updates.myClubName !== undefined ? updates.myClubName : t.clubName,
                category: updates.category !== undefined ? updates.category : t.category,
                season: updates.season !== undefined ? updates.season : t.season,
                clubLogoUrl: updates.clubLogoUrl !== undefined ? updates.clubLogoUrl : t.clubLogoUrl,
                clubEvents: updates.clubEvents !== undefined ? updates.clubEvents : t.clubEvents,
                staffUnavailability: updates.staffUnavailability !== undefined ? updates.staffUnavailability : t.staffUnavailability,
                opponentScouting: updates.opponentScouting !== undefined ? updates.opponentScouting : t.opponentScouting
              };
            }
            return t;
          });
        }
      }

      const updated = {
        ...prev,
        ...updates,
        ...(syncedTeams !== prev.teams ? { teams: syncedTeams } : {})
      };
      saveAppState(updated);

      // Check if substantive data changed that requires cloud persistence
      const hasSubstantiveChanges =
        updates.roster !== undefined ||
        updates.matches !== undefined ||
        updates.trainings !== undefined ||
        updates.schedule !== undefined ||
        updates.tactics !== undefined ||
        updates.opponentScouting !== undefined ||
        updates.season !== undefined ||
        updates.activeTeamId !== undefined ||
        updates.teams !== undefined ||
        updates.staffMessages !== undefined ||
        updates.clubEvents !== undefined ||
        updates.staffUnavailability !== undefined ||
        updates.exerciseLibrary !== undefined;

      // If user is authenticated in cloud, automatically push changes to shared club database with gentle throttling
      if (
        updated.currentUser &&
        updated.currentUser.id &&
        !isRemoteSyncRef.current &&
        hasSubstantiveChanges &&
        !getFirestoreQuotaState().isExhausted
      ) {
        if (cloudSyncDebounceTimerRef.current) {
          clearTimeout(cloudSyncDebounceTimerRef.current);
        }
        const isWiping = !updated.teams || updated.teams.length === 0;
        cloudSyncDebounceTimerRef.current = setTimeout(() => {
          saveMasterClubState(
            updated.currentUser?.clubId || 'main',
            updated,
            updated.currentUser?.id,
            updated.currentUser?.name,
            isWiping
          ).catch((err) => {
            console.warn('Background master cloud save error:', err);
          });
        }, isWiping ? 200 : 3500);
      }

      return updated;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Real-time Cloud Synchronization Listener for Multi-Device
  useEffect(() => {
    if (!state.currentUser || !state.currentUser.id) return;

    // Listen to changes made on other devices in real-time
    const unsubscribe = subscribeToCloudState(
      state.currentUser.id,
      state.currentUser.clubId || 'main',
      (cloudState) => {
        if (cloudState) {
          isRemoteSyncRef.current = true;
          setState((prev) => {
            const merged = {
              ...cloudState,
              currentUser: prev.currentUser,
              syncInfo: {
                ...prev.syncInfo,
                isOnline: true,
                status: 'synced' as const,
                lastSyncedAt: Date.now(),
                pendingChangesCount: 0,
                lastSyncMessage: 'Atualizado em tempo real a partir de outro dispositivo ☁️'
              }
            };
            saveAppState(merged);
            return merged;
          });
          setTimeout(() => {
            isRemoteSyncRef.current = false;
          }, 500);
        }
      },
      (error) => {
        console.warn('Aviso na sincronização em tempo real:', error.message);
      }
    );

    return () => {
      unsubscribe();
    };
    // Resubscribe only when the signed-in user changes, not on every currentUser object update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id]);

  // Real-time listener for Coach Registrations requiring Admin Approval (Admin ONLY)
  useEffect(() => {
    if (!state.currentUser || !isAppAdmin(state.currentUser)) {
      return;
    }

    // Request browser notification permission if admin and not requested yet
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().catch(() => {});
      } catch {
        // Safe catch
      }
    }

    const unsub = subscribeToAllClubUsers(
      state.currentUser?.clubId || 'main',
      (allUsers) => {
        const pending = allUsers.filter((u) => u.status === 'pending');
        const prevCount = prevPendingCountRef.current;

        // When a new registration arrives while Admin is in the app
        if (prevCount !== -1 && pending.length > prevCount) {
          const newest = pending[pending.length - 1] || pending[0];
          showToast(
            `🔔 Novo pedido de acesso: ${newest.name} (${pending.length} pendente${pending.length > 1 ? 's' : ''})`
          );

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('🔔 Novo Pedido de Acesso - Bola com Visão', {
                body: `${newest.name} solicitou acesso como ${newest.role || 'Treinador'}. Total: ${pending.length} pedido(s) pendente(s).`,
                icon: '/favicon.ico'
              });
            } catch (e) {
              console.warn('Aviso ao disparar notificação:', e);
            }
          }
        }

        prevPendingCountRef.current = pending.length;
        setPendingUsersCount(pending.length);
        setLatestPendingUser(pending.length > 0 ? pending[pending.length - 1] || pending[0] : null);

        // Persistent notification management for Admin
        setState((prev) => {
          const currentNotifs = prev.notifications || [];
          const pendingIds = new Set(pending.map((p) => `pending-reg-${p.id}`));

          // Remove notifications of type 'novo_registo' that are no longer pending
          const nonRegistrationNotifs = currentNotifs.filter((n) => n.type !== 'novo_registo' || pendingIds.has(n.id));

          // Existing registration notifications map
          const existingRegMap = new Map<string, AppNotification>();
          nonRegistrationNotifs.forEach((n) => {
            if (n.type === 'novo_registo') {
              existingRegMap.set(n.id, n);
            }
          });

          // Generate or retain notification for each pending user
          const regNotifs: AppNotification[] = pending.map((u) => {
            const notifId = `pending-reg-${u.id}`;
            const existing = existingRegMap.get(notifId);
            if (existing) {
              return existing;
            }
            return {
              id: notifId,
              title: `⏳ Novo Pedido de Acesso: ${u.name}`,
              message: `${u.name} (@${u.username}) registou-se com a função "${u.role}". Aceda à Gestão de Utilizadores para autorizar ou recusar.`,
              timestamp: Date.now(),
              read: false,
              priority: 'alta',
              type: 'novo_registo' as const,
              targetTab: 'plantel'
            };
          });

          const updatedNotifications = [
            ...regNotifs,
            ...nonRegistrationNotifs.filter((n) => n.type !== 'novo_registo')
          ];

          const oldNotifStr = JSON.stringify(prev.notifications || []);
          const newNotifStr = JSON.stringify(updatedNotifications);
          if (oldNotifStr === newNotifStr) {
            return prev;
          }

          const updatedState = { ...prev, notifications: updatedNotifications };
          saveAppState(updatedState);
          return updatedState;
        });
      },
      (error) => {
        console.warn('Aviso na subscrição de utilizadores:', error.message);
      }
    );

    return () => {
      unsub();
      prevPendingCountRef.current = -1;
      setPendingUsersCount(0);
      setLatestPendingUser(null);
    };
    // Resubscribe only when the user's identity/role changes, not on every currentUser object update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id, state.currentUser?.role, state.currentUser?.email]);

  // Auto-sync listener for online / offline events
  useEffect(() => {
    const handleOnline = async () => {
      showToast('Ligação à internet detetada! A sincronizar na Nuvem... 🔄');

      // Process any queued offline mutations first
      try {
        const queueRes = await processOfflineMutationsQueue();
        if (queueRes.processed > 0) {
          showToast(`Sincronizadas ${queueRes.processed} alterações guardadas offline! 📲`);
        }
      } catch (e) {
        console.warn('Queue flush note:', e);
      }

      const currentSyncInfo = state.syncInfo || {
        isOnline: true,
        status: 'syncing',
        lastSyncedAt: Date.now(),
        pendingChangesCount: 0,
        syncId: state.currentUser?.id || 'BCV-CLOUD',
        lastSyncMessage: 'A sincronizar com a nuvem...',
        autoSyncEnabled: true
      };

      updateState({
        syncInfo: {
          ...currentSyncInfo,
          isOnline: true,
          status: 'syncing'
        }
      });

      if (state.currentUser?.id) {
        await saveAppStateToCloud(state.currentUser.id, state);
      }

      const res = await syncStateWithCloud(state, currentSyncInfo.syncId);

      updateState({
        syncInfo: {
          ...currentSyncInfo,
          isOnline: true,
          status: res.success ? 'synced' : 'error',
          lastSyncedAt: Date.now(),
          pendingChangesCount: res.success ? 0 : currentSyncInfo.pendingChangesCount,
          lastSyncMessage: res.message
        }
      });

      showToast(res.message);
    };

    const handleOffline = () => {
      const currentSyncInfo = state.syncInfo || {
        isOnline: false,
        status: 'offline',
        lastSyncedAt: Date.now(),
        pendingChangesCount: 0,
        syncId: 'BCV-OFFLINE',
        lastSyncMessage: 'Modo Offline: Dados guardados localmente com segurança',
        autoSyncEnabled: true
      };

      updateState({
        syncInfo: {
          ...currentSyncInfo,
          isOnline: false,
          status: 'offline',
          lastSyncMessage: 'Sem ligação à internet. Todas as alterações serão sincronizadas ao reconectar.'
        }
      });

      showToast('Modo Offline ativado. A trabalhar localmente. 📡');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state]);

  // Periodic notification evaluation
  useEffect(() => {
    const evalResult = evaluateSystemNotifications(state);
    const updatedNotifications = evalResult.notifications;
    const oldNotifStr = JSON.stringify(state.notifications || []);
    const newNotifStr = JSON.stringify(updatedNotifications);
    if (oldNotifStr !== newNotifStr) {
      updateState({ notifications: updatedNotifications });
    }
    // Re-evaluate only when the underlying data changes; depending on `state` would loop on its own update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.trainings, state.matches, state.schedule, state.roster]);

  const handleNavigate = (tab: string, targetId?: string) => {
    if (tab === 'adversario' || tab === 'prejogo') {
      if (targetId) setTargetOpponentId(targetId);
    }
    setCurrentTab(tab as TabType);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    const userName = state.currentUser?.name || 'Treinador';

    // Audit Log before clearing
    recordAuditLog(state.currentUser, 'logout', 'utilizador', `Sessão terminada por ${userName}`, {
      details: { username: state.currentUser?.username }
    });

    // Call pure Firebase Auth sign out
    await logoutCoachUser();

    // Limpa também os dados do clube em cache local (plantel, jogos, treinos, etc.) — sem isto,
    // os dados do clube anterior ficavam visíveis a quem iniciasse sessão a seguir no mesmo dispositivo.
    const cleanState = clearAllAppState(null);
    setState(cleanState);
    showToast(`Sessão terminada. Até breve, ${userName}! 👋`);
  };

  // If user is not logged in, render AuthView
  if (!state.currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 font-sans">
        <Suspense fallback={<ViewLoadingFallback />}>
          <AuthView
            state={state}
            onUpdateState={updateState}
            onLoginSuccess={() => {
              setCurrentTab('teams');
            }}
            onShowToast={showToast}
          />
        </Suspense>

        {/* PWA Install Banner */}
        <InstallPwaBanner />

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] bg-slate-900/95 border border-cyan-500/50 text-white px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,210,255,0.3)] font-mono text-xs animate-in fade-in slide-in-from-bottom-5 backdrop-blur-md flex items-center gap-2.5 max-w-[90vw] text-center">
            <span className="text-cyan-400 text-sm">⚽</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // Active match check for Live tab pulse
  const hasActiveMatch = (state.matches || []).some((m) => !m.finished);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 font-sans pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] overflow-x-hidden">
      {/* Top Banner for PWA Install Prompt */}
      <InstallPwaBanner />

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-2.5 sm:px-6 pt-2 sm:pt-6 overflow-x-hidden">
        <Suspense fallback={<ViewLoadingFallback />}>
          {currentTab === 'teams' && (
            <TeamsHubView
              state={state}
              onUpdateState={updateState}
              onSelectTeam={(teamId) => {
                const target = state.teams?.find((t) => t.id === teamId);
                if (target) {
                  const updatedTeams = (state.teams || []).map((t) => {
                    if (t.id === state.activeTeamId) {
                      return {
                        ...t,
                        roster: state.roster || [],
                        staffMembers: state.staffMembers || [],
                        matches: state.matches || [],
                        trainings: state.trainings || [],
                        schedule: state.schedule || [],
                        tactics: state.tactics || [],
                        tacticFormat: state.tacticFormat || 11,
                        opponentScouting: state.opponentScouting || [],
                        clubEvents: state.clubEvents || [],
                        staffUnavailability: state.staffUnavailability || []
                      };
                    }
                    return t;
                  });

                  const targetScheduleMap = new Map<string, any>();
                  (target.schedule || []).forEach((s) => {
                    if (s && s.id) targetScheduleMap.set(s.id, s);
                  });
                  (state.schedule || []).forEach((s) => {
                    if (!s || !s.id) return;
                    const sTeamId = (s as any).teamId;
                    const sTeamName = (s as any).teamName?.toLowerCase().trim();
                    const targetClubLower = (target.clubName || '').toLowerCase().trim();
                    if (
                      sTeamId === target.id ||
                      (sTeamName && targetClubLower && (sTeamName === targetClubLower || targetClubLower.includes(sTeamName) || sTeamName.includes(targetClubLower))) ||
                      (targetClubLower.includes('drag') && (sTeamName?.includes('drag') || !sTeamId))
                    ) {
                      if (!targetScheduleMap.has(s.id)) {
                        targetScheduleMap.set(s.id, s);
                      }
                    }
                  });
                  const resolvedTargetSchedule = Array.from(targetScheduleMap.values());

                  const targetMatchesMap = new Map<string, any>();
                  (target.matches || []).forEach((m) => {
                    if (m && m.id) targetMatchesMap.set(m.id, m);
                  });
                  (state.matches || []).forEach((m) => {
                    if (!m || !m.id) return;
                    const mTeamId = (m as any).teamId;
                    const mTeamName = (m as any).teamName?.toLowerCase().trim();
                    const targetClubLower = (target.clubName || '').toLowerCase().trim();
                    if (
                      mTeamId === target.id ||
                      !mTeamId ||
                      (mTeamName && targetClubLower && (mTeamName === targetClubLower || targetClubLower.includes(mTeamName) || mTeamName.includes(targetClubLower))) ||
                      (targetClubLower.includes('drag') && (mTeamName?.includes('drag') || !mTeamId))
                    ) {
                      if (!targetMatchesMap.has(m.id)) {
                        targetMatchesMap.set(m.id, m);
                      }
                    }
                  });
                  const resolvedTargetMatches = Array.from(targetMatchesMap.values());

                  updateState({
                    activeTeamId: teamId,
                    teams: updatedTeams,
                    myClubName: target.clubName,
                    clubLogoUrl: target.clubLogoUrl,
                    category: target.category,
                    season: target.season,
                    roster: target.roster && target.roster.length > 0 ? target.roster : (state.roster || []),
                    staffMembers: target.staffMembers || [],
                    matches: resolvedTargetMatches.length > 0 ? resolvedTargetMatches : (state.matches || []),
                    trainings: target.trainings || [],
                    schedule: resolvedTargetSchedule,
                    tactics: target.tactics || [],
                    tacticFormat: target.tacticFormat || 11,
                    opponentScouting: target.opponentScouting || [],
                    clubEvents: target.clubEvents || [],
                    staffUnavailability: target.staffUnavailability || []
                  });
                }
                setCurrentTab('home');
              }}
              onOpenSettings={() => setShowSettings(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onOpenAdminUsers={() => setShowAdminUsers(true)}
              pendingUsersCount={pendingUsersCount}
              onLogout={handleLogout}
              onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'home' && (
            <HomeView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenDatabase={() => setShowDatabase(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onOpenAdminUsers={() => setShowAdminUsers(true)}
              pendingUsersCount={pendingUsersCount}
              latestPendingUser={latestPendingUser}
              onExportBackup={() => {
                exportJSONBackup(state);
                showToast('Backup exportado ✓');
              }}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'jogo' && (
            <LiveMatchView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'calendario' && (
            <ScheduleView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'convocatoria' && (
            <ConvocatoriaView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowToast={showToast}
              initialMatchId={targetOpponentId}
            />
          )}

          {currentTab === 'prejogo' && (
            <PreMatchPlanView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowToast={showToast}
              targetOpponentId={targetOpponentId}
            />
          )}

          {currentTab === 'adversario' && (
            <OpponentScoutingView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowToast={showToast}
              targetOpponentId={targetOpponentId}
            />
          )}

          {currentTab === 'treinos' && (
            <TrainingsView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
              onShowToast={showToast}
              initialTab="list"
            />
          )}

          {currentTab === 'biblioteca' && (
            <TrainingsView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
              onShowToast={showToast}
              initialTab="library"
            />
          )}

          {currentTab === 'jogos' && (
            <ResultsView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'stats' && (
            <StatsView
              state={state}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'analise_jogos' && (
            <GameAnalysisDashboard
              state={state}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowToast={showToast}
            />
          )}

          {(currentTab === 'plantel' || currentTab === 'chat_staff') && (
            <SquadView
              key={currentTab}
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
              onShowToast={showToast}
              initialSquadTab={currentTab === 'chat_staff' ? 'chat_staff' : 'jogadores'}
            />
          )}

          {currentTab === 'relatorios' && (
            <RelatoriosView
              state={state}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenSync={() => setShowSyncModal(true)}
              onOpenAdminUsers={() => setShowAdminUsers(true)}
              pendingUsersCount={pendingUsersCount}
              onShowToast={showToast}
            />
          )}
        </Suspense>
      </div>

      {/* Global Bottom Navigation */}
      <Navbar
        currentTab={currentTab}
        lang={state.lang}
        onNavigate={(tab) => setCurrentTab(tab)}
        onOpenMore={() => setShowMoreDrawer(true)}
        hasActiveMatch={hasActiveMatch}
        pendingCount={pendingUsersCount}
      />

      {/* More / Gestão Drawer */}
      <MoreDrawer
        isOpen={showMoreDrawer}
        onClose={() => setShowMoreDrawer(false)}
        state={state}
        onNavigate={(tab) => {
          handleNavigate(tab);
          setShowMoreDrawer(false);
        }}
        onOpenSettings={() => setShowSettings(true)}
        onOpenDatabase={() => setShowDatabase(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenSync={() => setShowSyncModal(true)}
        onOpenAdminUsers={() => setShowAdminUsers(true)}
        onOpenAuditLogs={() => setShowAuditLogs(true)}
        onOpenInviteStaff={() => setShowInviteStaff(true)}
        onOpenSeasons={() => setShowSeasonSelector(true)}
        pendingUsersCount={pendingUsersCount}
        onLogout={handleLogout}
      />

      {/* Modals */}
      {/* Database Modal */}
      {showDatabase && (
        <DatabaseModal
          state={state}
          onUpdateState={updateState}
          onClose={() => setShowDatabase(false)}
          onShowToast={showToast}
          onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          state={state}
          onUpdateState={updateState}
          onClose={() => setShowSettings(false)}
          onShowToast={showToast}
          onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
          onOpenAdminUsers={() => setShowAdminUsers(true)}
          pendingUsersCount={pendingUsersCount}
        />
      )}

      {/* Admin Users & Coaches Access Modal */}
      {showAdminUsers && (
        <AdminUsersModal
          state={state}
          onUpdateState={updateState}
          onClose={() => setShowAdminUsers(false)}
          onShowToast={showToast}
        />
      )}

      {/* Audit Log Modal */}
      {showAuditLogs && (
        <AuditLogModal state={state} onClose={() => setShowAuditLogs(false)} onShowToast={showToast} />
      )}

      {/* Team Invite Modal */}
      {showInviteStaff && (
        <TeamInviteModal
          state={state}
          onUpdateState={updateState}
          onClose={() => setShowInviteStaff(false)}
          onShowToast={showToast}
        />
      )}

      {/* Season Selector Modal */}
      {showSeasonSelector && (
        <SeasonSelectorModal
          state={state}
          onUpdateState={updateState}
          onClose={() => setShowSeasonSelector(false)}
          onShowToast={showToast}
        />
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <NotificationModal
          state={state}
          onUpdateState={updateState}
          onClose={() => setShowNotifications(false)}
          onNavigate={(tab) => {
            handleNavigate(tab);
            setShowNotifications(false);
          }}
          onOpenAdminUsers={() => setShowAdminUsers(true)}
          onShowToast={showToast}
        />
      )}

      {/* Sync Status Modal */}
      {showSyncModal && (
        <SyncModal
          state={state}
          onUpdateState={updateState}
          onClose={() => setShowSyncModal(false)}
          onShowToast={showToast}
        />
      )}

      {/* Global Confirmation Modal */}
      {confirmModalConfig && (
        <ConfirmModal
          message={confirmModalConfig.message}
          lang="pt"
          onConfirm={() => {
            confirmModalConfig.onConfirm();
            setConfirmModalConfig(null);
          }}
          onCancel={() => setConfirmModalConfig(null)}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[999999] bg-slate-900/95 border border-cyan-500/50 text-white px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,210,255,0.3)] font-mono text-xs animate-in fade-in slide-in-from-bottom-5 backdrop-blur-md flex items-center gap-2.5 max-w-[90vw] text-center">
          <span className="text-cyan-400 text-sm">⚽</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
