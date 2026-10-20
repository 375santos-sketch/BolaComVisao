import React, { useState } from 'react';
import { AppState, MatchType, Player } from '../../types';
import { t } from '../../i18n/dict';
import { playerLabel, isSeasonMatching } from '../../lib/utils';
import { Header } from '../Header';
import { SquadGoalsAndAssistsModal, GoalsAssistsTab } from '../SquadGoalsAndAssistsModal';
import { PlayingTimeSection } from './stats/PlayingTimeSection';

interface StatsViewProps {
  state: AppState;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowToast: (msg: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  state,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowToast
}) => {
  const [statsFilter, setStatsFilter] = useState<MatchType | 'todos'>('todos');
  const [seasonFilter, setSeasonFilter] = useState<string>('todas');
  const [showGoalsAssistsModal, setShowGoalsAssistsModal] = useState(false);
  const [goalsAssistsTab, setGoalsAssistsTab] = useState<GoalsAssistsTab>('marcadores');

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');

  const activeRoster = React.useMemo(() => (state.roster || []).filter((p) => p && p.active !== false), [state.roster]);
  const squadLookup = React.useMemo(() => {
    const map = new Map<string, Player>();
    activeRoster.forEach((p) => {
      map.set(p.id, p);
      if (p.name) map.set(p.name.trim().toLowerCase(), p);
      if (p.nickname) map.set(p.nickname.trim().toLowerCase(), p);
    });
    return map;
  }, [activeRoster]);

  const getPlayerName = (id: string | null) => {
    if (!id || id === 'unknown') return t(state.lang, 'match_nobody');
    const p = squadLookup.get(id) || squadLookup.get(id.toLowerCase()) || activeRoster.find((x) => x.id === id);
    return p ? playerLabel(p, t(state.lang, 'pl_no_name')) : '—';
  };

  const computeStats = () => {
    let scored = 0,
      conceded = 0;
    const scoredHalf: Record<number, number> = { 1: 0, 2: 0 };
    const concededHalf: Record<number, number> = { 1: 0, 2: 0 };
    const scorerCount: Record<string, number> = {};
    const assistCount: Record<string, number> = {};
    const yellowCount: Record<string, number> = {};
    const redCount: Record<string, number> = {};

    let wins = 0,
      draws = 0,
      losses = 0;
    let casaWins = 0,
      casaDraws = 0,
      casaLosses = 0;
    let foraWins = 0,
      foraDraws = 0,
      foraLosses = 0;

    const matches = state.matches.filter(
      (m) =>
        (!statsFilter || statsFilter === 'todos' || m.type === statsFilter) &&
        (!seasonFilter || seasonFilter === 'todas' || isSeasonMatching(m.season, seasonFilter))
    );

    const finishedMatches = matches
      .filter((m) => m.finished)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const last6Matches = finishedMatches.slice(-6);

    const last5Form = finishedMatches.slice(-5).map((m) => {
      const sc = m.goals.filter((g) => g.type === 'scored').length;
      const co = m.goals.filter((g) => g.type === 'conceded').length;
      return sc > co ? 'V' : sc === co ? 'E' : 'D';
    });

    matches.forEach((m) => {
      const mScored = m.goals.filter((g) => g.type === 'scored').length;
      const mConceded = m.goals.filter((g) => g.type === 'conceded').length;
      const loc = m.location || 'casa';

      if (m.finished) {
        if (mScored > mConceded) {
          wins++;
          if (loc === 'casa') casaWins++;
          else foraWins++;
        } else if (mScored === mConceded) {
          draws++;
          if (loc === 'casa') casaDraws++;
          else foraDraws++;
        } else {
          losses++;
          if (loc === 'casa') casaLosses++;
          else foraLosses++;
        }
      }

      m.goals.forEach((g) => {
        if (g.type === 'scored') {
          scored++;
          scoredHalf[g.half] = (scoredHalf[g.half] || 0) + 1;
          const rawScorer = g.scorerId || (g as any).player;
          if (
            rawScorer &&
            rawScorer !== 'autogolo' &&
            rawScorer !== 'auto_golo' &&
            rawScorer !== 'none' &&
            rawScorer !== 'unknown'
          ) {
            const p = squadLookup.get(rawScorer) || squadLookup.get(rawScorer.trim().toLowerCase());
            if (p) {
              scorerCount[p.id] = (scorerCount[p.id] || 0) + 1;
            } else if (activeRoster.length === 0) {
              scorerCount[rawScorer] = (scorerCount[rawScorer] || 0) + 1;
            }
          }

          const rawAssist = g.assistId || (g as any).assistant;
          if (rawAssist && rawAssist !== 'none' && rawAssist !== 'unknown' && rawAssist !== 'autogolo') {
            const p = squadLookup.get(rawAssist) || squadLookup.get(rawAssist.trim().toLowerCase());
            if (p) {
              assistCount[p.id] = (assistCount[p.id] || 0) + 1;
            } else if (activeRoster.length === 0) {
              assistCount[rawAssist] = (assistCount[rawAssist] || 0) + 1;
            }
          }
        } else {
          conceded++;
          concededHalf[g.half] = (concededHalf[g.half] || 0) + 1;
        }
      });

      (m.cards || []).forEach((c) => {
        const rawPlayer = c.playerId || (c as any).player;
        if (rawPlayer && rawPlayer !== 'unknown') {
          const p = squadLookup.get(rawPlayer) || squadLookup.get(rawPlayer.trim().toLowerCase());
          const targetId = p ? p.id : activeRoster.length === 0 ? rawPlayer : null;
          if (targetId) {
            if (c.color === 'Amarelo') yellowCount[targetId] = (yellowCount[targetId] || 0) + 1;
            else redCount[targetId] = (redCount[targetId] || 0) + 1;
          }
        }
      });
    });

    const validPlayerIds = new Set(activeRoster.map((p) => p.id));
    const isPlayerAllowed = (id: string) => activeRoster.length === 0 || validPlayerIds.has(id);

    const scorers = Object.entries(scorerCount)
      .filter(([id]) => isPlayerAllowed(id))
      .map(([id, count]) => ({ id, name: getPlayerName(id), count }))
      .sort((a, b) => b.count - a.count);

    const assisters = Object.entries(assistCount)
      .filter(([id]) => isPlayerAllowed(id))
      .map(([id, count]) => ({ id, name: getPlayerName(id), count }))
      .sort((a, b) => b.count - a.count);

    const cardRanking = Array.from(new Set([...Object.keys(yellowCount), ...Object.keys(redCount)]))
      .filter((id) => isPlayerAllowed(id))
      .map((id) => ({ id, name: getPlayerName(id), yellow: yellowCount[id] || 0, red: redCount[id] || 0 }))
      .sort((a, b) => b.yellow + b.red - (a.yellow + a.red));

    return {
      scored,
      conceded,
      scoredHalf,
      concededHalf,
      scorers,
      assisters,
      wins,
      draws,
      losses,
      casaWins,
      casaDraws,
      casaLosses,
      foraWins,
      foraDraws,
      foraLosses,
      cardRanking,
      last6Matches,
      last5Form
    };
  };

  const s = computeStats();

  const bal1 = (s.scoredHalf[1] || 0) - (s.concededHalf[1] || 0);
  const color1 = bal1 > 0 ? 'var(--green)' : bal1 < 0 ? 'var(--red)' : 'var(--muted)';

  const bal2 = (s.scoredHalf[2] || 0) - (s.concededHalf[2] || 0);
  const color2 = bal2 > 0 ? 'var(--green)' : bal2 < 0 ? 'var(--red)' : 'var(--muted)';

  let maxG = 1;
  s.last6Matches.forEach((m) => {
    const sc = m.goals.filter((g) => g.type === 'scored').length;
    const co = m.goals.filter((g) => g.type === 'conceded').length;
    if (sc > maxG) maxG = sc;
    if (co > maxG) maxG = co;
  });

  return (
    <div className="pb-28 animate-fadeIn">
      <Header
        title={t(state.lang, 'st_title')}
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

      <div className="seg mb-3">
        <div className={`seg-btn ${statsFilter === 'todos' ? 'active' : ''}`} onClick={() => setStatsFilter('todos')}>
          {t(state.lang, 'st_all')}
        </div>
        <div
          className={`seg-btn ${statsFilter === 'amigavel' ? 'active' : ''}`}
          onClick={() => setStatsFilter('amigavel')}
        >
          {t(state.lang, 'sch_friendly')}
        </div>
        <div
          className={`seg-btn ${statsFilter === 'campeonato' ? 'active' : ''}`}
          onClick={() => setStatsFilter('campeonato')}
        >
          {t(state.lang, 'sch_champ')}
        </div>
        <div
          className={`seg-btn ${statsFilter === 'torneio' ? 'active' : ''}`}
          onClick={() => setStatsFilter('torneio')}
        >
          {t(state.lang, 'sch_tour')}
        </div>
      </div>

      {state.seasons && state.seasons.length > 1 && (
        <div className="flex items-center gap-2 mb-3 px-1 text-xs font-mono">
          <span className="text-slate-400">Época:</span>
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:border-cyan-400 outline-none"
          >
            <option value="todas">Todas as Épocas</option>
            {state.seasons.map((sn) => (
              <option key={sn.id} value={sn.name}>
                {sn.name} {sn.isCurrent ? '(Atual)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quick Launch: Dashboard Completo de Análise dos Jogos */}
      <div className="mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-blue-950/80 to-slate-900 border border-cyan-400/70 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-xl">📊</span>
          <div>
            <div className="font-['Chakra_Petch'] font-bold text-white text-sm uppercase flex items-center gap-2">
              <span>Dashboard de Análise dos Jogos</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono text-[9px] font-black">
                NOVO
              </span>
            </div>
            <div className="text-[11px] font-mono text-cyan-200/90">
              Períodos 0–15/16–30/90+', confronto direto, origem de golos e drill-down
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('analise_jogos')}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>Abrir Análise</span>
          <span>➔</span>
        </button>
      </div>

      {/* Export Season Stats: PDF & Excel (BolaComVisao) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <button
          onClick={async () => {
            const { generateSeasonStatsPDF } = await import('../../lib/pdfUtils');
            generateSeasonStatsPDF(state);
            onShowToast('Estatísticas da Época exportadas em PDF (BolaComVisao)! 📄');
          }}
          className="py-2.5 px-3 rounded-xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-['Chakra_Petch'] font-bold uppercase text-xs transition-all flex items-center justify-center gap-2"
        >
          <span>📄</span>
          <span>Exportar PDF (BolaComVisao)</span>
        </button>

        <button
          onClick={async () => {
            const { exportSeasonStatsExcel } = await import('../../lib/exportUtils');
            exportSeasonStatsExcel(state);
            onShowToast('Estatísticas da Época exportadas em Excel (.xlsx)! 📊');
          }}
          className="py-2.5 px-3 rounded-xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-['Chakra_Petch'] font-bold uppercase text-xs transition-all flex items-center justify-center gap-2"
        >
          <span>📊</span>
          <span>Exportar Excel (.xlsx)</span>
        </button>
      </div>

      <div className="section-title mt-4">{t(state.lang, 'st_global')}</div>
      <div className="stat-grid grid-cols-3">
        <div className="stat-box">
          <div className="num text-gold">{s.wins}</div>
          <div className="lbl">{t(state.lang, 'st_wins')}</div>
        </div>
        <div className="stat-box">
          <div className="num text-chalk">{s.draws}</div>
          <div className="lbl">{t(state.lang, 'st_draws')}</div>
        </div>
        <div className="stat-box">
          <div className="num text-red-400">{s.losses}</div>
          <div className="lbl">{t(state.lang, 'st_losses')}</div>
        </div>
      </div>

      <div className="stat-grid grid-cols-2 gap-1.5 mt-2">
        <div className="stat-box p-2.5">
          <div className="lbl">{t(state.lang, 'match_home')}</div>
          <div className="num mono text-base mt-1 text-chalk">
            {s.casaWins}V &nbsp;{s.casaDraws}E &nbsp;{s.casaLosses}D
          </div>
        </div>
        <div className="stat-box p-2.5">
          <div className="lbl">{t(state.lang, 'match_away')}</div>
          <div className="num mono text-base mt-1 text-chalk">
            {s.foraWins}V &nbsp;{s.foraDraws}E &nbsp;{s.foraLosses}D
          </div>
        </div>
      </div>

      <div className="section-title">{t(state.lang, 'st_ga')}</div>
      <div className="card">
        <div className="flex justify-between">
          <span className="text-gold font-bold">
            ⚽ {s.scored} {t(state.lang, 'match_scored')}
          </span>
          <span className="text-red-400 font-bold">
            🥅 {s.conceded} {t(state.lang, 'match_conc')}
          </span>
        </div>
      </div>

      <div
        className="card cursor-pointer hover:border-emerald-500/40 transition-colors"
        onClick={() => {
          setGoalsAssistsTab('marcadores');
          setShowGoalsAssistsModal(true);
        }}
        title="Clique para ver a lista completa de golos e assistências"
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-muted text-xs uppercase font-bold flex items-center gap-1.5">
            <span>⚽</span>
            <span>{t(state.lang, 'st_top_s')}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold hover:underline flex items-center gap-1">
            <span>Ver lista completa</span>
            <span>➔</span>
          </span>
        </div>
        {s.scorers.length > 0 ? (
          <div className="space-y-1">
            {s.scorers.map((sc) => (
              <div key={sc.id} className="scorer-row">
                <span>{sc.name}</span>
                <span className="n mono">{sc.count} ⚽</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">{t(state.lang, 'st_no_goals')}</div>
        )}
      </div>

      <div
        className="card cursor-pointer hover:border-cyan-500/40 transition-colors"
        onClick={() => {
          setGoalsAssistsTab('assistentes');
          setShowGoalsAssistsModal(true);
        }}
        title="Clique para ver a lista completa de assistências e golos"
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-muted text-xs uppercase font-bold flex items-center gap-1.5">
            <span>🎯</span>
            <span>{t(state.lang, 'st_top_a')}</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 font-bold hover:underline flex items-center gap-1">
            <span>Ver lista completa</span>
            <span>➔</span>
          </span>
        </div>
        {s.assisters.length > 0 ? (
          <div className="space-y-1">
            {s.assisters.map((a) => (
              <div key={a.id} className="scorer-row">
                <span>{a.name}</span>
                <span className="n mono">{a.count} 🎯</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">{t(state.lang, 'st_no_assists')}</div>
        )}
      </div>

      <div className="section-title">{t(state.lang, 'st_cards')}</div>
      <div className="card">
        {s.cardRanking.length > 0 ? (
          s.cardRanking.map((c) => (
            <div key={c.id} className="scorer-row">
              <span>{c.name}</span>
              <span className="n mono">
                {c.yellow ? `🟨${c.yellow}` : ''}
                {c.yellow && c.red ? ' ' : ''}
                {c.red ? `🟥${c.red}` : ''}
              </span>
            </div>
          ))
        ) : (
          <div className="empty">{t(state.lang, 'st_no_cards')}</div>
        )}
      </div>

      <div className="section-title mt-4">{t(state.lang, 'st_half')}</div>
      <div className="card">
        <div className="flex justify-between mb-2 pb-2 border-b border-line">
          <div>
            <b className="text-chalk text-xs">{t(state.lang, 'match_half1')}</b>
            <br />
            <span className="text-[11px] text-muted">
              {s.scoredHalf[1] || 0} {t(state.lang, 'match_scored')} | {s.concededHalf[1] || 0}{' '}
              {t(state.lang, 'match_conc')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted uppercase">{t(state.lang, 'st_bal')}</span>
            <br />
            <b className="text-base mono" style={{ color: color1 }}>
              {bal1 > 0 ? '+' : ''}
              {bal1}
            </b>
          </div>
        </div>

        <div className="flex justify-between">
          <div>
            <b className="text-chalk text-xs">{t(state.lang, 'match_half2')}</b>
            <br />
            <span className="text-[11px] text-muted">
              {s.scoredHalf[2] || 0} {t(state.lang, 'match_scored')} | {s.concededHalf[2] || 0}{' '}
              {t(state.lang, 'match_conc')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted uppercase">{t(state.lang, 'st_bal')}</span>
            <br />
            <b className="text-base mono" style={{ color: color2 }}>
              {bal2 > 0 ? '+' : ''}
              {bal2}
            </b>
          </div>
        </div>
      </div>

      {s.last5Form.length > 0 && (
        <>
          <div className="section-title mt-4">{t(state.lang, 'st_form')}</div>
          <div className="card">
            <div className="text-[11px] text-muted uppercase tracking-wider mb-2.5 font-semibold">
              {t(state.lang, 'st_form_last', { n: s.last5Form.length })}
            </div>
            <div className="flex items-center justify-center gap-3 relative py-2">
              {s.last5Form.map((res, i) => (
                <div
                  key={i}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-black ${
                    res === 'V' ? 'bg-green-400' : res === 'E' ? 'bg-yellow-400' : 'bg-red-400 text-white'
                  }`}
                >
                  {res}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {s.last6Matches.length > 0 && (
        <div className="card mt-2.5">
          <div className="text-[11px] text-muted uppercase tracking-wider mb-1 flex justify-between font-semibold">
            <span>{t(state.lang, 'st_evol', { n: s.last6Matches.length })}</span>
            <span>
              <span className="text-gold">■ {t(state.lang, 'match_scored').substring(0, 3)}</span>{' '}
              <span className="text-red-400 ml-1">■ {t(state.lang, 'match_conc').substring(0, 3)}</span>
            </span>
          </div>

          <div className="chart-bar-container">
            {s.last6Matches.map((m, idx) => {
              const sc = m.goals.filter((g) => g.type === 'scored').length;
              const co = m.goals.filter((g) => g.type === 'conceded').length;
              const scPct = (sc / maxG) * 100;
              const coPct = (co / maxG) * 100;
              const shortOpp = m.opponent.split(' ')[0];

              const sc1 = m.goals.filter((g) => g.type === 'scored' && g.half === 1).length;
              const co1 = m.goals.filter((g) => g.type === 'conceded' && g.half === 1).length;
              const sc2 = m.goals.filter((g) => g.type === 'scored' && g.half === 2).length;
              const co2 = m.goals.filter((g) => g.type === 'conceded' && g.half === 2).length;

              const halfText =
                m.location === 'casa'
                  ? ` (1P: ${sc1}-${co1} | 2P: ${sc2}-${co2})`
                  : ` (1P: ${co1}-${sc1} | 2P: ${co2}-${sc2})`;
              const msg =
                m.location === 'casa'
                  ? `${myClub} ${sc} - ${co} ${m.opponent}${halfText}`
                  : `${m.opponent} ${co} - ${sc} ${myClub}${halfText}`;

              return (
                <div key={idx} className="chart-bar-group cursor-pointer" onClick={() => onShowToast(msg)}>
                  <div className="chart-bars">
                    <div className="chart-bar scored" style={{ height: `${scPct}%` }} />
                    <div className="chart-bar conceded" style={{ height: `${coPct}%` }} />
                  </div>
                  <div className="chart-x-label">{shortOpp}</div>
                </div>
              );
            })}
          </div>

          <div className="text-[9px] text-muted text-center mt-2">{t(state.lang, 'st_tap')}</div>
        </div>
      )}

      {/* Minutos de jogo por atleta (mesmos filtros de tipo e época) */}
      <PlayingTimeSection
        matches={state.matches.filter(
          (m) =>
            (statsFilter === 'todos' || m.type === statsFilter) &&
            (seasonFilter === 'todas' || isSeasonMatching(m.season, seasonFilter))
        )}
        roster={state.roster || []}
        category={state.category}
      />

      {/* Modal de Lista Completa de Marcadores e Assistências */}
      <SquadGoalsAndAssistsModal
        isOpen={showGoalsAssistsModal}
        onClose={() => setShowGoalsAssistsModal(false)}
        matches={state.matches || []}
        roster={state.roster || []}
        clubName={state.myClubName || 'Dragões de Alferrarede'}
        category={state.category || 'Sub-11'}
        season={state.season}
        initialTab={goalsAssistsTab}
        onSelectPlayer={(playerId) => onNavigate('plantel', playerId)}
      />
    </div>
  );
};
