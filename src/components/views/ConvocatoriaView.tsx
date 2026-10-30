import React, { lazy, Suspense, useMemo, useState } from 'react';
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
          clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
        />
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-base font-bold text-chalk mb-2">Sem Jogos no Calendário</div>
          <p className="text-xs text-muted mb-4">
            Agenda um jogo no calendário para poderes criar a convocatória e gerar o PDF.
          </p>
          <button className="btn btn-gold" onClick={() => onNavigate('calendario')}>
            + Ir para Calendário
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
    <div className="pb-[calc(10rem+env(safe-area-inset-bottom))]">
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
        clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
      />

      {/* The game: who, when, where, and how far the call-up is */}
      <section aria-label="Jogo da convocatória" className="ui-card p-3.5 mb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold text-white leading-tight truncate">vs {match.opponent}</div>
            <div className="text-xs text-slate-400 mt-0.5">
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
              className="shrink-0 text-xs !text-slate-300"
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
        <div className="mt-2.5 h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-400">
          {isFinalized && !isEditing ? (
            <span className="text-emerald-300 font-semibold">
              ✓ Convocatória fechada · {calledCount} convocados
              {match.callupFinalizedAt ? ` · ${new Date(match.callupFinalizedAt).toLocaleDateString('pt-PT')}` : ''}
            </span>
          ) : (
            <span>
              <b className="text-slate-100">{calledCount}</b> de {eligiblePlayers.length} convocados
              {isFinalized && isEditing ? ' · a editar' : ''}
            </span>
          )}
        </div>
      </section>

      {/* What to do with it */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <button
          type="button"
          onClick={() => setShowLineup(true)}
          className="ui-btn ui-btn-secondary px-2 py-2.5 text-xs leading-tight"
          aria-label={`Imagem da equipa inicial${match.startingLineup ? ' (guardada)' : ''}`}
        >
          🖼️ Equipa inicial{match.startingLineup ? ' ✓' : ''}
        </button>
        <a
          href={directionsUrl(match)}
          target="_blank"
          rel="noopener noreferrer"
          className="ui-btn ui-btn-secondary px-2 py-2.5 text-xs leading-tight flex items-center justify-center"
        >
          🗺️ Como chegar
        </a>
        <button
          type="button"
          onClick={() => setShowShare(true)}
          className="ui-btn ui-btn-secondary px-2 py-2.5 text-xs leading-tight"
          aria-label="Enviar por WhatsApp"
        >
          💬 WhatsApp
        </button>
        <button
          type="button"
          onClick={() => setShowCallupImage(true)}
          className="ui-btn ui-btn-secondary px-2 py-2.5 text-xs leading-tight"
        >
          🖼️ Imagem para os pais
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
        <summary className="flex items-center justify-between gap-2 px-3.5 py-3 cursor-pointer list-none text-sm font-semibold text-slate-100">
          <span>Concentração, campo e avisos</span>
          <span className="text-xs font-normal text-slate-400 truncate">{detailsSummary || 'por preencher'} ▾</span>
        </summary>
        <div className="px-3.5 pb-3.5">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="field mb-0">
              <label className="text-[11px]">Hora de concentração</label>
              <input
                type="time"
                value={match.meetingTime || ''}
                onChange={(e) => handleUpdateMatchField('meetingTime', e.target.value)}
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
              className="w-full bg-surface border border-line rounded-lg p-2 text-xs text-chalk resize-none"
              placeholder="Ex: Trazer BI/CC e equipamento alternativo..."
              value={match.callupNotes || ''}
              onChange={(e) => handleUpdateMatchField('callupNotes', e.target.value)}
            />
          </div>
        </div>
      </details>

      {/* Players */}
      <section className="mb-3" id="convocatoria-players-selection" aria-label="Atletas">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Atletas ({calledCount}/{eligiblePlayers.length})
          </h2>
          <div className="flex items-center gap-3 text-xs font-semibold text-cyan-400">
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
          <div className="ui-card text-xs text-slate-400 text-center py-4">
            Ainda não adicionaste jogadores ao plantel.
            <button className="text-cyan-400 font-bold ml-1 underline" onClick={() => onNavigate('plantel')}>
              Adicionar Jogadores
            </button>
          </div>
        ) : (
          <>
            {officialGame && (cards.suspended.length > 0 || cards.atRisk.length > 0) && (
              <div
                role="note"
                aria-label="Cartões"
                className="mb-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-100 space-y-1"
              >
                {cards.suspended.map((c) => (
                  <div key={c.playerId}>
                    🟥 <b>{c.name}</b> tem {c.pendingGames} jogo{c.pendingGames > 1 ? 's' : ''} de castigo por cumprir (
                    {c.reasons.join(', ')}){match.callup.includes(c.playerId) ? ' · está convocado!' : ''}
                  </div>
                ))}
                {cards.atRisk.map((c) => (
                  <div key={c.playerId} className="text-amber-200">
                    🟨 <b>{c.name}</b> tem {c.yellows} amarelos: mais um e fica de castigo
                  </div>
                ))}
              </div>
            )}
            {calledUnavailable.length > 0 && (
              <div
                role="alert"
                className="mb-2 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-[11px] text-rose-100"
              >
                ⚠️ Convocados indisponíveis neste jogo:{' '}
                {calledUnavailable.map((p) => `${p.name} (${availabilityById.get(p.id)?.label})`).join(', ')}
              </div>
            )}
            {needMinutes.length > 0 && (
              <div
                role="note"
                aria-label="Precisam de minutos"
                className="mb-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-100 space-y-1"
              >
                <div className="font-bold text-amber-300">Precisam de minutos</div>
                <div className="flex flex-wrap gap-1">
                  {needMinutes.map((r) => (
                    <span key={r.playerId} className="px-2 py-0.5 rounded-full bg-amber-900/40">
                      {r.name}{' '}
                      <b>
                        {r.availableMinutes > 0 ? `${Math.round(r.share * 100)}%` : 'sem jogos'}
                        {r.leftOutRecently >= 2 ? ` · fora ${r.leftOutRecently}/${RECENT_GAMES}` : ''}
                      </b>
                    </span>
                  ))}
                </div>
                <div className="text-amber-200/70">
                  % = minutos jogados de todos os minutos dos jogos · fora = não convocado nos últimos jogos
                </div>
              </div>
            )}
            <div className="flex justify-end mb-1.5">
              <button
                type="button"
                onClick={() => setSortByMinutes((v) => !v)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200"
              >
                {sortByMinutes ? '↕ Ordenar por número' : '↕ Quem jogou menos primeiro'}
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
                    ? `${mins.minutes}' · ${Math.round(mins.share * 100)}%${mins.leftOutRecently >= 2 ? ` · fora ${mins.leftOutRecently}/${RECENT_GAMES}` : ''}`
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
                    className={`ui-card px-3 py-2 min-h-[52px] cursor-pointer active:scale-[0.99] touch-manipulation flex items-center gap-3 select-none ${
                      availability && !availability.available && !isCalled ? 'opacity-60 ' : ''
                    }${isCalled ? 'border-emerald-500/50' : ''}`}
                  >
                    <span
                      className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                        isCalled ? 'bg-emerald-500 text-slate-950' : 'border-2 border-slate-600 text-transparent'
                      }`}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt=""
                        className="w-9 h-9 shrink-0 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="ui-inset w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white">
                        {hasNumber ? p.number : '–'}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-bold truncate ${isCalled ? 'text-white' : 'text-slate-300'}`}>
                        {p.photoUrl && hasNumber && <span className="text-slate-400 mr-1">#{p.number}</span>}
                        <span>{p.name}</span>
                      </div>
                      {availability?.label ? (
                        <div
                          className={`text-[11px] font-semibold truncate ${
                            availability.available ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {availability.available ? '✓ ' : availability.status === 'lesionado' ? '🏥 ' : '🟥 '}
                          {availability.label}
                        </div>
                      ) : (
                        <div
                          className={`text-[11px] truncate ${mins?.belowTarget ? 'text-amber-300' : 'text-slate-400'}`}
                        >
                          {facts.join(' · ')}
                          {att.consecutiveAbsences >= 2 ? ` · ⚠️ ${att.consecutiveAbsences} faltas` : ''}
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

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button className="ui-btn ui-btn-secondary py-2.5 text-xs" onClick={handleGeneratePDF}>
          📄 PDF
        </button>
        <button className="ui-btn ui-btn-secondary py-2.5 text-xs" onClick={handleGenerateExcel}>
          📊 Excel
        </button>
      </div>

      {/* Main action, always at hand above the bottom bar */}
      <div className="fixed left-0 right-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-3 max-w-5xl mx-auto pointer-events-none">
        {isFinalized && !isEditing ? (
          <button
            type="button"
            onClick={handleStartEditing}
            className="pointer-events-auto ui-btn ui-btn-secondary w-full py-3.5 text-sm shadow-2xl flex items-center justify-center gap-2"
          >
            ✏️ Editar Convocatória
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalizeCallup}
            className="pointer-events-auto ui-btn ui-btn-primary w-full py-3.5 text-sm shadow-2xl flex items-center justify-center gap-2"
          >
            ✓ Finalizar Convocatória ({calledCount})
          </button>
        )}
      </div>
      {showShare && (
        <CallupShareModal match={match} state={state} onClose={() => setShowShare(false)} onShowToast={onShowToast} />
      )}
    </div>
  );
};
