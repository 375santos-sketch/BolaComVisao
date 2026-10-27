import React, { useState } from 'react';
import { AppState, PreMatchPlan, ScheduledMatch } from '../../types';
import { Header } from '../Header';
import { LastTimeAgainstCard } from './results/LastTimeAgainstCard';
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
          <p className="text-sm text-slate-300">Não há jogos marcados na Agenda.</p>
          <button type="button" className="btn btn-outline" onClick={() => onNavigate('calendario')}>
            📅 Ir para a Agenda
          </button>
        </div>
      ) : (
        <>
          {games.length > 1 && (
            <label className={`${label} text-cyan-300`}>
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

          <section aria-label="Jogo" className="card p-4 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-black text-white">
                {state.myClubName || 'A nossa equipa'} vs {game.opponent}
              </h2>
              {game.preMatchFinalized && (
                <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-300 shrink-0">
                  ✓ Plano pronto
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              📅 {dateLabel(game.date)}
              {game.time ? ` às ${game.time}` : ''} · {game.location === 'fora' ? 'Fora' : 'Casa'}
              {game.venue ? ` · ${game.venue}` : ''}
            </p>
            <p className="text-xs text-slate-400">🏆 {competitionLabel(game)}</p>
            {(game.meetingTime || game.meetingPoint) && (
              <p className="text-xs text-slate-400">
                🕒 Concentração: {[game.meetingTime, game.meetingPoint].filter(Boolean).join(' · ')}
              </p>
            )}
            <button
              type="button"
              onClick={() => onNavigate('convocatoria', game.id)}
              className="text-xs text-cyan-300 underline underline-offset-2"
            >
              📋 Convocatória ({(game.callup || []).length} atletas)
            </button>
          </section>

          <LastTimeAgainstCard matches={state.matches || []} opponent={game.opponent} />

          <PreMatchForm key={game.id} game={game} state={state} onSave={saveGame} onShowToast={onShowToast} />

          <SetPiecesCard
            state={state}
            callup={game.callup || []}
            onUpdateState={onUpdateState}
            onShowToast={onShowToast}
          />
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
    <section aria-label="Plano" className="card p-4 space-y-3">
      <label className={`${label} text-slate-300`}>
        🧩 Sistema tático
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
        <legend className={`${label} text-amber-300 mb-1`}>🎯 Objetivos (até {MAX_OBJECTIVES})</legend>
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
        <label className={`${label} text-emerald-300`}>
          ⚽ Com bola
          <textarea
            value={withBall}
            onChange={(e) => setWithBall(e.target.value)}
            rows={3}
            placeholder="ex.: sair a jogar curto pelo guarda-redes, procurar as alas"
            className={`${field} mt-1`}
          />
        </label>
        <label className={`${label} text-rose-300`}>
          🛡️ Sem bola
          <textarea
            value={withoutBall}
            onChange={(e) => setWithoutBall(e.target.value)}
            rows={3}
            placeholder="ex.: pressionar logo a saída de bola, equipa junta"
            className={`${field} mt-1`}
          />
        </label>
      </div>

      <label className={`${label} text-orange-300`}>
        🔥 Palavra de ordem
        <input
          value={motto}
          onChange={(e) => setMotto(e.target.value)}
          placeholder="ex.: Juntos até ao fim!"
          className={`${field} mt-1`}
        />
      </label>

      <label className={`${label} text-slate-300`}>
        📝 Notas
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${field} mt-1`} />
      </label>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave(withPlan(), 'Pré-jogo guardado ✓')}
          className="ui-btn ui-btn-primary py-2.5 text-xs"
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
          className="ui-btn ui-btn-success py-2.5 text-xs"
        >
          {game.preMatchFinalized ? 'Reabrir plano' : '✓ Plano pronto'}
        </button>
        <button type="button" onClick={exportPdf} disabled={busy} className="ui-btn ui-btn-secondary py-2.5 text-xs">
          {busy ? 'A gerar…' : '📄 PDF'}
        </button>
        <button
          type="button"
          onClick={() =>
            window.open(
              `https://api.whatsapp.com/send?text=${encodeURIComponent(buildPreMatchText(withPlan(), state))}`,
              '_blank'
            )
          }
          className="ui-btn ui-btn-success py-2.5 text-xs"
        >
          💬 WhatsApp
        </button>
      </div>
    </section>
  );
};
