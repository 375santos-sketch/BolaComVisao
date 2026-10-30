import React, { useEffect, useMemo, useRef } from 'react';
import { AppState, ScheduledMatch } from '../../types';
import { sortPlayerObjs } from '../../lib/utils';
import { teamSettings } from '../../lib/teamSettings';
import { CALLUP_CARD_SIZE, drawCallupCard } from '../../lib/callupCard';
import { loadDataImage, shareCanvasImage } from '../../lib/shareImage';
import { competitionLabel } from '../../lib/preMatchPlan';

interface CallupImageModalProps {
  game: ScheduledMatch;
  state: AppState;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Convocatória → 🖼️ Imagem para os pais: the call-up as a picture to share in the parents' group. */
export const CallupImageModal: React.FC<CallupImageModalProps> = ({ game, state, onShowToast, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const club = state.myClubName || 'A nossa equipa';
  const away = game.location === 'fora';
  const players = useMemo(
    () =>
      sortPlayerObjs((state.roster || []).filter((p) => (game.callup || []).includes(p.id))).map((p) => ({
        number: p.number !== null && p.number !== undefined && `${p.number}` !== '' ? String(p.number) : undefined,
        name: p.nickname?.trim() || p.name
      })),
    [state.roster, game.callup]
  );
  const day = `${WEEKDAYS[new Date(`${game.date}T12:00:00`).getDay()]} ${game.date.slice(8, 10)}/${game.date.slice(5, 7)}`;
  const fileName = `Convocatoria_${game.opponent.replace(/[^a-zA-Z0-9]/g, '_')}_${game.date}.png`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const logo = await loadDataImage(state.clubLogoUrl);
      if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
      const ctx = canvasRef.current?.getContext('2d');
      if (cancelled || !ctx) return;
      drawCallupCard(ctx, {
        clubName: club,
        subtitle: [state.category, state.season ? `Época ${state.season}` : ''].filter(Boolean).join(' · '),
        brand: teamSettings(state).clubColor,
        home: away ? game.opponent : club,
        away: away ? club : game.opponent,
        facts: [
          ['DIA', day],
          ['JOGO', game.time || '—'],
          ['CONCENTR.', game.meetingTime || '—'],
          ['ENCONTRO', game.meetingPoint || '—']
        ],
        place: [game.venue ? `📍 ${game.venue}` : '', competitionLabel(game)].filter(Boolean).join(' · '),
        players,
        notes: game.callupNotes?.trim() ? `⚠️ ${game.callupNotes.trim()}` : undefined,
        logo
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [game, state, club, away, day, players]);

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const result = await shareCanvasImage(
      canvas,
      fileName,
      `Convocatória: ${away ? game.opponent : club} vs ${away ? club : game.opponent}`
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
        aria-label="Imagem da convocatória"
        className="ui-card w-full max-w-md rounded-b-none sm:rounded-2xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">🖼️ Imagem para os pais</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar imagem da convocatória"
            className="text-slate-400 text-lg"
          >
            ✕
          </button>
        </div>
        {players.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Convoque primeiro os atletas para este jogo.</p>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={CALLUP_CARD_SIZE.width}
              height={CALLUP_CARD_SIZE.height}
              role="img"
              aria-label="Imagem da convocatória para os pais"
              className="w-full rounded-2xl border border-slate-800"
            />
            <p className="text-[11px] text-slate-400">Só leva os números e os nomes dos atletas (sem fotos).</p>
            <button type="button" onClick={share} className="ui-btn ui-btn-primary w-full py-3 text-sm">
              📲 Partilhar imagem
            </button>
          </>
        )}
      </div>
    </div>
  );
};
