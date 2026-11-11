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
            <h2 className="text-sm font-black uppercase tracking-wider text-ui-text font-['Chakra_Petch'] flex items-center gap-2">
              O que os dados nos dizem
              <span className="text-[10px] font-bold font-mono text-ui-brand bg-ui-brand/10 border border-ui-brand/20 px-2 py-0.5 rounded-full lowercase tracking-normal">
                insights automáticos
              </span>
            </h2>
          </div>
        </div>
        <span className="text-[11px] text-ui-muted font-mono hidden sm:inline">Apoio à Decisão Técnica</span>
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-2'} gap-3`}>
        {insights.map((insight) => {
          // Determine color themes based on insight type
          let borderClass = 'border-ui-line bg-ui-surface/90';
          let badgeBg = 'bg-ui-surface-2 text-ui-text border-ui-line-strong';
          let statColor = 'text-ui-text';

          if (insight.type === 'strength') {
            borderClass = 'border-ui-success/30 bg-ui-surface border-l-4';
            badgeBg = 'bg-ui-success/15 text-ui-success border-ui-success/30';
            statColor = 'text-ui-success';
          } else if (insight.type === 'warning') {
            borderClass = 'border-ui-danger/35 bg-ui-surface border-l-4';
            badgeBg = 'bg-ui-danger/15 text-ui-danger border-ui-danger/30';
            statColor = 'text-ui-danger';
          } else if (insight.type === 'trend') {
            borderClass = 'border-ui-brand/30 bg-ui-surface border-l-4';
            badgeBg = 'bg-ui-brand/15 text-ui-brand border-ui-brand/30';
            statColor = 'text-ui-brand';
          } else if (insight.type === 'efficiency') {
            borderClass = 'border-ui-success/30 bg-ui-surface border-l-4';
            badgeBg = 'bg-ui-success/15 text-ui-success border-ui-success/30';
            statColor = 'text-ui-success';
          } else if (insight.type === 'set_piece') {
            borderClass = 'border-ui-warning/30 bg-ui-surface border-l-4';
            badgeBg = 'bg-ui-warning/15 text-ui-warning border-ui-warning/30';
            statColor = 'text-ui-warning';
          } else if (insight.type === 'milestone') {
            borderClass = 'border-ui-brand/30 bg-ui-surface border-l-4';
            badgeBg = 'bg-ui-brand/15 text-ui-brand border-ui-brand/30';
            statColor = 'text-ui-brand';
          } else if (insight.type === 'opportunity') {
            borderClass = 'border-ui-brand/30 bg-ui-surface border-l-4';
            badgeBg = 'bg-ui-brand/15 text-ui-brand border-ui-brand/30';
            statColor = 'text-ui-brand';
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
                    <span className="text-xs font-bold text-ui-text hidden sm:inline font-['Chakra_Petch']">
                      • {insight.title}
                    </span>
                  </div>
                  {insight.stat && (
                    <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md bg-ui-inset/60 ${statColor}`}>
                      {insight.stat}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-[13px] text-ui-text leading-relaxed font-medium">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
