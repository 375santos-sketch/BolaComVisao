import React from 'react';

export const ViewLoadingFallback: React.FC = () => {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl animate-pulse">
          ⚽
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 blur opacity-30 animate-spin pointer-events-none" />
      </div>
      <div className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider animate-pulse">
        A carregar vista...
      </div>
    </div>
  );
};
