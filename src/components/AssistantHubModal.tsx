import React from 'react';
import { AppState } from '../types';
import { AssistantCard } from './assistant/AssistantCard';
import { TabType } from './Navbar';

interface AssistantHubModalProps {
  state: AppState;
  onNavigate: (tab: TabType, targetId?: string) => void;
  onOpenMonthlyReport?: () => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/**
 * Mais → 🤖 Assistente: the app's help for the coach in one place. Only what really works today is a button; what
 * is still to come is listed as such (no pretend AI).
 */
const AssistantHubModal: React.FC<AssistantHubModalProps> = ({
  state,
  onNavigate,
  onOpenMonthlyReport,
  onShowToast,
  onClose
}) => {
  const go = (tab: TabType, hint?: string) => {
    onClose();
    onNavigate(tab);
    if (hint) onShowToast(hint);
  };
  const tools: Array<[string, string, string, () => void]> = [
    [
      '✨',
      'Criar exercício com IA',
      'A partir do que quer trabalhar e do escalão',
      () => go('treinos', 'Treinos → Exercícios → ✨ Criar exercício com IA')
    ],
    [
      '📷',
      'Exercício a partir de uma foto',
      'Lê a ficha ou o desenho fotografado',
      () => go('treinos', 'Treinos → Exercícios → 📷 Exercício a partir de uma foto')
    ],
    ['📈', 'Tendências da equipa', 'O que mudou nos últimos jogos e o que fazer', () => go('analise_jogos')],
    ['📰', 'Crónica do jogo', 'Texto do jogo para os pais (Resultados → um jogo)', () => go('jogos')],
    ...(onOpenMonthlyReport
      ? ([
          [
            '🗓️',
            'Relatório mensal',
            'PDF do mês para o coordenador',
            () => {
              onClose();
              onOpenMonthlyReport();
            }
          ]
        ] as Array<[string, string, string, () => void]>)
      : [])
  ];
  const coming = [
    'Sugerir a sessão completa a partir dos objetivos da semana e das tendências',
    'Resumo semanal automático da equipa',
    'Propor objetivos individuais a partir das avaliações'
  ];

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3">
      <div
        role="dialog"
        aria-label="Assistente"
        className="ui-card w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ui-text">🤖 Assistente do treinador</h3>
          <button type="button" onClick={onClose} aria-label="Fechar assistente" className="text-ui-muted text-lg">
            ✕
          </button>
        </div>
        {/* Questions answered from the team's own data */}
        <AssistantCard state={state} />
        <section aria-label="Ferramentas do assistente" className="ui-card divide-y divide-ui-line overflow-hidden">
          {tools.map(([icon, title, detail, run]) => (
            <button
              key={title}
              type="button"
              onClick={run}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-ui-surface-2"
            >
              <span className="text-lg">{icon}</span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm text-ui-text">{title}</b>
                <span className="text-[11px] text-ui-muted">{detail}</span>
              </span>
              <span className="text-ui-muted">›</span>
            </button>
          ))}
        </section>
        <section aria-label="Em preparação" className="ui-inset space-y-1 p-3">
          <div className="ui-kicker">Em preparação (ainda não disponível)</div>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-ui-muted">
            {coming.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default AssistantHubModal;
