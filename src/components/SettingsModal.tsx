import React, { useState } from 'react';
import { AppState, NotificationSettings, WeeklyTrainingSlot, SyncState } from '../types';
import { t } from '../i18n/dict';
import { exportJSONBackup, exportCSVStats, exportTXTReport } from '../lib/exportUtils';
import {
  requestBrowserNotificationPermission,
  generateTestNotifications,
  defaultNotificationSettings
} from '../lib/notificationEngine';
import { defaultSyncState, syncStateWithCloud } from '../lib/syncEngine';
import { MASTER_ADMIN_EMAIL } from '../lib/constants';

interface SettingsModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onShowConfirm?: (msg: string, cb: () => void) => void;
  onOpenAdminUsers?: () => void;
  onOpenCommercialPlans?: () => void;
  pendingUsersCount?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  state,
  onUpdateState,
  onClose,
  onShowToast,
  onShowConfirm,
  onOpenAdminUsers,
  onOpenCommercialPlans,
  pendingUsersCount = 0
}) => {
  const sub = state.subscription;
  const currentPlanName = sub?.planName || 'Gratuito / Trial';
  const notifSettings: NotificationSettings = {
    ...defaultNotificationSettings,
    ...(state.notificationSettings || {})
  };

  const syncInfo: SyncState = state.syncInfo || defaultSyncState;
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const [browserPermitted, setBrowserPermitted] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const res = await syncStateWithCloud(state, syncInfo.syncId);
    setIsSyncing(false);
    if (res.success) {
      onUpdateState({
        syncInfo: {
          ...syncInfo,
          status: 'synced',
          lastSyncedAt: Date.now(),
          pendingChangesCount: 0,
          lastSyncMessage: res.message
        }
      });
      if (onShowToast) onShowToast(`✓ ${res.message}`);
    } else {
      if (onShowToast) onShowToast(`⚡ ${res.message}`);
    }
  };

  const updateNotifSettings = (updates: Partial<NotificationSettings>) => {
    const updated = { ...notifSettings, ...updates };
    onUpdateState({ notificationSettings: updated });
  };

  const handleToggleWeeklyDay = (dayIndex: number, dayLabel: string) => {
    const currentSlots = notifSettings.weeklyTrainingDays || [];
    const exists = currentSlots.some((s) => s.day === dayIndex);
    let newSlots: WeeklyTrainingSlot[];

    if (exists) {
      newSlots = currentSlots.filter((s) => s.day !== dayIndex);
    } else {
      newSlots = [...currentSlots, { day: dayIndex, time: '18:15', label: dayLabel }].sort((a, b) => a.day - b.day);
    }
    updateNotifSettings({ weeklyTrainingDays: newSlots });
  };

  const handleUpdateTimeForDay = (dayIndex: number, timeStr: string) => {
    const currentSlots = notifSettings.weeklyTrainingDays || [];
    const updated = currentSlots.map((s) => {
      if (s.day === dayIndex) return { ...s, time: timeStr };
      return s;
    });
    updateNotifSettings({ weeklyTrainingDays: updated });
  };

  const handleEnableBrowserNotifications = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserPermitted(granted);
    if (granted) {
      updateNotifSettings({ browserNotifications: true });
      if (onShowToast) onShowToast('🔔 Notificações do navegador ativadas!');
    } else {
      if (onShowToast) onShowToast('⚠️ Permissão de notificações não concedida.');
    }
  };

  const handleTestAlerts = () => {
    const testList = generateTestNotifications(state);
    const existing = state.notifications || [];
    const combined = [...testList, ...existing.filter((e) => !testList.some((t) => t.id === e.id))];
    onUpdateState({ notifications: combined });
    if (onShowToast) onShowToast('⚡ Notificações de teste geradas com sucesso!');
  };

  const WEEK_DAYS = [
    { day: 1, label: 'Segunda', short: 'Seg' },
    { day: 2, label: 'Terça', short: 'Ter' },
    { day: 3, label: 'Quarta', short: 'Qua' },
    { day: 4, label: 'Quinta', short: 'Qui' },
    { day: 5, label: 'Sexta', short: 'Sex' },
    { day: 6, label: 'Sábado', short: 'Sáb' },
    { day: 0, label: 'Domingo', short: 'Dom' }
  ];

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.roster && !parsed.matches) {
          throw new Error('Formato inválido');
        }
        const doImport = () => {
          onUpdateState({
            roster: parsed.roster || [],
            matches: parsed.matches || [],
            trainings: parsed.trainings || [],
            schedule: parsed.schedule || [],
            tactics: parsed.tactics || [],
            tacticFormat: parsed.tacticFormat || 11,
            trackSubs: parsed.trackSubs !== undefined ? parsed.trackSubs : true,
            theme: parsed.theme || 'original',
            lang: parsed.lang || 'pt',
            myClubName: parsed.myClubName || '',
            lastBackupDate: Date.now()
          });
          if (onShowToast) onShowToast(t(state.lang, 'msg_bkp_imp'));
        };

        if (onShowConfirm) {
          onShowConfirm(t(state.lang, 'msg_overwrite'), doImport);
        } else {
          doImport();
        }
      } catch {
        if (onShowToast) onShowToast(t(state.lang, 'msg_inv_file'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h3 className="text-gold font-semibold text-lg mb-2">{t(state.lang, 'set_title')}</h3>

        {/* Commercial Subscription Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/40 shadow-lg text-left mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <div>
                <div className="text-xs font-bold font-['Chakra_Petch'] uppercase text-white flex items-center gap-1.5">
                  <span>Módulos da Plataforma</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold uppercase bg-emerald-500 text-slate-950">
                    {currentPlanName || 'Acesso Gratuito (Testes)'}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-300/80 font-mono">
                  Acesso Total Gratuito para Testes & Adaptações
                </div>
              </div>
            </div>

            {onOpenCommercialPlans && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCommercialPlans();
                }}
                className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-bold text-[10px] uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer"
              >
                Ver Módulos ➔
              </button>
            )}
          </div>
          <p className="text-[11px] text-emerald-200/90 font-mono">
            Base de dados na Nuvem ativa para {state.myClubName || 'o seu clube'}. Equipas e equipas técnicas
            sincronizadas sem limites.
          </p>
        </div>

        <div className="field text-left mt-4">
          <label>{t(state.lang, 'set_club')}</label>
          <input
            type="text"
            placeholder={t(state.lang, 'set_club_ph')}
            value={state.myClubName || ''}
            onChange={(e) => onUpdateState({ myClubName: e.target.value })}
          />
        </div>

        <div className="field text-left mt-4">
          <label>Símbolo / Emblema do Clube</label>
          <div className="flex items-center gap-3 mt-1 p-2 bg-surface border border-line rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-surface-2 border border-line flex items-center justify-center overflow-hidden shrink-0">
              {state.clubLogoUrl ? (
                <img src={state.clubLogoUrl} alt="Símbolo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-lg">🛡️</span>
              )}
            </div>
            <div className="flex-1 flex gap-2 justify-end">
              <label className="btn btn-outline text-xs py-1 px-2.5 cursor-pointer">
                📷 {state.clubLogoUrl ? 'Alterar' : 'Carregar'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const dataUrl = evt.target?.result as string;
                      if (dataUrl) onUpdateState({ clubLogoUrl: dataUrl });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {state.clubLogoUrl && (
                <button
                  className="btn btn-ghost text-xs py-1 px-2 text-red-400"
                  onClick={() => onUpdateState({ clubLogoUrl: undefined })}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Download Logo Oficial BolaComVisão Vetorial */}
          <div className="mt-3 p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl space-y-2">
            <div>
              <div className="text-xs font-bold text-white font-['Chakra_Petch'] uppercase flex items-center gap-1.5">
                <span>📐 Logótipo Oficial BolaComVisão</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/40 font-mono font-bold">
                  VETORIAL SVG
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Descarregue o logótipo em formato vetorial SVG para guardar no computador ou utilizar em equipamentos,
                documentos e materiais gráficos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="/bolacomvisao-logo.svg"
                download="bolacomvisao-logo.svg"
                className="py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-['Chakra_Petch'] font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <span>⬇️</span> Descarregar SVG Vetorial
              </a>
              <a
                href="/bolacomvisao-logo-hd.svg"
                download="bolacomvisao-logo-hd.svg"
                className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-['Chakra_Petch'] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <span>⬇️</span> SVG Alta Fidelidade
              </a>
              <a
                href="/bolacomvisao-logo.png"
                download="bolacomvisao-logo.png"
                className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <span>🖼️</span> PNG (1024×1024)
              </a>
            </div>
          </div>
        </div>

        <div className="field text-left mt-4">
          <label>{t(state.lang, 'set_lang')}</label>
          <div className="seg">
            <div
              className={`seg-btn ${state.lang === 'pt' ? 'active' : ''}`}
              onClick={() => onUpdateState({ lang: 'pt' })}
            >
              Português
            </div>
            <div
              className={`seg-btn ${state.lang === 'en' ? 'active' : ''}`}
              onClick={() => onUpdateState({ lang: 'en' })}
            >
              English
            </div>
          </div>
        </div>

        <div className="field text-left mt-4">
          <label>{t(state.lang, 'set_theme')}</label>
          <div className="seg">
            <div
              className={`seg-btn ${state.theme === 'original' ? 'active' : ''}`}
              onClick={() => onUpdateState({ theme: 'original' })}
            >
              {t(state.lang, 'set_theme_orig')}
            </div>
            <div
              className={`seg-btn ${state.theme === 'luzsolar' ? 'active' : ''}`}
              onClick={() => onUpdateState({ theme: 'luzsolar' })}
            >
              {t(state.lang, 'set_theme_sun')}
            </div>
            <div
              className={`seg-btn ${state.theme === 'oceanonoturno' ? 'active' : ''}`}
              onClick={() => onUpdateState({ theme: 'oceanonoturno' })}
            >
              {t(state.lang, 'set_theme_ocean')}
            </div>
          </div>
        </div>

        <div className="field text-left mt-4">
          <label>{t(state.lang, 'set_subs')}</label>
          <div className="seg">
            <div
              className={`seg-btn ${state.trackSubs ? 'active' : ''}`}
              onClick={() => onUpdateState({ trackSubs: true })}
            >
              {t(state.lang, 'set_yes')}
            </div>
            <div
              className={`seg-btn ${!state.trackSubs ? 'active' : ''}`}
              onClick={() => onUpdateState({ trackSubs: false })}
            >
              {t(state.lang, 'set_no')}
            </div>
          </div>
          <div className="text-xs text-muted mt-2">{t(state.lang, 'set_subs_desc')}</div>
        </div>

        {/* Notificações e Alertas Automáticos Section */}
        <div className="mt-6 pt-4 border-t border-cyan-500/20 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔔</span>
              <span>Notificações & Alertas Automáticos</span>
            </div>
            <button
              onClick={handleTestAlerts}
              className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-bold transition-all flex items-center gap-1"
              title="Testar o disparo dos 3 tipos de alertas"
            >
              <span>⚡</span>
              <span>Testar Alertas</span>
            </button>
          </div>

          <p className="text-[11px] font-mono text-slate-400 mb-3 leading-relaxed">
            Configure os avisos automáticos de treinos (24h antes), convocatórias (quinta-feira às 18h) e assiduidade
            crítica (&lt;50%).
          </p>

          <div className="space-y-3 bg-slate-950/80 p-3 rounded-2xl border border-cyan-500/20">
            {/* Master Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white font-mono">Ativar Alertas da Aplicação</div>
                <div className="text-[10px] font-mono text-slate-400">Liga ou desliga o motor de notificações</div>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.enabled}
                onChange={(e) => updateNotifSettings({ enabled: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            {/* Browser / Push notifications */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <div>
                <div className="text-xs font-bold text-white font-mono">Notificações no Navegador / Desktop</div>
                <div className="text-[10px] font-mono text-slate-400">
                  {browserPermitted ? '✓ Permissão concedida' : 'Requer permissão do navegador'}
                </div>
              </div>
              {!browserPermitted ? (
                <button
                  onClick={handleEnableBrowserNotifications}
                  className="px-2 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-[10px] font-mono hover:bg-cyan-400 transition-colors"
                >
                  Permitir
                </button>
              ) : (
                <span className="text-[10px] font-bold text-emerald-400 font-mono">Ativo ✓</span>
              )}
            </div>

            {/* Rule 1: 24h Training warning */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white font-mono">⚽ Aviso de Treino 24h Antes</div>
                  <div className="text-[10px] font-mono text-slate-400">Lembra 24h antes da sessão de treino</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.notify24hTraining}
                  onChange={(e) => updateNotifSettings({ notify24hTraining: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              {/* Weekly Training Days Configuration */}
              <div className="mt-1.5 p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                  <span>Dias habituais de treino da equipa:</span>
                  <span className="text-cyan-400 font-bold">Horário base: 18h15</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 mb-2">
                  {WEEK_DAYS.map((d) => {
                    const isSelected = (notifSettings.weeklyTrainingDays || []).some((s) => s.day === d.day);
                    const slot = (notifSettings.weeklyTrainingDays || []).find((s) => s.day === d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => handleToggleWeeklyDay(d.day, d.label)}
                        className={`py-1 px-1.5 rounded-lg text-center font-mono text-[10px] font-bold border transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                        title={isSelected ? `${d.label} às ${slot?.time || '18:15'}` : `Adicionar ${d.label}`}
                      >
                        <div>{d.short}</div>
                        {isSelected && <div className="text-[8px] font-black">{slot?.time || '18:15'}</div>}
                      </button>
                    );
                  })}
                </div>

                {/* Edit specific times for selected days */}
                {(notifSettings.weeklyTrainingDays || []).length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="text-[9px] font-mono text-slate-400">Horário por dia de treino:</div>
                    <div className="flex flex-wrap gap-2">
                      {(notifSettings.weeklyTrainingDays || []).map((slot) => (
                        <div
                          key={slot.day}
                          className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono"
                        >
                          <span className="text-slate-300 font-bold">{slot.label}:</span>
                          <input
                            type="time"
                            value={slot.time || '18:15'}
                            onChange={(e) => handleUpdateTimeForDay(slot.day, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-cyan-300 px-1 py-0.5 rounded text-[10px] font-mono focus:border-cyan-400 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rule 2: Thursday 18h Callup */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white font-mono">📋 Aviso de Convocatória à Quinta-feira</div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Avisa às 18h se o jogo não tiver convocatória fechada
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.notifyThursdayCallup}
                  onChange={(e) => updateNotifSettings({ notifyThursdayCallup: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>Hora do disparo de quinta-feira:</span>
                <span className="font-bold text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {notifSettings.thursdayHour || 18}:00 h
                </span>
              </div>
            </div>

            {/* Rule 3: Low attendance < 50% */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white font-mono">
                    🚨 Alerta de Assiduidade Crítica (&lt; 50%)
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Notifica se algum atleta tiver menos de 50% de presenças
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.notifyLowAttendance}
                  onChange={(e) => updateNotifSettings({ notifyLowAttendance: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>Limite de alerta:</span>
                <span className="font-bold text-red-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  &lt; {notifSettings.attendanceThreshold || 50}% de presenças
                </span>
              </div>
            </div>

            {/* Reset Alerts Action Button */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">Limpar histórico de notificações:</span>
              <button
                type="button"
                onClick={() => {
                  onUpdateState({ notifications: [] });
                  if (onShowToast) onShowToast('Alertas e notificações reiniciados com sucesso ✓');
                }}
                className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 hover:text-white text-[10px] font-mono font-bold transition-all flex items-center gap-1"
                title="Limpar todos os alertas da aplicação"
              >
                <span>🔄</span>
                <span>Reiniciar Alertas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Admin Staff & Access Management */}
        {onOpenAdminUsers && (
          <div className="mt-6 pt-4 border-t border-cyan-500/20 text-left">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-['Chakra_Petch'] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Administração & Acessos de Treinadores</span>
              </div>
              {pendingUsersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono text-[10px] font-black animate-pulse">
                  {pendingUsersCount} Pendente{pendingUsersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400 mb-3">
              Autorize novos registos para a base de dados do clube, atribua funções e receba alertas de novos pedidos.
            </p>

            <div className="space-y-2 mb-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-['Chakra_Petch'] font-bold text-cyan-300 uppercase">
                Contactos do Administrador para Notificações:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">E-mail do Administrador:</label>
                  <input
                    type="email"
                    value={notifSettings.adminContactEmail || MASTER_ADMIN_EMAIL}
                    onChange={(e) => updateNotifSettings({ adminContactEmail: e.target.value })}
                    placeholder={MASTER_ADMIN_EMAIL}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">
                    Telemóvel / WhatsApp (com indicativo):
                  </label>
                  <input
                    type="tel"
                    value={notifSettings.adminContactPhone || ''}
                    onChange={(e) => updateNotifSettings({ adminContactPhone: e.target.value })}
                    placeholder="+351 912 345 678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenAdminUsers();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-['Chakra_Petch'] font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"
            >
              <span>👥</span>
              <span>Abrir Painel de Gestão de Treinadores</span>
              {pendingUsersCount > 0 && <span>({pendingUsersCount} por aprovar)</span>}
            </button>
          </div>
        )}

        {/* Sincronização na Nuvem & Modo Offline Section */}
        <div className="mt-6 pt-4 border-t border-cyan-500/20 text-left">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔄</span>
              <span>Sincronização na Nuvem & Modo Offline</span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isOnline
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-300 animate-pulse'
              }`}
            >
              {isOnline ? '🟢 Online' : '⚡ Offline'}
            </span>
          </div>

          <p className="text-[11px] font-mono text-slate-400 mb-3">
            A aplicação funciona 100% sem internet. Ao ligar os dados móveis ou Wi-Fi, sincroniza automaticamente tudo
            para a nuvem.
          </p>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Estado:</span>
              <span className="text-white font-bold">
                {isSyncing
                  ? '🔄 A sincronizar...'
                  : syncInfo.pendingChangesCount > 0
                    ? `⚡ ${syncInfo.pendingChangesCount} alterações guardadas localmente`
                    : '✓ Sincronizado com a nuvem'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800 pt-2">
              <span className="text-slate-400">Chave Cloud do Plantel:</span>
              <span className="font-bold text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-cyan-500/30">
                {syncInfo.syncId}
              </span>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
              <span>{isSyncing ? 'A Sincronizar...' : 'Sincronizar Agora com a Nuvem'}</span>
            </button>
          </div>
        </div>

        {/* Exportação & Cópia de Segurança Section */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-left">
          <div className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>💾</span>
            <span>Exportação & Cópia de Segurança</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mb-3">
            Guarde em ficheiro os dados do plantel e jogos ou importe uma cópia de segurança.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                exportJSONBackup(state);
                if (onShowToast) onShowToast(t(state.lang, 'msg_bkp_exp'));
              }}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 font-mono text-xs font-bold transition-all text-center"
            >
              Exportar JSON Backup
            </button>

            <button
              onClick={() => document.getElementById('settings-import-file-input')?.click()}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 font-mono text-xs font-bold transition-all text-center"
            >
              Importar JSON Backup
            </button>

            <button
              onClick={() => {
                exportCSVStats(state, state.lang);
                if (onShowToast) onShowToast(t(state.lang, 'msg_csv_exp'));
              }}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 font-mono text-xs font-bold transition-all text-center"
            >
              Exportar Excel / CSV
            </button>

            <button
              onClick={() => {
                exportTXTReport(state, state.lang);
                if (onShowToast) onShowToast(t(state.lang, 'msg_txt_exp'));
              }}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 font-mono text-xs font-bold transition-all text-center"
            >
              Relatório TXT
            </button>

            <input
              type="file"
              id="settings-import-file-input"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        <button className="btn btn-outline w-full mt-6" onClick={onClose}>
          {t(state.lang, 'close')}
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
