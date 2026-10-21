import React, { useState } from 'react';
import { AppNotification, AppState, NotificationType } from '../types';
import { TabType } from './Navbar';
import { requestBrowserNotificationPermission } from '../lib/notificationEngine';

interface NotificationModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onClose: () => void;
  onNavigate: (tab: TabType, targetId?: string) => void;
  onOpenAdminUsers?: () => void;
  onShowToast: (msg: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  state,
  onUpdateState,
  onClose,
  onNavigate,
  onOpenAdminUsers,
  onShowToast
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'todas' | NotificationType>('todas');
  const [browserPermitted, setBrowserPermitted] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const notifications = state.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'todas') return true;
    return n.type === selectedFilter;
  });

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.map((n) => {
      if (n.id === id) return { ...n, read: true };
      return n;
    });
    onUpdateState({ notifications: updated });
  };

  const handleToggleRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.map((n) => {
      if (n.id === id) return { ...n, read: !n.read };
      return n;
    });
    onUpdateState({ notifications: updated });
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    onUpdateState({ notifications: updated });
    onShowToast('Notificação removida ✓');
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    onUpdateState({ notifications: updated });
    onShowToast('Todas as notificações foram marcadas como lidas ✓');
  };

  const handleClearRead = () => {
    const updated = notifications.filter((n) => !n.read);
    onUpdateState({ notifications: updated });
    onShowToast('Notificações lidas foram limpas ✓');
  };

  const handleResetAllNotifications = () => {
    onUpdateState({ notifications: [] });
    onShowToast('Alertas e notificações reiniciados com sucesso ✓');
  };

  const handleEnableBrowserNotifications = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserPermitted(granted);
    if (granted) {
      onUpdateState({
        notificationSettings: {
          ...(state.notificationSettings || {
            enabled: true,
            browserNotifications: true,
            notify24hTraining: true,
            notifyThursdayCallup: true,
            notifyLowAttendance: true,
            attendanceThreshold: 50,
            thursdayHour: 18,
            weeklyTrainingDays: []
          }),
          browserNotifications: true
        }
      });
      onShowToast('🔔 Notificações do navegador ativadas com sucesso!');
    } else {
      onShowToast('⚠️ Permissão de notificações não concedida no navegador.');
    }
  };

  const handleActionClick = (notif: AppNotification) => {
    handleMarkAsRead(notif.id);
    onClose();
    if (notif.type === 'novo_registo') {
      if (onOpenAdminUsers) {
        onOpenAdminUsers();
      }
      return;
    }
    if (notif.targetTab) {
      onNavigate(notif.targetTab, notif.targetId);
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');

    if (isToday) {
      return `Hoje às ${hours}:${mins}`;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month} às ${hours}:${mins}`;
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col bg-slate-900 border-t sm:border border-cyan-500/30 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-cyan-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 text-lg shadow-[0_0_12px_rgba(0,210,255,0.3)]">
              🔔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-['Chakra_Petch'] font-bold text-base uppercase tracking-wider">
                  Centro de Notificações
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/90 text-white font-mono text-xs font-black shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                    {unreadCount} novas
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Alertas automáticos: Treinos 24h, Convocatórias 18h Quinta e Assiduidade &lt;50%
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Quick Toolbar (Browser notification status, mark all read, test) */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-cyan-500/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            {!browserPermitted ? (
              <button
                onClick={handleEnableBrowserNotifications}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold transition-all flex items-center gap-1.5"
                title="Receber notificações no computador/telemóvel mesmo fora do ecrã"
              >
                <span>🔔</span>
                <span>Ativar no Navegador</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                <span>✓</span> Notificações do Navegador Ativas
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700 text-cyan-300 text-[11px] font-bold hover:text-white transition-colors"
                title="Marcar todas as notificações como lidas"
              >
                Marcar lidas ✓
              </button>
            )}

            {notifications.some((n) => n.read) && (
              <button
                onClick={handleClearRead}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-red-400 text-[11px] transition-colors"
                title="Limpar todas as notificações que já foram lidas"
              >
                Limpar lidas 🗑️
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleResetAllNotifications}
                className="px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 hover:text-white text-[11px] font-bold transition-colors"
                title="Reiniciar e limpar todos os alertas"
              >
                Reiniciar Alertas 🔄
              </button>
            )}
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="px-4 pt-3 pb-2 bg-slate-900 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-800/80 shrink-0">
          <button
            onClick={() => setSelectedFilter('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'todas'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.3)] font-black'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <span>Todas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/50 text-current">
              {notifications.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('treino_24h')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'treino_24h'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.3)] font-black'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <span>⚽ Treinos (24h)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/50 text-current">
              {notifications.filter((n) => n.type === 'treino_24h').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('convocatoria_quinta')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'convocatoria_quinta'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.3)] font-black'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <span>📋 Convocatórias (Qui 18h)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/50 text-current">
              {notifications.filter((n) => n.type === 'convocatoria_quinta').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('assiduidade_baixa')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'assiduidade_baixa'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.3)] font-black'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <span>🚨 Assiduidade (&lt;50%)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/50 text-current">
              {notifications.filter((n) => n.type === 'assiduidade_baixa').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('aniversario')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'aniversario'
                ? 'bg-fuchsia-500 text-slate-950 shadow-[0_0_12px_rgba(217,70,239,0.3)] font-black'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <span>🎂 Aniversários</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/50 text-current">
              {notifications.filter((n) => n.type === 'aniversario').length}
            </span>
          </button>

          {notifications.some((n) => n.type === 'novo_registo') && (
            <button
              onClick={() => setSelectedFilter('novo_registo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedFilter === 'novo_registo'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.3)] font-black'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <span>🛡️ Novos Registos</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                {notifications.filter((n) => n.type === 'novo_registo').length}
              </span>
            </button>
          )}
        </div>

        {/* Notifications Scroll List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1 max-h-[60vh] scrollbar-thin">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center bg-slate-950/40 border border-slate-800 rounded-2xl">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-sm font-['Chakra_Petch'] text-cyan-300 font-bold uppercase">
                Tudo em dia! Sem notificações pendentes
              </p>
              <p className="text-xs font-mono text-slate-500 mt-1 max-w-sm mx-auto">
                {selectedFilter === 'todas'
                  ? 'A aplicação monitoriza os teus treinos a 24h, o fecho de convocatórias às quintas-feiras, a assiduidade dos atletas e novos pedidos de registo.'
                  : 'Nenhum alerta nesta categoria no momento.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = !notif.read;
              const isHigh = notif.priority === 'alta';

              // Category visual style
              let typeIcon = '🔔';
              let typeBg = 'bg-slate-800 border-slate-700 text-slate-300';
              if (notif.type === 'treino_24h') {
                typeIcon = '⚽';
                typeBg = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
              } else if (notif.type === 'convocatoria_quinta') {
                typeIcon = '📋';
                typeBg = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
              } else if (notif.type === 'assiduidade_baixa') {
                typeIcon = '🚨';
                typeBg = 'bg-red-950/60 border-red-500/40 text-red-300';
              } else if (notif.type === 'novo_registo') {
                typeIcon = '🛡️';
                typeBg = 'bg-cyan-950/80 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(0,210,255,0.25)]';
              } else if (notif.type === 'aniversario') {
                typeIcon = '🎂';
                typeBg =
                  'bg-fuchsia-950/80 border-fuchsia-400/60 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.25)]';
              }

              return (
                <div
                  key={notif.id}
                  onClick={() => (notif.targetTab || notif.type === 'novo_registo') && handleActionClick(notif)}
                  className={`p-3.5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group relative cursor-pointer ${
                    isUnread
                      ? 'bg-slate-900 border-cyan-500/50 shadow-[0_0_15px_rgba(0,210,255,0.1)] hover:border-cyan-400'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Left Column: Icon + Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${typeBg}`}>
                        {typeIcon}
                      </div>
                      {isUnread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-900 animate-ping" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-xs sm:text-sm text-white font-['Chakra_Petch'] leading-tight group-hover:text-cyan-300 transition-colors">
                          {notif.title}
                        </span>

                        {isHigh && (
                          <span className="px-1.5 py-0.2 rounded-md bg-red-950/80 border border-red-500/50 text-red-400 text-[10px] font-mono font-bold">
                            Alta Prioridade
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-500 ml-auto sm:ml-0">
                          ⏱️ {formatTimestamp(notif.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-slate-300 leading-relaxed">{notif.message}</p>

                      {notif.details && (
                        <div className="text-[11px] font-mono text-cyan-400/80 mt-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-cyan-500/20 inline-block">
                          ℹ️ {notif.details}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 w-full sm:w-auto justify-end">
                    {(notif.targetTab || notif.type === 'novo_registo') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(notif);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-black text-xs uppercase shadow transition-all flex items-center gap-1.5 ${
                          notif.type === 'novo_registo'
                            ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                        }`}
                        title={
                          notif.type === 'novo_registo'
                            ? 'Abrir gestão de treinadores para autorizar'
                            : 'Ir para a secção correspondente'
                        }
                      >
                        <span>{notif.type === 'novo_registo' ? '🛡️' : '👉'}</span>
                        <span>
                          {notif.type === 'novo_registo'
                            ? 'Autorizar'
                            : notif.targetTab === 'treinos'
                              ? 'Ver Treinos'
                              : notif.targetTab === 'convocatoria'
                                ? 'Convocatória'
                                : notif.targetTab === 'plantel'
                                  ? 'Ver Plantel'
                                  : 'Abrir'}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={(e) => handleToggleRead(notif.id, e)}
                      className={`p-1.5 rounded-xl border text-xs transition-colors ${
                        isUnread
                          ? 'bg-slate-950 border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                      title={isUnread ? 'Marcar como lida' : 'Marcar como não lida'}
                    >
                      {isUnread ? '✓' : '✉️'}
                    </button>

                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-500 hover:text-red-400 text-xs transition-colors"
                      title="Apagar notificação"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950/98 border-t border-cyan-500/20 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Sistema Inteligente BolaComVisão</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-white font-bold transition-colors active:scale-95 flex items-center justify-center"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
