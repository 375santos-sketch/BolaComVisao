import React from 'react';
import { Icon } from './ui/Icon';

interface ShareMessageModalProps {
  /** Dialog name, e.g. "Partilhar com os pais". */
  title: string;
  icon?: string;
  text: string;
  onTextChange: (text: string) => void;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  /** Options shown above the message (e.g. "include scorers"). */
  children?: React.ReactNode;
  rows?: number;
}

/** A message for a WhatsApp group, editable before sending: WhatsApp, the phone's share sheet or copy. */
export const ShareMessageModal: React.FC<ShareMessageModalProps> = ({
  title,
  text,
  onTextChange,
  onClose,
  onShowToast,
  children,
  rows = 9
}) => {
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onShowToast?.('Mensagem copiada ✓');
    } catch {
      onShowToast?.('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="ui-card w-full max-w-md space-y-3 p-4 text-left"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-ui-lead font-bold text-ui-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
            aria-label="Fechar"
          >
            <Icon name="x" className="h-5 w-5 shrink-0" />
          </button>
        </div>

        {children}

        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={rows}
          className="ui-input w-full text-xs"
          aria-label="Mensagem"
        />

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')}
            className="ui-btn ui-btn-success min-h-11 text-ui-body"
          >
            WhatsApp
          </button>
          <button
            type="button"
            disabled={!canShare}
            onClick={() => navigator.share?.({ text }).catch(() => {})}
            className="ui-btn ui-btn-secondary min-h-11 text-ui-body"
          >
            Partilhar
          </button>
          <button type="button" onClick={copy} className="ui-btn ui-btn-secondary min-h-11 text-ui-body">
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
};
