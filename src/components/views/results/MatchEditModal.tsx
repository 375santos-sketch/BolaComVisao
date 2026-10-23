import React, { useMemo, useState } from 'react';
import { Match, MatchType, Player } from '../../../types';
import { STANDARD_GOAL_TYPES } from '../../../lib/gameAnalysis/constants';
import { getLineupSize } from '../../../lib/constants';
import { getNominalHalfDuration } from '../../../lib/matchPhaseUtils';
import { minutesBalance } from '../../../lib/matchChecklist';
import {
  applyDraft,
  GoalDraft,
  matchToDraft,
  MatchDraft,
  newGoalDraft,
  newSubDraft,
  SubDraft,
  SubHalf,
  validateDraft
} from '../../../lib/matchEditor';
import { playerLabel } from '../../../lib/utils';

interface MatchEditModalProps {
  match: Match;
  roster: Player[];
  category?: string;
  onSave: (match: Match) => void;
  onClose: () => void;
}

const input =
  'w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-cyan-400 outline-none';
const small = 'px-2 py-1 rounded-lg border text-[11px] font-bold';

/** Resultados → "Editar jogo": data, golos, substituições e titulares de um jogo terminado, num só ecrã. */
export const MatchEditModal: React.FC<MatchEditModalProps> = ({ match, roster, category, onSave, onClose }) => {
  const [draft, setDraft] = useState<MatchDraft>(() => matchToDraft(match, category));
  const [showErrors, setShowErrors] = useState(false);
  const lineupSize = getLineupSize(match);
  const halfMinutes = getNominalHalfDuration(match, category);

  // Athletes of the squad plus anyone the game already mentions (inactive since then)
  const players = useMemo(() => {
    const mentioned = new Set([
      ...(match.convocados || []),
      ...(match.lineup || []),
      ...(match.subs || []).flatMap((s) => [s.inId, s.outId])
    ]);
    return roster.filter((p) => p && (p.active !== false || mentioned.has(p.id)));
  }, [match, roster]);

  const errors = validateDraft(draft, halfMinutes);
  const balance = errors.length === 0 ? minutesBalance(applyDraft(match, draft, category), category) : null;

  const set = (patch: Partial<MatchDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setGoal = (id: string, patch: Partial<GoalDraft>) =>
    set({ goals: draft.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const setSub = (id: string, patch: Partial<SubDraft>) =>
    set({ subs: draft.subs.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const toggle = (key: 'lineup' | 'lineupSecondHalf', id: string) =>
    set({ [key]: draft[key].includes(id) ? draft[key].filter((x) => x !== id) : [...draft[key], id] });

  const minuteInput = (value: number | null, onChange: (v: number | null) => void, label: string) => (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      aria-label={label}
      className={`${input} w-16 shrink-0`}
      value={value ?? ''}
      placeholder="min"
      onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))))}
    />
  );

  const save = () => {
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    onSave(applyDraft(match, draft, category));
  };

  const scored = draft.goals.filter((g) => g.type === 'scored').length;
  const conceded = draft.goals.length - scored;
  const home = draft.location === 'casa';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Editar jogo"
        className="bg-slate-900 border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase tracking-wider">
            ✏️ Editar jogo
          </h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>

        <div className="text-center text-sm font-bold text-cyan-200 font-mono" aria-label="Resultado">
          {home
            ? `Nós ${scored} – ${conceded} ${draft.opponent || 'Adversário'}`
            : `${draft.opponent || 'Adversário'} ${conceded} – ${scored} Nós`}
        </div>

        {/* Dados do jogo */}
        <section aria-label="Dados do jogo" className="space-y-2">
          <h4 className="text-[11px] font-bold text-cyan-400 uppercase">Dados do jogo</h4>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-slate-400">
              Data
              <input type="date" className={input} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
            </label>
            <label className="text-[10px] text-slate-400">
              Adversário
              <input className={input} value={draft.opponent} onChange={(e) => set({ opponent: e.target.value })} />
            </label>
            <label className="text-[10px] text-slate-400">
              Tipo
              <select className={input} value={draft.type} onChange={(e) => set({ type: e.target.value as MatchType })}>
                <option value="campeonato">Campeonato</option>
                <option value="torneio">Torneio</option>
                <option value="amigavel">Amigável</option>
              </select>
            </label>
            <label className="text-[10px] text-slate-400">
              Fase / jornada
              <input className={input} value={draft.phase} onChange={(e) => set({ phase: e.target.value })} />
            </label>
          </div>
          <div className="flex items-center gap-2 text-xs" role="group" aria-label="Local do jogo">
            <span className="text-slate-400">Local:</span>
            {(['casa', 'fora'] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                aria-pressed={draft.location === loc}
                onClick={() => set({ location: loc })}
                className={`${small} ${draft.location === loc ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'border-slate-600 text-slate-400'}`}
              >
                {loc === 'casa' ? 'Casa' : 'Fora'}
              </button>
            ))}
          </div>
        </section>

        {/* Golos */}
        <section aria-label="Golos" className="space-y-2">
          <h4 className="text-[11px] font-bold text-cyan-400 uppercase">Golos</h4>
          {draft.goals.map((g, i) => (
            <div
              key={g.id}
              aria-label={`Golo ${i + 1}`}
              className={`p-2 rounded-xl border space-y-1.5 ${g.type === 'scored' ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-rose-500/30 bg-rose-950/20'}`}
            >
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Golo de"
                  className={`${input} flex-1 min-w-0`}
                  value={g.type}
                  onChange={(e) => setGoal(g.id, { type: e.target.value as GoalDraft['type'] })}
                >
                  <option value="scored">⚽ Nosso</option>
                  <option value="conceded">🔴 Sofrido</option>
                </select>
                <select
                  aria-label="Parte"
                  className={`${input} w-24 shrink-0`}
                  value={g.half}
                  onChange={(e) => setGoal(g.id, { half: Number(e.target.value) as 1 | 2 })}
                >
                  <option value={1}>1.ª p.</option>
                  <option value={2}>2.ª p.</option>
                </select>
                {minuteInput(g.minute, (minute) => setGoal(g.id, { minute }), 'Minuto do golo')}
                <button
                  type="button"
                  aria-label="Apagar golo"
                  onClick={() => set({ goals: draft.goals.filter((x) => x.id !== g.id) })}
                  className="ml-auto text-rose-400 text-sm px-1"
                >
                  🗑
                </button>
              </div>
              {g.type === 'scored' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    aria-label="Marcador"
                    className={input}
                    value={g.scorerId}
                    onChange={(e) => setGoal(g.id, { scorerId: e.target.value })}
                  >
                    <option value="">Sem marcador</option>
                    <option value="autogolo">Autogolo (adversário)</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {playerLabel(p)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Assistência"
                    className={input}
                    value={g.assistId}
                    disabled={g.scorerId === 'autogolo'}
                    onChange={(e) => setGoal(g.id, { assistId: e.target.value })}
                  >
                    <option value="">Sem assistência</option>
                    {players
                      .filter((p) => p.id !== g.scorerId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {playerLabel(p)}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <select
                aria-label="Origem"
                className={input}
                value={g.goalType}
                onChange={(e) => setGoal(g.id, { goalType: e.target.value })}
              >
                <option value="">Origem por indicar</option>
                {STANDARD_GOAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set({ goals: [...draft.goals, newGoalDraft('scored')] })}
              className={`${small} border-emerald-500/50 text-emerald-300`}
            >
              + Golo nosso
            </button>
            <button
              type="button"
              onClick={() => set({ goals: [...draft.goals, newGoalDraft('conceded')] })}
              className={`${small} border-rose-500/50 text-rose-300`}
            >
              + Golo sofrido
            </button>
          </div>
        </section>

        {/* Titulares */}
        {(['lineup', 'lineupSecondHalf'] as const).map((key) => (
          <section key={key} aria-label={key === 'lineup' ? 'Titulares da 1.ª parte' : 'Titulares da 2.ª parte'}>
            <h4 className="text-[11px] font-bold text-cyan-400 uppercase mb-1.5">
              {key === 'lineup' ? 'Titulares da 1.ª parte' : 'Titulares da 2.ª parte (opcional)'} ·{' '}
              <span className={draft[key].length === lineupSize ? 'text-emerald-300' : 'text-amber-300'}>
                {draft[key].length}/{lineupSize}
              </span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {players.map((p) => {
                const on = draft[key].includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(key, p.id)}
                    className={`${small} ${on ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100' : 'border-slate-700 text-slate-400'}`}
                  >
                    {playerLabel(p)}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Substituições */}
        <section aria-label="Substituições" className="space-y-2">
          <h4 className="text-[11px] font-bold text-cyan-400 uppercase">Substituições</h4>
          {draft.subs.map((s, i) => (
            <div
              key={s.id}
              aria-label={`Substituição ${i + 1}`}
              className="p-2 rounded-xl border border-slate-700 space-y-1.5"
            >
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Quando"
                  className={`${input} flex-1 min-w-0`}
                  value={String(s.half)}
                  onChange={(e) => {
                    const half = (e.target.value === 'INT' ? 'INT' : Number(e.target.value)) as SubHalf;
                    setSub(s.id, { half, ...(half === 'INT' ? { minute: null } : {}) });
                  }}
                >
                  <option value="1">1.ª parte</option>
                  <option value="INT">Intervalo</option>
                  <option value="2">2.ª parte</option>
                </select>
                {s.half !== 'INT' &&
                  minuteInput(s.minute, (minute) => setSub(s.id, { minute }), 'Minuto da substituição')}
                <button
                  type="button"
                  aria-label="Apagar substituição"
                  onClick={() => set({ subs: draft.subs.filter((x) => x.id !== s.id) })}
                  className="ml-auto text-rose-400 text-sm px-1"
                >
                  🗑
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['outId', 'inId'] as const).map((k) => (
                  <select
                    key={k}
                    aria-label={k === 'outId' ? 'Sai' : 'Entra'}
                    className={input}
                    value={s[k]}
                    onChange={(e) => setSub(s.id, { [k]: e.target.value })}
                  >
                    <option value="">{k === 'outId' ? 'Sai…' : 'Entra…'}</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {k === 'outId' ? '⬇ ' : '⬆ '}
                        {playerLabel(p)}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ subs: [...draft.subs, newSubDraft()] })}
            className={`${small} border-cyan-500/50 text-cyan-300`}
          >
            + Substituição
          </button>
        </section>

        {/* Minutes check and errors */}
        {balance && (
          <p
            aria-label="Minutos de jogo"
            className={`text-[11px] p-2 rounded-lg ${balance.ok ? 'bg-emerald-950/40 text-emerald-200' : 'bg-rose-950/40 text-rose-200'}`}
          >
            {balance.ok
              ? `✓ Minutos de jogo: ${balance.total}' = ${balance.lineupSize} x ${balance.gameMinutes}'`
              : `⚠️ Os minutos somam ${balance.total}' e deviam somar ${balance.expected}': confirme titulares e substituições.`}
          </p>
        )}
        {showErrors && errors.length > 0 && (
          <ul role="alert" className="text-[11px] text-rose-200 bg-rose-950/40 rounded-lg p-2 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase"
          >
            Guardar alterações
          </button>
        </div>
      </div>
    </div>
  );
};
