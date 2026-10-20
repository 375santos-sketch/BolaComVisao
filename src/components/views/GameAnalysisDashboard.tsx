import React, { useState, useMemo } from 'react';
import { AppState } from '../../types';
import { t } from '../../i18n/dict';
import { Header } from '../Header';
import {
  AnalysisFilters as IAnalysisFilters,
  AggregatedAnalysis,
  TimePeriodStat,
  StandardGoalType,
  computeGameAnalysis,
  buildCoachReport,
  computeTopScorersAndAssisters,
  CATEGORY_DEFAULT_HALF_DURATION
} from '../../lib/gameAnalysis';
import {
  SimplifiedOverview,
  InsightsSection,
  AnalysisFilters,
  AnalysisSummaryCards,
  GoalTypesChart,
  GoalTimingChart,
  CornersAnalysis,
  FoulsAnalysis,
  CardsAnalysis,
  MatchComparison,
  PlayerAnalysis,
  EventDrilldown,
  AnalysisExport,
  CoachReportModal,
  AskDataSection
} from './gameAnalysis';
import { generateGameAnalysisPDF } from '../../lib/pdfUtils';
import { exportGameAnalysisExcel } from '../../lib/exportUtils';
import { CoachDashboardView } from './coach/CoachDashboardView';

interface GameAnalysisDashboardProps {
  state: AppState;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowToast: (msg: string) => void;
}

export type AnalysisTab =
  'perguntas' | 'dashboard' | 'periodos' | 'origem' | 'bolas_paradas' | 'confronto' | 'acontecimentos' | 'individual';

export const GameAnalysisDashboard: React.FC<GameAnalysisDashboardProps> = ({
  state,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowToast
}) => {
  // Mode: 'simplified' (iPhone / Quick overview as requested), 'coach' (Executive Coach 10s view), or 'detailed' (exploratory deep-dive)
  const [viewMode, setViewMode] = useState<'simplified' | 'coach' | 'detailed'>('simplified');
  // Navigation tab for detailed mode
  const [activeTab, setActiveTab] = useState<AnalysisTab>('periodos');
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showCoachReportModal, setShowCoachReportModal] = useState<boolean>(false);

  // Category-based default duration
  const categoryDefaultHalfDuration = useMemo(() => {
    const cat = (state.category || '').toLowerCase();
    for (const [key, duration] of Object.entries(CATEGORY_DEFAULT_HALF_DURATION)) {
      if (cat.includes(key)) return duration;
    }
    return 30; // default Sub-11
  }, [state.category]);

  // Filters State
  const [filters, setFilters] = useState<IAnalysisFilters>({
    matchId: 'todos',
    month: 'todos',
    season: state.season || 'todas',
    opponent: 'todos',
    matchType: 'todos',
    location: 'todos',
    eventType: 'todos',
    searchQuery: '',
    halfDurationMinutes: categoryDefaultHalfDuration
  });

  // Modal inspection for selected period
  const [selectedPeriodModal, setSelectedPeriodModal] = useState<TimePeriodStat | null>(null);

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');

  // Dynamic filter options extracted from existing matches
  const availableSeasons = useMemo(() => {
    const set = new Set<string>();
    (state.matches || []).forEach((m) => {
      if (m.season) set.add(m.season);
    });
    if (state.seasons) {
      state.seasons.forEach((s) => set.add(s.name));
    }
    return Array.from(set);
  }, [state.matches, state.seasons]);

  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    (state.matches || []).forEach((m) => {
      if (m.date && m.date.length >= 7) {
        const yyyymm = m.date.slice(0, 7);
        if (!map.has(yyyymm)) {
          const [y, mth] = yyyymm.split('-');
          const dateObj = new Date(parseInt(y, 10), parseInt(mth, 10) - 1, 1);
          const monthName = dateObj.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
          map.set(yyyymm, monthName.charAt(0).toUpperCase() + monthName.slice(1));
        }
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [state.matches]);

  const availableOpponents = useMemo(() => {
    const set = new Set<string>();
    (state.matches || []).forEach((m) => {
      if (m.opponent && m.opponent.trim()) {
        set.add(m.opponent.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [state.matches]);

  // Aggregated calculations computed with modular engine
  const analysis: AggregatedAnalysis = useMemo(() => {
    return computeGameAnalysis(state.matches || [], filters, state.category, state.roster || []);
  }, [state.matches, filters, state.category, state.roster]);

  // Coach Report data model
  const coachReportData = useMemo(() => {
    return buildCoachReport(
      analysis,
      state.matches || [],
      filters.season || state.season || 'todas',
      state.category || ''
    );
  }, [analysis, state.matches, filters.season, state.season, state.category]);

  const { topScorers: coachTopScorers, topAssisters: coachTopAssisters } = useMemo(() => {
    return computeTopScorersAndAssisters(state.matches || [], state.roster || []);
  }, [state.matches, state.roster]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let cnt = 0;
    if (filters.matchId !== 'todos') cnt++;
    if (filters.month !== 'todos') cnt++;
    if (filters.season !== 'todas' && filters.season !== '') cnt++;
    if (filters.opponent !== 'todos') cnt++;
    if (filters.matchType !== 'todos') cnt++;
    if (filters.location !== 'todos') cnt++;
    if (filters.eventType !== 'todos') cnt++;
    if (filters.searchQuery && filters.searchQuery.trim()) cnt++;
    if (filters.halfDurationMinutes && filters.halfDurationMinutes !== categoryDefaultHalfDuration) cnt++;
    return cnt;
  }, [filters, categoryDefaultHalfDuration]);

  const handleFilterChange = (updated: Partial<IAnalysisFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({
      matchId: 'todos',
      month: 'todos',
      season: 'todas',
      opponent: 'todos',
      matchType: 'todos',
      location: 'todos',
      eventType: 'todos',
      searchQuery: '',
      halfDurationMinutes: categoryDefaultHalfDuration
    });
    onShowToast('Filtros repostos para todos os jogos ✓');
  };

  // Export handlers
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      await generateGameAnalysisPDF(analysis, filters, state);
      onShowToast('Relatório de Análise exportado em PDF (BolaComVisao)! 📄✓');
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao exportar PDF de Análise.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await exportGameAnalysisExcel(analysis, filters, state);
      onShowToast('Estatísticas exportadas em Excel (.xlsx)! 📊✓');
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao exportar Excel de Análise.');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenMatch = (matchId: string) => {
    onNavigate('calendario', matchId);
  };

  const handleOpenPlayer = (playerId: string) => {
    onNavigate('atletas', playerId);
  };

  const handleSelectGoalType = (type: StandardGoalType) => {
    // Map standard goal type to event filter
    if (type === 'Bola jogada') handleFilterChange({ eventType: 'golos_bola_jogada' });
    else if (type === 'Canto') handleFilterChange({ eventType: 'golos_canto' });
    else if (type === 'Livre') handleFilterChange({ eventType: 'golos_livre' });
    else if (type === 'Penálti') handleFilterChange({ eventType: 'golos_penalti' });
    else if (type === 'Recuperação de bola') handleFilterChange({ eventType: 'golos_recuperacao' });
    else if (type === 'Pontapé de baliza') handleFilterChange({ eventType: 'golos_pontape_baliza' });
    else if (type === 'Ressalto') handleFilterChange({ eventType: 'golos_ressalto' });
    else handleFilterChange({ eventType: 'golos' });

    setViewMode('detailed');
    setActiveTab('acontecimentos');
    onShowToast(`A filtrar por golos de: ${type} ⚽`);
  };

  return (
    <div className="pb-28 animate-fadeIn max-w-6xl mx-auto px-2 sm:px-4" id="game-analysis-dashboard">
      <Header
        title="Análise dos Jogos"
        subtitle="Indicadores estatísticos, eficácia temporal e métricas competitivas"
        lang={state.lang}
        onGoHome={() => onNavigate('home')}
        onOpenSettings={onOpenSettings}
        onOpenDatabase={() => onNavigate('teams')}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
        syncInfo={state.syncInfo}
        clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
      />

      {/* TOP VIEW MODE TOGGLE & QUICK ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 bg-slate-900/70 border border-slate-800 p-2 rounded-3xl shadow-md">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('simplified')}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'simplified'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>📱 Análise</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('coach')}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'coach'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>🧠 Visão do Treinador</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('detailed')}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'detailed'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>📊 Análise Detalhada</span>
          </button>

          {/* BOTÃO RELATÓRIO DO TREINADOR NA BARRA DE TOPO */}
          <button
            type="button"
            onClick={() => setShowCoachReportModal(true)}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-500/40 text-cyan-300 hover:text-white cursor-pointer"
          >
            <span>📄 Relatório PDF/MD</span>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exporting}
            className="text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors font-bold border border-slate-700/50 cursor-pointer disabled:opacity-50"
            title="Exportar Relatório PDF"
          >
            <span>📄</span>
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors font-bold border border-slate-700/50 cursor-pointer disabled:opacity-50"
            title="Exportar Excel"
          >
            <span>📊</span>
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR COMPONENT (Only shown in detailed mode) */}
      {viewMode === 'detailed' && (
        <AnalysisFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          availableSeasons={availableSeasons}
          availableMonths={availableMonths}
          availableOpponents={availableOpponents}
          activeFiltersCount={activeFiltersCount}
          showPanel={showFilterPanel}
          onTogglePanel={() => setShowFilterPanel(!showFilterPanel)}
          categoryDefaultHalfDuration={categoryDefaultHalfDuration}
        />
      )}

      {/* 0. VISÃO DO TREINADOR (DASHBOARD EXECUTIVO 10S COM FILTROS E CONCLUSÕES REAIS) */}
      {viewMode === 'coach' && (
        <CoachDashboardView
          state={state}
          onNavigate={onNavigate}
          onOpenDetailedAnalysis={(subTab) => {
            setViewMode('detailed');
            if (subTab) {
              setActiveTab(subTab as AnalysisTab);
            }
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* 1. VISÃO SIMPLIFICADA (ESTRUTURA COMPACTA & IPHONE: 4 CARDS, COMO MARCAMOS/SOFREMOS, QUANDO, INSIGHTS E VER DETALHADA) */}
      {viewMode === 'simplified' && (
        <SimplifiedOverview
          analysis={analysis}
          players={state.roster}
          myClub={myClub}
          filters={filters}
          onFilterChange={handleFilterChange}
          availableSeasons={availableSeasons}
          onOpenPlayer={handleOpenPlayer}
          onSelectGoalType={handleSelectGoalType}
          onOpenDetailedAnalysis={() => setViewMode('detailed')}
          onOpenCoachReport={() => setShowCoachReportModal(true)}
        />
      )}

      {/* 2. ANÁLISE DETALHADA (MODO EXPLORADOR COMPLETO) */}
      {viewMode === 'detailed' && (
        <div className="space-y-6">
          {/* NAVIGATION TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'perguntas', label: '💬 Perguntar aos Dados', count: 'Novo' },
              { id: 'periodos', label: '⏱️ Períodos Minuto a Minuto', count: null },
              {
                id: 'origem',
                label: '⚽ Origem dos Golos',
                count: `${analysis.goalsScored} / ${analysis.goalsConceded}`
              },
              { id: 'bolas_paradas', label: '🚩 Bolas Paradas & Faltas', count: null },
              {
                id: 'confronto',
                label: '⚔️ Adversários & Confronto Direto',
                count: `${analysis.opponentStats.length}`
              },
              { id: 'acontecimentos', label: '📋 Registo Integral de Lances', count: `${analysis.allEvents.length}` },
              { id: 'individual', label: '👤 Estatísticas Individuais', count: null },
              { id: 'dashboard', label: '📈 Indicadores de Performance', count: null }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AnalysisTab)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${
                      activeTab === tab.id ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* TAB 0: PERGUNTAR AOS DADOS (AI / STATISTICAL NATURAL LANGUAGE ENGINE) */}
          {activeTab === 'perguntas' && (
            <div className="space-y-6">
              <AskDataSection state={state} />
            </div>
          )}

          {/* TAB 1: PERÍODOS DE JOGO */}
          {activeTab === 'periodos' && (
            <div className="space-y-6">
              <GoalTimingChart analysis={analysis} onSelectPeriod={(p) => setSelectedPeriodModal(p)} />
            </div>
          )}

          {/* TAB 2: ORIGEM DOS GOLOS */}
          {activeTab === 'origem' && (
            <div className="space-y-6">
              <GoalTypesChart analysis={analysis} onSelectGoalType={handleSelectGoalType} />
            </div>
          )}

          {/* TAB 3: BOLAS PARADAS & DISCIPLINA */}
          {activeTab === 'bolas_paradas' && (
            <div className="space-y-6">
              <CornersAnalysis analysis={analysis} />
              <FoulsAnalysis analysis={analysis} />
              <CardsAnalysis analysis={analysis} />
            </div>
          )}

          {/* TAB 4: CONFRONTO DIRETO & GUIA DE FORMA */}
          {activeTab === 'confronto' && (
            <div className="space-y-6">
              <MatchComparison analysis={analysis} onOpenMatch={handleOpenMatch} />
            </div>
          )}

          {/* TAB 5: REGISTO CRONOLÓGICO DE ACONTECIMENTOS */}
          {activeTab === 'acontecimentos' && (
            <div className="space-y-6">
              <EventDrilldown analysis={analysis} players={state.roster} onOpenMatch={handleOpenMatch} />
            </div>
          )}

          {/* TAB 6: ESTATÍSTICAS INDIVIDUAIS */}
          {activeTab === 'individual' && (
            <div className="space-y-6">
              <PlayerAnalysis
                analysis={analysis}
                players={state.roster}
                matches={state.matches}
                clubName={state.myClubName}
                category={state.category}
                season={state.season}
                onOpenPlayer={handleOpenPlayer}
              />
            </div>
          )}

          {/* TAB 7: INDICADORES GERAIS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <InsightsSection insights={analysis.insights} />
              <AnalysisSummaryCards analysis={analysis} myClub={myClub} />
            </div>
          )}

          {/* EXPORT PANEL AT BOTTOM OF DETAILED VIEW */}
          <AnalysisExport
            analysis={analysis}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            exporting={exporting}
          />
        </div>
      )}

      {/* MODAL: RELATÓRIO DO TREINADOR */}
      {showCoachReportModal && (
        <CoachReportModal
          report={coachReportData}
          clubName={myClub}
          category={state.category || ''}
          onClose={() => setShowCoachReportModal(false)}
          onPrint={handleExportPDF}
          topScorers={coachTopScorers}
          topAssisters={coachTopAssisters}
        />
      )}

      {/* MODAL: DRILLDOWN DE PERÍODO ESPECÍFICO */}
      {selectedPeriodModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div>
                <h4 className="text-base font-['Chakra_Petch'] font-bold text-white flex items-center gap-2">
                  <span>⏱️</span>
                  <span>Período: {selectedPeriodModal.label}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Marcados: <strong className="text-emerald-400">{selectedPeriodModal.scored}</strong> • Sofridos:{' '}
                  <strong className="text-rose-400">{selectedPeriodModal.conceded}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPeriodModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedPeriodModal.scoredEvents.length === 0 && selectedPeriodModal.concededEvents.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">Nenhum golo registado neste período.</div>
            ) : (
              <div className="space-y-2">
                {selectedPeriodModal.scoredEvents.map((ev, i) => (
                  <div
                    key={`sc-${i}`}
                    className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-1 rounded-lg">
                        {ev.goal.minute ? `${ev.goal.minute}'` : '—'}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>⚽ Golo Marcado</span>
                          {ev.goal.goalType && (
                            <span className="text-[10px] text-emerald-300 font-normal">({ev.goal.goalType})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          vs {ev.match.opponent} ({ev.match.date})
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedPeriodModal.concededEvents.map((ev, i) => (
                  <div
                    key={`co-${i}`}
                    className="bg-slate-950/70 border border-rose-500/30 rounded-2xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/50 border border-rose-500/30 px-2 py-1 rounded-lg">
                        {ev.goal.minute ? `${ev.goal.minute}'` : '—'}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>🥅 Golo Sofrido</span>
                          {ev.goal.goalType && (
                            <span className="text-[10px] text-rose-300 font-normal">({ev.goal.goalType})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          vs {ev.match.opponent} ({ev.match.date})
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSelectedPeriodModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
