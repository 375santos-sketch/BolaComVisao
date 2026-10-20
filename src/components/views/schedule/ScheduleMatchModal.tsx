import React from 'react';
import { MatchType } from '../../../types';
import { MatchFormData } from './types';
import { uid } from './constants';

interface ScheduleMatchModalProps {
  showMatchModal: boolean;
  setShowMatchModal: (show: boolean) => void;
  editingMatchId: string | null;
  matchForm: MatchFormData;
  setMatchForm: React.Dispatch<React.SetStateAction<MatchFormData>>;
  handleSaveMatch: () => void;
  handleDeleteMatch?: (id: string) => void;
  onShowConfirm?: (msg: string, cb: () => void) => void;
}

export const ScheduleMatchModal: React.FC<ScheduleMatchModalProps> = ({
  showMatchModal,
  setShowMatchModal,
  editingMatchId,
  matchForm,
  setMatchForm,
  handleSaveMatch,
  handleDeleteMatch,
  onShowConfirm
}) => {
  if (!showMatchModal) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-t sm:border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <h3 className="text-base sm:text-lg font-['Chakra_Petch'] font-black uppercase text-white">
              {editingMatchId ? 'Editar Jogo Agendado' : 'Agendar Novo Jogo'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowMatchModal(false)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-mono text-sm active:scale-95 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain space-y-3 pb-6">
          {/* Single vs Batch Switcher */}
          {!editingMatchId && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setMatchForm({ ...matchForm, isBatch: false })}
                className={`py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all ${
                  !matchForm.isBatch
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Jogo Único
              </button>
              <button
                type="button"
                onClick={() => {
                  const initialGames =
                    matchForm.games.length > 0
                      ? matchForm.games
                      : [
                          {
                            id: uid(),
                            phase: 'Fase de Grupos',
                            opp: '',
                            date: matchForm.date,
                            time: '09:00'
                          }
                        ];
                  setMatchForm({ ...matchForm, isBatch: true, games: initialGames, type: 'torneio' });
                }}
                className={`py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all ${
                  matchForm.isBatch
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Torneio (Múltiplos Jogos)
              </button>
            </div>
          )}

          {matchForm.isBatch ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Nome do Torneio *</label>
                <input
                  type="text"
                  placeholder="Ex: Torneio de Verão de Sintra"
                  value={matchForm.tournamentName}
                  onChange={(e) => setMatchForm({ ...matchForm, tournamentName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                />
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-['Chakra_Petch'] font-bold text-cyan-300 uppercase block">
                  Jogos do Torneio:
                </span>
                {matchForm.games.map((g, i) => (
                  <div key={g.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Jogo {i + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setMatchForm({
                            ...matchForm,
                            games: matchForm.games.filter((x) => x.id !== g.id)
                          })
                        }
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕ Remover
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Fase (ex: Fase Grupos)"
                        value={g.phase}
                        onChange={(e) => {
                          const newG = matchForm.games.map((x) =>
                            x.id === g.id ? { ...x, phase: e.target.value } : x
                          );
                          setMatchForm({ ...matchForm, games: newG });
                        }}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Adversário *"
                        value={g.opp}
                        onChange={(e) => {
                          const newG = matchForm.games.map((x) => (x.id === g.id ? { ...x, opp: e.target.value } : x));
                          setMatchForm({ ...matchForm, games: newG });
                        }}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={g.date}
                        onChange={(e) => {
                          const newG = matchForm.games.map((x) => (x.id === g.id ? { ...x, date: e.target.value } : x));
                          setMatchForm({ ...matchForm, games: newG });
                        }}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-mono"
                      />
                      <input
                        type="time"
                        value={g.time}
                        onChange={(e) => {
                          const newG = matchForm.games.map((x) => (x.id === g.id ? { ...x, time: e.target.value } : x));
                          setMatchForm({ ...matchForm, games: newG });
                        }}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const last = matchForm.games[matchForm.games.length - 1];
                    setMatchForm({
                      ...matchForm,
                      games: [
                        ...matchForm.games,
                        {
                          id: uid(),
                          phase: last ? last.phase : 'Fase de Grupos',
                          opp: '',
                          date: last ? last.date : matchForm.date,
                          time: '10:00'
                        }
                      ]
                    });
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-950 border border-dashed border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-xs font-mono"
                >
                  ＋ Adicionar Outro Jogo ao Torneio
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Adversário *</label>
                <input
                  type="text"
                  placeholder="Nome da equipa adversária"
                  value={matchForm.opp}
                  onChange={(e) => setMatchForm({ ...matchForm, opp: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Data *</label>
                  <input
                    type="date"
                    value={matchForm.date}
                    onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Hora *</label>
                  <input
                    type="time"
                    value={matchForm.time}
                    onChange={(e) => setMatchForm({ ...matchForm, time: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Location & Match Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Local</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setMatchForm({ ...matchForm, loc: 'casa' })}
                      className={`p-2 rounded-xl text-xs font-mono ${
                        matchForm.loc === 'casa'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Casa
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchForm({ ...matchForm, loc: 'fora' })}
                      className={`p-2 rounded-xl text-xs font-mono ${
                        matchForm.loc === 'fora'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Fora
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Tipo</label>
                  <select
                    value={matchForm.type}
                    onChange={(e) => setMatchForm({ ...matchForm, type: e.target.value as MatchType })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  >
                    <option value="amigavel">Amigável</option>
                    <option value="campeonato">Campeonato</option>
                    <option value="torneio">Torneio</option>
                  </select>
                </div>
              </div>

              {matchForm.type === 'torneio' && (
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Nome do Torneio</label>
                  <input
                    type="text"
                    placeholder="Ex: Torneio de Páscoa"
                    value={matchForm.tournamentName}
                    onChange={(e) => setMatchForm({ ...matchForm, tournamentName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              )}

              {(matchForm.type === 'campeonato' || matchForm.type === 'torneio') && (
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Fase / Jornada</label>
                  <input
                    type="text"
                    placeholder="Ex: Jornada 4 ou Quartos de Final"
                    value={matchForm.phase}
                    onChange={(e) => setMatchForm({ ...matchForm, phase: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Estádio / Campo</label>
                  <input
                    type="text"
                    placeholder="Ex: Campo Municipal"
                    value={matchForm.venue}
                    onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Hora de Concentração</label>
                  <input
                    type="time"
                    value={matchForm.meetingTime}
                    onChange={(e) => setMatchForm({ ...matchForm, meetingTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
          {editingMatchId && handleDeleteMatch && onShowConfirm ? (
            <button
              type="button"
              onClick={() => {
                onShowConfirm('Tens a certeza que desejas eliminar este jogo cancelado da agenda?', () => {
                  handleDeleteMatch(editingMatchId);
                  setShowMatchModal(false);
                });
              }}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-300 hover:text-white text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="Eliminar este jogo cancelado da agenda"
            >
              <span>🗑️</span>
              <span>Eliminar Jogo (Cancelado)</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowMatchModal(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveMatch}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_15px_rgba(0,210,255,0.4)] active:scale-95 transition-all flex items-center justify-center"
            >
              {editingMatchId ? 'Guardar Alterações 💾' : 'Guardar no Calendário ⚽'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
