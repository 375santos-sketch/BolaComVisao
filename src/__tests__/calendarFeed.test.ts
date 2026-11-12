import { describe, it, expect } from 'vitest';
import {
  buildCalendarEvents,
  buildICS,
  buildStaffEvents,
  feedFromRestDocument,
  newCalendarToken,
  reminderPlanFromQuery,
  reminderQuery
} from '../lib/calendarFeed';
import { ClubEvent, Match, ScheduledMatch, StaffUnavailability, Training } from '../types';

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
    expect(plan).toEqual({ treino: [1440, 120], jogo: [2880, 180], evento: [1440, 120] });
    expect(reminderQuery(plan)).toBe('alertas=1&treino=1440,120&jogo=2880,180&evento=1440,120');
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
    const none = buildICS(feed, { reminders: { treino: [60], jogo: [], evento: [] } });
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

  it('calendário do treinador: reuniões (um por dia) e indisponibilidades (dia inteiro, sem lembretes)', () => {
    const staff = buildStaffEvents(
      [
        {
          id: 'r1',
          title: 'Reunião de pais',
          type: 'reuniao',
          date: '2026-11-20',
          time: '19:30',
          endTime: '20:30',
          location: 'Sede',
          createdAt: ''
        },
        { id: 'e1', title: 'Estágio', type: 'estagio', date: '2026-12-27', endDate: '2026-12-29', createdAt: '' },
        { id: 'old', title: 'Antiga', type: 'outro', date: '2026-01-01', createdAt: '' }
      ] as ClubEvent[],
      [{ id: 'u1', name: 'Mister Rui', date: '2026-11-22', reason: 'Férias', createdAt: '' }] as StaffUnavailability[],
      '2026-11-01'
    );
    expect(staff.map((e) => [e.kind, e.date, e.time, e.title])).toEqual([
      ['evento', '2026-11-20', '19:30', '👥 Reunião de pais'],
      ['evento', '2026-12-27', undefined, '🏕️ Estágio'],
      ['evento', '2026-12-28', undefined, '🏕️ Estágio'],
      ['evento', '2026-12-29', undefined, '🏕️ Estágio'],
      ['indisponivel', '2026-11-22', undefined, '🚫 Mister Rui (indisponível)']
    ]);
    expect(staff[0].durationMinutes).toBe(60);
    const ics = buildICS(
      { teamName: 'Dragões', events: staff, updatedAt: 0 },
      { reminders: reminderPlanFromQuery({ alertas: '1', evento: '1440' }) }
    );
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(5);
    expect(ics.split('TRIGGER:-P1D').length - 1).toBe(1); // the meeting with a time
    expect(ics.split('TRIGGER:-PT15H').length - 1).toBe(3); // the camp's days, not the unavailability
    // The server reads the new kinds back
    const back = feedFromRestDocument({
      fields: {
        events: {
          arrayValue: {
            values: staff.map((e) => ({
              mapValue: {
                fields: {
                  uid: { stringValue: e.uid },
                  kind: { stringValue: e.kind },
                  date: { stringValue: e.date },
                  title: { stringValue: e.title }
                }
              }
            }))
          }
        }
      }
    });
    expect(back!.events.map((e) => e.kind)).toEqual(['evento', 'evento', 'evento', 'evento', 'indisponivel']);
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
