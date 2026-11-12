import React, { useState } from 'react';
import { AppState, SquadProfile, Player } from '../../types';
import { uid, defaultSeason } from '../../lib/utils';
import logoImg from '../../assets/images/bolacomvisao_logo_1786622535530.jpg';
import { isAppAdmin } from '../../services/cloudAuthService';
import { getUserAccessibleTeams, isAdminAccount } from '../../lib/permissionsEngine';
import { SyncStatusBadge } from '../ui/SyncStatusBadge';
import { SunModeButton } from '../ui/SunModeButton';
import { Icon } from '../ui/Icon';

interface TeamsHubViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onSelectTeam: (teamId: string) => void;
  onOpenSettings: () => void;
  onOpenSync?: () => void;
  onOpenAdminUsers?: () => void;
  pendingUsersCount?: number;
  onLogout?: () => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast: (msg: string) => void;
}

export const TeamsHubView: React.FC<TeamsHubViewProps> = ({
  state,
  onUpdateState,
  onSelectTeam,
  onOpenSettings,
  onOpenSync,
  onOpenAdminUsers,
  pendingUsersCount = 0,
  onLogout,
  onShowConfirm,
  onShowToast
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const syncInfo = state.syncInfo;
  const isAdmin = isAppAdmin(state.currentUser);

  // New Team Form State
  const [newClubName, setNewClubName] = useState('');
  const [newTeamDesignation, setNewTeamDesignation] = useState('Sub-13');
  const [newCategory, setNewCategory] = useState('Sub-13');
  const [newSeason, setNewSeason] = useState(defaultSeason());
  const [newHeadCoach, setNewHeadCoach] = useState(state.currentUser?.name || 'Treinador Principal');
  const [newTacticFormat, setNewTacticFormat] = useState<3 | 5 | 7 | 9 | 11>(7);
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [copyFromTeamId, setCopyFromTeamId] = useState<string>('none');

  // Edit Team Form State
  const [editClubName, setEditClubName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSeason, setEditSeason] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  const isUserAdmin = isAdminAccount(state.currentUser);
  const allTeams = state.teams || [];
  const teams = getUserAccessibleTeams(state.currentUser, allTeams);
  // The team chosen on this screen (tap a card); the team in use, or the first one, to start with
  const [chosenId, setChosenId] = useState<string | undefined>(
    () => (teams.some((t) => t.id === state.activeTeamId) ? state.activeTeamId : teams[0]?.id) || undefined
  );
  const chosenTeam = teams.find((t) => t.id === chosenId) || teams[0];
  const chosenLabel = chosenTeam
    ? [
        chosenTeam.id === state.activeTeamId ? state.myClubName || chosenTeam.clubName : chosenTeam.clubName,
        chosenTeam.id === state.activeTeamId ? state.category || chosenTeam.category : chosenTeam.category
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim()) {
      onShowToast('Por favor insira o nome do clube.');
      return;
    }

    let initialRoster: Player[] = [];
    let initialStaff: any[] = [];
    if (copyFromTeamId !== 'none') {
      const sourceTeam = teams.find((t) => t.id === copyFromTeamId);
      if (sourceTeam) {
        initialRoster = sourceTeam.roster.map((p) => ({
          ...p,
          id: uid()
        }));
        initialStaff = (sourceTeam.staffMembers || []).map((s) => ({
          ...s,
          id: uid()
        }));
      }
    } else if (newHeadCoach.trim()) {
      initialStaff = [
        {
          id: uid(),
          name: newHeadCoach.trim(),
          role: 'Treinador Principal',
          phone: '',
          email: state.currentUser?.email || '',
          createdAt: new Date().toISOString()
        }
      ];
    }

    const newTeamProfile: SquadProfile = {
      id: uid(),
      clubName: newClubName.trim(),
      category: newCategory.trim() || newTeamDesignation.trim() || 'Sub-13',
      season: newSeason.trim() || defaultSeason(),
      clubLogoUrl: newLogoUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
      roster: initialRoster,
      staffMembers: initialStaff,
      matches: [],
      trainings: [],
      schedule: [],
      tactics: [],
      tacticFormat: newTacticFormat || 7,
      clubEvents: [],
      staffUnavailability: [],
      staffMessages: [],
      opponentScouting: [],
      exerciseLibrary: []
    };

    // Save current active team into state list first
    const updatedTeams = teams.map((t) => {
      if (t.id === state.activeTeamId) {
        return {
          ...t,
          clubName: state.myClubName,
          clubLogoUrl: state.clubLogoUrl,
          category: state.category || t.category || 'Sub-13',
          season: state.season || t.season || defaultSeason(),
          roster: state.roster,
          staffMembers: state.staffMembers || [],
          staffMessages: state.staffMessages || [],
          matches: state.matches,
          trainings: state.trainings,
          schedule: state.schedule,
          tactics: state.tactics,
          tacticFormat: state.tacticFormat,
          clubEvents: state.clubEvents || [],
          staffUnavailability: state.staffUnavailability || [],
          opponentScouting: state.opponentScouting || []
        };
      }
      return t;
    });

    const finalTeams = [newTeamProfile, ...updatedTeams];

    onUpdateState({
      activeTeamId: newTeamProfile.id,
      teams: finalTeams,
      myClubName: newTeamProfile.clubName,
      clubLogoUrl: newTeamProfile.clubLogoUrl,
      category: newTeamProfile.category,
      season: newTeamProfile.season,
      roster: newTeamProfile.roster,
      staffMembers: newTeamProfile.staffMembers || [],
      staffMessages: [],
      matches: [],
      trainings: [],
      schedule: [],
      tactics: [],
      tacticFormat: newTeamProfile.tacticFormat || 7,
      clubEvents: [],
      staffUnavailability: [],
      opponentScouting: []
    });

    setIsCreating(false);
    setNewClubName('');
    setNewLogoUrl('');
    onShowToast(`Equipa "${newTeamProfile.clubName} (${newTeamProfile.category})" criada com sucesso! 🚀`);
    onSelectTeam(newTeamProfile.id);
  };

  const handleStartEdit = (team: SquadProfile) => {
    setEditingTeamId(team.id);
    setEditClubName(team.id === state.activeTeamId ? state.myClubName : team.clubName);
    setEditCategory(team.id === state.activeTeamId ? state.category || team.category : team.category);
    setEditSeason(team.id === state.activeTeamId ? state.season || team.season : team.season);
    setEditLogoUrl(team.id === state.activeTeamId ? state.clubLogoUrl || '' : team.clubLogoUrl || '');
  };

  const handleSaveEdit = (teamId: string) => {
    const updatedTeams = teams.map((t) => {
      if (t.id === teamId) {
        return {
          ...t,
          clubName: editClubName.trim() || t.clubName,
          category: editCategory.trim() || t.category,
          season: editSeason.trim() || t.season,
          clubLogoUrl: editLogoUrl.trim() || undefined
        };
      }
      return t;
    });

    if (teamId === state.activeTeamId) {
      onUpdateState({
        teams: updatedTeams,
        myClubName: editClubName.trim() || state.myClubName,
        category: editCategory.trim() || state.category,
        season: editSeason.trim() || state.season,
        clubLogoUrl: editLogoUrl.trim() || state.clubLogoUrl
      });
    } else {
      onUpdateState({ teams: updatedTeams });
    }

    setEditingTeamId(null);
    onShowToast('Dados da equipa atualizados com sucesso! ✓');
  };

  const handleDeleteTeam = (teamId: string) => {
    const target = teams.find((t) => t.id === teamId);
    const targetName = target ? target.clubName : 'Equipa';

    onShowConfirm(
      `Tens a certeza que queres apagar a equipa "${targetName}"? Esta ação elimina todos os seus jogadores, jogos, treinos e registos.`,
      () => {
        const remainingTeams = teams.filter((t) => t.id !== teamId);
        if (remainingTeams.length === 0) {
          onUpdateState({
            activeTeamId: '',
            teams: [],
            myClubName: '',
            clubLogoUrl: undefined,
            category: '',
            season: defaultSeason(),
            roster: [],
            staffMembers: [],
            matches: [],
            trainings: [],
            schedule: [],
            tactics: [],
            tacticFormat: 11,
            opponentScouting: [],
            notifications: []
          });
          setIsCreating(false);
          onShowToast(`Equipa "${targetName}" apagada com sucesso.`);
          return;
        }

        if (teamId === state.activeTeamId) {
          const nextActive = remainingTeams[0];
          onUpdateState({
            activeTeamId: nextActive.id,
            teams: remainingTeams,
            myClubName: nextActive.clubName,
            clubLogoUrl: nextActive.clubLogoUrl,
            category: nextActive.category,
            season: nextActive.season,
            roster: nextActive.roster || [],
            staffMembers: nextActive.staffMembers || [],
            matches: nextActive.matches || [],
            trainings: nextActive.trainings || [],
            schedule: nextActive.schedule || [],
            tactics: nextActive.tactics || [],
            tacticFormat: nextActive.tacticFormat || 11,
            opponentScouting: nextActive.opponentScouting || []
          });
        } else {
          onUpdateState({ teams: remainingTeams });
        }
        onShowToast(`Equipa "${targetName}" apagada.`);
      }
    );
  };

  const handleDuplicateToNewSeason = (sourceTeam: SquadProfile) => {
    setNewClubName(sourceTeam.clubName);
    setNewCategory(sourceTeam.category);
    setNewSeason(defaultSeason());
    setNewLogoUrl(sourceTeam.clubLogoUrl || '');
    setCopyFromTeamId(sourceTeam.id);
    setIsCreating(true);
  };

  return (
    <div className="teams-hub relative mx-auto max-w-6xl px-1 pb-24 pt-2 text-left sm:px-3 lg:pb-12">
      {/* The night stadium behind the whole screen (drawn with light, no photos) */}
      <div aria-hidden className="bcv-stadium">
        <span className="bcv-beam bcv-beam-left" />
        <span className="bcv-beam bcv-beam-right" />
        <span className="bcv-pitch" />
      </div>

      {/* Top bar: brand, save state, sun mode, settings, access, sign out */}
      <header className="relative flex items-center gap-2.5">
        <img
          src={logoImg}
          alt=""
          className="h-10 w-10 rounded-ui-sm object-cover shadow-[0_0_20px_rgba(34,211,238,0.35)] sm:h-12 sm:w-12"
          referrerPolicy="no-referrer"
        />
        <div className="text-[19px] font-black tracking-tight text-ui-text sm:text-[22px]">
          BolaCom<span className="text-ui-brand">Visão</span>
        </div>
        <div className="flex-1" />
        {onOpenSync && <SyncStatusBadge onClick={onOpenSync} fallbackSyncInfo={syncInfo} />}
        {state.currentUser && (
          <span className="bcv-chip hidden items-center gap-1.5 sm:inline-flex">
            <span aria-hidden>👤</span>
            <b>{state.currentUser.name}</b>
          </span>
        )}
        {onOpenAdminUsers && isAdmin && (
          <button
            type="button"
            onClick={onOpenAdminUsers}
            className="bcv-round relative"
            title="Gestão de Acessos de Treinadores (👥)"
            aria-label="Utilizadores e acessos"
          >
            <span aria-hidden>👥</span>
            {pendingUsersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ui-warning px-1 text-[9px] font-black text-ui-bg">
                {pendingUsersCount}
              </span>
            )}
          </button>
        )}
        <SunModeButton className="bcv-round !p-0" />
        <button
          type="button"
          onClick={onOpenSettings}
          className="bcv-round"
          title="Definições do Sistema"
          aria-label="Definições"
        >
          <Icon name="settings" className="h-[18px] w-[18px]" />
        </button>
        {onLogout && (
          <button
            type="button"
            onClick={() => {
              onShowConfirm('Tem a certeza de que deseja terminar a sessão e sair da sua conta?', () => {
                onLogout();
              });
            }}
            className="bcv-round"
            title="Terminar Sessão e Sair"
            aria-label="Terminar sessão"
            id="header-logout-btn"
          >
            <span aria-hidden>🚪</span>
          </button>
        )}
      </header>

      {/* Title */}
      <div className="relative mb-6 mt-8 sm:mb-8 sm:mt-14">
        <h1 className="bcv-title text-[42px] sm:text-[64px] lg:text-[76px]">Escolher Equipa</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ui-text/85 sm:text-[18px]">
          O próximo passo na evolução começa aqui.
          <span className="hidden sm:inline">
            {' '}
            Escolhe a equipa para entrares no planeamento, jogos, treinos e estatísticas.
          </span>
        </p>
        <div className="bcv-underline mt-4" />
      </div>

      {/* Form: Create New Team */}
      {isCreating && (
        <form onSubmit={handleCreateTeam} className="ui-inset p-5 mb-6 text-left space-y-4">
          <div className="font-['Chakra_Petch'] font-bold text-sm text-cyan-300 uppercase pb-2 border-b border-cyan-500/20 flex justify-between items-center">
            <span>➕ Criar Nova Equipa</span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="ui-btn ui-btn-secondary text-xs px-2 py-1"
            >
              ✕ Cancelar
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1 font-mono">Clube / Instituição *</label>
            <input
              type="text"
              required
              placeholder="Ex: Futebol Clube ABC, GD São Roque, etc."
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              className="ui-input w-full text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 font-mono">Escalão / Categoria *</label>
              <select
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setNewTeamDesignation(e.target.value);
                }}
                className="ui-input w-full text-xs"
              >
                <option value="Sub-7">Sub-7 (Petizes)</option>
                <option value="Sub-9">Sub-9 (Traquinas)</option>
                <option value="Sub-10">Sub-10 (Benjamins A)</option>
                <option value="Sub-11">Sub-11 (Benjamins)</option>
                <option value="Sub-12">Sub-12 (Infantis A)</option>
                <option value="Sub-13">Sub-13 (Infantis)</option>
                <option value="Sub-14">Sub-14 (Iniciados A)</option>
                <option value="Sub-15">Sub-15 (Iniciados)</option>
                <option value="Sub-16">Sub-16 (Juvenis A)</option>
                <option value="Sub-17">Sub-17 (Juvenis)</option>
                <option value="Sub-19">Sub-19 (Juniores)</option>
                <option value="Sub-23">Sub-23</option>
                <option value="Seniores">Seniores</option>
                <option value="Veteranos">Veteranos</option>
                <option value="Feminino">Futebol Feminino</option>
                <option value="Outro">Outro Escalão</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 font-mono">Época Desportiva *</label>
              <input
                type="text"
                placeholder="Ex: 2026/27 ou 2025/26"
                value={newSeason}
                onChange={(e) => setNewSeason(e.target.value)}
                className="ui-input w-full text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 font-mono">Treinador Principal</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={newHeadCoach}
                onChange={(e) => setNewHeadCoach(e.target.value)}
                className="ui-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 font-mono">
                Formato de Jogo (Tático)
              </label>
              <select
                value={newTacticFormat}
                onChange={(e) => setNewTacticFormat(Number(e.target.value) as any)}
                className="ui-input w-full text-xs"
              >
                <option value={11}>Futebol 11 (11 vs 11)</option>
                <option value={9}>Futebol 9 (9 vs 9)</option>
                <option value={7}>Futebol 7 (7 vs 7)</option>
                <option value={5}>Futebol 5 / Futsal (5 vs 5)</option>
                <option value={3}>Futebol 3 / Mini (3 vs 3)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1 font-mono">
              URL do Emblema / Logo (Opcional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={newLogoUrl}
              onChange={(e) => setNewLogoUrl(e.target.value)}
              className="ui-input w-full text-xs"
            />
          </div>

          {teams.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 font-mono">Início de Plantel</label>
              <select
                value={copyFromTeamId}
                onChange={(e) => setCopyFromTeamId(e.target.value)}
                className="ui-input w-full text-xs"
              >
                <option value="none">✨ Iniciar com plantel em branco (Sem jogadores)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    📋 Copiar plantel de {t.clubName} ({t.category} {t.season}) - {t.roster.length} jogadores
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all"
            >
              Criar e Entrar na Equipa 🚀
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-secondary px-4 py-3 text-xs"
              onClick={() => setIsCreating(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* List of Teams Cards or Empty State */}
      {teams.length === 0 && !isCreating ? (
        isUserAdmin ? (
          <div className="ui-inset p-8 my-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 text-4xl flex items-center justify-center mx-auto mb-5">
              ⚽
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-[11px] font-mono tracking-widest uppercase mb-3 font-bold">
              Bem-vindo à aplicação
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] uppercase text-white tracking-wider mb-2">
              Ainda não tem nenhuma equipa registada
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mb-7 leading-relaxed font-sans">
              Comece por registar a sua equipa, clube e escalão para ter acesso imediato à gestão tática, plantel,
              calendário, treinos e análise de jogo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsCreating(true)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                id="empty-state-create-team-btn"
              >
                <span className="text-base font-bold">+</span>
                <span>CRIAR EQUIPA</span>
                <span className="text-base">🚀</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onShowConfirm('Tem a certeza de que deseja terminar a sessão e sair da sua conta?', () => {
                      onLogout();
                    });
                  }}
                  className="ui-btn ui-btn-secondary w-full sm:w-auto px-6 py-3.5 text-xs inline-flex items-center justify-center gap-2"
                  id="empty-state-logout-btn"
                  title="Terminar Sessão e Sair"
                >
                  <span>🚪</span>
                  <span>Terminar Sessão</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="ui-inset p-8 my-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-4xl flex items-center justify-center mx-auto mb-5">
              🔒
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/80 border border-amber-400/40 text-amber-300 text-[11px] font-mono tracking-widest uppercase mb-3 font-bold">
              Acesso Condicionado
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] uppercase text-white tracking-wider mb-2">
              Sem equipa atribuída
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mb-7 leading-relaxed font-sans">
              A sua conta está aprovada como{' '}
              <span className="text-amber-300 font-bold">{state.currentUser?.role || 'Treinador'}</span>, mas ainda não
              tem nenhuma equipa ou escalão associado pelo Administrador. Por favor, solicite ao Administrador do clube
              a atribuição da sua equipa.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onShowConfirm('Tem a certeza de que deseja terminar a sessão e sair da sua conta?', () => {
                      onLogout();
                    });
                  }}
                  className="ui-btn ui-btn-secondary w-full sm:w-auto px-6 py-3.5 text-xs inline-flex items-center justify-center gap-2"
                  id="empty-state-logout-btn"
                  title="Terminar Sessão e Sair"
                >
                  <span>🚪</span>
                  <span>Terminar Sessão</span>
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <div
          role="list"
          aria-label="Equipas"
          className="relative grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
        >
          {teams.map((team) => {
            const isActive = team.id === state.activeTeamId;
            const isEditing = editingTeamId === team.id;

            const currentClubName = isActive ? state.myClubName : team.clubName;
            const currentCategory = isActive ? state.category || team.category : team.category;
            const currentSeason = isActive ? state.season || team.season : team.season;
            const currentLogo = isActive ? state.clubLogoUrl || team.clubLogoUrl : team.clubLogoUrl;

            // 1. Resolver Jogos Agendados da Equipa (a partir de team.schedule e state.schedule com filtros inteligentes)
            const teamClubLower = (team.clubName || '').toLowerCase().trim();
            const teamScheduleMap = new Map<string, any>();
            (team.schedule || []).forEach((s) => {
              if (s && s.id) teamScheduleMap.set(s.id, s);
            });

            (state.schedule || []).forEach((s) => {
              if (!s || !s.id) return;
              const sTeamId = (s as any).teamId;
              const sTeamName = (s as any).teamName?.toLowerCase().trim();
              if (
                isActive ||
                sTeamId === team.id ||
                (sTeamName &&
                  teamClubLower &&
                  (sTeamName === teamClubLower ||
                    teamClubLower.includes(sTeamName) ||
                    sTeamName.includes(teamClubLower))) ||
                (teamClubLower.includes('drag') && (sTeamName?.includes('drag') || !sTeamId))
              ) {
                if (!teamScheduleMap.has(s.id)) {
                  teamScheduleMap.set(s.id, s);
                }
              }
            });
            const currentSchedule = Array.from(teamScheduleMap.values());

            // 2. Resolver Jogos Realizados / Registados da Equipa
            const teamMatchesMap = new Map<string, any>();
            (team.matches || []).forEach((m) => {
              if (m && m.id) teamMatchesMap.set(m.id, m);
            });

            (state.matches || []).forEach((m) => {
              if (!m || !m.id) return;
              const mTeamId = (m as any).teamId;
              const mTeamName = (m as any).teamName?.toLowerCase().trim();
              if (
                isActive ||
                mTeamId === team.id ||
                (mTeamName &&
                  teamClubLower &&
                  (mTeamName === teamClubLower ||
                    teamClubLower.includes(mTeamName) ||
                    mTeamName.includes(teamClubLower))) ||
                (teamClubLower.includes('drag') && (mTeamName?.includes('drag') || !mTeamId))
              ) {
                if (!teamMatchesMap.has(m.id)) {
                  teamMatchesMap.set(m.id, m);
                }
              }
            });
            const currentMatches = Array.from(teamMatchesMap.values());

            // 3. Resolver Plantel e Treinos
            const currentRosterLen = isActive
              ? (state.roster || []).filter((p) => p && p.active !== false).length
              : (team.roster || []).filter((p) => p && p.active !== false).length;
            const currentTrainingsLen = isActive
              ? Math.max((state.trainings || []).length, (team.trainings || []).length)
              : (team.trainings || []).length;

            // Assumir tanto jogos já realizados como jogos agendados no total de jogos
            const playedMatchIds = new Set(currentMatches.map((m) => m.id));
            const distinctScheduled = currentSchedule.filter((s) => !playedMatchIds.has(s.id));
            const totalMatchesLen = currentMatches.length + distinctScheduled.length;
            const scheduledMatchesCount = distinctScheduled.length;
            const playedMatchesCount = currentMatches.length;

            if (isEditing) {
              return (
                <div key={team.id} className="ui-inset p-4 text-left space-y-2">
                  <div className="text-xs font-bold font-['Chakra_Petch'] text-cyan-300 uppercase">
                    Editar Dados da Equipa
                  </div>
                  <input
                    type="text"
                    placeholder="Nome do Clube"
                    value={editClubName}
                    onChange={(e) => setEditClubName(e.target.value)}
                    className="ui-input w-full text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Categoria / Escalão"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="ui-input text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Época (ex: 2025/2026)"
                      value={editSeason}
                      onChange={(e) => setEditSeason(e.target.value)}
                      className="ui-input text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="URL do Emblema / Logo (Opcional)"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
                    className="ui-input w-full text-xs"
                  />

                  <div className="flex gap-2 pt-2">
                    <button
                      className="ui-btn ui-btn-primary flex-1 py-2 text-xs"
                      onClick={() => handleSaveEdit(team.id)}
                    >
                      Guardar Alterações
                    </button>
                    <button
                      className="ui-btn ui-btn-secondary px-3 py-2 text-xs"
                      onClick={() => setEditingTeamId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            const chosen = team.id === chosenId;
            const initials =
              (currentClubName || 'Equipa')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase() || 'EQ';
            return (
              <article
                key={team.id}
                role="listitem"
                aria-label={`${currentClubName} ${currentCategory || ''}`.trim()}
                aria-current={chosen ? 'true' : undefined}
                onClick={() => setChosenId(team.id)}
                onDoubleClick={() => onSelectTeam(team.id)}
                className={`bcv-team-card group ${chosen ? 'is-chosen' : ''}`}
              >
                {chosen && (
                  <span aria-hidden className="bcv-tick">
                    ✓
                  </span>
                )}
                <div className="bcv-emblem">
                  {currentLogo ? (
                    <img
                      src={currentLogo}
                      alt=""
                      className="h-full w-full object-contain p-1.5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="min-w-0 sm:text-center">
                  <h2 className="truncate text-[18px] font-extrabold text-ui-text sm:text-[19px]">{currentClubName}</h2>
                  <p className="text-[13px] text-ui-text/75">
                    {currentCategory || 'Sub-19'} · Época {currentSeason || defaultSeason()}
                  </p>
                </div>
                <dl className="bcv-team-stats">
                  <div>
                    <dt>{currentRosterLen === 1 ? 'atleta' : 'atletas'}</dt>
                    <dd>{currentRosterLen}</dd>
                  </div>
                  <div title={`${playedMatchesCount} registados · ${scheduledMatchesCount} agendados`}>
                    <dt>{totalMatchesLen === 1 ? 'jogo' : 'jogos'}</dt>
                    <dd>{totalMatchesLen}</dd>
                  </div>
                  <div>
                    <dt>{currentTrainingsLen === 1 ? 'treino' : 'treinos'}</dt>
                    <dd>{currentTrainingsLen}</dd>
                  </div>
                </dl>
                <div className="bcv-team-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`ui-btn flex-1 py-2 text-ui-caption font-extrabold ${chosen ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                    onClick={() => onSelectTeam(team.id)}
                    aria-label={`Entrar no Painel: ${currentClubName} ${currentCategory || ''}`.trim()}
                  >
                    Entrar →
                  </button>
                  {isUserAdmin && (
                    <>
                      <button
                        type="button"
                        className="bcv-mini"
                        title="Editar Informações"
                        aria-label="Editar"
                        onClick={() => handleStartEdit(team)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="bcv-mini"
                        title="Duplicar para Nova Época"
                        aria-label="Duplicar para nova época"
                        onClick={() => handleDuplicateToNewSeason(team)}
                      >
                        📋
                      </button>
                      <button
                        type="button"
                        className="bcv-mini"
                        title="Apagar Equipa"
                        aria-label="Apagar equipa"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
          {isUserAdmin && !isCreating && (
            <button type="button" onClick={() => setIsCreating(true)} className="bcv-team-card bcv-new-team">
              <span aria-hidden className="text-4xl text-ui-brand">
                ＋
              </span>
              <span className="text-[16px] font-extrabold text-ui-text">Nova Equipa / Época</span>
              <span className="text-ui-caption text-ui-muted">Só o administrador</span>
            </button>
          )}
        </div>
      )}

      {/* What the coach finds inside, and the way in */}
      {chosenTeam && (
        <div className="relative mt-8 hidden items-center gap-6 lg:flex">
          <ul className="flex items-center gap-6 text-ui-caption text-ui-text/85" aria-label="O que encontras">
            <li className="flex items-center gap-2">
              <Icon name="calendar" className="h-5 w-5 text-ui-brand" /> Planeamento
            </li>
            <li className="flex items-center gap-2">
              <Icon name="chart" className="h-5 w-5 text-ui-brand" /> Análise de desempenho
            </li>
            <li className="flex items-center gap-2">
              <Icon name="trophy" className="h-5 w-5 text-ui-brand" /> Evolução da equipa
            </li>
          </ul>
          <div className="flex-1" />
          <button type="button" className="bcv-cta" onClick={() => onSelectTeam(chosenTeam.id)}>
            Entrar no {chosenLabel} →
          </button>
        </div>
      )}
      {chosenTeam && (
        <div className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-30 lg:hidden">
          <button type="button" className="bcv-cta w-full" onClick={() => onSelectTeam(chosenTeam.id)}>
            Entrar no {chosenLabel} →
          </button>
        </div>
      )}
      <div className="bcv-foot relative mt-10 hidden lg:flex" aria-hidden>
        <span />
        BOLACOMVISÃO • FUTEBOL DE FORMAÇÃO
        <span />
      </div>
    </div>
  );
};
