import React, { useState } from 'react';
import { AppState } from '../../../types';
import { allTeamsAgenda } from '../../../lib/allTeamsAgenda';
import { localDateISO } from '../../../lib/trainingQuick';

const TEAM_COLORS = ['bg-amber-400', 'bg-violet-400', 'bg-emerald-400', 'bg-sky-400', 'bg-pink-400', 'bg-lime-400'];

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  const text = d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Agenda → 🗂️ Todas as minhas equipas (only for coaches with more than one team): the next two weeks of every team. */
export const AllTeamsAgenda: React.FC<{ state: AppState }> = ({ state }) => {
  const [open, setOpen] = useState(false);
  const teams = (state.teams || []).filter(Boolean);
  if (teams.length < 2) return null;
  const items = open ? allTeamsAgenda(state, localDateISO()) : [];
  const colorOf = (teamId: string) =>
    TEAM_COLORS[
      Math.max(
        0,
        teams.findIndex((t) => t.id === teamId)
      ) % TEAM_COLORS.length
    ];

  return (
    <section aria-label="Todas as minhas equipas" className="ui-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3.5 py-3 text-sm font-semibold text-slate-100"
      >
        <span>🗂️ Todas as minhas equipas ({teams.length})</span>
        <span className="text-xs text-slate-400">{open ? '▴' : 'próximas 2 semanas ▾'}</span>
      </button>
      {open && (
        <div className="px-3.5 pb-3 space-y-1.5">
          {items.length === 0 && <p className="text-xs text-slate-400">Nada marcado nas próximas 2 semanas.</p>}
          {items.map((it) => (
            <div
              key={`${it.teamId}-${it.id}`}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
                it.clash ? 'border-rose-500/70' : 'border-slate-800'
              } bg-slate-900/60`}
            >
              <span className={`h-9 w-1.5 shrink-0 rounded ${colorOf(it.teamId)}`} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm text-white">
                  {it.title} · {it.team}
                </b>
                <span className="text-[11px] text-slate-400">
                  {dayLabel(it.date)}
                  {it.time ? ` · ${it.time}` : ''}
                  {it.clash ? <span className="text-rose-300"> · ⚠️ choca com {it.clash}</span> : null}
                </span>
              </span>
            </div>
          ))}
          <p className="text-[10px] text-slate-500">Para mexer noutra equipa: Mais → Trocar de equipa.</p>
        </div>
      )}
    </section>
  );
};
