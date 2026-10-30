import React from 'react';
import { Match, Player } from '../../../types';
import { headToHead } from '../../../lib/headToHead';

interface LastTimeAgainstCardProps {
  matches: Match[];
  roster?: Player[];
  opponent?: string;
  /** Convocatória: closed to one line until tapped, so the athletes stay in view. */
  collapsed?: boolean;
}

const RESULT_TONE = {
  V: 'bg-emerald-500/15 text-emerald-300',
  E: 'bg-amber-500/15 text-amber-300',
  D: 'bg-rose-500/15 text-rose-300'
};

const dateLabel = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/**
 * Convocatória and Pré-jogo: every earlier game against this opponent (score, where, who scored) and the notes
 * from the last post-match report.
 */
export const LastTimeAgainstCard: React.FC<LastTimeAgainstCardProps> = ({
  matches,
  roster = [],
  opponent,
  collapsed = false
}) => {
  const h = headToHead(matches, roster, opponent);
  if (!h) return null;
  const r = h.report;
  const notes: Array<[string, string, string]> = r
    ? [
        [`As tuas notas (${dateLabel(r.date).slice(0, 5)})`, r.notes, 'border-sky-400 text-sky-300'],
        ['Pontos fracos', r.weaknesses.join(' · '), 'border-sky-400 text-sky-300'],
        ['Jogadores perigosos', r.dangerous.join(' · '), 'border-rose-400 text-rose-300'],
        ['Sistema', r.system, 'border-slate-500 text-slate-300'],
        ['Para este jogo', r.nextTime, 'border-emerald-400 text-emerald-300']
      ]
    : [];
  const title = `Contra ${opponent} · ${h.games.length} ${h.games.length === 1 ? 'jogo' : 'jogos'}`;
  const tally = `${h.wins}V ${h.draws}E ${h.losses}D`;

  const body = (
    <>
      <div className="grid grid-cols-4 gap-1.5 my-2 text-center text-[11px] text-slate-400">
        {(
          [
            [h.wins, h.wins === 1 ? 'vitória' : 'vitórias', 'text-emerald-300'],
            [h.draws, h.draws === 1 ? 'empate' : 'empates', 'text-amber-300'],
            [h.losses, h.losses === 1 ? 'derrota' : 'derrotas', 'text-rose-300'],
            [`${h.goalsFor}-${h.goalsAgainst}`, 'golos', 'text-white']
          ] as const
        ).map(([value, label, tone]) => (
          <div key={label} className="ui-inset rounded-xl py-1.5">
            <b className={`block text-base font-['Chakra_Petch'] ${tone}`}>{value}</b>
            {label}
          </div>
        ))}
      </div>
      <ul>
        {h.games.map((g) => (
          <li key={g.id} className="flex items-center gap-2.5 border-t border-slate-800 py-2">
            <span
              className={`shrink-0 min-w-[58px] rounded-lg px-2 py-0.5 text-center text-sm font-bold font-['Chakra_Petch'] ${RESULT_TONE[g.result]}`}
            >
              {g.result} {g.scored}-{g.conceded}
            </span>
            <span className="min-w-0">
              <b className="block text-sm text-white">
                {dateLabel(g.date)} · {g.where}
              </b>
              <span className="block text-xs text-slate-400">
                {g.scorers.length
                  ? `⚽ ${g.scorers.join(', ')}`
                  : g.scored > 0
                    ? 'Marcadores por registar'
                    : 'Sem golos nossos'}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {notes
        .filter(([, text]) => text)
        .map(([label, text, tone]) => (
          <div
            key={label}
            className={`ui-inset mt-2 rounded-xl border-l-[3px] px-3 py-2 text-xs text-slate-200 ${tone}`}
          >
            <b className="block text-[11px] uppercase tracking-wide">{label}</b>
            <span className="text-slate-200">{text}</span>
          </div>
        ))}
    </>
  );

  if (collapsed) {
    return (
      <details aria-label="Histórico contra este adversário" className="ui-card mb-2.5 group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 text-sm font-semibold text-slate-100">
          <span className="truncate">🛡️ {title}</span>
          <span className="shrink-0 text-xs font-normal text-slate-400">{tally} ▾</span>
        </summary>
        <div className="px-3.5 pb-3">{body}</div>
      </details>
    );
  }
  return (
    <section aria-label="Histórico contra este adversário" className="ui-card p-3.5">
      <h3 className="text-sm font-bold text-sky-300">🛡️ {title}</h3>
      {body}
    </section>
  );
};
