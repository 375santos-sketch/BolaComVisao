import React, { useState } from 'react';
import { StaffChatMessage, AppState } from '../../../types';
import { MESSAGE_TYPE_CONFIG } from './types';
import { Badge } from '../../ui/Badge';
import {
  openWhatsAppAlert,
  shareNativeMobileAlert,
  getGoogleCalendarUrl,
  downloadMeetingIcs,
  formatDisplayDate
} from '../../../lib/staffAlertUtils';

interface StaffChatBoardViewProps {
  messages: StaffChatMessage[];
  currentSenderId: string;
  currentSenderName: string;
  state: AppState;
  onReplyToMessage: (message: StaffChatMessage) => void;
  onConfirmAttendance: (messageId: string, status: 'confirmado' | 'recusado') => void;
  onReaction: (messageId: string, emoji: string) => void;
  onTogglePin: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onSendInlineReply: (messageId: string, content: string) => void;
}

export const StaffChatBoardView: React.FC<StaffChatBoardViewProps> = ({
  messages,
  currentSenderId,
  currentSenderName: _currentSenderName,
  state,
  onReplyToMessage,
  onConfirmAttendance,
  onReaction,
  onTogglePin,
  onDeleteMessage,
  onSendInlineReply
}) => {
  const [inlineReplyMsgId, setInlineReplyMsgId] = useState<string | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState<string>('');

  if (messages.length === 0) {
    return (
      <div className="p-10 text-center bg-slate-900/60 border border-slate-800 rounded-2xl my-4">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-sm font-['Chakra_Petch'] text-cyan-300 uppercase font-bold">
          Nenhum recado ou reunião encontrado com estes filtros
        </p>
        <p className="text-xs font-mono text-slate-500 mt-1">
          Altera o filtro selecionado ou usa o botão acima para criar uma nova nota.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isMeeting = msg.type === 'reuniao' || Boolean(msg.meetingDetails);
        const isUrgent = msg.priority === 'urgente' || msg.type === 'urgente';
        const typeConf = MESSAGE_TYPE_CONFIG[msg.type] || MESSAGE_TYPE_CONFIG.recado;
        const meet = msg.meetingDetails;

        const dateFormatted = msg.createdAt
          ? new Date(msg.createdAt).toLocaleString('pt-PT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '';

        const confirmations = meet?.confirmations || [];
        const userConfirmStatus = confirmations.find((c) => c.staffId === currentSenderId)?.status;
        const confirmedCount = confirmations.filter((c) => c.status === 'confirmado').length;
        const declinedCount = confirmations.filter((c) => c.status === 'recusado').length;

        const replies = msg.replies || [];

        return (
          <div
            key={msg.id}
            className={`p-4 sm:p-5 rounded-2xl border transition-all text-left relative ${
              isUrgent
                ? 'bg-gradient-to-b from-rose-950/50 to-slate-950 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                : isMeeting
                ? 'bg-gradient-to-b from-cyan-950/40 to-slate-950 border-cyan-500/50 shadow-[0_0_15px_rgba(0,210,255,0.1)]'
                : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            {/* Pinned Tag */}
            {msg.pinned && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                <span>⭐</span>
                <span>Fixado</span>
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center text-base font-bold font-['Chakra_Petch'] text-cyan-300 shadow-sm">
                  {msg.senderName ? msg.senderName.slice(0, 2).toUpperCase() : 'ET'}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white font-['Chakra_Petch']">{msg.senderName}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-700">
                      {msg.senderRole || 'Equipa Técnica'}
                    </span>
                    <Badge variant={typeConf.badgeVariant} size="xs">
                      {typeConf.icon} {typeConf.label}
                    </Badge>
                    {msg.priority === 'alta' && (
                      <Badge variant="amber" size="xs">
                        Alta Prioridade
                      </Badge>
                    )}
                    {isUrgent && (
                      <Badge variant="rose" size="xs">
                        🚨 URGENTE
                      </Badge>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{dateFormatted}</span>
                    <span>·</span>
                    <span className="text-cyan-300">🎯 {msg.targetLabel || 'Toda a Equipa'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            {msg.title && msg.title.trim() && (
              <h4 className="text-sm sm:text-base font-bold font-['Chakra_Petch'] text-cyan-200 mb-2">
                {msg.title}
              </h4>
            )}

            {/* Meeting Card Details */}
            {isMeeting && meet && (
              <div className="my-3 p-3.5 sm:p-4 rounded-xl bg-slate-950/90 border border-cyan-500/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                    <span className="text-xl">📅</span>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-400">Data</div>
                      <div className="text-xs sm:text-sm font-bold text-cyan-200 font-mono">
                        {formatDisplayDate(meet.date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                    <span className="text-xl">⏰</span>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-400">Horário</div>
                      <div className="text-xs sm:text-sm font-bold text-cyan-200 font-mono">
                        {meet.time} {meet.endTime ? `às ${meet.endTime}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                    <span className="text-xl">📍</span>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-400">Local</div>
                      <div className="text-xs sm:text-sm font-bold text-cyan-200 font-mono truncate">
                        {meet.location || 'Gabinete Técnico'}
                      </div>
                    </div>
                  </div>
                </div>

                {meet.agenda && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                    <div className="font-bold text-slate-300 font-mono uppercase text-[10px] mb-1 flex items-center gap-1">
                      <span>📝</span>
                      <span>Ordem de Trabalhos:</span>
                    </div>
                    <div className="text-slate-200 whitespace-pre-line font-sans">{meet.agenda}</div>
                  </div>
                )}

                {/* RSVP Status */}
                <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-300">Presenças:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
                      ✅ {confirmedCount} Confirmados
                    </span>
                    {declinedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40 text-xs font-bold font-mono">
                        ❌ {declinedCount} Indisponíveis
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onConfirmAttendance(msg.id, 'confirmado')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                        userConfirmStatus === 'confirmado'
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/80'
                      }`}
                    >
                      <span>✅</span>
                      <span>{userConfirmStatus === 'confirmado' ? 'Presença Confirmada' : 'Confirmar Presença'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onConfirmAttendance(msg.id, 'recusado')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                        userConfirmStatus === 'recusado'
                          ? 'bg-rose-500 text-slate-950'
                          : 'bg-slate-900 text-rose-300 border border-rose-500/30 hover:bg-rose-950/60'
                      }`}
                    >
                      <span>❌</span>
                      <span>{userConfirmStatus === 'recusado' ? 'Indisponível' : 'Recusar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content text */}
            {msg.content && msg.content.trim() && (
              <div className="text-sm text-slate-200 whitespace-pre-line font-sans mb-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                {msg.content}
              </div>
            )}

            {/* Replies Thread */}
            {replies.length > 0 && (
              <div className="my-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold font-mono text-cyan-300 uppercase">
                  💬 Respostas & Discussão ({replies.length}):
                </div>
                {replies.map((r) => (
                  <div key={r.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] mb-0.5">
                      <span className="font-bold text-white">{r.senderName} ({r.senderRole || 'Staff'})</span>
                      <span>{new Date(r.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-200">{r.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Quick Reply Box */}
            {inlineReplyMsgId === msg.id && (
              <div className="mb-3 flex items-center gap-2 animate-fadeIn">
                <input
                  type="text"
                  autoFocus
                  placeholder={`Responder a ${msg.senderName}...`}
                  value={inlineReplyText}
                  onChange={(e) => setInlineReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSendInlineReply(msg.id, inlineReplyText);
                      setInlineReplyText('');
                      setInlineReplyMsgId(null);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/50 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSendInlineReply(msg.id, inlineReplyText);
                    setInlineReplyText('');
                    setInlineReplyMsgId(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs font-['Chakra_Petch']"
                >
                  Enviar
                </button>
                <button
                  type="button"
                  onClick={() => setInlineReplyMsgId(null)}
                  className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Reply Button */}
                <button
                  type="button"
                  onClick={() => {
                    setInlineReplyMsgId(inlineReplyMsgId === msg.id ? null : msg.id);
                    onReplyToMessage(msg);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 transition-all"
                >
                  <span>💬</span>
                  <span>Responder</span>
                </button>

                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => openWhatsAppAlert(msg, state)}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1 transition-all"
                >
                  <span>📱</span>
                  <span>WhatsApp</span>
                </button>

                {/* Mobile Share */}
                <button
                  type="button"
                  onClick={() => shareNativeMobileAlert(msg, state)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 text-xs font-mono font-bold flex items-center gap-1 transition-all"
                >
                  <span>📤</span>
                  <span>Partilhar</span>
                </button>

                {/* Calendar Links */}
                {isMeeting && meet && (
                  <>
                    <a
                      href={getGoogleCalendarUrl(meet, state)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-blue-950/80 border border-blue-500/50 hover:border-blue-400 text-blue-300 text-xs font-mono font-bold flex items-center gap-1 transition-all"
                    >
                      <span>📅</span>
                      <span>Google Calendar</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => downloadMeetingIcs(meet, state)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1 transition-all"
                    >
                      <span>📥</span>
                      <span>.ICS</span>
                    </button>
                  </>
                )}
              </div>

              {/* Reactions & Management */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {['👍', '⚽', '📅', '👀', '✅'].map((emoji) => {
                    const count = (msg.reactions || []).filter((r) => r.emoji === emoji).length;
                    const hasReacted = (msg.reactions || []).some((r) => r.emoji === emoji && r.by === currentSenderId);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onReaction(msg.id, emoji)}
                        className={`px-1.5 py-0.5 rounded-lg text-xs transition-all flex items-center gap-0.5 ${
                          hasReacted ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'hover:bg-slate-800 text-slate-400'
                        }`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-[10px] font-mono">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => onTogglePin(msg.id)}
                  className={`p-1.5 rounded-xl border text-xs transition-all ${
                    msg.pinned
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                  title={msg.pinned ? 'Desafixar' : 'Fixar'}
                >
                  ⭐
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteMessage(msg.id)}
                  className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 text-xs transition-all"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
