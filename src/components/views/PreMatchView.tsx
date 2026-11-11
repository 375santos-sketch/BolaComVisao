import React, { useState } from 'react';
import { SectionNav } from '../ui/SectionNav';
import { datePT, dayLabel, timePT } from '../../lib/planningSummary';
import { AppState, PreMatchPlan, ScheduledMatch } from '../../types';
import { Header } from '../Header';
import { LastTimeAgainstCard } from './results/LastTimeAgainstCard';
import { OpponentFileCard } from './results/OpponentFileCard';
import { SetPiecesCard } from './setpieces/SetPiecesCard';
import {
  MAX_OBJECTIVES,
  SEVEN_A_SIDE_SYSTEMS,
  buildPreMatchText,
  cleanPlan,
  competitionLabel,
  dateLabel,
  hasPlan,
  upcomingGames
} from '../../lib/preMatchPlan';

interface PreMatchViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: string, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onOpenSync: () => void;
  onShowToast: (msg: string) => void;
  /** Scheduled game to open (from the Agenda or an alert). */
  targetOpponentId?: string | null;
}

const field = 'ui-input text-xs';
const label = 'block text-xs font-bold';

/** ⚡ Pré-jogo: a simple plan for the next game (nothing is saved until the coach saves). */
export const PreMatchView: React.FC<PreMatchViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowToast,
  targetOpponentId
}) => {
  const [section, setSection] = useState('plano');
  const games = upcomingGames(state.schedule || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const game =
    games.find((g) => g.id === selectedId) || games.find((g) => g.id === targetOpponentId) || games[0] || null;

  const saveGame = (updated: ScheduledMatch, message: string) => {
    onUpdateState({ schedule: (state.schedule || []).map((s) => (s.id === updated.id ? updated : s)) });
    onShowToast(message);
  };

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Pré-jogo"
        subtitle="O plano da equipa para o próximo jogo"
        onOpenSettings={onOpenSettings}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
      />

      {!game ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-sm text-ui-text">Não há jogos marcados na Agenda.</p>
          <button type="button" className="btn btn-outline" onClick={() => onNavigate('calendario')}>
            📅 Ir para a Agenda
          </button>
        </div>
      ) : (
        <>
          {games.length > 1 && (
            <label className={`${label} text-ui-brand`}>
              Jogo a preparar
              <select value={game.id} onChange={(e) => setSelectedId(e.target.value)} className={`${field} mt-1`}>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {dateLabel(g.date)} · vs {g.opponent}
                    {g.preMatchFinalized ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <section
            aria-label="Jogo"
            className="ui-card relative overflow-hidden p-4 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-ui-brand"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="ui-kicker">{competitionLabel(game)}</p>
                <h2 className="mt-0.5 text-ui-title font-extrabold text-ui-text">
                  {game.location === 'fora' ? '@' : 'vs'} {game.opponent}
                </h2>
                <p className="text-ui-body text-ui-text">
                  <strong>{dayLabel(game.date)}</strong> ({datePT(game.date)})
                  {timePT(game.time) ? ` · ${timePT(game.time)}` : ''}
                  <span className="text-ui-muted">
                    {' '}
                    · {game.location === 'fora' ? 'Fora' : 'Casa'}
                    {game.venue ? ` · ${game.venue}` : ''}
                  </span>
                </p>
                {(game.meetingTime || game.meetingPoint) && (
                  <p className="text-ui-caption text-ui-muted">
                    Concentração: {[timePT(game.meetingTime), game.meetingPoint].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              {game.preMatchFinalized && <span className="ui-badge ui-badge-success shrink-0">✓ Plano pronto</span>}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('convocatoria', game.id)}
              className="ui-btn ui-btn-soft mt-3 px-3 py-1.5 text-ui-caption"
            >
              Convocatória ({(game.callup || []).length} atletas)
            </button>
          </section>

          <div className="sticky top-0 z-20 -mx-2.5 bg-ui-bg/95 px-2.5 py-1 backdrop-blur sm:mx-0 sm:px-0">
            <SectionNav
              label="Partes do pré-jogo"
              fill
              sections={[
                { id: 'plano', label: 'Plano' },
                { id: 'adversario', label: 'Adversário' },
                { id: 'bolas', label: 'Bolas paradas', short: 'Bolas' }
              ]}
              active={section}
              onJump={(id) => {
                setSection(id);
                document.getElementById(`prejogo-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          </div>

          <div id="prejogo-plano" className="scroll-mt-16">
            <PreMatchForm key={game.id} game={game} state={state} onSave={saveGame} onShowToast={onShowToast} />
          </div>

          <section id="prejogo-adversario" aria-label="Adversário" className="scroll-mt-16 space-y-3">
            <h2 className="ui-kicker px-1">Adversário</h2>
            {!(state.matches || []).some(
              (m) => m.finished && m.opponent.trim().toLowerCase() === game.opponent.trim().toLowerCase()
            ) &&
              !(state.teams || [])
                .find((t) => t.id === state.activeTeamId)
                ?.opponentFiles?.some((f) => f.name.trim().toLowerCase() === game.opponent.trim().toLowerCase()) && (
                <p className="ui-inset p-3 text-ui-caption text-ui-muted">
                  Ainda não há jogos contra {game.opponent} nem ficha deste adversário. Aparecem aqui depois do primeiro
                  jogo.
                </p>
              )}
            <LastTimeAgainstCard matches={state.matches || []} roster={state.roster || []} opponent={game.opponent} />
            <OpponentFileCard
              files={(state.teams || []).find((t) => t.id === state.activeTeamId)?.opponentFiles}
              opponent={game.opponent}
            />
          </section>

          <section id="prejogo-bolas" aria-label="Bolas paradas da equipa" className="scroll-mt-16 space-y-3">
            <h2 className="ui-kicker px-1">Bolas paradas</h2>
            <SetPiecesCard
              state={state}
              callup={game.callup || []}
              onUpdateState={onUpdateState}
              onShowToast={onShowToast}
            />
          </section>
        </>
      )}
    </div>
  );
};

interface PreMatchFormProps {
  game: ScheduledMatch;
  state: AppState;
  onSave: (game: ScheduledMatch, message: string) => void;
  onShowToast: (msg: string) => void;
}

const PreMatchForm: React.FC<PreMatchFormProps> = ({ game, state, onSave, onShowToast }) => {
  const p = game.preMatchPlan || {};
  const [system, setSystem] = useState(p.system || '');
  const [objectives, setObjectives] = useState<string[]>(
    Array.from({ length: MAX_OBJECTIVES }, (_, i) => (p.objectives || [])[i] || '')
  );
  const [withBall, setWithBall] = useState(p.withBall || '');
  const [withoutBall, setWithoutBall] = useState(p.withoutBall || '');
  const [motto, setMotto] = useState(p.motto || '');
  const [notes, setNotes] = useState(p.notes || '');
  const [busy, setBusy] = useState(false);

  const plan = (): PreMatchPlan =>
    cleanPlan({ system, objectives, withBall, withoutBall, motto, notes }, state.currentUser?.name);
  const withPlan = (extra: Partial<ScheduledMatch> = {}): ScheduledMatch => {
    const next = plan();
    const copy: ScheduledMatch = { ...game, ...extra };
    if (hasPlan(next)) copy.preMatchPlan = next;
    else delete copy.preMatchPlan;
    return copy;
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const { generatePreMatchPlanPDF } = await import('../../lib/pdf/createPreMatchPlan');
      await generatePreMatchPlanPDF(withPlan(), state);
    } catch {
      onShowToast('Não foi possível gerar o PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Plano" className="ui-card space-y-3 p-4">
      <label className={`${label} text-ui-text`}>
        Sistema tático
        <input
          list="sistemas-fut7"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          placeholder="ex.: 2-3-1"
          className={`${field} mt-1`}
        />
        <datalist id="sistemas-fut7">
          {SEVEN_A_SIDE_SYSTEMS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>

      <fieldset className="space-y-1.5">
        <legend className={`${label} text-ui-text mb-1`}>Objetivos (até {MAX_OBJECTIVES})</legend>
        {objectives.map((o, i) => (
          <input
            key={i}
            value={o}
            onChange={(e) => setObjectives(objectives.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={`Objetivo ${i + 1}`}
            aria-label={`Objetivo ${i + 1}`}
            className={field}
          />
        ))}
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className={`${label} text-ui-text`}>
          Com bola
          <textarea
            value={withBall}
            onChange={(e) => setWithBall(e.target.value)}
            rows={3}
            placeholder="ex.: sair a jogar curto pelo guarda-redes, procurar as alas"
            className={`${field} mt-1`}
          />
        </label>
        <label className={`${label} text-ui-text`}>
          Sem bola
          <textarea
            value={withoutBall}
            onChange={(e) => setWithoutBall(e.target.value)}
            rows={3}
            placeholder="ex.: pressionar logo a saída de bola, equipa junta"
            className={`${field} mt-1`}
          />
        </label>
      </div>

      <label className={`${label} text-ui-text`}>
        Palavra de ordem
        <input
          value={motto}
          onChange={(e) => setMotto(e.target.value)}
          placeholder="ex.: Juntos até ao fim!"
          className={`${field} mt-1`}
        />
      </label>

      <label className={`${label} text-ui-text`}>
        Notas
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${field} mt-1`} />
      </label>

      {/* Save and share at the end of the plan (nothing fixed on the screen) */}
      <div className="grid grid-cols-2 gap-2 border-t border-ui-line pt-3">
        <button
          type="button"
          onClick={() => onSave(withPlan(), 'Pré-jogo guardado ✓')}
          className="ui-btn ui-btn-primary py-2.5"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() =>
            game.preMatchFinalized
              ? onSave(withPlan({ preMatchFinalized: false, preMatchFinalizedAt: undefined }), 'Plano reaberto')
              : onSave(withPlan({ preMatchFinalized: true, preMatchFinalizedAt: Date.now() }), 'Plano pronto ✓')
          }
          className="ui-btn ui-btn-success py-2.5"
        >
          {game.preMatchFinalized ? 'Reabrir plano' : '✓ Plano pronto'}
        </button>
        <button type="button" onClick={exportPdf} disabled={busy} className="ui-btn ui-btn-ghost py-2 text-ui-caption">
          {busy ? 'A gerar…' : 'PDF'}
        </button>
        <button
          type="button"
          onClick={() =>
            window.open(
              `https://api.whatsapp.com/send?text=${encodeURIComponent(buildPreMatchText(withPlan(), state))}`,
              '_blank'
            )
          }
          className="ui-btn ui-btn-ghost py-2 text-ui-caption"
        >
          WhatsApp
        </button>
      </div>
    </section>
  );
};
