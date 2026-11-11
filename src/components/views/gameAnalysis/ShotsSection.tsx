import React, { useMemo } from 'react';
import { Match } from '../../../types';
import { computeShotStats } from '../../../lib/matchShots';

interface ShotsSectionProps {
  matches: Match[];
}

const fmt = (v: number | null, suffix = '') => (v === null ? '—' : `${String(v).replace('.', ',')}${suffix}`);

/** 🎯 Remates: shots for/against (in and outside the box) and finishing efficiency. */
export const ShotsSection: React.FC<ShotsSectionProps> = ({ matches }) => {
  const s = useMemo(() => computeShotStats(matches), [matches]);

  return (
    <section className="ui-card p-5" aria-label="Remates">
      <div className="pb-3 border-b border-ui-line mb-4">
        <h2 className="text-sm sm:text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2 uppercase tracking-wide">
          <span className="text-ui-brand">🎯</span> Remates
        </h2>
        <p className="text-xs text-ui-muted mt-0.5">
          {s.matchesCount === 0
            ? 'Ainda não há remates registados nos jogos filtrados.'
            : `${s.matchesCount} ${s.matchesCount === 1 ? 'jogo' : 'jogos'} com remates registados`}
        </p>
      </div>

      {s.matchesCount > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="ui-inset p-3 text-center">
              <div className="text-[11px] font-bold text-ui-muted uppercase tracking-wider mb-1">A favor</div>
              <div className="text-2xl font-['Chakra_Petch'] font-black text-ui-success">{s.shotsFor}</div>
              <div className="text-[11px] text-ui-muted">
                {s.inBoxFor} dentro · {s.outBoxFor} fora da área
              </div>
              <div className="text-[11px] text-ui-text mt-1">{fmt(s.avgShotsFor)} por jogo</div>
            </div>
            <div className="ui-inset p-3 text-center">
              <div className="text-[11px] font-bold text-ui-muted uppercase tracking-wider mb-1">Contra</div>
              <div className="text-2xl font-['Chakra_Petch'] font-black text-ui-danger">{s.shotsAgainst}</div>
              <div className="text-[11px] text-ui-muted">
                {s.inBoxAgainst} dentro · {s.outBoxAgainst} fora da área
              </div>
              <div className="text-[11px] text-ui-text mt-1">{fmt(s.avgShotsAgainst)} por jogo</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-ui-success-soft border border-ui-success/30 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-ui-success uppercase">Eficácia de finalização</div>
              <div className="text-xs font-bold text-ui-text">
                {fmt(s.conversionFor, '%')} dos remates deram golo ({s.goalsScored} em {s.shotsFor})
                {s.shotsPerGoal !== null && ` · 1 golo a cada ${fmt(s.shotsPerGoal)} remates`}
              </div>
            </div>
            <div className="bg-ui-danger-soft border border-ui-danger/30 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-ui-danger uppercase">Eficácia do adversário</div>
              <div className="text-xs font-bold text-ui-text">
                {fmt(s.conversionAgainst, '%')} dos remates sofridos deram golo ({s.goalsConceded} em {s.shotsAgainst})
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
