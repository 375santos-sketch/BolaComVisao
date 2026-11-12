import React, { useState } from 'react';

type Part = 'clube' | 'jogos' | 'treinos' | 'dados' | 'admin';
import { ClubSettingsSection } from './ClubSettingsSection';
import { AppState, NotificationSettings } from '../types';
import { t } from '../i18n/dict';
import { exportJSONBackup, exportCSVStats, exportTXTReport } from '../lib/exportUtils';
import { parseBackup, restoreFromBackup } from '../lib/backup';
import { MASTER_ADMIN_EMAIL } from '../lib/constants';
import { defaultNotificationSettings } from '../lib/notificationEngine';
import { clearedAgenda } from '../lib/agendaReset';
import { isAppAdmin } from '../services/cloudAuthService';
import { Sheet } from './ui/Sheet';
import { SectionNav } from './ui/SectionNav';

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
  const isAdmin = isAppAdmin(state.currentUser) && Boolean(onOpenAdminUsers);
  const [part, setPart] = useState<Part>('clube');
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

  const parts: { id: Part; label: string; short?: string }[] = [
    { id: 'clube', label: 'Clube' },
    { id: 'jogos', label: 'Jogos' },
    { id: 'treinos', label: 'Treinos' },
    { id: 'dados', label: 'Dados' },
    ...(isAdmin ? [{ id: 'admin' as Part, label: 'Administração', short: 'Admin' }] : [])
  ];
  const choice = (on: boolean) =>
    `ui-btn flex-1 px-2 py-2 text-ui-caption ${on ? 'ui-btn-primary' : 'ui-btn-secondary'}`;
  const label = 'block text-ui-caption font-bold text-ui-muted';

  return (
    <Sheet title="Definições do clube" onClose={onClose}>
      <p className="-mt-1 mb-2 text-ui-caption text-ui-muted">Vale para todos os treinadores desta equipa.</p>
      <SectionNav
        label="Partes das definições"
        sections={parts}
        active={part}
        onJump={(id) => setPart(id as Part)}
        fill
        className="mb-4 rounded-ui-sm bg-ui-surface-2"
      />

      {part === 'clube' && (
        <div className="space-y-4">
          <label className={label}>
            {t(state.lang, 'set_club')}
            <input
              type="text"
              className="ui-input mt-1"
              placeholder={t(state.lang, 'set_club_ph')}
              value={state.myClubName || ''}
              onChange={(e) => onUpdateState({ myClubName: e.target.value })}
            />
          </label>

          <div>
            <div className={label}>Símbolo / emblema do clube</div>
            <div className="mt-1 flex items-center gap-3 rounded-ui-sm border border-ui-line bg-ui-surface-2 p-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-ui-sm border border-ui-line bg-ui-surface">
                {state.clubLogoUrl ? (
                  <img src={state.clubLogoUrl} alt="Símbolo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-lg">🛡️</span>
                )}
              </div>
              <div className="flex flex-1 justify-end gap-2">
                <label className="ui-btn ui-btn-secondary cursor-pointer px-2.5 py-1 text-ui-caption">
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
                    type="button"
                    aria-label="Tirar o emblema"
                    className="ui-btn ui-btn-soft-danger px-2 py-1 text-ui-caption"
                    onClick={() => onUpdateState({ clubLogoUrl: undefined })}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <ClubSettingsSection state={state} onUpdateState={onUpdateState} onShowToast={onShowToast} part="clube" />
          <p className="text-ui-caption text-ui-muted">
            O tema, o modo sol, o idioma e o modo compacto estão agora em Mais → A minha conta → Aparência.
          </p>
        </div>
      )}

      {part === 'jogos' && (
        <div className="space-y-4">
          <ClubSettingsSection state={state} onUpdateState={onUpdateState} onShowToast={onShowToast} part="jogos" />
          <div role="group" aria-label={t(state.lang, 'set_subs')} className="space-y-1.5">
            <div className={label}>{t(state.lang, 'set_subs')}</div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={Boolean(state.trackSubs)}
                className={choice(Boolean(state.trackSubs))}
                onClick={() => onUpdateState({ trackSubs: true })}
              >
                {t(state.lang, 'set_yes')}
              </button>
              <button
                type="button"
                aria-pressed={!state.trackSubs}
                className={choice(!state.trackSubs)}
                onClick={() => onUpdateState({ trackSubs: false })}
              >
                {t(state.lang, 'set_no')}
              </button>
            </div>
            <p className="text-ui-caption text-ui-muted">{t(state.lang, 'set_subs_desc')}</p>
          </div>
        </div>
      )}

      {part === 'treinos' && (
        <ClubSettingsSection state={state} onUpdateState={onUpdateState} onShowToast={onShowToast} part="treinos" />
      )}

      {part === 'dados' && (
        <div className="space-y-4">
          <section aria-label="Exportação e cópia de segurança" className="space-y-2">
            <div className="text-ui-body font-bold text-ui-text">Exportação e cópia de segurança</div>
            <p className="text-ui-caption text-ui-muted">
              Guarde em ficheiro os dados do plantel e jogos ou importe uma cópia de segurança.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  exportJSONBackup(state);
                  if (onShowToast) onShowToast(t(state.lang, 'msg_bkp_exp'));
                }}
                className="ui-btn ui-btn-soft px-2.5 py-2 text-ui-caption"
              >
                Exportar JSON Backup
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('settings-import-file-input')?.click()}
                className="ui-btn ui-btn-secondary px-2.5 py-2 text-ui-caption"
              >
                Importar JSON Backup
              </button>
              <button
                type="button"
                onClick={() => {
                  exportCSVStats(state, state.lang);
                  if (onShowToast) onShowToast(t(state.lang, 'msg_csv_exp'));
                }}
                className="ui-btn ui-btn-secondary px-2.5 py-2 text-ui-caption"
              >
                Exportar Excel / CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  exportTXTReport(state, state.lang);
                  if (onShowToast) onShowToast(t(state.lang, 'msg_txt_exp'));
                }}
                className="ui-btn ui-btn-secondary px-2.5 py-2 text-ui-caption"
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
          </section>

          {onShowConfirm && (
            <section aria-label="Limpar a agenda" className="rounded-ui-sm border border-ui-danger p-3">
              <div className="text-ui-body font-bold text-ui-danger">Limpar a agenda</div>
              <p className="mt-1 text-ui-caption text-ui-muted">
                Apaga os jogos marcados, os treinos por fazer, as reuniões e as indisponibilidades desta equipa. Os
                jogos terminados e os treinos feitos ficam.
              </p>
              <button
                type="button"
                onClick={() =>
                  onShowConfirm(
                    'Tem a certeza de que quer limpar a agenda? Os jogos marcados, os treinos por fazer, as reuniões e as indisponibilidades desta equipa são apagados.',
                    () => {
                      onUpdateState(clearedAgenda(state));
                      onShowToast?.('Agenda limpa 📅');
                    }
                  )
                }
                className="ui-btn ui-btn-soft-danger mt-2 px-3 py-2 text-ui-caption"
              >
                🗑️ Limpar a agenda
              </button>
            </section>
          )}
        </div>
      )}

      {part === 'admin' && isAdmin && onOpenAdminUsers && (
        <div className="space-y-4">
          <p className="text-ui-caption text-ui-muted">
            Autorize novos registos para a base de dados do clube, atribua funções e receba alertas de novos pedidos.
          </p>
          <section aria-label="Contactos do administrador" className="space-y-3">
            <div className="text-ui-body font-bold text-ui-text">Contactos para os pedidos de acesso</div>
            <label className={label}>
              E-mail do administrador
              <input
                type="email"
                value={notifSettings.adminContactEmail || MASTER_ADMIN_EMAIL}
                onChange={(e) => updateNotifSettings({ adminContactEmail: e.target.value })}
                placeholder={MASTER_ADMIN_EMAIL}
                className="ui-input mt-1"
              />
            </label>
            <label className={label}>
              Telemóvel / WhatsApp (com indicativo)
              <input
                type="tel"
                value={notifSettings.adminContactPhone || ''}
                onChange={(e) => updateNotifSettings({ adminContactPhone: e.target.value })}
                placeholder="+351 912 345 678"
                className="ui-input mt-1"
              />
            </label>
          </section>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAdminUsers();
            }}
            className="ui-btn ui-btn-primary w-full px-3 py-2.5 text-ui-caption"
          >
            👥 Abrir o painel de treinadores
            {pendingUsersCount > 0 && <span> ({pendingUsersCount} por aprovar)</span>}
          </button>
        </div>
      )}
    </Sheet>
  );
};
