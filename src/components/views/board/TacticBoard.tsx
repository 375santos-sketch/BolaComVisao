import React, { useEffect, useRef, useState } from 'react';
import { AppState, TacticPlay } from '../../../types';
import {
  addStep,
  BOARD_FORMATS,
  BoardFormat,
  MAX_STEPS,
  movePiece,
  movesInto,
  newPlay,
  positionsAt,
  removeStep,
  STEP_SECONDS
} from '../../../lib/tacticBoard';
import { sortPlayerObjs } from '../../../lib/utils';

interface TacticBoardProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

// Pitch drawn upright, 68 × 105 (our goal at the bottom)
const W = 68;
const H = 105;
const sx = (x: number) => (x / 100) * W;
const sy = (y: number) => (y / 100) * H;

const input =
  'w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-cyan-400 outline-none';

/** 🧩 Quadro tático: plays in steps, dragged with the finger and animated. */
export const TacticBoard: React.FC<TacticBoardProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const plays = team?.tacticPlays || [];
  const teamFormat = BOARD_FORMATS.includes(team?.tacticFormat as BoardFormat)
    ? (team!.tacticFormat as BoardFormat)
    : 7;
  const players = sortPlayerObjs((state.roster || []).filter((p) => p && p.active !== false));

  const [play, setPlay] = useState<TacticPlay | null>(null);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [newFormat, setNewFormat] = useState<BoardFormat>(teamFormat);
  const [withOpp, setWithOpp] = useState(true);
  const [time, setTime] = useState<number | null>(null); // animation time (in steps) while playing
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    []
  );

  const save = (next: TacticPlay[]) => {
    if (!team) {
      onShowToast('Escolha primeiro uma equipa.');
      return;
    }
    onUpdateState({ teams: (state.teams || []).map((t) => (t.id === team.id ? { ...t, tacticPlays: next } : t)) });
  };

  const savePlay = () => {
    if (!play) return;
    const clean = { ...play, name: play.name.trim() || `Jogada ${plays.length + 1}` };
    const exists = plays.some((p) => p.id === clean.id);
    save(exists ? plays.map((p) => (p.id === clean.id ? clean : p)) : [...plays, clean]);
    setPlay(clean);
    onShowToast(`Jogada "${clean.name}" guardada ✓`);
  };

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setTime(null);
  };

  const animate = () => {
    if (!play || play.frames.length < 2) {
      onShowToast('Acrescente pelo menos um passo para ver a jogada a mexer.');
      return;
    }
    stop();
    const total = play.frames.length - 1;
    const started = performance.now();
    const tick = (now: number) => {
      const t = (now - started) / 1000 / STEP_SECONDS;
      if (t >= total) {
        setTime(null);
        setStep(total);
        raf.current = null;
        return;
      }
      setTime(t);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  // Finger position in pitch percent (the pitch keeps its shape, so it can have margins inside the drawing area)
  const toPercent = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 50, y: 50 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: (pt.x / W) * 100, y: (pt.y / H) * 100 };
  };

  // ---------- List of plays ----------
  if (!play) {
    return (
      <Shell onClose={onClose} title="🧩 Quadro tático">
        <section aria-label="Nova jogada" className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex gap-1.5">
            {BOARD_FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={newFormat === f}
                onClick={() => setNewFormat(f)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                  newFormat === f ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'border-slate-700 text-slate-300'
                }`}
              >
                {f}x{f}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input type="checkbox" checked={withOpp} onChange={(e) => setWithOpp(e.target.checked)} />
            Com adversários
          </label>
          <button
            type="button"
            onClick={() => {
              setPlay(newPlay(newFormat, withOpp));
              setStep(0);
              setSelected(null);
            }}
            className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase"
          >
            ➕ Nova jogada
          </button>
        </section>
        {plays.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Desenhe saídas de bola, pressão, cantos… em passos. Arraste os jogadores e a bola com o dedo em cada passo e
            carregue em ▶ para ver a jogada a mexer.
          </p>
        ) : (
          <ul aria-label="Jogadas guardadas" className="space-y-1.5">
            {plays.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800"
              >
                <button
                  type="button"
                  className="flex-1 text-left text-xs text-white font-bold truncate"
                  onClick={() => {
                    setPlay(p);
                    setStep(0);
                    setSelected(null);
                  }}
                >
                  {p.name}
                  <span className="ml-2 text-[10px] text-slate-400 font-normal">
                    {p.format}x{p.format} · {p.frames.length} passo(s)
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Apagar ${p.name}`}
                  className="text-rose-300 text-xs"
                  onClick={() => {
                    save(plays.filter((x) => x.id !== p.id));
                    onShowToast(`Jogada "${p.name}" apagada`);
                  }}
                >
                  Apagar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Shell>
    );
  }

  // ---------- Editor ----------
  const positions = time !== null ? positionsAt(play, time) : play.frames[step].positions;
  const arrows = time === null ? movesInto(play, step) : [];
  const sel = play.pieces.find((p) => p.id === selected);
  const frame = play.frames[step];

  return (
    <Shell onClose={onClose} title="🧩 Quadro tático">
      <input
        aria-label="Nome da jogada"
        className={input}
        value={play.name}
        placeholder="Nome da jogada (ex: Saída de bola curta)"
        onChange={(e) => setPlay({ ...play, name: e.target.value })}
      />

      <svg
        ref={svgRef}
        role="img"
        aria-label="Campo"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-h-[58dvh] rounded-2xl bg-emerald-800 select-none"
        style={{ touchAction: 'none' }}
        onPointerMove={(e) => {
          const id = dragging.current;
          if (!id || time !== null) return;
          const { x, y } = toPercent(e);
          setPlay((p) => (p ? movePiece(p, step, id, x, y) : p));
        }}
        onPointerUp={() => (dragging.current = null)}
        onPointerLeave={() => (dragging.current = null)}
      >
        <defs>
          <marker id="seta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#facc15" />
          </marker>
        </defs>
        {/* Pitch lines */}
        <g stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" fill="none">
          <rect x="1" y="1" width={W - 2} height={H - 2} />
          <line x1="1" y1={H / 2} x2={W - 1} y2={H / 2} />
          <circle cx={W / 2} cy={H / 2} r="7" />
          <rect x={W / 2 - 16} y="1" width="32" height="14" />
          <rect x={W / 2 - 16} y={H - 15} width="32" height="14" />
          <rect x={W / 2 - 6} y="1" width="12" height="5" />
          <rect x={W / 2 - 6} y={H - 6} width="12" height="5" />
        </g>
        {/* Movements of this step */}
        {arrows.map((a) => (
          <line
            key={a.id}
            x1={sx(a.from.x)}
            y1={sy(a.from.y)}
            x2={sx(a.to.x)}
            y2={sy(a.to.y)}
            stroke="#facc15"
            strokeWidth="0.6"
            strokeDasharray="1.5 1"
            markerEnd="url(#seta)"
          />
        ))}
        {play.pieces.map((piece) => {
          const pos = positions[piece.id];
          if (!pos) return null;
          const isBall = piece.kind === 'ball';
          const r = isBall ? 1.4 : 2.6;
          return (
            <g
              key={piece.id}
              role="button"
              aria-label={
                isBall ? 'Bola' : piece.kind === 'own' ? `Jogador ${piece.label}` : `Adversário ${piece.id.slice(3)}`
              }
              transform={`translate(${sx(pos.x)} ${sy(pos.y)})`}
              onPointerDown={(e) => {
                if (time !== null) return;
                e.stopPropagation();
                try {
                  (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId);
                } catch {
                  /* keeps working without capture */
                }
                dragging.current = piece.id;
                setSelected(piece.id);
              }}
              style={{ cursor: 'grab' }}
            >
              <circle
                r={r}
                fill={isBall ? '#ffffff' : piece.kind === 'own' ? '#0ea5e9' : '#e11d48'}
                stroke={selected === piece.id ? '#facc15' : isBall ? '#0f172a' : '#ffffff'}
                strokeWidth={selected === piece.id ? 0.8 : 0.4}
              />
              {!isBall && piece.label && (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="2.6"
                  fontWeight="bold"
                  fill="#ffffff"
                  pointerEvents="none"
                >
                  {piece.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Steps */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Passo anterior"
          disabled={step === 0 || time !== null}
          onClick={() => setStep(step - 1)}
          className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs disabled:opacity-30"
        >
          ◀
        </button>
        <div className="flex-1 text-center text-xs text-slate-200 font-bold">
          Passo {step + 1} de {play.frames.length}
        </div>
        <button
          type="button"
          aria-label="Passo seguinte"
          disabled={step >= play.frames.length - 1 || time !== null}
          onClick={() => setStep(step + 1)}
          className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs disabled:opacity-30"
        >
          ▶
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          disabled={play.frames.length >= MAX_STEPS || time !== null}
          onClick={() => {
            setPlay(addStep(play, step));
            setStep(step + 1);
          }}
          className="py-2 rounded-xl border border-cyan-500/50 text-cyan-200 text-[11px] font-bold disabled:opacity-30"
        >
          ➕ Passo
        </button>
        <button
          type="button"
          disabled={play.frames.length <= 1 || time !== null}
          onClick={() => {
            setPlay(removeStep(play, step));
            setStep(Math.max(0, step - 1));
          }}
          className="py-2 rounded-xl border border-rose-500/40 text-rose-300 text-[11px] font-bold disabled:opacity-30"
        >
          Apagar passo
        </button>
        <button
          type="button"
          onClick={() => (time !== null ? stop() : animate())}
          className="py-2 rounded-xl bg-amber-400 text-slate-950 text-[11px] font-black"
        >
          {time !== null ? '■ Parar' : '▶ Ver jogada'}
        </button>
      </div>

      <input
        aria-label="Nota deste passo"
        className={input}
        value={frame.note || ''}
        placeholder="Nota deste passo (ex: o 3 abre na linha)"
        onChange={(e) =>
          setPlay({
            ...play,
            frames: play.frames.map((f, i) => (i === step ? { ...f, note: e.target.value } : f))
          })
        }
      />

      {sel && sel.kind === 'own' && time === null && (
        <label className="block text-[11px] text-slate-400">
          Atleta no jogador {sel.label}
          <select
            className={input}
            value={sel.playerId || ''}
            onChange={(e) => {
              const p = players.find((x) => x.id === e.target.value);
              const label =
                p && p.number !== null && p.number !== undefined && `${p.number}` !== ''
                  ? String(p.number)
                  : sel.id.slice(3);
              setPlay({
                ...play,
                pieces: play.pieces.map((x) =>
                  x.id === sel.id ? { ...x, playerId: p ? p.id : null, label: p ? label : sel.id.slice(3) } : x
                )
              });
            }}
          >
            <option value="">— sem atleta —</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.number !== null && p.number !== undefined && `${p.number}` !== '' ? `${p.number} · ` : ''}
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            stop();
            setPlay(null);
          }}
          className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
        >
          ← Jogadas
        </button>
        <button
          type="button"
          onClick={savePlay}
          className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase"
        >
          Guardar jogada
        </button>
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children
}) => (
  <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-950/90 backdrop-blur-sm">
    <div
      role="dialog"
      aria-label="Quadro tático"
      className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl p-3.5 space-y-2.5 max-h-[96dvh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">{title}</h3>
        <button type="button" onClick={onClose} aria-label="Fechar quadro tático" className="text-slate-400 text-lg">
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);
