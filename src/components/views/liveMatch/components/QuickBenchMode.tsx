import React from 'react';
import { Match, Player } from '../../../../types';

interface QuickBenchModeProps {
  match: Match;
  myClubName: string;
  roster: Player[];
  onQuickGoalScored: () => void;
  onQuickGoalConceded: () => void;
  onQuickSub: () => void;
  onQuickCard: () => void;
  /** One-tap goal: registers a goal by this athlete at the clock's minute (returns it, for "Desfazer"). */
  // Cantos & Faltas
  onAddCorner: () => void;
  onRemoveCorner?: () => void;
  onAddFoul: () => void;
  onRemoveFoul?: () => void;
  onAddOpponentCorner: () => void;
  onRemoveOpponentCorner?: () => void;
  onAddOpponentFoul: () => void;
  onRemoveOpponentFoul?: () => void;
  // Remates (a favor e contra, dentro e fora da área)
  onAddShotInBoxFor: () => void;
  onRemoveShotInBoxFor?: () => void;
  onAddShotOutBoxFor: () => void;
  onRemoveShotOutBoxFor?: () => void;
  onAddShotInBoxAgainst: () => void;
  onRemoveShotInBoxAgainst?: () => void;
  onAddShotOutBoxAgainst: () => void;
  onRemoveShotOutBoxAgainst?: () => void;
  /** Which part to show: the action pad (goals, sub, card, one-tap goal) or the numbers (shots, corners, fouls). */
  section?: 'pad' | 'numbers';
}

// One row of the numbers: our count and theirs, each with − and +1
const Counter: React.FC<{
  label: string;
  ours: number;
  theirs: number;
  addOurs: () => void;
  removeOurs?: () => void;
  addTheirs: () => void;
  removeTheirs?: () => void;
  titles: [string, string, string, string];
}> = ({ label, ours, theirs, addOurs, removeOurs, addTheirs, removeTheirs, titles }) => (
  <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
    <span className="flex items-center justify-end gap-1.5">
      {removeOurs && (
        <button
          type="button"
          onClick={removeOurs}
          title={titles[1]}
          className="ui-btn ui-btn-ghost h-9 w-9 text-ui-muted"
        >
          −
        </button>
      )}
      <span className="ui-figure w-8 text-center text-ui-title text-ui-brand">{ours}</span>
      <button type="button" onClick={addOurs} title={titles[0]} className="ui-btn ui-btn-soft h-10 w-11 text-ui-body">
        +1
      </button>
    </span>
    <span className="w-24 text-center text-ui-caption font-bold text-ui-muted">{label}</span>
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={addTheirs}
        title={titles[2]}
        className="ui-btn ui-btn-secondary h-10 w-11 text-ui-body"
      >
        +1
      </button>
      <span className="ui-figure w-8 text-center text-ui-title text-ui-text">{theirs}</span>
      {removeTheirs && (
        <button
          type="button"
          onClick={removeTheirs}
          title={titles[3]}
          className="ui-btn ui-btn-ghost h-9 w-9 text-ui-muted"
        >
          −
        </button>
      )}
    </span>
  </li>
);

export const QuickBenchMode: React.FC<QuickBenchModeProps> = ({
  match,
  myClubName,
  roster,
  onQuickGoalScored,
  onQuickGoalConceded,
  onQuickSub,
  onQuickCard,
  onAddCorner,
  onRemoveCorner,
  onAddFoul,
  onRemoveFoul,
  onAddOpponentCorner,
  onRemoveOpponentCorner,
  onAddOpponentFoul,
  onRemoveOpponentFoul,
  onAddShotInBoxFor,
  onRemoveShotInBoxFor,
  onAddShotOutBoxFor,
  onRemoveShotOutBoxFor,
  onAddShotInBoxAgainst,
  onRemoveShotInBoxAgainst,
  onAddShotOutBoxAgainst,
  onRemoveShotOutBoxAgainst,
  section = 'pad'
}) => {
  // Remates valores
  const shotsInBoxFor = match.rematesDentroArea ?? match.shotsInBoxFor ?? 0;
  const shotsOutBoxFor = match.rematesForaArea ?? match.shotsOutBoxFor ?? 0;
  const totalShotsFor = shotsInBoxFor + shotsOutBoxFor;

  const shotsInBoxAgainst = match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0;
  const shotsOutBoxAgainst = match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0;
  const totalShotsAgainst = shotsInBoxAgainst + shotsOutBoxAgainst;

  // Lista dos últimos acontecimentos (últimos 3 golos/cartões)
  const recentGoals = [...(match.goals || [])].reverse().slice(0, 3);

  if (section === 'numbers') {
    return (
      <section aria-label="Números do jogo" className="ui-card p-3 sm:p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 border-b border-ui-line pb-2 text-ui-caption font-bold">
          <span className="truncate text-right text-ui-brand">{myClubName}</span>
          <span className="w-24" />
          <span className="truncate text-ui-text">{match.opponent || 'Adversário'}</span>
        </div>
        <ul className="divide-y divide-ui-line">
          <Counter
            label="Remates na área"
            ours={shotsInBoxFor}
            theirs={shotsInBoxAgainst}
            addOurs={onAddShotInBoxFor}
            removeOurs={onRemoveShotInBoxFor}
            addTheirs={onAddShotInBoxAgainst}
            removeTheirs={onRemoveShotInBoxAgainst}
            titles={[
              'Adicionar Remate Dentro da Área',
              'Retirar Remate Dentro da Área',
              'Adicionar Remate Dentro da Área Adv',
              'Retirar Remate Dentro da Área Adv'
            ]}
          />
          <Counter
            label="Remates fora"
            ours={shotsOutBoxFor}
            theirs={shotsOutBoxAgainst}
            addOurs={onAddShotOutBoxFor}
            removeOurs={onRemoveShotOutBoxFor}
            addTheirs={onAddShotOutBoxAgainst}
            removeTheirs={onRemoveShotOutBoxAgainst}
            titles={[
              'Adicionar Remate Fora da Área',
              'Retirar Remate Fora da Área',
              'Adicionar Remate Fora da Área Adv',
              'Retirar Remate Fora da Área Adv'
            ]}
          />
          <Counter
            label="Cantos"
            ours={match.cantos || 0}
            theirs={match.cantosAdv || 0}
            addOurs={onAddCorner}
            removeOurs={onRemoveCorner}
            addTheirs={onAddOpponentCorner}
            removeTheirs={onRemoveOpponentCorner}
            titles={['Adicionar Canto', 'Decrementar Canto', 'Adicionar Canto Adv', 'Decrementar Canto Adv']}
          />
          <Counter
            label="Faltas"
            ours={match.faltas || 0}
            theirs={match.faltasAdv || 0}
            addOurs={onAddFoul}
            removeOurs={onRemoveFoul}
            addTheirs={onAddOpponentFoul}
            removeTheirs={onRemoveOpponentFoul}
            titles={['Adicionar Falta', 'Decrementar Falta', 'Adicionar Falta Adv', 'Decrementar Falta Adv']}
          />
        </ul>
        <p className="mt-2 text-center text-ui-caption text-ui-muted">
          Remates: {totalShotsFor} nós · {totalShotsAgainst} adversário
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {/* The four things that happen in a game, within reach of the thumb */}
      <section aria-label="Ações do jogo" className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onQuickGoalScored}
          aria-label="+1 Golo marcado"
          className="ui-btn ui-btn-success min-h-[76px] flex-col gap-0.5 text-ui-lead"
        >
          <span className="font-extrabold">Golo nosso</span>
          <span className="text-ui-caption font-semibold opacity-80">{myClubName}</span>
        </button>
        <button
          type="button"
          onClick={onQuickGoalConceded}
          aria-label="+1 Golo sofrido"
          className="ui-btn ui-btn-danger min-h-[76px] flex-col gap-0.5 text-ui-lead"
        >
          <span className="font-extrabold">Golo sofrido</span>
          <span className="text-ui-caption font-semibold opacity-80">{match.opponent || 'Adversário'}</span>
        </button>
        <button
          type="button"
          onClick={onQuickSub}
          className="ui-btn ui-btn-secondary min-h-[60px] text-ui-body font-bold"
        >
          Substituição
        </button>
        <button
          type="button"
          onClick={onQuickCard}
          className="ui-btn ui-btn-soft-warning min-h-[60px] text-ui-body font-bold"
        >
          Cartão
        </button>
      </section>

      {recentGoals.length > 0 && (
        <p className="flex flex-wrap gap-1.5 px-1 text-ui-caption text-ui-muted">
          {recentGoals.map((g, idx) => {
            const scorerPlayer = g.scorerId ? roster.find((p) => p.id === g.scorerId) : null;
            const scorerName = scorerPlayer
              ? scorerPlayer.name.split(' ')[0]
              : g.scorer || (g.type === 'scored' ? 'Nossa equipa' : match.opponent);
            return (
              <span key={idx} className={`ui-badge ${g.type === 'scored' ? 'ui-badge-success' : 'ui-badge-danger'}`}>
                {g.minute ? (String(g.minute).endsWith("'") ? g.minute : `${g.minute}'`) : '–'} {scorerName}
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
};
