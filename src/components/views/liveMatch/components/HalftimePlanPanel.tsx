import React, { useMemo } from 'react';
import { Match, Player } from '../../../../types';
import { halftimePlan } from '../../../../lib/halftimePlan';

interface HalftimePlanPanelProps {
  match: Match;
  matches: Match[];
  roster: Player[];
  category?: string;
  /** Opens the 2nd-half picker with these athletes already chosen. */
  onUseSuggestion: (ids: string[]) => void;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** At halftime: season minutes of each called-up athlete and who should play the 2nd half to even them out. */
export const HalftimePlanPanel: React.FC<HalftimePlanPanelProps> = ({
  match,
  matches,
  roster,
  category,
  onUseSuggestion
}) => {
  const plan = useMemo(() => halftimePlan(match, matches, roster, category), [match, matches, roster, category]);
  if (plan.rows.length === 0) return null;
  const below = plan.rows.filter((r) => r.shareIfBenched < plan.target);

  return (
    <section aria-label="Sugestão para a 2.ª parte" className="ui-card p-3 text-xs space-y-2">
      <div className="font-bold text-emerald-300 font-['Chakra_Petch'] uppercase tracking-wide">
        ⚖️ Minutos na época · sugestão para a 2.ª parte
      </div>
      <p className="text-[11px] text-slate-400">
        {below.length > 0
          ? `${below.length} ${below.length === 1 ? 'atleta fica' : 'atletas ficam'} abaixo de ${pct(plan.target)} dos minutos da época se não jogar${below.length === 1 ? '' : 'em'} a 2.ª parte.`
          : `Todos ficam acima de ${pct(plan.target)} dos minutos da época.`}{' '}
        A sugestão dá a 2.ª parte a quem está mais atrás (com um guarda-redes).
      </p>
      <ul className="space-y-1 font-mono text-[11px]" aria-label="Minutos na época por atleta">
        {plan.rows.map((r) => (
          <li
            key={r.playerId}
            className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg border ${
              r.suggested ? 'border-emerald-500/40 bg-emerald-950/30' : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <span className="truncate text-slate-200">
              {r.suggested ? '✓ ' : ''}
              {r.label}
              {r.goalkeeper ? ' (GR)' : ''}
            </span>
            <span className="shrink-0 text-right">
              <span className="text-slate-400">{r.firstHalf}&apos; · </span>
              <span className={r.shareIfBenched < plan.target ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                {pct(r.shareIfBenched)}
              </span>
              <span className="text-slate-500"> → {pct(r.shareIfPlays)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-slate-500">
        Minutos na 1.ª parte · % da época se ficar no banco → se jogar a 2.ª parte toda. ✓ = sugerido.
      </p>
      <button
        type="button"
        onClick={() => onUseSuggestion(plan.suggested)}
        className="ui-btn ui-btn-soft-success w-full py-2.5"
      >
        Escolher os titulares da 2.ª parte com esta sugestão
      </button>
    </section>
  );
};
