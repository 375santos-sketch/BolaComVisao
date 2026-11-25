import React, { useContext } from 'react';
import { HeaderBelowContext } from './headerBelow';
import { Language, UserAccount, SyncState } from '../types';
import { isAppAdmin } from '../services/cloudAuthService';
import { TabType } from './Navbar';
import { getActiveCategory } from './navCategory';
import { SyncStatusBadge } from './ui/SyncStatusBadge';
import { Icon } from './ui/Icon';
import { SunModeButton } from './ui/SunModeButton';

interface HeaderProps {
  title: string;
  subtitle?: string;
  lang?: Language;
  currentTab?: TabType;
  onNavigate?: (tab: TabType) => void;
  onGoHome?: () => void;
  onOpenSettings: () => void;
  onOpenDatabase?: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onOpenAdminUsers?: () => void;
  pendingUsersCount?: number;
  unreadNotificationsCount?: number;
  syncInfo?: SyncState;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  clubInfo?: { clubName: string; category?: string; season?: string; logoUrl?: string };
  hasActiveMatch?: boolean;
}

const clubInitials = (name?: string) =>
  (name || 'Clube')
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'C';

export const Header: React.FC<HeaderProps> = ({
  title,
  currentTab = 'home',
  onNavigate,
  onGoHome,
  onOpenSettings,
  onOpenDatabase,
  onOpenNotifications,
  onOpenSync,
  onOpenAdminUsers,
  pendingUsersCount = 0,
  unreadNotificationsCount = 0,
  syncInfo,
  currentUser,
  clubInfo,
  hasActiveMatch
}) => {
  const isAdmin = isAppAdmin(currentUser);
  const activeCategory = getActiveCategory(currentTab);

  const handleNav = (tab: TabType) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (onGoHome && tab === 'home') {
      onGoHome();
    }
  };

  const below = useContext(HeaderBelowContext);
  return (
    <>
      <header className="w-full mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-ui-line select-none">
        <div className="flex items-center justify-between gap-3">
          {/* Club Brand & Current Page Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => (onGoHome ? onGoHome() : handleNav('home'))}
              className="relative group shrink-0 flex items-center gap-2 focus:outline-none transition-transform active:scale-95 cursor-pointer"
              title="Ir para o Início"
              aria-label="Início BolaComVisão"
            >
              {/* The club's crest at the top of every page (its initials until the club has one) */}
              {clubInfo?.logoUrl ? (
                <img
                  src={clubInfo.logoUrl}
                  alt="Emblema do clube"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-ui-inset p-0.5 border-2 border-ui-line-strong"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  aria-label="Emblema do clube"
                  className="grid w-8 h-8 sm:w-9 sm:h-9 place-items-center rounded-xl border-2 border-ui-line-strong bg-ui-inset text-[11px] font-black text-ui-text"
                >
                  {clubInitials(clubInfo?.clubName)}
                </span>
              )}
              {hasActiveMatch && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping border border-slate-950" />
              )}
            </button>

            <div className="min-w-0 text-left">
              <h1 className="text-base sm:text-lg font-bold text-white truncate leading-tight">{title}</h1>
              {clubInfo && clubInfo.clubName && (
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {clubInfo.clubName} {clubInfo.category ? `· ${clubInfo.category}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Desktop / Tablet Navigation Work Areas Links */}
          {onNavigate && (
            <nav className="hidden md:flex lg:hidden items-center gap-1 bg-ui-surface border border-ui-line p-1 rounded-xl text-xs font-semibold shadow-[var(--shadow-ui-1)]">
              <button
                type="button"
                onClick={() => handleNav('home')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeCategory === 'home'
                    ? 'bg-ui-brand text-ui-brand-ink font-extrabold shadow-sm'
                    : 'text-ui-muted hover:text-ui-text hover:bg-ui-surface-2'
                }`}
              >
                Início
              </button>
              <button
                type="button"
                onClick={() => handleNav('plantel')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeCategory === 'equipa'
                    ? 'bg-ui-brand text-ui-brand-ink font-extrabold shadow-sm'
                    : 'text-ui-muted hover:text-ui-text hover:bg-ui-surface-2'
                }`}
              >
                Equipa
              </button>
              <button
                type="button"
                onClick={() => handleNav('calendario')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeCategory === 'planeamento'
                    ? 'bg-ui-brand text-ui-brand-ink font-extrabold shadow-sm'
                    : 'text-ui-muted hover:text-ui-text hover:bg-ui-surface-2'
                }`}
              >
                Agenda
              </button>
              <button
                type="button"
                onClick={() => handleNav(hasActiveMatch ? 'jogo' : 'prejogo')}
                className={`relative px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeCategory === 'performance'
                    ? 'bg-ui-brand text-ui-brand-ink font-extrabold shadow-sm'
                    : 'text-ui-muted hover:text-ui-text hover:bg-ui-surface-2'
                }`}
              >
                <span>Jogo</span>
                {hasActiveMatch && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 animate-ping" />
                )}
              </button>
            </nav>
          )}

          {/* Right Status Actions & Utilities */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sync status button: shows whether every change is confirmed in the cloud */}
            {onOpenSync && <SyncStatusBadge onClick={onOpenSync} fallbackSyncInfo={syncInfo} />}

            {/* Admin Pending Coach Requests */}
            {isAdmin && onOpenAdminUsers && (
              <button
                type="button"
                onClick={onOpenAdminUsers}
                className={`relative p-1.5 w-9 h-9 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer touch-manipulation ${
                  pendingUsersCount > 0
                    ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Gestão de Acessos & Treinadores"
                aria-label="Gestão de Acessos"
              >
                <Icon name="users" className="w-4 h-4" />
                {pendingUsersCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 bg-amber-500 text-slate-950 font-mono text-[8px] font-black rounded-full flex items-center justify-center">
                    {pendingUsersCount}
                  </span>
                )}
              </button>
            )}

            <SunModeButton className="p-1.5 w-9 h-9 sm:w-8 sm:h-8" />

            {/* Notifications Bell */}
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="ui-btn ui-btn-secondary relative p-1.5 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center touch-manipulation"
                title="Notificações & Alertas"
                aria-label="Notificações"
              >
                <Icon name="bell" className="w-[18px] h-[18px]" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 bg-rose-500 text-white font-mono text-[8px] font-black rounded-full flex items-center justify-center shadow-sm">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Database / Backup */}
            {onOpenDatabase && (
              <button
                type="button"
                onClick={onOpenDatabase}
                className="ui-btn ui-btn-secondary hidden sm:flex p-1.5 w-8 h-8 items-center justify-center"
                title="Base de Dados & Backup"
                aria-label="Base de Dados"
              >
                <Icon name="database" className="w-4 h-4" />
              </button>
            )}

            {/* Settings */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="ui-btn ui-btn-secondary p-1.5 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center touch-manipulation"
              title="Definições"
              aria-label="Definições"
            >
              <Icon name="settings" className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>
      {below}
    </>
  );
};
