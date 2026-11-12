import React, { useState } from 'react';
import { AppState } from '../types';
import { isAppAdmin } from '../services/cloudAuthService';
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
  /** 🔔 Avisos no telemóvel. */
  onOpenPushSettings?: () => void;
  /** 🧠 Quadro tático. */
  onOpenTacticsBoard?: () => void;
  /** 🔭 Adversários. */
  onOpenOpponents?: () => void;
  /** 📣 Comunicação. */
  onOpenCommunication?: () => void;
  /** 🤖 Assistente. */
  onOpenAssistant?: () => void;
  /** 📸 Antes e depois da época. */
  onOpenSeasonGrowth?: () => void;
  onOpenSignature?: () => void;
  onOpenTour?: () => void;
  /** 🎨 Aparência: tema, idioma e modo compacto. */
  onOpenAppearance?: () => void;
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
  onOpenPushSettings,
  onOpenTacticsBoard,
  onOpenOpponents,
  onOpenCommunication,
  onOpenAssistant,
  onOpenSeasonGrowth,
  onOpenSignature,
  onOpenTour,
  onOpenAppearance,
  pendingUsersCount = 0,
  onLogout
}) => {
  // A row with more than one thing inside (Épocas, Equipa técnica, Ajuda) opens its own short list here
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  if (!isOpen) return null;

  const isAdmin = isAppAdmin(state.currentUser);

  const close = () => {
    setOpenGroup(null);
    onClose();
  };
  const handleAction = (cb: () => void) => {
    close();
    cb();
  };

  type Item = {
    id?: string;
    icon: IconName;
    title: string;
    detail: string;
    badge?: string;
    run?: () => void;
    /** Opens a short list instead of a screen. */
    children?: Item[];
    /** A link to a file instead of a button (the app's logo). */
    download?: { href: string; file: string };
  };
  const when = (cond: unknown, item: Item): Item[] => (cond ? [item] : []);
  const career = careerOf(state);
  const careerWarnings = careerStatus(career, new Date().toISOString().slice(0, 10)).warnings;
  const pending = isAdmin && pendingUsersCount > 0 ? `${pendingUsersCount} pendente` : undefined;

  const seasons: Item[] = [
    ...when(onOpenSeasons, {
      icon: 'calendar',
      title: 'Épocas',
      detail: `${state.season || defaultSeason()} · ver épocas anteriores`,
      run: onOpenSeasons
    }),
    ...when(onOpenSeasonGrowth, {
      icon: 'trophy',
      title: 'Antes e depois da época',
      detail: 'Fotos da equipa e números da época numa imagem',
      run: onOpenSeasonGrowth
    })
  ];
  const staff: Item[] = [
    ...when(onOpenInviteStaff, {
      icon: 'plus',
      title: 'Convidar treinador',
      detail: 'Código ou link para a equipa técnica',
      run: onOpenInviteStaff
    }),
    ...when(isAdmin && onOpenAdminUsers, {
      icon: 'users',
      title: 'Utilizadores e acessos',
      detail: 'Aprovar treinadores e permissões',
      badge: pending,
      run: onOpenAdminUsers
    })
  ];
  const help: Item[] = [
    ...when(onOpenTour, {
      icon: 'zap',
      title: 'Visita guiada',
      detail: 'Onde está cada coisa, em 1 minuto',
      run: onOpenTour
    }),
    {
      icon: 'clipboard',
      title: 'Logótipo da app (SVG)',
      detail: 'Para equipamentos, cartazes e documentos',
      download: { href: '/bolacomvisao-logo.svg', file: 'bolacomvisao-logo.svg' }
    },
    {
      icon: 'clipboard',
      title: 'Logótipo da app (SVG alta qualidade)',
      detail: 'O mesmo, com mais pormenor',
      download: { href: '/bolacomvisao-logo-hd.svg', file: 'bolacomvisao-logo-hd.svg' }
    },
    {
      icon: 'clipboard',
      title: 'Logótipo da app (PNG)',
      detail: 'Imagem de 1024 × 1024',
      download: { href: '/bolacomvisao-logo.png', file: 'bolacomvisao-logo.png' }
    }
  ];

  /** One row, or the only thing inside it when a group has just one (no list with a single line). */
  const group = (item: Item): Item[] =>
    !item.children || item.children.length === 0
      ? item.run
        ? [item]
        : []
      : item.children.length === 1
        ? item.children
        : [item];

  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Equipa',
      items: [
        ...when(onOpenAssistant, {
          icon: 'zap',
          title: 'Assistente',
          detail: 'Perguntas sobre a equipa e as ferramentas com IA',
          run: onOpenAssistant
        }),
        ...when(onOpenCommunication, {
          icon: 'bell',
          title: 'Comunicação com os pais',
          detail: 'Avisos, calendário e link do jogo em direto',
          run: onOpenCommunication
        }),
        ...when(onOpenOpponents, {
          icon: 'search',
          title: 'Adversários',
          detail: 'Resultados, relatórios e a ficha de cada adversário',
          run: onOpenOpponents
        }),
        ...when(onOpenTacticsBoard, {
          icon: 'whistle',
          title: 'Quadro tático',
          detail: 'Sistema, posições, setas e estratégias guardadas',
          run: onOpenTacticsBoard
        }),
        ...when(onOpenMonthlyReport, {
          icon: 'clipboard',
          title: 'Relatório mensal',
          detail: 'PDF para o coordenador',
          run: onOpenMonthlyReport
        })
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
        ...group({
          icon: 'calendar',
          title: 'Épocas',
          detail: `${state.season || defaultSeason()} · anteriores · antes e depois`,
          children: seasons
        }),
        ...group({
          icon: 'users',
          title: 'Equipa técnica',
          detail: isAdmin ? 'Convidar treinador · utilizadores e acessos' : 'Convidar treinador',
          badge: pending,
          children: staff
        }),
        {
          icon: 'settings',
          title: 'Definições do clube',
          detail: 'Nome, emblema, cor, jogos e treinos',
          run: onOpenSettings
        }
      ]
    },
    {
      title: 'A minha conta',
      items: [
        ...when(onOpenCareer, {
          icon: 'trophy',
          title: 'A minha carreira',
          detail: careerWarnings[0] || (career.title ? `${career.title}` : 'Título de treinador e formações'),
          badge: careerWarnings.length ? 'Atenção' : undefined,
          run: onOpenCareer
        }),
        ...when(onOpenSignature, {
          icon: 'clipboard',
          title: 'Assinatura',
          detail: 'A tua assinatura nos PDFs',
          run: onOpenSignature
        }),
        ...when(onOpenPushSettings, {
          icon: 'bell',
          title: 'Avisos no telemóvel',
          detail: 'Jogos ao vivo e lembretes da agenda, mesmo com a app fechada',
          run: onOpenPushSettings
        }),
        ...when(onOpenAppearance, {
          icon: 'sun',
          title: 'Aparência',
          detail: 'Tema, modo sol, idioma e modo compacto',
          run: onOpenAppearance
        }),
        { icon: 'database', title: 'Cópias de segurança', detail: 'Guardar e repor os dados', run: onOpenDatabase },
        { icon: 'search', title: 'Ajuda', detail: 'Visita guiada · logótipo da app', children: help }
      ]
    }
  ];

  const opened = openGroup
    ? groups.flatMap((g) => g.items).find((i) => i.title === openGroup && i.children)
    : undefined;

  const row = (item: Item) => {
    const inner = (
      <>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-sm bg-ui-brand-soft text-ui-brand">
          <Icon name={item.icon} className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-ui-body font-bold text-ui-text">
            {item.title}
            {item.badge && <span className="ui-badge ui-badge-warning">{item.badge}</span>}
          </span>
          <span className="block truncate text-ui-caption text-ui-muted">{item.detail}</span>
        </span>
        <span aria-hidden className="text-ui-muted">
          {item.download ? '↓' : '›'}
        </span>
      </>
    );
    const cls = 'flex w-full items-center gap-3 rounded-ui-sm px-1 py-2.5 text-left hover:bg-ui-surface-2';
    if (item.download) {
      return (
        <a key={item.title} href={item.download.href} download={item.download.file} className={cls}>
          {inner}
        </a>
      );
    }
    return (
      <button
        key={item.title}
        id={item.id}
        type="button"
        onClick={() => (item.children ? setOpenGroup(item.title) : item.run && handleAction(item.run))}
        className={cls}
      >
        {inner}
      </button>
    );
  };

  return (
    <div
      className="ui-overlay fixed inset-0 z-50 flex items-end justify-center p-0 animate-fadeIn sm:items-center sm:p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={opened ? opened.title : 'Mais'}
        className="ui-card flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-b-none px-5 pb-5 pt-4 text-left animate-slideUp sm:max-w-md sm:rounded-ui-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-2">
          {opened ? (
            <button
              type="button"
              onClick={() => setOpenGroup(null)}
              className="flex items-center gap-2 text-left"
              aria-label="Voltar ao menu Mais"
            >
              <span aria-hidden className="text-ui-lead text-ui-muted">
                ‹
              </span>
              <span>
                <span className="block text-ui-lead font-extrabold text-ui-text">{opened.title}</span>
                <span className="block text-ui-caption text-ui-muted">Mais</span>
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <img
                src={logoImg}
                alt="BolaComVisão"
                className="h-9 w-9 rounded-ui-sm border border-ui-line object-cover"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-ui-lead font-extrabold text-ui-text">Mais</h3>
                <p className="text-ui-caption text-ui-muted">
                  {state.myClubName || 'BolaComVisão'} · {state.category || 'Sub-19'}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="ui-btn ui-btn-secondary flex h-9 w-9 items-center justify-center"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {opened ? (
          <div className="divide-y divide-ui-line pt-2">{opened.children!.map(row)}</div>
        ) : (
          groups.map(
            (g) =>
              g.items.length > 0 && (
                <section key={g.title} aria-label={g.title} className="pt-3">
                  <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ui-muted">{g.title}</h4>
                  <div className="divide-y divide-ui-line">{g.items.map(row)}</div>
                </section>
              )
          )
        )}

        {onLogout && !opened && (
          <div className="mt-4 flex items-center justify-between border-t border-ui-line pt-3">
            <div className="text-[11px] text-ui-muted">{state.currentUser?.username}</div>
            <button
              type="button"
              onClick={() => handleAction(onLogout)}
              className="ui-btn ui-btn-soft-danger px-3 py-1.5 text-ui-caption"
            >
              Terminar sessão
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
