import React, { useMemo, useState } from 'react';
import { AppState, Match, MatchVideo } from '../../../types';
import { formatVideoTime, isValidVideoUrl, parseVideoTime, videoMarks, youTubeId } from '../../../lib/videoMarks';

interface VideoMarksModalProps {
  match: Match;
  state: AppState;
  onSave: (match: Match) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const input =
  'w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-cyan-400 outline-none';

/** 🎥 Vídeo do jogo: link + where each half starts; each goal, card and substitution opens the video right there. */
export const VideoMarksModal: React.FC<VideoMarksModalProps> = ({ match, state, onSave, onShowToast, onClose }) => {
  const v = match.video;
  const [url, setUrl] = useState(v?.url || '');
  const [url2, setUrl2] = useState(v?.url2 || '');
  const [start1, setStart1] = useState(v?.half1Start != null ? formatVideoTime(v.half1Start) : '');
  const [start2, setStart2] = useState(v?.half2Start != null ? formatVideoTime(v.half2Start) : '');
  const [editing, setEditing] = useState(!v?.url);

  const marks = useMemo(
    () => videoMarks(match, state.roster || [], state.category, match.opponent || 'Adversário'),
    [match, state.roster, state.category]
  );

  const save = () => {
    if (!isValidVideoUrl(url)) {
      onShowToast('Cole o link do vídeo (por exemplo do YouTube).');
      return;
    }
    if (url2.trim() && !isValidVideoUrl(url2)) {
      onShowToast('O link da 2.ª parte não é válido.');
      return;
    }
    const h1 = start1.trim() ? parseVideoTime(start1) : null;
    const h2 = start2.trim() ? parseVideoTime(start2) : null;
    if ((start1.trim() && h1 == null) || (start2.trim() && h2 == null)) {
      onShowToast('Escreva o tempo do vídeo como 12:34 (minutos:segundos) ou 1:02:03.');
      return;
    }
    const video: MatchVideo = { url: url.trim() };
    if (url2.trim()) video.url2 = url2.trim();
    if (h1 != null) video.half1Start = h1;
    if (h2 != null) video.half2Start = h2;
    onSave({ ...match, video });
    setEditing(false);
    onShowToast('Vídeo do jogo guardado ✓');
  };

  const remove = () => {
    const copy = { ...match };
    delete copy.video;
    onSave(copy);
    setUrl('');
    setUrl2('');
    setStart1('');
    setStart2('');
    setEditing(true);
    onShowToast('Vídeo retirado do jogo');
  };

  const missingStart = Boolean(v?.url) && (v?.half1Start == null || v?.half2Start == null);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Vídeo do jogo"
        className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">🎥 Vídeo do jogo</h3>
          <button type="button" onClick={onClose} aria-label="Fechar vídeo do jogo" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>

        {editing ? (
          <section aria-label="Dados do vídeo" className="space-y-2">
            <label className="block text-[11px] text-slate-400">
              Link do vídeo (YouTube, Drive…)
              <input
                className={input}
                value={url}
                inputMode="url"
                placeholder="https://youtu.be/…"
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-slate-400">
                Início da 1.ª parte no vídeo
                <input
                  className={input}
                  value={start1}
                  inputMode="numeric"
                  placeholder="ex: 2:15"
                  onChange={(e) => setStart1(e.target.value)}
                />
              </label>
              <label className="block text-[11px] text-slate-400">
                Início da 2.ª parte no vídeo
                <input
                  className={input}
                  value={start2}
                  inputMode="numeric"
                  placeholder="ex: 34:40"
                  onChange={(e) => setStart2(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-[11px] text-slate-400">
              Link só da 2.ª parte (opcional, se for outro vídeo)
              <input
                className={input}
                value={url2}
                inputMode="url"
                placeholder="Deixe vazio se for o mesmo vídeo"
                onChange={(e) => setUrl2(e.target.value)}
              />
            </label>
            <p className="text-[10px] text-slate-500">
              Veja no vídeo o minuto e o segundo do apito inicial de cada parte. Com o YouTube, cada lance abre no
              momento certo (15 segundos antes). Noutros vídeos (Drive…) abre o vídeo e mostramos o tempo para procurar.
            </p>
            <div className="flex gap-2">
              {v?.url && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={save}
                className="flex-1 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase"
              >
                Guardar vídeo
              </button>
            </div>
          </section>
        ) : (
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <a href={v!.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline truncate">
              {youTubeId(v!.url) ? '▶️ Abrir no YouTube' : '▶️ Abrir o vídeo'}
            </a>
            <div className="flex gap-3 shrink-0">
              <button type="button" className="text-cyan-300 font-bold" onClick={() => setEditing(true)}>
                Editar
              </button>
              <button type="button" className="text-rose-300" onClick={remove}>
                Retirar
              </button>
            </div>
          </div>
        )}

        {!editing && missingStart && (
          <p className="text-[11px] text-amber-300">
            ⚠️ Indique onde começa cada parte no vídeo (Editar) para os lances abrirem no momento certo.
          </p>
        )}

        {!editing &&
          (marks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Este jogo não tem golos, cartões nem substituições.
            </p>
          ) : (
            <ul aria-label="Lances no vídeo" className="space-y-1.5">
              {marks.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px]"
                >
                  <span className="w-10 shrink-0 font-mono text-slate-400">{m.minute}</span>
                  <span className="flex-1 min-w-0 text-slate-200">
                    {m.icon} {m.label}
                  </span>
                  {m.link ? (
                    <a
                      href={m.link}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ver no vídeo: ${m.label}`}
                      className="shrink-0 px-2 py-1 rounded-lg bg-cyan-500 text-slate-950 font-black"
                    >
                      ▶ {formatVideoTime(m.seconds!)}
                    </a>
                  ) : (
                    <span className="shrink-0 text-slate-500">sem tempo</span>
                  )}
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
};
