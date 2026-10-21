import React from 'react';
import { Match } from '../../../types';
import { previousReports } from '../../../lib/opponentReport';

interface LastTimeAgainstCardProps {
  matches: Match[];
  opponent?: string;
}

/** Pré-jogo: what the post-match report said the last time we played this opponent. */
export const LastTimeAgainstCard: React.FC<LastTimeAgainstCardProps> = ({ matches, opponent }) => {
  if (!opponent) return null;
  const last = previousReports(matches, opponent)[0];
  if (!last) return null;
  const r = last.opponentReport!;
  const rows: Array<[string, string]> = [
    ['🔁 Para este jogo', r.nextTime || ''],
    ['🎯 Pontos fracos', (r.weaknesses || []).join(' · ')],
    ['⚠️ Jogadores perigosos', (r.dangerousPlayers || []).join(' · ')],
    ['🧩 Sistema', r.system || '']
  ];
  return (
    <section
      aria-label="Da última vez contra este adversário"
      className="card border-cyan-500/40 bg-cyan-950/20 p-4 space-y-1.5"
    >
      <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-cyan-300 tracking-wider">
        🛡️ Da última vez contra {last.opponent} ({last.date.split('-').reverse().join('/')})
      </h3>
      {rows
        .filter(([, v]) => v.trim())
        .map(([label, value]) => (
          <p key={label} className="text-xs text-slate-200">
            <span className="font-bold text-slate-400">{label}:</span> {value}
          </p>
        ))}
    </section>
  );
};
