import React, { useState } from 'react';
import { CalendarEvent } from './types';
import { WEEKDAY_SHORT_PT } from './constants';
import { agendaSections } from './services/agendaSections';
import { calculateMatchScore } from '../../../lib/utils';

interface ScheduleListProps {
  filteredEvents: CalendarEvent[];
  todayStr: string;
  renderEventCard: (ev: CalendarEvent) => React.ReactNode;
}

const BAR: Record<CalendarEvent['category'], string> = {
  match: 'bg-cyan-500',
  training: 'bg-amber-400',
  club_event: 'bg-violet-400',
  staff_unavailability: 'bg-slate-500'
};

const TAG = {
  ok: 'bg-emerald-500/15 text-emerald-300',
  warn: 'bg-amber-500/15 text-amber-300',
  bad: 'bg-rose-500/15 text-rose-300',
  muted: 'bg-slate-500/15 text-slate-300'
};

function rowText(ev: CalendarEvent, today: string): { title: string; details: string[]; tag?: [string, string] } {
  const days = (new Date(`${ev.date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000;
  if (ev.category === 'match') {
    const s = ev.rawScheduledMatch;
    const m = ev.rawFinishedMatch;
    const opponent = s?.opponent || m?.opponent || ev.title;
    const place = (s?.location || m?.location) === 'fora' ? 'Fora' : 'Casa';
    const details = [ev.time, place, ev.tournamentName || ev.phase || ''].filter(Boolean);
    if (m) {
      const { scored, conceded } = calculateMatchScore(m);
      const result = scored > conceded ? 'V' : scored === conceded ? 'E' : 'D';
      return {
        title: `vs ${opponent}`,
        details,
        tag: [`${result} ${scored}-${conceded}`, result === 'V' ? TAG.ok : result === 'E' ? TAG.warn : TAG.bad]
      };
    }
    const called = ev.callupCount || 0;
    const tag: [string, string] | undefined =
      called > 0 ? [`✓ ${called} convocados`, TAG.ok] : days <= 7 ? ['Convocar', TAG.warn] : undefined;
    return { title: `vs ${opponent}`, details, tag };
  }
  if (ev.category === 'training') {
    const tag: [string, string] | undefined =
      ev.date === today ? ['Hoje', TAG.ok] : ev.isCompleted ? ['Feito', TAG.muted] : undefined;
    return { title: ev.title, details: [ev.time, ev.location || ''].filter(Boolean), tag };
  }
  if (ev.category === 'club_event') {
    return { title: ev.title, details: [ev.time, ev.location || ''].filter(Boolean) };
  }
  return { title: ev.title, details: [ev.notes || ''].filter(Boolean) };
}

/** Agenda → Lista: compact rows grouped by week and month; tapping a row opens its actions. */
export const ScheduleList: React.FC<ScheduleListProps> = ({ filteredEvents, todayStr, renderEventCard }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const { upcoming, past } = agendaSections(filteredEvents, todayStr);

  const row = (ev: CalendarEvent) => {
    const { title, details, tag } = rowText(ev, todayStr);
    const open = openId === ev.id;
    const weekday = WEEKDAY_SHORT_PT[(new Date(`${ev.date}T12:00:00`).getDay() + 6) % 7];
    return (
      <li key={ev.id}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpenId(open ? null : ev.id)}
          className={`ui-card w-full p-2.5 flex items-center gap-3 text-left transition-colors ${open ? 'border-cyan-500/60' : ''}`}
        >
          <span className={`w-1 self-stretch rounded-full ${BAR[ev.category]}`} aria-hidden="true" />
          <span className="ui-inset w-11 shrink-0 py-1 text-center rounded-xl">
            <span className="block text-base font-bold leading-tight text-white">{ev.date.slice(8, 10)}</span>
            <span className="block text-[10px] font-semibold uppercase text-slate-400">{weekday}</span>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 truncate">{title}</span>
            {details.length > 0 && <span className="block text-xs text-slate-400 truncate">{details.join(' · ')}</span>}
          </span>
          {tag && <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${tag[1]}`}>{tag[0]}</span>}
        </button>
        {open && <div className="mt-2">{renderEventCard(ev)}</div>}
      </li>
    );
  };

  if (filteredEvents.length === 0) {
    return (
      <div className="ui-card p-8 text-center text-xs text-slate-400">
        Ainda não há nada na Agenda. Carregue em ＋ para marcar um jogo ou um treino.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming.length === 0 && (
        <div className="ui-card p-5 text-center text-xs text-slate-400">Não há nada marcado a partir de hoje.</div>
      )}
      {upcoming.map((section) => (
        <section key={section.key} aria-label={section.label}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{section.label}</h3>
          <ul className="space-y-2">{section.events.map(row)}</ul>
        </section>
      ))}
      {past.length > 0 && (
        <section aria-label="Anteriores">
          <button
            type="button"
            onClick={() => setShowPast(!showPast)}
            className="ui-btn ui-btn-ghost w-full py-2 text-xs"
            aria-expanded={showPast}
          >
            {showPast ? 'Esconder os anteriores' : `Ver os ${past.length} anteriores`}
          </button>
          {showPast && <ul className="mt-2 space-y-2">{past.map(row)}</ul>}
        </section>
      )}
    </div>
  );
};
