import React from 'react';
import { SmartRecommendation } from '../../types';

interface RecommendationCardProps {
  recommendation: SmartRecommendation;
  onAction?: (rec: SmartRecommendation) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onAction }) => {
  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400/60 backdrop-blur-md transition-all shadow-sm flex flex-col justify-between gap-3 text-left">
      <div>
        {/* Header: Badge + Confidence */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-['Chakra_Petch'] font-bold uppercase px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
            <span>💡</span>
            <span>Recomendação</span>
          </span>

          <span className="text-[10px] font-mono text-slate-400">
            Confiança:{' '}
            <strong className={recommendation.confidence === 'alta' ? 'text-emerald-400' : 'text-amber-400'}>
              {recommendation.confidence === 'alta'
                ? 'Alta (Dados Reais)'
                : recommendation.confidence === 'media'
                  ? 'Média'
                  : 'Poucos Dados'}
            </strong>
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-1.5">
          {recommendation.title}
        </h4>

        {/* Message */}
        <p className="text-xs text-slate-300 font-mono mt-1 leading-relaxed">{recommendation.message}</p>

        {/* Metric Pill if available */}
        {recommendation.metricLabel && recommendation.metricValue && (
          <div className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-cyan-500/20 text-xs font-mono">
            <span className="text-slate-400 text-[10px] uppercase">{recommendation.metricLabel}:</span>
            <span className="font-bold text-cyan-300">{recommendation.metricValue}</span>
          </div>
        )}

        {/* Rationale Explicativa */}
        {recommendation.rationale && (
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="text-slate-500 font-bold">Base de cálculo:</span> {recommendation.rationale}
          </div>
        )}
      </div>

      {/* Action Button */}
      {recommendation.actionLabel && onAction && (
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => onAction(recommendation)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all hover:bg-slate-900 active:scale-95"
          >
            <span>{recommendation.actionLabel}</span>
            <span>➔</span>
          </button>
        </div>
      )}
    </div>
  );
};
