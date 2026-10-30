import React from 'react';
import { Player } from '../../../types';
import { evolutionMessage, formatResult, playerEvolution, ROUNDS } from '../../../lib/fitnessTests';

interface PlayerTestsSectionProps {
  player: Player;
  season: string;
  clubName: string;
}

/** Ficha do atleta → 📏 Testes da época: the athlete's own evolution (never compared with team-mates). */
export const PlayerTestsSection: React.FC<PlayerTestsSectionProps> = ({ player, season, clubName }) => {
  const rows = playerEvolution(player, season).filter((e) => e.values.some((v) => v !== undefined));
  if (rows.length === 0) return null;
  const compared = rows.filter((e) => e.trend !== null);
  const better = compared.filter((e) => e.trend === 'melhor').length;
  const rounds = ROUNDS.filter((_, i) => rows.some((e) => e.values[i] !== undefined)).map((r) => r.short);

  return (
    <section aria-label="Testes da época" className="ui-inset p-3.5 space-y-1">
      <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
        📏 Testes da época · {rounds.join(' → ')}
      </div>
      <ul>
        {rows.map((e) => {
          const done = e.values.filter((v): v is number => v !== undefined);
          const best = e.test.lowerIsBetter ? Math.min(...done) : Math.max(...done);
          return (
            <li key={e.test.id} className="flex items-center gap-2 border-b border-slate-800 py-2 last:border-0">
              <span className="min-w-0 flex-1">
                <b className="block text-sm text-white">
                  {e.test.emoji} {e.test.name}
                </b>
                <span className="text-[11px] text-slate-400">
                  {e.test.lowerIsBetter ? 'menos é melhor' : 'mais é melhor'}
                </span>
              </span>
              <span className="flex h-8 items-end gap-1" aria-hidden="true">
                {e.values.map((v, i) =>
                  v === undefined ? null : (
                    <i
                      key={i}
                      className={`w-3 rounded-sm ${i === e.values.length - 1 || v === done[done.length - 1] ? (e.trend === 'pior' ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-slate-600'}`}
                      style={{
                        height: `${Math.max(
                          20,
                          Math.round(((e.test.lowerIsBetter ? best / v : v / Math.max(best, 0.001)) || 0) * 100)
                        )}%`
                      }}
                    />
                  )
                )}
              </span>
              <span className="shrink-0 text-sm font-bold text-white font-['Chakra_Petch']">
                {e.trend !== null ? `${formatResult(e.test, e.first)} → ` : ''}
                {formatResult(e.test, e.last)}{' '}
                {e.trend === 'melhor' ? (e.big ? '🚀' : '▲') : e.trend === 'pior' ? '●' : ''}
              </span>
            </li>
          );
        })}
      </ul>
      {compared.length > 0 && (
        <p className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300">
          Melhorou em {better} de {compared.length} {compared.length === 1 ? 'teste' : 'testes'} 💪
        </p>
      )}
      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(evolutionMessage(player, season, clubName))}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ui-btn ui-btn-secondary mt-1 w-full py-2 text-xs"
      >
        📲 Enviar evolução aos pais
      </a>
    </section>
  );
};
