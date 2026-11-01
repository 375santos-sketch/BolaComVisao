import React from 'react';
import { AppState } from '../types';
import { isAppAdmin } from '../services/cloudAuthService';
import { Button } from './ui/Button';
import { Icon, IconName } from './ui/Icon';
import logoImg from '../assets/images/bolacomvisao_logo_1786622535530.jpg';
import { defaultSeason } from '../lib/utils';
import { careerOf, careerStatus } from '../lib/coachCareer';

interface MoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onNavigate: (tab: any) => void;
  onOpenSettings: () => void;
  onOpenDatabase: () => void;
  onOpenMonthlyReport?: () => void;
  onOpenAdminUsers?: () => void;
  onOpenInviteStaff?: () => void;
  onOpenSeasons?: () => void;
  onOpenCareer?: () => void;
  onOpenSignature?: () => void;
  onOpenTour?: () => void;
  pendingUsersCount?: number;
  onLogout?: () => void;
}

export const MoreDrawer: React.FC<MoreDrawerProps> = ({
  isOpen,
  onClose,
  state,
  onNavigate,
  onOpenSettings,
  onOpenDatabase,
  onOpenMonthlyReport,
  onOpenAdminUsers,
  onOpenInviteStaff,
  onOpenSeasons,
  onOpenCareer,
  onOpenSignature,
  onOpenTour,
  pendingUsersCount = 0,
  onLogout
}) => {
  if (!isOpen) return null;

  const isAdmin = isAppAdmin(state.currentUser);

  const handleAction = (cb: () => void) => {
    onClose();
    cb();
  };

  type Item = { id?: string; icon: IconName; title: string; detail: string; badge?: string; run: () => void };
  const career = careerOf(state);
  const careerWarnings = careerStatus(career, new Date().toISOString().slice(0, 10)).warnings;
  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Equipa',
      items: [
        {
          id: 'more-drawer-analise-jogos-btn',
          icon: 'chart',
          title: 'Análise dos Jogos',
          detail: 'Gráficos, golos por período, PDF e Excel',
          run: () => onNavigate('analise_jogos')
        },
        ...(onOpenMonthlyReport
          ? [
              {
                icon: 'calendar' as IconName,
                title: 'Relatório mensal',
                detail: 'PDF para o coordenador',
                run: onOpenMonthlyReport
              }
            ]
          : [])
      ]
    },
    {
      title: 'Clube',
      items: [
        {
          icon: 'users',
          title: 'Trocar de equipa',
          detail: 'Outros escalões do clube',
          run: () => onNavigate('teams')
        },
        ...(onOpenSeasons
          ? [
              {
                icon: 'calendar' as IconName,
                title: 'Épocas',
                detail: `${state.season || defaultSeason()} · ver épocas anteriores`,
                run: onOpenSeasons
              }
            ]
          : []),
        ...(onOpenInviteStaff
          ? [
              {
                icon: 'users' as IconName,
                title: 'Convidar treinador',
                detail: 'Código ou link para a equipa técnica',
                run: onOpenInviteStaff
              }
            ]
          : []),
        ...(isAdmin && onOpenAdminUsers
          ? [
              {
                icon: 'users' as IconName,
                title: 'Utilizadores e acessos',
                detail: 'Aprovar treinadores e permissões',
                badge: pendingUsersCount > 0 ? `${pendingUsersCount} pendente` : undefined,
                run: onOpenAdminUsers
              }
            ]
          : [])
      ]
    },
    {
      title: 'Definições',
      items: [
        ...(onOpenCareer
          ? [
              {
                icon: 'trophy' as IconName,
                title: 'A minha carreira',
                detail: careerWarnings[0] || (career.title ? `${career.title}` : 'Título de treinador e formações'),
                badge: careerWarnings.length ? 'Atenção' : undefined,
                run: onOpenCareer
              }
            ]
          : []),
        ...(onOpenSignature
          ? [
              {
                icon: 'clipboard' as IconName,
                title: 'Assinatura',
                detail: 'A tua assinatura nos PDFs',
                run: onOpenSignature
              }
            ]
          : []),
        ...(onOpenTour
          ? [
              {
                icon: 'zap' as IconName,
                title: 'Visita guiada',
                detail: 'Onde está cada coisa, em 1 minuto',
                run: onOpenTour
              }
            ]
          : []),
        {
          icon: 'database',
          title: 'Cópias de segurança',
          detail: 'Guardar e repor os dados',
          run: onOpenDatabase
        },
        {
          icon: 'settings',
          title: 'Definições do Clube',
          detail: 'Nome, cores, escalão, duração das partes',
          run: onOpenSettings
        }
      ]
    }
  ];

  return (
    <div
      className="ui-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-slate-950 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl px-5 pt-4 pb-5 text-left flex flex-col max-h-[85vh] overflow-y-auto animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-2.5">
            <img
              src={logoImg}
              alt="BolaComVisão"
              className="w-9 h-9 rounded-xl object-cover border border-cyan-500/40"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="text-base font-bold text-white">Mais</h3>
              <p className="text-xs text-slate-400">
                {state.myClubName || 'BolaComVisão'} · {state.category || 'Sub-19'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="ui-btn ui-btn-secondary w-9 h-9 flex items-center justify-center"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        {groups.map(
          (group) =>
            group.items.length > 0 && (
              <section key={group.title} aria-label={group.title} className="pt-3">
                <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{group.title}</h4>
                <div className="divide-y divide-slate-800/80">
                  {group.items.map((item) => (
                    <button
                      key={item.title}
                      id={item.id}
                      type="button"
                      onClick={() => handleAction(item.run)}
                      className="w-full py-2.5 flex items-center gap-3 text-left hover:bg-slate-900/60 rounded-lg"
                    >
                      <span className="w-9 h-9 shrink-0 rounded-xl bg-slate-800/80 text-cyan-400 flex items-center justify-center">
                        <Icon name={item.icon} className="w-[18px] h-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                          {item.title}
                          {item.badge && (
                            <span className="rounded-md bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-300">
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-slate-400 truncate">{item.detail}</span>
                      </span>
                      <span className="text-slate-500">›</span>
                    </button>
                  ))}
                </div>
              </section>
            )
        )}

        {/* The app's logo files, for whoever designs posters (administrator only) */}
        {isAdmin && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span>Logótipo:</span>
            <a href="/bolacomvisao-logo.svg" download="bolacomvisao-logo.svg" className="text-cyan-400 underline">
              SVG
            </a>
            <a href="/bolacomvisao-logo-hd.svg" download="bolacomvisao-logo-hd.svg" className="text-cyan-400 underline">
              SVG HD
            </a>
            <a href="/bolacomvisao-logo.png" download="bolacomvisao-logo.png" className="text-cyan-400 underline">
              PNG
            </a>
          </div>
        )}

        {/* Footer / Logout */}
        {onLogout && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] font-mono text-slate-400">{state.currentUser?.username}</div>
            <Button variant="danger" size="xs" icon={<span>🚪</span>} onClick={() => handleAction(onLogout)}>
              Terminar Sessão
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
