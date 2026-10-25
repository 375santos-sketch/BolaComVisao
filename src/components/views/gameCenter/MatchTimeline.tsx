import React from 'react';
import { Match, GoalEvent, CardEvent, SubEvent, Player } from '../../../types';
import { parseMinuteToNumber } from '../../../lib/gameAnalysisUtils';
import { playerLabel } from '../../../lib/utils';

interface MatchTimelineProps {
  match: Match;
  onEditGoal?: (goal: GoalEvent) => void;
  onEditCard?: (card: CardEvent) => void;
  onEditSub?: (sub: SubEvent) => void;
  durationMinutes?: number;
  /** Squad used to show names instead of the stored player ids. */
  players?: Player[];
}

interface TimelineItem {
  id: string;
  minute: number;
  kind: 'goal_scored' | 'goal_conceded' | 'card' | 'sub' | 'corner' | 'foul';
  title: string;
  subtitle?: string;
  icon: string;
  badgeColor: string;
  rawGoal?: GoalEvent;
  rawCard?: CardEvent;
  rawSub?: SubEvent;
}

export const MatchTimeline: React.FC<MatchTimelineProps> = ({
  match,
  onEditGoal,
  onEditCard,
  onEditSub,
  durationMinutes = 60,
  players = []
}) => {
  const items: TimelineItem[] = [];
  const nameOf = (id?: string | null) => {
    const p = id ? players.find((x) => x.id === id) : undefined;
    return p ? playerLabel(p) : id || undefined;
  };
  const canEdit = Boolean(onEditGoal || onEditCard || onEditSub);

  // Goals
  (match.goals || []).forEach((g, idx) => {
    const isScored = g.type === 'scored';
    const scorerName = g.scorer || nameOf(g.scorerId) || 'Nossa Equipa';
    const assistName = g.assist || nameOf(g.assistId);
    items.push({
      id: g.id || `goal_${g.minute}_${idx}`,
      minute: parseMinuteToNumber(g.minute) ?? 1,
      kind: isScored ? 'goal_scored' : 'goal_conceded',
      title: isScored ? `Golo (${scorerName})` : `Golo Sofrido (${match.opponent || 'Adversário'})`,
      subtitle: isScored
        ? `${g.goalType || 'Bola Jogada'}${assistName ? ` • Assist: ${assistName}` : ''}`
        : g.goalType || 'Golo Sofrido',
      icon: isScored ? '⚽' : '🔴',
      badgeColor: isScored
        ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
        : 'border-rose-500 bg-rose-950/60 text-rose-300',
      rawGoal: g
    });
  });

  // Cards
  (match.cards || []).forEach((c, idx) => {
    const isRed = c.color === 'Vermelho' || c.type === 'red';
    const playerName = c.player || nameOf(c.playerId) || 'Jogador';
    items.push({
      id: c.id || `card_${c.minute}_${idx}`,
      minute: parseMinuteToNumber(c.minute) ?? 1,
      kind: 'card',
      title: `${isRed ? 'Cartão Vermelho' : 'Cartão Amarelo'} (${playerName})`,
      subtitle: c.reason || 'Disciplina',
      icon: isRed ? '🟥' : '🟨',
      badgeColor: isRed
        ? 'border-rose-600 bg-rose-950/60 text-rose-300'
        : 'border-amber-500 bg-amber-950/60 text-amber-300',
      rawCard: c
    });
  });

  // Subs
  (match.subs || []).forEach((s, idx) => {
    const pOut = s.playerOut || nameOf(s.outId) || 'Jogador';
    const pIn = s.playerIn || nameOf(s.inId) || 'Jogador';
    items.push({
      id: s.id || `sub_${s.minute}_${idx}`,
      minute: parseMinuteToNumber(s.minute) ?? (s.isHalftime ? 45 : 1),
      kind: 'sub',
      title: `Substituição`,
      subtitle: `Sai: ${pOut} ➔ Entra: ${pIn}`,
      icon: '🔄',
      badgeColor: 'border-purple-500 bg-purple-950/60 text-purple-300',
      rawSub: s
    });
  });

  // Sort chronological
  items.sort((a, b) => a.minute - b.minute);

  if (items.length === 0) {
    return (
      <div className="ui-inset p-6 text-center text-xs font-mono text-slate-500">
        Nenhum evento registado na cronologia do jogo.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
        <span>00' Apito Inicial</span>
        <span className="text-cyan-400 font-bold">{items.length} Acontecimentos Registados</span>
        <span>{durationMinutes}' Fim de Jogo</span>
      </div>

      <div className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              if (item.rawGoal && onEditGoal) onEditGoal(item.rawGoal);
              else if (item.rawCard && onEditCard) onEditCard(item.rawCard);
              else if (item.rawSub && onEditSub) onEditSub(item.rawSub);
            }}
            className={`relative p-3 rounded-2xl border ${item.badgeColor} ${canEdit ? 'hover:scale-[1.01] transition-transform cursor-pointer' : ''} flex items-center justify-between gap-3 shadow-lg`}
          >
            {/* Timeline dot */}
            <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-[8px]" />

            <div className="flex items-center gap-3 min-w-0">
              <span className="text-base shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black">{item.minute}'</span>
                  <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">{item.title}</span>
                </div>
                {item.subtitle && <p className="text-[11px] text-slate-300 truncate mt-0.5">{item.subtitle}</p>}
              </div>
            </div>

            {canEdit && <span className="text-[10px] font-mono text-slate-400 shrink-0">Editar ➔</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
