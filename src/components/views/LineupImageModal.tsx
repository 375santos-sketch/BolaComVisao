import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Player, ScheduledMatch } from '../../types';
import { LINEUP_SIZE } from '../../lib/constants';
import { sortPlayerObjs } from '../../lib/utils';
import {
  arrangeStarters,
  defaultSystem,
  positionGroup,
  shortName,
  slotPositions,
  swapSlots,
  SYSTEM_OPTIONS,
  systemLines
} from '../../lib/startingLineup';
import { drawLineupCard, LINEUP_CARD_SIZE } from '../../lib/lineupCard';
import { loadDataImage, shareCanvasImage } from '../../lib/shareImage';

interface LineupImageModalProps {
  game: ScheduledMatch;
  state: AppState;
  onSave: (game: ScheduledMatch) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const SIZES = [5, 7, 8, 9, 11];
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const numberOf = (p?: Player) =>
  p && p.number !== null && p.number !== undefined && `${p.number}` !== '' ? String(p.number) : undefined;

/** Convocatória → 🖼️ Equipa inicial: pick the starters and the system, then share the picture of the pitch. */
export const LineupImageModal: React.FC<LineupImageModalProps> = ({ game, state, onSave, onShowToast, onClose }) => {
  const called = useMemo(
    () => sortPlayerObjs((state.roster || []).filter((p) => (game.callup || []).includes(p.id))),
    [state.roster, game.callup]
  );
  const byId = useMemo(() => new Map(called.map((p) => [p.id, p])), [called]);
  const saved = game.startingLineup;
  const [size, setSize] = useState(saved?.slots.length || LINEUP_SIZE);
  const [system, setSystem] = useState(saved?.system || game.preMatchPlan?.system?.trim() || defaultSystem(size));
  const [starters, setStarters] = useState<string[]>(() => {
    const kept = (saved?.slots || []).filter((id): id is string => Boolean(id && byId.has(id)));
    if (kept.length) return kept;
    const gk = called.find((p) => positionGroup(p.positions) === 'gr');
    return [...(gk ? [gk] : []), ...called.filter((p) => p !== gk)].slice(0, size).map((p) => p.id);
  });
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    saved && saved.slots.length === size && saved.slots.every((id) => !id || byId.has(id))
      ? saved.slots
      : arrangeStarters(starters.map((id) => byId.get(id)!).filter(Boolean), system, size)
  );
  const [captainId, setCaptainId] = useState(saved?.captainId || '');
  const [picked, setPicked] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lines = systemLines(system, size);
  const positions = slotPositions(lines);

  const rearrange = (nextStarters: string[], nextSystem: string, nextSize: number) => {
    setSlots(arrangeStarters(nextStarters.map((id) => byId.get(id)!).filter(Boolean), nextSystem, nextSize));
    setPicked(null);
  };

  const toggleStarter = (id: string) => {
    let next: string[];
    if (starters.includes(id)) next = starters.filter((x) => x !== id);
    else if (starters.length >= size) {
      onShowToast(`Já tem ${size} titulares. Tire um primeiro.`);
      return;
    } else next = [...starters, id];
    setStarters(next);
    if (captainId && !next.includes(captainId)) setCaptainId('');
    rearrange(next, system, size);
  };

  const changeSize = (n: number) => {
    const nextSystem = defaultSystem(n);
    const next = starters.slice(0, n);
    setSize(n);
    setSystem(nextSystem);
    setStarters(next);
    rearrange(next, nextSystem, n);
  };

  const tapSlot = (i: number) => {
    if (picked === null) setPicked(i);
    else {
      if (picked !== i) setSlots(swapSlots(slots, picked, i));
      setPicked(null);
    }
  };

  const clubName = state.myClubName || 'A nossa equipa';
  const home = game.location !== 'fora';
  const gameLine = home ? `${clubName} vs ${game.opponent}` : `${game.opponent} vs ${clubName}`;
  const date = new Date(`${game.date}T12:00:00`);
  const details = [
    `${WEEKDAYS[date.getDay()] || ''}, ${game.date.slice(8, 10)}/${game.date.slice(5, 7)}`,
    game.time,
    game.venue,
    `Sistema ${lines.join('-')}`
  ]
    .filter(Boolean)
    .join(' · ');
  const subs = called.filter((p) => !slots.includes(p.id));
  const fileName = `Equipa_inicial_${game.opponent.replace(/[^a-zA-Z0-9]/g, '_')}_${game.date}.png`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const logo = await loadDataImage(state.clubLogoUrl);
      if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
      const ctx = canvasRef.current?.getContext('2d');
      if (cancelled || !ctx) return;
      drawLineupCard(ctx, {
        clubName,
        category: state.category,
        game: gameLine,
        details,
        starters: slots.flatMap((id, i) => {
          const p = id ? byId.get(id) : undefined;
          const pos = positions[i];
          if (!p || !pos) return [];
          return [
            {
              number: numberOf(p),
              name: shortName(p),
              x: pos.x,
              y: pos.y,
              goalkeeper: i === 0,
              captain: p.id === captainId
            }
          ];
        }),
        subs: subs.map((p) => ({ number: numberOf(p), name: shortName(p) })),
        extras: [
          ...(game.meetingTime ? ([['Concentração', game.meetingTime]] as [string, string][]) : []),
          ...(game.meetingPoint ? ([['Encontro', game.meetingPoint]] as [string, string][]) : [])
        ],
        logo
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [slots, captainId, details, gameLine, clubName, subs, positions, byId, game, state.category, state.clubLogoUrl]);

  const save = () => {
    onSave({ ...game, startingLineup: { system: lines.join('-'), slots, captainId: captainId || undefined } });
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    save();
    const result = await shareCanvasImage(canvas, fileName, `Equipa inicial: ${gameLine}`);
    if (result === 'error') onShowToast('Não foi possível criar a imagem.');
    if (result === 'downloaded') onShowToast('Imagem descarregada 📥');
  };

  const placeLabel = (i: number) => {
    if (i === 0) return 'GR';
    let k = i - 1;
    for (let li = 0; li < lines.length; li++) {
      if (k < lines[li]) return li === 0 ? 'Def' : li === lines.length - 1 && lines.length > 1 ? 'Ava' : 'Méd';
      k -= lines[li];
    }
    return '';
  };

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Equipa inicial"
        className="ui-card w-full max-w-md rounded-b-none sm:rounded-2xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">🖼️ Equipa inicial</h3>
          <button type="button" onClick={onClose} aria-label="Fechar equipa inicial" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>

        {called.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Convoque primeiro os atletas para este jogo.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-slate-400">
                Jogadores em campo
                <select
                  aria-label="Jogadores em campo"
                  className="ui-input mt-1 text-xs"
                  value={size}
                  onChange={(e) => changeSize(Number(e.target.value))}
                >
                  {SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-slate-400">
                Sistema
                <select
                  aria-label="Sistema"
                  className="ui-input mt-1 text-xs"
                  value={lines.join('-')}
                  onChange={(e) => {
                    setSystem(e.target.value);
                    rearrange(starters, e.target.value, size);
                  }}
                >
                  {Array.from(new Set([lines.join('-'), ...(SYSTEM_OPTIONS[size] || [])])).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 mb-1">
                Titulares ({starters.length}/{size}): toque para escolher
              </div>
              <div role="group" aria-label="Titulares" className="flex flex-wrap gap-1.5">
                {called.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={starters.includes(p.id)}
                    onClick={() => toggleStarter(p.id)}
                    className={`ui-btn px-2 py-1 text-[11px] ${starters.includes(p.id) ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                  >
                    {numberOf(p) ? `${numberOf(p)} · ` : ''}
                    {shortName(p)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 mb-1">
                Lugares no campo: toque num jogador e depois noutro para os trocar
              </div>
              <div role="group" aria-label="Lugares no campo" className="grid grid-cols-2 gap-1.5">
                {slots.map((id, i) => {
                  const p = id ? byId.get(id) : undefined;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={picked === i}
                      onClick={() => tapSlot(i)}
                      className={`ui-btn justify-start px-2 py-1.5 text-[11px] ${picked === i ? 'ui-btn-warning' : 'ui-btn-secondary'}`}
                    >
                      <span className="text-slate-400 w-7 shrink-0 text-left">{placeLabel(i)}</span>
                      <span className="truncate">
                        {p ? `${numberOf(p) ? `${numberOf(p)} ` : ''}${shortName(p)}` : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block text-[11px] text-slate-400">
              Capitão
              <select
                aria-label="Capitão"
                className="ui-input mt-1 text-xs"
                value={captainId}
                onChange={(e) => setCaptainId(e.target.value)}
              >
                <option value="">Sem capitão</option>
                {starters.map((id) => (
                  <option key={id} value={id}>
                    {byId.get(id)?.name}
                  </option>
                ))}
              </select>
            </label>

            <canvas
              ref={canvasRef}
              width={LINEUP_CARD_SIZE.width}
              height={LINEUP_CARD_SIZE.height}
              role="img"
              aria-label="Imagem da equipa inicial"
              className="w-full rounded-2xl border border-slate-800"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  save();
                  onShowToast('Equipa inicial guardada ✓ (entra como titulares ao iniciar o jogo)');
                }}
                className="ui-btn ui-btn-secondary py-2.5 text-xs"
              >
                Guardar
              </button>
              <button type="button" onClick={share} className="ui-btn ui-btn-primary py-2.5 text-xs">
                📲 Partilhar imagem
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
