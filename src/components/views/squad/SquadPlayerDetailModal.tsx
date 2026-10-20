import React, { useState } from 'react';
import { Player, AppState } from '../../../types';
import { STATUS_CONFIG } from './types';
import { computeAge } from '../../../lib/utils';
import { calculatePlayerEvolution } from '../../../lib/intelligenceEngine';

interface SquadPlayerDetailModalProps {
  player: Player | null;
  stats: {
    golos: number;
    assistencias: number;
    amarelos: number;
    vermelhos: number;
    media: string;
    faltasTreino: number;
    jogosTitular: number;
    titularSegundaParte?: number;
    partesTitular?: number;
    minutos: number;
  } | null;
  state: AppState;
  onClose: () => void;
  onEdit: (player: Player) => void;
  onShowToast: (msg: string) => void;
  onUpdateState?: (partial: Partial<AppState>) => void;
}

export const SquadPlayerDetailModal: React.FC<SquadPlayerDetailModalProps> = ({
  player,
  stats,
  state,
  onClose,
  onEdit,
  onShowToast,
  onUpdateState
}) => {
  if (!player || !stats) return null;

  return (
    <SquadPlayerDetailModalInner
      key={player.id}
      player={player}
      stats={stats}
      state={state}
      onClose={onClose}
      onEdit={onEdit}
      onShowToast={onShowToast}
      onUpdateState={onUpdateState}
    />
  );
};

interface SquadPlayerDetailModalInnerProps {
  player: Player;
  stats: {
    golos: number;
    assistencias: number;
    amarelos: number;
    vermelhos: number;
    media: string;
    faltasTreino: number;
    jogosTitular: number;
    titularSegundaParte?: number;
    partesTitular?: number;
    minutos: number;
  };
  state: AppState;
  onClose: () => void;
  onEdit: (player: Player) => void;
  onShowToast: (msg: string) => void;
  onUpdateState?: (partial: Partial<AppState>) => void;
}

const SquadPlayerDetailModalInner: React.FC<SquadPlayerDetailModalInnerProps> = ({
  player,
  stats,
  state,
  onClose,
  onEdit,
  onShowToast,
  onUpdateState
}) => {
  const [coachNotes, setCoachNotes] = useState<string>(player.coachNotes || player.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  const st = STATUS_CONFIG[player.status || 'disponivel'];
  const evo = calculatePlayerEvolution(player, state);

  const handleSaveCoachNotes = () => {
    if (!onUpdateState) {
      onShowToast('Notas atualizadas localmente!');
      return;
    }
    setIsSavingNotes(true);
    const updatedRoster = (state.roster || []).map((p) =>
      p.id === player.id ? { ...p, coachNotes, notes: coachNotes } : p
    );

    // Se estiver a usar activeTeamId, atualiza também a equipa ativa
    let updatedTeams = state.teams;
    if (state.activeTeamId && state.teams) {
      updatedTeams = state.teams.map((t) =>
        t.id === state.activeTeamId ? { ...t, roster: updatedRoster } : t
      );
    }

    onUpdateState({
      roster: updatedRoster,
      ...(updatedTeams ? { teams: updatedTeams } : {})
    });

    setIsSavingNotes(false);
    onShowToast(`Notas confidenciais de ${player.name} guardadas! 📝`);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border-t sm:border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(0,210,255,0.25)] max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto scrollbar-thin text-left pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
        {/* Header / Avatar Box */}
        <div className="flex items-start justify-between border-b border-cyan-500/20 pb-4">
          <div className="flex items-center gap-3">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400 shadow-md"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-950 border-2 border-cyan-500/40 flex items-center justify-center text-3xl font-mono text-cyan-400 font-bold">
                {player.number !== null && player.number !== undefined ? `#${player.number}` : '⚽'}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-['Chakra_Petch']">{player.name}</h3>
                {player.number !== null && player.number !== undefined && (
                  <span className="bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-extrabold text-xs px-2 py-0.5 rounded-md">
                    #{player.number}
                  </span>
                )}
              </div>

              <div className="text-xs text-cyan-300 font-mono mt-0.5">{player.positions || 'Posição Não Definida'}</div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${st.bg} ${st.text} ${st.border}`}
                >
                  {st.icon} {st.label}
                </span>

                {/* Alerta de faltas consecutivas */}
                {evo && (evo.consecutiveAbsences || 0) >= 2 && (
                  <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                    ⚠️ {evo.consecutiveAbsences} Faltas Seguidas
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
          >
            ✖
          </button>
        </div>

        {/* Physical Profile Grid */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider mb-2">
              👤 Perfil Físico & Pessoal
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Idade / Data Nasc.</span>
                <span className="font-bold text-white">
                  {computeAge(player.birthDate) ? `${computeAge(player.birthDate)} anos` : 'N/D'}
                </span>
                {player.birthDate && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">({player.birthDate})</span>
                )}
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Pé Dominante</span>
                <span className="font-bold text-cyan-300">{player.dominantFoot || 'Direito'}</span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Altura</span>
                <span className="font-bold text-white">{player.height || 'N/D'}</span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Peso</span>
                <span className="font-bold text-white">{player.weight || 'N/D'}</span>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider mb-2">
              📞 Contactos
            </h4>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Telefone Atleta:</span>
                <span className="font-bold text-cyan-300">{player.phone || 'Não registado'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-white truncate max-w-[200px]">{player.email || 'Não registado'}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-900 pt-2">
                <span className="text-slate-500">Emergência / Enc.:</span>
                <span className="font-bold text-amber-300">{player.emergencyContact || 'Não registado'}</span>
              </div>
            </div>
          </div>

          {/* Match Statistics */}
          <div>
            <h4 className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider mb-2">
              📊 Rendimento na Época
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="text-lg font-extrabold text-cyan-400">{stats.golos}</div>
                <div className="text-[9px] text-slate-500 uppercase">Golos</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="text-lg font-extrabold text-cyan-400">{stats.assistencias}</div>
                <div className="text-[9px] text-slate-500 uppercase">Assistências</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="text-lg font-extrabold text-amber-300">{stats.media}</div>
                <div className="text-[9px] text-slate-500 uppercase">Média Aval.</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="text-lg font-extrabold text-white">{stats.minutos}</div>
                <div className="text-[9px] text-slate-500 uppercase">Minutos</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="text-lg font-extrabold text-white">{stats.jogosTitular}</div>
                <div className="text-[9px] text-slate-500 uppercase">Titular (1.ª P)</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="text-lg font-extrabold text-white">{stats.titularSegundaParte ?? 0}</div>
                <div className="text-[9px] text-slate-500 uppercase">Titular (2.ª P)</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="text-lg font-extrabold text-emerald-400">{stats.partesTitular ?? 0}</div>
                <div className="text-[9px] text-slate-500 uppercase">Partes a Titular</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="text-lg font-extrabold text-slate-300">
                  🟨{stats.amarelos} 🟥{stats.vermelhos}
                </div>
                <div className="text-[9px] text-slate-500 uppercase">Cartões</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="text-lg font-extrabold text-rose-400">{stats.faltasTreino}</div>
                <div className="text-[9px] text-slate-500 uppercase">Faltas Treino</div>
              </div>
            </div>
          </div>

          {/* Real-time Player Intelligence & Evolution */}
          {evo && (
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider">
                  📈 Inteligência & Evolução
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                    evo.ratingTrend === 'positiva'
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      : evo.ratingTrend === 'negativa'
                        ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  {evo.ratingTrend === 'positiva'
                    ? '↗ Forma Positiva'
                    : evo.ratingTrend === 'negativa'
                      ? '↘ Forma em Queda'
                      : '→ Desempenho Regular'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Assiduidade Global:</span>
                  <span className="font-bold text-white text-base">
                    {evo.totalTrainings > 0 ? `${evo.attendanceRate}%` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {evo.totalTrainings > 0
                      ? `${evo.attendancePresences}/${evo.totalTrainings} sessões`
                      : 'Sem treinos registados'}
                  </span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Média Avaliação:</span>
                  <span className="font-bold text-amber-300 text-base">{evo.avgRating > 0 ? evo.avgRating : 'N/D'}</span>
                  <span className="text-[10px] text-slate-500 block">({evo.minutes} min jogados)</span>
                </div>
              </div>

              {/* Evolução Mensal de Assiduidade (Setembro, Outubro, etc.) */}
              {evo.monthlyAttendance && evo.monthlyAttendance.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <span className="text-[11px] font-mono uppercase text-cyan-300 font-bold block">
                    📅 Evolução Mensal de Assiduidade:
                  </span>
                  <div className="space-y-1.5">
                    {evo.monthlyAttendance.map((m, idx) => {
                      const barColor =
                        m.rate >= 85
                          ? 'bg-emerald-500'
                          : m.rate >= 70
                            ? 'bg-amber-500'
                            : 'bg-rose-500';

                      const textColor =
                        m.rate >= 85
                          ? 'text-emerald-400'
                          : m.rate >= 70
                            ? 'text-amber-400'
                            : 'text-rose-400';

                      return (
                        <div key={idx} className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                          <div className="flex items-center justify-between text-xs font-mono mb-1">
                            <span className="text-slate-300 font-medium">{m.monthName}</span>
                            <span className={`font-bold ${textColor}`}>
                              {m.rate}% <span className="text-slate-500 text-[10px]">({m.presences}/{m.totalTrainings})</span>
                            </span>
                          </div>
                          {/* Barra de Progresso */}
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                              style={{ width: `${Math.max(4, m.rate)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {evo.summaryText && (
                <p className="text-[11px] font-mono text-slate-300 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                  💡 {evo.summaryText}
                </p>
              )}
            </div>
          )}

          {/* Notas Confidenciais do Treinador */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-purple-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-['Chakra_Petch'] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📝</span>
                <span>Notas do Treinador (Confidencial)</span>
              </span>
              <button
                onClick={handleSaveCoachNotes}
                disabled={isSavingNotes}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-mono text-[10px] font-bold transition-all"
              >
                {isSavingNotes ? 'A gravar...' : 'Guardar'}
              </button>
            </div>
            <textarea
              rows={2}
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="Ex: Ponto de trabalho no pé fraco, atitude positiva, acordo de horários..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none font-mono"
            />
          </div>

          {/* Individual Export Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={async () => {
                const { generatePlayerProfilePDF } = await import('../../../lib/pdfUtils');
                generatePlayerProfilePDF(player, stats, state);
                onShowToast(`Ficha PDF de ${player.name} gerada com sucesso! 📄`);
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-mono text-xs font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5"
            >
              <span>📄</span>
              <span>PDF Ficha do Atleta</span>
            </button>

            <button
              onClick={async () => {
                const { exportPlayerProfileExcel } = await import('../../../lib/exportUtils');
                exportPlayerProfileExcel(player, stats, state);
                onShowToast(`Ficha Excel de ${player.name} exportada! 📊`);
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-mono text-xs font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5"
            >
              <span>📊</span>
              <span>Excel Ficha do Atleta</span>
            </button>
          </div>

          {/* Drawer Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                onClose();
                onEdit(player);
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold hover:bg-slate-900"
            >
              ✏️ Editar Dados
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 font-mono text-xs font-bold hover:bg-slate-900"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

