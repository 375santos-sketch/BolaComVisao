import React from 'react';
import { SubEvent, Player } from '../../../../types';
import { playerLabel } from '../../../../lib/utils';

interface SubstitutionEventsListProps {
  subs: SubEvent[];
  roster: Player[];
  onEditSub: (sub: SubEvent) => void;
  onDeleteSub: (id: string) => void;
}

export const SubstitutionEventsList: React.FC<SubstitutionEventsListProps> = ({
  subs,
  roster,
  onEditSub,
  onDeleteSub
}) => {
  const getPlayerName = (id: string) => {
    const p = roster.find((x) => x.id === id);
    return p ? playerLabel(p, 'Sem nome') : '—';
  };

  if (subs.length === 0) {
    return (
      <div className="ui-card p-4 text-center text-sm text-ui-muted">Nenhuma substituição registada neste jogo.</div>
    );
  }

  return (
    <div className="space-y-2">
      {subs.map((s) => (
        <div key={s.id} className="ui-card flex items-center justify-between p-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ui-brand/10 text-ui-brand font-bold flex items-center justify-center text-sm">
              🔄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ui-danger font-medium">
                  Sai: <strong>{getPlayerName(s.outId)}</strong>
                </span>
                <span className="text-ui-muted">→</span>
                <span className="text-xs text-ui-success font-medium">
                  Entra: <strong>{getPlayerName(s.inId)}</strong>
                </span>
                {s.minute && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-ui-surface-2 text-ui-text font-mono font-medium">
                    {String(s.minute).endsWith("'") || String(s.minute).toUpperCase() === 'INT'
                      ? s.minute
                      : `${s.minute}'`}
                  </span>
                )}
              </div>
              {s.period && <div className="text-[11px] text-ui-muted mt-0.5 font-medium">{s.period}</div>}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditSub(s)}
              className="p-1.5 rounded-lg text-ui-muted hover:text-ui-text hover:bg-ui-surface-2 transition-colors text-xs"
              title="Editar"
            >
              ✏️
            </button>
            <button
              onClick={() => onDeleteSub(s.id)}
              className="p-1.5 rounded-lg text-ui-danger hover:text-ui-danger hover:bg-ui-danger-soft transition-colors text-xs"
              title="Remover"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
