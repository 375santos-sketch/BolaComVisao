import React from 'react';
import { AbsenceReason, Player } from '../../../types';
import { ABSENCE_REASONS } from '../../../lib/trainingQuick';

interface AttendanceGridProps {
  players: Player[];
  absences: string[];
  reasons?: Partial<Record<string, AbsenceReason>>;
  onToggle: (playerId: string) => void;
  onReason: (playerId: string, reason: AbsenceReason | undefined) => void;
}

/** Everyone present by default: tap who missed, then (optionally) why. */
export const AttendanceGrid: React.FC<AttendanceGridProps> = ({ players, absences, reasons, onToggle, onReason }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 items-start">
    {players.map((p) => {
      const isAbs = absences.includes(p.id);
      return (
        <div
          key={p.id}
          className={`rounded-lg border transition-all ${
            isAbs
              ? 'bg-red-950/80 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={() => onToggle(p.id)}
            aria-pressed={isAbs}
            aria-label={`${p.name}: ${isAbs ? 'faltou' : 'presente'}`}
            className={`w-full p-2 text-left flex items-center justify-between gap-1.5 text-xs ${
              isAbs ? 'text-red-200 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="truncate">
              {p.number !== null && p.number !== undefined ? `#${p.number} ` : ''}
              {p.name}
            </span>
            <span className="text-[10px] shrink-0">{isAbs ? '❌ Falta' : '🟢 Pres.'}</span>
          </button>
          {isAbs && (
            <select
              aria-label={`Motivo da falta de ${p.name}`}
              value={reasons?.[p.id] || ''}
              onChange={(e) => onReason(p.id, (e.target.value || undefined) as AbsenceReason | undefined)}
              className="w-full bg-slate-950 border-t border-red-500/40 rounded-b-lg px-2 py-1 text-[11px] text-red-100 focus:outline-none"
            >
              <option value="">Motivo (opcional)…</option>
              {ABSENCE_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </div>
      );
    })}
  </div>
);
