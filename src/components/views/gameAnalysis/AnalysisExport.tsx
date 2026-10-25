import React from 'react';
import { AggregatedAnalysis } from '../../../lib/gameAnalysis';

interface AnalysisExportProps {
  analysis: AggregatedAnalysis;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  exporting?: boolean;
}

export const AnalysisExport: React.FC<AnalysisExportProps> = ({
  analysis,
  onExportPDF,
  onExportExcel,
  exporting = false
}) => {
  return (
    <div className="ui-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
            <span>📥</span>
            <span>Relatório & Exportação de Estatísticas</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Exporte o relatório completo de rendimento da equipa ({analysis.filteredMatches.length} jogos filtrados)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onExportPDF && (
            <button
              type="button"
              disabled={exporting}
              onClick={onExportPDF}
              className="ui-btn ui-btn-soft-danger flex items-center gap-2 px-4 py-2.5 text-xs"
            >
              <span>📄</span>
              <span>{exporting ? 'A gerar...' : 'Exportar PDF'}</span>
            </button>
          )}

          {onExportExcel && (
            <button
              type="button"
              disabled={exporting}
              onClick={onExportExcel}
              className="ui-btn ui-btn-soft-success flex items-center gap-2 px-4 py-2.5 text-xs"
            >
              <span>📊</span>
              <span>Exportar Excel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
