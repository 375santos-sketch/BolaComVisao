import { Icon } from '../../ui/Icon';
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
              className={`text-ui-caption font-semibold px-2 py-0.5 rounded ${
                ev.location?.toLowerCase().includes('casa')
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
              <span className="text-ui-caption font-semibold text-ui-warning bg-ui-warning-soft px-2 py-0.5 rounded border border-ui-warning/30">
                {ev.tournamentName} {ev.phase ? `(${ev.phase})` : ''}
              </span>
            )}
            {!ev.tournamentName && ev.phase && (
              <span className="text-ui-caption font-semibold text-ui-brand bg-ui-brand-soft px-2 py-0.5 rounded border border-ui-brand/30">
                {ev.phase}
              </span>
            )}
          </div>

          {/* Quick Action Buttons for Match */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap pr-14 lg:pr-0">
            {s && (
              <a
                href={directionsUrl(s)}
                target="_blank"
                rel="noopener noreferrer"
                className="ui-btn ui-btn-secondary min-h-10 px-3.5 text-ui-caption"
                title="Abrir o mapa com o caminho para o campo"
              >
                <Icon name="pin" className="h-4 w-4 shrink-0" />
                Como chegar
              </a>
            )}

            {s && (
              <button
                type="button"
                onClick={() => handleConvertScheduledToLiveMatch(s.id)}
                className="ui-btn ui-btn-primary min-h-10 px-3.5 text-ui-caption"
                title="Começar Jogo no Cronómetro"
              >
                <Icon name="play" className="h-4 w-4 shrink-0" />
                <span>Iniciar jogo</span>
              </button>
            )}

            {s && (
              <button
                type="button"
                onClick={() => handleEditMatch(s)}
                className="ui-btn ui-btn-secondary p-1.5 px-2.5 text-xs"
                title="Editar Jogo"
              >
                <Icon name="pencil" className="h-4 w-4 shrink-0" />
                Editar
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
                <Icon name="trash" className="h-4 w-4 shrink-0" />
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
                <Icon name="trash" className="h-4 w-4 shrink-0" />
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
          <div className="text-ui-lead font-bold text-ui-text flex items-center gap-2">
            <span className="text-ui-muted text-ui-caption font-semibold">vs</span>
            <span className="text-ui-text transition-colors flex items-center gap-1.5">
              {s ? s.opponent : m?.opponent}
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ui-muted group-hover:text-ui-text" />
            </span>
          </div>

          {s ? (
            <span className="flex items-center gap-1 text-xs text-ui-text">
              <Icon name="clipboard" className="h-4 w-4 shrink-0" />{' '}
              <strong className="text-ui-brand">{ev.callupCount || 0}</strong> convocados
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
                <Icon name="chart" className="h-4 w-4 shrink-0" />
                <span>Ver ficha do jogo</span>
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
                <Icon name="trash" className="h-4 w-4 shrink-0" />
                <span>Eliminar</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Connected Strategic Sub-Actions */}
        {s && (
          <div className="flex items-center gap-2 flex-wrap pt-2 pr-14 border-t border-ui-line/80 lg:pr-0">
            <button
              type="button"
              onClick={() => handleEditMatch(s)}
              className="ui-btn ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1"
              title="Abrir e editar dados do jogo"
            >
              <Icon name="pencil" className="h-4 w-4 shrink-0" />
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
                        ? 'bg-ui-success-soft border border-ui-success/60 text-ui-success'
                        : 'bg-ui-brand-soft border border-ui-brand/50 hover:bg-ui-brand-soft text-ui-brand'
                    }`}
                    title={isPreMatchFin ? 'Plano Pré-Jogo Finalizado' : 'Abrir Plano Pré-Jogo'}
                  >
                    {isPreMatchFin ? (
                      <Icon name="check" className="h-4 w-4 shrink-0" />
                    ) : (
                      <Icon name="zap" className="h-4 w-4 shrink-0" />
                    )}
                    <span>Pré-jogo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('convocatoria', s.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition-all ${
                      isCallupFin
                        ? 'bg-ui-success-soft border border-ui-success/60 text-ui-success'
                        : 'bg-ui-inset border border-ui-line-strong hover:border-ui-line-strong text-ui-text'
                    }`}
                    title={isCallupFin ? 'Convocatória Finalizada' : 'Abrir Convocatória'}
                  >
                    {isCallupFin ? (
                      <Icon name="check" className="h-4 w-4 shrink-0" />
                    ) : (
                      <Icon name="clipboard" className="h-4 w-4 shrink-0" />
                    )}
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
              <Icon name="mail" className="h-4 w-4 shrink-0" />
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
              <Icon name="trash" className="h-4 w-4 shrink-0" />
              <span>Eliminar</span>
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
            <span className="px-2.5 py-0.5 rounded-lg bg-ui-warning-soft text-ui-warning border border-ui-warning/50 text-ui-caption font-semibold font-bold flex items-center gap-1">
              <Icon name="ban" className="h-4 w-4 shrink-0" />
              <span>Indisponível (equipa técnica)</span>
            </span>

            <div className="text-sm font-bold text-ui-text">
              {formattedDate}
              {formattedEndDate ? ` até ${formattedEndDate}` : ''}
            </div>
          </div>

          {/* Quick Action Buttons for Staff */}
          {u && (
            <div className="flex items-center gap-1.5 shrink-0 pr-14 lg:pr-0">
              <button
                type="button"
                onClick={() => handleEditStaff(u)}
                className="ui-btn ui-btn-secondary p-1.5 px-2.5 text-xs"
                title="Editar Indisponibilidade"
              >
                <Icon name="pencil" className="h-4 w-4 shrink-0" />
                Editar
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
                <Icon name="trash" className="h-4 w-4 shrink-0" />
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
          <div className="text-ui-lead font-bold text-ui-text flex items-center gap-2">
            <Icon name="ban" className="h-4 w-4 shrink-0 text-ui-warning" />
            <span className="text-ui-text transition-colors flex items-center gap-1.5">
              {ev.staffName || ev.title}
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ui-muted group-hover:text-ui-text" />
            </span>
          </div>

          {u?.reason && (
            <span className="text-xs text-ui-muted bg-ui-inset px-2.5 py-1 rounded-lg border border-ui-line">
              {u.reason}
            </span>
          )}
        </div>

        {/* Sub actions */}
        {u && (
          <div className="flex items-center gap-2 flex-wrap pt-2 pr-14 border-t border-ui-line/80 lg:pr-0">
            <button
              type="button"
              onClick={() => handleEditStaff(u)}
              className="ui-btn ui-btn-soft-warning px-3 py-1.5 text-xs flex items-center gap-1"
            >
              <Icon name="pencil" className="h-4 w-4 shrink-0" />
              <span>Abrir / Editar</span>
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
              <Icon name="trash" className="h-4 w-4 shrink-0" />
              <span>Eliminar</span>
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
        ? 'Formação'
        : c?.type === 'estagio'
          ? 'Estágio'
          : c?.type === 'outro'
            ? 'Evento do clube'
            : 'Reunião';
    const typeIcon =
      c?.type === 'formacao' ? 'clipboard' : c?.type === 'estagio' ? 'pin' : c?.type === 'outro' ? 'calendar' : 'users';
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
        className={`ui-card p-4 transition-all space-y-3 ${isEventCompleted ? 'border-ui-success/50' : ''}`}
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    !isEventCompleted ? 'bg-ui-warning text-ui-brand-ink' : 'text-ui-muted hover:text-ui-warning'
                  }`}
                >
                  <span aria-hidden className="h-2 w-2 rounded-full bg-ui-warning" />
                  <span>Agendado</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isEventCompleted) handleToggleClubEventStatus(c.id, false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    isEventCompleted ? 'bg-ui-success text-ui-brand-ink' : 'text-ui-muted hover:text-ui-success'
                  }`}
                >
                  <span aria-hidden className="h-2 w-2 rounded-full bg-ui-success" />
                  <span>Concluído</span>
                </button>
              </div>
            )}

            <span
              className={`px-2.5 py-0.5 rounded-lg text-ui-caption font-semibold font-bold flex items-center gap-1 ${
                isEventCompleted
                  ? 'bg-ui-success-soft text-ui-success border border-ui-success/50'
                  : 'bg-ui-brand-soft text-ui-brand border border-ui-brand/50'
              }`}
            >
              <Icon name={typeIcon} className="h-3.5 w-3.5 shrink-0" />
              <span>{typeLabel}</span>
            </span>

            <div className="text-sm font-bold text-ui-text">
              {formattedDate}
              {formattedEndDate ? ` até ${formattedEndDate}` : ''}
              {c?.time && (
                <span className="text-ui-muted ml-2">
                  {c.time}h{c.endTime ? ` - ${c.endTime}h` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons for Club Event */}
          {c && (
            <div className="flex items-center gap-1.5 shrink-0 pr-14 lg:pr-0">
              {handleToggleClubEventStatus && (
                <button
                  type="button"
                  onClick={() => handleToggleClubEventStatus(c.id, isEventCompleted)}
                  className={`ui-btn px-3 py-1.5 text-xs flex items-center gap-1 ${!isEventCompleted ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                >
                  <Icon name={!isEventCompleted ? 'tick' : 'undo'} className="h-4 w-4 shrink-0" />
                  <span>{!isEventCompleted ? `Concluir ${singleNoun.toLowerCase()}` : 'Reabrir'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleEditClubEvent(c)}
                className="ui-btn ui-btn-secondary p-1.5 px-2.5 text-xs"
                title="Editar Evento"
              >
                <Icon name="pencil" className="h-4 w-4 shrink-0" />
                Editar
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
                <Icon name="trash" className="h-4 w-4 shrink-0" />
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
          <div className="text-ui-lead font-bold text-ui-text flex items-center gap-2">
            <span
              className={`transition-colors flex items-center gap-1.5 ${
                isEventCompleted ? 'text-ui-muted line-through' : 'text-ui-text'
              }`}
            >
              {c?.title || ev.title}
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ui-muted group-hover:text-ui-text" />
            </span>
            {isEventCompleted && <span className="ui-badge ui-badge-success">Concluído</span>}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {c?.location && (
              <span className="px-2.5 py-1 rounded-lg bg-ui-inset border border-ui-line text-ui-text flex items-center gap-1">
                <Icon name="pin" className="h-4 w-4 shrink-0" />
                <span>{c.location}</span>
              </span>
            )}
            {c?.attendees && (
              <span className="px-2.5 py-1 rounded-lg bg-ui-inset border border-ui-line text-ui-brand flex items-center gap-1">
                <Icon name="users" className="h-4 w-4 shrink-0" />
                <span>Destinatários: {c.attendees}</span>
              </span>
            )}
          </div>

          {c?.notes && (
            <div className="ui-inset p-3 text-xs text-ui-text whitespace-pre-wrap">
              <div className="text-ui-caption text-ui-muted font-semibold mb-1">Ordem de trabalhos e notas</div>
              {c.notes}
            </div>
          )}
        </div>

        {/* Sub action */}
        {c && (
          <div className="flex items-center gap-2 flex-wrap pt-2 pr-14 border-t border-ui-line/80 lg:pr-0">
            {handleToggleClubEventStatus && (
              <button
                type="button"
                onClick={() => handleToggleClubEventStatus(c.id, isEventCompleted)}
                className={`ui-btn px-3 py-1.5 text-xs flex items-center gap-1 ${
                  !isEventCompleted ? 'ui-btn-primary' : 'ui-btn-secondary'
                }`}
              >
                <Icon name={!isEventCompleted ? 'tick' : 'undo'} className="h-4 w-4 shrink-0" />
                <span>{!isEventCompleted ? 'Marcar como concluída' : 'Reabrir'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleEditClubEvent(c)}
              className="ui-btn ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1"
            >
              <Icon name="pencil" className="h-4 w-4 shrink-0" />
              <span>Abrir / Editar</span>
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
              <Icon name="trash" className="h-4 w-4 shrink-0" />
              <span>Eliminar</span>
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
    <div key={ev.id} className={`ui-card p-4 transition-all space-y-3 ${ev.isCompleted ? 'border-ui-success/50' : ''}`}>
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
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                !tr.completed ? 'bg-ui-warning text-ui-brand-ink' : 'text-ui-muted hover:text-ui-warning'
              }`}
            >
              <span aria-hidden className="h-2 w-2 rounded-full bg-ui-warning" />
              <span>Agendado</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!tr.completed) handleToggleTrainingStatus(tr.id, false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                tr.completed ? 'bg-ui-success text-ui-brand-ink' : 'text-ui-muted hover:text-ui-success'
              }`}
            >
              <span aria-hidden className="h-2 w-2 rounded-full bg-ui-success" />
              <span>Concluído</span>
            </button>
          </div>

          <div className="text-sm font-bold text-ui-text">
            {formattedDate} · {ev.time}
          </div>
          {!tr.completed && <WeatherBadge date={tr.date} time={tr.time} places={[clubTown, tr.location || '']} />}

          <span className="text-xs text-ui-warning bg-ui-warning-soft px-2 py-0.5 rounded border border-ui-warning/30">
            {ev.trainingType}
          </span>

          {tr.location && <span className="text-xs text-ui-text">{tr.location}</span>}
        </div>

        {/* Quick Actions for Training */}
        <div className="flex items-center gap-2 shrink-0 pr-14 lg:pr-0">
          <button
            type="button"
            onClick={() => handleToggleTrainingStatus(tr.id, tr.completed === true)}
            className={`ui-btn px-3 py-1.5 text-xs flex items-center gap-1 ${!tr.completed ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
          >
            <Icon name={!tr.completed ? 'tick' : 'undo'} className="h-4 w-4 shrink-0" />
            <span>{!tr.completed ? 'Concluir treino' : 'Reabrir'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleEditTraining(tr)}
            className="ui-btn ui-btn-secondary p-1.5 px-2.5 text-xs"
            title="Editar Treino"
          >
            <Icon name="pencil" className="h-4 w-4 shrink-0" />
            Editar
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
            <Icon name="trash" className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Presence & Interactive Title */}
      <div
        onClick={() => handleEditTraining(tr)}
        className="flex items-center justify-between gap-2 flex-wrap text-xs text-ui-text cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-ui-surface-2/50 transition-colors"
        title="Clica para abrir o treino, presenças e exercícios"
      >
        <div className="flex items-center gap-2">
          <span className="text-ui-body text-ui-text font-bold transition-colors flex items-center gap-1">
            {ev.title}
            <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ui-muted group-hover:text-ui-text" />
          </span>
          <span>·</span>
          <span>
            <strong className="text-ui-success">{ev.presencesCount}</strong> presentes ·{' '}
            <strong className="text-ui-danger">{ev.absencesCount}</strong> faltas
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand();
          }}
          className="flex min-h-10 items-center gap-1 text-ui-brand font-semibold text-xs"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Ocultar notas' : 'Ver notas e objetivos'}
          <Icon
            name="chevronDown"
            className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Sub Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-2 pr-14 border-t border-ui-line/80 lg:pr-0">
        <button
          type="button"
          onClick={() => handleEditTraining(tr)}
          className="ui-btn ui-btn-soft-warning px-3 py-1.5 text-xs flex items-center gap-1"
          title="Abrir detalhes do treino, presenças e notas"
        >
          <Icon name="pencil" className="h-4 w-4 shrink-0" />
          <span>Abrir / Editar</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('treinos')}
          className="ui-btn ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1"
          title="Ir para o painel completo de Treinos"
        >
          <Icon name="clipboard" className="h-4 w-4 shrink-0" />
          <span>Painel de treinos</span>
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
          <Icon name="trash" className="h-4 w-4 shrink-0" />
          <span>Eliminar</span>
        </button>
      </div>

      {/* Expanded Drawer for Training Notes */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-ui-line text-xs space-y-2">
          {tr.notes ? (
            <div className="ui-inset p-3 text-ui-text leading-relaxed">
              <span className="text-ui-brand font-bold block mb-1">Objetivos e exercícios</span>
              {tr.notes}
            </div>
          ) : (
            <div className="text-ui-muted text-ui-caption">
              Sem notas registadas. Clica em "Abrir / Editar Treino" para adicionar plano de sessão.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
