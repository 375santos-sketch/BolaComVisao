import { ClubEvent, Match, ScheduledMatch, StaffUnavailability, Training } from '../types';

/**
 * Shareable calendar for the parents (Agenda → "Calendário para os pais"): the team's games and trainings as an
 * iCalendar feed that phones subscribe to and refresh on their own. Only what the parents need to show up — date,
 * time, opponent, place — never athletes' names, call-ups or contacts. The feed is published to a document whose id
 * is a secret token (public_calendars/{token}) and served by the app's server at /cal/{token}.ics.
 */

export interface CalendarEvent {
  /** Stable id (the game's or training's id), so phones update events instead of duplicating them. */
  uid: string;
  /** evento = meeting, course, camp (coaches' calendar only); indisponivel = a staff member away (idem). */
  kind: 'jogo' | 'treino' | 'evento' | 'indisponivel';
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (no time = all-day event)
  durationMinutes: number;
  title: string;
  location?: string;
  description?: string;
}

interface CalendarFeed {
  teamName: string;
  events: CalendarEvent[];
  updatedAt: number;
}

const TYPE_LABEL: Record<string, string> = { campeonato: 'Campeonato', torneio: 'Torneio', amigavel: 'Amigável' };
const validDate = (d?: string) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const validTime = (t?: string) => (typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t.trim()) ? t.trim() : undefined);
/** The day of a saved date, also when it carries a time ("2026-11-15T10:30…"). */
const dayOf = (d?: string) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : undefined);
/** "10:30", "10h30", "10H" → "10:30" / "10:00". */
const timeOf = (t?: string) => {
  const m = typeof t === 'string' ? /^\s*(\d{1,2})\s*[:hH.]\s*(\d{2})?\s*$/.exec(t) : null;
  return m && Number(m[1]) < 24 ? `${m[1].padStart(2, '0')}:${m[2] || '00'}` : undefined;
};

type GameLike = Pick<ScheduledMatch, 'opponent' | 'type' | 'tournamentName' | 'phase' | 'location'> &
  Partial<Pick<ScheduledMatch, 'venue' | 'meetingTime' | 'meetingPoint'>>;

function gameEvent(teamName: string, id: string, date: string, time: string | undefined, g: GameLike): CalendarEvent {
  const home = g.location !== 'fora';
  const competition =
    g.type === 'torneio' ? g.tournamentName || TYPE_LABEL.torneio : TYPE_LABEL[g.type] || TYPE_LABEL.amigavel;
  const extra = [competition, g.phase].filter(Boolean).join(' · ');
  return {
    uid: `jogo-${id}`,
    kind: 'jogo',
    date,
    time,
    durationMinutes: 90,
    title: `⚽ ${home ? `${teamName} vs ${g.opponent}` : `${g.opponent} vs ${teamName}`}${extra ? ` (${extra})` : ''}`,
    location: g.venue?.trim() || (home ? 'Em casa' : 'Fora'),
    description: [
      g.meetingTime ? `Concentração: ${g.meetingTime}${g.meetingPoint ? ` · ${g.meetingPoint}` : ''}` : '',
      home ? 'Jogo em casa' : 'Jogo fora'
    ]
      .filter(Boolean)
      .join('\n')
  };
}

/**
 * Events of the team from `from` (YYYY-MM-DD) on, oldest first: the games of the Agenda (scheduled, and those already
 * started or played, once each) and the trainings.
 */
export function buildCalendarEvents(
  teamName: string,
  schedule: ScheduledMatch[],
  trainings: Training[],
  from: string,
  matches: Match[] = []
): CalendarEvent[] {
  const games: CalendarEvent[] = [];
  const seen = new Set<string>();
  (schedule || []).forEach((g) => {
    const date = g && dayOf(g.date);
    if (!date || date < from || !g.id) return;
    seen.add(g.id);
    games.push(gameEvent(teamName, g.id, date, timeOf(g.time) || timeOf(g.date.slice(11, 16)), g));
  });
  // A game that was started from the Agenda keeps the Agenda's id (the phone updates the same event)
  (matches || []).forEach((m) => {
    const date = m && dayOf(m.date);
    const id = m?.originalSchedule?.id || m?.id;
    if (!date || date < from || !id || seen.has(id)) return;
    seen.add(id);
    games.push(gameEvent(teamName, id, date, timeOf(m.originalSchedule?.time), { ...m.originalSchedule, ...m }));
  });
  const sessions: CalendarEvent[] = (trainings || []).flatMap((t) => {
    const date = t && dayOf(t.date);
    if (!date || date < from) return [];
    return [
      {
        uid: `treino-${t.id}`,
        kind: 'treino' as const,
        date,
        time: timeOf(t.time),
        durationMinutes: t.durationMinutes || 90,
        title: `🏃 Treino${t.trainingNumber ? ` Nº ${t.trainingNumber}` : ''} · ${teamName}`,
        location: t.location?.trim() || undefined
      }
    ];
  });
  return [...games, ...sessions].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')
  );
}

const EVENT_ICON: Record<string, string> = { reuniao: '👥', formacao: '🎓', estagio: '🏕️', outro: '📌' };

/** Days from `date` to `end` (both included, at most a year), as YYYY-MM-DD. */
function daysBetween(date: string, end?: string): string[] {
  const out: string[] = [];
  const last = end && end > date ? end : date;
  const t = new Date(`${date}T12:00:00Z`);
  while (out.length < 366) {
    const day = t.toISOString().slice(0, 10);
    if (day > last) break;
    out.push(day);
    t.setUTCDate(t.getUTCDate() + 1);
  }
  return out;
}

/**
 * The coaches' own calendar adds what is in the Agenda besides games and trainings: meetings, courses and camps
 * (one event per day of a multi-day one) and the staff's unavailabilities (all day). Never in the parents' calendar.
 */
export function buildStaffEvents(
  clubEvents: ClubEvent[],
  unavailability: StaffUnavailability[],
  from: string
): CalendarEvent[] {
  const meetings = (clubEvents || []).flatMap((ev) => {
    const start = ev && dayOf(ev.date);
    if (!start) return [];
    const time = timeOf(ev.time);
    const end = timeOf(ev.endTime);
    const minutes =
      time && end
        ? Number(end.slice(0, 2)) * 60 + Number(end.slice(3)) - (Number(time.slice(0, 2)) * 60 + Number(time.slice(3)))
        : 0;
    return daysBetween(start, dayOf(ev.endDate))
      .filter((d) => d >= from)
      .map((d) => ({
        uid: `evento-${ev.id}-${d}`,
        kind: 'evento' as const,
        date: d,
        time,
        durationMinutes: minutes > 0 ? minutes : 60,
        title: `${EVENT_ICON[ev.type] || '📌'} ${ev.title}`,
        location: ev.location?.trim() || undefined,
        description: ev.attendees ? `Com: ${ev.attendees}` : undefined
      }));
  });
  const away = (unavailability || []).flatMap((u) => {
    const start = u && dayOf(u.date);
    if (!start) return [];
    return daysBetween(start, dayOf(u.endDate))
      .filter((d) => d >= from)
      .map((d) => ({
        uid: `indisponivel-${u.id}-${d}`,
        kind: 'indisponivel' as const,
        date: d,
        durationMinutes: 0,
        title: `🚫 ${u.name} (indisponível)`,
        description: u.reason || undefined
      }));
  });
  return [...meetings, ...away];
}

// ---------- iCalendar (RFC 5545) ----------

const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets are folded (continuation lines start with a space). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const compactDate = (d: string) => d.replace(/-/g, '');
const pad = (n: number) => String(n).padStart(2, '0');

function localDateTime(date: string, time: string, plusMinutes = 0): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm + plusMinutes));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
}

const stamp = (ms: number) => {
  const t = new Date(ms);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())}Z`;
};

// Portugal (Lisboa): WET in winter, WEST in summer
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Lisbon',
  'BEGIN:STANDARD',
  'DTSTART:19701025T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0000',
  'TZNAME:WET',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T010000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'TZOFFSETFROM:+0000',
  'TZOFFSETTO:+0100',
  'TZNAME:WEST',
  'END:DAYLIGHT',
  'END:VTIMEZONE'
];

/** When the reminders can ring, in minutes before the start (the coach picks some for trainings and for games). */
export const REMINDER_CHOICES: Array<{ minutes: number; label: string }> = [
  { minutes: 2880, label: '2 dias' },
  { minutes: 1440, label: '24 h' },
  { minutes: 720, label: '12 h' },
  { minutes: 180, label: '3 h' },
  { minutes: 120, label: '2 h' },
  { minutes: 60, label: '1 h' },
  { minutes: 30, label: '30 min' }
];

export interface ReminderPlan {
  treino: number[];
  jogo: number[];
  /** Meetings, courses and camps (coaches' calendar). */
  evento: number[];
}

export const DEFAULT_REMINDERS: ReminderPlan = { treino: [1440, 120], jogo: [1440, 120], evento: [1440, 120] };

const allowed = new Set(REMINDER_CHOICES.map((c) => c.minutes));
const cleanList = (v: unknown): number[] =>
  Array.from(
    new Set(
      String(v ?? '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((n) => allowed.has(n))
    )
  ).sort((x, y) => y - x);

/**
 * The reminders asked for in the coach's link: ?alertas=1&treino=1440,120&jogo=2880,180 (only the choices above).
 * Without ?alertas=1 there are none (the parents' link); with it and nothing else, 24 h and 2 h before.
 */
export function reminderPlanFromQuery(query: Record<string, unknown>): ReminderPlan | null {
  if (query.alertas !== '1') return null;
  return {
    treino: query.treino === undefined ? DEFAULT_REMINDERS.treino : cleanList(query.treino),
    jogo: query.jogo === undefined ? DEFAULT_REMINDERS.jogo : cleanList(query.jogo),
    evento: query.evento === undefined ? DEFAULT_REMINDERS.evento : cleanList(query.evento)
  };
}

/** The query of the coach's link for a plan (the inverse of reminderPlanFromQuery). */
export const reminderQuery = (plan: ReminderPlan) =>
  `alertas=1&treino=${cleanList(plan.treino.join(',')).join(',')}&jogo=${cleanList(plan.jogo.join(',')).join(',')}` +
  `&evento=${cleanList((plan.evento || []).join(',')).join(',')}`;

const trigger = (minutes: number) =>
  minutes % 1440 === 0 ? `-P${minutes / 1440}D` : minutes % 60 === 0 ? `-PT${minutes / 60}H` : `-PT${minutes}M`;

/**
 * The alarms of one event. Events without a time (all day): one reminder at 9:00 of the day before, when that kind
 * has any.
 */
const reminders = (e: CalendarEvent, plan: ReminderPlan): string[] => {
  const alarm = (t: string) => [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(e.title)}`,
    `TRIGGER:${t}`,
    'END:VALARM'
  ];
  const list = e.kind === 'indisponivel' ? [] : plan[e.kind] || [];
  if (!list.length) return [];
  return e.time ? list.flatMap((m) => alarm(trigger(m))) : alarm('-PT15H');
};

/** The feed as an .ics file (subscribed to by Google Calendar, iPhone, Outlook). */
export function buildICS(feed: CalendarFeed, options: { reminders?: ReminderPlan | null } = {}): string {
  const name = `${feed.teamName} · jogos e treinos`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BolaComVisao//Calendario//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    'X-WR-TIMEZONE:Europe/Lisbon',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...VTIMEZONE
  ];
  feed.events.forEach((e) => {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@bolacomvisao`, `DTSTAMP:${stamp(feed.updatedAt)}`);
    if (e.time) {
      lines.push(
        `DTSTART;TZID=Europe/Lisbon:${localDateTime(e.date, e.time)}`,
        `DTEND;TZID=Europe/Lisbon:${localDateTime(e.date, e.time, e.durationMinutes)}`
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (options.reminders) lines.push(...reminders(e, options.reminders));
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Secret part of the link (24 random characters). */
export function newCalendarToken(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// ---------- Reading the published document (Firestore REST, used by the server) ----------

type RestValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  mapValue?: { fields?: Record<string, RestValue> };
  arrayValue?: { values?: RestValue[] };
};

export function fromRest(v: RestValue | undefined): unknown {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.mapValue) {
    return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromRest(x)]));
  }
  if (v.arrayValue) return (v.arrayValue.values || []).map(fromRest);
  return null;
}

/** The feed stored in public_calendars/{token}, from the Firestore REST response (null if it is not a calendar). */
export function feedFromRestDocument(
  doc: { fields?: Record<string, RestValue> } | null | undefined
): CalendarFeed | null {
  const data = fromRest({ mapValue: { fields: doc?.fields } }) as Record<string, unknown> | null;
  if (!data || !Array.isArray(data.events)) return null;
  const events = (data.events as Record<string, unknown>[])
    .filter((e) => e && typeof e.uid === 'string' && validDate(e.date as string) && typeof e.title === 'string')
    .map((e) => ({
      uid: String(e.uid),
      kind: (['treino', 'evento', 'indisponivel'] as const).find((k) => k === e.kind) || ('jogo' as const),
      date: String(e.date),
      time: validTime(e.time as string),
      durationMinutes: Math.min(600, Math.max(15, Number(e.durationMinutes) || 90)),
      title: String(e.title),
      location: typeof e.location === 'string' ? e.location : undefined,
      description: typeof e.description === 'string' ? e.description : undefined
    }));
  return {
    teamName: typeof data.teamName === 'string' && data.teamName ? data.teamName : 'Equipa',
    events,
    updatedAt: Number(data.updatedAt) || Date.now()
  };
}
