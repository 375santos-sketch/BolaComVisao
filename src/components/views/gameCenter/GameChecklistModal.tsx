import React from 'react';
import { Match } from '../../../types';
import { parseMinuteToNumber } from '../../../lib/gameAnalysisUtils';

function isGoalMinuteAssigned(minuteVal: unknown): boolean {
  if (minuteVal === null || minuteVal === undefined) return false;
  const str = String(minuteVal).trim();
  if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'sem minuto') return false;
  if (str.toUpperCase() === 'INT' || str.toLowerCase() === 'intervalo') return true;
  if (/\d/.test(str)) return true;
  const num = parseMinuteToNumber(minuteVal as string | number);
  return num !== null && num >= 0;
}

interface GameChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  onConfirmFinish: () => void;
  onOpenEditField?: (fieldKey: string) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  isComplete: boolean;
  details: string;
  fieldKey: string;
}

export const GameChecklistModal: React.FC<GameChecklistModalProps> = ({
  isOpen,
  onClose,
  match,
  onConfirmFinish,
  onOpenEditField
}) => {
  if (!isOpen) return null;

  const scoredGoals = (match.goals || []).filter((g) => g.type === 'scored');
  const concededGoals = (match.goals || []).filter((g) => g.type === 'conceded');

  // 1. Check Scorers
  const allScorersAssigned = scoredGoals.length === 0 || scoredGoals.every((g) => Boolean(g.scorerId || g.scorer));

  // 2. Check Goal Types
  const allGoalTypesAssigned =
    (match.goals || []).length === 0 || (match.goals || []).every((g) => g.goalType && g.goalType.trim() !== '');

  // 3. Check Minutes
  const allScoredMinutesAssigned =
    scoredGoals.length === 0 || scoredGoals.every((g) => isGoalMinuteAssigned(g.minute));
  const allConcededMinutesAssigned =
    concededGoals.length === 0 || concededGoals.every((g) => isGoalMinuteAssigned(g.minute));
  const allMinutesAssigned =
    (match.goals || []).length === 0 ||
    (scoredGoals.length > 0 ? allScoredMinutesAssigned : allConcededMinutesAssigned);

  // 4. Check Remates / Corners / Fouls
  const rematesDentroArea = match.rematesDentroArea ?? match.shotsInBoxFor ?? 0;
  const rematesForaArea = match.rematesForaArea ?? match.shotsOutBoxFor ?? 0;
  const rematesDentroAreaAdv = match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0;
  const rematesForaAreaAdv = match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0;
  const totalRematesNos = rematesDentroArea + rematesForaArea;
  const totalRematesAdv = rematesDentroAreaAdv + rematesForaAreaAdv;
  const shotsLogged = totalRematesNos > 0 || totalRematesAdv > 0;
  const cornersLogged = typeof match.cantos === 'number' || typeof match.cantosAdv === 'number';
  const foulsLogged = typeof match.faltas === 'number' || typeof match.faltasAdv === 'number';

  // 5. Check Convocados / Subs
  const convocadosPresent = (match.convocados || []).length > 0;

  // 6. Check Notes
  const notesFilled = Boolean(match.notes && match.notes.trim().length > 5);

  const checklist: ChecklistItem[] = [
    {
      id: 'score',
      label: 'Resultado Final',
      isComplete: true,
      details: `${scoredGoals.length} - ${concededGoals.length} vs ${match.opponent || 'Adversário'}`,
      fieldKey: 'score'
    },
    {
      id: 'scorers',
      label: 'Marcadores dos Golos',
      isComplete: allScorersAssigned,
      details: allScorersAssigned
        ? `${scoredGoals.length} golos com marcador atribuído`
        : 'Existem golos marcados sem identificação do autor',
      fieldKey: 'goals'
    },
    {
      id: 'types',
      label: 'Tipos e Origem dos Golos',
      isComplete: allGoalTypesAssigned,
      details: allGoalTypesAssigned
        ? 'Todos os golos têm tipo classificado (bola jogada, canto, etc.)'
        : 'Defina o tipo de golo para enriquecer os dados analíticos',
      fieldKey: 'goals'
    },
    {
      id: 'minutes',
      label: 'Minutos dos Golos',
      isComplete: allMinutesAssigned,
      details: allMinutesAssigned ? 'Minutos temporais registados ✓' : 'Alguns golos não têm minuto indicado',
      fieldKey: 'goals'
    },
    {
      id: 'corners',
      label: 'Estatísticas de Jogo (Remates, Cantos, Faltas)',
      isComplete: shotsLogged || cornersLogged || foulsLogged,
      details: `Remates: ${totalRematesNos} Nós (${rematesDentroArea}d/${rematesForaArea}f) vs ${totalRematesAdv} Adv • Cantos: ${match.cantos || 0}-${match.cantosAdv || 0} • Faltas: ${match.faltas || 0}-${match.faltasAdv || 0}`,
      fieldKey: 'stats'
    },
    {
      id: 'convocados',
      label: 'Convocatória e Suplentes',
      isComplete: convocadosPresent,
      details: `${(match.convocados || []).length} jogadores registados`,
      fieldKey: 'convocados'
    },
    {
      id: 'notes',
      label: 'Observações do Treinador',
      isComplete: notesFilled,
      details: notesFilled ? 'Notas táticas e avaliação preenchidas' : 'Recomendado adicionar notas pós-jogo',
      fieldKey: 'notes'
    }
  ];

  const pendingCount = checklist.filter((item) => !item.isComplete).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl">
              📋
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Chakra_Petch'] uppercase tracking-wider">
                Checklist do Jogo
              </h3>
              <p className="text-xs text-slate-400">
                Garantia de integridade e precisão estatística antes de fechar o jogo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Status Warning Banner */}
        {pendingCount > 0 ? (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-3 text-amber-300 text-xs">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <span className="font-bold block uppercase font-['Chakra_Petch']">
                Faltam {pendingCount} campos recomendados
              </span>
              <span className="text-[11px] text-amber-200/80">
                Pode completar os campos pendentes agora para otimizar os relatórios e a análise tática.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-emerald-300 text-xs">
            <span className="text-xl shrink-0">✓</span>
            <div>
              <span className="font-bold block uppercase font-['Chakra_Petch']">
                Todos os dados do jogo validados!
              </span>
              <span className="text-[11px] text-emerald-200/80">
                Registo estatístico 100% completo e pronto para arquivo analítico.
              </span>
            </div>
          </div>
        )}

        {/* Checklist items list */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {checklist.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (onOpenEditField) onOpenEditField(item.fieldKey);
              }}
              className={`p-3 rounded-2xl border ${
                item.isComplete
                  ? 'bg-slate-950/60 border-emerald-500/30'
                  : 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
              } flex items-center justify-between gap-3 cursor-pointer transition-colors`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    item.isComplete
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {item.isComplete ? '✓' : '•'}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block">{item.label}</span>
                  <span className="text-[11px] text-slate-400 truncate block mt-0.5">{item.details}</span>
                </div>
              </div>

              {!item.isComplete && (
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold shrink-0">
                  Preencher ➔
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs font-['Chakra_Petch'] uppercase tracking-wider transition-colors"
          >
            Voltar ao Jogo
          </button>
          <button
            onClick={() => {
              onConfirmFinish();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-['Chakra_Petch'] uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
          >
            <span>Concluir e Ver Resumo</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
