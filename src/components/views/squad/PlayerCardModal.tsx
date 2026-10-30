import React, { useEffect, useRef, useState } from 'react';
import { AppState, Player } from '../../../types';
import { drawPlayerCard, PLAYER_CARD_SIZE, playerCardData, cardNumberOf } from '../../../lib/playerCard';
import { loadDataImage, shareCanvasImage } from '../../../lib/shareImage';
import { teamSettings } from '../../../lib/teamSettings';

interface PlayerCardModalProps {
  player: Player;
  state: AppState;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/** 🃏 Cromo do atleta: the collectable card of the season, to share with the family. */
const PlayerCardModal: React.FC<PlayerCardModalProps> = ({ player, state, onShowToast, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [withPhoto, setWithPhoto] = useState(false);
  const hasPhoto = Boolean(player.photoUrl?.startsWith('data:image/'));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [photo, logo] = await Promise.all([
        withPhoto ? loadDataImage(player.photoUrl) : Promise.resolve(null),
        loadDataImage(state.clubLogoUrl)
      ]);
      if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
      const ctx = canvasRef.current?.getContext('2d');
      if (cancelled || !ctx) return;
      drawPlayerCard(
        ctx,
        playerCardData(state, player, teamSettings(state).clubColor, {
          ...cardNumberOf(state.roster, player.id),
          photo,
          logo
        })
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [player, state, withPhoto]);

  const share = async () => {
    if (!canvasRef.current) return;
    const result = await shareCanvasImage(
      canvasRef.current,
      `Cromo_${player.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
      `🃏 O cromo de ${player.name} da época ${state.season || ''}`.trim()
    );
    if (result === 'error') onShowToast('Não foi possível criar a imagem.');
    if (result === 'downloaded') onShowToast('Imagem descarregada 📥');
  };

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Cromo do atleta"
        className="ui-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">🃏 Cromo de {player.name}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar cromo" className="text-slate-400 text-lg px-1">
            ✕
          </button>
        </div>
        {hasPhoto && (
          <label className="flex items-start gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={withPhoto}
              onChange={(e) => setWithPhoto(e.target.checked)}
              className="mt-0.5"
            />
            <span>Os pais autorizaram usar a foto (sem esta autorização o cromo leva só o número).</span>
          </label>
        )}
        <canvas
          ref={canvasRef}
          width={PLAYER_CARD_SIZE.width}
          height={PLAYER_CARD_SIZE.height}
          role="img"
          aria-label={`Cromo de ${player.name}`}
          className="mx-auto w-full max-w-[320px]"
        />
        <p className="text-[11px] text-slate-400 text-center">
          Treinos: presenças / treinos dados na época. Jogos, golos e assistências da época {state.season || ''}.
        </p>
        <button type="button" onClick={share} className="ui-btn ui-btn-primary w-full py-3 text-sm">
          📲 Partilhar cromo
        </button>
      </div>
    </div>
  );
};

export default PlayerCardModal;
