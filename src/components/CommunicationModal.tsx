import React, { useState } from 'react';
import { AppState } from '../types';
import { ChangeKind, changeMessage, upcomingEvents } from '../lib/changeNotice';
import { calendarTeamName } from '../hooks/useCalendarPublisher';
import { localDateISO } from '../lib/trainingQuick';
import { TabType } from './Navbar';

interface CommunicationModalProps {
  state: AppState;
  onNavigate: (tab: TabType, targetId?: string) => void;
  onOpenParentsLink: () => void;
  onOpenPushSettings: () => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const KINDS: Array<[ChangeKind, string, string]> = [
  ['hora', '🕒 Hora', 'Nova hora (ex.: 18:30)'],
  ['local', '📍 Local', 'Novo local'],
  ['cancelado', '❌ Cancelado', 'Motivo (opcional)'],
  ['lembrete', '🔔 Lembrete', 'Nota (opcional, ex.: trazer caneleiras)']
];

/**
 * Mais → 📣 Comunicação: every way of telling the parents and the staff (calendar, game link, call-ups, notices,
 * the assistant's plan) in one place, and a quick message about a change to a training or a game. Messages only
 * carry the event: never contacts, birth dates or notes.
 */
const CommunicationModal: React.FC<CommunicationModalProps> = ({
  state,
  onNavigate,
  onOpenParentsLink,
  onOpenPushSettings,
  onShowToast,
  onClose
}) => {
  const events = upcomingEvents(state, localDateISO());
  const [eventId, setEventId] = useState(events[0]?.id || '');
  const [kind, setKind] = useState<ChangeKind>('hora');
  const [value, setValue] = useState('');
  const event = events.find((e) => e.id === eventId);
  const message = event ? changeMessage(calendarTeamName(state), event, kind, value) : '';
  const go = (tab: TabType) => {
    onClose();
    onNavigate(tab);
  };
  const channels: Array<[string, string, () => void]> = [
    ['📡 Link do jogo para os pais', 'O jogo em direto, sem conta nem app', () => onOpenParentsLink()],
    [
      '📅 Calendário para os pais',
      'Jogos e treinos no telemóvel deles (Agenda → Calendário para os pais)',
      () => go('calendario')
    ],
    ['📋 Convocatória por WhatsApp', 'Lista e imagem da convocatória', () => go('convocatoria')],
    [
      '🔔 Avisos no telemóvel',
      'Jogos ao vivo e lembretes da agenda no telemóvel dos treinadores',
      () => onOpenPushSettings()
    ],
    ['🔗 Plano para o adjunto', 'O treino de hoje num link (Treinos → Link para o adjunto)', () => go('treinos')]
  ];

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3">
      <div
        role="dialog"
        aria-label="Comunicação"
        className="ui-card w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ui-text">📣 Comunicação</h3>
          <button type="button" onClick={onClose} aria-label="Fechar comunicação" className="text-ui-muted text-lg">
            ✕
          </button>
        </div>

        <section aria-label="Aviso de alteração" className="ui-card-raised space-y-2 p-3">
          <div className="ui-kicker">Aviso de alteração para os pais</div>
          {events.length === 0 ? (
            <p className="text-xs text-ui-muted">Não há treinos nem jogos nas próximas duas semanas.</p>
          ) : (
            <>
              <select
                aria-label="Treino ou jogo"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="ui-input text-sm"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.date.slice(8, 10)}/{e.date.slice(5, 7)}
                    {e.time ? ` ${e.time}` : ''} · {e.title}
                  </option>
                ))}
              </select>
              <div role="group" aria-label="O que mudou" className="grid grid-cols-4 gap-1">
                {KINDS.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                    className={`ui-btn px-1 py-1.5 text-[11px] ${kind === k ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                aria-label="Novo valor"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={120}
                placeholder={KINDS.find(([k]) => k === kind)?.[2]}
                className="ui-input text-sm"
              />
              <p
                aria-label="Mensagem"
                className="whitespace-pre-wrap rounded-lg bg-ui-surface p-2.5 text-xs text-ui-text"
              >
                {message}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn-success py-2.5 text-xs"
                >
                  💬 Enviar pelo WhatsApp
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(message);
                      onShowToast('Mensagem copiada ✓');
                    } catch {
                      onShowToast('Não foi possível copiar: selecione o texto.');
                    }
                  }}
                  className="ui-btn ui-btn-secondary py-2.5 text-xs"
                >
                  Copiar
                </button>
              </div>
              <p className="text-[11px] text-ui-muted">
                Só envia a mensagem: para mudar mesmo o treino ou o jogo, altere-o na Agenda.
              </p>
            </>
          )}
        </section>

        <section aria-label="Canais" className="ui-card divide-y divide-ui-line overflow-hidden">
          {channels.map(([title, detail, run]) => (
            <button
              key={title}
              type="button"
              onClick={run}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-ui-surface-2"
            >
              <span className="min-w-0 flex-1">
                <b className="block text-sm text-ui-text">{title}</b>
                <span className="text-[11px] text-ui-muted">{detail}</span>
              </span>
              <span className="text-ui-muted">›</span>
            </button>
          ))}
        </section>
        <p className="text-[11px] text-ui-muted">
          🔒 Nada do que sai daqui leva contactos, datas de nascimento, avaliações ou notas dos atletas.
        </p>
      </div>
    </div>
  );
};

export default CommunicationModal;
