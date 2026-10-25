import React from 'react';
import { Language, UserAccount, SyncState } from '../types';
import logoImg from '../assets/images/bolacomvisao_logo_1786622535530.jpg';
import { isAppAdmin } from '../services/cloudAuthService';
import { TabType } from './Navbar';
import { getActiveCategory } from './navCategory';
import { SyncStatusBadge } from './ui/SyncStatusBadge';

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
  clubInfo?: { clubName: string; category?: string; season?: string };
  hasActiveMatch?: boolean;
}

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

  return (
    <header className="w-full mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-slate-800/80 select-none">
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
            <img
              src={logoImg}
              alt="BolaComVisão Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border-2 border-cyan-400/80"
              referrerPolicy="no-referrer"
            />
            {hasActiveMatch && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping border border-slate-950" />
            )}
          </button>

          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-['Chakra_Petch'] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-1 py-0.5 rounded leading-none shrink-0">
                BCV
              </span>
              <h1 className="text-xs sm:text-sm md:text-base font-black font-['Chakra_Petch'] uppercase tracking-wider text-white truncate leading-tight">
                {title}
              </h1>
            </div>
            {clubInfo && clubInfo.clubName && (
              <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                {clubInfo.clubName} {clubInfo.category ? `· ${clubInfo.category}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Desktop / Tablet Navigation Work Areas Links */}
        {onNavigate && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl font-['Chakra_Petch'] text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeCategory === 'home'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => handleNav('plantel')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeCategory === 'equipa'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Equipa
            </button>
            <button
              type="button"
              onClick={() => handleNav('calendario')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeCategory === 'planeamento'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Planeamento
            </button>
            <button
              type="button"
              onClick={() => handleNav(hasActiveMatch ? 'jogo' : 'prejogo')}
              className={`relative px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeCategory === 'performance'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Performance</span>
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
              <span className="text-xs">👥</span>
              {pendingUsersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 bg-amber-500 text-slate-950 font-mono text-[8px] font-black rounded-full flex items-center justify-center">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          )}

          {/* Notifications Bell */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="ui-btn ui-btn-secondary relative p-1.5 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center touch-manipulation"
              title="Notificações & Alertas"
              aria-label="Notificações"
            >
              <span className="text-xs">🔔</span>
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
              <span className="text-xs">💾</span>
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
            <span className="text-xs">⚙️</span>
          </button>
        </div>
      </div>
    </header>
  );
};
