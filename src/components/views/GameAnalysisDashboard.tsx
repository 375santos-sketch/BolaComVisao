import React, { useState, useMemo } from 'react';
import { datePT } from '../../lib/planningSummary';
import { TrendsSection } from '../trends/TeamTrends';
import { seasonMatches } from '../../lib/homeSummary';
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
  CoachReportModal,
  AskDataSection
} from './gameAnalysis';
import { withRosterIds } from '../../lib/eventPlayers';
import { CoachDashboardView } from './coach/CoachDashboardView';
import { RankingTable } from './gameAnalysis/RankingTable';
import { ShotsSection } from './gameAnalysis/ShotsSection';
import { PlayingTimeSection } from './stats/PlayingTimeSection';
import { StatsPanel } from '../stats/StatsPanel';
import { goalRanking } from '../../lib/goalRanking';

interface GameAnalysisDashboardProps {
  state: AppState;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowToast: (msg: string) => void;
  /** Saves the 1st-half starters of an old game (minutes table), as in Estatísticas. */
  onUpdateState?: (updates: Partial<AppState>) => void;
  /** Which part opens first: Equipa, Atletas (from "Estatísticas") or Jogos. */
  initialSection?: 'equipa' | 'atletas' | 'jogos';
}

export type AnalysisTab =
  'perguntas' | 'dashboard' | 'periodos' | 'origem' | 'bolas_paradas' | 'confronto' | 'acontecimentos' | 'individual';

export const GameAnalysisDashboard: React.FC<GameAnalysisDashboardProps> = ({
  state,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowToast,
  onUpdateState,
  initialSection = 'equipa'
}) => {
  // One Análise: Equipa · Atletas · Jogos, with the same filters for all
  const [section, setSection] = useState<'equipa' | 'atletas' | 'jogos' | 'relatorios'>(initialSection);
  const [showAsk, setShowAsk] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showExport, setShowExport] = useState(false);
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
    return computeGameAnalysis(
      withRosterIds(state.matches || [], state.roster || []),
      filters,
      state.category,
      state.roster || []
    );
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

  const ranking = useMemo(
    () => goalRanking(analysis.filteredMatches, state.roster || []),
    [analysis.filteredMatches, state.roster]
  );

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

  // Export handlers: the "Painel de jogos" (PDF and Excel with native charts) for the games of the current filters.
  const selection = () => {
    const d = (iso: string) => iso.split('-').reverse().join('/');
    const parts: string[] = [];
    const m = filters.matchId !== 'todos' ? (state.matches || []).find((x) => x.id === filters.matchId) : undefined;
    if (m) parts.push(`Jogo: ${d(m.date)} vs ${m.opponent}`);
    if (filters.opponent !== 'todos') parts.push(`Confronto: ${filters.opponent}`);
    if (filters.season && filters.season !== 'todas') parts.push(`Época ${filters.season}`);
    if (filters.month !== 'todos') parts.push(`Mês ${filters.month.split('-').reverse().join('/')}`);
    if (filters.matchType !== 'todos')
      parts.push(filters.matchType.charAt(0).toUpperCase() + filters.matchType.slice(1));
    if (filters.location !== 'todos') parts.push(filters.location === 'fora' ? 'Fora' : 'Casa');
    return { games: analysis.filteredMatches, label: parts.length ? parts.join(' · ') : 'Todos os jogos' };
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const { generateGamesDashboardPDF } = await import('../../lib/pdf/createGamesDashboard');
      await generateGamesDashboardPDF(state, selection());
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
      const { exportGamesDashboardExcel } = await import('../../lib/gamesDashboardExcel');
      const name = exportGamesDashboardExcel(state, selection());
      onShowToast(`Excel com gráficos gerado: ${name} 📊✓`);
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

    setSection('jogos');
    onShowToast(`A filtrar por golos de: ${type} ⚽`);
  };

  return (
    <div className="analysis-360 pb-28 animate-fadeIn max-w-6xl mx-auto px-2 sm:px-4" id="game-analysis-dashboard">
      <Header
        title="Análise"
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

      {/* Análise 360°: the title over the stadium, and Exportar always at hand */}
      <div className="squad-hero analysis-hero mb-3 !flex-row !items-end">
        <div className="min-w-0 flex-1">
          <h2 className="bcv-title text-[28px] sm:text-[36px]">
            Análise <span className="analysis-360-mark">360°</span>
          </h2>
          <p className="truncate text-ui-caption text-ui-muted">
            {[
              myClub,
              state.category,
              state.season ? `Época ${state.season}` : '',
              `${analysis.filteredMatches.length} jogos`
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-expanded={showExport}
            onClick={() => setShowExport((v) => !v)}
            className="ui-btn ui-btn-secondary w-full px-3 py-2 text-ui-caption"
          >
            ⤓ Exportar
          </button>
          {showExport && (
            <div className="ui-card absolute right-0 top-11 z-30 w-56 space-y-1 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
              <button
                type="button"
                disabled={exporting}
                onClick={() => {
                  setShowExport(false);
                  handleExportPDF();
                }}
                className="w-full rounded-ui-sm px-3 py-2 text-left text-ui-body text-ui-text hover:bg-ui-surface-2"
              >
                Exportar PDF ({analysis.filteredMatches.length} jogos)
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => {
                  setShowExport(false);
                  handleExportExcel();
                }}
                className="w-full rounded-ui-sm px-3 py-2 text-left text-ui-body text-ui-text hover:bg-ui-surface-2"
              >
                Exportar Excel
              </button>
            </div>
          )}
        </div>
      </div>

      <div role="group" aria-label="Partes da análise" className="analysis-tabs mb-3">
        {(
          [
            ['equipa', 'Visão geral'],
            ['atletas', 'Atletas'],
            ['jogos', 'Jogos'],
            ['relatorios', 'Relatórios']
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={section === id}
            onClick={() => setSection(id)}
            className={section === id ? 'is-on' : ''}
          >
            {label}
          </button>
        ))}
      </div>

      {/* The same filters for every part (and for the exports) */}
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

      {section === 'equipa' && (
        <div className="space-y-5">
          <AnalysisSummaryCards analysis={analysis} myClub={myClub} />
          <TrendsSection matches={seasonMatches(state)} onPlan={() => onNavigate('treinos')} />
          <InsightsSection insights={analysis.insights} />
          <GoalTimingChart analysis={analysis} onSelectPeriod={(p) => setSelectedPeriodModal(p)} />
          <GoalTypesChart analysis={analysis} onSelectGoalType={handleSelectGoalType} />
          <ShotsSection matches={analysis.filteredMatches} />
          <CornersAnalysis analysis={analysis} />
          <FoulsAnalysis analysis={analysis} />
          <CardsAnalysis analysis={analysis} />
          <details className="ui-card p-4">
            <summary className="cursor-pointer text-ui-body font-bold text-ui-text">
              Visão do treinador (resumo de 10 segundos)
            </summary>
            <div className="mt-3">
              <CoachDashboardView
                state={state}
                onNavigate={onNavigate}
                onOpenDetailedAnalysis={(subTab) =>
                  setSection(subTab === 'individual' ? 'atletas' : subTab === 'confronto' ? 'jogos' : 'equipa')
                }
                onShowToast={onShowToast}
              />
            </div>
          </details>
        </div>
      )}

      {section === 'atletas' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <RankingTable
              title="Melhores marcadores"
              unit="golos"
              rows={ranking.scorers}
              onOpenPlayer={handleOpenPlayer}
            />
            <RankingTable
              title="Assistências"
              unit="assistências"
              rows={ranking.assists}
              onOpenPlayer={handleOpenPlayer}
            />
          </div>
          <PlayingTimeSection
            matches={analysis.filteredMatches}
            roster={state.roster || []}
            category={state.category}
            onSetStarters={
              onUpdateState
                ? (matchId, lineup) => {
                    onUpdateState({ matches: state.matches.map((m) => (m.id === matchId ? { ...m, lineup } : m)) });
                    onShowToast('Titulares da 1.ª parte guardados: minutos recalculados ✓');
                  }
                : undefined
            }
          />
          <PlayerAnalysis analysis={analysis} players={state.roster} onOpenPlayer={handleOpenPlayer} />
        </div>
      )}

      {section === 'relatorios' && (
        <div className="space-y-3">
          {/* Everything that comes out of the analysis, in one place */}
          <section aria-label="Relatórios" className="space-y-2">
            {(
              [
                [
                  '✦',
                  'Perguntar aos dados',
                  '«Quem marcou mais fora?» · respostas com os jogos guardados',
                  () => setShowAsk((v) => !v)
                ],
                ['📋', 'Relatório do treinador', 'Conclusões da época em texto', () => setShowCoachReportModal(true)],
                [
                  '▦',
                  'Abrir painel',
                  'Equipa ou atleta, por jogo, confronto, fase, época ou período · Power BI',
                  () => setShowPanel(true)
                ]
              ] as const
            ).map(([icon, title, detail, run]) => (
              <button
                key={title}
                type="button"
                onClick={run}
                className="analysis-row"
                aria-pressed={title === 'Perguntar aos dados' ? showAsk : undefined}
              >
                <span aria-hidden className="analysis-row-icon">
                  {icon}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-ui-body text-ui-text">{title}</b>
                  <span className="block truncate text-ui-caption text-ui-muted">{detail}</span>
                </span>
                <span aria-hidden className="text-ui-brand">
                  ›
                </span>
              </button>
            ))}
            {showAsk && <AskDataSection state={state} />}
          </section>
          <section aria-label="Exportar" className="space-y-2">
            <h3 className="ui-kicker px-1">Exportar</h3>
            <button type="button" disabled={exporting} onClick={handleExportPDF} className="analysis-row">
              <span aria-hidden className="analysis-row-icon">
                ⤓
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-ui-body text-ui-text">PDF da análise</b>
                <span className="block text-ui-caption text-ui-muted">
                  {analysis.filteredMatches.length} jogos, com os filtros escolhidos
                </span>
              </span>
              <span aria-hidden className="text-ui-brand">
                ›
              </span>
            </button>
            <button type="button" disabled={exporting} onClick={handleExportExcel} className="analysis-row">
              <span aria-hidden className="analysis-row-icon">
                ⊞
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-ui-body text-ui-text">Excel</b>
                <span className="block text-ui-caption text-ui-muted">O mesmo ficheiro de sempre</span>
              </span>
              <span aria-hidden className="text-ui-brand">
                ›
              </span>
            </button>
          </section>
        </div>
      )}

      {section === 'jogos' && (
        <div className="space-y-5">
          <MatchComparison analysis={analysis} onOpenMatch={handleOpenMatch} />
          <EventDrilldown analysis={analysis} players={state.roster} onOpenMatch={handleOpenMatch} />
        </div>
      )}

      {showPanel && <StatsPanel state={state} onClose={() => setShowPanel(false)} onShowToast={onShowToast} />}

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
        <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="ui-card p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-ui-line">
              <div>
                <h4 className="text-base font-['Chakra_Petch'] font-bold text-ui-text flex items-center gap-2">
                  <span>⏱️</span>
                  <span>Período: {selectedPeriodModal.label}</span>
                </h4>
                <p className="text-xs text-ui-muted mt-0.5">
                  Marcados: <strong className="text-ui-success">{selectedPeriodModal.scored}</strong> • Sofridos:{' '}
                  <strong className="text-ui-danger">{selectedPeriodModal.conceded}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPeriodModal(null)}
                className="text-ui-muted hover:text-ui-text text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedPeriodModal.scoredEvents.length === 0 && selectedPeriodModal.concededEvents.length === 0 ? (
              <div className="text-center py-6 text-xs text-ui-muted">Nenhum golo registado neste período.</div>
            ) : (
              <div className="space-y-2">
                {selectedPeriodModal.scoredEvents.map((ev, i) => (
                  <div key={`sc-${i}`} className="ui-inset p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-ui-success bg-ui-success-soft border border-ui-success/30 px-2 py-1 rounded-lg">
                        {ev.goal.minute ? `${ev.goal.minute}'` : '—'}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-ui-text flex items-center gap-1.5">
                          <span>⚽ Golo Marcado</span>
                          {ev.goal.goalType && (
                            <span className="text-[10px] text-ui-success font-normal">({ev.goal.goalType})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-ui-muted">
                          vs {ev.match.opponent} ({datePT(ev.match.date)})
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedPeriodModal.concededEvents.map((ev, i) => (
                  <div key={`co-${i}`} className="ui-inset p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-ui-danger bg-ui-danger-soft border border-ui-danger/30 px-2 py-1 rounded-lg">
                        {ev.goal.minute ? `${ev.goal.minute}'` : '—'}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-ui-text flex items-center gap-1.5">
                          <span>🥅 Golo Sofrido</span>
                          {ev.goal.goalType && (
                            <span className="text-[10px] text-ui-danger font-normal">({ev.goal.goalType})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-ui-muted">
                          vs {ev.match.opponent} ({datePT(ev.match.date)})
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
                className="ui-btn ui-btn-secondary w-full py-2.5 text-xs"
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
