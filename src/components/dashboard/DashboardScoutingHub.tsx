import React, { useState } from 'react';
import { AppState, OpponentScouting, ScheduledMatch } from '../../types';
import { TabType } from '../Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface DashboardScoutingHubProps {
  state: AppState;
  nextMatch: ScheduledMatch | null;
  onNavigate: (tab: TabType, targetId?: string) => void;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast?: (msg: string) => void;
}

export const DashboardScoutingHub: React.FC<DashboardScoutingHubProps> = ({
  state,
  nextMatch,
  onNavigate,
  onUpdateState,
  onShowToast
}) => {
  const [selectedScoutToDelete, setSelectedScoutToDelete] = useState<string | null>(null);
  const scoutingList: OpponentScouting[] = state.opponentScouting || [];

  const linkedScout: OpponentScouting | undefined = nextMatch
    ? scoutingList.find(
        (s) =>
          s.matchId === nextMatch.id ||
          (s.opponentName &&
            nextMatch.opponent &&
            s.opponentName.trim().toLowerCase() === nextMatch.opponent.trim().toLowerCase())
      )
    : scoutingList.length > 0
      ? scoutingList[0]
      : undefined;

  const handleExportScoutPDF = async (scout: OpponentScouting) => {
    try {
      const { generateOpponentScoutingPDF } = await import('../../lib/pdfUtils');
      await generateOpponentScoutingPDF(scout, state, nextMatch || undefined);
      if (onShowToast) onShowToast('Relatório Tático exportado em PDF! 📄');
    } catch (e) {
      console.warn('Erro ao exportar PDF de scouting:', e);
    }
  };

  const handleExportPreMatchPDF = async (scout: OpponentScouting) => {
    try {
      const { generatePreMatchReportPDF } = await import('../../lib/pdfUtils');
      await generatePreMatchReportPDF(scout, state, nextMatch || undefined);
      if (onShowToast) onShowToast('Plano Pré-Jogo exportado em PDF! 📋');
    } catch (e) {
      console.warn('Erro ao exportar PDF pré-jogo:', e);
    }
  };

  const confirmDeleteScout = () => {
    if (!selectedScoutToDelete) return;
    const updated = scoutingList.filter((s) => s.id !== selectedScoutToDelete);
    onUpdateState({ opponentScouting: updated });
    setSelectedScoutToDelete(null);
    if (onShowToast) onShowToast('Relatório de observação removido');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header and Quick Action */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🎯</span>
          <h2 className="text-base font-bold text-white font-sans uppercase tracking-tight">
            Scouting & Análise de Adversários
          </h2>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('adversario')}
          className="border border-slate-700 hover:border-slate-600 text-xs font-mono text-cyan-300"
        >
          Ver Todos ({scoutingList.length}) →
        </Button>
      </div>

      {linkedScout ? (
        <Card className="bg-slate-900/90 border-slate-800 p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="amber" size="sm" className="font-mono uppercase font-bold text-[10px]">
                  Próximo Adversário
                </Badge>
                <span className="text-xs text-slate-400 font-mono">
                  {linkedScout.formation || 'Sistema não definido'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mt-1">{linkedScout.opponentName}</h3>

              {linkedScout.strengths && linkedScout.strengths.length > 0 && (
                <p className="text-xs text-slate-300 font-mono mt-1 line-clamp-1">
                  Pontos Fortes: {linkedScout.strengths.join(', ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportScoutPDF(linkedScout)}
                className="border border-slate-700 hover:border-slate-600 text-xs font-mono"
              >
                📄 PDF Tático
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportPreMatchPDF(linkedScout)}
                className="border border-slate-700 hover:border-slate-600 text-xs font-mono"
              >
                📋 PDF Pré-Jogo
              </Button>

              <Button
                variant="cyan"
                size="sm"
                onClick={() => onNavigate('adversario', linkedScout.id)}
                className="text-xs font-mono font-bold"
              >
                Editar Análise →
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-slate-900/40 border-slate-800 p-6 text-center">
          <p className="text-xs text-slate-400 font-mono">
            Ainda não criou nenhuma ficha de observação para o próximo adversário.
          </p>
          <Button
            variant="cyan"
            size="sm"
            onClick={() => onNavigate('adversario')}
            className="mt-3 text-xs font-mono font-bold"
          >
            + Criar Relatório de Scouting
          </Button>
        </Card>
      )}

      {/* Delete confirmation modal */}
      {selectedScoutToDelete && (
        <Modal isOpen={true} title="Eliminar Análise de Observação" onClose={() => setSelectedScoutToDelete(null)}>
          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-300">
              Tem a certeza de que deseja remover esta análise? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedScoutToDelete(null)}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteScout}>
                Sim, Eliminar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
