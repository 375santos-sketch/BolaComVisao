import React, { lazy, Suspense, useMemo, useState } from 'react';
import { DateTimePT } from '../ui/DateTimePT';
import { AppState, ScheduledMatch } from '../../types';
import { t } from '../../i18n/dict';
import { sortPlayerObjs } from '../../lib/utils';
import { getPlayerQuickAttendance } from '../../lib/intelligenceEngine';
import { Header } from '../Header';
import { CallupShareModal } from '../CallupShareModal';
import { upcomingGames } from '../../lib/preMatchPlan';
import { callupPlayingTime, playersNeedingMinutes, RECENT_GAMES } from '../../lib/callupPlayingTime';
import { availabilityOn } from '../../lib/availability';
import { SetPiecesCard } from './setpieces/SetPiecesCard';
import { WeatherBadge } from '../WeatherBadge';
import { directionsUrl, townOfClub } from '../../lib/gameMap';
import { teamSettings } from '../../lib/teamSettings';
import { cardAlerts, cardStatuses } from '../../lib/cardSuspensions';
import { CompactSelect } from '../ui/CompactSelect';
import { LastTimeAgainstCard } from './results/LastTimeAgainstCard';
import { Icon } from '../ui/Icon';

const LineupImageModal = lazy(() => import('./LineupImageModal').then((m) => ({ default: m.LineupImageModal })));
const CallupImageModal = lazy(() => import('./CallupImageModal').then((m) => ({ default: m.CallupImageModal })));

interface ConvocatoriaViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowToast: (msg: string) => void;
  initialMatchId?: string | null;
}

export const ConvocatoriaView: React.FC<ConvocatoriaViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowToast,
  initialMatchId
}) => {
  // The game tapped in the Agenda, otherwise the next game.
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    initialMatchId || upcomingGames(state.schedule || [])[0]?.id || state.schedule[0]?.id || ''
  );
  const [showShare, setShowShare] = useState(false);
  const [showLineup, setShowLineup] = useState(false);
  const [showCallupImage, setShowCallupImage] = useState(false);

  const match = state.schedule.find((s) => s.id === selectedMatchId) || state.schedule[0];
  const isFinalized = Boolean(match?.callupFinalized);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const isEditing = Boolean(match && editingMatchId === match.id);

  // Reset editing mode when switching matches
  const handleSelectMatch = (newMatchId: string) => {
    setSelectedMatchId(newMatchId);
    setEditingMatchId(null);
  };

  const handleFinalizeCallup = () => {
    if (!match) return;
    if (match.callup.length === 0) {
      onShowToast('Aviso: Nenhum jogador convocado ainda.');
    }
    const updatedSchedule = state.schedule.map((s) => {
      if (s.id === match.id) {
        return {
          ...s,
          callupFinalized: true,
          callupFinalizedAt: Date.now()
        };
      }
      return s;
    });
    onUpdateState({ schedule: updatedSchedule });
    setEditingMatchId(null);
    onShowToast('Convocatória finalizada com sucesso! ✓');
  };

  const handleStartEditing = () => {
    if (match) {
      setEditingMatchId(match.id);
    }
    onShowToast('Modo de edição da Convocatória ativado ✓');
  };

  const squad = sortPlayerObjs(state.roster.filter((p) => p.active !== false));

  // Minutes of the season, to share playing time fairly when choosing who goes.
  const minutesById = useMemo(
    () => callupPlayingTime(state.matches || [], state.roster || [], state.season, state.category),
    [state.matches, state.roster, state.season, state.category]
  );
  // Injuries and suspensions on the day of this game (return date included)
  const availabilityById = useMemo(
    () => new Map(squad.map((p) => [p.id, availabilityOn(p, match?.date)])),
    [squad, match?.date]
  );
  const isAvailable = (id: string) => availabilityById.get(id)?.available !== false;
  const calledUnavailable = squad.filter((p) => match?.callup.includes(p.id) && !isAvailable(p.id));
  const needMinutes = playersNeedingMinutes(minutesById).filter((r) => isAvailable(r.playerId));
  // Cards: suspensions to serve and athletes one yellow away (official games only)
  const settings = teamSettings(state);
  const cards = useMemo(
    () => cardAlerts(cardStatuses(state.matches || [], state.roster || [], state.season, settings.yellowsForBan)),
    [state.matches, state.roster, state.season, settings.yellowsForBan]
  );
  const officialGame = match?.type !== 'amigavel';
  const [sortByMinutes, setSortByMinutes] = useState(false);
  const eligiblePlayers = sortByMinutes
    ? [...squad].sort(
        (a, b) =>
          (minutesById.get(a.id)?.share ?? 1) - (minutesById.get(b.id)?.share ?? 1) ||
          (minutesById.get(a.id)?.minutes ?? 0) - (minutesById.get(b.id)?.minutes ?? 0)
      )
    : squad;

  const handleUpdateMatchField = (field: keyof ScheduledMatch, val: any) => {
    if (!match) return;
    const updatedSchedule = state.schedule.map((s) => {
      if (s.id === match.id) {
        return { ...s, [field]: val };
      }
      return s;
    });
    onUpdateState({ schedule: updatedSchedule });
  };

  const handleTogglePlayer = (playerId: string) => {
    if (!match) return;
    if (isFinalized && !isEditing) {
      setEditingMatchId(match.id);
      onShowToast('Modo de edição ativado ✓');
    }
    const isCalled = match.callup.includes(playerId);
    const availability = availabilityById.get(playerId);
    if (!isCalled && availability && !availability.available) {
      onShowToast(`⚠️ Atenção: ${availability.label} (convocado na mesma).`);
    }
    const newCallup = isCalled ? match.callup.filter((id) => id !== playerId) : [...match.callup, playerId];

    handleUpdateMatchField('callup', newCallup);
  };

  const handleSelectAll = () => {
    if (!match) return;
    const allIds = eligiblePlayers.filter((p) => isAvailable(p.id)).map((p) => p.id);
    handleUpdateMatchField('callup', allIds);
    const out = eligiblePlayers.length - allIds.length;
    onShowToast(
      `Todos os jogadores disponíveis convocados ✓${out ? ` (${out} lesionado(s)/castigado(s) de fora)` : ''}`
    );
  };

  const handleSelectByAttendance = () => {
    if (!match) return;
    // Seleciona atletas com pelo menos 70% de assiduidade ou que não tenham faltas excessivas
    const disciplined = eligiblePlayers.filter((p) => {
      if (!isAvailable(p.id)) return false;
      const att = getPlayerQuickAttendance(p.id, state);
      return att.rate >= 70 || att.totalTrainings === 0;
    });

    const ids = disciplined.map((p) => p.id);
    handleUpdateMatchField('callup', ids);
    onShowToast(`Convocatória Inteligente: ${ids.length} atletas selecionados por assiduidade (≥70%) ✓`);
  };

  const handleDeselectAll = () => {
    if (!match) return;
    handleUpdateMatchField('callup', []);
    onShowToast('Convocatória limpa ✓');
  };

  const handleGeneratePDF = async () => {
    if (!match) return;
    const calledPlayers = squad.filter((p) => match.callup.includes(p.id));
    const { generateConvocatoriaPDF } = await import('../../lib/pdfUtils');
    generateConvocatoriaPDF(match, calledPlayers, state);
    onShowToast('PDF da Convocatória gerado com marca de água BolaComVisao ✓');
  };

  const handleGenerateExcel = async () => {
    if (!match) return;
    const calledPlayers = squad.filter((p) => match.callup.includes(p.id));
    const { exportConvocatoriaExcel } = await import('../../lib/exportUtils');
    exportConvocatoriaExcel(match, calledPlayers, state);
    onShowToast('Excel da Convocatória gerado com marca de água BolaComVisao ✓');
  };

  if (!match || state.schedule.length === 0) {
    return (
      <div>
        <Header
          title="Convocatória"
          lang={state.lang}
          onGoHome={() => onNavigate('home')}
          onOpenSettings={onOpenSettings}
          onOpenDatabase={() => onNavigate('teams')}
          onOpenNotifications={onOpenNotifications}
          onOpenSync={onOpenSync}
          unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
          syncInfo={state.syncInfo}
          clubInfo={{
            clubName: state.myClubName,
            category: state.category,
            season: state.season,
            logoUrl: state.clubLogoUrl
          }}
        />
        <div className="ui-card mx-auto flex max-w-[640px] flex-col items-center gap-3 p-6 text-center">
          <Icon name="clipboard" className="h-7 w-7 text-ui-muted" />
          <p className="text-ui-lead font-bold text-ui-text">Sem jogos na Agenda</p>
          <p className="text-ui-body text-ui-muted">
            Marca um jogo na Agenda para poderes fazer a convocatória e gerar o PDF.
          </p>
          <button className="ui-btn ui-btn-secondary min-h-11 px-4" onClick={() => onNavigate('calendario')}>
            Ir para a Agenda
          </button>
        </div>
      </div>
    );
  }

  const calledCount = match.callup.length;
  const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const gameDay = `${WEEKDAYS[new Date(`${match.date}T12:00:00`).getDay()]} ${match.date.slice(8, 10)}/${match.date.slice(5, 7)}`;
  const competition = match.tournamentName || match.phase || '';
  const progress = eligiblePlayers.length ? Math.round((calledCount / eligiblePlayers.length) * 100) : 0;
  const detailsSummary = [match.meetingTime, match.venue].filter(Boolean).join(' · ');

  return (
    <div className="pb-[calc(10rem+env(safe-area-inset-bottom))] lg:pb-0">
      <Header
        title="Convocatória"
        lang={state.lang}
        onGoHome={() => onNavigate('home')}
        onOpenSettings={onOpenSettings}
        onOpenDatabase={() => onNavigate('teams')}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
        syncInfo={state.syncInfo}
        clubInfo={{
          clubName: state.myClubName,
          category: state.category,
          season: state.season,
          logoUrl: state.clubLogoUrl
        }}
      />

      {/* The game: who, when, where, and how far the call-up is */}
      <section aria-label="Jogo da convocatória" className="ui-card mb-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-ui-title font-bold leading-tight text-ui-text">vs {match.opponent}</div>
            <div className="mt-1 text-ui-body text-ui-muted">
              {gameDay} · {match.time} ·{' '}
              {match.location === 'casa' ? t(state.lang, 'match_home') : t(state.lang, 'match_away')}
              {competition ? ` · ${competition}` : ''}
            </div>
          </div>
          {state.schedule.length > 1 && (
            <CompactSelect
              label="Escolher o jogo"
              value={selectedMatchId}
              onChange={handleSelectMatch}
              className="shrink-0 text-ui-caption !text-ui-text"
              options={state.schedule.map((s) => [
                s.id,
                `${s.id === selectedMatchId ? 'Trocar' : s.opponent} ${s.id === selectedMatchId ? '' : `(${s.date.split('-').reverse().join('/')} - ${s.time}h)${s.callupFinalized ? ' ✓' : ''}`}`.trim()
              ])}
            />
          )}
        </div>
        <div className="mt-2">
          <WeatherBadge
            date={match.date}
            time={match.time}
            places={
              match.location === 'fora'
                ? [match.venue || '', townOfClub(match.opponent), settings.clubTown]
                : [settings.clubTown, match.venue || '']
            }
          />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ui-surface-2" aria-hidden="true">
          <div className="h-full rounded-full bg-ui-brand" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-ui-body text-ui-muted">
          {isFinalized && !isEditing ? (
            <span className="flex items-center gap-1.5 font-semibold text-ui-brand">
              <Icon name="tick" className="h-4 w-4 shrink-0" />
              Convocatória fechada · {calledCount} convocados
              {match.callupFinalizedAt ? ` · ${new Date(match.callupFinalizedAt).toLocaleDateString('pt-PT')}` : ''}
            </span>
          ) : (
            <span>
              <b className="tabular-nums text-ui-text">{calledCount}</b> de {eligiblePlayers.length} convocados
              {isFinalized && isEditing ? ' · a editar' : ''}
            </span>
          )}
        </div>
      </section>

      {/* What to do with it */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setShowLineup(true)}
          className="ui-btn ui-btn-secondary min-h-11 px-2 text-ui-body leading-tight"
          aria-label={`Imagem da equipa inicial${match.startingLineup ? ' (guardada)' : ''}`}
        >
          <Icon name="users" className="h-[18px] w-[18px] shrink-0" />
          Equipa inicial
          {match.startingLineup && <Icon name="tick" className="h-4 w-4 shrink-0 text-ui-brand" />}
        </button>
        <a
          href={directionsUrl(match)}
          target="_blank"
          rel="noopener noreferrer"
          className="ui-btn ui-btn-secondary min-h-11 px-2 text-ui-body leading-tight"
        >
          <Icon name="pin" className="h-[18px] w-[18px] shrink-0" />
          Como chegar
        </a>
        <button
          type="button"
          onClick={() => setShowShare(true)}
          className="ui-btn ui-btn-secondary min-h-11 px-2 text-ui-body leading-tight"
          aria-label="Enviar por WhatsApp"
        >
          <Icon name="message" className="h-[18px] w-[18px] shrink-0" />
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => setShowCallupImage(true)}
          className="ui-btn ui-btn-secondary min-h-11 px-2 text-ui-body leading-tight"
        >
          <Icon name="image" className="h-[18px] w-[18px] shrink-0" />
          Imagem para os pais
        </button>
      </div>
      {showCallupImage && (
        <Suspense fallback={null}>
          <CallupImageModal
            game={match}
            state={state}
            onShowToast={onShowToast}
            onClose={() => setShowCallupImage(false)}
          />
        </Suspense>
      )}
      {showLineup && (
        <Suspense fallback={null}>
          <LineupImageModal
            game={match}
            state={state}
            onSave={(updated) =>
              onUpdateState({ schedule: state.schedule.map((s) => (s.id === updated.id ? updated : s)) })
            }
            onShowToast={onShowToast}
            onClose={() => setShowLineup(false)}
          />
        </Suspense>
      )}

      <LastTimeAgainstCard
        matches={state.matches || []}
        roster={state.roster || []}
        opponent={match.opponent}
        collapsed
      />

      {/* Meeting time, pitch and notes: open only when needed */}
      <details className="ui-card mb-3 group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-ui-body font-semibold text-ui-text">
          <span>Concentração, campo e avisos</span>
          <span className="flex min-w-0 items-center gap-1 text-ui-caption font-normal text-ui-muted">
            <span className="truncate">{detailsSummary || 'por preencher'}</span>
            <Icon name="chevronDown" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="field mb-0">
              <label className="text-[11px]">Hora de concentração</label>
              <DateTimePT
                type="time"
                label="Hora de concentração"
                value={match.meetingTime || ''}
                onChange={(v) => handleUpdateMatchField('meetingTime', v)}
              />
            </div>
            <div className="field mb-0">
              <label className="text-[11px]">Estádio / campo</label>
              <input
                type="text"
                placeholder="Ex: Estádio Municipal"
                value={match.venue || ''}
                onChange={(e) => handleUpdateMatchField('venue', e.target.value)}
              />
            </div>
          </div>
          <div className="field mb-2">
            <label className="text-[11px]">Ponto de encontro</label>
            <input
              type="text"
              placeholder="Ex: Sede do clube / Balneários"
              value={match.meetingPoint || ''}
              onChange={(e) => handleUpdateMatchField('meetingPoint', e.target.value)}
            />
          </div>
          <div className="field mb-0">
            <label className="text-[11px]">Avisos para os jogadores</label>
            <textarea
              rows={2}
              className="ui-input w-full resize-none text-ui-body"
              placeholder="Ex: Trazer BI/CC e equipamento alternativo..."
              value={match.callupNotes || ''}
              onChange={(e) => handleUpdateMatchField('callupNotes', e.target.value)}
            />
          </div>
        </div>
      </details>

      {/* Players */}
      <section className="mb-3" id="convocatoria-players-selection" aria-label="Atletas">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-ui-lead font-bold text-ui-text">
            Atletas{' '}
            <span className="tabular-nums text-ui-muted">
              {calledCount}/{eligiblePlayers.length}
            </span>
          </h2>
          <div className="flex items-center gap-1 text-ui-caption font-semibold text-ui-brand [&>button]:min-h-9 [&>button]:rounded-ui-sm [&>button]:px-2 [&>button:hover]:bg-ui-surface-2">
            <button type="button" onClick={handleSelectByAttendance} title="Convocar os atletas com assiduidade ≥70%">
              Por assiduidade
            </button>
            <button type="button" onClick={handleSelectAll}>
              Todos
            </button>
            <button type="button" onClick={handleDeselectAll}>
              Limpar
            </button>
          </div>
        </div>

        {eligiblePlayers.length === 0 ? (
          <div className="ui-card py-4 text-center text-ui-body text-ui-muted">
            Ainda não adicionaste jogadores ao plantel.
            <button className="ml-1 font-bold text-ui-brand underline" onClick={() => onNavigate('plantel')}>
              Adicionar Jogadores
            </button>
          </div>
        ) : (
          <>
            {officialGame && (cards.suspended.length > 0 || cards.atRisk.length > 0) && (
              <div
                role="note"
                aria-label="Cartões"
                className="mb-2 space-y-1.5 rounded-ui-lg border border-ui-danger/30 bg-ui-danger-soft p-3 text-ui-caption text-ui-text"
              >
                {cards.suspended.map((c) => (
                  <div key={c.playerId} className="flex items-start gap-2">
                    <span aria-hidden className="mt-0.5 h-3.5 w-2.5 shrink-0 rounded-[2px] bg-ui-danger" />
                    <span>
                      <b>{c.name}</b> tem {c.pendingGames} jogo{c.pendingGames > 1 ? 's' : ''} de castigo por cumprir (
                      {c.reasons.join(', ')}){match.callup.includes(c.playerId) ? ' · está convocado!' : ''}
                    </span>
                  </div>
                ))}
                {cards.atRisk.map((c) => (
                  <div key={c.playerId} className="flex items-start gap-2">
                    <span aria-hidden className="mt-0.5 h-3.5 w-2.5 shrink-0 rounded-[2px] bg-ui-warning" />
                    <span>
                      <b>{c.name}</b> tem {c.yellows} amarelos: mais um e fica de castigo
                    </span>
                  </div>
                ))}
              </div>
            )}
            {calledUnavailable.length > 0 && (
              <div
                role="alert"
                className="mb-2 flex items-start gap-2 rounded-ui-lg border border-ui-danger/30 bg-ui-danger-soft p-3 text-ui-caption text-ui-text"
              >
                <Icon name="alert" className="mt-px h-4 w-4 shrink-0 text-ui-danger" />
                <span>
                  Convocados indisponíveis neste jogo:{' '}
                  {calledUnavailable.map((p) => `${p.name} (${availabilityById.get(p.id)?.label})`).join(', ')}
                </span>
              </div>
            )}
            {needMinutes.length > 0 && (
              <div
                role="note"
                aria-label="Com menos minutos"
                className="mb-2 space-y-1.5 rounded-ui-lg border border-ui-warning/30 bg-ui-warning-soft p-3 text-ui-caption text-ui-text"
              >
                <div className="font-bold text-ui-warning">Com menos minutos (só um alerta)</div>
                <div className="flex flex-wrap gap-1">
                  {needMinutes.map((r) => (
                    <span key={r.playerId} className="rounded-full bg-ui-surface-2 px-2 py-0.5">
                      {r.name}{' '}
                      <b>
                        {Math.round(r.callupShare * 100)}%
                        {r.leftOutRecently >= 2 ? ` · fora ${r.leftOutRecently}/${RECENT_GAMES}` : ''}
                      </b>
                    </span>
                  ))}
                </div>
                <div className="text-ui-muted">
                  % = minutos jogados dos jogos em que foi convocado · fora = não convocado nos últimos jogos
                </div>
              </div>
            )}
            <div className="flex justify-end mb-1.5">
              <button
                type="button"
                onClick={() => setSortByMinutes((v) => !v)}
                className="flex min-h-9 items-center gap-1.5 rounded-ui-sm px-2 text-ui-caption font-semibold text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
              >
                <Icon name="sort" className="h-4 w-4" />
                {sortByMinutes ? 'Ordenar por número' : 'Quem jogou menos primeiro'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {eligiblePlayers.map((p) => {
                const isCalled = match.callup.includes(p.id);
                const availability = availabilityById.get(p.id);
                const att = getPlayerQuickAttendance(p.id, state);
                const mins = minutesById.get(p.id);
                const hasNumber = p.number !== null && p.number !== undefined && `${p.number}` !== '';
                const facts = [
                  p.positions || '',
                  att.totalTrainings > 0 ? `${att.rate}% treinos` : '',
                  mins && mins.matchesCalledUp > 0
                    ? `${mins.minutes}' · ${Math.round(mins.callupShare * 100)}% conv.${mins.leftOutRecently >= 2 ? ` · fora ${mins.leftOutRecently}/${RECENT_GAMES}` : ''}`
                    : mins
                      ? 'sem jogos esta época'
                      : ''
                ].filter(Boolean);

                return (
                  <div
                    key={p.id}
                    onClick={() => handleTogglePlayer(p.id)}
                    role="checkbox"
                    aria-checked={isCalled}
                    className={`ui-card flex min-h-14 cursor-pointer touch-manipulation select-none items-center gap-3 px-3 py-2 transition-colors hover:bg-ui-surface-2 active:scale-[0.99] ${
                      availability && !availability.available && !isCalled ? 'opacity-60 ' : ''
                    }${isCalled ? '!border-ui-brand/50' : ''}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isCalled ? 'bg-ui-brand text-ui-bg' : 'border-2 border-ui-line-strong text-transparent'
                      }`}
                      aria-hidden="true"
                    >
                      <Icon name="tick" className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt=""
                        className="w-9 h-9 shrink-0 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="ui-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-ui-body font-bold tabular-nums text-ui-text">
                        {hasNumber ? p.number : '–'}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-ui-body font-bold ${isCalled ? 'text-ui-text' : 'text-ui-muted'}`}>
                        {p.photoUrl && hasNumber && <span className="mr-1 text-ui-muted">#{p.number}</span>}
                        <span>{p.name}</span>
                      </div>
                      {availability?.label ? (
                        <div
                          className={`flex items-center gap-1 truncate text-ui-caption font-semibold ${
                            availability.available ? 'text-ui-success' : 'text-ui-danger'
                          }`}
                        >
                          <Icon name={availability.available ? 'tick' : 'alert'} className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{availability.label}</span>
                        </div>
                      ) : (
                        <div
                          className={`truncate text-ui-caption ${mins?.fewestMinutes ? 'text-ui-warning' : 'text-ui-muted'}`}
                        >
                          {facts.join(' · ')}
                          {att.consecutiveAbsences >= 2 ? ` · ${att.consecutiveAbsences} faltas seguidas` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <SetPiecesCard state={state} callup={match.callup} onUpdateState={onUpdateState} onShowToast={onShowToast} />

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button className="ui-btn ui-btn-secondary min-h-11 px-4 text-ui-body" onClick={handleGeneratePDF}>
          <Icon name="file" className="h-[18px] w-[18px]" />
          PDF
        </button>
        <button className="ui-btn ui-btn-secondary min-h-11 px-4 text-ui-body" onClick={handleGenerateExcel}>
          <Icon name="chart" className="h-[18px] w-[18px]" />
          Excel
        </button>
      </div>

      {/* Main action, always at hand above the bottom bar */}
      <div className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 mx-auto max-w-5xl px-3 lg:pointer-events-auto lg:sticky lg:bottom-0 lg:mt-4 lg:flex lg:max-w-none lg:justify-end lg:border-t lg:border-ui-line lg:bg-ui-bg/90 lg:px-0 lg:py-3 lg:backdrop-blur">
        {isFinalized && !isEditing ? (
          <button
            type="button"
            onClick={handleStartEditing}
            className="ui-btn ui-btn-secondary pointer-events-auto min-h-12 w-full px-6 text-ui-lead shadow-2xl lg:w-auto"
          >
            <Icon name="pencil" className="h-5 w-5" />
            Editar Convocatória
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalizeCallup}
            className="ui-btn ui-btn-primary pointer-events-auto min-h-12 w-full px-6 text-ui-lead shadow-2xl lg:w-auto"
          >
            <Icon name="tick" className="h-5 w-5" />
            Finalizar Convocatória ({calledCount})
          </button>
        )}
      </div>
      {showShare && (
        <CallupShareModal match={match} state={state} onClose={() => setShowShare(false)} onShowToast={onShowToast} />
      )}
    </div>
  );
};
