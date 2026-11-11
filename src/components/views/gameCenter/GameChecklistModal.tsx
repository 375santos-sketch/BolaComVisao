import React from 'react';
import { Match } from '../../../types';
import { buildMatchChecklist } from '../../../lib/matchChecklist';

interface GameChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  category?: string;
  onConfirmFinish: () => void;
  onOpenEditField?: (fieldKey: string) => void;
  /** Confirms where the game was played before it is saved (a wrong "Casa" turns the scoreline around). */
  onSetLocation?: (location: Match['location']) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  isComplete: boolean;
  important?: boolean;
  details: string;
  fieldKey: string;
}

export const GameChecklistModal: React.FC<GameChecklistModalProps> = ({
  isOpen,
  onClose,
  match,
  category,
  onConfirmFinish,
  onOpenEditField,
  onSetLocation
}) => {
  if (!isOpen) return null;

  const scoredGoals = (match.goals || []).filter((g) => g.type === 'scored');
  const concededGoals = (match.goals || []).filter((g) => g.type === 'conceded');
  const home = (match.location || 'casa') === 'casa';

  // Remates / Corners / Fouls
  const rematesDentroArea = match.rematesDentroArea ?? match.shotsInBoxFor ?? 0;
  const rematesForaArea = match.rematesForaArea ?? match.shotsOutBoxFor ?? 0;
  const rematesDentroAreaAdv = match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0;
  const rematesForaAreaAdv = match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0;
  const totalRematesNos = rematesDentroArea + rematesForaArea;
  const totalRematesAdv = rematesDentroAreaAdv + rematesForaAreaAdv;
  const shotsLogged = totalRematesNos > 0 || totalRematesAdv > 0;
  const cornersLogged = typeof match.cantos === 'number' || typeof match.cantosAdv === 'number';
  const foulsLogged = typeof match.faltas === 'number' || typeof match.faltasAdv === 'number';

  const convocadosPresent = (match.convocados || []).length > 0;
  const notesFilled = Boolean(match.notes && match.notes.trim().length > 5);

  const checklist: ChecklistItem[] = [
    {
      id: 'score',
      label: 'Resultado Final',
      isComplete: true,
      details: home
        ? `Nós ${scoredGoals.length} - ${concededGoals.length} ${match.opponent || 'Adversário'}`
        : `${match.opponent || 'Adversário'} ${concededGoals.length} - ${scoredGoals.length} Nós`,
      fieldKey: 'score'
    },
    ...buildMatchChecklist(match, category).map((c) => ({
      id: c.id,
      label: c.label,
      isComplete: c.ok,
      important: c.important,
      details: c.details,
      fieldKey: c.fieldKey
    })),
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
  const importantPending = checklist.filter((item) => !item.isComplete && item.important).length;

  return (
    <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="ui-card p-6 sm:p-7 max-w-lg w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-ui-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-ui-brand/20 border border-ui-brand/40 flex items-center justify-center text-xl">
              📋
            </div>
            <div>
              <h3 className="text-lg font-black text-ui-text font-['Chakra_Petch'] uppercase tracking-wider">
                Checklist do Jogo
              </h3>
              <p className="text-xs text-ui-muted">
                Garantia de integridade e precisão estatística antes de fechar o jogo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ui-btn ui-btn-secondary w-8 h-8 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Where the game was played: confirmed here so the scoreline is not turned around */}
        {onSetLocation && (
          <div className="flex items-center gap-2 text-xs" role="group" aria-label="Local do jogo">
            <span className="text-ui-muted">Local do jogo:</span>
            {(['casa', 'fora'] as const).map((loc) => {
              const active = (match.location || 'casa') === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  aria-pressed={active}
                  onClick={() => !active && onSetLocation(loc)}
                  className={`px-3 py-1 rounded-lg border font-bold ${
                    active
                      ? 'bg-ui-brand/20 border-ui-brand text-ui-brand'
                      : 'border-ui-line-strong text-ui-muted hover:text-ui-text'
                  }`}
                >
                  {loc === 'casa' ? 'Casa' : 'Fora'}
                </button>
              );
            })}
          </div>
        )}

        {/* Status Warning Banner */}
        {importantPending > 0 ? (
          <div
            className="p-3.5 rounded-2xl bg-ui-danger-soft border border-ui-danger/50 flex items-center gap-3 text-ui-danger text-xs"
            role="alert"
          >
            <span className="text-xl shrink-0">⛔</span>
            <div>
              <span className="font-bold block uppercase font-['Chakra_Petch']">
                {importantPending === 1 ? 'Há 1 problema' : `Há ${importantPending} problemas`} nos minutos de jogo
              </span>
              <span className="text-[11px] text-ui-danger/80">
                Corrija antes de terminar, senão os minutos dos atletas ficam errados nas estatísticas.
              </span>
            </div>
          </div>
        ) : pendingCount > 0 ? (
          <div className="p-3.5 rounded-2xl bg-ui-warning-soft border border-ui-warning/40 flex items-center gap-3 text-ui-warning text-xs">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <span className="font-bold block uppercase font-['Chakra_Petch']">
                Faltam {pendingCount} campos recomendados
              </span>
              <span className="text-[11px] text-ui-warning/80">
                Pode completar os campos pendentes agora para otimizar os relatórios e a análise tática.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-ui-success-soft border border-ui-success/40 flex items-center gap-3 text-ui-success text-xs">
            <span className="text-xl shrink-0">✓</span>
            <div>
              <span className="font-bold block uppercase font-['Chakra_Petch']">Todos os dados do jogo validados!</span>
              <span className="text-[11px] text-ui-success/80">
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
                  ? 'bg-ui-inset/60 border-ui-success/30'
                  : item.important
                    ? 'bg-ui-danger-soft border-ui-danger/50 hover:border-ui-danger'
                    : 'bg-ui-warning-soft border-ui-warning/40 hover:border-ui-warning'
              } flex items-center justify-between gap-3 cursor-pointer transition-colors`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    item.isComplete
                      ? 'bg-ui-success text-ui-brand-ink'
                      : 'bg-ui-warning/20 text-ui-warning border border-ui-warning/40'
                  }`}
                >
                  {item.isComplete ? '✓' : '•'}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-ui-text block">{item.label}</span>
                  <span className="text-[11px] text-ui-muted block mt-0.5">{item.details}</span>
                </div>
              </div>

              {!item.isComplete && (
                <span className="text-[10px] font-mono text-ui-warning uppercase font-bold shrink-0">Preencher ➔</span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-ui-line">
          <button onClick={onClose} className="ui-btn ui-btn-secondary px-4 py-2.5 text-xs">
            Voltar ao Jogo
          </button>
          <button
            onClick={() => {
              onConfirmFinish();
              onClose();
            }}
            className="ui-btn ui-btn-primary px-5 py-2.5 text-xs flex items-center gap-1.5"
          >
            <span>{importantPending > 0 ? 'Terminar mesmo assim' : 'Concluir e Ver Resumo'}</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
