import React from 'react';
import { Icon } from '../../ui/Icon';
import { DateTimePT } from '../../ui/DateTimePT';
import { ClubEventFormData } from './types';
import { ClubEventType } from '../../../types';

interface ScheduleClubEventModalProps {
  showClubEventModal: boolean;
  setShowClubEventModal: (show: boolean) => void;
  editingClubEventId: string | null;
  clubEventForm: ClubEventFormData;
  setClubEventForm: React.Dispatch<React.SetStateAction<ClubEventFormData>>;
  handleSaveClubEventModal: () => void;
  handleDeleteClubEvent?: (id: string) => void;
  onShowConfirm?: (msg: string, cb: () => void) => void;
}

export const ScheduleClubEventModal: React.FC<ScheduleClubEventModalProps> = ({
  showClubEventModal,
  setShowClubEventModal,
  editingClubEventId,
  clubEventForm,
  setClubEventForm,
  handleSaveClubEventModal,
  handleDeleteClubEvent,
  onShowConfirm
}) => {
  if (!showClubEventModal) return null;

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="ui-card rounded-b-none sm:rounded-ui-lg max-w-lg w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-ui-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-ui-body font-bold text-ui-text">
                {editingClubEventId ? 'Editar evento do clube' : 'Reunião ou formação'}
              </h3>
              <span className="text-ui-caption text-ui-muted">
                Reuniões, formações, estágios e outros eventos do clube
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowClubEventModal(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
            aria-label="Fechar"
          >
            <Icon name="x" className="h-5 w-5 shrink-0" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain space-y-4">
          {/* Type Selector Pills */}
          <div>
            <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">
              Tipo de evento <span className="text-ui-brand">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { type: 'reuniao' as ClubEventType, label: 'Reunião', color: 'purple' },
                { type: 'formacao' as ClubEventType, label: 'Formação', color: 'indigo' },
                { type: 'estagio' as ClubEventType, label: 'Estágio', color: 'emerald' },
                { type: 'outro' as ClubEventType, label: 'Outro', color: 'cyan' }
              ].map((t) => {
                const isSelected = clubEventForm.type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setClubEventForm({ ...clubEventForm, type: t.type })}
                    className={`p-2 rounded-xl text-xs font-semibold transition-all border text-center ${
                      isSelected
                        ? 'bg-ui-surface-3 text-ui-text border-ui-line-strong'
                        : 'bg-ui-inset/80 border-ui-line text-ui-muted hover:text-ui-text hover:border-ui-line-strong'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">
              Título <span className="text-ui-brand">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Reunião Técnica Semanal, Ação de Formação UEFA..."
              value={clubEventForm.title}
              onChange={(e) => setClubEventForm({ ...clubEventForm, title: e.target.value })}
              className="ui-input w-full text-sm"
              autoFocus
            />

            {/* Quick Title Suggestions */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-ui-caption text-ui-muted">Sugestões:</span>
              {[
                'Reunião Equipa Técnica',
                'Reunião com Pais / EE',
                'Ação de Formação SBV',
                'Análise de Vídeo Coletiva',
                'Estágio de Pré-Competição'
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setClubEventForm({ ...clubEventForm, title: sug })}
                  className="ui-btn ui-btn-secondary px-2 py-0.5 text-[10px]"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">
                Data (ou início) <span className="text-ui-brand">*</span>
              </label>
              <DateTimePT
                type="date"
                label="Data do evento"
                value={clubEventForm.date}
                onChange={(v) => setClubEventForm({ ...clubEventForm, date: v })}
                inputClassName="ui-input w-full text-xs"
              />
            </div>

            <div>
              <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">Data de fim (opcional)</label>
              <DateTimePT
                type="date"
                label="Data de fim"
                min={clubEventForm.date}
                value={clubEventForm.endDate || ''}
                onChange={(v) => setClubEventForm({ ...clubEventForm, endDate: v })}
                inputClassName="ui-input w-full text-xs"
              />
              <span className="text-ui-caption text-ui-muted mt-1 block">Deixar vazio para evento de 1 dia</span>
            </div>
          </div>

          {/* Times Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">Hora de início</label>
              <DateTimePT
                type="time"
                label="Hora de início"
                value={clubEventForm.time}
                onChange={(v) => setClubEventForm({ ...clubEventForm, time: v })}
                inputClassName="ui-input w-full text-xs"
              />
            </div>

            <div>
              <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">Hora de fim (opcional)</label>
              <DateTimePT
                type="time"
                label="Hora de fim"
                value={clubEventForm.endTime}
                onChange={(v) => setClubEventForm({ ...clubEventForm, endTime: v })}
                inputClassName="ui-input w-full text-xs"
              />
            </div>
          </div>

          {/* Location & Attendees Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">Local</label>
              <input
                type="text"
                placeholder="Ex: Sala de Reuniões, Auditório..."
                value={clubEventForm.location}
                onChange={(e) => setClubEventForm({ ...clubEventForm, location: e.target.value })}
                className="ui-input w-full text-xs"
              />
            </div>

            <div>
              <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">Participantes</label>
              <input
                type="text"
                placeholder="Ex: Equipa Técnica, Pais, Plantel..."
                value={clubEventForm.attendees}
                onChange={(e) => setClubEventForm({ ...clubEventForm, attendees: e.target.value })}
                className="ui-input w-full text-xs"
              />
            </div>
          </div>

          {/* Status Switcher (Agendado vs Concluído) */}
          <div>
            <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">Estado</label>
            <div className="ui-inset inline-flex p-1 w-full sm:w-auto gap-1">
              <button
                type="button"
                onClick={() => setClubEventForm({ ...clubEventForm, isCompleted: false })}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-ui-sm text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  !clubEventForm.isCompleted ? 'bg-ui-surface-3 text-ui-text' : 'text-ui-muted hover:text-ui-text'
                }`}
              >
                <span aria-hidden className="h-2 w-2 rounded-full bg-ui-warning" />
                <span>Agendado</span>
              </button>
              <button
                type="button"
                onClick={() => setClubEventForm({ ...clubEventForm, isCompleted: true })}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-ui-sm text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  clubEventForm.isCompleted ? 'bg-ui-surface-3 text-ui-text' : 'text-ui-muted hover:text-ui-text'
                }`}
              >
                <span aria-hidden className="h-2 w-2 rounded-full bg-ui-success" />
                <span>Concluído</span>
              </button>
            </div>
          </div>

          {/* Notes / Agenda */}
          <div>
            <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">
              Ordem de trabalhos e notas (opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ex: 1. Balanço dos jogos do fim de semana; 2. Planeamento microciclo; 3. Logística de transporte..."
              value={clubEventForm.notes}
              onChange={(e) => setClubEventForm({ ...clubEventForm, notes: e.target.value })}
              className="ui-input w-full text-xs resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-ui-inset/95 border-t border-ui-line flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
          {editingClubEventId && handleDeleteClubEvent && onShowConfirm ? (
            <button
              type="button"
              onClick={() => {
                const typeStr =
                  clubEventForm.type === 'formacao'
                    ? 'formação'
                    : clubEventForm.type === 'estagio'
                      ? 'estágio'
                      : 'reunião';
                onShowConfirm(`Tens a certeza que desejas eliminar esta ${typeStr} cancelada da agenda?`, () => {
                  handleDeleteClubEvent(editingClubEventId);
                  setShowClubEventModal(false);
                });
              }}
              className="ui-btn ui-btn-soft-danger px-4 py-2.5 min-h-[44px] text-xs flex items-center gap-1.5"
              title="Eliminar evento cancelado da agenda"
            >
              <Icon name="trash" className="h-4 w-4 shrink-0" />
              <span>
                Eliminar{' '}
                {clubEventForm.type === 'formacao'
                  ? 'Formação'
                  : clubEventForm.type === 'estagio'
                    ? 'Estágio'
                    : 'Reunião'}
              </span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowClubEventModal(false)}
              className="ui-btn ui-btn-secondary px-4 py-2.5 min-h-[44px] text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveClubEventModal}
              className="ui-btn ui-btn-primary px-5 py-2.5 min-h-[44px] text-xs flex items-center gap-1.5"
            >
              <span>{editingClubEventId ? 'Guardar alterações' : 'Agendar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
