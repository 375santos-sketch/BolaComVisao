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
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col bg-ui-surface border-t sm:border border-ui-brand/30 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-ui-inset/90 border-b border-ui-brand/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ui-brand/20 border border-ui-brand/40 flex items-center justify-center text-ui-brand text-lg">
              🔔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-ui-text font-bold text-base ">Centro de Notificações</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-ui-danger/90 text-ui-text tabular-nums text-xs font-black">
                    {unreadCount} novas
                  </span>
                )}
              </div>
              <p className="text-[11px] tabular-nums text-ui-muted">
                Alertas automáticos: Treinos 24h, Convocatórias 18h Quinta e Assiduidade &lt;50%
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="ui-btn ui-btn-secondary w-8 h-8 flex items-center justify-center text-sm"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Quick Toolbar (Browser notification status, mark all read, test) */}
        <div className="px-4 py-2.5 bg-ui-inset/60 border-b border-ui-brand/10 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums shrink-0">
          <div className="flex items-center gap-1.5">
            {!browserPermitted ? (
              <button
                onClick={handleEnableBrowserNotifications}
                className="ui-btn ui-btn-soft px-2.5 py-1 flex items-center gap-1.5"
                title="Receber notificações no computador/telemóvel mesmo fora do ecrã"
              >
                <span>🔔</span>
                <span>Ativar no Navegador</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-ui-success font-bold bg-ui-success-soft border border-ui-success/30 px-2 py-0.5 rounded-md">
                <span>✓</span> Notificações do Navegador Ativas
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="ui-btn ui-btn-secondary px-2 py-1 text-[11px]"
                title="Marcar todas as notificações como lidas"
              >
                Marcar lidas ✓
              </button>
            )}

            {notifications.some((n) => n.read) && (
              <button
                onClick={handleClearRead}
                className="ui-btn ui-btn-secondary px-2 py-1 text-[11px]"
                title="Limpar todas as notificações que já foram lidas"
              >
                Limpar lidas 🗑️
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleResetAllNotifications}
                className="ui-btn ui-btn-soft-danger px-2 py-1 text-[11px]"
                title="Reiniciar e limpar todos os alertas"
              >
                Reiniciar Alertas 🔄
              </button>
            )}
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="px-4 pt-3 pb-2 bg-ui-surface flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-ui-line/80 shrink-0">
          <button
            onClick={() => setSelectedFilter('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs tabular-nums font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'todas'
                ? 'bg-ui-brand text-ui-brand-ink font-black'
                : 'bg-ui-inset text-ui-muted border border-ui-line hover:text-ui-text'
            }`}
          >
            <span>Todas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-ui-surface/50 text-current">
              {notifications.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('treino_24h')}
            className={`px-3 py-1.5 rounded-xl text-xs tabular-nums font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'treino_24h'
                ? 'bg-ui-brand text-ui-brand-ink font-black'
                : 'bg-ui-inset text-ui-muted border border-ui-line hover:text-ui-text'
            }`}
          >
            <span>⚽ Treinos (24h)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-ui-surface/50 text-current">
              {notifications.filter((n) => n.type === 'treino_24h').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('convocatoria_quinta')}
            className={`px-3 py-1.5 rounded-xl text-xs tabular-nums font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'convocatoria_quinta'
                ? 'bg-ui-brand text-ui-brand-ink font-black'
                : 'bg-ui-inset text-ui-muted border border-ui-line hover:text-ui-text'
            }`}
          >
            <span>📋 Convocatórias (Qui 18h)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-ui-surface/50 text-current">
              {notifications.filter((n) => n.type === 'convocatoria_quinta').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('assiduidade_baixa')}
            className={`px-3 py-1.5 rounded-xl text-xs tabular-nums font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'assiduidade_baixa'
                ? 'bg-ui-brand text-ui-brand-ink font-black'
                : 'bg-ui-inset text-ui-muted border border-ui-line hover:text-ui-text'
            }`}
          >
            <span>🚨 Assiduidade (&lt;50%)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-ui-surface/50 text-current">
              {notifications.filter((n) => n.type === 'assiduidade_baixa').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('aniversario')}
            className={`px-3 py-1.5 rounded-xl text-xs tabular-nums font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'aniversario'
                ? 'bg-ui-brand text-ui-brand-ink font-black'
                : 'bg-ui-inset text-ui-muted border border-ui-line hover:text-ui-text'
            }`}
          >
            <span>🎂 Aniversários</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-ui-surface/50 text-current">
              {notifications.filter((n) => n.type === 'aniversario').length}
            </span>
          </button>

          {notifications.some((n) => n.type === 'novo_registo') && (
            <button
              onClick={() => setSelectedFilter('novo_registo')}
              className={`px-3 py-1.5 rounded-xl text-xs tabular-nums font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedFilter === 'novo_registo'
                  ? 'bg-ui-brand text-ui-brand-ink font-black'
                  : 'bg-ui-inset text-ui-muted border border-ui-line hover:text-ui-text'
              }`}
            >
              <span>🛡️ Novos Registos</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-ui-danger text-ui-text font-bold">
                {notifications.filter((n) => n.type === 'novo_registo').length}
              </span>
            </button>
          )}
        </div>

        {/* Notifications Scroll List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1 max-h-[60vh] scrollbar-thin">
          {filteredNotifications.length === 0 ? (
            <div className="ui-inset py-12 text-center">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-sm text-ui-brand font-bold ">Tudo em dia! Sem notificações pendentes</p>
              <p className="text-xs tabular-nums text-ui-muted mt-1 max-w-sm mx-auto">
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
              let typeBg = 'bg-ui-surface-2 border-ui-line-strong text-ui-text';
              if (notif.type === 'treino_24h') {
                typeIcon = '⚽';
                typeBg = 'bg-ui-success-soft border-ui-success/40 text-ui-success';
              } else if (notif.type === 'convocatoria_quinta') {
                typeIcon = '📋';
                typeBg = 'bg-ui-warning-soft border-ui-warning/40 text-ui-warning';
              } else if (notif.type === 'assiduidade_baixa') {
                typeIcon = '🚨';
                typeBg = 'bg-ui-danger-soft border-ui-danger/40 text-ui-danger';
              } else if (notif.type === 'novo_registo') {
                typeIcon = '🛡️';
                typeBg = 'bg-ui-brand-soft border-ui-brand/60 text-ui-brand';
              } else if (notif.type === 'aniversario') {
                typeIcon = '🎂';
                typeBg = 'bg-ui-brand-soft border-ui-brand/60 text-ui-brand';
              }

              return (
                <div
                  key={notif.id}
                  onClick={() => (notif.targetTab || notif.type === 'novo_registo') && handleActionClick(notif)}
                  className={`p-3.5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group relative cursor-pointer ${
                    isUnread
                      ? 'bg-ui-surface border-ui-brand/50 hover:border-ui-brand'
                      : 'bg-ui-inset/70 border-ui-line/80 hover:border-ui-line-strong opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Left Column: Icon + Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${typeBg}`}>
                        {typeIcon}
                      </div>
                      {isUnread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-ui-brand rounded-full border-2 border-ui-line animate-ping" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-xs sm:text-sm text-ui-text leading-tight group-hover:text-ui-brand transition-colors">
                          {notif.title}
                        </span>

                        {isHigh && (
                          <span className="px-1.5 py-0.2 rounded-md bg-ui-danger-soft border border-ui-danger/50 text-ui-danger text-[10px] tabular-nums font-bold">
                            Alta Prioridade
                          </span>
                        )}

                        <span className="text-[10px] tabular-nums text-ui-muted ml-auto sm:ml-0">
                          ⏱️ {formatTimestamp(notif.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs tabular-nums text-ui-text leading-relaxed">{notif.message}</p>

                      {notif.details && (
                        <div className="ui-inset text-[11px] tabular-nums text-ui-brand/80 mt-1 px-2 py-1 inline-block">
                          ℹ️ {notif.details}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-ui-line w-full sm:w-auto justify-end">
                    {(notif.targetTab || notif.type === 'novo_registo') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(notif);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs shadow transition-all flex items-center gap-1.5 ${
                          notif.type === 'novo_registo'
                            ? 'bg-ui-brand hover:bg-ui-brand text-ui-brand-ink'
                            : 'bg-ui-brand hover:bg-ui-brand text-ui-brand-ink'
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
                          ? 'bg-ui-inset border-ui-line-strong hover:border-ui-brand text-ui-muted hover:text-ui-brand'
                          : 'bg-ui-inset border-ui-line text-ui-muted hover:text-ui-text'
                      }`}
                      title={isUnread ? 'Marcar como lida' : 'Marcar como não lida'}
                    >
                      {isUnread ? '✓' : '✉️'}
                    </button>

                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="ui-btn ui-btn-secondary p-1.5 text-xs"
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
        <div className="p-3.5 bg-ui-inset/98 border-t border-ui-brand/20 flex items-center justify-between text-[11px] tabular-nums text-ui-muted shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ui-brand animate-ping" />
            <span>Sistema Inteligente BolaComVisão</span>
          </div>

          <button
            onClick={onClose}
            className="ui-btn ui-btn-secondary px-4 py-2 min-h-[40px] flex items-center justify-center"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
