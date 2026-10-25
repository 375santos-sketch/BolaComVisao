import React, { useState } from 'react';
import { AppState, SquadProfile, Player } from '../types';
import { uid, defaultSeason } from '../lib/utils';
import { ImportExcelPlayersModal } from './ImportExcelPlayersModal';
import { ImportMatchExcelModal } from './ImportMatchExcelModal';
import { TeamDatabaseView } from './TeamDatabaseView';
import { hasInventedImportData, removeInventedImportData } from '../lib/inventedImportCleanup';

interface DatabaseModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  state,
  onUpdateState,
  onClose,
  onShowToast,
  onShowConfirm
}) => {
  const [activeTab, setActiveTab] = useState<'team_database' | 'teams'>('team_database');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // New Team Form State
  const [newClubName, setNewClubName] = useState('');
  const [newCategory, setNewCategory] = useState('Sub-19');
  const [newSeason, setNewSeason] = useState(defaultSeason());
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [copyFromTeamId, setCopyFromTeamId] = useState<string>('none');

  // Edit Team Form State
  const [editClubName, setEditClubName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSeason, setEditSeason] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  // Excel Import Modals State
  const [showImportPlayers, setShowImportPlayers] = useState(false);
  const [showImportMatches, setShowImportMatches] = useState(false);

  const teams = state.teams || [];
  const inventedImports = (state.matches || []).filter(hasInventedImportData);

  const handleSwitchTeam = (teamId: string) => {
    if (teamId === state.activeTeamId) return;

    // Save current active team data first
    const updatedTeams = teams.map((t) => {
      if (t.id === state.activeTeamId) {
        return {
          ...t,
          clubName: state.myClubName,
          clubLogoUrl: state.clubLogoUrl,
          category: state.category || t.category || 'Sub-19',
          season: state.season || t.season || defaultSeason(),
          roster: state.roster,
          matches: state.matches,
          trainings: state.trainings,
          schedule: state.schedule,
          tactics: state.tactics,
          tacticFormat: state.tacticFormat
        };
      }
      return t;
    });

    const targetTeam = updatedTeams.find((t) => t.id === teamId);
    if (!targetTeam) return;

    onUpdateState({
      activeTeamId: targetTeam.id,
      teams: updatedTeams,
      myClubName: targetTeam.clubName,
      clubLogoUrl: targetTeam.clubLogoUrl,
      category: targetTeam.category,
      season: targetTeam.season,
      roster: targetTeam.roster || [],
      staffMembers: targetTeam.staffMembers || [],
      matches: targetTeam.matches || [],
      trainings: targetTeam.trainings || [],
      schedule: targetTeam.schedule || [],
      tactics: targetTeam.tactics || [],
      tacticFormat: targetTeam.tacticFormat || 11
    });

    onShowToast(`Equipa ativa: ${targetTeam.clubName} (${targetTeam.category} ${targetTeam.season})`);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim()) {
      onShowToast('Por favor insere o nome do clube.');
      return;
    }

    // Determine initial roster
    let initialRoster: Player[] = [];
    let initialStaff: any[] = [];
    if (copyFromTeamId !== 'none') {
      const sourceTeam = teams.find((t) => t.id === copyFromTeamId);
      if (sourceTeam) {
        // Clone players and staff with new IDs
        initialRoster = sourceTeam.roster.map((p) => ({
          ...p,
          id: uid()
        }));
        initialStaff = (sourceTeam.staffMembers || []).map((s) => ({
          ...s,
          id: uid()
        }));
      }
    }

    const newTeamProfile: SquadProfile = {
      id: uid(),
      clubName: newClubName.trim(),
      category: newCategory.trim() || 'Sub-19',
      season: newSeason.trim() || defaultSeason(),
      clubLogoUrl: newLogoUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
      roster: initialRoster,
      staffMembers: initialStaff,
      matches: [],
      trainings: [],
      schedule: [],
      tactics: [],
      tacticFormat: 11
    };

    // Save current active team data
    const updatedTeams = teams.map((t) => {
      if (t.id === state.activeTeamId) {
        return {
          ...t,
          clubName: state.myClubName,
          clubLogoUrl: state.clubLogoUrl,
          category: state.category || t.category || 'Sub-19',
          season: state.season || t.season || defaultSeason(),
          roster: state.roster,
          staffMembers: state.staffMembers || [],
          matches: state.matches,
          trainings: state.trainings,
          schedule: state.schedule,
          tactics: state.tactics,
          tacticFormat: state.tacticFormat
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
      matches: [],
      trainings: [],
      schedule: [],
      tactics: [],
      tacticFormat: 11
    });

    setIsCreating(false);
    setNewClubName('');
    setNewLogoUrl('');
    onShowToast(`Nova equipa "${newTeamProfile.clubName}" criada e ativada! 🎉`);
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
    onShowToast('Dados da equipa atualizados! ✓');
  };

  const handleDeleteTeam = (teamId: string) => {
    const target = teams.find((t) => t.id === teamId);
    const targetName = target ? target.clubName : 'Equipa';

    onShowConfirm(
      `Tens a certeza que queres apagar "${targetName}"? Esta ação elimina todos os seus jogos e registos.`,
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
          onShowToast(`Equipa "${targetName}" apagada.`);
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
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className={`modal card ${activeTab === 'team_database' ? 'max-w-5xl' : 'max-w-lg'} w-full max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto bg-slate-950 border-t sm:border border-cyan-500/40 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 text-left pb-[max(1.5rem,env(safe-area-inset-bottom))] scrollbar-thin transition-all`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
          <div className="font-['Chakra_Petch'] font-bold text-base text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <span>🗃️</span>
            <span>Base de Dados & Equipas</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 text-lg transition-colors">
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="ui-card flex items-center gap-1.5 p-1 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('team_database')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'team_database'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>📊</span>
            <span>Base de Dados da Equipa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'teams'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>👥</span>
            <span>Equipas & Épocas</span>
          </button>
        </div>

        {activeTab === 'team_database' ? (
          <TeamDatabaseView state={state} onShowToast={onShowToast} onShowConfirm={onShowConfirm} />
        ) : !isCreating ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-300">
                {teams.length} {teams.length === 1 ? 'Equipa Registada' : 'Equipas / Épocas Registadas'}
              </span>
              <button
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase transition-all hover:brightness-110 active:scale-95"
                onClick={() => setIsCreating(true)}
              >
                + Nova Equipa / Época
              </button>
            </div>

            {/* Quick Data Import Hub */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setShowImportPlayers(true)}
                className="ui-btn ui-btn-secondary p-2.5 text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👥</span>
                  <div>
                    <div className="text-[11px] font-bold text-white font-['Chakra_Petch'] uppercase group-hover:text-cyan-300 transition-colors">
                      Importar Plantel Excel
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">Ficheiro .xlsx com atletas</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowImportMatches(true)}
                className="ui-btn ui-btn-secondary p-2.5 text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">⚽</span>
                  <div>
                    <div className="text-[11px] font-bold text-white font-['Chakra_Petch'] uppercase group-hover:text-cyan-300 transition-colors">
                      Importar Jogos Excel
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">Resultados e jornadas</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Old list-style Excel imports with invented scorers/starters: offer to clean them */}
            {inventedImports.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-100 space-y-2">
                <div className="font-bold">
                  ⚠️ {inventedImports.length}{' '}
                  {inventedImports.length === 1 ? 'jogo importado tem' : 'jogos importados têm'} marcadores e titulares
                  inventados
                </div>
                <div className="text-[11px] text-amber-200/80">
                  Uma versão antiga da importação por Excel inventava marcadores, minutos e titulares. A limpeza mantém
                  o resultado e retira só esses dados.
                </div>
                <ul className="text-[11px] font-mono text-amber-200/90">
                  {inventedImports.map((m) => (
                    <li key={m.id}>
                      {m.date} · vs {m.opponent}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() =>
                    onShowConfirm(
                      `Limpar marcadores, minutos e titulares inventados de ${inventedImports.length} jogo(s)? O resultado mantém-se.`,
                      () => {
                        const ids = new Set(inventedImports.map((m) => m.id));
                        onUpdateState({
                          matches: (state.matches || []).map((m) => (ids.has(m.id) ? removeInventedImportData(m) : m))
                        });
                        onShowToast(`🧹 ${ids.size} jogo(s) limpos.`);
                      }
                    )
                  }
                  className="ui-btn ui-btn-warning px-3 py-1.5"
                >
                  Limpar dados inventados
                </button>
              </div>
            )}

            {/* List of Teams/Squads */}
            <div className="space-y-3">
              {teams.map((team) => {
                const isActive = team.id === state.activeTeamId;
                const isEditing = editingTeamId === team.id;

                // Active Team details
                const currentClubName = isActive ? state.myClubName : team.clubName;
                const currentCategory = isActive ? state.category || team.category : team.category;
                const currentSeason = isActive ? state.season || team.season : team.season;

                // 1. Resolver Jogos Agendados da Equipa
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
                    <div key={team.id} className="ui-card p-3 space-y-2">
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

                      <div className="flex gap-2 pt-1">
                        <button
                          className="ui-btn ui-btn-primary flex-1 py-1.5 text-xs"
                          onClick={() => handleSaveEdit(team.id)}
                        >
                          Guardar Alterações
                        </button>
                        <button
                          className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
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
                    className={`p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-['Chakra_Petch'] text-sm text-white uppercase">
                            {currentClubName}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 text-[10px] font-mono uppercase">
                              ✓ Ativa no momento
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">
                            {currentCategory || 'Sub-19'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono">
                            Época {currentSeason || defaultSeason()}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 mt-2 flex gap-3 flex-wrap items-center">
                          <span className="flex items-center gap-1">
                            <span>👥</span>
                            <strong
                              className={
                                currentRosterLen > 0 ? 'text-cyan-300 font-bold' : 'text-slate-500 font-normal'
                              }
                            >
                              {currentRosterLen}
                            </strong>
                            <span>{currentRosterLen === 1 ? 'Jogador' : 'Jogadores'}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1">
                              <span>⚽</span>
                              <strong
                                className={
                                  totalMatchesLen > 0 ? 'text-cyan-300 font-bold' : 'text-slate-500 font-normal'
                                }
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

                      <div className="flex flex-col gap-1.5 text-right">
                        {!isActive ? (
                          <button
                            className="ui-btn ui-btn-primary px-3 py-1 text-xs"
                            onClick={() => handleSwitchTeam(team.id)}
                          >
                            Ativar ➔
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-cyan-400/80">(Em Utilização)</span>
                        )}

                        <div className="flex gap-1 justify-end mt-1">
                          <button
                            className="ui-btn ui-btn-secondary p-1 text-xs"
                            title="Editar Dados"
                            onClick={() => handleStartEdit(team)}
                          >
                            ✏️
                          </button>
                          <button
                            className="ui-btn ui-btn-secondary p-1 text-xs"
                            title="Duplicar para Nova Época"
                            onClick={() => handleDuplicateToNewSeason(team)}
                          >
                            📋
                          </button>
                          <button
                            className="ui-btn ui-btn-secondary p-1 text-xs"
                            title="Apagar Equipa"
                            onClick={() => handleDeleteTeam(team.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Create New Team Form */
          <form onSubmit={handleCreateTeam} className="space-y-3">
            <div className="font-['Chakra_Petch'] font-bold text-sm text-cyan-300 uppercase pb-1 border-b border-cyan-500/20">
              ➕ Registar Nova Equipa ou Época
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-mono">Nome da Equipa / Clube *</label>
              <input
                type="text"
                required
                placeholder="Ex: GD São Roque, SL Benfica Sub-19..."
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                className="ui-input w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-mono">Categoria / Escalão</label>
                <input
                  type="text"
                  placeholder="Ex: Sub-19, Seniores, Sub-17..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="ui-input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 font-mono">Época Desportiva</label>
                <input
                  type="text"
                  placeholder="Ex: 2025/2026"
                  value={newSeason}
                  onChange={(e) => setNewSeason(e.target.value)}
                  className="ui-input w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-mono">URL do Logo / Emblema (Opcional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={newLogoUrl}
                onChange={(e) => setNewLogoUrl(e.target.value)}
                className="ui-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-mono">Início de Plantel</label>
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

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase hover:brightness-110 active:scale-95"
              >
                Criar e Ativar Equipa 🚀
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary px-4 py-2 text-xs"
                onClick={() => setIsCreating(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Import Excel Players Modal */}
      <ImportExcelPlayersModal
        isOpen={showImportPlayers}
        onClose={() => setShowImportPlayers(false)}
        state={state}
        onUpdateState={onUpdateState}
        onShowToast={onShowToast}
      />

      {/* Import Excel Matches Modal */}
      <ImportMatchExcelModal
        isOpen={showImportMatches}
        onClose={() => setShowImportMatches(false)}
        state={state}
        onUpdateState={onUpdateState}
        onShowToast={onShowToast}
      />
    </div>
  );
};

export default DatabaseModal;
