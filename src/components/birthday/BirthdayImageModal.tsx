import React, { useEffect, useRef, useState } from 'react';
import { AppState } from '../../types';
import { BirthdayPerson } from '../../lib/birthdayUtils';
import { BIRTHDAY_CARD_SIZE, drawBirthdayCard, initialsOf } from '../../lib/birthdayCard';
import { loadDataImage, shareCanvasImage } from '../../lib/shareImage';

interface BirthdayImageModalProps {
  person: BirthdayPerson;
  state: AppState;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/** 🎂 Imagem de parabéns: picture to share with the parents on the birthday. */
export const BirthdayImageModal: React.FC<BirthdayImageModalProps> = ({ person, state, onShowToast, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [withPhoto, setWithPhoto] = useState(false);
  const hasPhoto = Boolean(person.photoUrl?.startsWith('data:image/'));
  const fileName = `Parabens_${person.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [photo, logo] = await Promise.all([
        withPhoto ? loadDataImage(person.photoUrl) : Promise.resolve(null),
        loadDataImage(state.clubLogoUrl)
      ]);
      if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
      const ctx = canvasRef.current?.getContext('2d');
      if (cancelled || !ctx) return;
      const n = person.jerseyNumber;
      drawBirthdayCard(ctx, {
        clubName: state.myClubName || 'A nossa equipa',
        category: state.category,
        name: person.rawPlayer?.nickname?.trim() || person.name,
        age: person.nextAge,
        badge:
          person.type === 'jogador' && n !== null && n !== undefined && `${n}` !== ''
            ? String(n)
            : initialsOf(person.name),
        dateLabel: person.formattedDayMonth,
        photo,
        logo
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [person, withPhoto, state.clubLogoUrl, state.myClubName, state.category]);

  const share = async () => {
    if (!canvasRef.current) return;
    const result = await shareCanvasImage(canvasRef.current, fileName, `🎂 Parabéns, ${person.name}!`);
    if (result === 'error') onShowToast('Não foi possível criar a imagem.');
    if (result === 'downloaded') onShowToast('Imagem descarregada 📥');
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Imagem de parabéns"
        className="w-full max-w-md bg-slate-900 border border-fuchsia-400/40 rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">🎂 Parabéns</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar imagem de parabéns"
            className="text-slate-400 text-lg"
          >
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
            <span>Os pais autorizaram partilhar a foto (sem esta autorização a imagem leva só o número).</span>
          </label>
        )}
        <canvas
          ref={canvasRef}
          width={BIRTHDAY_CARD_SIZE.width}
          height={BIRTHDAY_CARD_SIZE.height}
          role="img"
          aria-label={`Imagem de parabéns para ${person.name}`}
          className="w-full rounded-2xl border border-slate-800"
        />
        <button
          type="button"
          onClick={share}
          className="w-full py-3 rounded-xl bg-fuchsia-500 text-white text-sm font-black"
        >
          📲 Partilhar imagem
        </button>
      </div>
    </div>
  );
};
