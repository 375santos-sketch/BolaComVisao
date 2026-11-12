import React, { useRef, useState } from 'react';
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
  <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 py-2 sm:gap-2">
    <span className="flex items-center justify-end gap-1.5">
      {removeOurs && (
        <button
          type="button"
          onClick={removeOurs}
          title={titles[1]}
          className="ui-btn ui-btn-ghost h-9 w-7 text-ui-muted sm:w-9"
        >
          −
        </button>
      )}
      <span className="ui-figure w-6 text-center text-ui-title text-ui-brand sm:w-8">{ours}</span>
      <button type="button" onClick={addOurs} title={titles[0]} className="ui-btn ui-btn-soft h-10 w-11 text-ui-body">
        +1
      </button>
    </span>
    <span className="w-[4.5rem] text-center text-ui-caption font-bold leading-tight text-ui-muted sm:w-24">
      {label}
    </span>
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={addTheirs}
        title={titles[2]}
        className="ui-btn ui-btn-secondary h-10 w-11 text-ui-body"
      >
        +1
      </button>
      <span className="ui-figure w-6 text-center text-ui-title text-ui-text sm:w-8">{theirs}</span>
      {removeTheirs && (
        <button
          type="button"
          onClick={removeTheirs}
          title={titles[3]}
          className="ui-btn ui-btn-ghost h-9 w-7 text-ui-muted sm:w-9"
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

  // A tap shows at once (the button sinks for a moment) and a second tap on the same button within half a second is
  // ignored: a shaky finger does not count twice
  const [pressed, setPressed] = useState<string | null>(null);
  const lastTap = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const tap = (key: string, run: (() => void) | undefined, now: number) => {
    if (!run) return;
    if (lastTap.current.key === key && now - lastTap.current.at < 500) return;
    lastTap.current = { key, at: now };
    setPressed(key);
    setTimeout(() => setPressed((k) => (k === key ? null : k)), 180);
    run();
  };
  const counter = (
    key: string,
    label: string,
    side: string,
    total: number,
    run: (() => void) | undefined,
    title: string,
    theirs = false
  ) => (
    <button
      key={key}
      type="button"
      title={title}
      aria-label={`${label}${side ? ` ${side}` : ''}: ${total}`}
      onClick={(e) => tap(key, run, e.timeStamp)}
      className={`live-count ${theirs ? 'is-theirs' : ''} ${pressed === key ? 'is-pressed' : ''}`}
    >
      <span>{label}</span>
      {side && <small>{side}</small>}
      <b>{total}</b>
    </button>
  );

  // Lista dos últimos acontecimentos (últimos 3 golos/cartões)
  const recentGoals = [...(match.goals || [])].reverse().slice(0, 3);

  if (section === 'numbers') {
    return (
      <section aria-label="Números do jogo" className="ui-card p-3 sm:p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 border-b border-ui-line pb-2 text-ui-caption font-bold">
          <span className="truncate text-right text-ui-brand">{myClubName}</span>
          <span className="w-[4.5rem] sm:w-24" />
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
          {onQuickCard && (
            <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 py-2 sm:gap-2">
              <span className="flex items-center justify-end gap-1.5">
                <span
                  className="ui-figure w-8 text-center text-ui-title text-ui-warning"
                  title="Cartões da nossa equipa"
                >
                  {(match.cards || []).length}
                </span>
                <button
                  type="button"
                  onClick={onQuickCard}
                  title="Adicionar Cartão"
                  className="ui-btn ui-btn-soft-warning h-10 px-2.5 text-ui-caption font-bold"
                >
                  + Cartão
                </button>
              </span>
              <span className="w-[4.5rem] text-center text-ui-caption font-bold leading-tight text-ui-muted sm:w-24">
                Cartões
              </span>
              <span className="text-ui-caption text-ui-muted">
                {(match.cards || []).filter((c) => c.color === 'Amarelo').length} am. ·{' '}
                {(match.cards || []).filter((c) => c.color === 'Vermelho').length} verm.
              </span>
            </li>
          )}
        </ul>
        <p className="mt-2 text-center text-ui-caption text-ui-muted">
          Remates: {totalShotsFor} nós · {totalShotsAgainst} adversário
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {/* 1. Goals: the two big buttons */}
      <section aria-label="Ações do jogo" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(e) => tap('golo', onQuickGoalScored, e.timeStamp)}
          aria-label="+1 Golo marcado"
          className={`live-goal bg-[var(--color-ui-success)] text-ui-bg ${pressed === 'golo' ? 'is-pressed' : ''}`}
        >
          <span>⚽ GOLO NOSSO</span>
          <small>escolher marcador</small>
        </button>
        <button
          type="button"
          onClick={(e) => tap('sofrido', onQuickGoalConceded, e.timeStamp)}
          aria-label="+1 Golo sofrido"
          className={`live-goal bg-[var(--color-ui-danger)] text-ui-text ${pressed === 'sofrido' ? 'is-pressed' : ''}`}
        >
          <span>GOLO SOFRIDO</span>
          <small>{match.opponent || 'Adversário'}</small>
        </button>
      </section>

      {/* 2. Corners and shots: one tap adds one (the total is on the button); mistakes go back with Desfazer */}
      <section aria-label="Cantos e remates" className="space-y-1.5">
        <div className="live-kicker">
          <span>Cantos</span>
          <b>
            {match.cantos || 0} · {match.cantosAdv || 0}
          </b>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {counter('canto', 'Canto nosso', '', match.cantos || 0, onAddCorner, 'Adicionar Canto')}
          {counter(
            'canto-adv',
            'Canto deles',
            '',
            match.cantosAdv || 0,
            onAddOpponentCorner,
            'Adicionar Canto Adv',
            true
          )}
        </div>
        <div className="live-kicker pt-1">
          <span>Remates</span>
          <b>
            {totalShotsFor} · {totalShotsAgainst}
          </b>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {counter('rem-in', 'Dentro', 'nosso', shotsInBoxFor, onAddShotInBoxFor, 'Adicionar Remate Dentro da Área')}
          {counter('rem-out', 'Fora', 'nosso', shotsOutBoxFor, onAddShotOutBoxFor, 'Adicionar Remate Fora da Área')}
          {counter(
            'rem-in-adv',
            'Dentro',
            'deles',
            shotsInBoxAgainst,
            onAddShotInBoxAgainst,
            'Adicionar Remate Dentro da Área Adv',
            true
          )}
          {counter(
            'rem-out-adv',
            'Fora',
            'deles',
            shotsOutBoxAgainst,
            onAddShotOutBoxAgainst,
            'Adicionar Remate Fora da Área Adv',
            true
          )}
        </div>
      </section>

      {/* 3. Substitution, card and fouls: a step below, still one tap away */}
      <section aria-label="Outros acontecimentos" className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={(e) => tap('sub', onQuickSub, e.timeStamp)}
          aria-label="Substituição"
          className={`live-small ${pressed === 'sub' ? 'is-pressed' : ''}`}
        >
          ⇄ Subst.
        </button>
        <button
          type="button"
          onClick={(e) => tap('cartao', onQuickCard, e.timeStamp)}
          aria-label="Cartão"
          className={`live-small text-ui-warning ${pressed === 'cartao' ? 'is-pressed' : ''}`}
        >
          ▮ Cartão
        </button>
        <button
          type="button"
          onClick={(e) => tap('falta', onAddFoul, e.timeStamp)}
          title="Adicionar Falta"
          aria-label={`Falta nossa: ${match.faltas || 0}`}
          className={`live-small ${pressed === 'falta' ? 'is-pressed' : ''}`}
        >
          Falta <b className="text-ui-brand">{match.faltas || 0}</b>
        </button>
        <button
          type="button"
          onClick={(e) => tap('falta-adv', onAddOpponentFoul, e.timeStamp)}
          title="Adicionar Falta Adv"
          aria-label={`Falta deles: ${match.faltasAdv || 0}`}
          className={`live-small ${pressed === 'falta-adv' ? 'is-pressed' : ''}`}
        >
          Falta adv <b className="text-ui-danger">{match.faltasAdv || 0}</b>
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
