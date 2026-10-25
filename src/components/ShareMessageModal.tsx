import React from 'react';

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
  icon = '📲',
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
        className="ui-inset w-full max-w-md p-4 space-y-3 text-left"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-sm">
            {icon} {title}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white px-2" aria-label="Fechar">
            ✕
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
            className="ui-btn ui-btn-success py-2 text-xs"
          >
            WhatsApp
          </button>
          <button
            type="button"
            disabled={!canShare}
            onClick={() => navigator.share?.({ text }).catch(() => {})}
            className="ui-btn ui-btn-secondary py-2 text-xs"
          >
            Partilhar
          </button>
          <button type="button" onClick={copy} className="ui-btn ui-btn-secondary py-2 text-xs">
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
};
