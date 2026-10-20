import React from 'react';
import { AppState, UserAccount } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { isAppAdmin } from '../../services/cloudAuthService';
import { defaultSeason } from '../../lib/utils';

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
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const syncInfo = state.syncInfo;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Club Brand Info */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="relative group">
            {state.clubLogoUrl ? (
              <img
                src={state.clubLogoUrl}
                alt="Emblema do Clube"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-lg shadow-cyan-500/10 bg-slate-950 p-1"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950 border-2 border-cyan-500/40 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/10">
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
          <button
            id="dashboard-sync-status-btn"
            onClick={onOpenSync}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-sm ${
              syncInfo?.status === 'syncing'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 animate-pulse'
                : syncInfo?.status === 'synced'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : !isOnline
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Estado da Sincronização na Nuvem"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncInfo?.status === 'synced' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden xs:inline">
              {syncInfo?.status === 'synced'
                ? 'Nuvem OK'
                : syncInfo?.status === 'syncing'
                  ? 'A Sincronizar...'
                  : 'Offline'}
            </span>
          </button>

          {/* Notifications Button */}
          {onOpenNotifications && (
            <button
              id="dashboard-notifications-btn"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-colors"
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
              className="relative p-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 transition-colors flex items-center gap-1.5 px-3"
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
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Exportar Backup JSON Completo"
          >
            <span className="text-base">💾</span>
          </button>

          {/* Settings */}
          <button
            id="dashboard-settings-btn"
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
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
