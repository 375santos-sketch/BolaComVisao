import React from 'react';
import { GameAnalysisInsight } from '../../../lib/gameAnalysis';

interface InsightsSectionProps {
  insights: GameAnalysisInsight[];
  compact?: boolean;
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({ insights, compact = false }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <section className="space-y-3" id="insights-section">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">🧠</span>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center gap-2">
              O que os dados nos dizem
              <span className="text-[10px] font-bold font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full lowercase tracking-normal">
                insights automáticos
              </span>
            </h2>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          Apoio à Decisão Técnica
        </span>
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-2'} gap-3`}>
        {insights.map((insight) => {
          // Determine color themes based on insight type
          let borderClass = 'border-slate-800 bg-slate-900/90';
          let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
          let statColor = 'text-slate-200';

          if (insight.type === 'strength') {
            borderClass = 'border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 shadow-emerald-950/20';
            badgeBg = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
            statColor = 'text-emerald-400';
          } else if (insight.type === 'warning') {
            borderClass = 'border-rose-500/35 bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/25 shadow-rose-950/20';
            badgeBg = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
            statColor = 'text-rose-400';
          } else if (insight.type === 'trend') {
            borderClass = 'border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20 shadow-cyan-950/20';
            badgeBg = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
            statColor = 'text-cyan-300';
          } else if (insight.type === 'efficiency') {
            borderClass = 'border-teal-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/20 shadow-teal-950/20';
            badgeBg = 'bg-teal-500/15 text-teal-300 border-teal-500/30';
            statColor = 'text-teal-300';
          } else if (insight.type === 'set_piece') {
            borderClass = 'border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 shadow-amber-950/20';
            badgeBg = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
            statColor = 'text-amber-300';
          } else if (insight.type === 'milestone') {
            borderClass = 'border-blue-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20 shadow-blue-950/20';
            badgeBg = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
            statColor = 'text-blue-300';
          } else if (insight.type === 'opportunity') {
            borderClass = 'border-purple-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/20';
            badgeBg = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
            statColor = 'text-purple-300';
          }

          return (
            <div
              key={insight.id}
              className={`border rounded-3xl p-4 sm:p-4.5 shadow-lg transition-all hover:scale-[1.01] relative overflow-hidden flex flex-col justify-between ${borderClass}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg">{insight.icon}</span>
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeBg}`}
                    >
                      {insight.badgeText}
                    </span>
                    <span className="text-xs font-bold text-slate-300 hidden sm:inline font-['Chakra_Petch']">
                      • {insight.title}
                    </span>
                  </div>
                  {insight.stat && (
                    <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md bg-slate-950/60 ${statColor}`}>
                      {insight.stat}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-medium">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
