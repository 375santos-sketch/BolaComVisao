import React, { useState, useMemo } from 'react';
import { Player } from '../../../../types';
import { playerLabel } from '../../../../lib/utils';
import { LINEUP_SIZE } from '../../../../lib/constants';

interface LineupModalProps {
  isOpen: boolean;
  onClose?: () => void;
  half: 1 | 2;
  availablePlayers: Player[];
  convocadosIds?: string[];
  lineupSize?: number;
  initialSelection?: string[];
  onConfirm: (selectedIds: string[]) => void;
  canCancel?: boolean;
}

export const LineupModal: React.FC<LineupModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <LineupModalInner key={`lineup-half-${props.half}`} {...props} />;
};

const LineupModalInner: React.FC<LineupModalProps> = ({
  onClose,
  half,
  availablePlayers,
  convocadosIds,
  lineupSize = LINEUP_SIZE,
  initialSelection = [],
  onConfirm,
  canCancel = true
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    (initialSelection || []).filter((id) =>
      availablePlayers.some((p) => p.id === id)
    )
  );
  const [searchTerm, setSearchTerm] = useState('');

  const hasFewConvocados =
    convocadosIds !== undefined && convocadosIds.length < lineupSize;

  // Se houver poucos convocados, listar primeiro os convocados e depois os não convocados
  const sortedPlayers = useMemo(() => {
    if (!hasFewConvocados || !convocadosIds) return availablePlayers;
    const convocadosSet = new Set(convocadosIds);
    return [...availablePlayers].sort((a, b) => {
      const aConv = convocadosSet.has(a.id) ? 0 : 1;
      const bConv = convocadosSet.has(b.id) ? 0 : 1;
      return aConv - bConv;
    });
  }, [availablePlayers, hasFewConvocados, convocadosIds]);

  const count = selectedIds.length;
  const isExact = count === lineupSize;

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= lineupSize) {
        return; // Don't exceed lineupSize
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAllFirst = () => {
    const firstN = sortedPlayers.slice(0, lineupSize).map((p) => p.id);
    setSelectedIds(firstN);
  };

  const filteredPlayers = sortedPlayers.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (p.name || '').toLowerCase();
    const nick = (p.nickname || '').toLowerCase();
    const pos = (p.positions || '').toLowerCase();
    const num = String(p.number || '');
    return name.includes(term) || nick.includes(term) || pos.includes(term) || num.includes(term);
  });

  const convocadosSet = convocadosIds ? new Set(convocadosIds) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <h3 className="text-lg sm:text-xl font-bold font-['Chakra_Petch'] uppercase tracking-wide text-white">
                {half === 1
                  ? `${lineupSize} Titulares da 1.ª Parte`
                  : `${lineupSize} Titulares da 2.ª Parte`}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {half === 1
                ? `Escolhe os ${lineupSize} jogadores que iniciam o jogo em campo.`
                : `Revê e confirma os ${lineupSize} jogadores que alinham para a 2.ª parte.`}
            </p>
          </div>

          {canCancel && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 text-xl transition-colors"
              title="Fechar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Aviso de poucos convocados quando aplicável */}
        {hasFewConvocados && (
          <div className="my-2.5 p-3 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2.5 shadow-sm">
            <span className="text-base shrink-0">⚠️</span>
            <span>
              Só há {convocadosIds?.length || 0} jogadores convocados (mínimo {lineupSize}). A mostrar todo o plantel.
            </span>
          </div>
        )}

        {/* Counter & Status Bar */}
        <div className="my-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Titulares:
            </span>
            <div
              className={`px-3 py-1 rounded-xl text-sm font-black font-mono flex items-center gap-1.5 ${
                isExact
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              <span>{count}</span>
              <span className="text-xs font-normal text-slate-400">/ {lineupSize}</span>
            </div>
          </div>

          <div className="text-xs font-semibold">
            {isExact ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span>✓</span> Pronto a iniciar
              </span>
            ) : count < lineupSize ? (
              <span className="text-amber-400">Falta escolher {lineupSize - count}</span>
            ) : (
              <span className="text-rose-400">Remove {count - lineupSize}</span>
            )}
          </div>
        </div>

        {/* Search input & Quick Fill button */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="Filtrar por nome, número ou posição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          {selectedIds.length === 0 && sortedPlayers.length >= lineupSize && (
            <button
              type="button"
              onClick={handleSelectAllFirst}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition-colors shrink-0"
            >
              1.ºs {lineupSize}
            </button>
          )}
        </div>

        {/* Player List / Grid */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-1 min-h-[220px]">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Nenhum jogador encontrado com essa pesquisa.
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isSelected = selectedIds.includes(player.id);
              const label = playerLabel(player, 'Sem nome');
              const num = player.number ? `#${player.number}` : '';
              const pos = player.positions || 'Jogador';
              const isConvocado = convocadosSet ? convocadosSet.has(player.id) : null;

              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`p-2.5 sm:p-3 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold font-mono text-xs ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {num ? player.number : '•'}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate flex items-center gap-1.5">
                        <span>{label}</span>
                        {player.captain && (
                          <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-300">
                            C
                          </span>
                        )}
                        {hasFewConvocados && isConvocado !== null && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono uppercase ${
                              isConvocado
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isConvocado ? 'Convocado' : 'Não convocado'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{pos}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'border border-slate-700 text-transparent'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          {canCancel && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
          )}

          <button
            type="button"
            disabled={!isExact}
            onClick={() => onConfirm(selectedIds)}
            className={`px-5 py-2.5 rounded-xl font-bold font-['Chakra_Petch'] uppercase tracking-wider text-xs transition-all shadow-lg ${
              isExact
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 shadow-emerald-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            {half === 1
              ? `Confirmar ${lineupSize} Titulares`
              : 'Confirmar e Iniciar 2.ª Parte'}
          </button>
        </div>
      </div>
    </div>
  );
};
