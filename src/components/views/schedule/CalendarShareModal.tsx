import React, { useState } from 'react';
import { AppState } from '../../../types';
import { newCalendarToken } from '../../../lib/calendarFeed';
import { calendarEventsOf, calendarTeamName } from '../../../hooks/useCalendarPublisher';
import { calendarLinks, publishCalendar, unpublishCalendar } from '../../../services/publicCalendar';

interface CalendarShareModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/**
 * Agenda → "Calendário para os pais": a secret link with the games and trainings that parents add to their phone
 * (Google Calendar, iPhone) and that updates on its own. Never carries athletes' names, call-ups or contacts.
 */
export const CalendarShareModal: React.FC<CalendarShareModalProps> = ({
  state,
  onUpdateState,
  onShowToast,
  onClose
}) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const token = team?.calendarToken;
  // Same club workspace as the cloud sync (accounts without a club code use the default "main" club)
  const clubId = state.currentUser?.id ? state.currentUser.clubId || 'main' : undefined;
  const [busy, setBusy] = useState(false);
  const links = token ? calendarLinks(token) : null;
  const events = calendarEventsOf(state);
  const teamName = calendarTeamName(state);

  const setToken = (calendarToken: string | undefined) =>
    onUpdateState({
      teams: (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, calendarToken } : t))
    });

  const create = async () => {
    if (!clubId || !state.activeTeamId) {
      onShowToast('Precisa de ter sessão iniciada na nuvem para partilhar o calendário.');
      return;
    }
    setBusy(true);
    const fresh = newCalendarToken();
    try {
      await publishCalendar(fresh, { clubId, teamId: state.activeTeamId, teamName, events });
      setToken(fresh);
      onShowToast('Link do calendário criado ✓');
    } catch {
      onShowToast('Não foi possível criar o link. Verifique a ligação à internet.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await unpublishCalendar(token);
      setToken(undefined);
      onShowToast('Link desativado: os telemóveis deixam de receber os jogos e treinos.');
    } catch {
      onShowToast('Não foi possível desativar o link. Verifique a ligação à internet.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onShowToast(msg);
    } catch {
      onShowToast('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  };

  const whatsappText = links
    ? `📅 Calendário de jogos e treinos – ${teamName}\n\n` +
      `Adicione ao telemóvel e fica sempre atualizado:\n` +
      `• iPhone: abra ${links.webcal}\n` +
      `• Android/Google: abra ${links.google}\n\n` +
      `Link: ${links.https}`
    : '';

  const button = 'w-full py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2';

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Calendário para os pais"
        className="ui-card w-full max-w-md p-5 space-y-3 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-ui-text font-['Chakra_Petch'] uppercase">
            📅 Calendário para os pais
          </h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-ui-muted text-lg">
            ✕
          </button>
        </div>
        <p className="text-[11px] text-ui-text">
          Os pais adicionam este calendário ao telemóvel (Google Calendar ou iPhone) e passam a ver os{' '}
          <b>jogos e treinos</b> de {teamName}, que se atualizam sozinhos quando muda a Agenda. Só leva datas, horas,
          adversários e locais: <b>nunca nomes de atletas, convocatórias ou contactos</b>.
        </p>

        {!links ? (
          <button type="button" disabled={busy} onClick={create} className="ui-btn ui-btn-primary w-full py-3 text-sm">
            {busy ? 'A criar…' : 'Criar link do calendário'}
          </button>
        ) : (
          <>
            <div className="ui-inset p-2.5">
              <div className="text-[10px] text-ui-muted mb-1">Link do calendário ({events.length} jogos e treinos)</div>
              <input
                readOnly
                aria-label="Link do calendário"
                value={links.https}
                onFocus={(e) => e.target.select()}
                className="w-full bg-transparent text-ui-brand text-[11px] font-mono outline-none"
              />
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noreferrer"
              className={`${button} bg-ui-success border-ui-success text-ui-text`}
            >
              🟢 Enviar aos pais por WhatsApp
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a href={links.webcal} className={`${button} border-ui-line-strong text-ui-text`}>
                🍎 Abrir no iPhone
              </a>
              <a
                href={links.google}
                target="_blank"
                rel="noreferrer"
                className={`${button} border-ui-line-strong text-ui-text`}
              >
                📆 Google Calendar
              </a>
            </div>
            <button
              type="button"
              onClick={() => copy(links.https, 'Link copiado ✓')}
              className={`${button} border-ui-brand/60 text-ui-brand`}
            >
              📋 Copiar link
            </button>
            <p className="text-[10px] text-ui-muted">
              O Google e o iPhone vão buscar as novidades sozinhos, de algumas em algumas horas. Quem tiver o link vê o
              calendário: partilhe-o só com os pais da equipa.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={disable}
              className="w-full py-2 text-[11px] text-ui-danger underline disabled:opacity-50"
            >
              Desativar este link
            </button>
          </>
        )}
      </div>
    </div>
  );
};
