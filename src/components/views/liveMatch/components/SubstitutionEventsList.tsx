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
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 text-center text-sm text-slate-500">
        Nenhuma substituição registada neste jogo.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {subs.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-blue-500/20 hover:border-blue-500/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-sm">
              🔄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-medium">Sai: <strong>{getPlayerName(s.outId)}</strong></span>
                <span className="text-slate-500">→</span>
                <span className="text-xs text-emerald-400 font-medium">Entra: <strong>{getPlayerName(s.inId)}</strong></span>
                {s.minute && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-medium">
                    {String(s.minute).endsWith("'") || String(s.minute).toUpperCase() === 'INT' ? s.minute : `${s.minute}'`}
                  </span>
                )}
              </div>
              {s.period && (
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{s.period}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditSub(s)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs"
              title="Editar"
            >
              ✏️
            </button>
            <button
              onClick={() => onDeleteSub(s.id)}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/50 transition-colors text-xs"
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
