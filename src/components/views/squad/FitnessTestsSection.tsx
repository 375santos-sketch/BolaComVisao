import React, { useEffect, useRef, useState } from 'react';
import { AppState, Player } from '../../../types';
import {
  FITNESS_TESTS,
  FitnessTest,
  formatResult,
  parseResult,
  RoundId,
  roundKey,
  roundOf,
  ROUNDS,
  TestId,
  withResult
} from '../../../lib/fitnessTests';

interface FitnessTestsSectionProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
}

const COUNT_SECONDS = 30;

/** Stopwatch (tap at "Já!" and at the line) or 30-second count with a big +1 button, for one athlete. */
const TestTool: React.FC<{
  test: FitnessTest;
  player: Player;
  onSave: (value: number) => void;
  onClose: () => void;
}> = ({ test, player, onSave, onClose }) => {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const savedRef = useRef(false);
  const counting = test.tool === 'contagem';

  useEffect(() => {
    if (startedAt === null || result !== null) return;
    const id = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(id);
  }, [startedAt, result]);

  const elapsed =
    startedAt === null ? 0 : Math.max(0, ((result !== null ? startedAt + result * 1000 : now) - startedAt) / 1000);
  const left = Math.max(0, COUNT_SECONDS - elapsed);
  const timeUp = counting && startedAt !== null && left <= 0;

  useEffect(() => {
    if (timeUp && !savedRef.current) {
      savedRef.current = true;
      onSave(count);
    }
  }, [timeUp, count, onSave]);

  const start = () => {
    savedRef.current = false;
    setResult(null);
    setCount(0);
    const t = Date.now();
    setNow(t);
    setStartedAt(t);
  };

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Cronómetro do teste"
        className="ui-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 text-center space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-left">
          <div>
            <h3 className="text-base font-bold text-white">
              {test.emoji} {test.name}
            </h3>
            <p className="text-xs text-slate-400">{player.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar cronómetro"
            className="text-slate-400 text-lg px-1"
          >
            ✕
          </button>
        </div>

        {counting ? (
          <>
            <div className="text-[11px] font-bold tracking-wide text-slate-400">
              {startedAt === null ? 'PRONTO?' : 'FALTAM'}
            </div>
            <div className="text-6xl font-bold text-white font-['Chakra_Petch']" aria-live="polite">
              0:{String(Math.ceil(startedAt === null ? COUNT_SECONDS : left)).padStart(2, '0')}
            </div>
            {startedAt === null ? (
              <button type="button" onClick={start} className="ui-btn ui-btn-primary w-full py-4 text-base">
                ▶ Começar 30 segundos
              </button>
            ) : (
              <button
                type="button"
                disabled={timeUp}
                onClick={() => setCount((c) => c + 1)}
                aria-label="Mais um"
                className="mx-auto grid h-40 w-40 place-items-center rounded-full bg-emerald-600 text-5xl font-bold text-white font-['Chakra_Petch'] shadow-[0_0_0_10px_rgba(22,163,74,0.2)] active:scale-95 disabled:opacity-50"
              >
                +1
              </button>
            )}
            <div className="text-2xl font-bold text-white font-['Chakra_Petch']" aria-label="Contagem">
              {count} {test.id === 'toques30' ? 'toques' : 'passes'}
            </div>
            <p className="text-[11px] text-slate-400">
              {timeUp ? '✓ Guardado.' : 'Toque no botão verde a cada um. Aos 30 s para e grava sozinho.'}
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl font-bold text-white font-['Chakra_Petch']" aria-label="Tempo">
              {elapsed.toFixed(2).replace('.', ',')} s
            </div>
            {startedAt === null || result !== null ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={start} className="ui-btn ui-btn-secondary py-4 text-base">
                  {result !== null ? '↺ Repetir' : '▶ Partida'}
                </button>
                <button
                  type="button"
                  disabled={result === null || result < test.min}
                  onClick={() => result !== null && onSave(Math.round(result * 100) / 100)}
                  className="ui-btn ui-btn-primary py-4 text-base"
                >
                  ✓ Guardar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setResult((Date.now() - startedAt) / 1000)}
                className="ui-btn ui-btn-danger w-full py-6 text-xl"
              >
                ■ Chegou
              </button>
            )}
            {result !== null && result < test.min ? (
              <p role="alert" className="text-[11px] text-amber-300">
                Tempo demasiado curto para este teste: repita.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Toque em "Partida" ao "Já!" e em "Chegou" quando passa a linha.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/** Equipa → 📏 Testes: register the round's results, test by test, with the stopwatch or the 30-second count. */
const FitnessTestsSection: React.FC<FitnessTestsSectionProps> = ({ state, onUpdateState, onShowToast }) => {
  const season = state.season || '';
  const [round, setRound] = useState<RoundId>(() => roundOf(new Date()));
  const [testId, setTestId] = useState<TestId>('sprint20');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [tool, setTool] = useState<Player | null>(null);
  const test = FITNESS_TESTS.find((t) => t.id === testId)!;
  const key = roundKey(season, round);
  const earlier = ROUNDS.slice(
    0,
    ROUNDS.findIndex((r) => r.id === round)
  ).reverse();
  const players = (state.roster || [])
    .filter((p) => p && p.active !== false)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
  const done = players.filter((p) => p.fitnessTests?.[key]?.[testId] !== undefined).length;

  const save = (player: Player, value: number | null) => {
    onUpdateState({
      roster: (state.roster || []).map((p) => (p.id === player.id ? withResult(p, key, testId, value) : p))
    });
    setDrafts((d) => {
      const next = { ...d };
      delete next[player.id];
      return next;
    });
  };

  const commit = (player: Player) => {
    const text = drafts[player.id];
    if (text === undefined) return;
    if (!text.trim()) {
      save(player, null);
      return;
    }
    const value = parseResult(test, text);
    if (value === null) {
      onShowToast(
        `Valor fora do normal para ${test.name} (${test.min}–${test.max}${test.unit ? ` ${test.unit}` : ''}).`
      );
      return;
    }
    save(player, value);
  };

  return (
    <section aria-label="Testes" className="space-y-3">
      <div className="ui-card p-3.5 space-y-2.5">
        <div>
          <div className="text-[11px] font-bold text-slate-400">MOMENTO · ÉPOCA {season}</div>
          <div role="group" aria-label="Momento" className="mt-1.5 flex gap-1.5">
            {ROUNDS.map((r) => {
              const any = players.some((p) => p.fitnessTests?.[roundKey(season, r.id)]);
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={round === r.id}
                  onClick={() => setRound(r.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    round === r.id ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-slate-700 text-slate-300'
                  }`}
                >
                  {r.label}
                  {any ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-400">TESTE</div>
          <div role="group" aria-label="Teste" className="mt-1.5 flex flex-wrap gap-1.5">
            {FITNESS_TESTS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={testId === t.id}
                onClick={() => {
                  setTestId(t.id);
                  setDrafts({});
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  testId === t.id ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-slate-700 text-slate-300'
                }`}
              >
                {t.emoji} {t.name}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          {test.how} {test.lowerIsBetter ? 'Menos é melhor.' : 'Mais é melhor.'}
          {earlier.length ? ` À esquerda: ${earlier[0].label.toLowerCase()}.` : ''}
        </p>
      </div>

      <ul className="ui-card divide-y divide-slate-800" aria-label={`Resultados de ${test.name}`}>
        {players.map((p) => {
          const value = p.fitnessTests?.[key]?.[testId];
          const prevRound = earlier.find((r) => p.fitnessTests?.[roundKey(season, r.id)]?.[testId] !== undefined);
          const prev = prevRound ? p.fitnessTests![roundKey(season, prevRound.id)][testId] : undefined;
          const text = drafts[p.id] ?? (value !== undefined ? formatResult(test, value).replace(/ (s|cm)$/, '') : '');
          return (
            <li key={p.id} className="flex items-center gap-2.5 px-3 py-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-800 text-sm font-bold text-white font-['Chakra_Petch']">
                {p.number ?? '–'}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{p.name}</span>
              <span className="w-14 shrink-0 text-right text-[11px] text-slate-500">
                {prev !== undefined ? `${prevRound!.short} ${formatResult(test, prev).replace(/ (s|cm)$/, '')}` : ''}
              </span>
              <input
                inputMode="decimal"
                aria-label={`${test.name} de ${p.name}`}
                value={text}
                placeholder="—"
                onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                onBlur={() => commit(p)}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="ui-input w-20 shrink-0 text-center text-base font-bold"
              />
              {test.tool !== 'manual' && (
                <button
                  type="button"
                  onClick={() => setTool(p)}
                  aria-label={`Cronómetro para ${p.name}`}
                  className="ui-btn ui-btn-primary h-10 w-10 shrink-0 text-base"
                >
                  ⏱
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-400">
        {done} de {players.length} registados · Cada atleta vê só a sua evolução, na sua ficha. Nunca há rankings.
      </p>

      {tool && (
        <TestTool
          key={`${tool.id}-${testId}`}
          test={test}
          player={tool}
          onClose={() => setTool(null)}
          onSave={(value) => {
            save(tool, value);
            onShowToast(`${test.name} de ${tool.name}: ${formatResult(test, value)} ✓`);
            if (test.tool === 'cronometro') setTool(null);
          }}
        />
      )}
    </section>
  );
};

export default FitnessTestsSection;
