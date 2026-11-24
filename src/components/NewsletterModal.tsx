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
  newsletterFacts,
  newsletterMessage,
  newsletterOf,
  renderNewsletterPage,
  shortDay,
  suggestedHighlights,
  suggestedIntro,
  weekLabel
} from '../lib/weeklyNewsletter';
import { newsletterLink, publishNewsletter, unpublishNewsletter } from '../services/publicNewsletter';
import { writeNewsletterIntro } from '../services/chronicle';
import { drawNewsletterCard } from '../lib/newsletterCard';

interface NewsletterModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/**
 * Mais → 📣 Comunicação → 📰 Resumo da semana: the app fills in the results, the attendance and the week ahead, and
 * suggests highlights; the coach picks them, writes the note (or asks the AI to), adds the notices, checks it and
 * publishes it to the team's link (/semana/{token}, the same link every week, with the earlier weeks below), then
 * sends the link by WhatsApp.
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
  const suggestions = useMemo(() => suggestedHighlights(state, auto), [state, auto]);
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [published, setPublished] = useState(false);
  const [tab, setTab] = useState<'editar' | 'ver'>('editar');
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
      const issue = issueOf(auto, draft);
      // The picture of the link's card in the parents' chat (without it, the card shows only the texts)
      const card = await drawNewsletterCard(teamName, issue);
      await publishNewsletter(target, { clubId, teamId: state.activeTeamId, teamName, issue, card });
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
  // 👀 Exactly the page the parents will open, with this draft (the earlier weeks are left out of the preview)
  const preview = useMemo(
    () => (tab === 'ver' ? renderNewsletterPage({ teamName, issue: issueOf(auto, draft) }, { preview: true }) : ''),
    [tab, teamName, auto, draft]
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      onShowToast('Mensagem copiada ✓');
    } catch {
      onShowToast('Não foi possível copiar: selecione o texto.');
    }
  };

  const lines = draft.highlights
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  /** A suggested highlight in or out of the list (the coach can still edit the text). */
  const toggleHighlight = (h: string) => {
    const next = lines.includes(h) ? lines.filter((l) => l !== h) : [...lines, h].slice(0, LIMITS.highlights);
    setDraft({ ...draft, highlights: next.join('\n') });
    setPublished(false);
  };

  const writeWithAI = async () => {
    setWriting(true);
    try {
      const text = await writeNewsletterIntro(newsletterFacts(teamName, auto, draft.highlights));
      setDraft((d) => ({ ...d, intro: text }));
      setPublished(false);
      onShowToast('Mensagem escrita ✓ Reveja antes de publicar.');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Não foi possível escrever a mensagem.');
    } finally {
      setWriting(false);
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

        <div role="tablist" aria-label="Modo" className="grid grid-cols-2 gap-1 rounded-xl bg-ui-inset p-1">
          {(
            [
              ['editar', '✏️ Editar'],
              ['ver', '👀 Pré-visualizar']
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              id={`newsletter-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`newsletter-panel-${id}`}
              onClick={() => setTab(id)}
              className={`ui-btn py-2 text-xs ${tab === id ? 'ui-btn-primary' : 'ui-btn-ghost'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'ver' ? (
          <div
            id="newsletter-panel-ver"
            role="tabpanel"
            aria-labelledby="newsletter-tab-ver"
            className="overflow-hidden rounded-2xl border border-ui-line"
          >
            <iframe
              title="Pré-visualização do resumo"
              srcDoc={preview}
              sandbox=""
              className="block h-[60dvh] w-full bg-ui-bg"
            />
          </div>
        ) : (
          <div
            id="newsletter-panel-editar"
            role="tabpanel"
            aria-labelledby="newsletter-tab-editar"
            className="space-y-3"
          >
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

            {suggestions.length > 0 && (
              <section aria-label="Destaques sugeridos" className="space-y-1.5">
                <span className="ui-kicker">Destaques sugeridos pela app (toque para pôr ou tirar)</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={lines.includes(h)}
                      onClick={() => toggleHighlight(h)}
                      className={`ui-btn px-2.5 py-1.5 text-[11px] ${lines.includes(h) ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                    >
                      {lines.includes(h) ? '✓ ' : '+ '}
                      {h}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {field(
              'highlights',
              'Destaques (um por linha, até 6)',
              LIMITS.highlight * LIMITS.highlights,
              3,
              'Fair-play: ajudámos um adversário lesionado\nTreino em foco: passe e desmarcação'
            )}
            {field('intro', 'Mensagem do treinador', LIMITS.intro, 4, 'Olá a todos! …')}
            <button
              type="button"
              disabled={writing}
              onClick={writeWithAI}
              className="ui-btn ui-btn-soft w-full py-2 text-xs"
            >
              {writing ? 'A escrever…' : '✨ Escrever com IA (a partir dos resultados e destaques)'}
            </button>
            {field('notices', 'Avisos', LIMITS.notices, 2, 'Quota de dezembro até dia 8.')}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab(tab === 'ver' ? 'editar' : 'ver')}
            className="ui-btn ui-btn-secondary py-3 text-sm"
          >
            {tab === 'ver' ? '✏️ Voltar a editar' : '👀 Pré-visualizar'}
          </button>
          <button type="button" disabled={busy} onClick={publish} className="ui-btn ui-btn-primary py-3 text-sm">
            {busy ? 'A publicar…' : token ? 'Publicar' : 'Criar link e publicar'}
          </button>
        </div>

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
