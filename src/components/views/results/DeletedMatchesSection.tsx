import React, { useState } from 'react';
import { AppState, Match } from '../../../types';
import { getDeletedRecords } from '../../../services/clubCloud';

interface DeletedMatchesSectionProps {
  state: AppState;
  onRestore: (match: Match) => void;
}

const formatDate = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const formatWhen = (ts: number) =>
  new Date(ts).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Matches deleted (on any device) that can be brought back; shown only when there are some. */
export const DeletedMatchesSection: React.FC<DeletedMatchesSectionProps> = ({ state, onRestore }) => {
  const [open, setOpen] = useState(false);
  const present = new Set((state.matches || []).map((m) => m.id));
  const deleted = getDeletedRecords<Match>(state.currentUser?.clubId, 'match', state.activeTeamId).filter(
    (d) => d.data?.id && !present.has(d.data.id)
  );
  if (deleted.length === 0) return null;

  const userName = (uid?: string) =>
    (uid && (state.users || []).find((u) => u.id === uid)?.name) || (uid === state.currentUser?.id ? 'si' : '');

  return (
    <div className="mb-3.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-[11px] font-mono text-slate-400 hover:text-cyan-300"
      >
        🗑️ Jogos apagados ({deleted.length}) {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl bg-slate-900/80 border border-slate-800 divide-y divide-slate-800">
          {deleted.map(({ data: m, deletedAt, deletedBy }) => {
            const scored = (m.goals || []).filter((g) => g.type === 'scored').length;
            const conceded = (m.goals || []).filter((g) => g.type === 'conceded').length;
            const by = userName(deletedBy);
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="text-slate-200 font-bold truncate">
                    {formatDate(m.date)} · vs {m.opponent}{' '}
                    <span className="font-mono text-slate-400">
                      {scored}-{conceded}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Apagado em {formatWhen(deletedAt)}
                    {by ? ` por ${by}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(m)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shrink-0"
                >
                  Recuperar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
