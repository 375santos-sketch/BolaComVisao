import React, { useState } from 'react';
import { AppState } from '../types';
import { exportJSONBackup } from '../lib/exportUtils';
import { BACKUP_INTERVAL_DAYS, daysSinceBackup, getLastBackupAt, isBackupDue } from '../lib/backup';

interface BackupReminderProps {
  state: AppState;
  onShowToast: (msg: string) => void;
}

/** Weekly reminder (Administrator, Início): one tap downloads a full club backup to this device. */
export const BackupReminder: React.FC<BackupReminderProps> = ({ state, onShowToast }) => {
  const [lastBackupAt, setLastBackupAt] = useState(getLastBackupAt);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !isBackupDue(lastBackupAt)) return null;

  const days = daysSinceBackup(lastBackupAt);
  const message =
    days === null
      ? 'Ainda não há nenhuma cópia de segurança do clube neste aparelho.'
      : `A última cópia de segurança do clube foi há ${days} dias.`;

  return (
    <div
      role="status"
      aria-label="Cópia de segurança"
      className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-3 flex flex-col sm:flex-row sm:items-center gap-2.5"
    >
      <div className="flex-1 text-xs text-amber-100">
        <div className="font-bold text-amber-300 uppercase text-[11px] tracking-wide">🛟 Cópia de segurança</div>
        {message} Recomendado: uma vez a cada {BACKUP_INTERVAL_DAYS} dias. O ficheiro fica guardado neste aparelho.
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            exportJSONBackup(state);
            setLastBackupAt(getLastBackupAt());
            onShowToast('Cópia de segurança guardada neste aparelho ✓');
          }}
          className="ui-btn ui-btn-warning px-3 py-2 text-xs"
        >
          Fazer cópia agora
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ui-btn ui-btn-soft-warning px-3 py-2 text-xs"
        >
          Mais tarde
        </button>
      </div>
    </div>
  );
};
