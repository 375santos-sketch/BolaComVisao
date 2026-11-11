import React, { useState } from 'react';
import { CalendarEvent } from './types';
import { AppState, ScheduledMatch, Training, StaffUnavailability, ClubEvent } from '../../../types';
import { CallupShareModal } from '../../CallupShareModal';
import { WeatherBadge } from '../../WeatherBadge';
import { directionsUrl, townOfClub } from '../../../lib/gameMap';
import { teamSettings } from '../../../lib/teamSettings';

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
  const clubTown = state ? teamSettings(state).clubTown : '';
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
      <div key={ev.id} className="ui-card p-4 transition-all space-y-3">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-ui-line">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="text-sm font-bold text-ui-text">
              {formattedDate} · {ev.time}
            </div>

            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                ev.location?.includes('Casa')
                  ? 'bg-ui-success-soft text-ui-success border border-ui-success/40'
                  : 'bg-ui-brand-soft text-ui-brand border border-ui-brand/40'
              }`}
            >
              {ev.location}
            </span>

            {s && (
              <WeatherBadge
                date={s.date}
                time={s.time}
                places={
                  s.location === 'fora' ? [s.venue || '', townOfClub(s.opponent), clubTown] : [clubTown, s.venue || '']
                }
              />
            )}

            {ev.tournamentName && (
              <span className="text-[10px] font-mono text-ui-warning bg-ui-warning-soft px-2 py-0.5 rounded border border-ui-warning/30">
                🏆 {ev.tournamentName} {ev.phase ? `(${ev.phase})` : ''}
              </span>
            )}
            {!ev.tournamentName && ev.phase && (
              <span className="text-[10px] font-mono text-ui-brand bg-ui-brand-soft px-2 py-0.5 rounded border border-ui-brand/30">
                🏆 {ev.phase}
              </span>
            )}
          </div>

          {/* Quick Action Buttons for Match */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {s && (
              <a
                href={directionsUrl(s)}
                target="_blank"
                rel="noopener noreferrer"
                className="ui-btn ui-btn-soft px-3 py-1.5 text-xs"
                title="Abrir o mapa com o caminho para o campo"
              >
                🗺️ Como chegar
              </a>
            )}

            {s && (
              <button
                type="button"
                onClick={() => handleConvertScheduledToLiveMatch(s.id)}
                className="ui-btn ui-btn-success px-3 py-1.5 text-xs flex items-center gap-1"
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
                className="ui-btn ui-btn-secondary p-1.5 px-2.5 text-xs"
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
                className="ui-btn ui-btn-secondary p-1.5 px-2 text-xs"
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
                className="ui-btn ui-btn-secondary p-1.5 px-2 text-xs"
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
          className="flex items-center justify-between gap-2 flex-wrap cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-ui-surface-2/50 transition-colors"
          title={s ? 'Clica para abrir / editar os dados do jogo' : 'Clica para ver o relatório do jogo'}
        >
          <div className="text-base font-black text-ui-text font-['Chakra_Petch'] flex items-center gap-2">
            <span className="text-ui-brand font-mono text-xs">VS</span>
            <span className="text-ui-warning text-lg group-hover:text-ui-brand transition-colors flex items-center gap-1.5">
              {s ? s.opponent : m?.opponent}
              <span className="text-xs text-ui-brand opacity-60 group-hover:opacity-100">↗</span>
            </span>
          </div>

          {s ? (
            <span className="text-xs font-mono text-ui-text">
              📋 <strong className="text-ui-brand">{ev.callupCount || 0}</strong> convocados
            </span>
          ) : m ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('jogos', m.id);
                }}
                className="ui-btn ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1"
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
                className="ui-btn ui-btn-soft-danger px-3 py-1.5 text-xs flex items-center gap-1"
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
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-ui-line/80">
            <button
              type="button"
              onClick={() => handleEditMatch(s)}
              className="ui-btn ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1"
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
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition-all ${
                      isPreMatchFin
                        ? 'bg-ui-success-soft border border-ui-success/60 text-ui-success shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                        : 'bg-ui-brand-soft border border-ui-brand/50 hover:bg-ui-brand-soft text-ui-brand'
                    }`}
                    title={isPreMatchFin ? 'Plano Pré-Jogo Finalizado' : 'Abrir Plano Pré-Jogo'}
                  >
                    <span>{isPreMatchFin ? '✓' : '⚡'}</span>
                    <span>Pré-jogo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('convocatoria', s.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition-all ${
                      isCallupFin
                        ? 'bg-ui-success-soft border border-ui-success/60 text-ui-success shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                        : 'bg-ui-inset border border-ui-line-strong hover:border-ui-line-strong text-ui-text'
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
              className="ui-btn ui-btn-soft-success px-3 py-1.5 text-xs flex items-center gap-1"
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
              className="ui-btn ui-btn-soft-danger px-3 py-1.5 text-xs flex items-center gap-1 ml-auto"
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
      <div key={ev.id} className="ui-card p-4 transition-all space-y-3">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-ui-line">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg bg-ui-warning-soft text-ui-warning border border-ui-warning/50 text-[10px] font-mono font-bold flex items-center gap-1">
              <span>🚫</span>
              <span>Indisponível (equipa técnica)</span>
            </span>

            <div className="text-sm font-black font-['Chakra_Petch'] text-ui-warning">
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
                className="ui-btn ui-btn-secondary p-1.5 px-2.5 text-xs"
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
                className="ui-btn ui-btn-secondary p-1.5 px-2 text-xs"
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
          className="flex items-center justify-between gap-2 flex-wrap cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-ui-surface-2/50 transition-colors"
          title="Clica para abrir / editar a indisponibilidade"
        >
          <div className="text-base font-black text-ui-text font-['Chakra_Petch'] flex items-center gap-2">
            <span className="text-ui-warning font-mono text-sm">👤</span>
            <span className="text-ui-warning text-lg group-hover:text-ui-warning transition-colors flex items-center gap-1.5">
              {ev.staffName || ev.title}
              <span className="text-xs text-ui-warning opacity-60 group-hover:opacity-100">↗</span>
            </span>
          </div>

          {u?.reason && (
            <span className="text-xs font-mono text-ui-muted bg-ui-inset px-2.5 py-1 rounded-lg border border-ui-line">
              💬 {u.reason}
            </span>
          )}
        </div>

        {/* Sub actions */}
        {u && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-ui-line/80">
            <button
              type="button"
              onClick={() => handleEditStaff(u)}
              className="ui-btn ui-btn-soft-warning px-3 py-1.5 text-xs flex items-center gap-1"
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
              className="ui-btn ui-btn-soft-danger px-3 py-1.5 text-xs flex items-center gap-1 ml-auto"
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
            ? 'bg-ui-surface/95 border-ui-success/50 hover:border-ui-success'
            : 'bg-ui-surface/90 border-ui-brand/40 hover:border-ui-brand'
        }`}
      >
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-ui-line">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Interactive Status Switch (Agendado vs Concluído) */}
            {c && handleToggleClubEventStatus && (
              <div className="ui-inset inline-flex p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (isEventCompleted) handleToggleClubEventStatus(c.id, true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                    !isEventCompleted
                      ? 'bg-ui-warning text-ui-brand-ink shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'text-ui-muted hover:text-ui-warning'
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
                      ? 'bg-ui-success text-ui-brand-ink shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                      : 'text-ui-muted hover:text-ui-success'
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
                  ? 'bg-ui-success-soft text-ui-success border border-ui-success/50'
                  : 'bg-ui-brand-soft text-ui-brand border border-ui-brand/50'
              }`}
            >
              <span>{typeIcon}</span>
              <span>{typeLabel}</span>
            </span>

            <div className="text-sm font-black font-['Chakra_Petch'] text-ui-brand">
              📅 {formattedDate}
              {formattedEndDate ? ` até ${formattedEndDate}` : ''}
              {c?.time && (
                <span className="text-ui-text ml-2">
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
                  className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1 ${
                    !isEventCompleted
                      ? 'bg-ui-success hover:bg-ui-success text-ui-brand-ink shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-ui-warning-soft hover:bg-ui-warning-soft border border-ui-warning/50 text-ui-warning'
                  }`}
                >
                  <span>{!isEventCompleted ? `✓ Concluir ${singleNoun}` : '↩ Reabrir'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleEditClubEvent(c)}
                className="ui-btn ui-btn-secondary p-1.5 px-2.5 text-xs"
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
                className="ui-btn ui-btn-secondary p-1.5 px-2 text-xs"
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
          className="space-y-2 cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-ui-surface-2/50 transition-colors"
          title="Clica para abrir / editar a reunião ou formação"
        >
          <div className="text-base font-black text-ui-text font-['Chakra_Petch'] flex items-center gap-2">
            <span
              className={`text-lg transition-colors flex items-center gap-1.5 ${
                isEventCompleted ? 'text-ui-success line-through opacity-85' : 'text-ui-brand group-hover:text-ui-brand'
              }`}
            >
              {c?.title || ev.title}
              <span className="text-xs text-ui-brand opacity-60 group-hover:opacity-100">↗</span>
            </span>
            {isEventCompleted && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ui-success/20 text-ui-success border border-ui-success/40">
                ✓ Concluído
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            {c?.location && (
              <span className="px-2.5 py-1 rounded-lg bg-ui-inset border border-ui-line text-ui-text flex items-center gap-1">
                <span>📍</span>
                <span>{c.location}</span>
              </span>
            )}
            {c?.attendees && (
              <span className="px-2.5 py-1 rounded-lg bg-ui-inset border border-ui-line text-ui-brand flex items-center gap-1">
                <span>👥</span>
                <span>Destinatários: {c.attendees}</span>
              </span>
            )}
          </div>

          {c?.notes && (
            <div className="ui-inset p-3 text-xs font-mono text-ui-text whitespace-pre-wrap">
              <div className="text-[10px] uppercase text-ui-brand font-bold mb-1">📋 Ordem de Trabalhos / Notas:</div>
              {c.notes}
            </div>
          )}
        </div>

        {/* Sub action */}
        {c && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-ui-line/80">
            {handleToggleClubEventStatus && (
              <button
                type="button"
                onClick={() => handleToggleClubEventStatus(c.id, isEventCompleted)}
                className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition-all ${
                  !isEventCompleted
                    ? 'bg-ui-success hover:bg-ui-success text-ui-brand-ink font-black'
                    : 'bg-ui-inset border border-ui-warning/50 hover:bg-ui-warning-soft text-ui-warning'
                }`}
              >
                <span>{!isEventCompleted ? '✓ Concluído' : '↩ Reabrir Compromisso'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleEditClubEvent(c)}
              className="ui-btn ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1"
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
              className="ui-btn ui-btn-soft-danger px-3 py-1.5 text-xs flex items-center gap-1 ml-auto"
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
          ? 'bg-ui-surface/90 border-ui-success/40 hover:border-ui-success'
          : 'bg-ui-surface/90 border-ui-warning/30 hover:border-ui-warning'
      }`}
    >
      {/* Header Row: Status Switcher & Time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-ui-line">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Interactive Status Switch */}
          <div className="ui-inset inline-flex p-0.5">
            <button
              type="button"
              onClick={() => {
                if (tr.completed) handleToggleTrainingStatus(tr.id, true);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                !tr.completed
                  ? 'bg-ui-warning text-ui-brand-ink shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                  : 'text-ui-muted hover:text-ui-warning'
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
                  ? 'bg-ui-success text-ui-brand-ink shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-ui-muted hover:text-ui-success'
              }`}
            >
              <span>🟢</span>
              <span>Concluído</span>
            </button>
          </div>

          <div className="text-sm font-black font-['Chakra_Petch'] text-ui-brand">
            📅 {formattedDate} às {ev.time}h
          </div>
          {!tr.completed && <WeatherBadge date={tr.date} time={tr.time} places={[clubTown, tr.location || '']} />}

          <span className="text-xs font-mono text-ui-warning bg-ui-warning-soft px-2 py-0.5 rounded border border-ui-warning/30">
            {ev.trainingType}
          </span>

          {tr.location && <span className="text-xs font-mono text-ui-text">📍 {tr.location}</span>}
        </div>

        {/* Quick Actions for Training */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleToggleTrainingStatus(tr.id, tr.completed === true)}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1 ${
              !tr.completed
                ? 'bg-ui-success hover:bg-ui-success text-ui-brand-ink shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-ui-warning-soft hover:bg-ui-warning-soft border border-ui-warning/50 text-ui-warning'
            }`}
          >
            <span>{!tr.completed ? '✓ Concluir Treino' : '↩ Reabrir'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleEditTraining(tr)}
            className="ui-btn ui-btn-secondary p-1.5 px-2.5 text-xs"
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
            className="ui-btn ui-btn-secondary p-1.5 px-2 text-xs"
            title="Eliminar Treino Cancelado"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Presence & Interactive Title */}
      <div
        onClick={() => handleEditTraining(tr)}
        className="flex items-center justify-between text-xs font-mono text-ui-text cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-ui-surface-2/50 transition-colors"
        title="Clica para abrir o treino, presenças e exercícios"
      >
        <div className="flex items-center gap-2">
          <span className="text-ui-warning font-bold group-hover:text-ui-warning transition-colors flex items-center gap-1">
            ⚡ {ev.title}
            <span className="text-xs text-ui-warning opacity-60 group-hover:opacity-100">↗</span>
          </span>
          <span>·</span>
          <span>
            👥 <strong className="text-ui-success">{ev.presencesCount}</strong> presentes ·{' '}
            <strong className="text-ui-danger">{ev.absencesCount}</strong> faltas
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand();
          }}
          className="text-ui-brand hover:text-ui-brand font-bold underline text-xs"
        >
          {isExpanded ? 'Ocultar Notas ▲' : 'Ver Notas & Objetivos ▼'}
        </button>
      </div>

      {/* Sub Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-ui-line/80">
        <button
          type="button"
          onClick={() => handleEditTraining(tr)}
          className="ui-btn ui-btn-soft-warning px-3 py-1.5 text-xs flex items-center gap-1"
          title="Abrir detalhes do treino, presenças e notas"
        >
          <span>✏️</span>
          <span>Abrir / Editar Treino</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('treinos')}
          className="ui-btn ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1"
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
          className="ui-btn ui-btn-soft-danger px-3 py-1.5 text-xs flex items-center gap-1 ml-auto"
          title="Eliminar este treino cancelado da agenda"
        >
          <span>🗑️</span>
          <span>Eliminar Treino (Cancelado)</span>
        </button>
      </div>

      {/* Expanded Drawer for Training Notes */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-ui-line text-xs space-y-2">
          {tr.notes ? (
            <div className="ui-inset p-3 text-ui-text font-mono leading-relaxed">
              <span className="text-ui-brand font-bold block mb-1">📝 Objetivos & Exercícios:</span>
              {tr.notes}
            </div>
          ) : (
            <div className="text-ui-muted italic font-mono text-[11px]">
              Sem notas registadas. Clica em "Abrir / Editar Treino" para adicionar plano de sessão.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
