import React, { useState, useMemo } from 'react';
import {
  AppState,
  StaffMember,
  StaffChatMessage,
  StaffMessageType,
  StaffMeetingDetails,
  StaffChatReply
} from '../../types';
import { uid } from '../../lib/utils';
import {
  openWhatsAppAlert,
  sendStaffPushNotification,
  syncStaffMeetingToClubEvents
} from '../../lib/staffAlertUtils';
import { StaffChatViewMode } from './staffChat/types';
import { StaffChatQuickBar } from './staffChat/StaffChatQuickBar';
import { StaffChatConversationView } from './staffChat/StaffChatConversationView';
import { StaffChatBoardView } from './staffChat/StaffChatBoardView';
import { StaffChatComposerModal } from './staffChat/StaffChatComposerModal';

interface StaffChatSectionProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast: (msg: string) => void;
  onNavigateToCalendar?: () => void;
}

export const StaffChatSection: React.FC<StaffChatSectionProps> = ({
  state,
  onUpdateState,
  onShowConfirm,
  onShowToast,
  onNavigateToCalendar: _onNavigateToCalendar
}) => {
  const [viewMode, setViewMode] = useState<StaffChatViewMode>('conversa');
  const [filterType, setFilterType] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [replyingToMessage, setReplyingToMessage] = useState<StaffChatMessage | null>(null);

  // Active sender configuration
  const defaultSenderName = state.currentUser?.name || 'Treinador Principal';
  const defaultSenderRole = state.currentUser?.role || 'Treinador Principal';
  const defaultSenderId = state.currentUser?.id || 'staff_coach_1';

  const [currentSenderId, setCurrentSenderId] = useState<string>(defaultSenderId);
  const [currentSenderName, setCurrentSenderName] = useState<string>(defaultSenderName);
  const [currentSenderRole, setCurrentSenderRole] = useState<string>(defaultSenderRole);

  const staffMembers: StaffMember[] = useMemo(() => state.staffMembers || [], [state.staffMembers]);
  const messages: StaffChatMessage[] = useMemo(() => state.staffMessages || [], [state.staffMessages]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Type Filter
      if (filterType === 'fixados' && !msg.pinned) return false;
      if (filterType === 'reuniao' && msg.type !== 'reuniao' && !msg.meetingDetails) return false;
      if (filterType === 'urgente' && msg.type !== 'urgente' && msg.priority !== 'urgente') return false;
      if (filterType === 'conversa' && msg.type !== 'geral' && msg.type !== 'treino_jogo') return false;
      if (filterType === 'recados' && msg.type !== 'recado' && msg.type !== 'indisponibilidade') return false;

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = msg.title?.toLowerCase().includes(q) || false;
        const matchContent = msg.content?.toLowerCase().includes(q) || false;
        const matchSender = msg.senderName?.toLowerCase().includes(q) || false;
        const matchAgenda = msg.meetingDetails?.agenda?.toLowerCase().includes(q) || false;
        const matchReplies = (msg.replies || []).some((r) => r.content.toLowerCase().includes(q) || r.senderName.toLowerCase().includes(q));
        if (!matchTitle && !matchContent && !matchSender && !matchAgenda && !matchReplies) {
          return false;
        }
      }

      return true;
    });
  }, [messages, filterType, searchQuery]);

  // Send inline reply
  const handleSendInlineReply = React.useCallback((messageId: string, content: string) => {
    if (!content.trim()) return;

    const timestamp = Date.now();
    const newReply: StaffChatReply = {
      id: uid(),
      senderId: currentSenderId,
      senderName: currentSenderName,
      senderRole: currentSenderRole,
      content: content.trim(),
      createdAt: timestamp,
      reactions: []
    };

    const updatedMessages = messages.map((m) => {
      if (m.id === messageId) {
        return {
          ...m,
          replies: [...(m.replies || []), newReply]
        };
      }
      return m;
    });

    onUpdateState({ staffMessages: updatedMessages });
    onShowToast('Resposta adicionada à conversa ✓');
  }, [currentSenderId, currentSenderName, currentSenderRole, messages, onShowToast, onUpdateState]);

  // Handle Quick Message sending from bar
  const handleSendQuickMessage = React.useCallback(
    (params: {
      content: string;
      title?: string;
      type: StaffMessageType;
      priority: 'normal' | 'alta' | 'urgente';
      senderName: string;
      senderRole: string;
      senderId: string;
      replyToId?: string;
      sendWhatsApp?: boolean;
    }) => {
      // If it's a direct reply to a parent message:
      if (params.replyToId) {
        handleSendInlineReply(params.replyToId, params.content);
        return;
      }

      const timestamp = Date.now();
      const newMessage: StaffChatMessage = {
        id: uid(),
        teamId: state.activeTeamId,
        senderId: params.senderId,
        senderName: params.senderName,
        senderRole: params.senderRole,
        type: params.type,
        title: params.title,
        content: params.content,
        priority: params.priority,
        createdAt: timestamp,
        pinned: false,
        reactions: [],
        replies: [],
        targetStaffIds: [],
        targetLabel: 'Toda a Equipa Técnica'
      };

      const updatedMessages = [newMessage, ...messages];
      const updates: Partial<AppState> = { staffMessages: updatedMessages };

      // Internal app notification
      void sendStaffPushNotification(newMessage, state);

      onUpdateState(updates);
      onShowToast('Mensagem enviada na conversa ✓');

      if (params.sendWhatsApp) {
        openWhatsAppAlert(newMessage, state);
      }
    },
    [handleSendInlineReply, messages, onShowToast, onUpdateState, state]
  );

  // Handle creating formal meeting / memo from modal
  const handleCreateComposerMessage = React.useCallback((payload: {
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
  }) => {
    const timestamp = Date.now();
    const newMessage: StaffChatMessage = {
      id: uid(),
      teamId: state.activeTeamId,
      senderId: currentSenderId,
      senderName: currentSenderName,
      senderRole: currentSenderRole,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      priority: payload.priority,
      meetingDetails: payload.meetingDetails,
      targetStaffIds: payload.targetStaffIds,
      targetLabel: payload.targetLabel,
      createdAt: timestamp,
      pinned: payload.type === 'urgente' || payload.priority === 'urgente',
      reactions: [],
      replies: []
    };

    const updatedMessages = [newMessage, ...messages];
    const updates: Partial<AppState> = { staffMessages: updatedMessages };

    // Calendar sync
    if (payload.type === 'reuniao' && payload.meetingDetails && payload.addToClubCalendar) {
      syncStaffMeetingToClubEvents(payload.meetingDetails, state, (partial) => {
        if (partial.clubEvents) updates.clubEvents = partial.clubEvents;
      });
    }

    // Notifications
    if (payload.sendPushImmediate) {
      void sendStaffPushNotification(newMessage, state);
    }

    onUpdateState(updates);
    onShowToast(
      payload.type === 'reuniao'
        ? 'Reunião agendada e publicada ✓'
        : 'Recado publicado com sucesso ✓'
    );

    if (payload.sendWhatsAppImmediate) {
      openWhatsAppAlert(newMessage, state);
    }
  }, [currentSenderId, currentSenderName, currentSenderRole, messages, onShowToast, onUpdateState, state]);

  // Reaction toggles
  const handleReaction = (messageId: string, emoji: string) => {
    const updatedMessages = messages.map((m) => {
      if (m.id === messageId) {
        const reactions = [...(m.reactions || [])];
        const existingIdx = reactions.findIndex((r) => r.emoji === emoji && r.by === currentSenderId);

        if (existingIdx >= 0) {
          reactions.splice(existingIdx, 1);
        } else {
          reactions.push({
            emoji,
            by: currentSenderId,
            userName: currentSenderName
          });
        }
        return { ...m, reactions };
      }
      return m;
    });

    onUpdateState({ staffMessages: updatedMessages });
  };

  // Reply reaction toggle
  const handleReplyReaction = (messageId: string, replyId: string, emoji: string) => {
    const updatedMessages = messages.map((m) => {
      if (m.id === messageId && m.replies) {
        const updatedReplies = m.replies.map((r) => {
          if (r.id === replyId) {
            const reactions = [...(r.reactions || [])];
            const existingIdx = reactions.findIndex((item) => item.emoji === emoji && item.by === currentSenderId);
            if (existingIdx >= 0) {
              reactions.splice(existingIdx, 1);
            } else {
              reactions.push({
                emoji,
                by: currentSenderId,
                userName: currentSenderName
              });
            }
            return { ...r, reactions };
          }
          return r;
        });
        return { ...m, replies: updatedReplies };
      }
      return m;
    });

    onUpdateState({ staffMessages: updatedMessages });
  };

  // Toggle Pin
  const handleTogglePin = (messageId: string) => {
    const updatedMessages = messages.map((m) => {
      if (m.id === messageId) {
        const newPinned = !m.pinned;
        onShowToast(newPinned ? 'Mensagem fixada no topo ⭐' : 'Mensagem desafixada');
        return { ...m, pinned: newPinned };
      }
      return m;
    });
    onUpdateState({ staffMessages: updatedMessages });
  };

  // Delete message
  const handleDeleteMessage = (messageId: string) => {
    onShowConfirm('Tens a certeza que pretendes eliminar esta mensagem?', () => {
      const updatedMessages = messages.filter((m) => m.id !== messageId);
      onUpdateState({ staffMessages: updatedMessages });
      onShowToast('Mensagem eliminada ✓');
    });
  };

  // Delete reply
  const handleDeleteReply = (messageId: string, replyId: string) => {
    const updatedMessages = messages.map((m) => {
      if (m.id === messageId && m.replies) {
        return {
          ...m,
          replies: m.replies.filter((r) => r.id !== replyId)
        };
      }
      return m;
    });
    onUpdateState({ staffMessages: updatedMessages });
    onShowToast('Resposta eliminada ✓');
  };

  // Confirm attendance to meeting
  const handleConfirmAttendance = (messageId: string, status: 'confirmado' | 'recusado') => {
    const updatedMessages = messages.map((m) => {
      if (m.id === messageId && m.meetingDetails) {
        const currentConfirmations = [...(m.meetingDetails.confirmations || [])];
        const existingIdx = currentConfirmations.findIndex((c) => c.staffId === currentSenderId);

        const newConf = {
          staffId: currentSenderId,
          staffName: currentSenderName,
          staffRole: currentSenderRole,
          status,
          timestamp: Date.now()
        };

        if (existingIdx >= 0) {
          currentConfirmations[existingIdx] = newConf;
        } else {
          currentConfirmations.push(newConf);
        }

        return {
          ...m,
          meetingDetails: {
            ...m.meetingDetails,
            confirmations: currentConfirmations
          }
        };
      }
      return m;
    });

    onUpdateState({ staffMessages: updatedMessages });
    onShowToast(status === 'confirmado' ? 'Presença confirmada na reunião ✅' : 'Presença recusada ❌');
  };

  const handleSenderChange = (sId: string, sName: string, sRole: string) => {
    setCurrentSenderId(sId);
    setCurrentSenderName(sName);
    setCurrentSenderRole(sRole);
    onShowToast(`Agora a falar como: ${sName}`);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-fadeIn relative">
      {/* HEADER SECTION WITH MODE SWITCHER & QUICK STATS */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">💬</span>
              <h2 className="text-lg sm:text-xl font-bold font-['Chakra_Petch'] text-white uppercase tracking-wider">
                Chat & Comunicação da Equipa Técnica
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
                {messages.length} mensagens
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Conversas em direto, alinhamento tático, recados rápidos e agendamento de reuniões
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* VIEW MODE TOGGLE: CONVERSA VS PAINEL */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('conversa')}
                className={`px-3 py-1.5 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1.5 ${
                  viewMode === 'conversa'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>💬</span>
                <span>Modo Conversa</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('painel')}
                className={`px-3 py-1.5 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1.5 ${
                  viewMode === 'painel'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📋</span>
                <span>Quadro de Recados</span>
              </button>
            </div>

            {/* FORMAL REUNION/MEMO COMPOSER BUTTON */}
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,210,255,0.2)]"
            >
              <span>➕</span>
              <span>Nova Reunião / Recado</span>
            </button>
          </div>
        </div>

        {/* SEARCH AND FILTER BAR */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none py-1">
            {[
              { id: 'todos', label: 'Todas as Mensagens' },
              { id: 'conversa', label: '💬 Conversas' },
              { id: 'reuniao', label: '📅 Reuniões' },
              { id: 'urgente', label: '🚨 Urgentes' },
              { id: 'recados', label: '📌 Recados' },
              { id: 'fixados', label: '⭐ Fixados' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                  filterType === f.id
                    ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64 relative">
            <input
              type="text"
              placeholder="Pesquisar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ACTIVE VIEW (CONVERSATION STREAM VS BOARD VIEW) */}
      {viewMode === 'conversa' ? (
        <StaffChatConversationView
          messages={filteredMessages}
          currentSenderId={currentSenderId}
          currentSenderName={currentSenderName}
          currentSenderRole={currentSenderRole}
          state={state}
          onReplyToMessage={(msg) => setReplyingToMessage(msg)}
          onSendInlineReply={handleSendInlineReply}
          onConfirmAttendance={handleConfirmAttendance}
          onReaction={handleReaction}
          onReplyReaction={handleReplyReaction}
          onTogglePin={handleTogglePin}
          onDeleteMessage={handleDeleteMessage}
          onDeleteReply={handleDeleteReply}
        />
      ) : (
        <StaffChatBoardView
          messages={filteredMessages}
          currentSenderId={currentSenderId}
          currentSenderName={currentSenderName}
          state={state}
          onReplyToMessage={(msg) => setReplyingToMessage(msg)}
          onConfirmAttendance={handleConfirmAttendance}
          onReaction={handleReaction}
          onTogglePin={handleTogglePin}
          onDeleteMessage={handleDeleteMessage}
          onSendInlineReply={handleSendInlineReply}
        />
      )}

      {/* PERSISTENT QUICK CONVERSATIONAL CHAT BAR */}
      <StaffChatQuickBar
        currentSenderName={currentSenderName}
        currentSenderRole={currentSenderRole}
        currentSenderId={currentSenderId}
        staffMembers={staffMembers}
        currentUser={state.currentUser}
        replyingTo={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
        onSendMessage={handleSendQuickMessage}
        onOpenAdvancedComposer={() => setIsComposerOpen(true)}
        onChangeSender={handleSenderChange}
      />

      {/* ADVANCED COMPOSER MODAL FOR MEETINGS & FORMAL NOTICES */}
      <StaffChatComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        state={state}
        currentSenderId={currentSenderId}
        currentSenderName={currentSenderName}
        currentSenderRole={currentSenderRole}
        onCreateMessage={handleCreateComposerMessage}
      />
    </div>
  );
};

export default StaffChatSection;
