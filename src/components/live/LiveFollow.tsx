import React, { useEffect, useState } from 'react';
import { AppState, Match } from '../../types';
import { PHASE_LABELS, countChanges, followEvents, followStats, liveMatchOf, liveScore } from '../../lib/liveFollow';
import { getMatchPhase } from '../../lib/matchPhaseUtils';
import { formatMatchTime, getMatchElapsedMs } from '../../lib/utils';

const ourName = (state: AppState) => state.myClubName || 'Nós';

/** The clock of the game, ticking every second on this phone (from the times saved by whoever records the game). */
function useTick(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

const clockText = (m: Match) => {
  const phase = getMatchPhase(m);
  if (phase === 'intervalo') return 'Intervalo';
  return `${PHASE_LABELS[phase] || ''} · ${formatMatchTime(getMatchElapsedMs(m))}`;
};

/** 📡 Início: a card while a game is being recorded, with the score and the button to follow it. */
export const LiveMatchCard: React.FC<{ state: AppState; onOpen: () => void }> = ({ state, onOpen }) => {
  const match = liveMatchOf(state.matches);
  useTick(Boolean(match?.timer?.isRunning));
  if (!match) return null;
  const { ours, theirs } = liveScore(match);
  return (
    <section
      aria-label="Jogo em direto"
      className="rounded-2xl border border-rose-500 bg-gradient-to-br from-rose-900 to-slate-900 p-3.5"
    >
      <div className="flex items-center gap-2 text-[11px] font-black tracking-wide text-rose-200">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /> JOGO EM DIRETO
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="w-1/3 truncate text-sm font-bold text-white">{ourName(state)}</span>
        <span className="text-3xl font-black text-white font-['Chakra_Petch']">
          {ours} – {theirs}
        </span>
        <span className="w-1/3 truncate text-right text-sm font-bold text-white">{match.opponent}</span>
      </div>
      <div className="mt-1 text-center text-xs font-bold text-rose-200">{clockText(match)}</div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-black text-rose-900"
      >
        📡 Acompanhar ao vivo
      </button>
      {match.liveBy && <p className="mt-1.5 text-center text-[11px] text-rose-200">Registado por {match.liveBy}</p>}
    </section>
  );
};

/** 📡 The game followed live: score, clock, numbers and events as they arrive. Only to watch. */
export const LiveFollowModal: React.FC<{ state: AppState; onClose: () => void }> = ({ state, onClose }) => {
  const live = liveMatchOf(state.matches);
  // Once the game ends it stays on screen with the final score
  const [matchId] = useState(() => live?.id);
  const match = live || (state.matches || []).find((m) => m.id === matchId) || null;
  const now = useTick(Boolean(match && !match.finished));

  // Goals and new shots/corners seen while watching: a message at the top and a short vibration. Worked out while
  // rendering, from the previous version of the game kept in state (React's pattern for "what changed").
  const [previous, setPrevious] = useState<Match | null>(match);
  const [flash, setFlash] = useState<{ text: string; at: number } | null>(null);
  const [seen, setSeen] = useState<Array<{ id: string; minute: string; text: string }>>([]);
  if (match && previous !== match) {
    setPrevious(match);
    if (previous && previous.id === match.id) {
      const was = liveScore(previous);
      const now = liveScore(match);
      const minute = `${Math.max(1, Math.ceil(getMatchElapsedMs(match) / 60000))}'`;
      const message =
        now.ours > was.ours
          ? `⚽ Golo! ${ourName(state)} ${now.ours} – ${now.theirs}`
          : now.theirs > was.theirs
            ? `⚽ Golo sofrido · ${now.ours} – ${now.theirs}`
            : !previous.finished && match.finished
              ? `🏁 Fim do jogo · ${now.ours} – ${now.theirs}`
              : null;
      const counts = countChanges(previous, match);
      if (counts.length)
        setSeen([...counts.map((c) => ({ id: `${c.key}-${match.liveAt || 0}`, minute, text: c.text })), ...seen]);
      if (message) setFlash({ text: message, at: match.liveAt || 0 });
    }
  }
  useEffect(() => {
    if (!flash) return;
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      /* no vibration on this device */
    }
  }, [flash]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  const events = match ? followEvents(match, state.roster) : [];
  const score = match ? liveScore(match) : { ours: 0, theirs: 0 };
  const updatedAgo = match?.liveAt ? Math.max(0, Math.round((now - match.liveAt) / 1000)) : null;

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3">
      <div
        role="dialog"
        aria-label="Ao vivo"
        className="ui-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[96dvh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">📡 Ao vivo</h3>
            {match && (
              <p className="text-[11px] text-slate-400">
                {[
                  match.phase && !PHASE_LABELS[match.phase] ? match.phase : '',
                  match.location === 'casa' ? 'em casa' : match.location === 'fora' ? 'fora' : ''
                ]
                  .filter(Boolean)
                  .join(' · ') || match.date}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar ao vivo" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>

        {!match ? (
          <p className="ui-inset p-4 text-center text-sm text-slate-400">Não há nenhum jogo a decorrer.</p>
        ) : (
          <>
            {flash && (
              <p
                role="alert"
                className="rounded-xl border border-emerald-500 bg-emerald-900/80 px-3 py-2.5 text-center text-sm font-black text-white"
              >
                {flash.text}
              </p>
            )}
            <section
              aria-label="Resultado"
              className="rounded-2xl border border-emerald-700/60 bg-gradient-to-br from-emerald-950 to-slate-900 p-4 text-center"
            >
              <div className="text-[11px] font-black tracking-wide text-emerald-300">
                {match.finished ? '🏁 RESULTADO FINAL' : '🟢 EM DIRETO'}
              </div>
              <div className="mt-1 text-5xl font-black text-white font-['Chakra_Petch']">
                {score.ours} – {score.theirs}
              </div>
              <div className="mt-1 flex justify-between text-sm font-bold text-white">
                <span className="truncate">{ourName(state)}</span>
                <span className="truncate">{match.opponent}</span>
              </div>
              {!match.finished && (
                <span className="mt-2 inline-block rounded-full bg-black/40 px-3 py-1 text-sm font-black text-emerald-300 font-['Chakra_Petch']">
                  ⏱ {clockText(match)}
                </span>
              )}
              <p className="mt-1.5 text-[11px] text-slate-400">
                {updatedAgo !== null
                  ? `Atualizado há ${updatedAgo < 60 ? `${updatedAgo} s` : `${Math.round(updatedAgo / 60)} min`}`
                  : 'À espera de novidades'}
                {match.liveBy ? ` · registado por ${match.liveBy}` : ''}
              </p>
            </section>

            <section aria-label="Números do jogo" className="ui-inset p-3">
              <div className="mb-1.5 text-[11px] font-bold text-cyan-300">NÚMEROS DO JOGO</div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
                {followStats(match).map((s) => (
                  <React.Fragment key={s.label}>
                    <b className="text-right text-white">{s.ours}</b>
                    <span className="text-center text-[11px] text-slate-400">{s.label}</span>
                    <b className="text-white">{s.theirs}</b>
                  </React.Fragment>
                ))}
              </div>
            </section>

            <section aria-label="Lances" className="ui-inset p-3">
              <div className="mb-1 text-[11px] font-bold text-cyan-300">LANCES (o mais recente em cima)</div>
              {seen.length + events.length === 0 ? (
                <p className="py-2 text-xs text-slate-400">Ainda sem lances.</p>
              ) : (
                <ul>
                  {seen.map((s) => (
                    <li key={s.id} className="flex gap-3 border-t border-slate-800 py-2 text-sm first:border-0">
                      <span className="w-9 shrink-0 font-black text-cyan-300 font-['Chakra_Petch']">{s.minute}</span>
                      <span className="text-slate-200">{s.text}</span>
                    </li>
                  ))}
                  {events.map((e, i) => (
                    <li
                      key={e.id}
                      className={`flex gap-3 border-t border-slate-800 py-2 text-sm first:border-0 ${
                        i === 0 && !seen.length ? 'rounded-lg bg-cyan-500/10 px-1.5' : ''
                      }`}
                    >
                      <span className="w-9 shrink-0 font-black text-cyan-300 font-['Chakra_Petch']">{e.minute}</span>
                      <span className="min-w-0">
                        {e.icon} <b className="text-white">{e.title}</b>
                        {e.detail && <span className="block text-[11px] text-slate-400">{e.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <p className="text-center text-[11px] text-slate-500">
              Só para ver: quem regista o jogo é {match.liveBy || 'quem está no Modo Jogo'}.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
