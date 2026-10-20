import React from 'react';
import { UnifiedEvent } from './DashboardNextEvent';
import { TabType } from '../Navbar';
import { Match, ScheduledMatch } from '../../types';

interface TodayFocusCardProps {
  unifiedEvents?: UnifiedEvent[];
  activeMatch?: Match | null;
  scheduledMatches?: ScheduledMatch[];
  onNavigate: (tab: TabType, targetId?: string) => void;
}

export const TodayFocusCard: React.FC<TodayFocusCardProps> = ({
  unifiedEvents = [],
  activeMatch,
  scheduledMatches = [],
  onNavigate
}) => {
  const safeEvents = Array.isArray(unifiedEvents) ? unifiedEvents : [];
  const now = new Date();
  const day = now.getDate();
  const monthName = now.toLocaleDateString('pt-PT', { month: 'long' }).toUpperCase();
  const weekdayName = now.toLocaleDateString('pt-PT', { weekday: 'long' });

  // Find events occurring today
  const todayEvents = safeEvents.filter((e) => e && e.isToday);
  const todayMatch = todayEvents.find((e) => e && e.kind === 'jogo');
  const todayTraining = todayEvents.find((e) => e && e.kind === 'treino');
  const todayClubEvent = todayEvents.find((e) => e && e.kind === 'club_event');

  // Next upcoming event if nothing today
  const nextUpcoming = safeEvents.find((e) => e && !e.isToday);

  // If there's an active live match currently happening
  if (activeMatch) {
    return (
      <div
        id="today-focus-live-active-card"
        className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950/80 border-2 border-rose-500 shadow-2xl shadow-rose-950/50 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-pulse"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center text-3xl shrink-0">
            🔴
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/40">
                Jogo em Curso
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {activeMatch.date} • {activeMatch.originalSchedule?.time || '15:00'}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Chakra_Petch'] mt-1">
              vs {activeMatch.opponent || 'Adversário'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {activeMatch.location || 'Campo de Jogo'} •{' '}
              {activeMatch.originalSchedule?.callup?.length || activeMatch.lineup?.length || 0} jogadores convocados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('jogo')}
            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold font-['Chakra_Petch'] uppercase tracking-wider text-sm transition-all shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2"
          >
            <span>Entrar no Modo Jogo</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    );
  }

  // 1. MATCH TODAY
  if (todayMatch) {
    const fullMatchData = scheduledMatches.find((m) => m.id === todayMatch.id);
    const convCount = fullMatchData?.callup?.length || 16;

    return (
      <div
        id="today-focus-match-card"
        className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-2 border-cyan-500/80 shadow-2xl shadow-cyan-950/40 flex flex-col md:flex-row md:items-center justify-between gap-5"
      >
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center text-3xl shrink-0 shadow-inner">
            ⚽
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/40">
                HOJE — {day} {monthName}
              </span>
              <span className="text-xs text-slate-400 capitalize">{weekdayName}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Chakra_Petch'] mt-1 flex items-center gap-2">
              <span>JOGO às {todayMatch.time}h</span>
              <span className="text-cyan-400 text-lg">vs {todayMatch.opponent}</span>
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-300 font-mono">
              <span>📍 {todayMatch.venue || todayMatch.location || 'Campo Municipal'}</span>
              <span>•</span>
              <span>📋 Convocatória: {convCount} jogadores</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('convocatoria')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs font-['Chakra_Petch'] uppercase tracking-wider transition-colors border border-slate-700"
          >
            📋 Ver Convocatória
          </button>
          <button
            onClick={() => onNavigate('jogo', todayMatch.id)}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-['Chakra_Petch'] uppercase tracking-wider text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
          >
            <span>Iniciar Modo Jogo</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. TRAINING TODAY
  if (todayTraining) {
    return (
      <div
        id="today-focus-training-card"
        className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-2 border-emerald-500/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5"
      >
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-3xl shrink-0">
            🏋️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                HOJE — {day} {monthName}
              </span>
              <span className="text-xs text-slate-400 capitalize">{weekdayName}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Chakra_Petch'] mt-1">
              TREINO às {todayTraining.time}h
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-300 font-mono">
              <span>📍 {todayTraining.venue || 'Campo de Treinos'}</span>
              <span>•</span>
              <span>🎯 Foco: {todayTraining.theme || todayTraining.title || 'Preparação Técnico-Tática'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('treinos')}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-['Chakra_Petch'] uppercase tracking-wider text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <span>Abrir Plano de Treino</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. CLUB EVENT TODAY (Reunião / Formação / Estágio)
  if (todayClubEvent) {
    return (
      <div
        id="today-focus-event-card"
        className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950/90 via-slate-900 to-slate-900 border-2 border-purple-500/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5"
      >
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-3xl shrink-0">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-purple-400 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/40">
                HOJE — {day} {monthName}
              </span>
              <span className="text-xs text-slate-400 capitalize">{weekdayName}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Chakra_Petch'] mt-1">
              {todayClubEvent.title} às {todayClubEvent.time}h
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-300 font-mono">
              <span>📍 {todayClubEvent.venue || 'Sede do Clube'}</span>
              {todayClubEvent.attendees && <span>• 👥 {todayClubEvent.attendees}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('calendario')}
            className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold font-['Chakra_Petch'] uppercase tracking-wider text-xs shadow-lg shadow-purple-500/20 transition-all"
          >
            Ver Detalhes
          </button>
        </div>
      </div>
    );
  }

  // 4. NO EVENT TODAY -> Clean friendly focus card with next upcoming commitment
  return (
    <div
      id="today-focus-empty-card"
      className="p-5 sm:p-6 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
          ☕
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
              HOJE — {day} {monthName}
            </span>
            <span className="text-xs text-slate-400 capitalize">{weekdayName}</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] mt-1">
            Hoje não existem compromissos oficiais agendados.
          </h3>
          {nextUpcoming && (
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Próximo:{' '}
              <span className="text-cyan-400 font-bold">{nextUpcoming.kind === 'jogo' ? '⚽ Jogo' : '🏋️ Treino'}</span>{' '}
              {nextUpcoming.isTomorrow ? 'amanhã' : `a ${new Date(nextUpcoming.date).toLocaleDateString('pt-PT')}`} às{' '}
              {nextUpcoming.time}h {nextUpcoming.opponent ? `(vs ${nextUpcoming.opponent})` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => onNavigate('jogo')}
          className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold font-['Chakra_Petch'] uppercase tracking-wider text-xs transition-colors"
        >
          🔴 Abrir Modo Jogo
        </button>
        <button
          onClick={() => onNavigate('calendario')}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-['Chakra_Petch'] uppercase tracking-wider text-xs transition-colors border border-slate-700"
        >
          📅 Calendário
        </button>
      </div>
    </div>
  );
};
