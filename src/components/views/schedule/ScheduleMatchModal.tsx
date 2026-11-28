import React from 'react';
import { Icon } from '../../ui/Icon';
import { DateTimePT } from '../../ui/DateTimePT';
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
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="ui-card rounded-b-none sm:rounded-ui-lg max-w-lg w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-ui-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-ui-body font-bold text-ui-text">{editingMatchId ? 'Editar jogo' : 'Agendar jogo'}</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowMatchModal(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
            aria-label="Fechar"
          >
            <Icon name="x" className="h-5 w-5 shrink-0" />
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
                className={`py-2 px-3 rounded-ui-sm text-xs font-semibold transition-all ${
                  !matchForm.isBatch
                    ? 'bg-ui-surface-3 text-ui-text'
                    : 'bg-ui-inset border border-ui-line text-ui-muted hover:text-ui-text'
                }`}
              >
                Jogo único
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
                className={`py-2 px-3 rounded-ui-sm text-xs font-semibold transition-all ${
                  matchForm.isBatch
                    ? 'bg-ui-surface-3 text-ui-text'
                    : 'bg-ui-inset border border-ui-line text-ui-muted hover:text-ui-text'
                }`}
              >
                Torneio (vários jogos)
              </button>
            </div>
          )}

          {matchForm.isBatch ? (
            <div className="space-y-3">
              <div>
                <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Nome do torneio *</label>
                <input
                  type="text"
                  placeholder="Ex: Torneio de Verão de Sintra"
                  value={matchForm.tournamentName}
                  onChange={(e) => setMatchForm({ ...matchForm, tournamentName: e.target.value })}
                  className="ui-input w-full text-xs"
                />
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-ui-caption font-semibold text-ui-muted block">Jogos do torneio</span>
                {matchForm.games.map((g, i) => (
                  <div key={g.id} className="ui-inset p-3 space-y-2">
                    <div className="flex items-center justify-between text-ui-caption text-ui-muted">
                      <span>Jogo {i + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setMatchForm({
                            ...matchForm,
                            games: matchForm.games.filter((x) => x.id !== g.id)
                          })
                        }
                        className="flex min-h-8 items-center gap-1 text-ui-danger"
                      >
                        <Icon name="x" className="h-4 w-4 shrink-0" />
                        Remover
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
                        className="ui-input text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Adversário *"
                        value={g.opp}
                        onChange={(e) => {
                          const newG = matchForm.games.map((x) => (x.id === g.id ? { ...x, opp: e.target.value } : x));
                          setMatchForm({ ...matchForm, games: newG });
                        }}
                        className="ui-input text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <DateTimePT
                        type="date"
                        label="Data"
                        value={g.date}
                        onChange={(v) => {
                          const newG = matchForm.games.map((x) => (x.id === g.id ? { ...x, date: v } : x));
                          setMatchForm({ ...matchForm, games: newG });
                        }}
                        inputClassName="ui-input text-xs"
                      />
                      <DateTimePT
                        type="time"
                        label="Hora"
                        value={g.time}
                        onChange={(v) => {
                          const newG = matchForm.games.map((x) => (x.id === g.id ? { ...x, time: v } : x));
                          setMatchForm({ ...matchForm, games: newG });
                        }}
                        inputClassName="ui-input text-xs"
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
                  className="ui-btn ui-btn-soft w-full py-2.5 text-xs"
                >
                  <Icon name="plus" className="h-4 w-4 shrink-0" />
                  Adicionar outro jogo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Adversário *</label>
                <input
                  type="text"
                  placeholder="Nome da equipa adversária"
                  value={matchForm.opp}
                  onChange={(e) => setMatchForm({ ...matchForm, opp: e.target.value })}
                  className="ui-input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Data *</label>
                  <DateTimePT
                    type="date"
                    label="Data do jogo"
                    value={matchForm.date}
                    onChange={(v) => setMatchForm({ ...matchForm, date: v })}
                    inputClassName="ui-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Hora *</label>
                  <DateTimePT
                    type="time"
                    label="Hora do jogo"
                    value={matchForm.time}
                    onChange={(v) => setMatchForm({ ...matchForm, time: v })}
                    inputClassName="ui-input w-full text-xs"
                  />
                </div>
              </div>

              {/* Location & Match Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Local</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setMatchForm({ ...matchForm, loc: 'casa' })}
                      className={`min-h-10 p-2 rounded-ui-sm text-xs font-semibold ${
                        matchForm.loc === 'casa'
                          ? 'bg-ui-brand text-ui-brand-ink'
                          : 'bg-ui-inset text-ui-muted border border-ui-line'
                      }`}
                    >
                      Casa
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchForm({ ...matchForm, loc: 'fora' })}
                      className={`min-h-10 p-2 rounded-ui-sm text-xs font-semibold ${
                        matchForm.loc === 'fora'
                          ? 'bg-ui-brand text-ui-brand-ink'
                          : 'bg-ui-inset text-ui-muted border border-ui-line'
                      }`}
                    >
                      Fora
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Tipo</label>
                  <select
                    value={matchForm.type}
                    onChange={(e) => setMatchForm({ ...matchForm, type: e.target.value as MatchType })}
                    className="ui-input w-full text-xs"
                  >
                    <option value="amigavel">Amigável</option>
                    <option value="campeonato">Campeonato</option>
                    <option value="torneio">Torneio</option>
                  </select>
                </div>
              </div>

              {matchForm.type === 'torneio' && (
                <div>
                  <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Nome do torneio</label>
                  <input
                    type="text"
                    placeholder="Ex: Torneio de Páscoa"
                    value={matchForm.tournamentName}
                    onChange={(e) => setMatchForm({ ...matchForm, tournamentName: e.target.value })}
                    className="ui-input w-full text-xs"
                  />
                </div>
              )}

              {(matchForm.type === 'campeonato' || matchForm.type === 'torneio') && (
                <div>
                  <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Fase ou jornada</label>
                  <input
                    type="text"
                    placeholder="Ex: Jornada 4 ou Quartos de Final"
                    value={matchForm.phase}
                    onChange={(e) => setMatchForm({ ...matchForm, phase: e.target.value })}
                    className="ui-input w-full text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Campo</label>
                  <input
                    type="text"
                    placeholder="Ex: Campo Municipal"
                    value={matchForm.venue}
                    onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })}
                    className="ui-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="text-ui-caption font-semibold text-ui-muted block mb-1">Hora de concentração</label>
                  <DateTimePT
                    type="time"
                    label="Hora de concentração"
                    value={matchForm.meetingTime}
                    onChange={(v) => setMatchForm({ ...matchForm, meetingTime: v })}
                    inputClassName="ui-input w-full text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-ui-inset/95 border-t border-ui-line flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
          {editingMatchId && handleDeleteMatch && onShowConfirm ? (
            <button
              type="button"
              onClick={() => {
                onShowConfirm('Tens a certeza que desejas eliminar este jogo cancelado da agenda?', () => {
                  handleDeleteMatch(editingMatchId);
                  setShowMatchModal(false);
                });
              }}
              className="ui-btn ui-btn-soft-danger px-4 py-2.5 min-h-[44px] text-xs flex items-center gap-1.5"
              title="Eliminar este jogo cancelado da agenda"
            >
              <Icon name="trash" className="h-4 w-4 shrink-0" />
              <span>Eliminar jogo</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowMatchModal(false)}
              className="ui-btn ui-btn-secondary px-4 py-2.5 min-h-[44px] text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveMatch}
              className="ui-btn ui-btn-primary px-5 py-2.5 min-h-[44px] text-xs flex items-center justify-center"
            >
              {editingMatchId ? 'Guardar alterações' : 'Guardar no calendário'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
