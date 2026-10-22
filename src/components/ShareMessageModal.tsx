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
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-slate-950 border border-cyan-500/40 p-4 space-y-3 text-left"
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
          className="w-full rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs p-3 font-mono"
          aria-label="Mensagem"
        />

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')}
            className="py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
          >
            WhatsApp
          </button>
          <button
            type="button"
            disabled={!canShare}
            onClick={() => navigator.share?.({ text }).catch(() => {})}
            className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold disabled:opacity-40"
          >
            Partilhar
          </button>
          <button
            type="button"
            onClick={copy}
            className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold"
          >
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
};
