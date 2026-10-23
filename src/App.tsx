import React, { useState, useEffect, useRef, Suspense } from 'react';
import { AppState, UserAccount, AppNotification } from './types';
import { loadAppState, saveAppState, clearAllAppState } from './lib/storage';
import { subscribeToClubCloud, migrateClubToRecords, getCloudMode } from './services/clubCloud';
import { CloudSyncContext, deriveCloudSyncStatus, readCloudSavedAt, writeCloudSavedAt } from './lib/cloudSyncStatus';
import { applyThemeCSS } from './lib/utils';
import { exportJSONBackup } from './lib/exportUtils';
import { evaluateSystemNotifications } from './lib/notificationEngine';
import { syncStateWithCloud, processOfflineMutationsQueue, clearDeviceClubData } from './lib/syncEngine';
import { recordAuditLog } from './lib/auditEngine';
import { subscribeToLegacyClubDocument, auth, onAuthStateChanged } from './services/firebase';
import {
  logoutCoachUser,
  subscribeToAllClubUsers,
  checkCurrentAuthUser,
  saveMasterClubState,
  isAppAdmin,
  getFirestoreQuotaState
} from './services/cloudAuthService';
import { Navbar, TabType } from './components/Navbar';
import { getActiveCategory } from './components/navCategory';
import { PerformanceSubNav } from './components/PerformanceSubNav';
import { BackupReminder } from './components/BackupReminder';
import { getSyncView } from './lib/syncView';
import { SessionExpiredBanner } from './components/SessionExpiredBanner';
import { MoreDrawer } from './components/MoreDrawer';
import { ConfirmModal } from './components/ConfirmModal';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { ViewLoadingFallback } from './components/ViewLoadingFallback';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { useCalendarPublisher } from './hooks/useCalendarPublisher';
import { useShrinkOldPhotos } from './hooks/useShrinkOldPhotos';

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
// Loaded when opened: it bundles the Excel library used by the team spreadsheets.
const DatabaseModal = lazyWithRetry(() => import('./components/DatabaseModal'), 'DatabaseModal');
const GameAnalysisDashboard = lazyWithRetry(
  () => import('./components/views/GameAnalysisDashboard'),
  'GameAnalysisDashboard'
);
const SquadView = lazyWithRetry(() => import('./components/views/SquadView'), 'SquadView');
const PreMatchView = lazyWithRetry(() => import('./components/views/PreMatchView'), 'PreMatchView');

// Modals
import { AdminUsersModal } from './components/AdminUsersModal';
import { SettingsModal } from './components/SettingsModal';
import { TeamInviteModal } from './components/TeamInviteModal';
import { SeasonSelectorModal } from './components/SeasonSelectorModal';
import { NotificationModal } from './components/NotificationModal';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  useCalendarPublisher(state);
  const latestStateRef = useRef(state);
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  // Cloud save tracking: only saves confirmed by Firestore count as "guardado na nuvem".
  const [cloudSavedAt, setCloudSavedAt] = useState<number>(() => readCloudSavedAt());
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSaveError, setCloudSaveError] = useState<string | undefined>(undefined);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  const markCloudSaved = (ts: number) => {
    setCloudSavedAt((prev) => {
      const next = Math.max(prev, ts);
      writeCloudSavedAt(next);
      return next;
    });
  };

  const pushInFlightRef = useRef(false);
  const pushAgainRef = useRef(false);

  const pushStateToCloud = async (s: AppState, forceOverwrite = false): Promise<void> => {
    if (!s.currentUser?.id) return;
    // One save at a time: a save computed from an older state could undo a newer one.
    if (pushInFlightRef.current) {
      pushAgainRef.current = true;
      return;
    }
    pushInFlightRef.current = true;
    setCloudSaving(true);
    try {
      const res = await saveMasterClubState(
        s.currentUser.clubId || 'main',
        s,
        s.currentUser.id,
        s.currentUser.name,
        forceOverwrite
      );
      if (res.success) {
        markCloudSaved(s.lastLocalMutationAt || 0);
        setCloudSaveError(undefined);
      } else {
        setCloudSaveError(res.message || 'Não foi possível guardar na nuvem.');
      }
    } catch (err: any) {
      console.warn('Erro ao guardar na nuvem:', err);
      setCloudSaveError(err?.message || 'Não foi possível guardar na nuvem.');
    } finally {
      pushInFlightRef.current = false;
      setCloudSaving(false);
      if (pushAgainRef.current) {
        pushAgainRef.current = false;
        pushStateToCloud(latestStateRef.current);
      }
    }
  };
  const [currentTab, setCurrentTab] = useState<TabType>('teams');
  const [targetOpponentId, setTargetOpponentId] = useState<string | undefined>(undefined);
  const [openTodayTraining, setOpenTodayTraining] = useState(false);

  // Modals & Overlay state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDatabase, setShowDatabase] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showAdminUsers, setShowAdminUsers] = useState<boolean>(false);
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
                staffUnavailability:
                  updates.staffUnavailability !== undefined ? updates.staffUnavailability : t.staffUnavailability,
                opponentScouting: updates.opponentScouting !== undefined ? updates.opponentScouting : t.opponentScouting
              };
            }
            return t;
          });
        }
      }

      const updated: AppState = {
        ...prev,
        ...updates,
        ...(syncedTeams !== prev.teams ? { teams: syncedTeams } : {})
      };

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

      // Stamp local edits so an older cloud snapshot can never overwrite them (see the cloud listener below).
      if (hasSubstantiveChanges && !isRemoteSyncRef.current) {
        const now = Date.now();
        updated.updatedAt = now;
        updated.lastLocalMutationAt = now;
      }
      saveAppState(updated);

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
        cloudSyncDebounceTimerRef.current = setTimeout(
          () => {
            pushStateToCloud(updated, isWiping);
          },
          isWiping ? 200 : 3500
        );
      }

      return updated;
    });
  };

  // Full-size photos saved by older versions filled the phone's storage: reduce them once.
  useShrinkOldPhotos(state, latestStateRef, updateState);

  const cloudSync = deriveCloudSyncStatus({
    signedIn: Boolean(state.currentUser?.id),
    online: isOnline,
    saving: cloudSaving,
    error: cloudSaveError,
    lastLocalMutationAt: state.lastLocalMutationAt || 0,
    cloudSavedAt
  });

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Keep retrying changes that never reached the cloud (failed save, quota cooldown, app reopened offline...).
  useEffect(() => {
    if (!cloudSync.hasUnsavedChanges || !isOnline || cloudSaving) return;
    const retry = setTimeout(
      () => {
        if (getFirestoreQuotaState().isExhausted) {
          setCloudSaveError('Quota diária gratuita do Firebase atingida');
        } else {
          pushStateToCloud(latestStateRef.current);
        }
      },
      cloudSaveError ? 60000 : 15000
    );
    return () => clearTimeout(retry);
    // pushStateToCloud reads the latest state through latestStateRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSync.hasUnsavedChanges, isOnline, cloudSaving, cloudSaveError, state.lastLocalMutationAt]);

  // Warn before closing the app while changes exist only on this device.
  useEffect(() => {
    if (!cloudSync.hasUnsavedChanges) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [cloudSync.hasUnsavedChanges]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Tapping the save indicator explains it (including why saving failed), instead of opening a technical screen.
  const showSyncStatus = () => showToast(getSyncView(cloudSync).title);

  // Firebase session: the saved user is restored from this device before Firebase confirms the login, and the
  // cloud listeners only work once it does.
  const [authUid, setAuthUid] = useState<string | null>(() => auth.currentUser?.uid ?? null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setAuthUid(user?.uid ?? null);
        setAuthReady(true);
      }),
    []
  );
  // Signed in on this device (saved user) but without a Firebase session: nothing reaches the cloud.
  const cloudSessionLost =
    authReady && !authUid && Boolean(state.currentUser?.id) && !state.currentUser?.id.startsWith('guest-');

  // Real-time cloud sync for multi-device use: the legacy single document or per-record storage (see clubCloud.ts)
  useEffect(() => {
    if (!state.currentUser || !state.currentUser.id || !authUid) return;
    const workspaceId = state.currentUser.clubId || 'main';

    const applyRemote = (incoming: AppState) => {
      isRemoteSyncRef.current = true;
      const merged: AppState = {
        ...incoming,
        currentUser: latestStateRef.current.currentUser,
        syncInfo: {
          ...latestStateRef.current.syncInfo!,
          isOnline: true,
          status: 'synced' as const,
          lastSyncedAt: Date.now(),
          pendingChangesCount: 0,
          lastSyncMessage: 'Atualizado em tempo real a partir de outro dispositivo ☁️'
        }
      };
      latestStateRef.current = merged;
      setState(merged);
      saveAppState(merged);
      markCloudSaved(merged.lastLocalMutationAt || 0);
      setTimeout(() => {
        isRemoteSyncRef.current = false;
      }, 500);
    };

    const unsubscribe = subscribeToClubCloud(
      workspaceId,
      (onSnap, onErr) => subscribeToLegacyClubDocument(workspaceId, onSnap, onErr),
      {
        getLocal: () => latestStateRef.current,
        applyRemote,
        requestPush: () => {
          if (!getFirestoreQuotaState().isExhausted) pushStateToCloud(latestStateRef.current);
        },
        onInSync: () => markCloudSaved(latestStateRef.current.lastLocalMutationAt || 0),
        requestMigration: () => {
          // Give the legacy snapshot time to be applied, then move the club to per-record storage once.
          setTimeout(async () => {
            const current = latestStateRef.current;
            if (!current.currentUser?.id || getCloudMode(workspaceId) !== 'legacy') {
              console.warn(
                `Migração para registos separados não iniciada: utilizador=${current.currentUser?.id ? 'ok' : 'em falta'}, modo=${getCloudMode(workspaceId)}`
              );
              return;
            }
            const res = await migrateClubToRecords(workspaceId, current, current.currentUser.id);
            if (res.success) {
              console.info('Base de dados do clube migrada para registos separados.', res.message);
            } else {
              console.warn('Migração para registos separados adiada:', res.message);
            }
          }, 3000);
        },
        onError: (error) => console.warn('Aviso na sincronização em tempo real:', error.message)
      }
    );

    return () => {
      unsubscribe();
    };
    // Resubscribe only when the signed-in user/club changes, not on every currentUser object update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id, state.currentUser?.clubId, authUid]);

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
        await pushStateToCloud(state);
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
    // Handlers are rebuilt with the latest state on every change; the helper functions are not memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Screens about one scheduled game open the game that was tapped (or, without one, the next game).
    if (tab === 'prejogo' || tab === 'convocatoria') {
      setTargetOpponentId(targetId);
    }
    // "Treino de hoje" shortcut: Treinos opens with today's attendance.
    setOpenTodayTraining(tab === 'treinos' && targetId === 'hoje');
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
    await clearDeviceClubData();
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
    <CloudSyncContext.Provider value={cloudSync}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 font-sans pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] overflow-x-hidden">
        {/* Top Banner for PWA Install Prompt */}
        <InstallPwaBanner />

        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-2.5 sm:px-6 pt-2 sm:pt-6 overflow-x-hidden">
          {cloudSessionLost && state.currentUser && (
            <SessionExpiredBanner user={state.currentUser} onRestored={() => setCloudSaveError(undefined)} />
          )}
          {getActiveCategory(currentTab) === 'performance' && (
            <PerformanceSubNav currentTab={currentTab} onNavigate={handleNavigate} />
          )}
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
                        (sTeamName &&
                          targetClubLower &&
                          (sTeamName === targetClubLower ||
                            targetClubLower.includes(sTeamName) ||
                            sTeamName.includes(targetClubLower))) ||
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
                        (mTeamName &&
                          targetClubLower &&
                          (mTeamName === targetClubLower ||
                            targetClubLower.includes(mTeamName) ||
                            mTeamName.includes(targetClubLower))) ||
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
                      roster: target.roster && target.roster.length > 0 ? target.roster : state.roster || [],
                      staffMembers: target.staffMembers || [],
                      matches: resolvedTargetMatches.length > 0 ? resolvedTargetMatches : state.matches || [],
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
                onOpenSync={() => showSyncStatus()}
                onOpenAdminUsers={() => setShowAdminUsers(true)}
                pendingUsersCount={pendingUsersCount}
                onLogout={handleLogout}
                onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
                onShowToast={showToast}
              />
            )}

            {currentTab === 'home' && isAppAdmin(state.currentUser) && (
              <BackupReminder state={state} onShowToast={showToast} />
            )}
            {currentTab === 'home' && (
              <HomeView
                state={state}
                onUpdateState={updateState}
                onNavigate={handleNavigate}
                onOpenSettings={() => setShowSettings(true)}
                onOpenDatabase={() => setShowDatabase(true)}
                onOpenNotifications={() => setShowNotifications(true)}
                onOpenSync={() => showSyncStatus()}
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
                onOpenSync={() => showSyncStatus()}
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
                onOpenSync={() => showSyncStatus()}
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
                onOpenSync={() => showSyncStatus()}
                onShowToast={showToast}
                initialMatchId={targetOpponentId}
              />
            )}

            {currentTab === 'prejogo' && (
              <PreMatchView
                state={state}
                onUpdateState={updateState}
                onNavigate={handleNavigate}
                onOpenSettings={() => setShowSettings(true)}
                onOpenNotifications={() => setShowNotifications(true)}
                onOpenSync={() => showSyncStatus()}
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
                onOpenSync={() => showSyncStatus()}
                onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
                onShowToast={showToast}
                initialTab="list"
                openToday={openTodayTraining}
              />
            )}

            {currentTab === 'jogos' && (
              <ResultsView
                state={state}
                onUpdateState={updateState}
                onNavigate={handleNavigate}
                onOpenSettings={() => setShowSettings(true)}
                onOpenNotifications={() => setShowNotifications(true)}
                onOpenSync={() => showSyncStatus()}
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
                onOpenSync={() => showSyncStatus()}
                onShowToast={showToast}
                onUpdateState={updateState}
              />
            )}

            {currentTab === 'analise_jogos' && (
              <GameAnalysisDashboard
                state={state}
                onNavigate={handleNavigate}
                onOpenSettings={() => setShowSettings(true)}
                onOpenNotifications={() => setShowNotifications(true)}
                onOpenSync={() => showSyncStatus()}
                onShowToast={showToast}
              />
            )}

            {currentTab === 'plantel' && (
              <SquadView
                key={currentTab}
                state={state}
                onUpdateState={updateState}
                onNavigate={handleNavigate}
                onOpenSettings={() => setShowSettings(true)}
                onOpenNotifications={() => setShowNotifications(true)}
                onOpenSync={() => showSyncStatus()}
                onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
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
          onOpenAdminUsers={() => setShowAdminUsers(true)}
          onOpenInviteStaff={() => setShowInviteStaff(true)}
          onOpenSeasons={() => setShowSeasonSelector(true)}
          pendingUsersCount={pendingUsersCount}
          onLogout={handleLogout}
        />

        {/* Modals */}
        {/* Database Modal */}
        {showDatabase && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <DatabaseModal
              state={state}
              onUpdateState={updateState}
              onClose={() => setShowDatabase(false)}
              onShowToast={showToast}
              onShowConfirm={(msg, cb) => setConfirmModalConfig({ message: msg, onConfirm: cb })}
            />
          </Suspense>
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
    </CloudSyncContext.Provider>
  );
}
