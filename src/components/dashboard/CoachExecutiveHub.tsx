import React, { useState, useMemo } from 'react';
import { AppState } from '../../types';
import { TabType } from '../Navbar';
import { calculateAttendanceMetrics } from '../../lib/intelligenceEngine';
import { parseMinuteToNumber } from '../../lib/gameAnalysisUtils';
import { computeTopScorersAndAssisters } from '../../lib/gameAnalysis';
import { SquadGoalsAndAssistsModal, GoalsAssistsTab } from '../SquadGoalsAndAssistsModal';

interface CoachExecutiveHubProps {
  state: AppState;
  onNavigate: (tab: TabType, targetId?: string) => void;
}

export const CoachExecutiveHub: React.FC<CoachExecutiveHubProps> = ({ state, onNavigate }) => {
  const [showGoalsAssistsModal, setShowGoalsAssistsModal] = useState(false);
  const [goalsAssistsTab, setGoalsAssistsTab] = useState<GoalsAssistsTab>('marcadores');
  const matches = useMemo(() => {
    return (state.matches || []).filter((m) => m && m.finished);
  }, [state.matches]);

  const activeRoster = useMemo(() => {
    return (state.roster || []).filter((p) => p && p.active !== false);
  }, [state.roster]);

  const { topScorers, topAssisters } = useMemo(() => {
    return computeTopScorersAndAssisters(matches, activeRoster);
  }, [matches, activeRoster]);

  const attendanceMetrics = useMemo(() => {
    return calculateAttendanceMetrics(state, 'season');
  }, [state]);

  const recentForm = useMemo(() => {
    if (matches.length === 0) return [];
    return matches.slice(-5).map((m) => {
      const scored = (m.goals || []).filter((g) => g.type === 'scored').length;
      const conceded = (m.goals || []).filter((g) => g.type === 'conceded').length;
      const result: 'W' | 'D' | 'L' = scored > conceded ? 'W' : scored === conceded ? 'D' : 'L';
      return {
        id: m.id,
        opponent: m.opponent || 'Adversário',
        date: m.date,
        scored,
        conceded,
        result
      };
    });
  }, [matches]);

  const metrics = useMemo(() => {
    const totalMatches = matches.length;
    if (totalMatches === 0) {
      return {
        wins: 0,
        draws: 0,
        losses: 0,
        totalScored: 0,
        totalConceded: 0,
        avgScored: '0.0',
        avgConceded: '0.0',
        winRate: '0%',
        avgCorners: '0.0',
        firstGoalMin: '-',
        strongPoint: 'Inicie os registos de jogo para desbloquear as métricas executivas.',
        attentionPoint: 'Dados estatísticos em tempo real disponíveis após o primeiro jogo finalizado.'
      };
    }

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let totalScored = 0;
    let totalConceded = 0;
    let totalCorners = 0;
    const firstGoalMinutes: number[] = [];
    let scoredMatchesCount = 0;
    let lateConcededCount = 0;
    let setPieceConcededCount = 0;

    matches.forEach((m) => {
      const scored = (m.goals || []).filter((g) => g.type === 'scored');
      const conceded = (m.goals || []).filter((g) => g.type === 'conceded');

      totalScored += scored.length;
      totalConceded += conceded.length;
      totalCorners += m.cantos || 0;

      if (scored.length > conceded.length) wins++;
      else if (scored.length === conceded.length) draws++;
      else losses++;

      if (scored.length > 0) scoredMatchesCount++;

      // First goal minute for our team
      if (scored.length > 0) {
        const sortedScored = [...scored].sort(
          (a, b) => (parseMinuteToNumber(a.minute) || 0) - (parseMinuteToNumber(b.minute) || 0)
        );
        const parsedFirst = parseMinuteToNumber(sortedScored[0].minute);
        if (parsedFirst !== null) {
          firstGoalMinutes.push(parsedFirst);
        }
      }

      // Late conceded and set pieces
      conceded.forEach((g) => {
        const min = parseMinuteToNumber(g.minute) || 0;
        if (min >= 50 || g.period === '2' || g.period === '2T') {
          lateConcededCount++;
        }
        const t = (g.goalType || '').toLowerCase();
        if (t.includes('canto') || t.includes('livre') || t.includes('pen') || t.includes('bola parada')) {
          setPieceConcededCount++;
        }
      });
    });

    const avgScored = (totalScored / totalMatches).toFixed(1);
    const avgConceded = (totalConceded / totalMatches).toFixed(1);
    const winRate = `${Math.round((wins / totalMatches) * 100)}%`;
    const avgCorners = (totalCorners / totalMatches).toFixed(1);
    const firstGoalMin =
      firstGoalMinutes.length > 0
        ? `${Math.round(firstGoalMinutes.reduce((a, b) => a + b, 0) / firstGoalMinutes.length)}'`
        : "18'";

    const recentSample = matches.slice(-10);
    const recentScoredCount = recentSample.filter((m) => (m.goals || []).some((g) => g.type === 'scored')).length;
    const strongPoint =
      recentSample.length > 0
        ? `Marcámos em ${recentScoredCount} dos últimos ${recentSample.length} jogos oficiais (${avgScored} golos/jogo).`
        : `Marcámos em ${scoredMatchesCount} de ${totalMatches} jogos (${Math.round((scoredMatchesCount / totalMatches) * 100)}%).`;

    const lateConcededPct = totalConceded > 0 ? Math.round((lateConcededCount / totalConceded) * 100) : 0;
    const attentionPoint =
      lateConcededPct >= 35
        ? `${lateConcededPct}% dos golos sofridos surgiram na 2ª parte / após os 50'.`
        : setPieceConcededCount > 0
          ? `${setPieceConcededCount} golos sofridos resultaram de lances de bola parada.`
          : 'Manter a concentração defensiva no primeiro quarto de hora do encontro.';

    return {
      wins,
      draws,
      losses,
      totalScored,
      totalConceded,
      avgScored,
      avgConceded,
      winRate,
      avgCorners,
      firstGoalMin,
      strongPoint,
      attentionPoint
    };
  }, [matches]);

  // Alerta de assiduidade - apenas atletas ativos do plantel
  const lowAttendanceList = useMemo(() => {
    const activeIds = new Set(activeRoster.map((p) => p.id));
    return (attendanceMetrics.lowAttendancePlayers || []).filter((p) => activeIds.has(p.playerId));
  }, [attendanceMetrics, activeRoster]);

  return (
    <div
      id="coach-executive-hub"
      className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-cyan-950/40 border border-cyan-500/30 shadow-2xl space-y-4 sm:space-y-5"
    >
      {/* 1. Header com Forma Recente (5 Segundos) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
            🧠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white font-['Chakra_Petch'] uppercase tracking-wider">
                Visão do Treinador
              </h2>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                5 Segundos
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {matches.length} Jogos • {metrics.wins}V {metrics.draws}E {metrics.losses}D •{' '}
              {attendanceMetrics.teamAverageRate}% Assiduidade
            </p>
          </div>
        </div>

        {/* Forma dos últimos 5 jogos */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-950/70 p-1.5 px-3 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase mr-1">Forma:</span>
          {recentForm.length === 0 ? (
            <span className="text-xs text-slate-500 font-mono">Sem jogos registados</span>
          ) : (
            <div className="flex items-center gap-1.5">
              {recentForm.map((rf, idx) => (
                <div
                  key={idx}
                  title={`vs ${rf.opponent} (${rf.scored}-${rf.conceded}) em ${rf.date}`}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black font-mono shadow-sm transition-transform hover:scale-110 cursor-help ${
                    rf.result === 'W'
                      ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                      : rf.result === 'D'
                        ? 'bg-amber-500 text-slate-950 border border-amber-400'
                        : 'bg-rose-500 text-white border border-rose-400'
                  }`}
                >
                  {rf.result === 'W' ? 'V' : rf.result === 'D' ? 'E' : 'D'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. 4 Botões Táteis de Ação Rápida no Telemóvel (1 Toque) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => onNavigate('convocatoria')}
          className="p-3 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 active:scale-95 border border-cyan-500/40 text-left transition-all group flex items-center gap-2.5"
          id="quick-coach-btn-convocatoria"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
            📋
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide truncate">
              Convocatória
            </div>
            <div className="text-[10px] text-cyan-300/70 truncate">Próximo Jogo</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('jogo')}
          className="p-3 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 active:scale-95 border border-rose-500/40 text-left transition-all group flex items-center gap-2.5"
          id="quick-coach-btn-jogo"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
            ⏱️
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide truncate">
              Centro Jogo
            </div>
            <div className="text-[10px] text-rose-300/70 truncate">Modo Banco</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('treinos')}
          className="p-3 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 active:scale-95 border border-emerald-500/40 text-left transition-all group flex items-center gap-2.5"
          id="quick-coach-btn-treinos"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide truncate">
              Treinos
            </div>
            <div className="text-[10px] text-emerald-300/70 truncate">Presenças e Planos</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('plantel')}
          className="p-3 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 active:scale-95 border border-purple-500/40 text-left transition-all group flex items-center gap-2.5"
          id="quick-coach-btn-plantel"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
            👥
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide truncate">
              Plantel
            </div>
            <div className="text-[10px] text-purple-300/70 truncate">{activeRoster.length} Atletas</div>
          </div>
        </button>
      </div>

      {/* 3. 5 Core Executive Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>⚽</span>
            <span className="truncate">Golos / Jogo</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-1">{metrics.avgScored}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Marcados</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-rose-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>🛡️</span>
            <span className="truncate">Sofridos / Jogo</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-400 mt-1">{metrics.avgConceded}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Defesa</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>🏆</span>
            <span className="truncate">% Vitórias</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">{metrics.winRate}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Eficácia</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>🚩</span>
            <span className="truncate">Cantos / Jogo</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-1">{metrics.avgCorners}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">A Favor</div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-950/80 border border-blue-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>📈</span>
            <span className="truncate">Assiduidade</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-400 mt-1">
            {attendanceMetrics.teamAverageRate}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Média Época</div>
        </div>
      </div>

      {/* 4. Highlights: Ponto Forte & Ponto de Atenção & Alerta de Assiduidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
        {/* Ponto Forte */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
          <span className="text-xl shrink-0">🔥</span>
          <div className="min-w-0">
            <span className="text-xs font-bold text-emerald-400 uppercase font-['Chakra_Petch'] tracking-wide block">
              Ponto Forte
            </span>
            <p className="text-xs text-slate-200 font-medium mt-0.5 leading-snug">{metrics.strongPoint}</p>
          </div>
        </div>

        {/* Atenção */}
        <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
          <span className="text-xl shrink-0">⚠️</span>
          <div className="min-w-0">
            <span className="text-xs font-bold text-rose-400 uppercase font-['Chakra_Petch'] tracking-wide block">
              Atenção
            </span>
            <p className="text-xs text-slate-200 font-medium mt-0.5 leading-snug">{metrics.attentionPoint}</p>
          </div>
        </div>
      </div>

      {/* Destaques Individuais: Os 3 Melhores Marcadores & Os 3 Melhores Assistentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5" id="coach-executive-top-players">
        {/* Top 3 Marcadores */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div
              onClick={() => {
                setGoalsAssistsTab('marcadores');
                setShowGoalsAssistsModal(true);
              }}
              className="flex items-center justify-between mb-2 cursor-pointer group/hdr hover:opacity-95 transition-opacity"
              title="Clique para ver a lista completa de golos e assistências"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base group-hover/hdr:scale-110 transition-transform">⚽</span>
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase font-['Chakra_Petch'] tracking-wide block group-hover/hdr:text-emerald-300 transition-colors">
                    Melhores Marcadores
                  </span>
                  <span className="text-[10px] text-slate-400">Os 3 melhores marcadores e a quantidade de golos</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold shrink-0">
                  Top 3
                </span>
                <span className="text-slate-500 group-hover/hdr:text-emerald-400 text-xs transition-colors">➔</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {[0, 1, 2].map((idx) => {
                const s = topScorers[idx];
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                if (!s) {
                  return (
                    <div
                      key={`hub-empty-scorer-${idx}`}
                      className="flex items-center justify-between text-xs p-1.5 px-2.5 rounded-xl bg-slate-900/30 border border-slate-800/40 text-slate-500 font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs shrink-0 opacity-60">{medal}</span>
                        <span className="text-slate-500 text-[11px]">—</span>
                      </div>
                      <span className="text-[11px] text-slate-600">0 golos</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={`hub-scorer-${s.playerId || idx}`}
                    onClick={() => {
                      setGoalsAssistsTab('marcadores');
                      setShowGoalsAssistsModal(true);
                    }}
                    className="flex items-center justify-between text-xs p-1.5 px-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 cursor-pointer transition-colors group border border-slate-800/50 hover:border-emerald-500/40"
                    title={`Ver atleta na lista completa de marcadores`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs shrink-0">{medal}</span>
                      {s.playerNumber != null && (
                        <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-1 rounded shrink-0">
                          #{s.playerNumber}
                        </span>
                      )}
                      <span className="text-white font-medium truncate group-hover:text-emerald-300 transition-colors">
                        {s.playerName}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 shrink-0">
                      {s.count} {s.count === 1 ? 'golo' : 'golos'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão Ver Lista Completa */}
          <button
            type="button"
            onClick={() => {
              setGoalsAssistsTab('marcadores');
              setShowGoalsAssistsModal(true);
            }}
            className="w-full mt-2.5 py-1.5 px-3 rounded-xl bg-slate-900/90 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-emerald-500/20 hover:border-emerald-500/40 text-[11px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Ver lista completa de golos e assistências</span>
            <span>➔</span>
          </button>
        </div>

        {/* Top 3 Assistentes */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div
              onClick={() => {
                setGoalsAssistsTab('assistentes');
                setShowGoalsAssistsModal(true);
              }}
              className="flex items-center justify-between mb-2 cursor-pointer group/hdr hover:opacity-95 transition-opacity"
              title="Clique para ver a lista completa de assistências e golos"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base group-hover/hdr:scale-110 transition-transform">🎯</span>
                <div>
                  <span className="text-xs font-bold text-cyan-400 uppercase font-['Chakra_Petch'] tracking-wide block group-hover/hdr:text-cyan-300 transition-colors">
                    Melhores Assistentes
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Os 3 melhores assistentes e a quantidade de assistência
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold shrink-0">
                  Top 3
                </span>
                <span className="text-slate-500 group-hover/hdr:text-cyan-400 text-xs transition-colors">➔</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {[0, 1, 2].map((idx) => {
                const a = topAssisters[idx];
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                if (!a) {
                  return (
                    <div
                      key={`hub-empty-assister-${idx}`}
                      className="flex items-center justify-between text-xs p-1.5 px-2.5 rounded-xl bg-slate-900/30 border border-slate-800/40 text-slate-500 font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs shrink-0 opacity-60">{medal}</span>
                        <span className="text-slate-500 text-[11px]">—</span>
                      </div>
                      <span className="text-[11px] text-slate-600">0 assistências</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={`hub-assister-${a.playerId || idx}`}
                    onClick={() => {
                      setGoalsAssistsTab('assistentes');
                      setShowGoalsAssistsModal(true);
                    }}
                    className="flex items-center justify-between text-xs p-1.5 px-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 cursor-pointer transition-colors group border border-slate-800/50 hover:border-cyan-500/40"
                    title={`Ver atleta na lista completa de assistências`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs shrink-0">{medal}</span>
                      {a.playerNumber != null && (
                        <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-500/10 px-1 rounded shrink-0">
                          #{a.playerNumber}
                        </span>
                      )}
                      <span className="text-white font-medium truncate group-hover:text-cyan-300 transition-colors">
                        {a.playerName}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-cyan-400 shrink-0">
                      {a.count} {a.count === 1 ? 'assistência' : 'assistências'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão Ver Lista Completa */}
          <button
            type="button"
            onClick={() => {
              setGoalsAssistsTab('assistentes');
              setShowGoalsAssistsModal(true);
            }}
            className="w-full mt-2.5 py-1.5 px-3 rounded-xl bg-slate-900/90 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/20 hover:border-cyan-500/40 text-[11px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Ver lista completa de assistências e golos</span>
            <span>➔</span>
          </button>
        </div>
      </div>

      {/* Alerta Rápido de Assiduidade (se houver atletas em risco) */}
      {lowAttendanceList.length > 0 && (
        <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg shrink-0">⚠️</span>
            <div className="text-xs text-amber-200/90 truncate">
              <strong>{lowAttendanceList.length} atleta(s) com assiduidade baixa (&lt;70%):</strong>{' '}
              {lowAttendanceList
                .slice(0, 3)
                .map((p) => `${p.playerName} (${p.rate}%)`)
                .join(', ')}
            </div>
          </div>
          <button
            onClick={() => onNavigate('treinos')}
            className="text-[11px] font-bold text-amber-300 hover:text-white underline shrink-0 font-mono"
          >
            Ver Treinos →
          </button>
        </div>
      )}

      {/* Modal de Lista Completa de Marcadores e Assistentes */}
      <SquadGoalsAndAssistsModal
        isOpen={showGoalsAssistsModal}
        onClose={() => setShowGoalsAssistsModal(false)}
        matches={matches}
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
