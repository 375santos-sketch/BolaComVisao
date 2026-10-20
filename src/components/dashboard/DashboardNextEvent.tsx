import React from 'react';
import { ScheduledMatch, Training } from '../../types';
import { TabType } from '../Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface UnifiedEvent {
  id: string;
  kind: 'jogo' | 'treino' | 'club_event';
  title: string;
  opponent?: string;
  date: string;
  time: string;
  venue?: string;
  location?: string;
  tournamentName?: string;
  meetingTime?: string;
  theme?: string;
  durationMinutes?: number;
  attendees?: string;
  clubEventType?: 'reuniao' | 'formacao' | 'estagio' | 'outro';
  notes?: string;
  rawDate: Date;
  isToday: boolean;
  isTomorrow: boolean;
  daysUntil: number;
}

interface DashboardNextEventProps {
  nextEvent: UnifiedEvent | null;
  unifiedEvents: UnifiedEvent[];
  activeMatch?: any;
  onNavigate: (tab: TabType, targetId?: string) => void;
}

export const DashboardNextEvent: React.FC<DashboardNextEventProps> = ({
  nextEvent,
  unifiedEvents: _unifiedEvents,
  activeMatch,
  onNavigate
}) => {
  const visuals = nextEvent ? getEventVisuals(nextEvent) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Active Live Match Banner (if in progress) */}
      {activeMatch && (
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border border-cyan-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-cyan-500/10">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-xl">
                ⚽
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="cyan"
                  size="sm"
                  className="font-mono uppercase font-black tracking-wider text-[10px] animate-pulse"
                >
                  Jogo em Direto
                </Badge>
                <span className="text-xs text-slate-400 font-mono">
                  {activeMatch.location === 'casa' ? 'Casa' : 'Fora'} • {activeMatch.date}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">vs {activeMatch.opponent || 'Adversário'}</h3>
            </div>
          </div>

          <Button
            variant="cyan"
            size="md"
            onClick={() => onNavigate('jogo')}
            className="self-stretch sm:self-auto font-mono text-xs font-bold flex items-center justify-center gap-2"
          >
            <span>▶️</span> Abrir Mesa de Jogo
          </Button>
        </div>
      )}

      {/* Main Spotlight Card */}
      <Card className="bg-slate-900/90 border-slate-800 p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📅</span>
            <h2 className="text-base font-bold text-white font-sans uppercase tracking-tight">
              {nextEvent?.isToday ? 'Compromisso de Hoje' : 'Próximo Compromisso'}
            </h2>
          </div>

          {nextEvent && visuals && (
            <Badge
              variant={nextEvent.isToday ? 'amber' : visuals.badgeVariant}
              size="sm"
              className="font-mono uppercase font-black text-[10px]"
            >
              {nextEvent.isToday
                ? 'HOJE 🚨'
                : nextEvent.isTomorrow
                  ? 'AMANHÃ'
                  : nextEvent.daysUntil > 0
                    ? `EM ${nextEvent.daysUntil} DIAS`
                    : 'AGENDADO'}
            </Badge>
          )}
        </div>

        {nextEvent && visuals ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center shrink-0 shadow-lg ${visuals.boxStyle}`}
              >
                <span className="text-xl">{visuals.icon}</span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider mt-0.5">
                  {visuals.label}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{nextEvent.title}</h3>

                <div className="flex items-center gap-3 text-xs text-slate-300 font-mono mt-1.5 flex-wrap">
                  <span className="text-cyan-300 font-semibold">🕒 {nextEvent.time}</span>
                  <span>•</span>
                  <span>
                    📍 {nextEvent.venue || (nextEvent.kind === 'jogo' ? (nextEvent.location === 'casa' ? 'Campo Principal (Casa)' : 'Campo Fora') : 'Sede / Instalações do Clube')}
                  </span>
                  {nextEvent.meetingTime && (
                    <>
                      <span>•</span>
                      <span className="text-amber-300">Concentração: {nextEvent.meetingTime}</span>
                    </>
                  )}
                  {nextEvent.attendees && (
                    <>
                      <span>•</span>
                      <span className="text-purple-300">👥 {nextEvent.attendees}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {nextEvent.kind === 'jogo' ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('convocatoria')}
                    className="flex-1 sm:flex-none border border-slate-700 hover:border-slate-600 text-xs font-mono"
                  >
                    Convocatória
                  </Button>
                  <Button
                    variant="cyan"
                    size="sm"
                    onClick={() => onNavigate('prejogo')}
                    className="flex-1 sm:flex-none text-xs font-mono font-bold"
                  >
                    Plano de Jogo →
                  </Button>
                </>
              ) : nextEvent.kind === 'treino' ? (
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => onNavigate('treinos')}
                  className="w-full sm:w-auto text-xs font-mono font-bold"
                >
                  Registar Presenças →
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('calendario', nextEvent.id)}
                  className="w-full sm:w-auto text-xs font-mono font-bold border-purple-500/50 text-purple-300 hover:bg-purple-950/80 hover:border-purple-400"
                >
                  Ver na Agenda →
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-sm font-mono flex flex-col items-center justify-center gap-2">
            <span className="text-3xl opacity-40">🏖️</span>
            <span>Sem jogos, treinos ou reuniões/formações agendados para breve.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('calendario')}
              className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
            >
              + Adicionar ao Calendário
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

function getEventVisuals(event: UnifiedEvent) {
  if (event.kind === 'jogo') {
    return {
      icon: '⚽',
      label: 'Jogo',
      boxStyle: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400',
      badgeVariant: 'cyan' as const
    };
  }
  if (event.kind === 'treino') {
    return {
      icon: '🏃‍♂️',
      label: 'Treino',
      boxStyle: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
      badgeVariant: 'emerald' as const
    };
  }
  // Reunião / Formação / Estágio / Outro
  switch (event.clubEventType) {
    case 'formacao':
      return {
        icon: '🎓',
        label: 'Formação',
        boxStyle: 'bg-purple-500/10 border-purple-500/40 text-purple-300',
        badgeVariant: 'purple' as const
      };
    case 'reuniao':
      return {
        icon: '🗣️',
        label: 'Reunião',
        boxStyle: 'bg-purple-500/10 border-purple-500/40 text-purple-300',
        badgeVariant: 'purple' as const
      };
    case 'estagio':
      return {
        icon: '⛺',
        label: 'Estágio',
        boxStyle: 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300',
        badgeVariant: 'indigo' as const
      };
    default:
      return {
        icon: '👥',
        label: 'Evento',
        boxStyle: 'bg-purple-500/10 border-purple-500/40 text-purple-300',
        badgeVariant: 'purple' as const
      };
  }
}
