import React from 'react';
import { SessionBlock } from '../../../types';
import { PHASE_LABELS, sessionPhases, sessionWarnings } from '../../../lib/sessionPhases';

const COLOURS = { aquecimento: 'bg-ui-warning', fundamental: 'bg-ui-brand', calma: 'bg-ui-muted' } as const;

/** 🧩 The session in three parts (warm-up, main part, cool-down): minutes of each and what is missing. */
export const SessionPhasesBar: React.FC<{ blocks: SessionBlock[] | undefined; lengthMinutes: number }> = ({
  blocks,
  lengthMinutes
}) => {
  if (!blocks?.length) return null;
  const parts = sessionPhases(blocks);
  const planned = parts.reduce((s, p) => s + p.minutes, 0) || 1;
  const warnings = sessionWarnings(blocks, lengthMinutes);
  return (
    <section aria-label="Partes da sessão" className="space-y-1.5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-ui-surface-3">
        {parts.map((p) =>
          p.minutes ? (
            <div key={p.phase} className={COLOURS[p.phase]} style={{ width: `${(p.minutes / planned) * 100}%` }} />
          ) : null
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        {parts.map((p) => (
          <div key={p.phase} className="rounded-lg bg-ui-surface-2 px-2 py-1.5">
            <span className="flex items-center gap-1 font-bold text-ui-text">
              <span className={`h-2 w-2 shrink-0 rounded-full ${COLOURS[p.phase]}`} />
              {PHASE_LABELS[p.phase]}
            </span>
            <span className="text-ui-muted">
              {p.blocks ? `${p.minutes} min · ${p.blocks} ${p.blocks === 1 ? 'bloco' : 'blocos'}` : '—'}
            </span>
          </div>
        ))}
      </div>
      {warnings.length > 0 && (
        <p className="flex flex-wrap gap-1">
          {warnings.map((w) => (
            <span key={w} className="ui-badge ui-badge-warning">
              {w}
            </span>
          ))}
        </p>
      )}
    </section>
  );
};
