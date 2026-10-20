import React, { useState } from 'react';
import { StaffChatMessage, StaffChatReply, AppState } from '../../../types';
import { MESSAGE_TYPE_CONFIG } from './types';
import { Badge } from '../../ui/Badge';
import {
  openWhatsAppAlert,
  shareNativeMobileAlert,
  getGoogleCalendarUrl,
  downloadMeetingIcs,
  formatDisplayDate
} from '../../../lib/staffAlertUtils';

interface StaffChatConversationViewProps {
  messages: StaffChatMessage[];
  currentSenderId: string;
  currentSenderName: string;
  currentSenderRole: string;
  state: AppState;
  onReplyToMessage: (message: StaffChatMessage) => void;
  onSendInlineReply: (messageId: string, content: string) => void;
  onConfirmAttendance: (messageId: string, status: 'confirmado' | 'recusado') => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReplyReaction: (messageId: string, replyId: string, emoji: string) => void;
  onTogglePin: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteReply: (messageId: string, replyId: string) => void;
}

export const StaffChatConversationView: React.FC<StaffChatConversationViewProps> = ({
  messages,
  currentSenderId,
  currentSenderName,
  currentSenderRole: _currentSenderRole,
  state,
  onReplyToMessage,
  onSendInlineReply,
  onConfirmAttendance,
  onReaction,
  onReplyReaction,
  onTogglePin,
  onDeleteMessage,
  onDeleteReply
}) => {
  const [inlineReplyMsgId, setInlineReplyMsgId] = useState<string | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState<string>('');
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  // Helper to format date groups
  const getDateKey = (timestamp?: number) => {
    if (!timestamp) return 'Sem Data';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';

    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Group messages chronologically (oldest to newest for chat flow)
  const sortedMessages = [...messages].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  // Group by day
  const groupedMessages: { dateLabel: string; items: StaffChatMessage[] }[] = [];
  let currentDateGroup = '';
  let currentGroupItems: StaffChatMessage[] = [];

  sortedMessages.forEach((msg) => {
    const dLabel = getDateKey(msg.createdAt);
    if (dLabel !== currentDateGroup) {
      if (currentGroupItems.length > 0) {
        groupedMessages.push({ dateLabel: currentDateGroup, items: currentGroupItems });
      }
      currentDateGroup = dLabel;
      currentGroupItems = [msg];
    } else {
      currentGroupItems.push(msg);
    }
  });

  if (currentGroupItems.length > 0) {
    groupedMessages.push({ dateLabel: currentDateGroup, items: currentGroupItems });
  }

  const handleSendInline = (msgId: string) => {
    if (!inlineReplyText.trim()) return;
    onSendInlineReply(msgId, inlineReplyText.trim());
    setInlineReplyText('');
    setInlineReplyMsgId(null);
    setExpandedThreads((prev) => ({ ...prev, [msgId]: true }));
  };

  const toggleThread = (msgId: string) => {
    setExpandedThreads((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  if (sortedMessages.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl my-4">
        <div className="text-4xl mb-3">💬</div>
        <h3 className="text-base font-bold font-['Chakra_Petch'] text-cyan-300 uppercase">
          Ainda não há mensagens na conversa
        </h3>
        <p className="text-xs font-mono text-slate-400 mt-1 max-w-md mx-auto">
          Usa a barra rápida em baixo para escrever a primeira mensagem, trocar ideias com os treinadores ou marcar uma
          reunião técnica.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {groupedMessages.map((group, gIdx) => (
        <div key={gIdx} className="space-y-4">
          {/* DATE SEPARATOR */}
          <div className="flex items-center justify-center my-3">
            <span className="px-3.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-mono font-bold text-slate-400 shadow-sm">
              {group.dateLabel}
            </span>
          </div>

          {/* MESSAGES IN DAY */}
          {group.items.map((msg) => {
            const isMe =
              msg.senderId === currentSenderId ||
              (msg.senderName &&
                currentSenderName &&
                msg.senderName.trim().toLowerCase() === currentSenderName.trim().toLowerCase());
            const isMeeting = msg.type === 'reuniao' || Boolean(msg.meetingDetails);
            const isUrgent = msg.priority === 'urgente' || msg.type === 'urgente';
            const typeConf = MESSAGE_TYPE_CONFIG[msg.type] || MESSAGE_TYPE_CONFIG.geral;
            const meet = msg.meetingDetails;

            const timeFormatted = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
              : '';

            const replies: StaffChatReply[] = msg.replies || [];
            const hasReplies = replies.length > 0;
            const isThreadExpanded = expandedThreads[msg.id] ?? true;

            const confirmations = meet?.confirmations || [];
            const userConfirmStatus = confirmations.find((c) => c.staffId === currentSenderId)?.status;
            const confirmedCount = confirmations.filter((c) => c.status === 'confirmado').length;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group transition-all animate-fadeIn`}
              >
                {/* SENDER LABEL (For left side messages) */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1 text-xs font-mono">
                    <span className="font-bold text-white font-['Chakra_Petch']">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {msg.senderRole || 'Equipa Técnica'}
                    </span>
                    {msg.targetLabel && msg.targetLabel !== 'Toda a Equipa Técnica' && (
                      <span className="text-[10px] text-cyan-400">para {msg.targetLabel}</span>
                    )}
                  </div>
                )}

                {/* SENDER LABEL (For right side messages if not self-evident) */}
                {isMe && (
                  <div className="flex items-center gap-1.5 mb-1 mr-1 text-xs font-mono text-slate-400">
                    <span className="text-[10px] text-cyan-300 font-bold">Tu ({msg.senderRole || 'Treinador'})</span>
                    {msg.targetLabel && msg.targetLabel !== 'Toda a Equipa Técnica' && (
                      <span className="text-[10px] text-cyan-400">para {msg.targetLabel}</span>
                    )}
                  </div>
                )}

                {/* MAIN CHAT BUBBLE */}
                <div
                  className={`relative max-w-[92%] sm:max-w-[80%] md:max-w-[70%] p-3.5 sm:p-4 rounded-2xl border text-left shadow-lg transition-all ${
                    isUrgent
                      ? 'bg-rose-950/70 border-rose-500/80 text-white shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : isMe
                        ? 'bg-gradient-to-br from-slate-900 to-cyan-950/80 border-cyan-500/50 text-slate-100'
                        : isMeeting
                          ? 'bg-slate-900/95 border-cyan-500/40 text-slate-100'
                          : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {/* PINNED BADGE */}
                  {msg.pinned && (
                    <div className="flex items-center gap-1 mb-1.5 text-[10px] font-mono font-bold text-amber-300">
                      <span>⭐</span>
                      <span>Fixado no topo</span>
                    </div>
                  )}

                  {/* HEADER TAGS (Type & Priority) */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <Badge variant={typeConf.badgeVariant} size="xs">
                      {typeConf.icon} {typeConf.label}
                    </Badge>
                    {isUrgent && (
                      <Badge variant="rose" size="xs">
                        🚨 Urgente
                      </Badge>
                    )}
                    {msg.priority === 'alta' && (
                      <Badge variant="amber" size="xs">
                        🟡 Alta
                      </Badge>
                    )}
                  </div>

                  {/* TITLE IF ANY */}
                  {msg.title && msg.title.trim() && (
                    <div className="font-bold text-sm sm:text-base font-['Chakra_Petch'] text-cyan-300 mb-1.5">
                      {msg.title}
                    </div>
                  )}

                  {/* MEETING CARD INLINE */}
                  {isMeeting && meet && (
                    <div className="my-2.5 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/40 space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300 font-mono">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase">📅 Data</div>
                          <div className="font-bold text-cyan-200">{formatDisplayDate(meet.date)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase">⏰ Horário</div>
                          <div className="font-bold text-cyan-200">
                            {meet.time} {meet.endTime ? `às ${meet.endTime}` : ''}
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <div className="text-[10px] text-slate-400 uppercase">📍 Local</div>
                          <div className="font-bold text-cyan-200 truncate">{meet.location || 'Gabinete Técnico'}</div>
                        </div>
                      </div>

                      {meet.agenda && (
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                          <span className="font-bold text-slate-400 uppercase text-[9px] block mb-0.5">
                            Ordem de Trabalhos:
                          </span>
                          <p className="whitespace-pre-line text-slate-200">{meet.agenda}</p>
                        </div>
                      )}

                      {/* RSVP BUTTONS */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-[11px] font-mono text-emerald-400 font-bold">
                          ✅ {confirmedCount} confirmados
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onConfirmAttendance(msg.id, 'confirmado')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                              userConfirmStatus === 'confirmado'
                                ? 'bg-emerald-500 text-slate-950 font-black'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900'
                            }`}
                          >
                            <span>✅</span>
                            <span>{userConfirmStatus === 'confirmado' ? 'Confirmado' : 'Confirmar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onConfirmAttendance(msg.id, 'recusado')}
                            className={`px-2 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
                              userConfirmStatus === 'recusado'
                                ? 'bg-rose-500 text-slate-950 font-bold'
                                : 'bg-slate-900 text-rose-300 border border-rose-500/30 hover:bg-rose-950'
                            }`}
                          >
                            <span>❌</span>
                            <span>{userConfirmStatus === 'recusado' ? 'Indisponível' : 'Recusar'}</span>
                          </button>

                          <a
                            href={getGoogleCalendarUrl(meet, state)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-blue-950/80 border border-blue-500/40 text-blue-300 hover:text-white"
                            title="Abrir no Google Calendar"
                          >
                            📅
                          </a>

                          <button
                            type="button"
                            onClick={() => downloadMeetingIcs(meet, state)}
                            className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs"
                            title="Baixar .ICS para calendário"
                          >
                            📥
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MESSAGE TEXT CONTENT */}
                  {msg.content && msg.content.trim() && (
                    <div className="text-sm whitespace-pre-line leading-relaxed break-words font-sans">
                      {msg.content}
                    </div>
                  )}

                  {/* FOOTER: TIME + REACTIONS PILL + ACTIONS */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-800/60 text-xs">
                    {/* Left/Reactions Pill */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Active reactions */}
                      {(msg.reactions || []).map((r, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => onReaction(msg.id, r.emoji)}
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono border flex items-center gap-0.5 transition-all ${
                            r.by === currentSenderId
                              ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 font-bold'
                              : 'bg-slate-950/80 text-slate-300 border-slate-800'
                          }`}
                          title={`${r.userName} reagiu`}
                        >
                          <span>{r.emoji}</span>
                        </button>
                      ))}

                      {/* Quick Emoji Trigger Button */}
                      <div className="flex items-center gap-0.5">
                        {['👍', '⚽', '👏', '👀'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => onReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform text-[11px] px-0.5 text-slate-400 hover:text-white"
                            title={`Reagir com ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: Timestamp & Action Buttons */}
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
                      <span>{timeFormatted}</span>
                      {isMe && <span className="text-cyan-400">✓✓</span>}

                      {/* Reply button */}
                      <button
                        type="button"
                        onClick={() => {
                          setInlineReplyMsgId(inlineReplyMsgId === msg.id ? null : msg.id);
                          onReplyToMessage(msg);
                        }}
                        className="hover:text-cyan-300 transition-colors font-bold flex items-center gap-0.5"
                        title="Responder a esta mensagem"
                      >
                        <span>💬</span>
                        <span className="hidden sm:inline">Responder</span>
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        type="button"
                        onClick={() => openWhatsAppAlert(msg, state)}
                        className="hover:text-emerald-400 transition-colors"
                        title="Partilhar no WhatsApp"
                      >
                        📱
                      </button>

                      {/* Native Share */}
                      <button
                        type="button"
                        onClick={() => shareNativeMobileAlert(msg, state)}
                        className="hover:text-cyan-400 transition-colors"
                        title="Partilhar"
                      >
                        📤
                      </button>

                      {/* Pin */}
                      <button
                        type="button"
                        onClick={() => onTogglePin(msg.id)}
                        className="hover:text-amber-400 transition-colors"
                        title="Fixar mensagem"
                      >
                        {msg.pinned ? '⭐' : '☆'}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(msg.id)}
                        className="hover:text-rose-400 transition-colors"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* THREAD REPLIES SECTION */}
                {hasReplies && (
                  <div className={`mt-1.5 max-w-[88%] sm:max-w-[75%] ${isMe ? 'mr-2' : 'ml-2'} space-y-1.5`}>
                    <button
                      type="button"
                      onClick={() => toggleThread(msg.id)}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold mb-1"
                    >
                      <span>
                        💬 {replies.length} {replies.length === 1 ? 'Resposta na conversa' : 'Respostas na conversa'}
                      </span>
                      <span className="text-[10px]">{isThreadExpanded ? '▲ recolher' : '▼ expandir'}</span>
                    </button>

                    {isThreadExpanded && (
                      <div className="space-y-1.5 border-l-2 border-cyan-500/40 pl-3">
                        {replies.map((reply) => {
                          const isReplyMe =
                            reply.senderId === currentSenderId ||
                            reply.senderName.trim().toLowerCase() === currentSenderName.trim().toLowerCase();
                          const rTime = reply.createdAt
                            ? new Date(reply.createdAt).toLocaleTimeString('pt-PT', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '';

                          return (
                            <div
                              key={reply.id}
                              className={`p-2.5 rounded-xl border text-xs text-left shadow-sm ${
                                isReplyMe
                                  ? 'bg-cyan-950/50 border-cyan-500/40 text-slate-100'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white font-['Chakra_Petch']">{reply.senderName}</span>
                                  <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1 py-0.5 rounded">
                                    {reply.senderRole || 'Staff'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                                  <span>{rTime}</span>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteReply(msg.id, reply.id)}
                                    className="hover:text-rose-400 transition-colors"
                                    title="Eliminar resposta"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                              <p className="whitespace-pre-line text-xs font-sans text-slate-200">{reply.content}</p>

                              {/* Reply Reactions */}
                              <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-800/40">
                                {(reply.reactions || []).map((r, rIdx) => (
                                  <span
                                    key={rIdx}
                                    className="px-1 py-0.2 rounded bg-slate-950 text-[9px] font-mono text-cyan-300 border border-slate-800"
                                  >
                                    {r.emoji}
                                  </span>
                                ))}
                                {['👍', '⚽', '👏'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => onReplyReaction(msg.id, reply.id, emoji)}
                                    className="text-[10px] hover:scale-125 transition-transform text-slate-500 hover:text-white"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* INLINE QUICK REPLY INPUT (Under bubble if active) */}
                {inlineReplyMsgId === msg.id && (
                  <div className="w-full max-w-[88%] mt-2 flex items-center gap-1.5 animate-fadeIn">
                    <input
                      type="text"
                      autoFocus
                      placeholder={`Responder a ${msg.senderName}...`}
                      value={inlineReplyText}
                      onChange={(e) => setInlineReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendInline(msg.id);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendInline(msg.id)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase shadow-sm"
                    >
                      Enviar
                    </button>
                    <button
                      type="button"
                      onClick={() => setInlineReplyMsgId(null)}
                      className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
