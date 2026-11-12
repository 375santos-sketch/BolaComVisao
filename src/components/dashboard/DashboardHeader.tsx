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

/** "Bom dia" until noon, "Boa tarde" until 8 pm, then "Boa noite". */
const greeting = (h = new Date().getHours()) => (h < 12 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite');

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
      {/* Welcome: the night stadium, the brand, "Bem-vindo, Mister!" and the team's crest */}
      <section aria-label="Boas-vindas" className="dash-hero">
        <span aria-hidden className="bcv-beam bcv-beam-right" />
        <span aria-hidden className="dash-hero-pitch" />
        <div className="dash-crest" aria-hidden>
          {state.clubLogoUrl ? (
            <img
              src={state.clubLogoUrl}
              alt=""
              className="h-full w-full object-contain p-2"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span>
              {(state.myClubName || 'BCV')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase()}
            </span>
          )}
        </div>
        <div className="relative z-[2] flex items-center gap-2.5">
          {state.clubLogoUrl ? (
            <img
              src={state.clubLogoUrl}
              alt="Emblema do Clube"
              className="h-10 w-10 shrink-0 rounded-ui-sm object-cover border border-ui-line-strong bg-ui-inset p-0.5 lg:hidden"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-black tracking-tight text-ui-text sm:text-[20px]">
              BolaCom<span className="text-ui-brand">Visão</span>
            </div>
            <div className="truncate text-ui-caption text-ui-muted">
              {state.myClubName || 'BolaComVisão Clube'} · {state.category || 'Sub-19'} · Época{' '}
              {state.season || defaultSeason()} ·{' '}
              <span className="text-ui-text">{state.currentUser?.name || 'Mister'}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SyncStatusBadge onClick={onOpenSync} fallbackSyncInfo={syncInfo} />
            {isAdmin && onOpenAdminUsers && (
              <button
                id="dashboard-admin-users-btn"
                onClick={onOpenAdminUsers}
                className="bcv-round relative"
                title="Gestão de Utilizadores e Treinadores"
                aria-label="Gestão de utilizadores"
              >
                <Icon name="users" className="h-[18px] w-[18px]" />
                {pendingUsersCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ui-warning px-1 text-[10px] font-black text-ui-brand-ink">
                    {pendingUsersCount}
                  </span>
                )}
              </button>
            )}
            <SunModeButton className="bcv-round !p-0" />
            {onOpenNotifications && (
              <button
                id="dashboard-notifications-btn"
                onClick={onOpenNotifications}
                className="bcv-round relative"
                title="Notificações do Sistema"
                aria-label="Notificações"
              >
                <Icon name="bell" className="h-[18px] w-[18px]" />
                {unreadNotifs > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ui-danger px-1 text-[10px] font-bold text-ui-text">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
            )}
            <button
              id="dashboard-settings-btn"
              onClick={onOpenSettings}
              className="bcv-round"
              title="Definições da Aplicação"
              aria-label="Definições"
            >
              <Icon name="settings" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        <div className="relative z-[2] mt-6 max-w-[70%] sm:mt-10">
          <p className="text-ui-caption font-bold uppercase tracking-[0.12em] text-ui-brand">
            {greeting()}, {(state.currentUser?.name || 'Mister').split(' ')[0]}
          </p>
          <h1 className="bcv-title mt-1 text-[32px] sm:text-[44px]">Bem-vindo, Mister!</h1>
          <p className="mt-1.5 text-ui-body text-ui-text/85">Vamos continuar a construir a evolução da nossa equipa.</p>
        </div>
      </section>

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
