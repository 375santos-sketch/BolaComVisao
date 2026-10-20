import React from 'react';
import { Player } from '../../../../types';
import { playerLabel } from '../../../../lib/utils';

interface CaptainModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligiblePlayers: Player[];
  currentCaptainId: string | null;
  onSelectCaptain: (playerId: string | null) => void;
}

export const CaptainModal: React.FC<CaptainModalProps> = ({
  isOpen,
  onClose,
  eligiblePlayers,
  currentCaptainId,
  onSelectCaptain
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl text-amber-400 font-bold">©</span>
            <h3 className="text-lg font-bold text-white">Definir Capitão de Equipa</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-400">
          O capitão enverga a braçadeira durante o jogo e é destacado nos relatórios e folhas de jogo.
        </p>

        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          <button
            type="button"
            onClick={() => {
              onSelectCaptain(null);
              onClose();
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
              !currentCaptainId
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Nenhum capitão definido
          </button>

          {eligiblePlayers.map((p) => {
            const isSelected = currentCaptainId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelectCaptain(p.id);
                  onClose();
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>
                  {playerLabel(p, 'Sem nome')} {p.number ? `(#${p.number})` : ''}
                </span>
                {isSelected && <span className="text-amber-400 font-bold">© Atual</span>}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
