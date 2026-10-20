import React, { useState } from 'react';
import { AppState, SquadProfile, Player } from '../../types';
import { uid, defaultSeason } from '../../lib/utils';
import logoImg from '../../assets/images/bolacomvisao_logo_1786622535530.jpg';
import { isAppAdmin } from '../../services/cloudAuthService';
import { getUserAccessibleTeams, isAdminAccount } from '../../lib/permissionsEngine';

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
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
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
    <div className="teams-hub text-center animate-fade-in max-w-xl mx-auto px-2 py-4 pb-28">
      {/* App Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-4">
        <div className="flex items-center gap-2.5">
          <img
            src={logoImg}
            alt="BolaComVisão Logo"
            className="w-10 h-10 rounded-xl object-cover border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.4)]"
            referrerPolicy="no-referrer"
          />
          <div className="text-left">
            <h1 className="text-xl font-extrabold font-['Chakra_Petch'] uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300">
              BolaComVisão
            </h1>
            <div className="text-[10px] font-mono text-cyan-300/80 uppercase tracking-wider">
              Gestão Tática & Planteis
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSync && (
            <button
              onClick={onOpenSync}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                !isOnline
                  ? 'bg-amber-950/90 border-amber-500/70 text-amber-300 animate-pulse'
                  : syncInfo?.status === 'syncing'
                    ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                    : 'bg-slate-900 border-cyan-500/30 text-emerald-300 hover:border-cyan-400'
              }`}
              title={
                !isOnline ? 'Modo Offline Ativo. Clique para gerir.' : 'Estado de Sincronização. Clique para gerir.'
              }
            >
              {!isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span>⚡ Offline</span>
                </>
              ) : syncInfo?.status === 'syncing' ? (
                <>
                  <span className="animate-spin text-xs">🔄</span>
                  <span className="hidden sm:inline">A Sincronizar</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span>Nuvem</span>
                </>
              )}
            </button>
          )}

          {state.currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-cyan-500/30 rounded-xl px-2.5 py-1 text-xs font-mono text-cyan-200">
              <span>👤</span>
              <span className="font-bold text-white">{state.currentUser.name}</span>
            </div>
          )}

          {onOpenAdminUsers && isAdmin && (
            <button
              onClick={onOpenAdminUsers}
              className={`relative p-2 rounded-xl border text-sm transition-transform hover:scale-105 cursor-pointer ${
                pendingUsersCount > 0
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
                  : 'bg-slate-900 border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
              }`}
              title="Gestão de Acessos de Treinadores (👥)"
            >
              <span>👥</span>
              {pendingUsersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-slate-950 font-mono text-[9px] font-black rounded-full flex items-center justify-center border border-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-bounce">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:scale-105 transition-transform text-sm"
            title="Definições do Sistema"
          >
            ⚙️
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onShowConfirm('Tem a certeza de que deseja terminar a sessão e sair da sua conta?', () => {
                  onLogout();
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/50 text-rose-200 hover:text-white transition-all text-xs font-mono font-bold shadow-[0_0_10px_rgba(244,63,94,0.2)] cursor-pointer"
              title="Terminar Sessão e Sair"
              id="header-logout-btn"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Terminar Sessão</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="my-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono tracking-widest uppercase mb-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          Painel Inicial de Seleção
        </div>
        <h2 className="text-2xl font-bold font-['Chakra_Petch'] uppercase tracking-wider text-white">
          Escolha a sua Equipa / Época
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Selecione a equipa com que deseja trabalhar para aceder ao seu plantel, jogos, treinos e estatísticas.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2 my-4">
        <span className="text-xs font-mono text-slate-300">
          {teams.length} {teams.length === 1 ? 'Equipa Disponível' : 'Equipas Disponíveis'}
        </span>

        {isUserAdmin && (
          <button
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all hover:brightness-110 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            onClick={() => setIsCreating(true)}
          >
            <span>➕</span>
            <span>Nova Equipa / Época</span>
          </button>
        )}
      </div>

      {/* Form: Create New Team */}
      {isCreating && (
        <form
          onSubmit={handleCreateTeam}
          className="bg-slate-950 border border-cyan-500/40 rounded-2xl p-5 mb-6 shadow-[0_0_25px_rgba(0,210,255,0.2)] text-left space-y-4"
        >
          <div className="font-['Chakra_Petch'] font-bold text-sm text-cyan-300 uppercase pb-2 border-b border-cyan-500/20 flex justify-between items-center">
            <span>➕ Criar Nova Equipa</span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-900 border border-slate-700"
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
              className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
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
                className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
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
                className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
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
                className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 font-mono">
                Formato de Jogo (Tático)
              </label>
              <select
                value={newTacticFormat}
                onChange={(e) => setNewTacticFormat(Number(e.target.value) as any)}
                className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
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
              className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {teams.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 font-mono">Início de Plantel</label>
              <select
                value={copyFromTeamId}
                onChange={(e) => setCopyFromTeamId(e.target.value)}
                className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
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
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:brightness-110 active:scale-95 transition-all"
            >
              Criar e Entrar na Equipa 🚀
            </button>
            <button
              type="button"
              className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
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
          <div className="bg-slate-950/90 border border-cyan-500/40 rounded-3xl p-8 my-6 text-center shadow-[0_0_30px_rgba(0,210,255,0.2)] animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 text-4xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_25px_rgba(0,210,255,0.3)]">
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
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(0,210,255,0.5)] hover:brightness-110 active:scale-95 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
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
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
          <div className="bg-slate-950/90 border border-amber-500/40 rounded-3xl p-8 my-6 text-center shadow-[0_0_30px_rgba(245,158,11,0.15)] animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-4xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
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
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
        <div className="space-y-4">
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
                <div
                  key={team.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-cyan-400/60 text-left space-y-2"
                >
                  <div className="text-xs font-bold font-['Chakra_Petch'] text-cyan-300 uppercase">
                    Editar Dados da Equipa
                  </div>
                  <input
                    type="text"
                    placeholder="Nome do Clube"
                    value={editClubName}
                    onChange={(e) => setEditClubName(e.target.value)}
                    className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Categoria / Escalão"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="bg-slate-900 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Época (ex: 2025/2026)"
                      value={editSeason}
                      onChange={(e) => setEditSeason(e.target.value)}
                      className="bg-slate-900 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="URL do Emblema / Logo (Opcional)"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />

                  <div className="flex gap-2 pt-2">
                    <button
                      className="flex-1 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
                      onClick={() => handleSaveEdit(team.id)}
                    >
                      Guardar Alterações
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"
                      onClick={() => setEditingTeamId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={team.id}
                onClick={() => onSelectTeam(team.id)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left relative overflow-hidden group cursor-pointer active:scale-[0.99] touch-manipulation ${
                  isActive
                    ? 'bg-slate-950/90 border-cyan-400 shadow-[0_0_25px_rgba(0,210,255,0.25)]'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Left Section: Logo & Name Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center overflow-hidden shrink-0">
                      {currentLogo ? (
                        <img
                          src={currentLogo}
                          alt="Logo"
                          className="w-full h-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-2xl">🛡️</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold font-['Chakra_Petch'] text-base text-white uppercase tracking-wide">
                          {currentClubName}
                        </span>
                        {isActive && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                            ✓ Selecionada
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-semibold">
                          {currentCategory || 'Sub-19'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-mono">
                          Época {currentSeason || defaultSeason()}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 mt-2 flex gap-3 flex-wrap items-center">
                        <span className="flex items-center gap-1">
                          <span>👥</span>
                          <strong
                            className={currentRosterLen > 0 ? 'text-cyan-300 font-bold' : 'text-slate-500 font-normal'}
                          >
                            {currentRosterLen}
                          </strong>
                          <span>{currentRosterLen === 1 ? 'Jogador' : 'Jogadores'}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1">
                            <span>⚽</span>
                            <strong
                              className={totalMatchesLen > 0 ? 'text-cyan-300 font-bold' : 'text-slate-500 font-normal'}
                            >
                              {totalMatchesLen}
                            </strong>
                            <span>{totalMatchesLen === 1 ? 'Jogo' : 'Jogos'}</span>
                          </span>
                          {scheduledMatchesCount > 0 && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-medium"
                              title={`${scheduledMatchesCount} ${scheduledMatchesCount === 1 ? 'jogo agendado' : 'jogos agendados'}${playedMatchesCount > 0 ? `, ${playedMatchesCount} já realizados` : ''}`}
                            >
                              {scheduledMatchesCount} {scheduledMatchesCount === 1 ? 'agendado' : 'agendados'}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>🏃</span>
                          <strong
                            className={
                              currentTrainingsLen > 0 ? 'text-cyan-300 font-bold' : 'text-slate-500 font-normal'
                            }
                          >
                            {currentTrainingsLen}
                          </strong>
                          <span>{currentTrainingsLen === 1 ? 'Treino' : 'Treinos'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Action Buttons */}
                  <div
                    className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="flex-1 sm:flex-none px-5 py-2.5 min-h-[42px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(0,210,255,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 touch-manipulation"
                      onClick={() => onSelectTeam(team.id)}
                    >
                      <span>Entrar no Painel</span>
                      <span>➔</span>
                    </button>

                    {isUserAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          className="px-2.5 py-1.5 min-h-[34px] text-xs bg-slate-900 border border-slate-700 rounded-lg hover:border-cyan-400 text-cyan-300 cursor-pointer active:scale-95 touch-manipulation"
                          title="Editar Informações"
                          onClick={() => handleStartEdit(team)}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="px-2.5 py-1.5 min-h-[34px] text-xs bg-slate-900 border border-slate-700 rounded-lg hover:border-cyan-400 text-cyan-300 cursor-pointer active:scale-95 touch-manipulation"
                          title="Duplicar para Nova Época"
                          onClick={() => handleDuplicateToNewSeason(team)}
                        >
                          📋 Duplicar
                        </button>
                        <button
                          className="px-2.5 py-1.5 min-h-[34px] text-xs bg-slate-900 border border-slate-700 rounded-lg hover:border-red-500 text-red-400 cursor-pointer active:scale-95 touch-manipulation"
                          title="Apagar Equipa"
                          onClick={() => handleDeleteTeam(team.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
