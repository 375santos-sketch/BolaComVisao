import React from 'react';
import { CardEvent, Player } from '../../../../types';
import { playerLabel } from '../../../../lib/utils';

interface CardEventsListProps {
  cards: CardEvent[];
  roster: Player[];
  onEditCard: (card: CardEvent) => void;
  onDeleteCard: (id: string) => void;
}

export const CardEventsList: React.FC<CardEventsListProps> = ({ cards, roster, onEditCard, onDeleteCard }) => {
  const getPlayerName = (id: string) => {
    const p = roster.find((x) => x.id === id);
    return p ? playerLabel(p, 'Sem nome') : '—';
  };

  if (cards.length === 0) {
    return (
      <div className="ui-card p-4 text-center text-sm text-slate-500">
        Nenhum cartão disciplinar registado (Jogo limpo! 🤝).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {cards.map((c) => {
        const isRed = c.color === 'Vermelho';
        return (
          <div
            key={c.id}
            className={`flex items-center justify-between p-3 rounded-xl bg-slate-900 border ${
              isRed ? 'border-red-500/30' : 'border-amber-500/30'
            } hover:border-opacity-60 transition-colors`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  isRed ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {isRed ? '🟥' : '🟨'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{getPlayerName(c.playerId)}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      isRed
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    Cartão {c.color}
                  </span>
                  {c.minute && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-medium">
                      {String(c.minute).endsWith("'") ? c.minute : `${c.minute}'`}
                    </span>
                  )}
                </div>
                {c.period && <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{c.period}</div>}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onEditCard(c)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs"
                title="Editar"
              >
                ✏️
              </button>
              <button
                onClick={() => onDeleteCard(c.id)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/50 transition-colors text-xs"
                title="Remover"
              >
                🗑️
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
