import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Match } from '../../../types';
import { MvpLine } from '../../../lib/mvpCard';
import {
  candidateLabel,
  newVoteToken,
  tallyVotes,
  topTwo,
  VOTE_HOURS,
  VoteCandidate,
  voteLink,
  voteMessage
} from '../../../lib/mvpVote';

interface MvpVotePanelProps {
  match: Match;
  state: AppState;
  candidates: MvpLine[];
  title: string;
  onSave: (match: Match) => void;
  onPick: (playerId: string) => void;
  onShowToast: (msg: string) => void;
}

/** 🗳️ Votação dos pais: secret link, anonymous votes, the two most voted shown in the app. */
export const MvpVotePanel: React.FC<MvpVotePanelProps> = ({
  match,
  state,
  candidates,
  title,
  onSave,
  onPick,
  onShowToast
}) => {
  const vote = match.mvpVote;
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const isOpen = Boolean(vote?.open && now < vote.closesAt);
  const voteCandidates: VoteCandidate[] = candidates.map((c) => ({ id: c.player.id, label: candidateLabel(c.player) }));
  const labelOf = (id: string) => {
    const p = (state.roster || []).find((x) => x.id === id);
    return p ? candidateLabel(p) : '—';
  };
  const counted = Object.entries(vote?.votes || {})
    .map(([id, votes]) => ({ candidate: { id, label: labelOf(id) }, votes }))
    .sort((a, b) => b.votes - a.votes);
  const best = topTwo(counted);

  const count = useCallback(
    async (quiet = false) => {
      if (!vote) return;
      setBusy(true);
      try {
        const { fetchBallots } = await import('../../../services/mvpVoteService');
        const ballots = await fetchBallots(vote.token);
        const votes: Record<string, number> = {};
        tallyVotes(voteCandidates, ballots).forEach((t) => {
          if (t.votes) votes[t.candidate.id] = t.votes;
        });
        onSave({ ...match, mvpVote: { ...vote, votes, total: ballots.length, countedAt: Date.now() } });
        if (!quiet) onShowToast(`${ballots.length} voto(s) até agora`);
      } catch {
        if (!quiet) onShowToast('Não foi possível ver os votos. Verifique a ligação à internet.');
      } finally {
        setBusy(false);
      }
    },
    [vote, match, onSave, onShowToast, voteCandidates]
  );

  // Count the votes once when the panel opens (the vote may have changed since)
  const autoCounted = useRef(false);
  useEffect(() => {
    if (vote && !autoCounted.current) {
      autoCounted.current = true;
      count(true);
    }
  }, [vote, count]);

  const open = async () => {
    const clubId = state.currentUser?.clubId;
    if (!clubId || !state.activeTeamId) {
      onShowToast('Precisa de ter sessão iniciada na nuvem para abrir a votação.');
      return;
    }
    if (voteCandidates.length === 0) return;
    setBusy(true);
    const token = newVoteToken();
    const closesAt = Date.now() + VOTE_HOURS * 3600_000;
    try {
      const { openPoll } = await import('../../../services/mvpVoteService');
      await openPoll(token, { clubId, teamId: state.activeTeamId, title, candidates: voteCandidates, closesAt });
      onSave({ ...match, mvpVote: { token, closesAt, open: true } });
      onShowToast('Votação aberta ✓ Envie o link aos pais');
    } catch {
      onShowToast('Não foi possível abrir a votação. Verifique a ligação à internet.');
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!vote) return;
    setBusy(true);
    try {
      const { closePoll } = await import('../../../services/mvpVoteService');
      await closePoll(vote.token);
      onSave({ ...match, mvpVote: { ...vote, open: false } });
      onShowToast('Votação fechada');
    } catch {
      onShowToast('Não foi possível fechar a votação.');
    } finally {
      setBusy(false);
    }
  };

  const link = vote ? voteLink(vote.token) : '';
  const btn = 'py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 disabled:opacity-50';

  return (
    <section
      aria-label="Votação dos pais"
      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-amber-200 uppercase tracking-wider">🗳️ Votação dos pais</h4>
        {vote && (
          <span className={`text-[10px] font-bold ${isOpen ? 'text-emerald-300' : 'text-slate-400'}`}>
            {isOpen ? 'Aberta' : 'Fechada'}
          </span>
        )}
      </div>

      {!vote ? (
        <>
          <p className="text-[11px] text-slate-400">
            Os pais votam por um link, de forma anónima (um voto por telemóvel). No link só aparece o primeiro nome, a
            inicial do apelido e o número. A votação fica aberta {VOTE_HOURS} horas.
          </p>
          <button
            type="button"
            disabled={busy || voteCandidates.length === 0}
            onClick={open}
            className={`${btn} w-full border-amber-400/60 text-amber-200`}
          >
            {busy ? 'A abrir…' : 'Abrir votação dos pais'}
          </button>
        </>
      ) : (
        <>
          {best.length > 0 ? (
            <ol aria-label="Mais votados" className="space-y-1">
              {best.map((t, i) => (
                <li key={t.candidate.id} className="flex items-center gap-2 text-sm text-white">
                  <span>{i === 0 ? '🥇' : '🥈'}</span>
                  <span className="flex-1 font-bold">{t.candidate.label}</span>
                  <span className="text-xs text-slate-300">{t.votes} voto(s)</span>
                  {i === 0 && (
                    <button
                      type="button"
                      onClick={() => onPick(t.candidate.id)}
                      className="text-[10px] text-amber-200 underline"
                    >
                      Escolher
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[11px] text-slate-400">Ainda sem votos.</p>
          )}
          <div className="text-[10px] text-slate-500">
            {vote.total ?? 0} voto(s) no total
            {vote.countedAt
              ? ` · contados às ${new Date(vote.countedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </div>
          {isOpen && (
            <>
              <input
                readOnly
                aria-label="Link da votação"
                value={link}
                onFocus={(e) => e.target.select()}
                className="w-full bg-slate-900 rounded-lg px-2 py-1.5 text-cyan-200 text-[11px] font-mono outline-none"
              />
              <a
                href={`https://wa.me/?text=${encodeURIComponent(voteMessage(title, link, vote.closesAt))}`}
                target="_blank"
                rel="noreferrer"
                className={`${btn} bg-emerald-600 border-emerald-500 text-white`}
              >
                🟢 Enviar link aos pais por WhatsApp
              </a>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => count()}
              className={`${btn} border-slate-600 text-slate-200`}
            >
              🔄 Ver votos
            </button>
            {isOpen ? (
              <button
                type="button"
                disabled={busy}
                onClick={close}
                className={`${btn} border-rose-500/50 text-rose-300`}
              >
                Fechar votação
              </button>
            ) : (
              <span className="text-[10px] text-slate-500 self-center text-center">Os pais já não podem votar.</span>
            )}
          </div>
        </>
      )}
    </section>
  );
};
