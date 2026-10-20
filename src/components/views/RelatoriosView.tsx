import React, { useState } from 'react';
import { AppState, ClubBoardSummary } from '../../types';
import { TabType } from '../Navbar';
import { Header } from '../Header';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { computeClubBoardSummary, exportTeamComparisonCSV } from '../../lib/reportEngine';
import { recordAuditLog } from '../../lib/auditEngine';

interface RelatoriosViewProps {
  state: AppState;
  onUpdateState?: (updates: Partial<AppState>) => void;
  onNavigate: (tab: TabType, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onOpenAdminUsers?: () => void;
  pendingUsersCount?: number;
  onShowToast?: (msg: string) => void;
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  state,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onOpenAdminUsers,
  pendingUsersCount = 0,
  onShowToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'equipa' | 'comparador'>('board');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(state.activeTeamId || state.teams[0]?.id || '');

  const boardSummary: ClubBoardSummary = computeClubBoardSummary(state);
  const teams = state.teams || [];
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  const handleExportPDF = async () => {
    try {
      const { generateClubBoardReportPDF } = await import('../../lib/pdfUtils');
      generateClubBoardReportPDF(state);
      recordAuditLog(
        state.currentUser,
        'report_export',
        'relatorio',
        `Exportou Relatório Institucional da Direção em PDF (${state.season || '2025/2026'})`
      );
      if (onShowToast) onShowToast('Relatório da Direção exportado com sucesso em PDF! 📄');
    } catch (e) {
      console.error(e);
      if (onShowToast) onShowToast('Erro ao gerar relatório PDF.');
    }
  };

  const handleExportCSV = () => {
    try {
      const csv = exportTeamComparisonCSV(boardSummary.teamsComparison);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Comparacao_Equipas_${state.myClubName || 'Clube'}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      recordAuditLog(
        state.currentUser,
        'report_export',
        'relatorio',
        `Exportou Comparação de Equipas em formato CSV / Excel`
      );
      if (onShowToast) onShowToast('Dados exportados em CSV / Excel! 📊');
    } catch (e) {
      console.error(e);
      if (onShowToast) onShowToast('Erro ao exportar CSV.');
    }
  };

  return (
    <div className="w-full flex flex-col pb-24 text-left select-none animate-fadeIn">
      {/* Header */}
      <Header
        title="Relatórios & Direção"
        currentTab="teams"
        onNavigate={onNavigate}
        onOpenSettings={onOpenSettings}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        onOpenAdminUsers={onOpenAdminUsers}
        pendingUsersCount={pendingUsersCount}
        syncInfo={state.syncInfo}
        currentUser={state.currentUser}
        clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
      />

      {/* Top Action & Sub-Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('board')}
            className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'board'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            📊 Visão Geral do Clube
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('equipa')}
            className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'equipa'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            🏟️ Relatório por Equipa
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('comparador')}
            className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'comparador'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            ⚖️ Comparador de Escalões
          </button>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="xs" icon={<span>📊</span>} onClick={handleExportCSV}>
            Exportar CSV
          </Button>
          <Button variant="primary" size="xs" icon={<span>📄</span>} onClick={handleExportPDF}>
            Exportar PDF Oficial
          </Button>
        </div>
      </div>

      {/* SUBTAB 1: BOARD / CONSOLIDATED DASHBOARD */}
      {activeSubTab === 'board' && (
        <div className="space-y-4">
          {/* Key Executive Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <StatCard
              title="Equipas"
              value={boardSummary.totalTeams}
              icon="🏟️"
              variant="cyan"
              subtitle="Escalões Ativos"
            />
            <StatCard
              title="Atletas"
              value={boardSummary.totalPlayers}
              icon="👥"
              variant="slate"
              subtitle="Total de Plantéis"
            />
            <StatCard
              title="Staff Técnico"
              value={boardSummary.totalStaff}
              icon="👔"
              variant="slate"
              subtitle="Treinadores e Apoio"
            />
            <StatCard
              title="Jogos Realizados"
              value={boardSummary.totalMatches}
              icon="⚽"
              variant="emerald"
              subtitle={`${boardSummary.overallWinRate}% Vitórias`}
            />
            <StatCard
              title="Sessões de Treino"
              value={boardSummary.totalTrainings}
              icon="🏃"
              variant="cyan"
              subtitle="Executados"
            />
            <StatCard
              title="Assiduidade Média"
              value={`${boardSummary.overallAttendanceRate}%`}
              icon="📈"
              variant={boardSummary.overallAttendanceRate >= 80 ? 'emerald' : 'amber'}
              subtitle="Geral do Clube"
            />
          </div>

          {/* Attention / Alerts from Directors Perspective */}
          {boardSummary.lowAttendanceTeams.length > 0 && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="text-xs font-bold font-['Chakra_Petch'] uppercase text-amber-300">
                  Atenção à Assiduidade nos Treinos
                </h4>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  As seguintes equipas apresentam uma taxa de presença inferior a 75%:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {boardSummary.lowAttendanceTeams.map((t, idx) => (
                    <Badge key={idx} variant="amber" size="xs">
                      {t.teamName}: {t.rate}%
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Teams Performance Grid */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>🏟️</span>
                <span>Desempenho por Escalão / Equipa</span>
              </CardTitle>
              <Badge variant="cyan" size="xs">
                {boardSummary.teamsComparison.length} Equipas
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {boardSummary.teamsComparison.map((m) => (
                  <div
                    key={m.teamId}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-white text-xs font-['Chakra_Petch'] uppercase truncate">
                          {m.teamName}
                        </h4>
                        <Badge variant="slate" size="xs">
                          {m.category}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 my-3 text-center">
                        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-mono">Jogos</div>
                          <div className="text-xs font-black font-mono text-white mt-0.5">
                            {m.totalMatches} ({m.wins}V)
                          </div>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-mono">Golos</div>
                          <div className="text-xs font-black font-mono text-cyan-300 mt-0.5">
                            {m.goalsScored}-{m.goalsConceded}
                          </div>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-mono">Presenças</div>
                          <div
                            className={`text-xs font-black font-mono mt-0.5 ${
                              m.avgAttendanceRate >= 80 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {m.avgAttendanceRate}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span>
                        {m.totalPlayers} atletas · {m.staffCount} staff
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeamId(m.teamId);
                          setActiveSubTab('equipa');
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                      >
                        Ver Detalhes →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUBTAB 2: DETAILED TEAM REPORT */}
      {activeSubTab === 'equipa' && (
        <div className="space-y-4">
          {/* Team selector */}
          <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold font-['Chakra_Petch'] uppercase text-slate-300 shrink-0">
              Selecionar Equipa:
            </label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-mono w-full max-w-xs focus:outline-none focus:border-cyan-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.clubName} - {t.category || 'Geral'} ({t.season || 'Atual'})
                </option>
              ))}
            </select>
          </div>

          {selectedTeam && (
            <div className="space-y-4">
              {/* Team Overview Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <CardTitle className="text-base text-cyan-400 font-black font-['Chakra_Petch'] uppercase">
                      {selectedTeam.clubName} · {selectedTeam.category || 'Sub-19'}
                    </CardTitle>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Época {selectedTeam.season || '2025/2026'} · {selectedTeam.roster?.length || 0} Atletas no Plantel
                    </p>
                  </div>
                  <Badge variant="cyan" size="sm">
                    {selectedTeam.staffMembers?.length || 0} Elementos Staff
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Jogos Concluídos</div>
                      <div className="text-base font-black font-mono text-white mt-1">
                        {(selectedTeam.matches || []).filter((m) => m.finished).length}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Golos Marcados / Sofridos</div>
                      <div className="text-base font-black font-mono text-emerald-400 mt-1">
                        {(selectedTeam.matches || []).reduce(
                          (a, m) => a + (m.goals || []).filter((g) => g.type === 'scored').length,
                          0
                        )}{' '}
                        -{' '}
                        {(selectedTeam.matches || []).reduce(
                          (a, m) => a + (m.goals || []).filter((g) => g.type === 'conceded').length,
                          0
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Treinos Realizados</div>
                      <div className="text-base font-black font-mono text-cyan-300 mt-1">
                        {(selectedTeam.trainings || []).length}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Próximos Compromissos</div>
                      <div className="text-base font-black font-mono text-amber-300 mt-1">
                        {(selectedTeam.schedule || []).length}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Roster & Technical Staff Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Plantel */}
                <Card>
                  <CardHeader className="pb-2 border-b border-slate-800 flex justify-between items-center">
                    <CardTitle className="text-xs font-['Chakra_Petch'] uppercase flex items-center gap-2">
                      <span>👥</span>
                      <span>Plantel de Atletas ({(selectedTeam.roster || []).length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 max-h-80 overflow-y-auto">
                    <div className="space-y-1.5 font-mono text-xs">
                      {(selectedTeam.roster || []).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-[10px] font-black flex items-center justify-center shrink-0">
                              {p.number || '•'}
                            </span>
                            <span className="font-bold text-white truncate">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-400">{p.positions}</span>
                            <Badge variant={p.status === 'lesionado' ? 'rose' : 'emerald'} size="xs">
                              {p.status || 'disponivel'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {(selectedTeam.roster || []).length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">Sem atletas registados nesta equipa.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Staff Técnico */}
                <Card>
                  <CardHeader className="pb-2 border-b border-slate-800 flex justify-between items-center">
                    <CardTitle className="text-xs font-['Chakra_Petch'] uppercase flex items-center gap-2">
                      <span>👔</span>
                      <span>Equipa Técnica ({(selectedTeam.staffMembers || []).length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 max-h-80 overflow-y-auto">
                    <div className="space-y-1.5 font-mono text-xs">
                      {(selectedTeam.staffMembers || []).map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800"
                        >
                          <div className="font-bold text-white truncate">{st.name}</div>
                          <Badge variant="cyan" size="xs">
                            {st.role}
                          </Badge>
                        </div>
                      ))}
                      {(selectedTeam.staffMembers || []).length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">Sem equipa técnica associada.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: COMPARISON TABLE */}
      {activeSubTab === 'comparador' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <CardTitle className="text-sm font-['Chakra_Petch'] uppercase flex items-center gap-2">
                <span>⚖️</span>
                <span>Tabela Comparativa de Escalões</span>
              </CardTitle>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Visão consolidada para acompanhamento técnico e pedagógico
              </p>
            </div>
            <Button variant="secondary" size="xs" icon={<span>📊</span>} onClick={handleExportCSV}>
              Descarregar Tabela
            </Button>
          </CardHeader>
          <CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-['Chakra_Petch'] uppercase bg-slate-900/80">
                  <th className="p-2.5">Equipa / Escalão</th>
                  <th className="p-2.5 text-center">Atletas</th>
                  <th className="p-2.5 text-center">Staff</th>
                  <th className="p-2.5 text-center">Jogos</th>
                  <th className="p-2.5 text-center">V-E-D</th>
                  <th className="p-2.5 text-center">% Vitórias</th>
                  <th className="p-2.5 text-center">Golos (M-S)</th>
                  <th className="p-2.5 text-center">Treinos</th>
                  <th className="p-2.5 text-center">Assiduidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {boardSummary.teamsComparison.map((m) => (
                  <tr key={m.teamId} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-2.5 font-bold text-white">{m.teamName}</td>
                    <td className="p-2.5 text-center text-slate-300">{m.totalPlayers}</td>
                    <td className="p-2.5 text-center text-slate-300">{m.staffCount}</td>
                    <td className="p-2.5 text-center text-slate-300">{m.totalMatches}</td>
                    <td className="p-2.5 text-center text-slate-300 font-mono">
                      {m.wins}-{m.draws}-{m.losses}
                    </td>
                    <td className="p-2.5 text-center font-bold text-cyan-300">{m.winRate}%</td>
                    <td className="p-2.5 text-center text-slate-300 font-mono">
                      {m.goalsScored}-{m.goalsConceded} ({m.goalDiff >= 0 ? `+${m.goalDiff}` : m.goalDiff})
                    </td>
                    <td className="p-2.5 text-center text-slate-300">{m.totalTrainings}</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`font-black ${
                          m.avgAttendanceRate >= 85
                            ? 'text-emerald-400'
                            : m.avgAttendanceRate >= 75
                              ? 'text-amber-400'
                              : 'text-rose-400'
                        }`}
                      >
                        {m.avgAttendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
