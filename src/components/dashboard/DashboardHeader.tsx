import React from 'react';
import { AppState, UserAccount } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { isAppAdmin } from '../../services/cloudAuthService';
import { defaultSeason } from '../../lib/utils';
import { SyncStatusBadge } from '../ui/SyncStatusBadge';

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
  latestPendingUser,
  onExportBackup
}) => {
  const isAdmin = isAppAdmin(state.currentUser);
  const unreadNotifs = (state.notifications || []).filter((n) => !n.read).length;
  const syncInfo = state.syncInfo;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Card */}
      <div className="ui-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Club Brand Info */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="relative group">
            {state.clubLogoUrl ? (
              <img
                src={state.clubLogoUrl}
                alt="Emblema do Clube"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-lg bg-slate-950 p-1"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950 border-2 border-cyan-500/40 flex flex-col items-center justify-center shadow-lg">
                <span className="text-xl">⚽</span>
                <span className="text-[9px] font-mono text-cyan-400 font-bold tracking-tighter mt-0.5">BCV</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white uppercase font-sans">
                {state.myClubName || 'BolaComVisão Clube'}
              </h1>
              <Badge variant="cyan" size="sm" className="font-mono uppercase font-bold tracking-wider">
                {state.category || 'Sub-19'}
              </Badge>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono mt-1 flex-wrap">
              <span className="text-slate-300">
                Época: <strong className="text-cyan-300 font-bold">{state.season || defaultSeason()}</strong>
              </span>
              <span>•</span>
              <span className="text-slate-400">
                Treinador: <strong className="text-slate-200">{state.currentUser?.name || 'Mister'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Sync Indicators */}
        <div className="flex items-center gap-2 z-10 self-end sm:self-center flex-wrap">
          {/* Cloud Sync Status Badge */}
          <SyncStatusBadge onClick={onOpenSync} fallbackSyncInfo={syncInfo} />

          {/* Notifications Button */}
          {onOpenNotifications && (
            <button
              id="dashboard-notifications-btn"
              onClick={onOpenNotifications}
              className="ui-btn ui-btn-secondary relative p-2"
              title="Notificações do Sistema"
            >
              <span className="text-base">🔔</span>
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-mono font-bold flex items-center justify-center shadow-lg animate-bounce">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </button>
          )}

          {/* Admin Direct User Management Shortcut */}
          {isAdmin && onOpenAdminUsers && (
            <button
              id="dashboard-admin-users-btn"
              onClick={onOpenAdminUsers}
              className="ui-btn ui-btn-soft relative p-2 flex items-center gap-1.5 px-3"
              title="Gestão de Utilizadores e Treinadores"
            >
              <span className="text-sm">👥</span>
              <span className="text-xs font-mono font-bold hidden sm:inline">Equipa Técnica</span>
              {pendingUsersCount > 0 && (
                <span className="w-5 h-5 bg-amber-500 text-slate-950 rounded-full text-[10px] font-mono font-black flex items-center justify-center animate-pulse shadow-md">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          )}

          {/* Database / Backup */}
          <button
            id="dashboard-backup-btn"
            onClick={onExportBackup}
            className="ui-btn ui-btn-secondary p-2"
            title="Exportar Backup JSON Completo"
          >
            <span className="text-base">💾</span>
          </button>

          {/* Settings */}
          <button
            id="dashboard-settings-btn"
            onClick={onOpenSettings}
            className="ui-btn ui-btn-secondary p-2"
            title="Definições da Aplicação"
          >
            <span className="text-base">⚙️</span>
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
