import React, { useMemo, useState } from 'react';
import { AppState, ScheduledMatch } from '../../types';
import { t } from '../../i18n/dict';
import { sortPlayerObjs } from '../../lib/utils';
import { getPlayerQuickAttendance } from '../../lib/intelligenceEngine';
import { Header } from '../Header';
import { CallupShareModal } from '../CallupShareModal';
import { upcomingGames } from '../../lib/preMatchPlan';
import { callupPlayingTime, playersNeedingMinutes, RECENT_GAMES } from '../../lib/callupPlayingTime';
import { availabilityOn } from '../../lib/availability';

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
  const [sortByMinutes, setSortByMinutes] = useState(false);
  const eligiblePlayers = sortByMinutes
    ? [...squad].sort(
        (a, b) =>
          (minutesById.get(a.id)?.share ?? 1) - (minutesById.get(b.id)?.share ?? 1) ||
          (minutesById.get(a.id)?.minutes ?? 0) - (minutesById.get(b.id)?.minutes ?? 0)
      )
    : squad;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Por favor seleciona um ficheiro de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        onUpdateState({ clubLogoUrl: dataUrl });
        onShowToast('Símbolo do clube atualizado ✓');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    onUpdateState({ clubLogoUrl: undefined });
    onShowToast('Símbolo removido ✓');
  };

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

  return (
    <div className="pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
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

      {/* Select Match Header */}
      {state.schedule.length > 1 && (
        <div className="card mb-3 p-3">
          <label className="text-xs text-gold uppercase font-bold block mb-1.5">🎯 Selecionar Jogo Agendado:</label>
          <select
            className="w-full bg-surface border border-line rounded-lg p-2.5 text-xs text-chalk font-semibold"
            value={selectedMatchId}
            onChange={(e) => handleSelectMatch(e.target.value)}
          >
            {state.schedule.map((s) => (
              <option key={s.id} value={s.id}>
                {s.opponent} ({s.date.split('-').reverse().join('/')} - {s.time}h)
                {s.callupFinalized ? ' ✓ [Finalizada]' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Finalized Status Banner */}
      {isFinalized && !isEditing ? (
        <div className="card mb-3 p-3.5 bg-emerald-950/70 border-emerald-500/50 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl shrink-0">✅</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-['Chakra_Petch'] font-black uppercase tracking-wider text-emerald-300">
                    Convocatória Finalizada
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    {calledCount} convocados
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5">
                  Esta convocatória está concluída e pronta para envio. Clica em "Editar" se precisares de efetuar
                  alterações.
                  {match.callupFinalizedAt
                    ? ` • ${new Date(match.callupFinalizedAt).toLocaleDateString('pt-PT')} ${new Date(match.callupFinalizedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartEditing}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0"
              title="Reabrir convocatória para editar jogadores ou informações"
            >
              <span>✏️</span>
              <span>Editar Convocatória</span>
            </button>
          </div>
        </div>
      ) : isFinalized && isEditing ? (
        <div className="card mb-3 p-3.5 bg-amber-950/70 border-amber-500/50 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl shrink-0">✏️</span>
              <div>
                <span className="text-xs font-['Chakra_Petch'] font-black uppercase tracking-wider text-amber-300">
                  Modo de Edição Ativo
                </span>
                <div className="text-[11px] text-amber-400/80 font-mono mt-0.5">
                  Podes alterar atletas, horários e notas. Quando terminares, clica em "Finalizar Convocatória".
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinalizeCallup}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0"
              title="Concluir e finalizar convocatória"
            >
              <span>✓</span>
              <span>Finalizar Convocatória</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="card mb-3 p-3 bg-slate-900/90 border-cyan-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <div>
                <span className="text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider text-cyan-300">
                  Convocatória em Preparação
                </span>
                <span className="text-[11px] text-slate-400 ml-2 font-mono">
                  ({calledCount}/{eligiblePlayers.length} atletas)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinalizeCallup}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0"
              title="Finalizar convocatória"
            >
              <span>✓</span>
              <span>Finalizar Convocatória</span>
            </button>
          </div>
        </div>
      )}

      {/* Club Logo / Symbol Section */}
      <div className="card mb-3 p-3.5 bg-surface-2 border-gold-dim">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center overflow-hidden shrink-0">
              {state.clubLogoUrl ? (
                <img src={state.clubLogoUrl} alt="Símbolo do Clube" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xl">🛡️</span>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-gold uppercase tracking-wider">Símbolo do Clube</div>
              <div className="text-[11px] text-muted">Aparece no topo do PDF gerado</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="btn btn-outline text-xs py-1.5 px-3 cursor-pointer inline-flex items-center gap-1">
              📷 {state.clubLogoUrl ? 'Alterar' : 'Carregar'}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            {state.clubLogoUrl && (
              <button className="text-[10px] text-red-400 hover:underline text-right" onClick={handleRemoveLogo}>
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Match Information Inputs */}
      <div className="card mb-3 p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold text-chalk">
            ⚽ {state.myClubName || 'A Minha Equipa'} vs <span className="text-gold">{match.opponent}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`badge-loc ${match.location === 'casa' ? 'casa' : 'fora'}`}>
              {match.location === 'casa' ? t(state.lang, 'match_home') : t(state.lang, 'match_away')}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted mb-3 flex items-center gap-2">
          <span>📅 {match.date.split('-').reverse().join('/')}</span>
          <span>⏱️ {match.time}h</span>
          {match.tournamentName && <span>🏆 {match.tournamentName}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="field mb-0">
            <label className="text-[11px]">⏰ Hora Concentração</label>
            <input
              type="time"
              value={match.meetingTime || ''}
              onChange={(e) => handleUpdateMatchField('meetingTime', e.target.value)}
            />
          </div>
          <div className="field mb-0">
            <label className="text-[11px]">🏟️ Estádio / Campo</label>
            <input
              type="text"
              placeholder="Ex: Estádio Municipal"
              value={match.venue || ''}
              onChange={(e) => handleUpdateMatchField('venue', e.target.value)}
            />
          </div>
        </div>

        <div className="field mb-2">
          <label className="text-[11px]">📍 Ponto de Encontro</label>
          <input
            type="text"
            placeholder="Ex: Sede do clube / Balneários"
            value={match.meetingPoint || ''}
            onChange={(e) => handleUpdateMatchField('meetingPoint', e.target.value)}
          />
        </div>

        <div className="field mb-0">
          <label className="text-[11px]">📝 Observações / Avisos para os Jogadores</label>
          <textarea
            rows={2}
            className="w-full bg-surface border border-line rounded-lg p-2 text-xs text-chalk resize-none"
            placeholder="Ex: Trazer BI/CC e equipamento alternativo..."
            value={match.callupNotes || ''}
            onChange={(e) => handleUpdateMatchField('callupNotes', e.target.value)}
          />
        </div>
      </div>

      {/* Players Selection Grid */}
      <div className="card mb-3 p-3.5" id="convocatoria-players-selection">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div>
            <div className="text-xs font-bold text-gold uppercase tracking-wider">
              📋 Jogadores Convocados ({calledCount}/{eligiblePlayers.length})
            </div>
            <div className="text-[11px] text-muted">Toca nos jogadores para convocar ou retirar</div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              className="text-[10px] sm:text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-3 py-1.5 min-h-[36px] rounded-lg hover:bg-cyan-900/60 hover:text-cyan-200 transition-colors flex items-center gap-1 active:scale-95 touch-manipulation cursor-pointer"
              onClick={handleSelectByAttendance}
              title="Convocar automaticamente atletas com assiduidade ≥70%"
            >
              <span>⚡</span>
              <span>Por Assiduidade</span>
            </button>
            <button
              className="text-[10px] sm:text-xs font-bold text-gold bg-gold-dim border border-gold-dim px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-gold hover:text-black transition-colors active:scale-95 touch-manipulation cursor-pointer"
              onClick={handleSelectAll}
            >
              Todos
            </button>
            <button
              className="text-[10px] sm:text-xs font-bold text-muted bg-surface border border-line px-2.5 py-1.5 min-h-[36px] rounded-lg hover:text-chalk transition-colors active:scale-95 touch-manipulation cursor-pointer"
              onClick={handleDeselectAll}
            >
              Limpar
            </button>
          </div>
        </div>

        {eligiblePlayers.length === 0 ? (
          <div className="text-xs text-muted text-center py-4">
            Ainda não adicionaste jogadores ao plantel.
            <button className="text-gold font-bold ml-1 underline" onClick={() => onNavigate('plantel')}>
              Adicionar Jogadores
            </button>
          </div>
        ) : (
          <>
            {calledUnavailable.length > 0 && (
              <div
                role="alert"
                className="mb-2.5 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-[11px] text-rose-100"
              >
                ⚠️ Convocados indisponíveis neste jogo:{' '}
                {calledUnavailable.map((p) => `${p.name} (${availabilityById.get(p.id)?.label})`).join(', ')}
              </div>
            )}
            {needMinutes.length > 0 && (
              <div
                role="note"
                aria-label="Precisam de minutos"
                className="mb-2.5 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-100 space-y-1"
              >
                <div className="font-bold text-amber-300">⚖️ Precisam de minutos</div>
                <div className="flex flex-wrap gap-1">
                  {needMinutes.map((r) => (
                    <span
                      key={r.playerId}
                      className="px-2 py-0.5 rounded-full bg-amber-900/50 border border-amber-500/30"
                    >
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
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setSortByMinutes((v) => !v)}
                className="text-[11px] font-bold text-cyan-300 bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-lg"
              >
                {sortByMinutes ? '↕ Ordenar por número' : '↕ Quem jogou menos primeiro'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {eligiblePlayers.map((p) => {
                const isCalled = match.callup.includes(p.id);
                const availability = availabilityById.get(p.id);
                const att = getPlayerQuickAttendance(p.id, state);
                const mins = minutesById.get(p.id);

                const attBadgeColor =
                  att.totalTrainings === 0
                    ? 'text-slate-500'
                    : att.rate >= 80
                      ? 'text-emerald-400 font-bold'
                      : att.rate >= 60
                        ? 'text-amber-400 font-bold'
                        : 'text-rose-400 font-bold';

                return (
                  <div
                    key={p.id}
                    onClick={() => handleTogglePlayer(p.id)}
                    className={`p-2.5 min-h-[48px] rounded-xl border text-left cursor-pointer transition-all active:scale-[0.98] touch-manipulation flex items-center justify-between gap-2.5 select-none ${
                      availability && !availability.available && !isCalled ? 'opacity-60 ' : ''
                    }${
                      isCalled
                        ? 'bg-gold-dim border-gold text-gold font-bold shadow-sm'
                        : 'bg-surface border-line text-muted hover:border-line-bright'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      {/* Player Photo / Avatar */}
                      <div
                        className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center ${
                          isCalled ? 'border-gold/60 bg-gold/10' : 'border-line bg-surface-2'
                        }`}
                      >
                        {p.photoUrl ? (
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className={`text-[10px] font-bold ${isCalled ? 'text-gold' : 'text-cyan-400'}`}>
                            {p.number !== null && p.number !== undefined
                              ? `#${p.number}`
                              : p.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="truncate">
                        <div className="text-xs truncate flex items-center gap-1.5">
                          <span className="font-mono text-[11px] opacity-80 shrink-0">
                            {p.number !== null ? `#${p.number}` : '-'}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
                          {/* Assiduidade aos treinos */}
                          <span className={attBadgeColor}>
                            {att.totalTrainings > 0 ? `${att.rate}% assid.` : 'Sem treinos'}
                          </span>

                          {/* Alerta de faltas consecutivas */}
                          {att.consecutiveAbsences >= 2 && (
                            <span className="text-rose-400 font-bold bg-rose-950/60 px-1 rounded">
                              ⚠️ {att.consecutiveAbsences} faltas
                            </span>
                          )}

                          {p.positions && <span className="opacity-60 truncate font-normal">{p.positions}</span>}
                        </div>

                        {/* Lesão ou castigo neste dia (ou regresso já previsto) */}
                        {availability?.label && (
                          <div
                            className={`text-[10px] font-mono mt-0.5 font-bold ${
                              availability.available ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {availability.available ? '✓ ' : availability.status === 'lesionado' ? '🏥 ' : '🟥 '}
                            {availability.label}
                          </div>
                        )}

                        {/* Minutos da época */}
                        {mins && mins.matchesCalledUp === 0 && (
                          <div className="text-[10px] font-mono mt-0.5 text-amber-300">⏱ sem jogos esta época</div>
                        )}
                        {mins && mins.matchesCalledUp > 0 && (
                          <div
                            className={`text-[10px] font-mono mt-0.5 ${mins.belowTarget ? 'text-amber-300 font-bold' : 'text-slate-400'}`}
                          >
                            ⏱ {mins.minutes}' · {Math.round(mins.share * 100)}% · {mins.matchesPlayed}/
                            {mins.matchesCalledUp} jogos
                            {mins.leftOutRecently >= 2 ? ` · fora ${mins.leftOutRecently}/${RECENT_GAMES}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        isCalled ? 'bg-gold text-black' : 'border border-line text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {/* Main Finalize / Edit Action Button */}
        {isFinalized && !isEditing ? (
          <button
            type="button"
            onClick={handleStartEditing}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Chakra_Petch'] font-black text-sm uppercase transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
          >
            <span>✏️</span>
            <span>Editar Convocatória (Reabrir)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalizeCallup}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-sm uppercase transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 cursor-pointer"
          >
            <span>✓</span>
            <span>Finalizar Convocatória</span>
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            className="btn btn-gold w-full text-xs sm:text-sm font-bold py-3 flex items-center justify-center gap-2 shadow-md"
            onClick={handleGeneratePDF}
          >
            <span>📄</span>
            <span>Exportar PDF (BolaComVisao)</span>
          </button>

          <button
            className="btn btn-outline w-full text-xs sm:text-sm font-bold py-3 flex items-center justify-center gap-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40"
            onClick={handleGenerateExcel}
          >
            <span>📊</span>
            <span>Exportar Excel (.xlsx)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            className="btn btn-green w-full text-xs font-semibold py-2.5 flex items-center justify-center gap-2"
            onClick={() => setShowShare(true)}
          >
            <span>💬</span>
            <span>Enviar por WhatsApp</span>
          </button>
        </div>
      </div>
      {showShare && (
        <CallupShareModal match={match} state={state} onClose={() => setShowShare(false)} onShowToast={onShowToast} />
      )}
    </div>
  );
};
