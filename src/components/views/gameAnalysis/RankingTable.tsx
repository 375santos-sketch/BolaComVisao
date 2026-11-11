import React, { useState } from 'react';
import { RankingRow } from '../../../lib/goalRanking';
import { EmptyState } from '../../ui/EmptyState';

/** Análise → Atletas: the top scorers (or assists) table, most first; the first rows, then "Ver todos". */
export const RankingTable: React.FC<{
  title: string;
  unit: string;
  rows: RankingRow[];
  onOpenPlayer?: (playerId: string) => void;
}> = ({ title, unit, rows, onOpenPlayer }) => {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 5);
  return (
    <section aria-label={title} className="ui-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="ui-kicker">{title}</h3>
        <span className="text-ui-caption text-ui-muted">
          {rows.reduce((n, r) => n + r.count, 0)} {unit}
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyState compact icon="ball" title={`Sem ${unit} registados`} text="Aparecem aqui depois dos jogos." />
      ) : (
        <ol className="divide-y divide-ui-line">
          {shown.map((r, i) => (
            <li key={r.playerId}>
              <button
                type="button"
                onClick={() => onOpenPlayer?.(r.playerId)}
                className="flex w-full items-center gap-3 py-2 text-left hover:bg-ui-surface-2"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ui-caption font-extrabold ${
                    i === 0 ? 'bg-ui-brand text-ui-brand-ink' : 'bg-ui-surface-3 text-ui-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-ui-body text-ui-text">
                  {r.number !== null ? <span className="text-ui-muted">{r.number} · </span> : null}
                  {r.name}
                </span>
                <span className="ui-figure text-ui-lead text-ui-text">{r.count}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {rows.length > 5 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-2 text-ui-caption font-bold text-ui-brand"
        >
          {all ? 'Ver menos' : `Ver todos (${rows.length})`}
        </button>
      )}
    </section>
  );
};
