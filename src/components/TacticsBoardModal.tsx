import React, { useRef, useState } from 'react';
import { AppState, Player, TacticPlay } from '../types';
import { SYSTEM_OPTIONS, defaultSystem, shortName } from '../lib/startingLineup';
import {
  FORMATS,
  benchOf,
  boardFormatOf,
  copyOf,
  newBoard,
  withArrow,
  withAthlete,
  withExtra,
  withPosition,
  withSystem,
  withoutLastArrow,
  withoutPiece
} from '../lib/tacticsBoard';
import { localDateISO } from '../lib/trainingQuick';
import { sortPlayerObjs, uid } from '../lib/utils';

interface TacticsBoardModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

type Point = { x: number; y: number };
const H = 150; // the pitch is drawn 100 wide and 150 long (positions are percent of each side)

/** The pitch (our goal at the bottom), drawn with lines like the app's other pitches. */
const PitchLines: React.FC = () => (
  <g fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="0.5">
    <rect x="2" y="2" width="96" height={H - 4} rx="1" />
    <line x1="2" y1={H / 2} x2="98" y2={H / 2} />
    <circle cx="50" cy={H / 2} r="11" />
    <rect x="22" y="2" width="56" height="20" />
    <rect x="22" y={H - 22} width="56" height="20" />
    <rect x="38" y="2" width="24" height="7" />
    <rect x="38" y={H - 9} width="24" height="7" />
  </g>
);

/**
 * Mais → 🧠 Quadro tático: our team in a game system on the pitch. Drag each athlete where he should be, tap a place
 * to put an athlete in it, add opponents and the ball, draw the movements with arrows. Each board is a strategy kept
 * with a name; "Nova versão" makes a copy to change. Works with the finger (phone, tablet) and the mouse.
 */
const TacticsBoardModal: React.FC<TacticsBoardModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const saved: TacticPlay[] = team?.tacticPlays || state.tacticPlays || [];
  const format0 = boardFormatOf(team?.tacticFormat);
  const roster = sortPlayerObjs((state.roster || []).filter((p) => p && p.active !== false));
  const [board, setBoard] = useState<TacticPlay>(
    () => saved[0] || newBoard(uid(), 'Estratégia 1', format0, defaultSystem(format0), localDateISO())
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [dirty, setDirty] = useState(!saved[0]);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; moved: boolean; from: Point } | null>(null);
  const arrowStart = useRef<Point | null>(null);
  const [preview, setPreview] = useState<{ a: Point; b: Point } | null>(null);

  const frame = board.frames[0] || { positions: {}, arrows: [] };
  const change = (next: TacticPlay) => {
    setBoard(next);
    setDirty(true);
  };
  const pct = (e: React.PointerEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  const playerOf = (id?: string | null) => roster.find((p) => p.id === id);

  const persist = (list: TacticPlay[]) =>
    onUpdateState({
      tacticPlays: list,
      teams: (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, tacticPlays: list } : t))
    });
  const save = () => {
    const name = board.name.trim() || 'Estratégia';
    const next = { ...board, name };
    setBoard(next);
    persist(saved.some((b) => b.id === next.id) ? saved.map((b) => (b.id === next.id ? next : b)) : [...saved, next]);
    setDirty(false);
    onShowToast(`"${name}" guardada ✓`);
  };
  const open = (b: TacticPlay) => {
    if (dirty && !window.confirm('Há alterações por guardar. Abrir outra estratégia mesmo assim?')) return;
    setBoard(b);
    setSelected(null);
    setDirty(false);
  };
  const startNew = (format = board.format) => {
    if (dirty && !window.confirm('Há alterações por guardar. Começar outra estratégia mesmo assim?')) return;
    setBoard(newBoard(uid(), `Estratégia ${saved.length + 1}`, format, defaultSystem(format), localDateISO()));
    setSelected(null);
    setDirty(true);
  };
  const remove = () => {
    if (!saved.some((b) => b.id === board.id)) return startNew();
    if (!window.confirm(`Apagar a estratégia "${board.name}"?`)) return;
    const list = saved.filter((b) => b.id !== board.id);
    persist(list);
    setBoard(list[0] || newBoard(uid(), 'Estratégia 1', format0, defaultSystem(format0), localDateISO()));
    setDirty(!list[0]);
    onShowToast('Estratégia apagada');
  };

  const selectedPiece = board.pieces.find((p) => p.id === selected);
  const ownIndex = (id: string) => board.pieces.filter((p) => p.kind === 'own').findIndex((p) => p.id === id);
  const bench = benchOf(board, roster);
  const systems = SYSTEM_OPTIONS[board.format] || [defaultSystem(board.format)];

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3">
      <div
        role="dialog"
        aria-label="Quadro tático"
        className="ui-card w-full max-w-3xl rounded-t-3xl sm:rounded-2xl p-3 sm:p-4 space-y-3 max-h-[96dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-ui-text">🧠 Quadro tático</h3>
          <button type="button" onClick={onClose} aria-label="Fechar quadro tático" className="text-ui-muted text-lg">
            ✕
          </button>
        </div>

        {/* Strategies */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            aria-label="Estratégias guardadas"
            value={saved.some((b) => b.id === board.id) ? board.id : ''}
            onChange={(e) => {
              const b = saved.find((x) => x.id === e.target.value);
              if (b) open(b);
            }}
            className="ui-input w-auto flex-1 text-xs"
          >
            {!saved.some((b) => b.id === board.id) && <option value="">(nova, por guardar)</option>}
            {saved.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => startNew()} className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs">
            + Nova
          </button>
          <button
            type="button"
            onClick={() => {
              setBoard(copyOf(board, uid(), localDateISO()));
              setDirty(true);
              onShowToast('Nova versão: mude o que quiser e guarde');
            }}
            className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs"
          >
            Nova versão
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            aria-label="Nome da estratégia"
            value={board.name}
            maxLength={60}
            onChange={(e) => change({ ...board, name: e.target.value })}
            className="ui-input min-w-0 basis-full sm:basis-0 flex-1 text-sm font-bold"
          />
          <select
            aria-label="Formato"
            value={board.format}
            onChange={(e) => startNew(Number(e.target.value) as TacticPlay['format'])}
            className="ui-input w-auto text-xs"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                Futebol {f}
              </option>
            ))}
          </select>
          <select
            aria-label="Sistema"
            value={board.system || ''}
            onChange={(e) => change(withSystem(board, e.target.value))}
            className="ui-input w-auto text-xs"
          >
            {!board.system && <option value="">Sistema</option>}
            {systems.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
          {/* The pitch */}
          <div>
            <svg
              ref={svgRef}
              viewBox={`0 0 100 ${H}`}
              role="img"
              aria-label={`Campo: ${board.name}${board.system ? ` em ${board.system}` : ''}`}
              className="w-full max-h-[62dvh] touch-none select-none rounded-xl bg-emerald-800"
              // The app's icons ignore touches (index.css); the pitch is the board, so it takes them
              style={{ aspectRatio: `100 / ${H}`, pointerEvents: 'auto' }}
              onPointerDown={(e) => {
                if (!drawing) return;
                arrowStart.current = pct(e);
                (e.target as Element).setPointerCapture?.(e.pointerId);
              }}
              onPointerMove={(e) => {
                const p = pct(e);
                if (drag.current) {
                  // A finger never stays still: only a real movement is a drag (a tap chooses the place)
                  const d = drag.current;
                  if (!d.moved && Math.hypot(p.x - d.from.x, p.y - d.from.y) < 2.5) return;
                  d.moved = true;
                  setBoard((b) => withPosition(b, d.id, p.x, p.y));
                } else if (arrowStart.current) setPreview({ a: arrowStart.current, b: p });
              }}
              onPointerUp={(e) => {
                if (drag.current) {
                  const { id, moved } = drag.current;
                  drag.current = null;
                  if (moved) setDirty(true);
                  else setSelected(id === selected ? null : id);
                } else if (arrowStart.current) {
                  const end = pct(e);
                  change(
                    withArrow(board, { x1: arrowStart.current.x, y1: arrowStart.current.y, x2: end.x, y2: end.y })
                  );
                  arrowStart.current = null;
                  setPreview(null);
                }
              }}
            >
              <defs>
                <marker id="seta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="#fde047" />
                </marker>
              </defs>
              {/* Stripes of the grass */}
              {Array.from({ length: 10 }, (_, i) => (
                <rect key={i} x="0" y={(i * H) / 10} width="100" height={H / 20} fill="rgb(255 255 255 / 0.04)" />
              ))}
              <PitchLines />
              {[
                ...(frame.arrows || []),
                ...(preview ? [{ x1: preview.a.x, y1: preview.a.y, x2: preview.b.x, y2: preview.b.y }] : [])
              ].map((a, i) => (
                <line
                  key={i}
                  x1={a.x1}
                  y1={(a.y1 * H) / 100}
                  x2={a.x2}
                  y2={(a.y2 * H) / 100}
                  stroke="#fde047"
                  strokeWidth="0.9"
                  strokeDasharray="2 1.2"
                  markerEnd="url(#seta)"
                />
              ))}
              {board.pieces.map((p) => {
                const at = frame.positions[p.id];
                if (!at) return null;
                const player = playerOf(p.playerId);
                const fill =
                  p.kind === 'own' ? (player ? '#22c3ee' : '#0b1220') : p.kind === 'opp' ? '#ef4444' : '#ffffff';
                const label =
                  p.kind === 'own'
                    ? `Lugar ${ownIndex(p.id) + 1}: ${player ? player.name : 'vazio'}`
                    : p.kind === 'opp'
                      ? `Adversário ${p.label}`
                      : 'Bola';
                return (
                  <g
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-pressed={selected === p.id}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected(p.id === selected ? null : p.id);
                      }
                    }}
                    transform={`translate(${at.x} ${(at.y * H) / 100})`}
                    style={{ cursor: drawing ? 'crosshair' : 'grab' }}
                    onPointerDown={(e) => {
                      if (drawing) return;
                      e.stopPropagation();
                      drag.current = { id: p.id, moved: false, from: pct(e) };
                      svgRef.current?.setPointerCapture?.(e.pointerId);
                    }}
                  >
                    <circle
                      r={p.kind === 'ball' ? 2.2 : 4.2}
                      fill={fill}
                      stroke={selected === p.id ? '#fde047' : p.kind === 'own' && !player ? '#22c3ee' : '#0b1220'}
                      strokeWidth={selected === p.id ? 1 : 0.6}
                      strokeDasharray={p.kind === 'own' && !player ? '1.2 0.8' : undefined}
                    />
                    {p.kind !== 'ball' && (
                      <text
                        textAnchor="middle"
                        dy="1.4"
                        fontSize="3.6"
                        fontWeight="800"
                        fill={p.kind === 'own' && player ? '#04202b' : '#ffffff'}
                      >
                        {p.label}
                      </text>
                    )}
                    {player && (
                      <text textAnchor="middle" y={at.y > 88 ? -5.6 : 8.2} fontSize="3" fontWeight="700" fill="#ffffff">
                        {shortName(player)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={drawing}
                onClick={() => setDrawing(!drawing)}
                className={`ui-btn px-2.5 py-1.5 text-xs ${drawing ? 'ui-btn-warning' : 'ui-btn-secondary'}`}
              >
                ✏️ {drawing ? 'A desenhar setas' : 'Desenhar setas'}
              </button>
              <button
                type="button"
                disabled={!(frame.arrows || []).length}
                onClick={() => change(withoutLastArrow(board))}
                className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs"
              >
                ↩︎ Apagar última seta
              </button>
              <button
                type="button"
                onClick={() => change(withExtra(board, 'opp', uid()))}
                className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs"
              >
                + Adversário
              </button>
              <button
                type="button"
                onClick={() => change(withExtra(board, 'ball', uid()))}
                className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs"
              >
                + Bola
              </button>
            </div>
            <p className="mt-1 text-[11px] text-ui-muted">
              {drawing
                ? 'Arraste no campo para desenhar o movimento.'
                : 'Arraste as peças. Toque num lugar para escolher o atleta.'}
            </p>
          </div>

          {/* Who plays where, and the bench */}
          <div className="space-y-2">
            {selectedPiece?.kind === 'own' ? (
              <section aria-label="Escolher atleta" className="ui-inset space-y-1 p-2">
                <div className="ui-kicker">Lugar {ownIndex(selectedPiece.id) + 1}</div>
                <button
                  type="button"
                  onClick={() => change(withAthlete(board, selectedPiece.id, null, ownIndex(selectedPiece.id)))}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-ui-muted hover:bg-ui-surface-2"
                >
                  — Deixar vazio
                </button>
                {[...(playerOf(selectedPiece.playerId) ? [playerOf(selectedPiece.playerId)!] : []), ...bench].map(
                  (p: Player) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        change(withAthlete(board, selectedPiece.id, p, ownIndex(selectedPiece.id)));
                        setSelected(null);
                      }}
                      className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ui-surface-2 ${
                        p.id === selectedPiece.playerId ? 'font-bold text-ui-brand' : 'text-ui-text'
                      }`}
                    >
                      {p.number != null ? `${p.number} · ` : ''}
                      {p.name}
                    </button>
                  )
                )}
              </section>
            ) : selectedPiece ? (
              <div className="ui-inset p-2">
                <button
                  type="button"
                  onClick={() => {
                    change(withoutPiece(board, selectedPiece.id));
                    setSelected(null);
                  }}
                  className="ui-btn ui-btn-soft-danger w-full py-1.5 text-xs"
                >
                  Retirar {selectedPiece.kind === 'ball' ? 'a bola' : 'este adversário'}
                </button>
              </div>
            ) : null}
            <section aria-label="Suplentes" className="ui-inset p-2">
              <div className="ui-kicker mb-1">Suplentes ({bench.length})</div>
              <p className="text-xs leading-relaxed text-ui-text">
                {bench.length ? bench.map((p) => shortName(p)).join(' · ') : 'Todos estão no campo.'}
              </p>
            </section>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={save} className="ui-btn ui-btn-primary flex-1 py-2.5 text-sm">
            {dirty ? 'Guardar estratégia' : 'Guardada ✓'}
          </button>
          <button type="button" onClick={remove} className="ui-btn ui-btn-soft-danger px-3 py-2.5 text-xs">
            Apagar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TacticsBoardModal;
