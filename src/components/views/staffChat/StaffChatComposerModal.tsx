import React, { useState } from 'react';
import {
  StaffMessageType,
  StaffMeetingDetails,
  StaffMember,
  AppState
} from '../../../types';
import { MESSAGE_TYPE_CONFIG } from './types';

interface StaffChatComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  currentSenderId: string;
  currentSenderName: string;
  currentSenderRole: string;
  onCreateMessage: (payload: {
    type: StaffMessageType;
    title: string;
    content: string;
    priority: 'normal' | 'alta' | 'urgente';
    meetingDetails?: StaffMeetingDetails;
    targetStaffIds: string[];
    targetLabel: string;
    sendWhatsAppImmediate: boolean;
    sendPushImmediate: boolean;
    addToClubCalendar: boolean;
  }) => void;
}

export const StaffChatComposerModal: React.FC<StaffChatComposerModalProps> = ({
  isOpen,
  onClose,
  state,
  currentSenderId: _currentSenderId,
  currentSenderName: _currentSenderName,
  currentSenderRole: _currentSenderRole,
  onCreateMessage
}) => {
  const [msgType, setMsgType] = useState<StaffMessageType>('reuniao');
  const [msgTitle, setMsgTitle] = useState<string>('');
  const [msgContent, setMsgContent] = useState<string>('');
  const [msgPriority, setMsgPriority] = useState<'normal' | 'alta' | 'urgente'>('normal');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [sendWhatsAppImmediate, setSendWhatsAppImmediate] = useState<boolean>(true);
  const [sendPushImmediate, setSendPushImmediate] = useState<boolean>(true);

  // Meeting Details
  const [meetDate, setMeetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [meetTime, setMeetTime] = useState<string>('19:00');
  const [meetEndTime, setMeetEndTime] = useState<string>('20:00');
  const [meetLocation, setMeetLocation] = useState<string>('Gabinete Técnico / Campo');
  const [meetAgenda, setMeetAgenda] = useState<string>('');
  const [addToClubCalendar, setAddToClubCalendar] = useState<boolean>(true);

  if (!isOpen) return null;

  const staffList: StaffMember[] = state.staffMembers || [];

  const handleToggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStaff = () => {
    if (selectedStaffIds.length === staffList.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(staffList.map((s) => s.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!msgTitle.trim() && !msgContent.trim() && msgType !== 'reuniao') {
      return;
    }

    let meetingDetails: StaffMeetingDetails | undefined = undefined;
    if (msgType === 'reuniao') {
      meetingDetails = {
        title: msgTitle.trim() || 'Reunião da Equipa Técnica',
        date: meetDate,
        time: meetTime,
        endTime: meetEndTime || undefined,
        location: meetLocation.trim() || 'Gabinete Técnico',
        agenda: meetAgenda.trim() || undefined,
        confirmations: staffList.map((s) => ({
          staffId: s.id,
          staffName: s.name,
          staffRole: s.role,
          status: 'pendente',
          timestamp: Date.now()
        })),
        addedToCalendar: addToClubCalendar
      };
    }

    let targetLabel = 'Toda a Equipa Técnica';
    if (selectedStaffIds.length > 0 && selectedStaffIds.length < staffList.length) {
      const names = staffList
        .filter((s) => selectedStaffIds.includes(s.id))
        .map((s) => s.name.split(' ')[0]);
      targetLabel = names.join(', ');
    }

    onCreateMessage({
      type: msgType,
      title: msgTitle.trim(),
      content: msgContent.trim(),
      priority: msgType === 'urgente' ? 'urgente' : msgPriority,
      meetingDetails,
      targetStaffIds: selectedStaffIds,
      targetLabel,
      sendWhatsAppImmediate,
      sendPushImmediate,
      addToClubCalendar
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,210,255,0.2)] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-xl">
              📢
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-['Chakra_Petch'] text-white uppercase">
                {msgType === 'reuniao' ? 'Marcar Nova Reunião Técnica' : 'Criar Recado ou Nota Técnica'}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Comunicação com a equipa técnica com alertas e confirmações
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-left">
          {/* TYPE SELECTOR TABS */}
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase font-bold mb-2">
              Tipo de Comunicação:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(MESSAGE_TYPE_CONFIG) as StaffMessageType[]).map((typeKey) => {
                const conf = MESSAGE_TYPE_CONFIG[typeKey];
                const isSelected = msgType === typeKey;
                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => {
                      setMsgType(typeKey);
                      if (typeKey === 'urgente') setMsgPriority('urgente');
                      if (typeKey === 'reuniao' && !msgTitle) setMsgTitle('Reunião de Preparação Técnica');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-base">{conf.icon}</span>
                    <span className="truncate">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TITLE INPUT */}
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase font-bold mb-1">
              Assunto / Título:
            </label>
            <input
              type="text"
              required={msgType === 'reuniao'}
              value={msgTitle}
              onChange={(e) => setMsgTitle(e.target.value)}
              placeholder={
                msgType === 'reuniao'
                  ? 'Ex: Análise Tática do Próximo Adversário'
                  : 'Ex: Alteração de horário no treino de 5ª feira'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 font-sans"
            />
          </div>

          {/* MEETING DETAILS SECTION */}
          {msgType === 'reuniao' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold uppercase border-b border-slate-800 pb-2">
                <span>📅</span>
                <span>Detalhes e Logística da Reunião:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                    Data:
                  </label>
                  <input
                    type="date"
                    required
                    value={meetDate}
                    onChange={(e) => setMeetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                    Hora de Início:
                  </label>
                  <input
                    type="time"
                    required
                    value={meetTime}
                    onChange={(e) => setMeetTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                    Hora Fim (Opcional):
                  </label>
                  <input
                    type="time"
                    value={meetEndTime}
                    onChange={(e) => setMeetEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Localização / Sala:
                </label>
                <input
                  type="text"
                  value={meetLocation}
                  onChange={(e) => setMeetLocation(e.target.value)}
                  placeholder="Ex: Gabinete Técnico / Sala de Vídeo / Campo 1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Ordem de Trabalhos (Pauta / Agenda):
                </label>
                <textarea
                  rows={2}
                  value={meetAgenda}
                  onChange={(e) => setMeetAgenda(e.target.value)}
                  placeholder="1. Rever bolas paradas defensivas&#10;2. Planeamento da semana&#10;3. Relatório clínico"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 resize-none font-sans"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="add-club-calendar"
                  checked={addToClubCalendar}
                  onChange={(e) => setAddToClubCalendar(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <label htmlFor="add-club-calendar" className="text-xs font-mono text-slate-300">
                  Adicionar automaticamente ao Calendário de Eventos do Clube
                </label>
              </div>
            </div>
          )}

          {/* MAIN MESSAGE / NOTES */}
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase font-bold mb-1">
              {msgType === 'reuniao' ? 'Notas Adicionais / Mensagem:' : 'Conteúdo do Recado:'}
            </label>
            <textarea
              rows={3}
              required={msgType !== 'reuniao'}
              value={msgContent}
              onChange={(e) => setMsgContent(e.target.value)}
              placeholder="Escreve aqui os detalhes, orientações ou pontos importantes para a equipa..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-cyan-400 resize-none font-sans"
            />
          </div>

          {/* PRIORITY SELECTOR (IF NOT URGENT TYPE) */}
          {msgType !== 'urgente' && (
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase font-bold mb-1">
                Nível de Prioridade:
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'normal', label: 'Normal', color: 'bg-slate-950 border-slate-700 text-slate-300' },
                  { id: 'alta', label: '🟡 Alta', color: 'bg-amber-950/40 border-amber-500/50 text-amber-300' },
                  { id: 'urgente', label: '🚨 Urgente', color: 'bg-rose-950/40 border-rose-500/50 text-rose-300' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setMsgPriority(p.id as 'normal' | 'alta' | 'urgente')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                      msgPriority === p.id
                        ? `${p.color} border-current font-bold ring-1 ring-cyan-400`
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TARGET STAFF SELECTION */}
          {staffList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-300 uppercase font-bold">
                  Destinatários da Equipa Técnica:
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllStaff}
                  className="text-[11px] font-mono text-cyan-400 hover:underline"
                >
                  {selectedStaffIds.length === staffList.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
                {staffList.map((staff) => {
                  const isChecked = selectedStaffIds.includes(staff.id);
                  return (
                    <label
                      key={staff.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleStaff(staff.id)}
                        className="w-3.5 h-3.5 rounded text-cyan-500 bg-slate-950 border-slate-700"
                      />
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">{staff.name}</span>
                        <span className="text-[10px] text-slate-500 truncate">{staff.role || 'Staff'}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-1">
                * Se não selecionares nenhum, o aviso será dirigido a toda a equipa técnica.
              </p>
            </div>
          )}

          {/* NOTIFICATION CHANNELS TOGGLES */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">
              Canais de Notificação Imediata:
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendPushImmediate}
                  onChange={(e) => setSendPushImmediate(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                />
                <span>🔔 Notificação Interna da App</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsAppImmediate}
                  onChange={(e) => setSendWhatsAppImmediate(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                />
                <span>📱 Abrir Alerta Formatado para WhatsApp</span>
              </label>
            </div>
          </div>

          {/* FOOTER BUTTONS */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs font-mono font-bold uppercase transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,210,255,0.4)]"
            >
              {msgType === 'reuniao' ? '📅 Marcar e Publicar Reunião' : '📢 Publicar no Chat / Quadro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
