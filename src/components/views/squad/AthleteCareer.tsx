import React, { useState } from 'react';
import { AppState, Player } from '../../../types';
import { careerOf, linkCandidates, linkToPerson } from '../../../lib/athleteIdentity';

interface AthleteCareerProps {
  state: Pick<AppState, 'teams' | 'activeTeamId'>;
  player: Player;
  /** Saves this team's player (absent: read-only, no joining). */
  onSavePlayer?: (next: Player) => void;
  onShowToast: (msg: string) => void;
}

/**
 * F4 — Épocas anteriores: the same athlete in other seasons and teams (games, minutes, goals and trainings of
 * each), with the copies to join suggested when the name and the date of birth are the same. Nothing is joined
 * without the coach's tap.
 */
export const AthleteCareer: React.FC<AthleteCareerProps> = ({ state, player, onSavePlayer, onShowToast }) => {
  const teamId = state.activeTeamId || '';
  const career = careerOf(state, teamId, player.id);
  const candidates = linkCandidates(state, teamId, player.id);
  const suggested = candidates.filter((c) => c.suggested);
  const [chosen, setChosen] = useState('');

  const join = (candidateId: string, label: string) => {
    const other = (state.teams || []).flatMap((t) => t.roster || []).find((p) => p.id === candidateId);
    if (!other || !onSavePlayer) return;
    onSavePlayer(linkToPerson(player, other));
    onShowToast(`${player.name} ligado a ${label}: o histórico passa a aparecer junto. ✅`);
    setChosen('');
  };

  return (
    <section aria-label="Épocas anteriores" className="ui-card space-y-2 p-4">
      <div className="text-ui-caption font-bold text-ui-muted">Épocas anteriores</div>
      {career.length === 0 ? (
        <p className="text-ui-caption text-ui-muted">Ainda sem outras épocas ligadas a este atleta.</p>
      ) : (
        <ul className="space-y-1.5">
          {career.map((c) => (
            <li key={`${c.teamId}`} className="flex flex-wrap items-baseline justify-between gap-x-3 text-ui-caption">
              <span className="font-bold text-ui-text">{c.label}</span>
              <span className="tabular-nums text-ui-muted">
                {c.played} jogos · {c.minutes} min · {c.goals} golos · treinos {c.trainings.present}/{c.trainings.held}
              </span>
            </li>
          ))}
        </ul>
      )}

      {onSavePlayer &&
        suggested.map((c) => (
          <div
            key={c.playerId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-ui border border-ui-brand/40 p-2"
          >
            <span className="text-ui-caption">
              Encontrámos <strong>{c.name}</strong> no <strong>{c.label}</strong>, com a mesma data de nascimento. É a
              mesma pessoa?
            </span>
            <button
              type="button"
              onClick={() => join(c.playerId, c.label)}
              className="ui-btn ui-btn-soft px-3 py-1 text-ui-caption"
            >
              É a mesma pessoa
            </button>
          </div>
        ))}

      {onSavePlayer && candidates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Ligar a um atleta de outra época"
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
            className="ui-input min-w-0 flex-1 text-ui-caption"
          >
            <option value="">Ligar a um atleta de outra época…</option>
            {candidates.map((c) => (
              <option key={c.playerId} value={c.playerId}>
                {c.name} · {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!chosen}
            onClick={() => {
              const c = candidates.find((x) => x.playerId === chosen);
              if (c) join(c.playerId, c.label);
            }}
            className="ui-btn ui-btn-soft px-3 py-1 text-ui-caption disabled:opacity-40"
          >
            Ligar
          </button>
        </div>
      )}
    </section>
  );
};
