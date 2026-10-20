import React, { useState, useRef, useEffect } from 'react';
import { StaffChatMessage, StaffMessageType, StaffMember, UserAccount } from '../../../types';
import { QUICK_MESSAGE_PRESETS } from './types';

interface StaffChatQuickBarProps {
  currentSenderName: string;
  currentSenderRole: string;
  currentSenderId: string;
  staffMembers: StaffMember[];
  currentUser?: UserAccount;
  replyingTo: StaffChatMessage | null;
  onCancelReply: () => void;
  onSendMessage: (params: {
    content: string;
    title?: string;
    type: StaffMessageType;
    priority: 'normal' | 'alta' | 'urgente';
    senderName: string;
    senderRole: string;
    senderId: string;
    replyToId?: string;
    sendWhatsApp?: boolean;
  }) => void;
  onOpenAdvancedComposer: () => void;
  onChangeSender: (senderId: string, name: string, role: string) => void;
}

export const StaffChatQuickBar: React.FC<StaffChatQuickBarProps> = ({
  currentSenderName,
  currentSenderRole,
  currentSenderId,
  staffMembers,
  replyingTo,
  onCancelReply,
  onSendMessage,
  onOpenAdvancedComposer,
  onChangeSender
}) => {
  const [text, setText] = useState('');
  const [msgType, setMsgType] = useState<StaffMessageType>('geral');
  const [msgPriority, setMsgPriority] = useState<'normal' | 'alta' | 'urgente'>('normal');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showSenderSelect, setShowSenderSelect] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleSend = () => {
    if (!text.trim()) return;

    onSendMessage({
      content: text.trim(),
      type: msgType,
      priority: msgType === 'urgente' ? 'urgente' : msgPriority,
      senderName: currentSenderName,
      senderRole: currentSenderRole,
      senderId: currentSenderId,
      replyToId: replyingTo?.id,
      sendWhatsApp
    });

    setText('');
    setMsgType('geral');
    setMsgPriority('normal');
    if (replyingTo) {
      onCancelReply();
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleApplyPreset = (preset: string) => {
    setText((prev) => (prev ? `${prev} ${preset}` : preset));
    setShowPresets(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="sticky bottom-0 z-30 pt-2 pb-1 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/40 backdrop-blur-md">
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-3 shadow-[0_-5px_25px_rgba(0,0,0,0.6)] space-y-2">
        {/* REPLY BANNER */}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-xs animate-fadeIn">
            <div className="flex items-center gap-2 truncate">
              <span className="text-cyan-400 font-bold">💬 A responder a {replyingTo.senderName}:</span>
              <span className="text-slate-300 truncate italic">
                "{replyingTo.title || replyingTo.content || 'Mensagem'}"
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-900 text-xs font-bold"
              title="Cancelar resposta"
            >
              ✕
            </button>
          </div>
        )}

        {/* QUICK CONTROLS BAR: Sender, Type, Presets, Advanced Modal */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Active Sender Chooser */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSenderSelect(!showSenderSelect)}
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Mudar quem está a falar nesta mensagem"
            >
              <span>👤</span>
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{currentSenderName}</span>
              <span className="text-[9px] text-slate-400 hidden sm:inline">({currentSenderRole})</span>
              <span className="text-[10px] text-cyan-400">▼</span>
            </button>

            {showSenderSelect && (
              <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-950 border border-cyan-500/50 rounded-xl shadow-2xl p-1.5 z-40 space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-slate-800">
                  Selecionar Remetente:
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {/* Default / Admin Option */}
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSender('staff_coach_1', 'Treinador Principal', 'Treinador Principal');
                      setShowSenderSelect(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-all ${
                      currentSenderId === 'staff_coach_1'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <span>Treinador Principal</span>
                    <span className="text-[10px] text-slate-500">Mister</span>
                  </button>

                  {/* Registered staff members */}
                  {staffMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        onChangeSender(member.id, member.name, member.role || 'Staff');
                        setShowSenderSelect(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-all ${
                        currentSenderId === member.id
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                          : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate">{member.name}</span>
                      <span className="text-[10px] text-slate-500 truncate ml-1">{member.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Type Quick Chips */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {[
              { id: 'geral', label: 'Conversa', icon: '💬' },
              { id: 'treino_jogo', label: 'Nota Jogo/Treino', icon: '⚽' },
              { id: 'recado', label: 'Recado', icon: '📌' },
              { id: 'urgente', label: 'Urgente', icon: '🚨' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setMsgType(t.id as StaffMessageType);
                  if (t.id === 'urgente') setMsgPriority('urgente');
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 ${
                  msgType === t.id
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800'
                }`}
              >
                <span>{t.icon}</span>
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Presets & Formal Modal Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition-all"
              title="Mensagens rápidas prontas"
            >
              <span>⚡</span>
              <span className="hidden sm:inline">Frases Rápidas</span>
            </button>

            <button
              type="button"
              onClick={onOpenAdvancedComposer}
              className="px-2.5 py-1 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
              title="Marcar Reunião formal com pauta e calendário"
            >
              <span>📅</span>
              <span className="hidden sm:inline">Marcar Reunião</span>
            </button>
          </div>
        </div>

        {/* QUICK PRESETS EXPANDABLE PANEL */}
        {showPresets && (
          <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-1.5 flex-wrap animate-fadeIn">
            <span className="text-[10px] font-mono text-slate-400 uppercase w-full">Clica para inserir:</span>
            {QUICK_MESSAGE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-300 text-[11px] font-mono transition-all text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {/* TEXT INPUT + SEND ACTIONS ROW */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Escreve uma mensagem para a equipa técnica... (Enter envia, Shift+Enter quebra linha)"
              className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none max-h-32 leading-relaxed"
            />
            {/* Quick emoji button inside textarea */}
            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setText((prev) => `${prev} 👍`)}
                className="hover:scale-125 transition-transform text-xs"
                title="Inserir 👍"
              >
                👍
              </button>
              <button
                type="button"
                onClick={() => setText((prev) => `${prev} ⚽`)}
                className="hover:scale-125 transition-transform text-xs"
                title="Inserir ⚽"
              >
                ⚽
              </button>
            </div>
          </div>

          {/* Instant WhatsApp Alert Toggle */}
          <button
            type="button"
            onClick={() => setSendWhatsApp(!sendWhatsApp)}
            className={`p-2.5 rounded-xl border text-sm transition-all flex items-center justify-center ${
              sendWhatsApp
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40'
            }`}
            title={sendWhatsApp ? 'Alerta WhatsApp ativado' : 'Ativar envio de alerta para o WhatsApp'}
          >
            <span>💬</span>
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className={`px-4 py-2.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md ${
              text.trim()
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)] active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
            }`}
            id="btn-enviar-chat-staff"
          >
            <span>🚀</span>
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
