import React, { useState } from 'react';
import { AppState } from '../types';
import { newsletterDue, weekLabel } from '../lib/weeklyNewsletter';
import { addDaysISO } from '../lib/trainingQuick';

interface NewsletterReminderProps {
  state: AppState;
  onOpen: () => void;
}

/**
 * 📰 Início, from Monday at 7:00: the summary of the week that has ended (Monday to Sunday) is ready to check and
 * send to the parents. Goes away when a coach of the team publishes it (team.newsletterWeek), or for now with
 * "Mais tarde".
 */
export const NewsletterReminder: React.FC<NewsletterReminderProps> = ({ state, onOpen }) => {
  const [dismissed, setDismissed] = useState(false);
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const due = state.currentUser?.id ? newsletterDue(new Date(), team?.newsletterWeek) : null;
  if (dismissed || !team || !due) return null;

  return (
    <div
      role="status"
      aria-label="Resumo da semana"
      className="ui-card-raised mb-3 p-3 flex flex-col sm:flex-row sm:items-center gap-2.5"
    >
      <div className="flex-1 text-xs text-ui-text">
        <div className="ui-kicker">📰 Resumo da semana</div>O resumo da semana de {weekLabel(due, addDaysISO(due, 6))}{' '}
        está pronto: reveja, escreva a mensagem e envie aos pais.
      </div>
      <div className="flex gap-2 shrink-0">
        <button type="button" onClick={onOpen} className="ui-btn ui-btn-primary px-3 py-2 text-xs">
          Rever e enviar
        </button>
        <button type="button" onClick={() => setDismissed(true)} className="ui-btn ui-btn-secondary px-3 py-2 text-xs">
          Mais tarde
        </button>
      </div>
    </div>
  );
};
