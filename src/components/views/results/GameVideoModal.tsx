import React, { useMemo, useState } from 'react';
import { AppState, Match, MatchVideo } from '../../../types';
import {
  formatVideoTime,
  goalsMessage,
  LEAD_SECONDS,
  parseVideoTime,
  VideoEvent,
  VideoEventKind,
  videoEvents,
  youtubeIdOf
} from '../../../lib/gameVideo';
import { embedUrl, useYouTubeFrame } from '../../../lib/youtubeFrame';

interface GameVideoModalProps {
  match: Match;
  state: AppState;
  onSave: (match: Match) => void;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

type Filter = 'todos' | 'golo' | 'sofrido' | 'sub' | 'cartao' | `p:${string}`;

const KIND_ICON = { golo: '⚽', sofrido: '🥅', sub: '🔁', cartao: '' };
/** How long "Ver os golos seguidos" shows each goal before jumping to the next one. */
const CLIP_SECONDS = 25;

/** 🎥 Vídeo do jogo: link the YouTube video once, then every event of the Modo Jogo jumps to its moment. */
const GameVideoModal: React.FC<GameVideoModalProps> = ({ match, state, onSave, onClose, onShowToast }) => {
  const saved = match.video;
  const [editing, setEditing] = useState(!saved);
  const [link, setLink] = useState(saved ? `https://youtu.be/${saved.youtubeId}` : '');
  const [half1, setHalf1] = useState(saved ? formatVideoTime(saved.half1At) : '');
  const [half2, setHalf2] = useState(saved?.half2At !== undefined ? formatVideoTime(saved.half2At) : '');
  const [filter, setFilter] = useState<Filter>('todos');
  const [current, setCurrent] = useState<string | null>(null);
  const [queue, setQueue] = useState<VideoEvent[]>([]);
  const [withNames, setWithNames] = useState(false);
  // "Ver os golos seguidos": each goal for a few seconds, then the next one
  const onTick = (time: number, ended: boolean, controls: { seek: (s: number) => void; pause: () => void }) => {
    if (queue.length === 0) return;
    const now = queue[0];
    if (!ended && time < now.at + LEAD_SECONDS + CLIP_SECONDS - 10) return;
    const rest = queue.slice(1);
    setQueue(rest);
    if (rest.length) {
      setCurrent(rest[0].id);
      controls.seek(rest[0].at);
    } else controls.pause();
  };
  const { frameRef, listen, ready, time, seek } = useYouTubeFrame(onTick);

  const youtubeId = youtubeIdOf(link);
  const video: MatchVideo | null = saved && !editing ? saved : null;
  const roster = useMemo(() => state.roster || [], [state.roster]);
  const events = useMemo(
    () => (video ? videoEvents(match, video, roster, state.category) : []),
    [match, video, roster, state.category]
  );
  const shown = events.filter((e) =>
    filter === 'todos' ? true : filter.startsWith('p:') ? e.playerIds.includes(filter.slice(2)) : e.kind === filter
  );
  const people = roster.filter((p) => events.some((e) => e.playerIds.includes(p.id)));
  const count = (kind: VideoEventKind) => events.filter((e) => e.kind === kind).length;

  const play = (e: VideoEvent) => {
    setQueue([]);
    setCurrent(e.id);
    seek(e.at);
  };

  const save = () => {
    if (!youtubeId) {
      onShowToast?.('Cole o link do vídeo do YouTube.');
      return;
    }
    const h1 = parseVideoTime(half1);
    if (h1 === null) {
      onShowToast?.('Indique em que momento do vídeo começa a 1.ª parte (ex.: 2:15).');
      return;
    }
    const h2 = half2.trim() ? parseVideoTime(half2) : null;
    if (half2.trim() && h2 === null) {
      onShowToast?.('O início da 2.ª parte não está certo (ex.: 33:40).');
      return;
    }
    const next: MatchVideo = {
      youtubeId,
      half1At: h1,
      ...(h2 !== null ? { half2At: h2 } : {}),
      ...(saved?.youtubeId === youtubeId && saved.nudges ? { nudges: saved.nudges } : {})
    };
    onSave({ ...match, video: next });
    setEditing(false);
    onShowToast?.('Vídeo ligado ao jogo ✓');
  };

  const nudge = (e: VideoEvent, delta: number) => {
    if (!saved) return;
    const nudges = { ...(saved.nudges || {}), [e.id]: (saved.nudges?.[e.id] || 0) + delta };
    onSave({ ...match, video: { ...saved, nudges } });
    seek(Math.max(0, e.at + delta));
  };

  const copyGoals = async () => {
    if (!video) return;
    const text = goalsMessage(match, video, events, state.myClubName || 'Nós', withNames);
    try {
      await navigator.clipboard.writeText(text);
      onShowToast?.('Mensagem com os golos copiada ✓');
    } catch {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const currentEvent = events.find((e) => e.id === current);
  const frameId = editing ? youtubeId : video?.youtubeId;

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Vídeo do jogo"
        className="ui-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[96dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div>
            <h3 className="text-base font-bold text-white">🎥 Vídeo do jogo</h3>
            <p className="text-xs text-slate-400">
              vs {match.opponent} · {match.date.slice(0, 10).split('-').reverse().join('/')}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar vídeo" className="text-slate-400 text-lg px-1">
            ✕
          </button>
        </div>

        {frameId && (
          <div className="relative w-full bg-black" style={{ aspectRatio: '16 / 9' }}>
            <iframe
              key={frameId}
              ref={frameRef}
              src={embedUrl(frameId, editing ? 0 : events[0]?.at || 0)}
              title="Vídeo do jogo"
              onLoad={listen}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
            {currentEvent && (
              <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-bold text-white">
                {KIND_ICON[currentEvent.kind]} {currentEvent.minute} · {currentEvent.title}
              </span>
            )}
          </div>
        )}

        {editing ? (
          <div className="space-y-3 p-4">
            <p className="text-xs text-slate-300">
              <b>1.</b> Filme o jogo e ponha o vídeo no YouTube como <b>"não listado"</b> (só vê quem tem o link).
            </p>
            <label className="block text-[11px] font-bold text-slate-400">
              LINK DO VÍDEO
              <input
                className="ui-input mt-1 w-full text-sm"
                value={link}
                placeholder="https://youtu.be/…"
                onChange={(e) => setLink(e.target.value)}
              />
            </label>
            {link.trim() && !youtubeId && (
              <p className="text-[11px] text-amber-300">Este link não é de um vídeo do YouTube.</p>
            )}
            <p className="text-xs text-slate-300">
              <b>2.</b> No vídeo, pare no apito inicial de cada parte e toque em "Usar este momento" (ou escreva o
              tempo).
            </p>
            {(
              [
                ['INÍCIO DA 1.ª PARTE NO VÍDEO', half1, setHalf1, 'Início da 1.ª parte no vídeo'],
                ['INÍCIO DA 2.ª PARTE NO VÍDEO (opcional)', half2, setHalf2, 'Início da 2.ª parte no vídeo']
              ] as const
            ).map(([label, value, set, aria]) => (
              <div key={label}>
                <div className="text-[11px] font-bold text-slate-400">{label}</div>
                <div className="mt-1 flex gap-2">
                  <input
                    className="ui-input w-28 text-base font-bold"
                    value={value}
                    placeholder="0:00"
                    inputMode="numeric"
                    aria-label={aria}
                    onChange={(e) => set(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!youtubeId || !ready}
                    onClick={() => set(formatVideoTime(time))}
                    className="ui-btn ui-btn-secondary flex-1 text-xs"
                  >
                    ⏱ Usar este momento{ready ? ` (${formatVideoTime(time)})` : ''}
                  </button>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-500">
              Sem a 2.ª parte, a app conta que o vídeo foi parado ao intervalo. O vídeo fica no YouTube: a app só guarda
              o link e estes dois tempos.
            </p>
            <div className="flex gap-2">
              {saved && (
                <button type="button" onClick={() => setEditing(false)} className="ui-btn ui-btn-secondary flex-1 py-3">
                  Cancelar
                </button>
              )}
              <button type="button" onClick={save} className="ui-btn ui-btn-primary flex-[2] py-3">
                Guardar e ver os lances
              </button>
            </div>
          </div>
        ) : (
          <div className="pb-3">
            <div role="group" aria-label="Filtrar lances" className="flex gap-1.5 overflow-x-auto px-3 py-2.5">
              {(
                [
                  ['todos', `Todos ${events.length}`],
                  ['golo', `⚽ Golos ${count('golo')}`],
                  ['sofrido', `🥅 Sofridos ${count('sofrido')}`],
                  ['sub', `🔁 Substituições ${count('sub')}`],
                  ['cartao', `Cartões ${count('cartao')}`]
                ] as const
              )
                .filter(([id], i) => i === 0 || count(id as VideoEventKind) > 0)
                .map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                      filter === id ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-slate-700 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              {people.length > 0 && (
                <select
                  aria-label="Lances de um atleta"
                  value={filter.startsWith('p:') ? filter : ''}
                  onChange={(e) => setFilter((e.target.value || 'todos') as Filter)}
                  className="ui-input shrink-0 !py-1 text-xs"
                >
                  <option value="">Por atleta ▾</option>
                  {people.map((p) => (
                    <option key={p.id} value={`p:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {events.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">
                Este jogo não tem golos, substituições nem cartões registados no Modo Jogo.
              </p>
            )}
            <ul aria-label="Lances do jogo">
              {shown.map((e) => (
                <li
                  key={e.id}
                  className={`flex items-center gap-3 border-t border-slate-800 px-4 py-2.5 ${current === e.id ? 'bg-cyan-500/10' : ''}`}
                >
                  <span className="w-10 shrink-0 text-sm font-bold text-cyan-300 font-['Chakra_Petch']">
                    {e.minute}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-white">
                      {KIND_ICON[e.kind]} {e.title}
                    </b>
                    <span className="block truncate text-[11px] text-slate-400">
                      {[e.detail, `${formatVideoTime(e.at)} no vídeo${e.estimated ? ' (aprox.)' : ''}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {current === e.id && (
                      <span className="mt-1 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => nudge(e, -5)}
                          className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300"
                        >
                          −5 s
                        </button>
                        <button
                          type="button"
                          onClick={() => nudge(e, 5)}
                          className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300"
                        >
                          +5 s
                        </button>
                        <span className="text-[10px] text-slate-500 self-center">acertar este lance</span>
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => play(e)}
                    aria-label={`Ver ${e.minute} ${e.title}`}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white ${
                      current === e.id ? 'bg-emerald-600' : 'bg-cyan-600'
                    }`}
                  >
                    ▶
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2 px-4 pt-3">
              <button
                type="button"
                disabled={count('golo') === 0}
                onClick={() => {
                  const goals = events.filter((e) => e.kind === 'golo');
                  setQueue(goals);
                  setCurrent(goals[0].id);
                  seek(goals[0].at);
                }}
                className="ui-btn ui-btn-secondary py-2.5 text-xs"
              >
                ▶ Ver os golos seguidos
              </button>
              <button
                type="button"
                disabled={count('golo') === 0}
                onClick={copyGoals}
                className="ui-btn ui-btn-secondary py-2.5 text-xs"
              >
                📲 Golos para os pais
              </button>
            </div>
            <div className="flex items-center justify-between px-4 pt-2">
              <label className="flex items-center gap-2 text-[11px] text-slate-400">
                <input type="checkbox" checked={withNames} onChange={(e) => setWithNames(e.target.checked)} />
                Nomes de quem marcou na mensagem
              </label>
              <button type="button" onClick={() => setEditing(true)} className="text-[11px] text-cyan-300 underline">
                Mudar vídeo ou tempos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameVideoModal;
