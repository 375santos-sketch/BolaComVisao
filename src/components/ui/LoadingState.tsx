import React from 'react';
import { Button } from './Button';

export interface LoadingStateProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'A carregar informação...',
  error,
  onRetry,
  className = ''
}) => {
  if (error) {
    return (
      <div
        className={`p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center flex flex-col items-center justify-center my-4 ${className}`}
      >
        <span className="text-3xl mb-2">⚠️</span>
        <h4 className="text-sm sm:text-base font-bold font-['Chakra_Petch'] uppercase text-rose-300 mb-1">
          Ocorreu um erro
        </h4>
        <p className="text-xs text-rose-200/80 font-mono max-w-md mb-4">{error}</p>
        {onRetry && (
          <Button variant="danger" size="sm" onClick={onRetry}>
            Tentar Novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center flex flex-col items-center justify-center my-4 ${className}`}
    >
      <div className="w-10 h-10 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(0,210,255,0.3)]" />
      <p className="text-xs sm:text-sm font-mono text-cyan-300/90 font-medium">{message}</p>
    </div>
  );
};
