import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Match } from '../../../types';
import { drawMvpCard, MVP_CARD_SIZE, mvpCandidates, mvpResultLine, mvpStatsLine } from '../../../lib/mvpCard';
import { calculateMatchScore } from '../../../lib/utils';

interface MvpModalProps {
  match: Match;
  state: AppState;
  onSave: (match: Match) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/** Only images that are already in the app (data URLs) can go into the picture: other links block the export. */
const loadImage = (src?: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!src || !src.startsWith('data:image/')) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** ⭐ Jogador do jogo: pick the standout athlete and share a picture with the parents. */
export const MvpModal: React.FC<MvpModalProps> = ({ match, state, onSave, onShowToast, onClose }) => {
  const candidates = useMemo(() => mvpCandidates(state, match), [state, match]);
  const [playerId, setPlayerId] = useState<string>(match.mvpId || candidates[0]?.player.id || '');
  const [withPhoto, setWithPhoto] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const line = candidates.find((c) => c.player.id === playerId);
  const hasPhoto = Boolean(line?.player.photoUrl?.startsWith('data:image/'));
  const clubName = state.myClubName || 'A nossa equipa';
  const fileName = `Jogador_do_jogo_${(line?.player.name || '').replace(/[^a-zA-Z0-9]/g, '_')}.png`;

  useEffect(() => {
    if (!line || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const [photo, logo] = await Promise.all([
        withPhoto ? loadImage(line.player.photoUrl) : Promise.resolve(null),
        loadImage(state.clubLogoUrl)
      ]);
      if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
      const ctx = canvasRef.current?.getContext('2d');
      if (cancelled || !ctx) return;
      const { scored, conceded } = calculateMatchScore(match);
      const number = line.player.number;
      drawMvpCard(ctx, {
        clubName,
        category: state.category,
        result: mvpResultLine(match, clubName, scored, conceded),
        date: (match.date || '').slice(0, 10).split('-').reverse().join('/'),
        name: line.player.nickname?.trim() || line.player.name,
        number: number !== null && number !== undefined && `${number}` !== '' ? String(number) : undefined,
        position: line.player.positions || undefined,
        stats: mvpStatsLine(line),
        photo,
        logo
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [line, withPhoto, match, clubName, state.category, state.clubLogoUrl]);

  const save = () => {
    if (!line) return;
    if (match.mvpId !== line.player.id) {
      onSave({ ...match, mvpId: line.player.id });
      onShowToast(`⭐ ${line.player.name} é o jogador do jogo`);
    }
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !line) return;
    save();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      onShowToast('Não foi possível criar a imagem.');
      return;
    }
    const file = new File([blob], fileName, { type: 'image/png' });
    const text = `⭐ Jogador do jogo: ${line.player.name}!`;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
    // Computers and browsers without sharing: download the picture
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onShowToast('Imagem descarregada 📥');
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Jogador do jogo"
        className="w-full max-w-md bg-slate-900 border border-amber-400/40 rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">⭐ Jogador do jogo</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar jogador do jogo"
            className="text-slate-400 text-lg"
          >
            ✕
          </button>
        </div>

        {candidates.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Este jogo não tem atletas com minutos registados (titulares e substituições).
          </p>
        ) : (
          <>
            <label className="block text-[11px] text-slate-400">
              Destaque
              <select
                className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm"
                value={playerId}
                onChange={(e) => {
                  setPlayerId(e.target.value);
                  setWithPhoto(false);
                }}
              >
                {candidates.map((c) => (
                  <option key={c.player.id} value={c.player.id}>
                    {c.player.name} — {mvpStatsLine(c)}
                  </option>
                ))}
              </select>
            </label>

            {hasPhoto && (
              <label className="flex items-start gap-2 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={withPhoto}
                  onChange={(e) => setWithPhoto(e.target.checked)}
                  className="mt-0.5"
                />
                <span>Os pais autorizaram partilhar a foto (sem esta autorização a imagem leva só o número).</span>
              </label>
            )}

            <canvas
              ref={canvasRef}
              width={MVP_CARD_SIZE.width}
              height={MVP_CARD_SIZE.height}
              role="img"
              aria-label="Imagem do jogador do jogo"
              className="w-full rounded-2xl border border-slate-800"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={save}
                className="py-2.5 rounded-xl border border-amber-400/60 text-amber-200 text-xs font-bold"
              >
                Guardar destaque
              </button>
              <button
                type="button"
                onClick={share}
                className="py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black"
              >
                📲 Partilhar imagem
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
