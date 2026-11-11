import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Buttons at the bottom (they stay visible while the content scrolls). */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const WIDTH = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' };

/**
 * One window for the whole app: a sheet from the bottom on the phone, a centred window on bigger screens. Same
 * header (title and close), Esc closes it and the focus goes into it when it opens.
 */
export const Sheet: React.FC<SheetProps> = ({ title, onClose, children, footer, size = 'md' }) => {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end justify-center sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`ui-card flex max-h-[94dvh] w-full flex-col rounded-t-[var(--radius-ui-lg)] shadow-[var(--shadow-ui-2)] outline-none sm:rounded-[var(--radius-ui-lg)] ${WIDTH[size]}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ui-line px-4 py-3">
          <h2 className="truncate text-ui-lead font-extrabold text-ui-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Fechar ${title.toLowerCase()}`}
            className="flex h-9 w-9 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="flex gap-2 border-t border-ui-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/** "Tem a certeza?" inside the app (instead of the browser's own box), with the action named on the button. */
export const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel, danger = false, onConfirm, onCancel }) => (
  <Sheet
    title={title}
    onClose={onCancel}
    size="sm"
    footer={
      <>
        <button type="button" onClick={onCancel} className="ui-btn ui-btn-secondary flex-1 py-2.5">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`ui-btn flex-1 py-2.5 ${danger ? 'ui-btn-danger' : 'ui-btn-primary'}`}
        >
          {confirmLabel}
        </button>
      </>
    }
  >
    <p className="text-ui-body text-ui-text">{message}</p>
  </Sheet>
);
