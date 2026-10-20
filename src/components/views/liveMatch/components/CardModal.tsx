import React from 'react';
import { CardEvent, Player, MatchPeriod } from '../../../../types';
import { playerLabel } from '../../../../lib/utils';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCard: CardEvent | null;
  eligiblePlayers: Player[];
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
    !editingCard &&
    !isModified &&
    Boolean(suggestedMinute) &&
    cardMinute.trim() === suggestedMinute?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cardColor === 'Vermelho' ? '🟥' : '🟨'}</span>
            <h3 className="text-lg font-bold text-white">
              {editingCard ? 'Editar Sanção Disciplinar' : 'Registar Cartão'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        {/* Jogador Sancionado */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Jogador *
          </label>
          <select
            value={cardPlayerId}
            onChange={(e) => setCardPlayerId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
          >
            {eligiblePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {playerLabel(p, 'Sem nome')} {p.number ? `(#${p.number})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Cor do Cartão */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Cor do Cartão
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCardColor('Amarelo')}
              className={`py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                cardColor === 'Amarelo'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
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
                  ? 'bg-red-500/20 text-red-300 border-red-500 shadow-md shadow-red-500/10'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
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
            placeholder="ex: 78"
            value={cardMinute}
            onChange={(e) => {
              setCardMinute(e.target.value);
              setIsModified(true);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
          />
          {!cardMinute.trim() && (
            <p className="text-xs text-rose-400 mt-1">Indica o minuto</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!cardMinute.trim()}
            className={`px-5 py-2 rounded-xl text-white text-sm font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              cardColor === 'Vermelho'
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
            }`}
          >
            {editingCard ? 'Guardar Alterações' : 'Confirmar Cartão'}
          </button>
        </div>
      </div>
    </div>
  );
};
