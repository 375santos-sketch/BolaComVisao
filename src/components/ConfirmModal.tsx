import React from 'react';
import { Language } from '../types';
import { t } from '../i18n/dict';

interface ConfirmModalProps {
  message: string;
  lang: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, lang, onConfirm, onCancel }) => {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-card">
        <p className="text-sm leading-relaxed mb-5 font-medium">{message}</p>
        <div className="flex gap-2.5">
          <button className="btn btn-outline" onClick={onCancel}>
            {t(lang, 'cancel')}
          </button>
          <button className="btn btn-red" onClick={onConfirm}>
            {t(lang, 'confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
