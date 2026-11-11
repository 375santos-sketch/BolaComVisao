import React from 'react';
import { CardEvent, Player, MatchPeriod } from '../../../../types';
import { PlayerOptions } from './PlayerOptions';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCard: CardEvent | null;
  eligiblePlayers: Player[];
  onPitchIds?: string[];
  cardPlayerId: string;
  setCardPlayerId: (id: string) => void;
  cardColor: 'Amarelo' | 'Vermelho';
  setCardColor: (color: 'Amarelo' | 'Vermelho') => void;
  cardMinute: string;
  setCardMinute: (val: string) => void;
  suggestedMinute?: string | null;
  cardPeriod?: MatchPeriod;
  setCardPeriod?: (val: MatchPeriod) => void;
  onSave: () => void;
}

export const CardModal: React.FC<CardModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <CardModalInner {...props} />;
};

const CardModalInner: React.FC<CardModalProps> = ({
  onClose,
  editingCard,
  eligiblePlayers,
  onPitchIds,
  cardPlayerId,
  setCardPlayerId,
  cardColor,
  setCardColor,
  cardMinute,
  setCardMinute,
  suggestedMinute,
  onSave
}) => {
  const [isModified, setIsModified] = React.useState(false);

  const showSuggestedLabel =
    !editingCard && !isModified && Boolean(suggestedMinute) && cardMinute.trim() === suggestedMinute?.trim();

  return (
    <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="ui-card max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ui-line">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cardColor === 'Vermelho' ? '🟥' : '🟨'}</span>
            <h3 className="text-lg font-bold text-ui-text">
              {editingCard ? 'Editar Sanção Disciplinar' : 'Registar Cartão'}
            </h3>
          </div>
          <button onClick={onClose} className="text-ui-muted hover:text-ui-text text-xl">
            ✕
          </button>
        </div>

        {/* Jogador Sancionado */}
        <div>
          <label className="block text-xs font-semibold text-ui-text uppercase tracking-wider mb-1.5">Jogador *</label>
          <select
            value={cardPlayerId}
            onChange={(e) => setCardPlayerId(e.target.value)}
            className="ui-input w-full text-sm"
          >
            <PlayerOptions players={eligiblePlayers} onPitchIds={onPitchIds} />
          </select>
        </div>

        {/* Cor do Cartão */}
        <div>
          <label className="block text-xs font-semibold text-ui-text uppercase tracking-wider mb-1.5">
            Cor do Cartão
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCardColor('Amarelo')}
              className={`py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                cardColor === 'Amarelo'
                  ? 'bg-ui-warning/20 text-ui-warning border-ui-warning shadow-md shadow-ui-warning/10'
                  : 'bg-ui-inset text-ui-muted border-ui-line hover:bg-ui-surface-2'
              }`}
            >
              <span>🟨</span>
              <span>Amarelo</span>
            </button>

            <button
              type="button"
              onClick={() => setCardColor('Vermelho')}
              className={`py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                cardColor === 'Vermelho'
                  ? 'bg-ui-danger/20 text-ui-danger border-ui-danger shadow-md shadow-ui-danger/10'
                  : 'bg-ui-inset text-ui-muted border-ui-line hover:bg-ui-surface-2'
              }`}
            >
              <span>🟥</span>
              <span>Vermelho</span>
            </button>
          </div>
        </div>

        {/* Minuto */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-ui-text uppercase tracking-wider">Minuto *</label>
            {showSuggestedLabel && (
              <span className="text-[10px] text-ui-success font-mono flex items-center gap-1">
                <span>🕒</span>
                <span>sugerido pelo relógio</span>
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="ex: 78"
            value={cardMinute}
            onChange={(e) => {
              setCardMinute(e.target.value);
              setIsModified(true);
            }}
            className="ui-input w-full text-sm"
          />
          {!cardMinute.trim() && <p className="text-xs text-ui-danger mt-1">Indica o minuto</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-ui-line">
          <button onClick={onClose} className="ui-btn ui-btn-secondary px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!cardMinute.trim()}
            className={`px-5 py-2 rounded-xl text-ui-text text-sm font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              cardColor === 'Vermelho'
                ? 'bg-ui-danger hover:bg-ui-danger shadow-ui-danger/30'
                : 'bg-ui-warning hover:bg-ui-warning shadow-ui-warning/30'
            }`}
          >
            {editingCard ? 'Guardar Alterações' : 'Confirmar Cartão'}
          </button>
        </div>
      </div>
    </div>
  );
};
