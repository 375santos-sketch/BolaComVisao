import React, { useMemo, useRef, useState } from 'react';
import { AppState, MatchType, ScheduledMatch } from '../../../types';
import { cleanPrintFixtures, PrintFixture } from '../../../lib/printJornada';
import { fixtureDrafts, fixtureTeams, guessOurName } from '../../../lib/fixtureImport';
import { readPrintImage } from '../../../lib/readPrint';
import { seasonFromDate, uid } from '../../../lib/utils';

interface FixturePrintModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const dayLabel = (iso: string) =>
  `${WEEKDAYS[new Date(`${iso}T12:00:00`).getDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Agenda → 📷 Importar jogos: read a picture of the calendar and add our team's games to the Agenda. */
export const FixturePrintModal: React.FC<FixturePrintModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const [fixtures, setFixtures] = useState<PrintFixture[] | null>(null);
  const [reading, setReading] = useState(false);
  const [ourAlias, setOurAlias] = useState('');
  const [type, setType] = useState<MatchType>('campeonato');
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const teams = useMemo(() => (fixtures ? fixtureTeams(fixtures) : []), [fixtures]);
  const drafts = useMemo(
    () =>
      fixtures && ourAlias
        ? fixtureDrafts(fixtures, {
            ourAlias,
            season: state.season,
            schedule: state.schedule || [],
            matches: state.matches || []
          })
        : [],
    [fixtures, ourAlias, state.season, state.schedule, state.matches]
  );
  const chosen = drafts.filter((d, i) => !d.duplicate && !unchecked.has(i));

  const read = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      const games = cleanPrintFixtures(await readPrintImage(file, 'calendario'));
      if (!games.length) throw new Error('Não encontrei jogos neste print.');
      setFixtures(games);
      setUnchecked(new Set());
      setOurAlias(guessOurName(games, state.myClubName || '', state.myClubName) || '');
    } catch (err) {
      onShowToast((err as Error).message || 'Não foi possível ler o print.');
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const add = () => {
    if (!chosen.length) return;
    const created: ScheduledMatch[] = chosen.map((d) => ({
      id: uid(),
      teamId: state.activeTeamId,
      teamName: state.myClubName,
      opponent: d.opponent,
      date: d.date,
      time: d.time || '09:00',
      type,
      phase: type !== 'amigavel' && d.round ? `Jornada ${d.round}` : '',
      tournamentName: '',
      season: seasonFromDate(d.date),
      location: d.location,
      ...(d.venue ? { venue: d.venue } : {}),
      callup: []
    }));
    const schedule = [...(state.schedule || []), ...created].sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );
    const teamsList = (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, schedule } : t));
    onUpdateState({ schedule, teams: teamsList });
    onShowToast(`${created.length} jogo(s) adicionado(s) à Agenda ✓`);
    onClose();
  };

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Importar jogos por print"
        className="ui-card w-full max-w-md rounded-b-none sm:rounded-2xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">📷 Importar jogos</h3>
          <button type="button" onClick={onClose} aria-label="Fechar importar jogos" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Faça um print do calendário da série (site da FPF ou da associação) e escolha-o aqui. A app lê os jogos e
          junta à Agenda só os da nossa equipa, com a data, a hora e se é em casa ou fora.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          aria-label="Print do calendário"
          className="hidden"
          onChange={(e) => read(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={reading}
          onClick={() => fileRef.current?.click()}
          className="ui-btn ui-btn-primary w-full py-2.5 text-xs"
        >
          {reading ? 'A ler o print…' : fixtures ? '📷 Escolher outro print' : '📷 Escolher o print do calendário'}
        </button>

        {fixtures && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-slate-400">
                A nossa equipa no print
                <select
                  aria-label="A nossa equipa no print"
                  className="ui-input mt-1 text-xs"
                  value={ourAlias}
                  onChange={(e) => {
                    setOurAlias(e.target.value);
                    setUnchecked(new Set());
                  }}
                >
                  <option value="">Escolher…</option>
                  {teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-slate-400">
                Tipo de jogo
                <select
                  aria-label="Tipo de jogo"
                  className="ui-input mt-1 text-xs"
                  value={type}
                  onChange={(e) => setType(e.target.value as MatchType)}
                >
                  <option value="campeonato">Campeonato</option>
                  <option value="torneio">Torneio</option>
                  <option value="amigavel">Amigável</option>
                </select>
              </label>
            </div>

            {!ourAlias ? (
              <p className="text-[11px] text-amber-300">Escolha como a nossa equipa aparece escrita no print.</p>
            ) : drafts.length === 0 ? (
              <p className="text-[11px] text-slate-400">Não há jogos da nossa equipa neste print.</p>
            ) : (
              <ul aria-label="Jogos encontrados" className="space-y-1.5">
                {drafts.map((d, i) => (
                  <li key={`${d.date}-${d.opponent}`}>
                    <label
                      className={`ui-inset flex items-center gap-2 p-2 text-[11px] ${d.duplicate ? 'opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        disabled={d.duplicate}
                        checked={!d.duplicate && !unchecked.has(i)}
                        onChange={(e) => {
                          const next = new Set(unchecked);
                          if (e.target.checked) next.delete(i);
                          else next.add(i);
                          setUnchecked(next);
                        }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-slate-100 font-bold truncate">
                          {d.location === 'casa' ? '🏠' : '✈️'} vs {d.opponent}
                        </span>
                        <span className="block text-slate-400">
                          {dayLabel(d.date)}
                          {d.time ? ` · ${d.time}` : ' · sem hora (fica 09:00, pode mudar depois)'}
                          {d.round ? ` · Jornada ${d.round}` : ''}
                          {d.duplicate ? ' · já está na Agenda' : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={add}
              disabled={chosen.length === 0}
              className="ui-btn ui-btn-success w-full py-2.5 text-xs"
            >
              Adicionar {chosen.length} jogo(s) à Agenda
            </button>
          </>
        )}
      </div>
    </div>
  );
};
