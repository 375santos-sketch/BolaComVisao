import React from 'react';
import { SmartAlert, SmartPriority, AlertCategory } from '../../types';

interface SmartAlertCardProps {
  alert: SmartAlert;
  onAction?: (alert: SmartAlert) => void;
  onDismiss?: (id: string) => void;
}

const PRIORITY_STYLES: Record<
  SmartPriority,
  { bg: string; border: string; text: string; badgeBg: string; badgeText: string; icon: string; label: string }
> = {
  critico: {
    bg: 'bg-red-950/70',
    border: 'border-red-500/60',
    text: 'text-red-300',
    badgeBg: 'bg-red-500 text-slate-950',
    badgeText: 'CRÍTICO',
    icon: '🚨',
    label: 'Crítico'
  },
  importante: {
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
    badgeBg: 'bg-amber-500 text-slate-950',
    badgeText: 'IMPORTANTE',
    icon: '⚠️',
    label: 'Importante'
  },
  atencao: {
    bg: 'bg-yellow-950/40',
    border: 'border-yellow-500/40',
    text: 'text-yellow-300',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
    badgeText: 'ATENÇÃO',
    icon: '⚡',
    label: 'Atenção'
  },
  informativo: {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-500/30',
    text: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    badgeText: 'INFORMATIVO',
    icon: 'ℹ️',
    label: 'Informativo'
  },
  normal: {
    bg: 'bg-slate-900/60',
    border: 'border-slate-800',
    text: 'text-slate-300',
    badgeBg: 'bg-slate-800 text-slate-400',
    badgeText: 'NORMAL',
    icon: '📋',
    label: 'Normal'
  }
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  jogadores: 'Jogadores',
  treinos: 'Treinos',
  jogos: 'Jogos',
  assiduidade: 'Assiduidade',
  convocatoria: 'Convocatória',
  performance: 'Performance',
  administracao: 'Administração',
  aniversarios: 'Aniversários',
  dados: 'Qualidade de Dados'
};

export const SmartAlertCard: React.FC<SmartAlertCardProps> = ({ alert, onAction, onDismiss }) => {
  const style = PRIORITY_STYLES[alert.priority] || PRIORITY_STYLES.atencao;

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border ${style.border} ${style.bg} backdrop-blur-md transition-all shadow-sm flex flex-col justify-between gap-3 text-left`}
    >
      <div>
        {/* Header Strip: Priority Badge + Category + Dismiss */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-['Chakra_Petch'] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${style.badgeBg}`}
            >
              <span>{style.icon}</span>
              <span>{style.badgeText}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {CATEGORY_LABELS[alert.category] || alert.category}
            </span>
          </div>

          {onDismiss && (
            <button
              onClick={() => onDismiss(alert.id)}
              className="text-slate-500 hover:text-white text-xs p-1 transition-colors"
              title="Dispensar alerta"
            >
              ✖
            </button>
          )}
        </div>

        {/* Title */}
        <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-1.5">{alert.title}</h4>

        {/* Message */}
        <p className="text-xs text-slate-300 font-mono mt-1 leading-relaxed">{alert.message}</p>

        {/* Explainability / Reason Rationale */}
        {alert.reason && (
          <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] font-mono text-slate-400 flex items-start gap-1.5">
            <span className="text-cyan-400 font-bold shrink-0">Origem dos dados:</span>
            <span className="text-slate-300">{alert.reason}</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      {alert.actionLabel && onAction && (
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={() => onAction(alert)}
            className={`px-3.5 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${
              alert.priority === 'critico'
                ? 'bg-red-500 hover:bg-red-400 text-slate-950'
                : alert.priority === 'importante'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
          >
            <span>{alert.actionLabel}</span>
            <span>➔</span>
          </button>
        </div>
      )}
    </div>
  );
};
