import { describe, it, expect } from 'vitest';
import {
  buildCalendarEvents,
  buildICS,
  feedFromRestDocument,
  newCalendarToken,
  reminderPlanFromQuery,
  reminderQuery
} from '../lib/calendarFeed';
import { Match, ScheduledMatch, Training } from '../types';

const schedule = [
  {
    id: 'j1',
    opponent: 'Abrantes',
    date: '2026-11-07',
    time: '10:30',
    type: 'campeonato',
    phase: 'Jornada 5',
    location: 'fora',
    venue: 'Campo Municipal de Abrantes',
    callup: ['p1', 'p2'],
    meetingTime: '09:45'
  },
  { id: 'j0', opponent: 'Antigo', date: '2026-09-01', time: '10:00', type: 'amigavel', location: 'casa', callup: [] },
  {
    id: 'j2',
    opponent: 'Torres Novas',
    date: '2026-11-14',
    time: '',
    type: 'torneio',
    tournamentName: 'Torneio de Natal',
    location: 'casa',
    callup: []
  }
] as unknown as ScheduledMatch[];
const trainings = [
  {
    id: 't1',
    trainingNumber: 12,
    date: '2026-11-04',
    time: '18:15',
    durationMinutes: 75,
    notes: 'nota do treinador',
    absences: ['p1'],
    location: 'Sintético'
  }
] as unknown as Training[];

describe('Calendário para os pais', () => {
  const events = buildCalendarEvents('Dragões', schedule, trainings, '2026-10-01');

  it('games and trainings from the given day on, oldest first, with home team first', () => {
    expect(events.map((e) => e.title)).toEqual([
      '🏃 Treino Nº 12 · Dragões',
      '⚽ Abrantes vs Dragões (Campeonato · Jornada 5)',
      '⚽ Dragões vs Torres Novas (Torneio de Natal)'
    ]);
    expect(events[1]).toMatchObject({ uid: 'jogo-j1', time: '10:30', location: 'Campo Municipal de Abrantes' });
    expect(events[1].description).toContain('Concentração: 09:45');
  });

  it('never carries athletes, call-ups, absences or coach notes', () => {
    const all = JSON.stringify(events);
    expect(all).not.toContain('p1');
    expect(all).not.toContain('nota do treinador');
  });

  it('builds a valid iCalendar feed (Lisbon time, all-day games without time, folded lines)', () => {
    const ics = buildICS({ teamName: 'Dragões Sub-11', events, updatedAt: Date.UTC(2026, 9, 23, 10) });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('X-WR-CALNAME:Dragões Sub-11 · jogos e treinos');
    expect(ics).toContain('DTSTART;TZID=Europe/Lisbon:20261107T103000');
    expect(ics).toContain('DTEND;TZID=Europe/Lisbon:20261107T120000');
    expect(ics).toContain('DTSTART;TZID=Europe/Lisbon:20261104T181500');
    expect(ics).toContain('DTEND;TZID=Europe/Lisbon:20261104T193000');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261114');
    expect(ics).toContain('DTEND;VALUE=DATE:20261115');
    expect(ics).toContain('UID:jogo-j1@bolacomvisao');
    expect(ics).toContain('LOCATION:Campo Municipal de Abrantes');
    expect(ics).toContain('DESCRIPTION:Concentração: 09:45\\nJogo fora');
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('lembretes só no link do treinador (?alertas=1), nos tempos escolhidos para treinos e jogos', () => {
    const feed = { teamName: 'Dragões Sub-11', events, updatedAt: Date.UTC(2026, 9, 23, 10) };
    expect(reminderPlanFromQuery({})).toBeNull();
    expect(buildICS(feed, { reminders: reminderPlanFromQuery({}) })).not.toContain('BEGIN:VALARM');
    const count = (ics: string, what: string) => ics.split(what).length - 1;
    const timed = (kind: string) => events.filter((e) => e.kind === kind && e.time).length;
    const untimed = events.filter((e) => !e.time).length;

    // Only ?alertas=1: 24 h and 2 h before; without a time, 9:00 of the day before
    const plain = buildICS(feed, { reminders: reminderPlanFromQuery({ alertas: '1' }) });
    expect(count(plain, 'TRIGGER:-P1D')).toBe(timed('jogo') + timed('treino'));
    expect(count(plain, 'TRIGGER:-PT2H')).toBe(timed('jogo') + timed('treino'));
    expect(count(plain, 'TRIGGER:-PT15H')).toBe(untimed);
    expect(untimed).toBeGreaterThan(0);

    // Chosen per kind: trainings 24 h and 2 h, games 2 days and 3 h; unknown values are ignored
    const plan = reminderPlanFromQuery({ alertas: '1', treino: '1440,120', jogo: '2880,180,999' })!;
    expect(plan).toEqual({ treino: [1440, 120], jogo: [2880, 180] });
    expect(reminderQuery(plan)).toBe('alertas=1&treino=1440,120&jogo=2880,180');
    const ics = buildICS(feed, { reminders: plan });
    expect(count(ics, 'TRIGGER:-P2D')).toBe(timed('jogo'));
    expect(count(ics, 'TRIGGER:-PT3H')).toBe(timed('jogo'));
    expect(count(ics, 'TRIGGER:-P1D')).toBe(timed('treino'));
    expect(count(ics, 'TRIGGER:-PT30M')).toBe(0);
    ics
      .split('BEGIN:VEVENT')
      .slice(1)
      .forEach((ev) => expect(ev.lastIndexOf('END:VALARM')).toBeLessThan(ev.indexOf('END:VEVENT')));

    // No reminders chosen for games: the games stay, without alarms
    const none = buildICS(feed, { reminders: { treino: [60], jogo: [] } });
    expect(count(none, 'TRIGGER:-PT1H')).toBe(timed('treino'));
    expect(count(none, 'BEGIN:VEVENT')).toBe(events.length);
  });

  it('jogos com data e hora noutro formato e jogos já começados ou jogados também aparecem (uma vez)', () => {
    const odd = buildCalendarEvents(
      'Dragões',
      [
        { ...schedule[0], id: 'a', date: '2026-11-21T00:00:00.000Z', time: '10h30' },
        { ...schedule[0], id: 'b', date: '2026-11-28', time: '' }
      ] as unknown as ScheduledMatch[],
      [],
      '2026-11-01',
      [
        { id: 'm1', opponent: 'Mação', date: '2026-11-14', type: 'campeonato', location: 'casa', finished: true },
        {
          id: 'm2',
          opponent: 'Abrantes',
          date: '2026-11-28',
          type: 'campeonato',
          location: 'fora',
          finished: false,
          originalSchedule: { id: 'b', time: '11:00' }
        },
        { id: 'm3', opponent: 'Velho', date: '2026-09-01', type: 'amigavel', location: 'casa', finished: true }
      ] as unknown as Match[]
    );
    expect(odd.map((e) => [e.uid, e.date, e.time])).toEqual([
      ['jogo-m1', '2026-11-14', undefined],
      ['jogo-a', '2026-11-21', '10:30'],
      ['jogo-b', '2026-11-28', undefined]
    ]);
  });

  it('reads the published document as the server receives it (Firestore REST)', () => {
    const rest = {
      fields: {
        teamName: { stringValue: 'Dragões Sub-11' },
        updatedAt: { integerValue: '1761213600000' },
        events: {
          arrayValue: {
            values: [
              {
                mapValue: {
                  fields: {
                    uid: { stringValue: 'jogo-j1' },
                    kind: { stringValue: 'jogo' },
                    date: { stringValue: '2026-11-07' },
                    time: { stringValue: '10:30' },
                    durationMinutes: { integerValue: '90' },
                    title: { stringValue: '⚽ Abrantes vs Dragões' }
                  }
                }
              },
              { mapValue: { fields: { uid: { stringValue: 'x' }, date: { stringValue: 'lixo' } } } }
            ]
          }
        }
      }
    };
    const feed = feedFromRestDocument(rest)!;
    expect(feed.teamName).toBe('Dragões Sub-11');
    expect(feed.events).toEqual([expect.objectContaining({ uid: 'jogo-j1', time: '10:30', durationMinutes: 90 })]);
    expect(feedFromRestDocument({ fields: {} })).toBeNull();
  });

  it('secret tokens are long and random', () => {
    const a = newCalendarToken();
    expect(a).toMatch(/^[a-zA-Z0-9]{24}$/);
    expect(newCalendarToken()).not.toBe(a);
  });
});
