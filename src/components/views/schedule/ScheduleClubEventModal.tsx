import React from 'react';
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
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-t sm:border border-purple-500/50 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <div>
              <h3 className="text-base sm:text-lg font-['Chakra_Petch'] font-black uppercase text-purple-300">
                {editingClubEventId ? 'Editar Evento do Clube' : 'Marcar Reunião / Formação'}
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Agenda institucional e eventos desportivos do clube
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowClubEventModal(false)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-mono text-sm active:scale-95 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain space-y-4">
          {/* Type Selector Pills */}
          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1.5">
              Tipo de Evento <span className="text-purple-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { type: 'reuniao' as ClubEventType, label: '👥 Reunião', color: 'purple' },
                { type: 'formacao' as ClubEventType, label: '🎓 Formação', color: 'indigo' },
                { type: 'estagio' as ClubEventType, label: '🏕️ Estágio', color: 'emerald' },
                { type: 'outro' as ClubEventType, label: '📌 Outro', color: 'cyan' }
              ].map((t) => {
                const isSelected = clubEventForm.type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setClubEventForm({ ...clubEventForm, type: t.type })}
                    className={`p-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold transition-all border text-center ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/40'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
            <label className="text-xs font-mono text-slate-300 block mb-1.5">
              Título / Assunto <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Reunião Técnica Semanal, Ação de Formação UEFA..."
              value={clubEventForm.title}
              onChange={(e) => setClubEventForm({ ...clubEventForm, title: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-400 text-white text-sm font-['Chakra_Petch'] font-bold focus:outline-none"
              autoFocus
            />

            {/* Quick Title Suggestions */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] font-mono text-slate-500">Sugestões:</span>
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
                  className="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-purple-950/60 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-purple-300 hover:border-purple-500/40 transition-all"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Data (ou Início) <span className="text-purple-400">*</span>
              </label>
              <input
                type="date"
                value={clubEventForm.date}
                onChange={(e) => setClubEventForm({ ...clubEventForm, date: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-400 text-purple-300 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">Data de Fim (Opcional)</label>
              <input
                type="date"
                min={clubEventForm.date}
                value={clubEventForm.endDate}
                onChange={(e) => setClubEventForm({ ...clubEventForm, endDate: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-400 text-purple-300 text-xs font-mono focus:outline-none"
              />
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">Deixar vazio para evento de 1 dia</span>
            </div>
          </div>

          {/* Times Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">Hora de Início</label>
              <input
                type="time"
                value={clubEventForm.time}
                onChange={(e) => setClubEventForm({ ...clubEventForm, time: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-400 text-white text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">Hora de Fim (Opcional)</label>
              <input
                type="time"
                value={clubEventForm.endTime}
                onChange={(e) => setClubEventForm({ ...clubEventForm, endTime: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-400 text-white text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Location & Attendees Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">Local / Sala</label>
              <input
                type="text"
                placeholder="Ex: Sala de Reuniões, Auditório..."
                value={clubEventForm.location}
                onChange={(e) => setClubEventForm({ ...clubEventForm, location: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-400 text-white text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">Participantes / Destinatários</label>
              <input
                type="text"
                placeholder="Ex: Equipa Técnica, Pais, Plantel..."
                value={clubEventForm.attendees}
                onChange={(e) => setClubEventForm({ ...clubEventForm, attendees: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-400 text-white text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Status Switcher (Agendado vs Concluído) */}
          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1.5">
              Estado do Compromisso
            </label>
            <div className="inline-flex rounded-xl p-1 bg-slate-950 border border-slate-800 w-full sm:w-auto gap-1">
              <button
                type="button"
                onClick={() => setClubEventForm({ ...clubEventForm, isCompleted: false })}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  !clubEventForm.isCompleted
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <span>🟡</span>
                <span>Agendado</span>
              </button>
              <button
                type="button"
                onClick={() => setClubEventForm({ ...clubEventForm, isCompleted: true })}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  clubEventForm.isCompleted
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <span>🟢</span>
                <span>Concluído / Realizado</span>
              </button>
            </div>
          </div>

          {/* Notes / Agenda */}
          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1.5">
              Ordem de Trabalhos / Observações (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ex: 1. Balanço dos jogos do fim de semana; 2. Planeamento microciclo; 3. Logística de transporte..."
              value={clubEventForm.notes}
              onChange={(e) => setClubEventForm({ ...clubEventForm, notes: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-400 text-white text-xs font-mono focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                onShowConfirm(
                  `Tens a certeza que desejas eliminar esta ${typeStr} cancelada da agenda?`,
                  () => {
                    handleDeleteClubEvent(editingClubEventId);
                    setShowClubEventModal(false);
                  }
                );
              }}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-300 hover:text-white text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="Eliminar evento cancelado da agenda"
            >
              <span>🗑️</span>
              <span>
                Eliminar{' '}
                {clubEventForm.type === 'formacao'
                  ? 'Formação'
                  : clubEventForm.type === 'estagio'
                    ? 'Estágio'
                    : 'Reunião'}{' '}
                (Cancelada)
              </span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowClubEventModal(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveClubEventModal}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-['Chakra_Petch'] font-black text-xs uppercase shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>👥</span>
              <span>{editingClubEventId ? 'Guardar Alterações' : 'Agendar Reunião / Formação'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
