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
    <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="ui-card max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ui-line">
          <div className="flex items-center gap-2">
            <span className="text-xl text-ui-warning font-bold">©</span>
            <h3 className="text-lg font-bold text-ui-text">Definir Capitão de Equipa</h3>
          </div>
          <button onClick={onClose} className="text-ui-muted hover:text-ui-text text-xl">
            ✕
          </button>
        </div>

        <p className="text-xs text-ui-muted">
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
                ? 'bg-ui-warning/20 text-ui-warning border-ui-warning/50'
                : 'bg-ui-inset text-ui-muted border-ui-line hover:bg-ui-surface-2 hover:text-ui-text'
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
                    ? 'bg-ui-warning/20 text-ui-warning border-ui-warning/50 font-bold'
                    : 'bg-ui-inset text-ui-text border-ui-line hover:bg-ui-surface-2 hover:text-ui-text'
                }`}
              >
                <span>
                  {playerLabel(p, 'Sem nome')} {p.number ? `(#${p.number})` : ''}
                </span>
                {isSelected && <span className="text-ui-warning font-bold">© Atual</span>}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-ui-line">
          <button onClick={onClose} className="ui-btn ui-btn-secondary px-4 py-2 text-sm">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
