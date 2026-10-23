import { ScheduledMatch, Training } from '../types';

/**
 * Shareable calendar for the parents (Agenda → "Calendário para os pais"): the team's games and trainings as an
 * iCalendar feed that phones subscribe to and refresh on their own. Only what the parents need to show up — date,
 * time, opponent, place — never athletes' names, call-ups or contacts. The feed is published to a document whose id
 * is a secret token (public_calendars/{token}) and served by the app's server at /cal/{token}.ics.
 */

export interface CalendarEvent {
  /** Stable id (the game's or training's id), so phones update events instead of duplicating them. */
  uid: string;
  kind: 'jogo' | 'treino';
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (no time = all-day event)
  durationMinutes: number;
  title: string;
  location?: string;
  description?: string;
}

export interface CalendarFeed {
  teamName: string;
  events: CalendarEvent[];
  updatedAt: number;
}

const TYPE_LABEL: Record<string, string> = { campeonato: 'Campeonato', torneio: 'Torneio', amigavel: 'Amigável' };
const validDate = (d?: string) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const validTime = (t?: string) => (typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t.trim()) ? t.trim() : undefined);

/** Events of the team from `from` (YYYY-MM-DD) on: scheduled games and trainings, oldest first. */
export function buildCalendarEvents(
  teamName: string,
  schedule: ScheduledMatch[],
  trainings: Training[],
  from: string
): CalendarEvent[] {
  const games: CalendarEvent[] = (schedule || [])
    .filter((g) => g && validDate(g.date) && g.date >= from)
    .map((g) => {
      const home = g.location !== 'fora';
      const competition =
        g.type === 'torneio' ? g.tournamentName || TYPE_LABEL.torneio : TYPE_LABEL[g.type] || TYPE_LABEL.amigavel;
      const extra = [competition, g.phase].filter(Boolean).join(' · ');
      return {
        uid: `jogo-${g.id}`,
        kind: 'jogo' as const,
        date: g.date,
        time: validTime(g.time),
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
    });
  const sessions: CalendarEvent[] = (trainings || [])
    .filter((t) => t && validDate(t.date) && t.date >= from)
    .map((t) => ({
      uid: `treino-${t.id}`,
      kind: 'treino' as const,
      date: t.date,
      time: validTime(t.time),
      durationMinutes: t.durationMinutes || 90,
      title: `🏃 Treino${t.trainingNumber ? ` Nº ${t.trainingNumber}` : ''} · ${teamName}`,
      location: t.location?.trim() || undefined
    }));
  return [...games, ...sessions].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')
  );
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

/** The feed as an .ics file (subscribed to by Google Calendar, iPhone, Outlook). */
export function buildICS(feed: CalendarFeed): string {
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

function fromRest(v: RestValue | undefined): unknown {
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
      kind: e.kind === 'treino' ? ('treino' as const) : ('jogo' as const),
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
