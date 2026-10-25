import React, { useState } from 'react';
import { AbsenceReason, Player, Training } from '../../../types';
import { withAttendance } from '../../../lib/trainingQuick';
import { AttendanceGrid } from './AttendanceGrid';

interface TodayTrainingModalProps {
  training: Training;
  isNew: boolean;
  players: Player[];
  onClose: () => void;
  /** Saves the training as held (it enters the attendance statistics). */
  onSave: (training: Training) => void;
}

/** "Treino de hoje": everyone present, tap who missed, save. Time and place come from the usual training. */
export const TodayTrainingModal: React.FC<TodayTrainingModalProps> = ({
  training,
  isNew,
  players,
  onClose,
  onSave
}) => {
  const [absences, setAbsences] = useState<string[]>(training.absences || []);
  const [reasons, setReasons] = useState<Partial<Record<string, AbsenceReason>>>(training.absenceReasons || {});
  const [time, setTime] = useState(training.time || '');
  const [location, setLocation] = useState(training.location || '');

  const [y, m, d] = training.date.split('-');
  const present = players.filter((p) => !absences.includes(p.id)).length;

  const toggle = (id: string) => setAbsences((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div className="ui-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
      <div role="dialog" aria-label="Treino de hoje" className="ui-card w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide">
              ✅ Treino de hoje{training.trainingNumber ? ` · Nº ${training.trainingNumber}` : ''}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {d}/{m}/{y} · Todos presentes: toca em quem faltou.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-slate-400 uppercase font-bold">
              Hora
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="ui-input mt-1 w-full text-sm normal-case font-normal"
              />
            </label>
            <label className="text-[11px] text-slate-400 uppercase font-bold">
              Local
              <input
                type="text"
                value={location}
                placeholder="ex.: Sintético"
                onChange={(e) => setLocation(e.target.value)}
                className="ui-input mt-1 w-full text-sm normal-case font-normal"
              />
            </label>
          </div>

          <AttendanceGrid
            players={players}
            absences={absences}
            reasons={reasons}
            onToggle={toggle}
            onReason={(id, reason) => setReasons((cur) => ({ ...cur, [id]: reason }))}
          />
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs font-mono text-slate-300">
            <b className="text-emerald-400">{present}</b> presentes · <b className="text-red-400">{absences.length}</b>{' '}
            faltas
          </span>
          <button
            type="button"
            onClick={() =>
              onSave({
                ...withAttendance(training, absences, reasons),
                time: time || undefined,
                location: location || undefined,
                completed: true
              })
            }
            className="ui-btn ui-btn-success px-5 py-2.5 text-sm"
          >
            {isNew ? 'Guardar treino' : 'Guardar presenças'}
          </button>
        </div>
      </div>
    </div>
  );
};
