import React from 'react';
import { Exercise, ScheduledMatch, Training } from '../../../types';
import { MiniPitch } from '../trainings/PlanningCards';
import { trainingImage } from '../../../lib/trainingImage';
import { dayLabel, trainingMinutes } from '../../../lib/planningSummary';
import { Icon, IconName } from '../../ui/Icon';

const Item: React.FC<{
  kicker: string;
  icon: IconName;
  tone: 'success' | 'brand';
  title: string;
  when: string;
  detail: string;
  onOpen?: () => void;
  empty?: { text: string; action: string; onClick: () => void };
  /** In place of the icon: the training's pitch (its drawing, or the lines of a pitch). */
  thumb?: React.ReactNode;
}> = ({ kicker, icon, tone, title, when, detail, onOpen, empty, thumb }) => {
  const look = tone === 'success' ? 'bg-ui-success-soft text-ui-success' : 'bg-ui-brand-soft text-ui-brand';
  if (empty) {
    // Nothing planned: one quiet line (adding is done on the day below or with the "+")
    return (
      <div className="ui-card flex min-h-14 items-center gap-3 px-4 py-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-sm bg-ui-surface-3 text-ui-muted"
          aria-hidden
        >
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ui-caption font-bold text-ui-muted">{kicker}</p>
          <p className="text-ui-body text-ui-muted">{empty.text}</p>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="ui-card flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ui-surface-2"
    >
      {thumb || (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-ui ${look}`} aria-hidden>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-ui-caption font-bold ${tone === 'success' ? 'text-ui-success' : 'text-ui-brand'}`}>
          {kicker}
        </span>
        <span className="block truncate text-ui-body font-extrabold text-ui-text">{title}</span>
        <span className="block truncate text-ui-caption text-ui-muted">
          <strong className="text-ui-text">{when}</strong> · {detail}
        </span>
      </span>
      <Icon name="chevronRight" className="h-[18px] w-[18px] shrink-0 text-ui-subtle" />
    </button>
  );
};

/** Agenda: the next training and the next game, before the calendar. */
export const NextUpCard: React.FC<{
  training: Training | undefined;
  game: ScheduledMatch | undefined;
  onOpenTraining: (t: Training) => void;
  onOpenGame: (g: ScheduledMatch) => void;
  onNewTraining: () => void;
  onNewGame: () => void;
  library?: Exercise[];
}> = ({ training, game, onOpenTraining, onOpenGame, onNewTraining, onNewGame, library = [] }) => (
  <section aria-label="Próximo" className="grid grid-cols-1 gap-2 md:grid-cols-2">
    {training ? (
      <Item
        kicker="Próximo treino"
        icon="whistle"
        tone="success"
        title={
          training.sessionPlan?.objective?.trim() ||
          (training.trainingNumber ? `Treino ${training.trainingNumber}` : 'Treino')
        }
        when={`${dayLabel(training.date)}${training.time ? ` ${training.time}` : ''}`}
        detail={[
          training.location || 'Local por definir',
          trainingMinutes(training) ? `${trainingMinutes(training)} min` : ''
        ]
          .filter(Boolean)
          .join(' · ')}
        onOpen={() => onOpenTraining(training)}
        thumb={<MiniPitch image={trainingImage(training, library)} className="h-12 w-[72px]" />}
      />
    ) : (
      <Item
        kicker="Próximo treino"
        icon="whistle"
        tone="success"
        title=""
        when=""
        detail=""
        empty={{ text: 'Nenhum treino agendado.', action: '+ Treino', onClick: onNewTraining }}
      />
    )}
    {game ? (
      <Item
        kicker="Próximo jogo"
        icon="ball"
        tone="brand"
        title={`${game.location === 'casa' ? 'vs' : '@'} ${game.opponent}`}
        when={`${dayLabel(game.date)}${game.time ? ` ${game.time}` : ''}`}
        detail={
          game.venue || (game.location === 'casa' ? 'Em casa' : game.location === 'fora' ? 'Fora' : 'Campo neutro')
        }
        onOpen={() => onOpenGame(game)}
      />
    ) : (
      <Item
        kicker="Próximo jogo"
        icon="ball"
        tone="brand"
        title=""
        when=""
        detail=""
        empty={{ text: 'Nenhum jogo marcado.', action: '+ Jogo', onClick: onNewGame }}
      />
    )}
  </section>
);
