import React, { useState } from 'react';
import { AggregatedAnalysis } from '../../../lib/gameAnalysis';
import { Player } from '../../../types';

interface EventDrilldownProps {
  analysis: AggregatedAnalysis;
  players?: Player[];
  onOpenMatch?: (matchId: string) => void;
}

type DrilldownEvent = AggregatedAnalysis['allEvents'][number];

export const EventDrilldown: React.FC<EventDrilldownProps> = ({ analysis, players = [], onOpenMatch }) => {
  const { allEvents, eventTypeLabel } = analysis;
  const [selectedEvent, setSelectedEvent] = useState<DrilldownEvent | null>(null);

  const getPlayerName = (id?: string | null) => {
    if (!id) return null;
    return players.find((p) => p.id === id)?.name || null;
  };

  const getEventBadge = (ev: DrilldownEvent) => {
    switch (ev.kind) {
      case 'golo_marcado':
        return {
          icon: '⚽',
          label: ev.goalType ? `Golo (${ev.goalType})` : 'Golo Marcado',
          color: 'bg-ui-success/20 text-ui-success border-ui-success/30'
        };
      case 'golo_sofrido':
        return {
          icon: '🥅',
          label: ev.goalType ? `Golo Sofrido (${ev.goalType})` : 'Golo Sofrido',
          color: 'bg-ui-danger/20 text-ui-danger border-ui-danger/30'
        };
      case 'canto':
        return {
          icon: '🚩',
          label: 'Canto',
          color: 'bg-ui-brand/20 text-ui-brand border-ui-brand/30'
        };
      case 'falta':
        return {
          icon: '⚠️',
          label: 'Falta',
          color: 'bg-ui-warning/20 text-ui-warning border-ui-warning/30'
        };
      case 'cartao':
        return {
          icon: ev.cardColor === 'Vermelho' ? '🟥' : '🟨',
          label: ev.cardColor === 'Vermelho' ? 'Cartão Vermelho' : 'Cartão Amarelo',
          color:
            ev.cardColor === 'Vermelho'
              ? 'bg-ui-danger/20 text-ui-danger border-ui-danger/30'
              : 'bg-ui-warning/20 text-ui-warning border-ui-warning/30'
        };
      case 'sub':
        return {
          icon: '🔄',
          label: 'Substituição',
          color: 'bg-ui-brand/20 text-ui-brand border-ui-brand/30'
        };
      default:
        return {
          icon: '📋',
          label: 'Lance',
          color: 'bg-ui-surface-3/50 text-ui-text border-ui-line-strong/30'
        };
    }
  };

  return (
    <div className="ui-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-ui-line">
        <div>
          <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
            <span>📋</span>
            <span>Registo Cronológico de Acontecimentos</span>
          </h3>
          <p className="text-xs text-ui-muted mt-0.5">
            Filtro ativo: <strong className="text-ui-brand">{eventTypeLabel}</strong> ({allEvents.length} lances)
          </p>
        </div>
      </div>

      {allEvents.length === 0 ? (
        <div className="text-center py-8 text-xs text-ui-muted">
          Nenhum acontecimento correspondente aos filtros selecionados.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {allEvents.map((ev) => {
            const badge = getEventBadge(ev);
            const primaryName = getPlayerName(ev.playerPrimaryId) || ev.detail;
            const secondaryName = getPlayerName(ev.playerSecondaryId);

            return (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className="ui-inset p-3.5 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {/* Minute Pill */}
                  <div className="ui-card text-ui-brand font-mono font-black text-xs px-2.5 py-1.5 text-center min-w-[50px]">
                    {ev.minute ? `${ev.minute}'` : '—'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                        {badge.icon} {badge.label}
                      </span>
                      <span className="text-[10px] text-ui-muted font-mono">
                        {ev.period || (ev.half ? `${ev.half}.ª Parte` : '')}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-ui-text group-hover:text-ui-brand transition-colors">
                      {primaryName ? (
                        <span>
                          {primaryName}
                          {secondaryName && ev.kind === 'golo_marcado' && (
                            <span className="text-ui-muted font-normal"> (Assist: {secondaryName})</span>
                          )}
                          {secondaryName && ev.kind === 'sub' && (
                            <span className="text-ui-muted font-normal">
                              {' '}
                              (Sai: {primaryName} ➔ Entra: {secondaryName})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>{ev.notes || badge.label}</span>
                      )}
                    </div>

                    <div className="text-[10px] text-ui-muted mt-0.5">
                      vs {ev.match.opponent} • {ev.match.location === 'casa' ? '🏠 Casa' : '✈️ Fora'} • {ev.match.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ev.notes && (
                    <span className="text-[10px] bg-ui-surface-2 text-ui-text px-2 py-0.5 rounded max-w-[120px] truncate hidden md:inline-block">
                      📝 {ev.notes}
                    </span>
                  )}
                  <span className="text-ui-muted text-xs">›</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drilldown Modal (Item 1 & 12) */}
      {selectedEvent && (
        <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="ui-card p-5 w-full max-w-md animate-scaleUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-ui-line">
              <div className="text-base font-['Chakra_Petch'] font-bold text-ui-text flex items-center gap-2">
                <span>{getEventBadge(selectedEvent).icon}</span>
                <span>Detalhe do Acontecimento</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-ui-muted hover:text-ui-text text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-ui-text">
              <div className="ui-inset p-3.5">
                <span className="text-[10px] text-ui-muted uppercase font-bold block mb-1">Tipo de Lance</span>
                <div className="text-sm font-bold text-ui-text flex items-center gap-2">
                  <span>{getEventBadge(selectedEvent).label}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="ui-inset p-3">
                  <span className="text-[10px] text-ui-muted uppercase font-bold block mb-1">⏱️ Minuto</span>
                  <span className="text-sm font-mono font-bold text-ui-brand">
                    {selectedEvent.minute ? `${selectedEvent.minute}'` : 'N/D'} (Abs: {selectedEvent.absoluteMinute}')
                  </span>
                </div>

                <div className="ui-inset p-3">
                  <span className="text-[10px] text-ui-muted uppercase font-bold block mb-1">Período</span>
                  <span className="text-sm font-bold text-ui-text">
                    {selectedEvent.period || `${selectedEvent.half}.ª Parte`}
                  </span>
                </div>
              </div>

              {getPlayerName(selectedEvent.playerPrimaryId) && (
                <div className="ui-inset p-3">
                  <span className="text-[10px] text-ui-muted uppercase font-bold block mb-1">👤 Jogador Principal</span>
                  <span className="text-sm font-bold text-ui-text">{getPlayerName(selectedEvent.playerPrimaryId)}</span>
                </div>
              )}

              {getPlayerName(selectedEvent.playerSecondaryId) && (
                <div className="ui-inset p-3">
                  <span className="text-[10px] text-ui-muted uppercase font-bold block mb-1">
                    👟 Secundário / Assistência / Entrada
                  </span>
                  <span className="text-sm font-bold text-ui-brand">
                    {getPlayerName(selectedEvent.playerSecondaryId)}
                  </span>
                </div>
              )}

              {selectedEvent.notes && (
                <div className="ui-inset p-3">
                  <span className="text-[10px] text-ui-muted uppercase font-bold block mb-1">📝 Observações</span>
                  <span className="text-xs text-ui-text">{selectedEvent.notes}</span>
                </div>
              )}

              <div className="ui-inset p-3">
                <span className="text-[10px] text-ui-muted uppercase font-bold block mb-1">🏟️ Contexto do Jogo</span>
                <div className="text-xs font-bold text-ui-text">
                  vs {selectedEvent.match.opponent} ({selectedEvent.match.location === 'casa' ? 'Casa' : 'Fora'})
                </div>
                <div className="text-[10px] text-ui-muted">{selectedEvent.match.date}</div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="ui-btn ui-btn-secondary flex-1 py-2.5 text-xs"
              >
                Fechar
              </button>
              {onOpenMatch && (
                <button
                  type="button"
                  onClick={() => {
                    const mId = selectedEvent.match.id;
                    setSelectedEvent(null);
                    onOpenMatch(mId);
                  }}
                  className="ui-btn ui-btn-primary flex-1 py-2.5 text-xs"
                >
                  Abrir Jogo Completo ➔
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
