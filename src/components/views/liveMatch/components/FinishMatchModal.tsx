import React from 'react';
import { Match } from '../../../../types';

interface FinishMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  myClubName: string;
  onConfirmFinish: () => void;
  isFinishing: boolean;
}

export const FinishMatchModal: React.FC<FinishMatchModalProps> = ({
  isOpen,
  onClose,
  match,
  myClubName,
  onConfirmFinish,
  isFinishing
}) => {
  if (!isOpen) return null;

  const scored = (match.goals || []).filter((g) => g.type === 'scored').length;
  const conceded = (match.goals || []).filter((g) => g.type === 'conceded').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏁</span>
            <h3 className="text-lg font-bold text-white">Terminar e Gravar Jogo</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">
            Resultado Final
          </div>
          <div className="flex items-center justify-center gap-3 text-2xl font-black text-white my-1">
            <span>{myClubName || 'A Nossa Equipa'}</span>
            <span className="text-emerald-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 font-mono">
              {scored} - {conceded}
            </span>
            <span>{match.opponent || 'Adversário'}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Ao terminar, todas as estatísticas, golos, cartões e substituições serão consolidados no histórico de jogos.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isFinishing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Voltar ao Jogo
          </button>
          <button
            onClick={onConfirmFinish}
            disabled={isFinishing}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isFinishing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>A Gravar...</span>
              </>
            ) : (
              <>
                <span>🏁</span>
                <span>Confirmar e Finalizar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
