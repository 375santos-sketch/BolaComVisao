import React, { Suspense, lazy, useState } from 'react';
import { AppState } from '../../../types';
import { setPieceAssignments, setPieceTitle, setPieceType } from '../../../lib/setPieces';

// The book (with its drawings) only loads when opened, so the Convocatória stays light
const SetPieceBook = lazy(() => import('./SetPieceBook').then((m) => ({ default: m.SetPieceBook })));

interface SetPiecesCardProps {
  state: AppState;
  callup: string[];
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
}

/** Who takes each set piece in this game, with a warning when an athlete with a job is not called up. */
export const SetPiecesCard: React.FC<SetPiecesCardProps> = ({ state, callup, onUpdateState, onShowToast }) => {
  const [open, setOpen] = useState(false);
  const setPieces = (state.teams || []).find((t) => t.id === state.activeTeamId)?.setPieces || [];
  const assignments = setPieceAssignments(setPieces, state.roster || [], callup);
  const missing = assignments.reduce((n, a) => n + a.lines.filter((l) => l.missing).length, 0);

  return (
    <section aria-label="Bolas paradas" className="card p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider">🎯 Bolas paradas</h3>
        <button type="button" onClick={() => setOpen(true)} className="text-[11px] text-cyan-300 font-bold underline">
          {setPieces.length ? 'Abrir caderno' : 'Criar caderno'}
        </button>
      </div>
      {assignments.length === 0 ? (
        <p className="text-[11px] text-slate-400">
          {setPieces.length
            ? 'Ainda não há atletas atribuídos às bolas paradas.'
            : 'Guarde os cantos, livres e lançamentos da equipa e quem os marca.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {assignments.map((a) => (
            <li key={a.setPiece.id} className="text-[11px] text-slate-200">
              <b>
                {setPieceType(a.setPiece.type).icon} {setPieceTitle(a.setPiece)}:
              </b>{' '}
              {a.lines.map((l, i) => (
                <span key={i} className={l.missing ? 'text-amber-300' : ''}>
                  {i > 0 ? ' · ' : ''}
                  {l.role.label} {l.player!.name}
                  {l.missing ? ' ⚠️ não convocado' : ''}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
      {missing > 0 && (
        <p className="text-[11px] text-amber-300">
          ⚠️ {missing} função(ões) com atletas fora da convocatória: troque no caderno ou convoque-os.
        </p>
      )}
      {open && (
        <Suspense fallback={null}>
          <SetPieceBook
            state={state}
            onUpdateState={onUpdateState}
            onShowToast={onShowToast}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </section>
  );
};
