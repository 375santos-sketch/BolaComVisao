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
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Calendário para os pais"
        className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 space-y-3 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">
            📅 Calendário para os pais
          </h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>
        <p className="text-[11px] text-slate-300">
          Os pais adicionam este calendário ao telemóvel (Google Calendar ou iPhone) e passam a ver os{' '}
          <b>jogos e treinos</b> de {teamName}, que se atualizam sozinhos quando muda a Agenda. Só leva datas, horas,
          adversários e locais: <b>nunca nomes de atletas, convocatórias ou contactos</b>.
        </p>

        {!links ? (
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 text-sm font-black uppercase disabled:opacity-50"
          >
            {busy ? 'A criar…' : 'Criar link do calendário'}
          </button>
        ) : (
          <>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-700">
              <div className="text-[10px] text-slate-400 mb-1">
                Link do calendário ({events.length} jogos e treinos)
              </div>
              <input
                readOnly
                aria-label="Link do calendário"
                value={links.https}
                onFocus={(e) => e.target.select()}
                className="w-full bg-transparent text-cyan-200 text-[11px] font-mono outline-none"
              />
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noreferrer"
              className={`${button} bg-emerald-600 border-emerald-500 text-white`}
            >
              🟢 Enviar aos pais por WhatsApp
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a href={links.webcal} className={`${button} border-slate-600 text-slate-200`}>
                🍎 Abrir no iPhone
              </a>
              <a
                href={links.google}
                target="_blank"
                rel="noreferrer"
                className={`${button} border-slate-600 text-slate-200`}
              >
                📆 Google Calendar
              </a>
            </div>
            <button
              type="button"
              onClick={() => copy(links.https, 'Link copiado ✓')}
              className={`${button} border-cyan-500/60 text-cyan-200`}
            >
              📋 Copiar link
            </button>
            <p className="text-[10px] text-slate-500">
              O Google e o iPhone vão buscar as novidades sozinhos, de algumas em algumas horas. Quem tiver o link vê o
              calendário: partilhe-o só com os pais da equipa.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={disable}
              className="w-full py-2 text-[11px] text-rose-300 underline disabled:opacity-50"
            >
              Desativar este link
            </button>
          </>
        )}
      </div>
    </div>
  );
};
