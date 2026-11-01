import { AppState } from '../types';
import { teamSettings } from './teamSettings';

/**
 * 🗂️ Agenda de todas as minhas equipas: games and trainings of every team of the coach in one list, with the clashes
 * (two events of different teams less than 2 hours apart on the same day) pointed out.
 */

interface AgendaItem {
  id: string;
  teamId: string;
  team: string; // "Sub-11"
  kind: 'jogo' | 'treino';
  title: string; // "Jogo vs Abrantes", "Treino"
  date: string; // YYYY-MM-DD
  time?: string;
  clash?: string; // the other team's name when two events clash
}

const minutes = (time?: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(time || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Events from `from` for `days` days, by date and time. */
export function allTeamsAgenda(
  state: Pick<AppState, 'teams' | 'activeTeamId' | 'schedule' | 'trainings'>,
  from: string,
  days = 14
): AgendaItem[] {
  const until = new Date(`${from}T12:00:00`);
  until.setDate(until.getDate() + days);
  const last = until.toISOString().slice(0, 10);
  const items: AgendaItem[] = [];
  (state.teams || []).filter(Boolean).forEach((t) => {
    const active = t.id === state.activeTeamId;
    const name =
      [t.category, t.clubName && (state.teams || []).some((o) => o.clubName !== t.clubName) ? t.clubName : '']
        .filter(Boolean)
        .join(' · ') || t.clubName;
    (active ? state.schedule : t.schedule || []).forEach((g) => {
      if (g && g.date >= from && g.date <= last)
        items.push({
          id: g.id,
          teamId: t.id,
          team: name,
          kind: 'jogo',
          title: `Jogo vs ${g.opponent}`,
          date: g.date.slice(0, 10),
          time: g.time
        });
    });
    (active ? state.trainings : t.trainings || []).forEach((tr) => {
      const day = (tr?.date || '').slice(0, 10);
      if (tr && day >= from && day <= last)
        items.push({
          id: tr.id,
          teamId: t.id,
          team: name,
          kind: 'treino',
          title: 'Treino',
          date: day,
          time:
            tr.time ||
            teamSettings({ teams: [t], activeTeamId: t.id }).trainingTimes[String(new Date(`${day}T12:00:00`).getDay())]
        });
    });
  });
  items.sort((a, b) => `${a.date}${a.time || '99'}`.localeCompare(`${b.date}${b.time || '99'}`));
  items.forEach((a) =>
    items.forEach((b) => {
      if (a === b || a.teamId === b.teamId || a.date !== b.date) return;
      const ma = minutes(a.time);
      const mb = minutes(b.time);
      if (ma !== null && mb !== null && Math.abs(ma - mb) < 120 && !a.clash) a.clash = b.team;
    })
  );
  return items;
}
