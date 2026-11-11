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
      <div className="ui-card p-4 text-center text-sm text-ui-muted">
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
            className={`flex items-center justify-between p-3 rounded-xl bg-ui-surface border ${
              isRed ? 'border-ui-danger/30' : 'border-ui-warning/30'
            } hover:border-opacity-60 transition-colors`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  isRed ? 'bg-ui-danger/20 text-ui-danger' : 'bg-ui-warning/20 text-ui-warning'
                }`}
              >
                {isRed ? '🟥' : '🟨'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ui-text text-sm">{getPlayerName(c.playerId)}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      isRed
                        ? 'bg-ui-danger-soft text-ui-danger border border-ui-danger'
                        : 'bg-ui-warning-soft text-ui-warning border border-ui-warning'
                    }`}
                  >
                    Cartão {c.color}
                  </span>
                  {c.minute && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-ui-surface-2 text-ui-text font-mono font-medium">
                      {String(c.minute).endsWith("'") ? c.minute : `${c.minute}'`}
                    </span>
                  )}
                </div>
                {c.period && <div className="text-[11px] text-ui-muted mt-0.5 font-medium">{c.period}</div>}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onEditCard(c)}
                className="p-1.5 rounded-lg text-ui-muted hover:text-ui-text hover:bg-ui-surface-2 transition-colors text-xs"
                title="Editar"
              >
                ✏️
              </button>
              <button
                onClick={() => onDeleteCard(c.id)}
                className="p-1.5 rounded-lg text-ui-danger hover:text-ui-danger hover:bg-ui-danger-soft transition-colors text-xs"
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
