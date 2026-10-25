import React from 'react';
import { AppState, NotificationSettings } from '../types';
import { t } from '../i18n/dict';
import { exportJSONBackup, exportCSVStats, exportTXTReport } from '../lib/exportUtils';
import { parseBackup, restoreFromBackup } from '../lib/backup';
import { MASTER_ADMIN_EMAIL } from '../lib/constants';
import { defaultNotificationSettings } from '../lib/notificationEngine';

interface SettingsModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onShowConfirm?: (msg: string, cb: () => void) => void;
  onOpenAdminUsers?: () => void;
  pendingUsersCount?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  state,
  onUpdateState,
  onClose,
  onShowToast,
  onShowConfirm,
  onOpenAdminUsers,
  pendingUsersCount = 0
}) => {
  // Administrator contacts (shown to coaches waiting for approval); stored with the notification settings
  const notifSettings: NotificationSettings = { ...defaultNotificationSettings, ...(state.notificationSettings || {}) };
  const updateNotifSettings = (updates: Partial<NotificationSettings>) =>
    onUpdateState({ notificationSettings: { ...notifSettings, ...updates } });

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const read = parseBackup(event.target?.result as string);
        const doImport = () => {
          if (read.kind === 'full') {
            // Full club backup: every team with all its records, the club settings and the seasons
            onUpdateState(restoreFromBackup(read.backup.club, state));
            if (onShowToast) onShowToast(t(state.lang, 'msg_bkp_imp'));
            return;
          }
          // Older file (one device's state): only the active team's lists, as before
          const parsed = read.data;
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
