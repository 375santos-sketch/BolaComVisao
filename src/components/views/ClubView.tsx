import React, { useEffect, useState } from 'react';
import { workspaceIdOf } from '../../lib/deviceCache';
import { AppState } from '../../types';
import { Icon, IconName } from '../ui/Icon';
import { isAppAdmin } from '../../services/cloudAuthService';
import { canEditClubSettings } from '../../lib/orgPermissions';
import { canReviewReports, getUserAccessibleTeams } from '../../lib/permissionsEngine';
import { defaultSeason } from '../../lib/utils';
import { datePT } from '../../lib/planningSummary';
import { SyncStatusBadge } from '../ui/SyncStatusBadge';

interface ClubViewProps {
  state: AppState;
  onNavigate: (tab: any) => void;
  /** The "Mais" menu: the team's tools and «A minha conta» (career, signature, notices, appearance, sign out). */
  onOpenMore: () => void;
  onOpenSettings: () => void;
  onOpenDatabase: () => void;
  onOpenSync: () => void;
  onOpenSeasons: () => void;
  onOpenSeasonGrowth: () => void;
  /** 🎬 Visão de Jogo: the library of sessions. */
  onOpenVisaoDeJogo?: () => void;
  onOpenInviteStaff: () => void;
  onOpenAdminUsers: () => void;
  onOpenTour: () => void;
  /** 🧭 Relatórios do clube (coordinator and Administrador only). */
  onOpenClubReports?: () => void;
  /** F1.1a: platform inventory (read only), for the platform Administrator. */
  onOpenInventory?: () => void;
  /** F1.1b: encrypted copy of the platform (read only), for the platform Administrator. */
  onOpenEncryptedBackup?: () => void;
  /** F1.8: migration of "main" (platform Administrator only; blocked in production until F2). */
  onOpenMainMigration?: () => void;
  /** F1.6: members of the organization in use (only for accounts that belong to one). */
  onOpenOrgMembers?: () => void;
  pendingUsersCount?: number;
}

type Row = { icon: IconName; title: string; detail: string; badge?: string; run: () => void; label?: string };

/**
 * 🛡 Clube: what belongs to the club, quiet and in order (teams, staff and access, seasons, the club's settings,
 * the data and the help). The personal things stay in «Mais → A minha conta».
 */
export const ClubView: React.FC<ClubViewProps> = ({
  state,
  onNavigate,
  onOpenMore,
  onOpenSettings,
  onOpenDatabase,
  onOpenSync,
  onOpenSeasons,
  onOpenSeasonGrowth,
  onOpenVisaoDeJogo,
  onOpenInviteStaff,
  onOpenAdminUsers,
  onOpenTour,
  onOpenClubReports,
  onOpenInventory,
  onOpenEncryptedBackup,
  onOpenMainMigration,
  onOpenOrgMembers,
  pendingUsersCount = 0
}) => {
  const isAdmin = isAppAdmin(state.currentUser);
  // MC2a: the platform Administrator switches «O Meu Percurso» on for this club (test clubs until the AIPD)
  const careerClub = workspaceIdOf(state.currentUser);
  const [careerOn, setCareerOn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    let gone = false;
    import('../../services/guardians')
      .then((m) => m.careerClubs())
      .then(
        (list) => !gone && setCareerOn(list.includes(careerClub)),
        () => !gone && setCareerOn(null)
      );
    return () => {
      gone = true;
    };
  }, [isAdmin, careerClub]);
  // F3.2: the platform Administrator switches the athletes' private copies on for this club (test clubs first)
  const [privateOn, setPrivateOn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    let gone = false;
    import('../../services/clubCloud')
      .then((m) => m.privateDataClubs(true))
      .then(
        (list) => !gone && setPrivateOn(list.includes(careerClub)),
        () => !gone && setPrivateOn(null)
      );
    return () => {
      gone = true;
    };
  }, [isAdmin, careerClub]);
  const togglePrivate = async () => {
    const next = !privateOn;
    if (
      next &&
      !window.confirm(
        'Ligar os dados privados (F3) neste clube? Os telemóveis dos treinadores passam a guardar também uma cópia ' +
          'separada dos contactos, avaliações, notas e objetivos, e o staff deixa de os ver na app. Nada é apagado. ' +
          'Use primeiro em clubes de teste.'
      )
    )
      return;
    try {
      const m = await import('../../services/clubCloud');
      const list = await m.setPrivateDataClub(careerClub, next);
      setPrivateOn(list.includes(careerClub));
    } catch {
      window.alert('Não foi possível mudar (sem ligação?).');
    }
  };
  const toggleCareer = async () => {
    const next = !careerOn;
    if (
      next &&
      !window.confirm(
        'Ligar «O Meu Percurso» neste clube? Os encarregados passam a ter o Modo atleta e podem convidar o atleta (13+). ' +
          'Use só em clubes de teste até a validação jurídica (AIPD) estar concluída.'
      )
    )
      return;
    try {
      const m = await import('../../services/guardians');
      const list = await m.setCareerClub(careerClub, next);
      setCareerOn(list.includes(careerClub));
    } catch {
      window.alert('Não foi possível mudar (sem ligação?).');
    }
  };
  const teams = getUserAccessibleTeams(state.currentUser, state.teams || []);
  const club = state.myClubName || 'O meu clube';
  const season = state.season || defaultSeason();
  const initials =
    club
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'C';
  const lastBackup = state.lastBackupDate ? datePT(new Date(state.lastBackupDate).toISOString()) : '';

  const groups: { title: string; rows: Row[] }[] = [
    ...(onOpenClubReports && canReviewReports(state.currentUser)
      ? [
          {
            title: 'Coordenação',
            rows: [
              {
                icon: 'clipboard' as IconName,
                title: 'Relatórios do clube',
                detail: 'Relatórios mensais de todas as equipas · rever, devolver, pedir',
                run: onOpenClubReports
              }
            ]
          }
        ]
      : []),
    {
      title: 'Clube',
      rows: [
        ...(state.currentUser?.orgId && onOpenOrgMembers
          ? [
              {
                icon: 'users' as IconName,
                title: 'Membros do clube',
                detail: 'Quem tem acesso, papéis e equipas de cada um',
                run: onOpenOrgMembers
              }
            ]
          : []),
        {
          icon: 'users',
          title: 'Equipas e escalões',
          detail: `${teams.length} ${teams.length === 1 ? 'equipa' : 'equipas'} · trocar de equipa`,
          run: () => onNavigate('teams')
        },
        isAdmin
          ? {
              icon: 'users',
              title: 'Equipa técnica e acessos',
              detail: 'Aprovar treinadores, funções e equipas de cada um',
              badge:
                pendingUsersCount > 0
                  ? `${pendingUsersCount} ${pendingUsersCount === 1 ? 'pedido' : 'pedidos'}`
                  : undefined,
              run: onOpenAdminUsers
            }
          : {
              icon: 'plus',
              title: 'Convidar treinador',
              detail: 'Código ou link para a equipa técnica',
              run: onOpenInviteStaff
            },
        { icon: 'calendar', title: 'Épocas', detail: `${season} · épocas anteriores`, run: onOpenSeasons },
        {
          icon: 'trophy',
          title: 'Antes e depois da época',
          detail: 'Fotos da equipa e números da época numa imagem',
          run: onOpenSeasonGrowth
        },
        ...(onOpenVisaoDeJogo
          ? [
              {
                icon: 'ball' as IconName,
                title: 'Visão de Jogo',
                detail: 'Sessões com vídeo para ver e discutir com a equipa',
                run: onOpenVisaoDeJogo
              }
            ]
          : []),
        // F2.5: the club's settings only for who manages the club (the rules refuse the others)
        ...(canEditClubSettings(state.currentUser)
          ? [
              {
                icon: 'settings' as IconName,
                title: 'Definições do clube',
                detail: 'Nome, emblema, cor, jogos e treinos',
                run: onOpenSettings
              }
            ]
          : [])
      ]
    },
    {
      title: 'Dados',
      rows: [
        {
          icon: 'database',
          title: 'Cópias de segurança',
          detail: lastBackup ? `Última: ${lastBackup}` : 'Guardar e repor os dados',
          run: onOpenDatabase
        },
        { icon: 'zap', title: 'Sincronização', detail: 'Estado da gravação na nuvem', run: onOpenSync },
        ...(isAdmin && onOpenInventory
          ? [
              {
                icon: 'search' as IconName,
                title: 'Inventário da plataforma',
                detail: 'Só leitura · contas, convites e contagens de registos',
                run: onOpenInventory
              }
            ]
          : []),
        ...(isAdmin && onOpenEncryptedBackup
          ? [
              {
                icon: 'database' as IconName,
                title: 'Cópia cifrada da plataforma',
                detail: 'Só leitura · criar e verificar uma cópia completa protegida por frase-passe',
                run: onOpenEncryptedBackup
              }
            ]
          : []),
        ...(isAdmin && careerOn !== null
          ? [
              {
                icon: 'ball' as IconName,
                title: `O Meu Percurso (teste): ${careerOn ? 'ligado' : 'desligado'} neste clube`,
                detail: careerOn
                  ? 'Toque para desligar: as páginas dos atletas fecham'
                  : 'Toque para ligar só em clubes de teste (até à AIPD)',
                run: toggleCareer
              }
            ]
          : []),
        ...(isAdmin && privateOn !== null
          ? [
              {
                icon: 'database' as IconName,
                title: `Dados privados dos atletas (teste): ${privateOn ? 'ligados' : 'desligados'} neste clube`,
                detail: privateOn
                  ? 'Toque para desligar (a cópia separada deixa de ser atualizada; nada é apagado)'
                  : 'Toque para ligar só em clubes de teste (F3: cópia separada; o staff deixa de ver)',
                run: togglePrivate
              }
            ]
          : []),
        ...(isAdmin && onOpenMainMigration
          ? [
              {
                icon: 'users' as IconName,
                title: 'Migração do clube',
                detail: 'Organização e membros do clube',
                run: onOpenMainMigration
              }
            ]
          : [])
      ]
    },
    {
      title: 'Ajuda',
      rows: [{ icon: 'search', title: 'Visita guiada', detail: 'Onde está cada coisa, em 1 minuto', run: onOpenTour }]
    }
  ];
  if (isAdmin)
    groups[0].rows.splice(2, 0, {
      icon: 'plus',
      title: 'Convidar treinador',
      detail: 'Código ou link para a equipa técnica',
      run: onOpenInviteStaff
    });

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-28">
      {/* The club: crest, name, teams and season; Mais (team tools and my account) on the right */}
      <header className="flex items-center gap-3 border-b border-ui-line pb-3 pt-1">
        <span className="club-crest" aria-hidden>
          {state.clubLogoUrl ? (
            <img
              src={state.clubLogoUrl}
              alt=""
              className="h-full w-full object-contain p-1"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-ui-title font-extrabold text-ui-text">{club}</h1>
          <p className="truncate text-ui-caption text-ui-muted">
            {teams.length} {teams.length === 1 ? 'equipa' : 'equipas'} · Época {season}
          </p>
        </div>
        <SyncStatusBadge onClick={onOpenSync} fallbackSyncInfo={state.syncInfo} />
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Mais opções"
          className="ui-btn ui-btn-secondary flex h-10 items-center gap-1.5 px-3 text-ui-caption font-bold"
        >
          <Icon name="more" className="h-4 w-4" /> Mais
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h2 className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ui-muted">
                {g.title}
              </h2>
              <ul className="ui-card divide-y divide-ui-line overflow-hidden">
                {g.rows.map((r) => (
                  <li key={r.title}>
                    <button
                      type="button"
                      onClick={r.run}
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-ui-surface-2"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui-sm bg-ui-brand-soft text-ui-brand">
                        <Icon name={r.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-ui-body font-bold text-ui-text">{r.title}</span>
                        <span className="block truncate text-ui-caption text-ui-muted">{r.detail}</span>
                      </span>
                      {r.badge ? (
                        <span className="ui-badge ui-badge-warning shrink-0">{r.badge}</span>
                      ) : (
                        <span aria-hidden className="text-ui-muted">
                          ›
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* The club's teams at a glance (on a computer beside the menu, on the phone below) */}
        <section aria-label="Equipas do clube" className="space-y-1.5">
          <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ui-muted">
            Equipas do clube
          </h2>
          <ul className="ui-card divide-y divide-ui-line overflow-hidden">
            {teams.map((t) => {
              const active = t.id === state.activeTeamId;
              const athletes = (active ? state.roster || [] : t.roster || []).filter(
                (p) => p && p.active !== false
              ).length;
              return (
                <li key={t.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-ui-sm bg-ui-surface-2 px-1.5 text-[11px] font-black text-ui-text">
                    {(t.category || '?').replace(/[^0-9A-Za-z]/g, '').slice(0, 5)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ui-body font-bold text-ui-text">
                      {(active ? state.myClubName : t.clubName) || club} · {t.category}
                    </span>
                    <span className="block truncate text-ui-caption text-ui-muted">
                      Época {t.season} · {athletes} {athletes === 1 ? 'atleta' : 'atletas'}
                    </span>
                  </span>
                  {active && <span className="ui-badge ui-badge-success shrink-0">Em uso</span>}
                </li>
              );
            })}
          </ul>
          {pendingUsersCount > 0 && isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminUsers}
              className="flex w-full items-center gap-3 rounded-ui border border-ui-warning bg-ui-warning-soft px-3.5 py-3 text-left"
            >
              <span aria-hidden>⏳</span>
              <span className="min-w-0 flex-1 text-ui-body font-bold text-ui-text">
                {pendingUsersCount} {pendingUsersCount === 1 ? 'pedido de acesso' : 'pedidos de acesso'} por aprovar
              </span>
              <span className="text-ui-caption font-bold text-ui-brand">Ver →</span>
            </button>
          )}
        </section>
      </div>
    </div>
  );
};

export default ClubView;
