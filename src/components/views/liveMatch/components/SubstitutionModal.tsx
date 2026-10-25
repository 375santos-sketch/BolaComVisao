import React, { useState } from 'react';
import { SubEvent, Player, MatchPeriod } from '../../../../types';
import { PlayerOptions } from './PlayerOptions';

interface SubPair {
  id: string;
  outId: string;
  inId: string;
}

interface SubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSub: SubEvent | null;
  eligiblePlayers: Player[];
  onPitchIds?: string[];
  subOutId: string;
  setSubOutId: (id: string) => void;
  subInId: string;
  setSubInId: (id: string) => void;
  subMinute: string;
  setSubMinute: (val: string) => void;
  suggestedMinute?: string | null;
  subPeriod?: MatchPeriod;
  setSubPeriod?: (val: MatchPeriod) => void;
  onSave: () => void;
  onSaveBatch?: (pairs: Array<{ outId: string; inId: string }>, minute: string, period?: MatchPeriod) => void;
}

const SubstitutionModalDialog: React.FC<SubstitutionModalProps> = ({
  onClose,
  editingSub,
  eligiblePlayers,
  onPitchIds,
  subOutId,
  setSubOutId,
  subInId,
  setSubInId,
  subMinute,
  setSubMinute,
  suggestedMinute,
  subPeriod,
  setSubPeriod,
  onSave,
  onSaveBatch
}) => {
  const [isModified, setIsModified] = useState(false);

  // Local state for simultaneous substitution rows initialized without useEffect
  const [pairs, setPairs] = useState<SubPair[]>(() => {
    if (editingSub) {
      return [
        {
          id: editingSub.id,
          outId: editingSub.outId,
          inId: editingSub.inId
        }
      ];
    }
    const initialOut = subOutId || eligiblePlayers[0]?.id || '';
    const initialIn =
      subInId && subInId !== initialOut ? subInId : eligiblePlayers.find((p) => p.id !== initialOut)?.id || '';

    return [
      {
        id: `pair-${Date.now()}-0`,
        outId: initialOut,
        inId: initialIn
      }
    ];
  });

  const [localMinute, setLocalMinute] = useState(subMinute);
  const [localPeriod] = useState<MatchPeriod>(subPeriod || '1.ª parte');
  const [validationError, setValidationError] = useState<string | null>(null);

  const showSuggestedLabel =
    !editingSub &&
    !isModified &&
    Boolean(suggestedMinute) &&
    localMinute.trim() === suggestedMinute?.trim() &&
    localMinute.trim().toUpperCase() !== 'INT';

  // Find next available unused players for a new simultaneous pair
  const getNextAvailablePair = (currentPairs: SubPair[]): { outId: string; inId: string } => {
    const usedOut = new Set(currentPairs.map((p) => p.outId));
    const usedIn = new Set(currentPairs.map((p) => p.inId));

    const nextOut = eligiblePlayers.find((p) => !usedOut.has(p.id) && !usedIn.has(p.id))?.id || '';
    const nextIn = eligiblePlayers.find((p) => !usedIn.has(p.id) && !usedOut.has(p.id) && p.id !== nextOut)?.id || '';

    return { outId: nextOut, inId: nextIn };
  };

  const handleAddPair = () => {
    setValidationError(null);
    if (pairs.length >= 6) {
      setValidationError('Máximo de 6 substituições simultâneas atingido.');
      return;
    }

    const next = getNextAvailablePair(pairs);
    setPairs((prev) => [
      ...prev,
      {
        id: `pair-${Date.now()}-${prev.length}`,
        outId: next.outId,
        inId: next.inId
      }
    ]);
  };

  const handleRemovePair = (indexToRemove: number) => {
    setValidationError(null);
    if (pairs.length <= 1) return;
    setPairs((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdatePair = (index: number, field: 'outId' | 'inId', value: string) => {
    setValidationError(null);
    setPairs((prev) => prev.map((p, idx) => (idx === index ? { ...p, [field]: value } : p)));

    // Also keep parent single-selection in sync for first pair
    if (index === 0) {
      if (field === 'outId') setSubOutId(value);
      if (field === 'inId') setSubInId(value);
    }
  };

  const handleConfirm = () => {
    setValidationError(null);

    // 1. Validate all pairs
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      if (!p.outId || !p.inId) {
        setValidationError(`Selecione ambos os jogadores para a substituição #${i + 1}.`);
        return;
      }
      if (p.outId === p.inId) {
        setValidationError(`Na substituição #${i + 1}, o jogador que sai não pode ser o mesmo que entra.`);
        return;
      }
    }

    // 2. Validate no player is repeated across rows
    const outIds = pairs.map((p) => p.outId);
    const inIds = pairs.map((p) => p.inId);

    if (new Set(outIds).size !== outIds.length) {
      setValidationError('O mesmo jogador não pode sair em mais do que uma substituição em simultâneo.');
      return;
    }
    if (new Set(inIds).size !== inIds.length) {
      setValidationError('O mesmo jogador não pode entrar em mais do que uma substituição em simultâneo.');
      return;
    }

    // Cross-check: a player entering cannot also be exiting in the same batch
    for (const inId of inIds) {
      if (outIds.includes(inId)) {
        setValidationError('Um jogador não pode sair e entrar na mesma janela de substituições.');
        return;
      }
    }

    // Validate minute
    const trimmedMin = localMinute.trim();
    if (!trimmedMin) {
      setValidationError('Indica o minuto da substituição.');
      return;
    }

    // Sync minute and period to parent
    setSubMinute(localMinute);
    setSubPeriod(localPeriod);

    if (editingSub) {
      // Editing single sub
      setSubOutId(pairs[0].outId);
      setSubInId(pairs[0].inId);
      if (onSaveBatch) {
        onSaveBatch(pairs, localMinute, localPeriod);
      } else {
        onSave();
      }
    } else {
      // Batch or single new sub
      if (onSaveBatch) {
        onSaveBatch(pairs, localMinute, localPeriod);
      } else {
        // Fallback: save first sub
        setSubOutId(pairs[0].outId);
        setSubInId(pairs[0].inId);
        onSave();
      }
    }
  };

  return (
    <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="ui-card max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xl">
              🔄
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                {editingSub ? 'Editar Substituição' : 'Registar Substituições'}
                {!editingSub && pairs.length > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 font-mono font-bold border border-blue-400/40">
                    {pairs.length} em simultâneo
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {editingSub
                  ? 'Ajuste os intervenientes e minuto da substituição.'
                  : 'Registe uma ou várias substituições simultâneas no mesmo minuto.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ui-btn ui-btn-secondary w-8 h-8 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Validation Error Alert */}
          {validationError && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/50 flex items-center gap-2 text-rose-300 text-xs animate-shake">
              <span className="text-base shrink-0">⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* List of Substitution Pairs */}
          <div className="space-y-3">
            {pairs.map((pair, index) => {
              // Other pairs' selected IDs to disable/warn
              const otherOutIds = pairs.filter((_, i) => i !== index).map((p) => p.outId);
              const otherInIds = pairs.filter((_, i) => i !== index).map((p) => p.inId);

              return (
                <div key={pair.id || index} className="ui-inset p-3.5 sm:p-4 transition-colors space-y-3 relative">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/40 text-[11px] font-bold text-blue-300 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-['Chakra_Petch']">
                        Substituição {pairs.length > 1 ? `#${index + 1}` : ''}
                      </span>
                    </div>

                    {!editingSub && pairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePair(index)}
                        className="ui-btn ui-btn-soft-danger text-[11px] px-2 py-1 flex items-center gap-1"
                        title="Remover esta troca"
                      >
                        <span>✕</span>
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Jogador que Sai */}
                    <div>
                      <label className="block text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span>🔴 Sai de Campo</span>
                      </label>
                      <select
                        value={pair.outId}
                        onChange={(e) => handleUpdatePair(index, 'outId', e.target.value)}
                        className="ui-input w-full text-xs sm:text-sm"
                      >
                        <option value="" disabled>
                          Selecione o jogador que sai...
                        </option>
                        <PlayerOptions
                          players={eligiblePlayers}
                          onPitchIds={onPitchIds}
                          optionState={(p) => {
                            const isUsedElsewhere = otherOutIds.includes(p.id) || otherInIds.includes(p.id);
                            return { disabled: isUsedElsewhere, suffix: isUsedElsewhere ? ' (Já selecionado)' : '' };
                          }}
                        />
                      </select>
                    </div>

                    {/* Jogador que Entra */}
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span>🟢 Entra em Campo</span>
                      </label>
                      <select
                        value={pair.inId}
                        onChange={(e) => handleUpdatePair(index, 'inId', e.target.value)}
                        className="ui-input w-full text-xs sm:text-sm"
                      >
                        <option value="" disabled>
                          Selecione o jogador que entra...
                        </option>
                        <PlayerOptions
                          players={eligiblePlayers}
                          onPitchIds={onPitchIds}
                          benchFirst
                          optionState={(p) => {
                            const isSameAsOut = p.id === pair.outId;
                            const isUsedElsewhere = otherInIds.includes(p.id) || otherOutIds.includes(p.id);
                            return {
                              disabled: isSameAsOut || isUsedElsewhere,
                              suffix: isSameAsOut ? ' (A sair nesta troca)' : isUsedElsewhere ? ' (Já selecionado)' : ''
                            };
                          }}
                        />
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Simultaneous Substitution Button */}
          {!editingSub && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddPair}
                className="ui-btn ui-btn-soft w-full py-2.5 px-4 text-xs flex items-center justify-center gap-2 group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">➕</span>
                <span>Adicionar Outra Substituição em Simultâneo</span>
                <span className="text-[10px] text-blue-200/70 font-mono font-normal">(Dupla / Tripla Troca)</span>
              </button>
            </div>
          )}

          {/* Timing Section (Shared across simultaneous substitutions) */}
          <div className="ui-inset p-3.5 sm:p-4 space-y-3">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-['Chakra_Petch'] flex items-center justify-between">
              <span>⏱️ Momento da(s) Substituição(ões)</span>
              {pairs.length > 1 && (
                <span className="text-[10px] text-slate-400 font-normal">
                  Aplicado a todas as {pairs.length} trocas
                </span>
              )}
            </div>

            {/* Quick Timing Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => {
                  setLocalMinute('INT');
                  setSubMinute('INT');
                  setIsModified(true);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all border ${
                  localMinute.trim().toUpperCase() === 'INT'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                ⏸️ Intervalo (INT)
              </button>

              {suggestedMinute && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalMinute(suggestedMinute);
                    setSubMinute(suggestedMinute);
                    setIsModified(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all border ${
                    localMinute.trim() === suggestedMinute.trim() && localMinute.trim().toUpperCase() !== 'INT'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                      : 'bg-slate-900 text-emerald-400 border-emerald-500/40 hover:bg-emerald-950/40'
                  }`}
                  title={`Aplicar minuto atual sugerido (${suggestedMinute}')`}
                >
                  ⚡ Agora ({suggestedMinute}')
                </button>
              )}
            </div>

            <div className="pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Minuto *
                  </label>
                  {showSuggestedLabel && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <span>🕒</span>
                      <span>sugerido pelo relógio</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="ex: 55 ou INT"
                  value={localMinute}
                  onChange={(e) => {
                    setLocalMinute(e.target.value);
                    setSubMinute(e.target.value);
                    setIsModified(true);
                  }}
                  className="ui-input w-full text-xs sm:text-sm"
                />
                {!localMinute.trim() && <p className="text-xs text-rose-400 mt-1">Indica o minuto</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
          <button type="button" onClick={onClose} className="ui-btn ui-btn-secondary px-4 py-2.5 text-xs sm:text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!localMinute.trim()}
            className="ui-btn ui-btn-primary px-5 py-2.5 text-xs sm:text-sm flex items-center gap-2"
          >
            <span>🔄</span>
            <span>
              {editingSub
                ? 'Guardar Alterações'
                : pairs.length > 1
                  ? `Confirmar ${pairs.length} Substituições em Simultâneo`
                  : 'Confirmar Substituição'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const SubstitutionModal: React.FC<SubstitutionModalProps> = (props) => {
  if (!props.isOpen) return null;
  const modalKey = props.editingSub ? `edit-${props.editingSub.id}` : 'new-sub';
  return <SubstitutionModalDialog key={modalKey} {...props} />;
};
