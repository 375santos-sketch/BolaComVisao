import React, { useState } from 'react';
import { AppState, Match, GoalEvent, CardEvent, SubEvent } from '../../types';
import { t } from '../../i18n/dict';
import { playerLabel, formatMinute, parseMinuteOrder, isSeasonMatching } from '../../lib/utils';
import { Header } from '../Header';
import { DeletedMatchesSection } from './results/DeletedMatchesSection';
import { ParentsShareModal } from './results/ParentsShareModal';
import { OpponentReportModal } from './results/OpponentReportModal';
import { hasReportNotes } from '../../lib/opponentReport';

interface ResultsViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast?: (msg: string) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowConfirm,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [seasonFilter, setSeasonFilter] = useState<string>('todas');
  const [shareMatch, setShareMatch] = useState<Match | null>(null);
  const [reportMatch, setReportMatch] = useState<Match | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [isGeneratingPdfId, setIsGeneratingPdfId] = useState<string | null>(null);

  if (!state.matches.length) {
    return (
      <div className="pb-28 animate-fadeIn">
        <Header
          title={t(state.lang, 'res_title')}
          lang={state.lang}
          currentTab="jogos"
          onNavigate={onNavigate}
          onGoHome={() => onNavigate('home')}
          onOpenSettings={onOpenSettings}
          onOpenDatabase={() => onNavigate('teams')}
          onOpenNotifications={onOpenNotifications}
          onOpenSync={onOpenSync}
          unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
          syncInfo={state.syncInfo}
          clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
        />

        {/* Sub-Navigation: Planeamento & Jogos */}
        <div className="grid grid-cols-3 gap-1 mb-4 p-1 bg-slate-900/90 border border-cyan-500/20 rounded-2xl shadow-sm text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => onNavigate('calendario')}
            className="py-2 px-1 rounded-xl text-cyan-300/70 hover:text-white hover:bg-slate-950/60 flex items-center justify-center gap-1.5 transition-all"
          >
            <span>📅</span>
            <span className="hidden sm:inline">Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('treinos')}
            className="py-2 px-1 rounded-xl text-cyan-300/70 hover:text-white hover:bg-slate-950/60 flex items-center justify-center gap-1.5 transition-all"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Treinos</span>
          </button>

          <button
            type="button"
            className="py-2 px-1 rounded-xl bg-cyan-500 text-slate-950 font-black flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,210,255,0.4)]"
          >
            <span>🏆</span>
            <span className="hidden sm:inline">Resultados</span>
          </button>
        </div>

        <div className="empty mt-10">{t(state.lang, 'res_none')}</div>
      </div>
    );
  }

  const seasonsList = Array.from(new Set(state.matches.map((m) => m.season || 'Sem época')))
    .sort()
    .reverse();
  const query = searchQuery.trim().toLowerCase();

  const filteredMatches = state.matches.filter((m) => {
    const matchesSeason = seasonFilter === 'todas' || isSeasonMatching(m.season, seasonFilter);
    const matchesQuery = !query || m.opponent.toLowerCase().includes(query);
    return matchesSeason && matchesQuery;
  });

  const getPlayerName = (id: string | null) => {
    if (!id || id === 'unknown' || id === 'none') return t(state.lang, 'match_nobody');
    if (id === 'autogolo' || id === 'auto_golo' || id === 'auto-golo') return 'Auto Golo';
    const p = state.roster.find((x) => x.id === id);
    return p ? playerLabel(p, t(state.lang, 'pl_no_name')) : '—';
  };

  const handleReopenMatch = (id: string) => {
    const updated = state.matches.map((m) => (m.id === id ? { ...m, finished: false } : m));
    onUpdateState({ matches: updated });
    onNavigate('jogo');
  };

  const handleDeleteMatch = (id: string) => {
    const updated = state.matches.filter((m) => m.id !== id);
    onUpdateState({ matches: updated });
  };

  return (
    <div className="pb-28 animate-fadeIn">
      <Header
        title={t(state.lang, 'res_title')}
        lang={state.lang}
        currentTab="jogos"
        onNavigate={onNavigate}
        onGoHome={() => onNavigate('home')}
        onOpenSettings={onOpenSettings}
        onOpenDatabase={() => onNavigate('teams')}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
        syncInfo={state.syncInfo}
        clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
      />

      {/* Sub-Navigation: Planeamento & Jogos */}
      <div className="grid grid-cols-3 gap-1 mb-4 p-1 bg-slate-900/90 border border-cyan-500/20 rounded-2xl shadow-sm text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider">
        <button
          type="button"
          onClick={() => onNavigate('calendario')}
          className="py-2 px-1 rounded-xl text-cyan-300/70 hover:text-white hover:bg-slate-950/60 flex items-center justify-center gap-1.5 transition-all"
        >
          <span>📅</span>
          <span className="hidden sm:inline">Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('treinos')}
          className="py-2 px-1 rounded-xl text-cyan-300/70 hover:text-white hover:bg-slate-950/60 flex items-center justify-center gap-1.5 transition-all"
        >
          <span>⚡</span>
          <span className="hidden sm:inline">Treinos</span>
        </button>

        <button
          type="button"
          className="py-2 px-1 rounded-xl bg-cyan-500 text-slate-950 font-black flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,210,255,0.4)]"
        >
          <span>🏆</span>
          <span className="hidden sm:inline">Resultados</span>
        </button>
      </div>

      <div className="field">
        <input
          type="text"
          placeholder={t(state.lang, 'res_search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {seasonsList.length > 1 && (
        <div className="seg mb-3.5">
          <div
            className={`seg-btn ${seasonFilter === 'todas' ? 'active' : ''}`}
            onClick={() => setSeasonFilter('todas')}
          >
            {t(state.lang, 'res_all')}
          </div>
          {seasonsList.map((s) => (
            <div key={s} className={`seg-btn ${seasonFilter === s ? 'active' : ''}`} onClick={() => setSeasonFilter(s)}>
              {s}
            </div>
          ))}
        </div>
      )}

      {reportMatch && (
        <OpponentReportModal
          match={reportMatch}
          state={state}
          onSave={(updated) =>
            onUpdateState({ matches: state.matches.map((m) => (m.id === updated.id ? updated : m)) })
          }
          onClose={() => setReportMatch(null)}
          onShowToast={onShowToast}
        />
      )}

      {shareMatch && (
        <ParentsShareModal
          match={shareMatch}
          state={state}
          onClose={() => setShareMatch(null)}
          onShowToast={onShowToast}
        />
      )}

      <DeletedMatchesSection
        state={state}
        onRestore={(match) => {
          onUpdateState({ matches: [...state.matches.filter((m) => m.id !== match.id), match] });
          onShowToast?.(`Jogo vs ${match.opponent} recuperado ✓`);
        }}
      />

      {filteredMatches.length > 0 ? (
        filteredMatches.map((m) => {
          const sc = m.goals.filter((g) => g.type === 'scored').length;
          const co = m.goals.filter((g) => g.type === 'conceded').length;
          const open = expandedMatchId === m.id;

          const typeLabel =
            m.type === 'campeonato'
              ? `${t(state.lang, 'sch_champ')}${m.phase ? ' · ' + m.phase : ''}`
              : m.type === 'torneio'
                ? `🏆 ${m.tournamentName || t(state.lang, 'sch_tour')}${m.phase ? ' · ' + m.phase : ''}`
                : t(state.lang, 'sch_friendly');

          const locLabel =
            (m.location || 'casa') === 'casa' ? t(state.lang, 'match_home') : t(state.lang, 'match_away');

          const ratedPlayers =
            m.ratings && Object.keys(m.ratings).length > 0
              ? Object.entries(m.ratings)
                  .map(([id, r]) => ({ name: getPlayerName(id), r: Number(r) }))
                  .sort((a, b) => b.r - a.r)
              : [];

          return (
            <div
              key={m.id}
              className="card match-item cursor-pointer"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('button') && !target.closest('textarea')) {
                  setExpandedMatchId(open ? null : m.id);
                }
              }}
            >
              <div className="match-head-row">
                <div className="match-head flex-1">
                  <div>
                    <div className="opp">
                      {m.opponent} {!m.finished && <span className="badge-open">{t(state.lang, 'res_ongoing')}</span>}
                      <span
                        className={`badge-loc ${locLabel.toLowerCase() === 'casa' || locLabel.toLowerCase() === 'home' ? 'casa' : 'fora'}`}
                      >
                        {locLabel}
                      </span>
                    </div>
                    <div className="date">
                      {m.date} <span className="badge-type">{typeLabel}</span>
                    </div>
                  </div>
                  <div className="match-score">
                    <span className="s">{sc}</span> – <span className="c">{co}</span>
                  </div>
                </div>

                <button
                  className="quick-del hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowConfirm(t(state.lang, 'msg_del_match'), () => handleDeleteMatch(m.id));
                  }}
                >
                  🗑
                </button>
              </div>

              {open && (
                <div className="goal-list mt-3">
                  {m.capitao && (
                    <div className="text-xs text-green-400 mb-2 uppercase font-bold">
                      © Capitão: {getPlayerName(m.capitao)}
                    </div>
                  )}

                  {/* Match Stats Pills */}
                  {(() => {
                    const inFor = m.rematesDentroArea ?? m.shotsInBoxFor ?? 0;
                    const outFor = m.rematesForaArea ?? m.shotsOutBoxFor ?? 0;
                    const totFor = inFor + outFor;
                    const inAdv = m.rematesDentroAreaAdv ?? m.shotsInBoxAgainst ?? 0;
                    const outAdv = m.rematesForaAreaAdv ?? m.shotsOutBoxAgainst ?? 0;
                    const totAdv = inAdv + outAdv;
                    const cFor = m.cantos ?? m.cornersFor ?? 0;
                    const cAdv = m.cantosAdv ?? m.cornersAgainst ?? 0;

                    return (
                      <div className="space-y-2 my-2.5">
                        {/* Remates Bar */}
                        {(totFor > 0 || totAdv > 0) && (
                          <div className="p-2 bg-slate-950/80 rounded-xl border border-cyan-500/30 flex items-center justify-between text-xs font-mono">
                            <span className="text-[10px] text-cyan-300 font-bold uppercase">🎯 Remates à Baliza</span>
                            <div className="flex items-center gap-3">
                              <span className="text-cyan-400 font-bold">
                                Nós: {totFor} ({inFor}d/{outFor}f)
                              </span>
                              <span className="text-slate-600">vs</span>
                              <span className="text-rose-400 font-bold">
                                Adv: {totAdv} ({inAdv}d/{outAdv}f)
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-4 gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
                          <div>
                            <div className="text-[9px] text-slate-400 uppercase font-bold">Cantos</div>
                            <div className="text-xs sm:text-sm font-black font-mono text-cyan-400">
                              {cFor} - {cAdv}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-400 uppercase font-bold">Faltas Com.</div>
                            <div className="text-xs sm:text-sm font-black font-mono text-amber-400">
                              {m.foulsCommitted ?? m.faltas ?? 0}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-400 uppercase font-bold">Faltas Sofr.</div>
                            <div className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                              {m.foulsSuffered ?? m.faltasAdv ?? 0}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-400 uppercase font-bold">Substituições</div>
                            <div className="text-xs sm:text-sm font-black font-mono text-purple-400">
                              {(m.subs || []).length}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <MatchTimelineView m={m} lang={state.lang} getPlayerName={getPlayerName} />

                  {ratedPlayers.length > 0 && (
                    <div className="notes-readonly mt-2.5">
                      <b>⭐ {t(state.lang, 'match_rate_pls')}:</b>
                      <br />
                      {ratedPlayers.map((p, i) => (
                        <div key={i}>
                          <span className="text-gold">{p.r}★</span> - {p.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {m.notes && <div className="notes-readonly mt-2.5">📝 {m.notes}</div>}

                  {/* Match Export Buttons (PDF & Excel BolaComVisao) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={isGeneratingPdfId === m.id}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-['Chakra_Petch'] font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          setIsGeneratingPdfId(m.id);
                          if (onShowToast) onShowToast('📄 A gerar PDF da Ficha de Jogo...');
                          const { generateMatchSheetPDF } = await import('../../lib/pdfUtils');
                          await generateMatchSheetPDF(m, state, true);
                          if (onShowToast) onShowToast('✅ PDF gerado com sucesso!');
                        } catch (err) {
                          console.error('Erro ao gerar PDF:', err);
                          if (onShowToast) onShowToast('Erro ao gerar PDF.');
                        } finally {
                          setIsGeneratingPdfId(null);
                        }
                      }}
                    >
                      <span>📄</span>
                      <span>{isGeneratingPdfId === m.id ? 'A gerar PDF...' : 'Gerar PDF Ficha de Jogo'}</span>
                    </button>

                    <button
                      type="button"
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-['Chakra_Petch'] font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          if (onShowToast) onShowToast('📊 A exportar Excel...');
                          const { exportMatchSheetExcel } = await import('../../lib/exportUtils');
                          exportMatchSheetExcel(m, state);
                          if (onShowToast) onShowToast('✅ Excel exportado!');
                        } catch (err) {
                          console.error('Erro ao exportar Excel:', err);
                        }
                      }}
                    >
                      <span>📊</span>
                      <span>Excel Ficha de Jogo</span>
                    </button>
                  </div>

                  {m.finished && (
                    <div className="btn-row mt-2.5">
                      <button
                        className="btn btn-outline w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareMatch(m);
                        }}
                      >
                        📲 Partilhar com os pais
                      </button>
                    </div>
                  )}

                  {m.finished && (
                    <div className="btn-row mt-2.5">
                      <button
                        className="btn btn-outline w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportMatch(m);
                        }}
                      >
                        🛡️ Relatório do adversário{hasReportNotes(m.opponentReport) ? ' ✓' : ''}
                      </button>
                    </div>
                  )}

                  {m.finished && (
                    <div className="btn-row mt-2.5">
                      <button
                        className="btn btn-outline w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReopenMatch(m.id);
                        }}
                      >
                        {t(state.lang, 'res_edit')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="empty">{t(state.lang, 'res_none_search')}</div>
      )}
    </div>
  );
};

type TimelineEventItem =
  | { type: 'goal'; minute?: string | number | null; period?: string; data: GoalEvent; isHalftime: boolean }
  | { type: 'card'; minute?: string | number | null; period?: string; data: CardEvent; isHalftime: boolean }
  | { type: 'sub'; minute?: string | number | null; period?: string; data: SubEvent; isHalftime?: boolean };

const MatchTimelineView: React.FC<{ m: Match; lang: any; getPlayerName: (id: string | null) => string }> = ({
  m,
  lang,
  getPlayerName
}) => {
  const eventsForHalf = (half: 1 | 2): TimelineEventItem[] => {
    const goals: TimelineEventItem[] = m.goals
      .filter((g) => g.half === half || (!g.half && (half === 1 ? g.period !== '2.ª parte' : g.period === '2.ª parte')))
      .map((g) => ({ type: 'goal', minute: g.minute, period: g.period, data: g, isHalftime: false }));
    const cds: TimelineEventItem[] = (m.cards || [])
      .filter((c) => c.half === half || (!c.half && (half === 1 ? c.period !== '2.ª parte' : c.period === '2.ª parte')))
      .map((c) => ({ type: 'card', minute: c.minute, period: c.period, data: c, isHalftime: false }));
    const sbs: TimelineEventItem[] = (m.subs || [])
      .filter(
        (s) =>
          s.half === half ||
          (half === 1 && s.isHalftime) ||
          (!s.half && (half === 1 ? s.period === '1.ª parte' || s.isHalftime : s.period === '2.ª parte'))
      )
      .map((s) => ({
        type: 'sub',
        minute: s.isHalftime ? 'INT' : s.minute,
        period: s.period,
        data: s,
        isHalftime: s.isHalftime
      }));
    return [...goals, ...cds, ...sbs].sort((a, b) => {
      if (a.isHalftime && !b.isHalftime) return 1;
      if (!a.isHalftime && b.isHalftime) return -1;
      return parseMinuteOrder(a.minute, a.period) - parseMinuteOrder(b.minute, b.period);
    });
  };

  const h1 = eventsForHalf(1);
  const h2 = eventsForHalf(2);
  const h1_regular = h1.filter((e) => !e.isHalftime);
  const h1_int = h1.filter((e) => e.isHalftime && e.type === 'sub') as Array<{
    type: 'sub';
    minute?: string | number | null;
    period?: string;
    data: SubEvent;
    isHalftime?: boolean;
  }>;

  if (!h1.length && !h2.length) {
    return <div className="empty">{t(lang, 'res_none')}</div>;
  }

  const renderEventSpan = (e: TimelineEventItem) => {
    if (e.type === 'goal') {
      if (e.data.type === 'scored') {
        const ast = e.data.assistId && e.data.assistId !== 'none' ? ` (ast. ${getPlayerName(e.data.assistId)})` : '';
        const gt = e.data.goalType ? ` • ${e.data.goalType}` : '';
        return `⚽ ${getPlayerName(e.data.scorerId)}${ast}${gt}`;
      }
      const obs = e.data.notes ? ` (${e.data.notes})` : '';
      const gt = e.data.goalType ? ` [${e.data.goalType}]` : '';
      return `🥅 ${t(lang, 'rep_conc')}${gt}${obs}`;
    }
    if (e.type === 'card') {
      return `${e.data.color === 'Amarelo' ? '🟨' : '🟥'} ${getPlayerName(e.data.playerId)}`;
    }
    return `🔄 ↓ ${getPlayerName(e.data.outId)} ↑ ${getPlayerName(e.data.inId)}`;
  };

  return (
    <div>
      {h1.length > 0 && (
        <div className="text-xs text-gold uppercase mt-2 mb-1 font-semibold">⏱️ {t(lang, 'match_half1')}</div>
      )}

      {h1_regular.map((e, idx) => (
        <div key={idx} className="goal-row">
          <span>
            {e.minute != null && <span className="mono text-gold mr-1">{formatMinute(e.minute)}</span>}
            {renderEventSpan(e)}
          </span>
        </div>
      ))}

      {h1_int.length > 0 && (
        <div className="text-xs text-muted uppercase my-2 font-semibold text-center border-t border-b border-dashed border-line py-1">
          🏁 {t(lang, 'rep_end1')}
        </div>
      )}

      {h1_int.map((e, idx) => (
        <div key={`int-${idx}`} className="goal-row">
          <span>
            <span className="mono text-gold mr-1">INT</span>
            🔄 ↓ {getPlayerName(e.data.outId)} ↑ {getPlayerName(e.data.inId)}
          </span>
        </div>
      ))}

      {h2.length > 0 && (
        <div className="text-xs text-gold uppercase mt-3 mb-1 font-semibold">⏱️ {t(lang, 'match_half2')}</div>
      )}

      {h2.map((e, idx) => (
        <div key={`h2-${idx}`} className="goal-row">
          <span>
            {e.minute != null && <span className="mono text-gold mr-1">{formatMinute(e.minute)}</span>}
            {renderEventSpan(e)}
          </span>
        </div>
      ))}
    </div>
  );
};
