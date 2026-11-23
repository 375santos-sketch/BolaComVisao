import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { workspaceIdOf } from '../lib/deviceCache';
import { newCalendarToken } from '../lib/calendarFeed';
import { calendarTeamName } from '../hooks/useCalendarPublisher';
import { localDateISO } from '../lib/trainingQuick';
import {
  LIMITS,
  NewsletterDraft,
  issueOf,
  newsletterMessage,
  newsletterOf,
  shortDay,
  suggestedIntro,
  weekLabel
} from '../lib/weeklyNewsletter';
import { newsletterLink, publishNewsletter, unpublishNewsletter } from '../services/publicNewsletter';

interface NewsletterModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/**
 * Mais → 📣 Comunicação → 📰 Resumo da semana: the app fills in the results, the attendance and the next 7 days;
 * the coach writes the note, the highlights and the notices, checks it and publishes it to the team's link
 * (/semana/{token}, the same link every week), then sends the link by WhatsApp.
 */
const NewsletterModal: React.FC<NewsletterModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const token = team?.newsletterToken;
  const clubId = state.currentUser?.id ? workspaceIdOf(state.currentUser) : undefined;
  const teamName = calendarTeamName(state);
  const today = localDateISO();
  const auto = useMemo(() => newsletterOf(state, teamName, today), [state, teamName, today]);
  const [draft, setDraft] = useState<NewsletterDraft>(() => ({
    intro: suggestedIntro(auto.results),
    highlights: '',
    notices: ''
  }));
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const link = token ? newsletterLink(token) : '';

  const setTeam = (changes: { newsletterToken?: string; newsletterWeek?: string }) =>
    onUpdateState({
      teams: (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, ...changes } : t))
    });
  const setToken = (newsletterToken: string | undefined) => setTeam({ newsletterToken });

  const publish = async () => {
    if (!clubId || !state.activeTeamId) {
      onShowToast('Precisa de ter sessão iniciada na nuvem para publicar o resumo.');
      return;
    }
    setBusy(true);
    const target = token || newCalendarToken();
    try {
      await publishNewsletter(target, {
        clubId,
        teamId: state.activeTeamId,
        teamName,
        issue: issueOf(auto, draft)
      });
      // The week is marked as sent: the Monday reminder on Início goes away for every coach of the team
      setTeam({ newsletterToken: target, newsletterWeek: auto.from });
      setPublished(true);
      onShowToast('Resumo da semana publicado ✓');
    } catch {
      onShowToast('Não foi possível publicar. Verifique a ligação à internet.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await unpublishNewsletter(token);
      setToken(undefined);
      setPublished(false);
      onShowToast('Link desligado: deixou de funcionar.');
    } catch {
      onShowToast('Não foi possível desligar o link. Verifique a ligação à internet.');
    } finally {
      setBusy(false);
    }
  };

  const message = link ? newsletterMessage(teamName, issueOf(auto, draft), link) : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      onShowToast('Mensagem copiada ✓');
    } catch {
      onShowToast('Não foi possível copiar: selecione o texto.');
    }
  };

  const field = (key: keyof NewsletterDraft, label: string, max: number, rows: number, placeholder: string) => (
    <label className="block space-y-1">
      <span className="ui-kicker">{label}</span>
      <textarea
        id={`newsletter-${key}`}
        value={draft[key]}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => {
          setDraft({ ...draft, [key]: e.target.value });
          setPublished(false);
        }}
        className="ui-input w-full text-sm"
      />
    </label>
  );

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3">
      <div
        role="dialog"
        aria-label="Resumo da semana"
        className="ui-card w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ui-text">📰 Resumo da semana</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar resumo da semana"
            className="text-ui-muted text-lg"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-ui-text leading-relaxed">
          A semana vai de segunda a domingo e o resumo segue à segunda de manhã. A app junta os resultados e as
          presenças da semana que acabou e os jogos e treinos da semana que começa. Escreva a mensagem, reveja e
          publique: os pais abrem um link sem conta, que mostra sempre o resumo mais recente. Só aparecem os primeiros
          nomes de quem marcou; nunca faltas de um atleta, contactos ou notas.
        </p>

        <section aria-label="O que a app preencheu" className="ui-card-raised space-y-1.5 p-3 text-xs text-ui-text">
          <div className="ui-kicker">Semana de {weekLabel(auto.from, auto.to)}</div>
          {auto.results.length ? (
            auto.results.map((r) => (
              <p key={`${r.date}-${r.opponent}`}>
                ⚽ {shortDay(r.date)} ·{' '}
                {r.home === false
                  ? `${r.opponent} ${r.theirs}–${r.ours} ${teamName}`
                  : `${teamName} ${r.ours}–${r.theirs} ${r.opponent}`}
                {r.scorers ? <span className="text-ui-muted"> · {r.scorers}</span> : null}
              </p>
            ))
          ) : (
            <p className="text-ui-muted">Sem jogos nesta semana.</p>
          )}
          <p>
            🏃{' '}
            {auto.attendance
              ? `${auto.attendance.trainings} ${auto.attendance.trainings === 1 ? 'treino' : 'treinos'} · ${auto.attendance.percent}% de presenças`
              : 'Sem treinos fechados nesta semana.'}
          </p>
          <p>
            📅{' '}
            {auto.upcoming.length
              ? `${auto.upcoming.filter((e) => e.kind === 'jogo').length} jogo(s) e ${auto.upcoming.filter((e) => e.kind === 'treino').length} treino(s) na semana de ${weekLabel(auto.nextFrom, auto.nextTo)}`
              : `Nada marcado na semana de ${weekLabel(auto.nextFrom, auto.nextTo)}.`}
          </p>
        </section>

        {field('intro', 'Mensagem do treinador', LIMITS.intro, 3, 'Olá a todos! …')}
        {field(
          'highlights',
          'Destaques (um por linha, até 6)',
          LIMITS.highlight * LIMITS.highlights,
          3,
          'Fair-play: ajudámos um adversário lesionado\nTreino em foco: passe e desmarcação'
        )}
        {field('notices', 'Avisos', LIMITS.notices, 2, 'Quota de dezembro até dia 8.')}

        <button type="button" disabled={busy} onClick={publish} className="ui-btn ui-btn-primary w-full py-3 text-sm">
          {busy ? 'A publicar…' : token ? 'Publicar o resumo desta semana' : 'Criar link e publicar'}
        </button>

        {token && (
          <section aria-label="Enviar aos pais" className="space-y-2">
            {!published && (
              <p className="text-[11px] text-ui-warning">
                O link mostra o último resumo publicado. Publique para os pais verem esta versão.
              </p>
            )}
            <input
              readOnly
              aria-label="Link do resumo"
              value={link}
              className="ui-input w-full text-xs"
              onFocus={(e) => e.target.select()}
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
                className="ui-btn ui-btn-success py-2.5 text-xs flex items-center justify-center"
              >
                💬 Enviar pelo WhatsApp
              </a>
              <button type="button" onClick={copy} className="ui-btn ui-btn-secondary py-2.5 text-xs">
                Copiar mensagem
              </button>
            </div>
            <a href={link} target="_blank" rel="noopener noreferrer" className="block text-xs text-ui-brand underline">
              Ver como os pais veem
            </a>
            <button type="button" disabled={busy} onClick={disable} className="text-xs text-ui-danger underline">
              Desligar o link
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default NewsletterModal;
