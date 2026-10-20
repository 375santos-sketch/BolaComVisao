import React, { useEffect } from 'react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: 'primary' | 'danger' | 'emerald' | 'amber';
  isConfirmLoading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  confirmVariant = 'primary',
  isConfirmLoading = false,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] text-left animate-scaleIn`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800/90 flex items-center justify-between gap-3 bg-slate-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-base shrink-0">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black font-['Chakra_Petch'] uppercase tracking-wider text-white truncate">
                {title}
              </h2>
              {description && <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{description}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer text-sm shrink-0 touch-manipulation"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 custom-scrollbar">{children}</div>

        {/* Modal Footer */}
        {(footer || confirmLabel) && (
          <div className="p-3 sm:p-4 border-t border-slate-800/90 bg-slate-900/40 flex items-center justify-end gap-2.5">
            {footer ? (
              footer
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={onClose} className="flex-1 sm:flex-initial">
                  {cancelLabel}
                </Button>
                {confirmLabel && onConfirm && (
                  <Button variant={confirmVariant} size="sm" loading={isConfirmLoading} onClick={onConfirm} className="flex-1 sm:flex-initial">
                    {confirmLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
