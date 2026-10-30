import React from 'react';
import { AppState, UserAccount } from '../../types';
import { Button } from '../ui/Button';
import { isAppAdmin } from '../../services/cloudAuthService';
import { defaultSeason } from '../../lib/utils';
import { SyncStatusBadge } from '../ui/SyncStatusBadge';
import { Icon } from '../ui/Icon';
import { SunModeButton } from '../ui/SunModeButton';

interface DashboardHeaderProps {
  state: AppState;
  onOpenSettings: () => void;
  onOpenDatabase: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onOpenAdminUsers?: () => void;
  pendingUsersCount?: number;
  latestPendingUser?: UserAccount | null;
  onExportBackup: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  state,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onOpenAdminUsers,
  pendingUsersCount = 0,
  latestPendingUser
}) => {
  const isAdmin = isAppAdmin(state.currentUser);
  const unreadNotifs = (state.notifications || []).filter((n) => !n.read).length;
  const syncInfo = state.syncInfo;

  return (
    <div className="flex flex-col gap-3">
      {/* Club, team and season, with the few tools always at hand */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {state.clubLogoUrl ? (
            <img
              src={state.clubLogoUrl}
              alt="Emblema do Clube"
              className="w-12 h-12 shrink-0 rounded-2xl object-cover border-2 border-cyan-500/50 bg-slate-950 p-0.5"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="ui-inset w-12 h-12 shrink-0 rounded-2xl border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Icon name="ball" className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white truncate leading-tight">
              {state.myClubName || 'BolaComVisão Clube'}
            </h1>
            <div className="text-xs text-slate-400 truncate">
              {state.category || 'Sub-19'} · Época {state.season || defaultSeason()} ·{' '}
              <span className="text-slate-300">{state.currentUser?.name || 'Mister'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <SyncStatusBadge onClick={onOpenSync} fallbackSyncInfo={syncInfo} />
          {isAdmin && onOpenAdminUsers && (
            <button
              id="dashboard-admin-users-btn"
              onClick={onOpenAdminUsers}
              className="ui-btn ui-btn-secondary relative w-10 h-10 flex items-center justify-center"
              title="Gestão de Utilizadores e Treinadores"
              aria-label="Gestão de utilizadores"
            >
              <Icon name="users" className="w-[18px] h-[18px]" />
              {pendingUsersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black flex items-center justify-center">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          )}
          <SunModeButton className="w-10 h-10" />
          {onOpenNotifications && (
            <button
              id="dashboard-notifications-btn"
              onClick={onOpenNotifications}
              className="ui-btn ui-btn-secondary relative w-10 h-10 flex items-center justify-center"
              title="Notificações do Sistema"
              aria-label="Notificações"
            >
              <Icon name="bell" className="w-[18px] h-[18px]" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </button>
          )}
          <button
            id="dashboard-settings-btn"
            onClick={onOpenSettings}
            className="ui-btn ui-btn-secondary w-10 h-10 flex items-center justify-center"
            title="Definições da Aplicação"
            aria-label="Definições"
          >
            <Icon name="settings" className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Admin Pending Registrations Alert Ribbon */}
      {isAdmin && pendingUsersCount > 0 && onOpenAdminUsers && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg shrink-0">
              ⏳
            </div>
            <div>
              <div className="text-sm font-bold text-amber-200">
                {pendingUsersCount === 1
                  ? '1 Novo Pedido de Acesso Pendente'
                  : `${pendingUsersCount} Novos Pedidos de Acesso Pendentes`}
              </div>
              <div className="text-xs text-amber-300/80 font-mono mt-0.5">
                {latestPendingUser
                  ? `${latestPendingUser.name} (${latestPendingUser.role}) aguarda validação`
                  : 'Treinadores aguardam aprovação para aceder à plataforma'}
              </div>
            </div>
          </div>

          <Button
            variant="cyan"
            size="sm"
            onClick={onOpenAdminUsers}
            className="self-stretch sm:self-auto font-mono text-xs font-bold"
          >
            Analisar e Aprovar →
          </Button>
        </div>
      )}
    </div>
  );
};
