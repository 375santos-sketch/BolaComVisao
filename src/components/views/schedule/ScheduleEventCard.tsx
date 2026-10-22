import React, { useState } from 'react';
import { CalendarEvent } from './types';
import { AppState, ScheduledMatch, Training, StaffUnavailability, ClubEvent } from '../../../types';
import { CallupShareModal } from '../../CallupShareModal';

interface ScheduleEventCardProps {
  ev: CalendarEvent;
  state?: AppState;
  isExpanded?: boolean;
  setExpandedEventId?: (id: string | null) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onShowConfirm: (msg: string, onOk: () => void) => void;
  handleConvertScheduledToLiveMatch: (id: string) => void;
  handleEditMatch: (match: ScheduledMatch) => void;
  handleDeleteScheduledMatch: (id: string) => void;
  handleEditClubEvent: (event: ClubEvent) => void;
  handleToggleClubEventStatus?: (id: string, isCompleted: boolean) => void;
  handleDeleteClubEvent: (id: string) => void;
  handleEditStaff: (staff: StaffUnavailability) => void;
  handleDeleteStaff: (id: string) => void;
  handleToggleTrainingStatus: (id: string, isCompleted: boolean) => void;
  handleEditTraining: (training: Training) => void;
  handleDeleteTraining: (id: string) => void;
}

export const ScheduleEventCard: React.FC<ScheduleEventCardProps> = ({
  ev,
  state,
  isExpanded = false,
  setExpandedEventId,
  onNavigate,
  onShowConfirm,
  handleConvertScheduledToLiveMatch,
  handleEditMatch,
  handleDeleteScheduledMatch,
  handleEditClubEvent,
  handleToggleClubEventStatus,
  handleDeleteClubEvent,
  handleEditStaff,
  handleDeleteStaff,
  handleToggleTrainingStatus,
  handleEditTraining,
  handleDeleteTraining
}) => {
  const isMatch = ev.category === 'match';
  const isStaff = ev.category === 'staff_unavailability';
  const isClub = ev.category === 'club_event';
  const formattedDate = ev.date.split('-').reverse().join('/');

  const toggleExpand = () => {
    if (setExpandedEventId) {
      setExpandedEventId(isExpanded ? null : ev.id);
    }
  };

  // WhatsApp call-up: the same message as the Convocatória screen, editable before sending.
  const [shareCallup, setShareCallup] = useState<ScheduledMatch | null>(null);
  const callupShareModal = shareCallup && state && (
    <CallupShareModal match={shareCallup} state={state} onClose={() => setShareCallup(null)} />
  );

  if (isMatch) {
    const s = ev.rawScheduledMatch;
    const m = ev.rawFinishedMatch;

    return (
      <div
        key={ev.id}
        className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 transition-all shadow-md space-y-3"
      >
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono font-bold flex items-center gap-1">
              <span>⚽</span>
              <span>JOGO {m ? '(REALIZADO)' : '(AGENDADO)'}</span>
            </span>

            <div className="text-sm font-black font-['Chakra_Petch'] text-white">
              📅 {formattedDate} às {ev.time}h
            </div>

            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                ev.location?.includes('Casa')
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
              }`}
            >
              {ev.location}
            </span>

            {ev.tournamentName && (
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                🏆 {ev.tournamentName} {ev.phase ? `(${ev.phase})` : ''}
              </span>
            )}
            {!ev.tournamentName && ev.phase && (
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                🏆 {ev.phase}
              </span>
            )}
          </div>

          {/* Quick Action Buttons for Match */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {s && (
              <button
                type="button"
                onClick={() => handleConvertScheduledToLiveMatch(s.id)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1"
                title="Começar Jogo no Cronómetro"
              >
                <span>▶</span>
                <span>Iniciar Jogo</span>
              </button>
            )}

            {s && (
              <button
                type="button"
                onClick={() => handleEditMatch(s)}
                className="p-1.5 px-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-300 text-xs font-mono"
                title="Editar Jogo"
              >
                ✏️ Editar
              </button>
            )}

            {s && (
              <button
                type="button"
                onClick={() => {
                  onShowConfirm('Tens a certeza que desejas eliminar este jogo cancelado da agenda?', () =>
                    handleDeleteScheduledMatch(s.id)
                  );
                }}
                className="p-1.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 text-xs"
                title="Eliminar Jogo Cancelado"
              >
                🗑️
              </button>
            )}

            {m && (
              <button
                type="button"
                onClick={() => {
                  onShowConfirm('Tens a certeza que desejas eliminar este jogo da agenda?', () =>
                    handleDeleteScheduledMatch(m.id)
                  );
                }}
                className="p-1.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 text-xs"
                title="Eliminar Jogo"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Opponent & Match Title */}
        <div
          onClick={() => {
            if (s) handleEditMatch(s);
            else if (m) onNavigate('jogos', m.id);
          }}
          className="flex items-center justify-between gap-2 flex-wrap cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/50 transition-colors"
          title={s ? 'Clica para abrir / editar os dados do jogo' : 'Clica para ver o relatório do jogo'}
        >
          <div className="text-base font-black text-white font-['Chakra_Petch'] flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs">VS</span>
            <span className="text-amber-300 text-lg group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
              {s ? s.opponent : m?.opponent}
              <span className="text-xs text-cyan-400 opacity-60 group-hover:opacity-100">↗</span>
            </span>
          </div>

          {s ? (
            <span className="text-xs font-mono text-slate-300">
              📋 <strong className="text-cyan-300">{ev.callupCount || 0}</strong> convocados
            </span>
          ) : m ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('jogos', m.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1"
              >
                <span>📊</span>
                <span>Ver Ficha de Jogo</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowConfirm('Tens a certeza que desejas eliminar este jogo da agenda?', () =>
                    handleDeleteScheduledMatch(m.id)
                  );
                }}
                className="px-3 py-1.5 rounded-xl bg-red-950/70 border border-red-500/50 hover:bg-red-900 text-red-300 hover:text-white font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1 transition-all"
                title="Eliminar este jogo da agenda"
              >
                <span>🗑️</span>
                <span>Eliminar Jogo</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Connected Strategic Sub-Actions */}
        {s && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => handleEditMatch(s)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/50 hover:bg-cyan-950 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1"
              title="Abrir e editar dados do jogo"
            >
              <span>✏️</span>
              <span>Abrir / Editar</span>
            </button>

            {(() => {
              const isPreMatchFin = Boolean(s.preMatchFinalized);
              const isCallupFin = Boolean(s.callupFinalized);

              return (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('prejogo', s.id)}
                    className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1 transition-all ${
                      isPreMatchFin
                        ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                        : 'bg-cyan-950/80 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300'
                    }`}
                    title={isPreMatchFin ? 'Plano Pré-Jogo Finalizado' : 'Abrir Plano Pré-Jogo'}
                  >
                    <span>{isPreMatchFin ? '✓' : '⚡'}</span>
                    <span>Pré-jogo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('convocatoria', s.id)}
                    className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1 transition-all ${
                      isCallupFin
                        ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                        : 'bg-slate-950 border border-slate-700 hover:border-slate-500 text-slate-200'
                    }`}
                    title={isCallupFin ? 'Convocatória Finalizada' : 'Abrir Convocatória'}
                  >
                    <span>{isCallupFin ? '✓' : '📋'}</span>
                    <span>Convocatória</span>
                  </button>
                </>
              );
            })()}

            <button
              type="button"
              onClick={() => setShareCallup(s)}
              className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 hover:bg-emerald-900 text-emerald-300 font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onShowConfirm('Tens a certeza que desejas eliminar este jogo cancelado da agenda?', () =>
                  handleDeleteScheduledMatch(s.id)
                );
              }}
              className="px-3 py-1.5 rounded-xl bg-red-950/70 border border-red-500/50 hover:bg-red-900 text-red-300 hover:text-white font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1 transition-all ml-auto"
              title="Eliminar este jogo cancelado da agenda"
            >
              <span>🗑️</span>
              <span>Eliminar Jogo (Cancelado)</span>
            </button>
          </div>
        )}
        {callupShareModal}
      </div>
    );
  }

  // Staff Unavailability Card
  if (isStaff) {
    const u = ev.rawStaffUnavailability;
    const formattedEndDate = u?.endDate ? u.endDate.split('-').reverse().join('/') : null;

    return (
      <div
        key={ev.id}
        className="p-4 rounded-2xl bg-slate-900/90 border border-orange-500/40 hover:border-orange-400 transition-all shadow-md space-y-3"
      >
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg bg-orange-950 text-orange-300 border border-orange-500/50 text-[10px] font-mono font-bold flex items-center gap-1">
              <span>🚫</span>
              <span>INDISPONÍVEL (EQUIPA TÉCNICA)</span>
            </span>

            <div className="text-sm font-black font-['Chakra_Petch'] text-orange-300">
              📅 {formattedDate}
              {formattedEndDate ? ` até ${formattedEndDate}` : ''}
            </div>
          </div>

          {/* Quick Action Buttons for Staff */}
          {u && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleEditStaff(u)}
                className="p-1.5 px-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-orange-400 text-orange-300 text-xs font-mono"
                title="Editar Indisponibilidade"
              >
                ✏️ Editar
              </button>

              <button
                type="button"
                onClick={() => {
                  onShowConfirm(`Tens a certeza que desejas remover a indisponibilidade de ${u.name}?`, () =>
                    handleDeleteStaff(u.id)
                  );
                }}
                className="p-1.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 text-xs"
                title="Apagar Indisponibilidade"
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        {/* Member Name */}
        <div
          onClick={() => u && handleEditStaff(u)}
          className="flex items-center justify-between gap-2 flex-wrap cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/50 transition-colors"
          title="Clica para abrir / editar a indisponibilidade"
        >
          <div className="text-base font-black text-white font-['Chakra_Petch'] flex items-center gap-2">
            <span className="text-orange-400 font-mono text-sm">👤</span>
            <span className="text-orange-200 text-lg group-hover:text-orange-300 transition-colors flex items-center gap-1.5">
              {ev.staffName || ev.title}
              <span className="text-xs text-orange-400 opacity-60 group-hover:opacity-100">↗</span>
            </span>
          </div>

          {u?.reason && (
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              💬 {u.reason}
            </span>
          )}
        </div>

        {/* Sub actions */}
        {u && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => handleEditStaff(u)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-orange-500/50 hover:bg-orange-950 text-orange-300 font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1"
            >
              <span>✏️</span>
              <span>Abrir / Editar Indisponibilidade</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onShowConfirm(`Tens a certeza que desejas eliminar a indisponibilidade de ${u.name}?`, () =>
                  handleDeleteStaff(u.id)
                );
              }}
              className="px-3 py-1.5 rounded-xl bg-red-950/70 border border-red-500/50 hover:bg-red-900 text-red-300 hover:text-white font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1 transition-all ml-auto"
              title="Eliminar indisponibilidade da equipa técnica"
            >
              <span>🗑️</span>
              <span>Eliminar Indisponibilidade</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Club Event Card (Reuniões, Formações, Estágios, etc.)
  if (isClub) {
    const c = ev.rawClubEvent;
    const isEventCompleted = c?.isCompleted === true || ev.isCompleted === true;
    const formattedEndDate = c?.endDate ? c.endDate.split('-').reverse().join('/') : null;
    const typeLabel =
      c?.type === 'formacao'
        ? 'FORMAÇÃO'
        : c?.type === 'estagio'
          ? 'ESTÁGIO'
          : c?.type === 'outro'
            ? 'EVENTO DO CLUBE'
            : 'REUNIÃO';
    const typeIcon = c?.type === 'formacao' ? '🎓' : c?.type === 'estagio' ? '🏕️' : c?.type === 'outro' ? '📌' : '👥';
    const singleNoun =
      c?.type === 'formacao'
        ? 'Formação'
        : c?.type === 'estagio'
          ? 'Estágio'
          : c?.type === 'outro'
            ? 'Evento'
            : 'Reunião';

    return (
      <div
        key={ev.id}
        className={`p-4 rounded-2xl border transition-all shadow-md space-y-3 ${
          isEventCompleted
            ? 'bg-slate-900/95 border-emerald-500/50 hover:border-emerald-400'
            : 'bg-slate-900/90 border-purple-500/40 hover:border-purple-400'
        }`}
      >
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Interactive Status Switch (Agendado vs Concluído) */}
            {c && handleToggleClubEventStatus && (
              <div className="inline-flex rounded-xl p-0.5 bg-slate-950 border border-slate-800 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    if (isEventCompleted) handleToggleClubEventStatus(c.id, true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                    !isEventCompleted
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <span>🟡</span>
                  <span>Agendado</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isEventCompleted) handleToggleClubEventStatus(c.id, false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                    isEventCompleted
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  <span>🟢</span>
                  <span>Concluído</span>
                </button>
              </div>
            )}

            <span
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 ${
                isEventCompleted
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : 'bg-purple-950 text-purple-300 border border-purple-500/50'
              }`}
            >
              <span>{typeIcon}</span>
              <span>{typeLabel}</span>
            </span>

            <div className="text-sm font-black font-['Chakra_Petch'] text-purple-300">
              📅 {formattedDate}
              {formattedEndDate ? ` até ${formattedEndDate}` : ''}
              {c?.time && (
                <span className="text-white ml-2">
                  ⏰ {c.time}h{c.endTime ? ` - ${c.endTime}h` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons for Club Event */}
          {c && (
            <div className="flex items-center gap-1.5 shrink-0">
              {handleToggleClubEventStatus && (
                <button
                  type="button"
                  onClick={() => handleToggleClubEventStatus(c.id, isEventCompleted)}
                  className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1 ${
                    !isEventCompleted
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-amber-950 hover:bg-amber-900 border border-amber-500/50 text-amber-300'
                  }`}
                >
                  <span>{!isEventCompleted ? `✓ Concluir ${singleNoun}` : '↩ Reabrir'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleEditClubEvent(c)}
                className="p-1.5 px-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-400 text-purple-300 text-xs font-mono"
                title="Editar Evento"
              >
                ✏️ Editar
              </button>

              <button
                type="button"
                onClick={() => {
                  onShowConfirm(
                    `Tens a certeza que desejas eliminar esta ${singleNoun.toLowerCase()} cancelada da agenda?`,
                    () => handleDeleteClubEvent(c.id)
                  );
                }}
                className="p-1.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 text-xs"
                title={`Eliminar ${singleNoun} Cancelada`}
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        {/* Title & Metadata Badges */}
        <div
          onClick={() => c && handleEditClubEvent(c)}
          className="space-y-2 cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/50 transition-colors"
          title="Clica para abrir / editar a reunião ou formação"
        >
          <div className="text-base font-black text-white font-['Chakra_Petch'] flex items-center gap-2">
            <span
              className={`text-lg transition-colors flex items-center gap-1.5 ${
                isEventCompleted
                  ? 'text-emerald-300 line-through opacity-85'
                  : 'text-purple-300 group-hover:text-purple-200'
              }`}
            >
              {c?.title || ev.title}
              <span className="text-xs text-purple-400 opacity-60 group-hover:opacity-100">↗</span>
            </span>
            {isEventCompleted && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ✓ Concluído
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            {c?.location && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1">
                <span>📍</span>
                <span>{c.location}</span>
              </span>
            )}
            {c?.attendees && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-purple-300 flex items-center gap-1">
                <span>👥</span>
                <span>Destinatários: {c.attendees}</span>
              </span>
            )}
          </div>

          {c?.notes && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono text-slate-300 whitespace-pre-wrap">
              <div className="text-[10px] uppercase text-purple-400 font-bold mb-1">📋 Ordem de Trabalhos / Notas:</div>
              {c.notes}
            </div>
          )}
        </div>

        {/* Sub action */}
        {c && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
            {handleToggleClubEventStatus && (
              <button
                type="button"
                onClick={() => handleToggleClubEventStatus(c.id, isEventCompleted)}
                className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1 transition-all ${
                  !isEventCompleted
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                    : 'bg-slate-950 border border-amber-500/50 hover:bg-amber-950 text-amber-300'
                }`}
              >
                <span>{!isEventCompleted ? '✓ Concluído' : '↩ Reabrir Compromisso'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleEditClubEvent(c)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-purple-500/50 hover:bg-purple-950 text-purple-300 font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1"
            >
              <span>✏️</span>
              <span>Abrir / Editar {typeLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onShowConfirm(
                  `Tens a certeza que desejas eliminar esta ${singleNoun.toLowerCase()} cancelada da agenda?`,
                  () => handleDeleteClubEvent(c.id)
                );
              }}
              className="px-3 py-1.5 rounded-xl bg-red-950/70 border border-red-500/50 hover:bg-red-900 text-red-300 hover:text-white font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1 transition-all ml-auto"
              title={`Eliminar ${singleNoun.toLowerCase()} cancelada da agenda`}
            >
              <span>🗑️</span>
              <span>Eliminar {singleNoun} (Cancelada)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Training Card
  const tr = ev.rawTraining;
  if (!tr) return null;

  return (
    <div
      key={ev.id}
      className={`p-4 rounded-2xl border transition-all shadow-md space-y-3 ${
        ev.isCompleted
          ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400'
          : 'bg-slate-900/90 border-amber-500/30 hover:border-amber-400'
      }`}
    >
      {/* Header Row: Status Switcher & Time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Interactive Status Switch */}
          <div className="inline-flex rounded-xl p-0.5 bg-slate-950 border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => {
                if (tr.completed) handleToggleTrainingStatus(tr.id, true);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                !tr.completed
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <span>🟡</span>
              <span>Agendado</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!tr.completed) handleToggleTrainingStatus(tr.id, false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                tr.completed
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <span>🟢</span>
              <span>Concluído</span>
            </button>
          </div>

          <div className="text-sm font-black font-['Chakra_Petch'] text-cyan-300">
            📅 {formattedDate} às {ev.time}h
          </div>

          <span className="text-xs font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
            {ev.trainingType}
          </span>

          {tr.location && <span className="text-xs font-mono text-slate-300">📍 {tr.location}</span>}
        </div>

        {/* Quick Actions for Training */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleToggleTrainingStatus(tr.id, tr.completed === true)}
            className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1 ${
              !tr.completed
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-amber-950 hover:bg-amber-900 border border-amber-500/50 text-amber-300'
            }`}
          >
            <span>{!tr.completed ? '✓ Concluir Treino' : '↩ Reabrir'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleEditTraining(tr)}
            className="p-1.5 px-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-400 text-cyan-300 text-xs font-mono"
            title="Editar Treino"
          >
            ✏️ Editar
          </button>

          <button
            type="button"
            onClick={() => {
              onShowConfirm('Tens a certeza que desejas eliminar este treino cancelado da agenda?', () =>
                handleDeleteTraining(tr.id)
              );
            }}
            className="p-1.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 text-xs"
            title="Eliminar Treino Cancelado"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Presence & Interactive Title */}
      <div
        onClick={() => handleEditTraining(tr)}
        className="flex items-center justify-between text-xs font-mono text-slate-300 cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/50 transition-colors"
        title="Clica para abrir o treino, presenças e exercícios"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold group-hover:text-amber-300 transition-colors flex items-center gap-1">
            ⚡ {ev.title}
            <span className="text-xs text-amber-400 opacity-60 group-hover:opacity-100">↗</span>
          </span>
          <span>·</span>
          <span>
            👥 <strong className="text-emerald-400">{ev.presencesCount}</strong> presentes ·{' '}
            <strong className="text-red-400">{ev.absencesCount}</strong> faltas
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand();
          }}
          className="text-cyan-400 hover:text-cyan-300 font-bold underline text-xs"
        >
          {isExpanded ? 'Ocultar Notas ▲' : 'Ver Notas & Objetivos ▼'}
        </button>
      </div>

      {/* Sub Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => handleEditTraining(tr)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/50 hover:bg-amber-950 text-amber-300 font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1"
          title="Abrir detalhes do treino, presenças e notas"
        >
          <span>✏️</span>
          <span>Abrir / Editar Treino</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('treinos')}
          className="px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1"
          title="Ir para o painel completo de Treinos"
        >
          <span>📋</span>
          <span>Painel de Treinos</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onShowConfirm('Tens a certeza que desejas eliminar este treino cancelado da agenda?', () =>
              handleDeleteTraining(tr.id)
            );
          }}
          className="px-3 py-1.5 rounded-xl bg-red-950/70 border border-red-500/50 hover:bg-red-900 text-red-300 hover:text-white font-['Chakra_Petch'] font-bold text-xs uppercase flex items-center gap-1 transition-all ml-auto"
          title="Eliminar este treino cancelado da agenda"
        >
          <span>🗑️</span>
          <span>Eliminar Treino (Cancelado)</span>
        </button>
      </div>

      {/* Expanded Drawer for Training Notes */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2">
          {tr.notes ? (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-300 font-mono leading-relaxed">
              <span className="text-cyan-400 font-bold block mb-1">📝 Objetivos & Exercícios:</span>
              {tr.notes}
            </div>
          ) : (
            <div className="text-slate-500 italic font-mono text-[11px]">
              Sem notas registadas. Clica em "Abrir / Editar Treino" para adicionar plano de sessão.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
