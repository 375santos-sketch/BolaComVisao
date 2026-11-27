import React, { useEffect, useRef, useState } from 'react';
import { Portal } from './ui/Portal';
import { Icon } from './ui/Icon';
import { AppState, TeamPhoto } from '../types';
import { drawGrowthPicture, growthNumbers, seasonMonths, seasonPhotos } from '../lib/seasonGrowth';
import { compressImageFile } from '../lib/imageCompress';
import { loadDataImage, shareCanvasImage } from '../lib/shareImage';
import { teamSettings } from '../lib/teamSettings';
import { defaultSeason, uid } from '../lib/utils';

interface SeasonGrowthModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/**
 * Mais → Antes e depois da época: the team's photo at the start and at the end of the season, and the numbers of
 * the season, in one picture for the parents and the end-of-season party.
 */
const SeasonGrowthModal: React.FC<SeasonGrowthModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const season = state.season || defaultSeason();
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const photos = seasonPhotos(team?.teamPhotos, season);
  const [months] = useState(() => seasonMonths(season));
  const [authorized, setAuthorized] = useState(false);
  const [numbers, setNumbers] = useState(() => growthNumbers(state.roster, state.trainings, state.matches, season));
  const [busy, setBusy] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const color = teamSettings(state).clubColor;

  // The picture is drawn again whenever something changes
  useEffect(() => {
    let alive = true;
    (async () => {
      const [start, end] = authorized
        ? await Promise.all([loadDataImage(photos.start?.image), loadDataImage(photos.end?.image)])
        : [null, null];
      if (!alive || !canvasRef.current) return;
      drawGrowthPicture(canvasRef.current, {
        club: state.myClubName || team?.clubName || 'Clube',
        category: state.category || team?.category || '',
        season,
        color,
        numbers,
        start,
        end
      });
    })();
    return () => {
      alive = false;
    };
  }, [
    authorized,
    photos.start?.image,
    photos.end?.image,
    numbers,
    season,
    color,
    state.myClubName,
    state.category,
    team?.clubName,
    team?.category
  ]);

  const savePhoto = async (moment: TeamPhoto['moment'], file?: File) => {
    if (!file || !team) return;
    setBusy(moment);
    try {
      const image = await compressImageFile(file, 1400, 260_000);
      const photo: TeamPhoto = { id: uid(), season, moment, image, createdAt: new Date().toISOString() };
      const kept = (team.teamPhotos || []).filter((p) => !(p.season === season && p.moment === moment));
      onUpdateState({
        teams: (state.teams || []).map((t) => (t.id === team.id ? { ...t, teamPhotos: [...kept, photo] } : t))
      });
      onShowToast(moment === 'inicio' ? 'Foto do início guardada ✓' : 'Foto do fim guardada ✓');
    } catch (err) {
      onShowToast((err as Error).message || 'Não foi possível guardar a foto.');
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (!canvasRef.current) return;
    const result = await shareCanvasImage(
      canvasRef.current,
      `Antes_e_depois_${season.replace(/\W+/g, '-')}.png`,
      `Como crescemos esta época 💙`
    );
    if (result === 'downloaded') onShowToast('Imagem descarregada ✓');
    else if (result === 'error') onShowToast('Não foi possível criar a imagem.');
  };

  const slot = (moment: TeamPhoto['moment'], photo: TeamPhoto | undefined, month: string) => (
    <label
      className={`relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-ui-sm text-center text-xs ${
        photo ? 'bg-ui-surface-2' : 'border-2 border-dashed border-ui-line-strong text-ui-muted'
      }`}
    >
      {photo ? (
        <img src={photo.image} alt={`Foto da equipa: ${month}`} className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 px-2">
          <Icon name="image" className="h-5 w-5" />
          {busy === moment ? 'A preparar…' : moment === 'inicio' ? 'Foto do início' : 'Foto do fim'}
          <span className="block text-ui-caption text-ui-muted">{month}</span>
        </span>
      )}
      {photo && (
        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
          {moment === 'inicio' ? 'Início' : 'Fim'} · trocar
        </span>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={moment === 'inicio' ? 'Foto da equipa no início da época' : 'Foto da equipa no fim da época'}
        onChange={(e) => {
          savePhoto(moment, e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </label>
  );

  return (
    <Portal>
      <div
        className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label="Antes e depois da época"
          className="ui-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-ui-text">Antes e depois</h3>
              <p className="text-ui-caption text-ui-muted">
                Época {season}
                {state.category ? ` · ${state.category}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar antes e depois"
              className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
            >
              <Icon name="x" className="h-5 w-5 shrink-0" />
            </button>
          </div>

          <section aria-label="Fotos da equipa" className="space-y-2">
            <div className="text-ui-caption font-semibold text-ui-muted">As duas fotos da equipa</div>
            <div className="grid grid-cols-2 gap-2">
              {slot('inicio', photos.start, months[0])}
              {slot('fim', photos.end, months[1])}
            </div>
            <label className="flex items-start gap-2 text-xs text-ui-text">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
              />
              <span>
                Os pais autorizaram a foto da equipa nas imagens partilhadas.
                <span className="block text-ui-caption text-ui-muted">
                  Sem este visto, a imagem sai só com os números.
                </span>
              </span>
            </label>
            <p className="text-ui-caption text-ui-muted">
              A foto do início fica guardada na nuvem desde já, para não se perder até ao fim da época.
            </p>
          </section>

          <section aria-label="Números da época" className="space-y-1">
            <div className="text-ui-caption font-semibold text-ui-muted">
              Os números da época (escolhe quais entram)
            </div>
            {numbers.length === 0 ? (
              <p className="text-xs text-ui-muted">Ainda não há treinos, jogos ou testes registados nesta época.</p>
            ) : (
              numbers.map((n) => (
                <label
                  key={n.id}
                  className="flex items-center gap-2 border-t border-ui-line py-1.5 text-xs first:border-0 min-h-10"
                >
                  <input
                    type="checkbox"
                    checked={n.on}
                    onChange={(e) =>
                      setNumbers(numbers.map((x) => (x.id === n.id ? { ...x, on: e.target.checked } : x)))
                    }
                  />
                  <span className="flex-1 text-ui-text">{n.label.charAt(0) + n.label.slice(1).toLowerCase()}</span>
                  <b className="tabular-nums text-ui-text">{n.value}</b>
                </label>
              ))
            )}
            <p className="text-ui-caption text-ui-muted">Só números da equipa: nenhum atleta é comparado com outro.</p>
          </section>

          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Imagem antes e depois da época"
            className="mx-auto block h-auto max-h-[50dvh] w-auto max-w-full rounded-ui-lg border border-ui-line"
          />
          <button type="button" onClick={share} className="ui-btn ui-btn-primary min-h-12 w-full text-sm">
            <Icon name="download" className="h-4 w-4 shrink-0" />
            Partilhar imagem
          </button>
        </div>
      </div>
    </Portal>
  );
};

export default SeasonGrowthModal;
