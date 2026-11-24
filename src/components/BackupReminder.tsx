import React, { useState } from 'react';
import { BACKUP_INTERVAL_DAYS, backupUrgency, daysSinceBackup, getLastEncryptedBackupAt } from '../lib/backup';

interface BackupReminderProps {
  /** Opens "Cópia cifrada da plataforma" (the only copy this reminder offers: no file in clear). */
  onOpenEncryptedBackup: () => void;
}

/**
 * P1-03 (free plan, decisão 12): weekly reminder (Administrator, Início) of the encrypted copy of the whole platform.
 * It counts from the last encrypted copy made AND checked on this device. After two weeks it turns red.
 */
export const BackupReminder: React.FC<BackupReminderProps> = ({ onOpenEncryptedBackup }) => {
  const [dismissed, setDismissed] = useState(false);
  // Read on every render: the date changes when the copy is made in the window opened from here.
  const last = getLastEncryptedBackupAt();
  const urgency = backupUrgency(last);
  if (dismissed || urgency === 'ok') return null;

  const days = daysSinceBackup(last);
  const message =
    days === null
      ? 'Ainda não foi feita nenhuma cópia cifrada neste aparelho.'
      : `A última cópia cifrada foi há ${days} dias.`;
  const overdue = urgency === 'overdue';

  return (
    <div
      role={overdue ? 'alert' : 'status'}
      aria-label="Cópia de segurança"
      data-urgency={urgency}
      className={`mb-3 rounded-2xl border p-3 flex flex-col sm:flex-row sm:items-center gap-2.5 ${
        overdue ? 'border-red-500/60 bg-red-950/50' : 'border-amber-500/40 bg-amber-950/40'
      }`}
    >
      <div className={`flex-1 text-xs ${overdue ? 'text-red-100' : 'text-amber-100'}`}>
        <div className={`font-bold uppercase text-[11px] tracking-wide ${overdue ? 'text-red-300' : 'text-amber-300'}`}>
          🛟 Cópia de segurança {overdue ? 'em atraso' : 'da semana'}
        </div>
        {message} Faça uma a cada {BACKUP_INTERVAL_DAYS} dias e guarde o ficheiro fora deste aparelho (por exemplo, numa
        pen). Sem cópia, um erro ou um problema na nuvem pode levar o histórico dos atletas.
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenEncryptedBackup}
          className={`ui-btn px-3 py-2 text-xs ${overdue ? 'ui-btn-danger' : 'ui-btn-warning'}`}
        >
          Fazer cópia cifrada
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
