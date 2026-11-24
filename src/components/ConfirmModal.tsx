import React, { useState } from 'react';
import { Language } from '../types';
import { t } from '../i18n/dict';
import { confirmWordMatches } from '../lib/destructiveActions';

/** P0-09: a confirmation that erases a lot at once asks the coach to type a word first. */
export interface ConfirmOptions {
  /** Word to type before the confirm button works (e.g. "ELIMINAR"). Without it, one tap confirms, as before. */
  confirmWord?: string;
}

/** How the screens ask for a confirmation (the third argument is optional: older screens pass two). */
export type ShowConfirm = (message: string, onConfirm: () => void, options?: ConfirmOptions) => void;

interface ConfirmModalProps {
  message: string;
  lang: Language;
  onConfirm: () => void;
  onCancel: () => void;
  confirmWord?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, lang, onConfirm, onCancel, confirmWord }) => {
  const [typed, setTyped] = useState('');
  const ready = !confirmWord || confirmWordMatches(typed, confirmWord);
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-card" role="alertdialog" aria-label="Confirmar">
        <p className="text-sm leading-relaxed mb-5 font-medium">{message}</p>
        {confirmWord && (
          <label className="mb-4 block text-left text-xs font-bold text-ui-muted">
            Não dá para desfazer. Para confirmar, escreva <span className="text-ui-danger">{confirmWord}</span>:
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              aria-label={`Escreva ${confirmWord} para confirmar`}
              className="mt-1.5 w-full rounded-lg border border-ui-line bg-ui-surface-2 px-3 py-2 text-sm text-ui-text"
            />
          </label>
        )}
        <div className="flex gap-2.5">
          <button className="btn btn-outline" onClick={onCancel}>
            {t(lang, 'cancel')}
          </button>
          <button
            className="btn btn-red disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => ready && onConfirm()}
            disabled={!ready}
          >
            {t(lang, 'confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
