import { AppState, Match, Player, ScheduledMatch, Training } from '../types';
import { fromRest } from './calendarFeed';
import { liveScore } from './liveFollow';
import { addDaysISO } from './trainingQuick';

/**
 * 📰 Resumo da semana para os pais (Mais → Comunicação): weeks run from Monday to Sunday and the summary goes out on
 * Monday morning. The app puts it together on its own (the results and the attendance of the week that has just
 * ended, and the games and trainings of the week that starts); the coach writes a short note, the highlights and
 * the notices, checks it and publishes it. One secret link per team
 * (public_newsletters/{token}, shown by the server at /semana/{token}) always shows the latest one.
 * Only what every parent of the team may see: the scorers' first names (as in the game link), never surnames,
 * contacts, birth dates, absences of a given athlete, ratings or the coach's notes.
 */

export interface NewsletterResult {
  date: string; // YYYY-MM-DD
  opponent: string;
  /** true = em casa, false = fora, null = não indicado */
  home: boolean | null;
  ours: number;
  theirs: number;
  competition: string;
  /** "Tomás (2), Leonor, Rafael" */
  scorers: string;
}

export interface NewsletterEvent {
  kind: 'jogo' | 'treino';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or ''
  title: string;
  /** Games: "Concentração 09:15 · Portão norte" */
  meeting: string;
  place: string;
}

export interface NewsletterIssue {
  /** The week that has ended (Monday to Sunday): results and attendance. */
  from: string;
  to: string;
  /** The week that starts (Monday to Sunday): next games and trainings. */
  nextFrom: string;
  nextTo: string;
  intro: string;
  highlights: string[];
  notices: string;
  results: NewsletterResult[];
  /** Trainings held in the week and the share of athletes present (null = no training held). */
  attendance: { trainings: number; percent: number } | null;
  upcoming: NewsletterEvent[];
  publishedAt: number;
}

/** What the coach writes; everything else comes from the app. */
export interface NewsletterDraft {
  intro: string;
  highlights: string;
  notices: string;
}

export const LIMITS = { intro: 800, highlight: 200, highlights: 6, notices: 600, results: 10, upcoming: 12 };

const TYPE_LABEL: Record<string, string> = { campeonato: 'Campeonato', torneio: 'Torneio', amigavel: 'Amigável' };
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const dayOf = (d?: string) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : '');
const timeOf = (t?: string) => {
  const m = typeof t === 'string' ? /^\s*(\d{1,2})\s*[:hH.]\s*(\d{2})?\s*$/.exec(t) : null;
  return m && Number(m[1]) < 24 ? `${m[1].padStart(2, '0')}:${m[2] || '00'}` : '';
};
const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

const firstName = (roster: Player[], id: string | null | undefined, fallback?: string | null) => {
  if (id === 'autogolo') return '';
  const p = id ? roster.find((r) => r && r.id === id) : undefined;
  const name = p ? p.nickname?.trim() || p.name.trim().split(/\s+/)[0] : (fallback || '').trim().split(/\s+/)[0];
  return (name || '').slice(0, 40);
};

/** "Tomás (2), Leonor, Rafael": most goals first, then by name. */
export function scorersOf(match: Match, roster: Player[]): string {
  const count = new Map<string, number>();
  for (const g of match.goals || []) {
    if (g.type !== 'scored') continue;
    const name = firstName(roster, g.scorerId, g.scorer);
    if (name) count.set(name, (count.get(name) || 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'))
    .map(([name, n]) => (n > 1 ? `${name} (${n})` : name))
    .join(', ');
}

const competitionOf = (m: { type?: string; tournamentName?: string; competitionPhase?: string }) =>
  m.type === 'torneio' ? m.tournamentName || TYPE_LABEL.torneio : TYPE_LABEL[m.type || ''] || '';

function resultOf(match: Match, roster: Player[]): NewsletterResult {
  const counted = liveScore(match);
  const score = match.finalScore && (match.goals || []).length === 0 ? match.finalScore : null;
  return {
    date: dayOf(match.date),
    opponent: clip(match.opponent, 80) || 'Adversário',
    home: match.location === 'casa' ? true : match.location === 'fora' ? false : null,
    ours: score ? score.scored : counted.ours,
    theirs: score ? score.conceded : counted.theirs,
    competition: [competitionOf(match), clip(match.competitionPhase, 60)].filter(Boolean).join(' · '),
    scorers: scorersOf(match, roster)
  };
}

/** Athletes expected at a training: the active ones, and those made inactive only after that day. */
const expectedAt = (roster: Player[], date: string) =>
  roster.filter((p) => p && p.active !== false && !(p.inactiveSince && p.inactiveSince <= date));

/** Share of athletes present in the trainings held between `from` and `to` (both included). */
export function attendanceOf(
  trainings: Training[],
  roster: Player[],
  from: string,
  to: string
): NewsletterIssue['attendance'] {
  let expected = 0;
  let present = 0;
  let held = 0;
  for (const t of trainings || []) {
    const day = dayOf(t?.date);
    if (!day || day < from || day > to || t.completed === false) continue;
    const squad = expectedAt(roster, day);
    if (!squad.length) continue;
    const absent = new Set(t.absences || []);
    held++;
    expected += squad.length;
    present += squad.filter((p) => !absent.has(p.id)).length;
  }
  return held ? { trainings: held, percent: Math.round((present / expected) * 100) } : null;
}

function gameEvent(s: ScheduledMatch, teamName: string): NewsletterEvent {
  const home = s.location !== 'fora';
  const meeting = timeOf(s.meetingTime);
  return {
    kind: 'jogo',
    date: dayOf(s.date),
    time: timeOf(s.time),
    title: `${home ? `${teamName} vs ${s.opponent}` : `${s.opponent} vs ${teamName}`}`.slice(0, 160),
    meeting: meeting ? `Concentração ${meeting}${s.meetingPoint?.trim() ? ` · ${clip(s.meetingPoint, 80)}` : ''}` : '',
    place: clip(s.venue, 120) || (s.location === 'fora' ? 'Fora' : s.location === 'casa' ? 'Em casa' : '')
  };
}

/**
 * The two weeks of the summary published on `today`: the last full week (Monday to Sunday) and the week of `today`.
 * Published on Monday 24/11: results of 17–23/11 and events of 24–30/11.
 */
export function newsletterWeeks(today: string): { from: string; to: string; nextFrom: string; nextTo: string } {
  const [y, m, d] = today.split('-').map(Number);
  const monday = addDaysISO(today, -((new Date(y, m - 1, d).getDay() + 6) % 7));
  return {
    from: addDaysISO(monday, -7),
    to: addDaysISO(monday, -1),
    nextFrom: monday,
    nextTo: addDaysISO(monday, 6)
  };
}

/** Monday from this hour on: the summary of the week that has ended is due. */
export const NEWSLETTER_HOUR = 7;

/**
 * The week whose summary is due and not yet published (its Monday, `from`), or null. Due from Monday at 7:00 until
 * the coach publishes it; `lastWeek` is the `from` of the last summary published for the team.
 */
export function newsletterDue(now: Date, lastWeek: string | undefined): string | null {
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (now.getDay() === 1 && now.getHours() < NEWSLETTER_HOUR) return null;
  const { from } = newsletterWeeks(today);
  return lastWeek && lastWeek >= from ? null : from;
}

/** Everything the app fills in: the week that has ended (results) and the week that starts (next events). */
export function newsletterOf(
  state: Pick<AppState, 'matches' | 'schedule' | 'trainings' | 'roster'>,
  teamName: string,
  today: string
): Omit<NewsletterIssue, 'intro' | 'highlights' | 'notices' | 'publishedAt'> {
  const { from, to, nextFrom, nextTo } = newsletterWeeks(today);
  const start = today > nextFrom ? today : nextFrom;
  const roster = state.roster || [];
  const played = (state.matches || []).filter((m) => m && m.finished && dayOf(m.date) >= from && dayOf(m.date) <= to);
  const results = played
    .sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)))
    .slice(-LIMITS.results)
    .map((m) => resultOf(m, roster));
  // A game of this week that is already over (published late) is not a next game
  const done = new Set(
    (state.matches || [])
      .filter((m) => m && m.finished)
      .map((m) => `${dayOf(m.date)}|${(m.opponent || '').trim().toLowerCase()}`)
  );
  const games = (state.schedule || [])
    .filter((s) => s && dayOf(s.date) >= start && dayOf(s.date) <= nextTo)
    .filter((s) => !done.has(`${dayOf(s.date)}|${(s.opponent || '').trim().toLowerCase()}`))
    .map((s) => gameEvent(s, teamName));
  const trainings = (state.trainings || [])
    .filter((t) => t && dayOf(t.date) >= start && dayOf(t.date) <= nextTo && t.completed === false)
    .map((t): NewsletterEvent => ({
      kind: 'treino',
      date: dayOf(t.date),
      time: timeOf(t.time),
      title: 'Treino',
      meeting: '',
      place: clip(t.location, 120)
    }));
  const upcoming = [...games, ...trainings]
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, LIMITS.upcoming);
  return {
    from,
    to,
    nextFrom,
    nextTo,
    results,
    attendance: attendanceOf(state.trainings || [], roster, from, to),
    upcoming
  };
}

/** A first version of the coach's note, from the week's results (the coach changes it before publishing). */
export function suggestedIntro(results: NewsletterResult[]): string {
  if (!results.length) return 'Olá a todos! Aqui fica o resumo da semana e o que temos pela frente.';
  const won = results.filter((r) => r.ours > r.theirs).length;
  const lost = results.filter((r) => r.ours < r.theirs).length;
  const mood =
    won && !lost
      ? 'Foi uma semana muito positiva.'
      : lost && !won
        ? 'O resultado não foi o que queríamos, mas o mais importante é aprender e continuar a evoluir.'
        : 'Foi uma semana de muito trabalho e aprendizagem.';
  return `Olá a todos! ${mood} Obrigado pelo apoio de sempre.`;
}

type AutoIssue = Omit<NewsletterIssue, 'intro' | 'highlights' | 'notices' | 'publishedAt'>;

const won = (m: Match) => {
  const { ours, theirs } =
    m.finalScore && !(m.goals || []).length
      ? { ours: m.finalScore.scored, theirs: m.finalScore.conceded }
      : liveScore(m);
  return ours > theirs ? 1 : ours < theirs ? -1 : 0;
};

/**
 * Highlights the app suggests from the data (the coach picks the ones to publish): a run of wins or of games without
 * losing, a first goal of the season, a clean sheet, many different scorers, a training with everyone present.
 * Only first names, as in the rest of the summary.
 */
export function suggestedHighlights(
  state: Pick<AppState, 'matches' | 'trainings' | 'roster'>,
  auto: Pick<AutoIssue, 'from' | 'to'>
): string[] {
  const roster = state.roster || [];
  const finished = (state.matches || [])
    .filter((m) => m && m.finished && dayOf(m.date))
    .sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)));
  const upTo = finished.filter((m) => dayOf(m.date) <= auto.to);
  const week = upTo.filter((m) => dayOf(m.date) >= auto.from);
  const out: string[] = [];
  if (week.length) {
    // The run that the last game of the week extends
    let wins = 0;
    let unbeaten = 0;
    for (let i = upTo.length - 1; i >= 0 && won(upTo[i]) === 1; i--) wins++;
    for (let i = upTo.length - 1; i >= 0 && won(upTo[i]) >= 0; i--) unbeaten++;
    if (wins >= 2) out.push(`${wins} vitórias seguidas`);
    else if (unbeaten >= 3) out.push(`${unbeaten} jogos seguidos sem perder`);
  }
  for (const m of week) {
    const season = m.season || '';
    const before = finished.filter(
      (x) => (x.season || '') === season && `${dayOf(x.date)}${x.id}` < `${dayOf(m.date)}${m.id}`
    );
    const scoredBefore = new Set(
      before.flatMap((x) => (x.goals || []).filter((g) => g.type === 'scored').map((g) => g.scorerId || g.scorer || ''))
    );
    const firsts = new Set<string>();
    for (const g of m.goals || []) {
      const key = g.scorerId || g.scorer || '';
      if (g.type !== 'scored' || !key || key === 'autogolo' || scoredBefore.has(key)) continue;
      const name = firstName(roster, g.scorerId, g.scorer);
      if (name) firsts.add(name);
    }
    for (const name of firsts) out.push(`Primeiro golo do ${name} nesta época`);
    const r = resultOf(m, roster);
    if (r.theirs === 0) out.push(`Baliza a zeros frente ao ${r.opponent}`);
    const scorers = r.scorers ? r.scorers.split(', ').length : 0;
    if (scorers >= 4) out.push(`${scorers} jogadores diferentes marcaram frente ao ${r.opponent}`);
  }
  for (const t of state.trainings || []) {
    const day = dayOf(t?.date);
    if (!day || day < auto.from || day > auto.to || t.completed === false) continue;
    const squad = expectedAt(roster, day);
    const absent = new Set(t.absences || []);
    if (squad.length && squad.every((p) => !absent.has(p.id))) {
      const [y, mo, d] = day.split('-').map(Number);
      const weekday = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][
        new Date(y, mo - 1, d).getDay()
      ];
      out.push(`100% de presenças no treino de ${weekday}`);
    }
  }
  return [...new Set(out)].map((h) => h.slice(0, LIMITS.highlight)).slice(0, 10);
}

/** What the AI gets to write the coach's note: only facts of the summary (first names, no private data). */
export function newsletterFacts(teamName: string, auto: AutoIssue, highlights: string) {
  return {
    equipa: teamName,
    semana: weekLabel(auto.from, auto.to),
    resultados: auto.results.map((r) => ({
      dia: shortDay(r.date),
      adversario: r.opponent,
      local: r.home === null ? '' : r.home ? 'casa' : 'fora',
      nos: r.ours,
      eles: r.theirs,
      competicao: r.competition,
      marcadores: r.scorers
    })),
    presencas: auto.attendance,
    destaques: (highlights || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, LIMITS.highlights),
    proximosJogos: auto.upcoming
      .filter((e) => e.kind === 'jogo')
      .map((e) => `${shortDay(e.date)}${e.time ? ` ${e.time}` : ''} · ${e.title}`)
  };
}

/** The prompt for the coach's note (Gemini, through /api/cronica with kind "resumo"). */
export function newsletterIntroPrompt(facts: unknown): string {
  return `Escreve em português de Portugal a mensagem de abertura do resumo semanal que o treinador de uma equipa de futebol de formação (crianças) envia aos pais.
Regras:
- Usa só os factos do JSON abaixo. Não inventes lances, nomes, minutos nem estatísticas.
- Tom próximo, positivo e educativo: valoriza o esforço e a atitude de toda a equipa, mais do que o resultado.
- Só nomeia jogadores que aparecem em "marcadores" ou "destaques" (primeiro nome). Sem críticas a jogadores, ao árbitro ou ao adversário.
- Se houver "proximosJogos", termina com uma frase a convidar os pais para o próximo jogo.
- Até 80 palavras, 1 ou 2 parágrafos curtos, no máximo 2 emojis. Texto simples, sem markdown, sem saudação final nem assinatura.
Factos: ${JSON.stringify(facts)}`;
}

/** The coach's text, cleaned and cut to the sizes the page and the rules accept. */
export function issueOf(
  auto: Omit<NewsletterIssue, 'intro' | 'highlights' | 'notices' | 'publishedAt'>,
  draft: NewsletterDraft,
  now = Date.now()
): NewsletterIssue {
  return {
    ...auto,
    intro: clip(draft.intro, LIMITS.intro),
    highlights: (draft.highlights || '')
      .split('\n')
      .map((l) => l.replace(/^\s*[-•*·]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, LIMITS.highlights)
      .map((l) => l.slice(0, LIMITS.highlight)),
    notices: clip(draft.notices, LIMITS.notices),
    publishedAt: now
  };
}

/** "17 a 23 nov" / "28 nov a 4 dez" */
export function weekLabel(from: string, to: string): string {
  const [, fm, fd] = from.split('-').map(Number);
  const [, tm, td] = to.split('-').map(Number);
  return fm === tm ? `${fd} a ${td} ${MONTHS[tm - 1]}` : `${fd} ${MONTHS[fm - 1]} a ${td} ${MONTHS[tm - 1]}`;
}

/** "Sáb 29/11" */
export function shortDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y) return date;
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

/** The WhatsApp message with the link: short, the page has the rest. */
export function newsletterMessage(teamName: string, issue: NewsletterIssue, link: string): string {
  const lines = [`📰 Resumo da semana · ${teamName}`, ''];
  for (const r of issue.results) {
    lines.push(
      `⚽ ${r.home === false ? `${r.opponent} ${r.theirs}–${r.ours} ${teamName}` : `${teamName} ${r.ours}–${r.theirs} ${r.opponent}`}`
    );
  }
  const next = issue.upcoming.find((e) => e.kind === 'jogo');
  if (next) lines.push(`📅 Próximo jogo: ${shortDay(next.date)}${next.time ? ` às ${next.time}` : ''} · ${next.title}`);
  if (lines.length > 2) lines.push('');
  lines.push(`Resumo completo: ${link}`);
  return lines.join('\n');
}

// ---------- The page the parents open (served by the app's server) ----------

interface NewsletterPage {
  teamName: string;
  issue: NewsletterIssue | null;
  /** Earlier weeks, most recent first (results, attendance, note and highlights only). */
  archive?: NewsletterIssue[];
}

/** How many earlier weeks the link keeps ("Semanas anteriores"). */
export const ARCHIVE_WEEKS = 8;

/** An earlier week as kept in the archive: what happened, without the events and notices of that time. */
const archived = (issue: NewsletterIssue): NewsletterIssue => ({ ...issue, upcoming: [], notices: '' });

/**
 * The archive after publishing `issue`: the summary that was on the link moves to the archive (unless it is the same
 * week published again), most recent first, at most ARCHIVE_WEEKS weeks.
 */
export function archiveAfter(
  previous: { issue?: NewsletterIssue | null; archive?: NewsletterIssue[] } | null,
  issue: NewsletterIssue
): NewsletterIssue[] {
  const all = [...(previous?.issue ? [previous.issue] : []), ...(previous?.archive || [])];
  const byWeek = new Map<string, NewsletterIssue>();
  for (const i of all) if (i && i.from && i.from !== issue.from && !byWeek.has(i.from)) byWeek.set(i.from, i);
  return [...byWeek.values()]
    .sort((a, b) => b.from.localeCompare(a.from))
    .slice(0, ARCHIVE_WEEKS)
    .map(archived);
}

const strings = (v: unknown, max: number, count: number) =>
  Array.isArray(v)
    ? v
        .filter((x) => typeof x === 'string')
        .slice(0, count)
        .map((x: string) => x.slice(0, max))
    : [];
const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** The published document read through Firestore's REST API (null when it is not a newsletter). */
export function newsletterFromRestDocument(
  doc: { fields?: Record<string, any> } | null | undefined
): NewsletterPage | null {
  const data = fromRest({ mapValue: { fields: doc?.fields } }) as Record<string, any> | null;
  if (!data || typeof data.teamName !== 'string') return null;
  const archive = (Array.isArray(data.archive) ? data.archive : [])
    .map(issueFromData)
    .filter((i: NewsletterIssue | null): i is NewsletterIssue => Boolean(i))
    .slice(0, ARCHIVE_WEEKS);
  return { teamName: clip(data.teamName, 200), issue: issueFromData(data.issue), archive };
}

/** One summary read back from the published document (null when it is not one). */
function issueFromData(value: unknown): NewsletterIssue | null {
  const i = value && typeof value === 'object' ? (value as Record<string, any>) : null;
  return i && isDay(i.from) && isDay(i.to)
    ? {
        from: i.from,
        to: i.to,
        // Summaries published before the Monday-to-Sunday weeks: the week after `to`
        nextFrom: isDay(i.nextFrom) ? i.nextFrom : addDaysISO(i.to, 1),
        nextTo: isDay(i.nextTo) ? i.nextTo : addDaysISO(i.to, 7),
        intro: clip(i.intro, LIMITS.intro),
        highlights: strings(i.highlights, LIMITS.highlight, LIMITS.highlights),
        notices: clip(i.notices, LIMITS.notices),
        results: (Array.isArray(i.results) ? i.results : [])
          .slice(0, LIMITS.results)
          .filter((r: any) => r && isDay(r.date))
          .map((r: any) => ({
            date: r.date,
            opponent: clip(r.opponent, 80) || 'Adversário',
            home: typeof r.home === 'boolean' ? r.home : null,
            ours: num(r.ours, 99),
            theirs: num(r.theirs, 99),
            competition: clip(r.competition, 120),
            scorers: clip(r.scorers, 300)
          })),
        attendance:
          i.attendance && typeof i.attendance === 'object' && Number(i.attendance.trainings) > 0
            ? { trainings: num(i.attendance.trainings, 31), percent: num(i.attendance.percent, 100) }
            : null,
        upcoming: (Array.isArray(i.upcoming) ? i.upcoming : [])
          .slice(0, LIMITS.upcoming)
          .filter((e: any) => e && isDay(e.date))
          .map((e: any) => ({
            kind: e.kind === 'jogo' ? 'jogo' : 'treino',
            date: e.date,
            time: /^\d{2}:\d{2}$/.test(e.time) ? e.time : '',
            title: clip(e.title, 160),
            meeting: clip(e.meeting, 120),
            place: clip(e.place, 120)
          })),
        publishedAt: Number(i.publishedAt) || 0
      }
    : null;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

/** The whole page, in the app's colours (dark, or light when the phone is in light mode). */
export function renderNewsletterPage({ teamName, issue, archive = [] }: NewsletterPage): string {
  const head = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Resumo da semana · ${esc(teamName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"><style>
:root{--bg:#0b1220;--surface:#111a2b;--inset:#0d1626;--line:#22324d;--text:#e7eef7;--muted:#8b9bb4;--brand:#22c3ee;--brand-soft:#0d2a3a;--warn:#f5b301;--warn-soft:#2e2610;--banner:#0d1626;color-scheme:dark}
@media (prefers-color-scheme:light){:root{--bg:#eef2f6;--surface:#fff;--inset:#f3f6f9;--line:#c5d0db;--text:#0b1620;--muted:#334155;--brand:#0284c7;--brand-soft:#e0f2fe;--warn:#b45309;--warn-soft:#fef3c7;--banner:#0b1220;color-scheme:light}}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--text);font-family:"Plus Jakarta Sans",-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:15px;line-height:1.55;padding:16px 16px 40px}
.w{max-width:640px;margin:0 auto;background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.hd{background:var(--banner);color:#e7eef7;padding:20px;border-bottom:3px solid #22c3ee;display:flex;gap:16px;align-items:center}
.hd img{width:80px;height:80px;border-radius:12px;box-shadow:0 0 0 1px #22c3ee;flex:none}
.wk{font-size:12px;letter-spacing:.1em;text-transform:uppercase;opacity:.85}
h1{font-family:"Chakra Petch","Plus Jakarta Sans",sans-serif;font-size:28px;line-height:1.1;margin-top:2px}
.bd{padding:20px;display:flex;flex-direction:column;gap:22px}
h2{font-family:"Chakra Petch","Plus Jakarta Sans",sans-serif;font-size:18px;text-transform:uppercase;letter-spacing:.03em;margin-bottom:8px}
.intro{white-space:pre-wrap}
.res{border:1px solid var(--line);border-radius:8px;padding:12px;margin-top:8px}
.sc{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}.sc b{font-weight:600}.sc b:last-child{text-align:right}
.n{font-family:"Chakra Petch",sans-serif;font-size:26px;font-variant-numeric:tabular-nums;line-height:1;padding:4px 10px;border-radius:6px;background:var(--brand-soft);color:var(--brand);white-space:nowrap}
.meta{font-size:13px;color:var(--muted);margin-top:6px}
ul{list-style:none;display:grid;gap:8px}li{display:flex;gap:10px;align-items:baseline}li:before{content:"";flex:none;width:8px;height:8px;border-radius:50%;background:var(--brand);transform:translateY(-1px)}
.ev{display:grid;grid-template-columns:62px minmax(0,1fr);gap:12px;padding:10px;border:1px solid var(--line);border-radius:8px;margin-top:8px}
.d{text-align:center;border-radius:6px;padding:6px 0;font-family:"Chakra Petch",sans-serif;line-height:1.1;background:var(--brand-soft);color:var(--brand)}
.ev.jogo .d{background:var(--warn-soft);color:var(--warn)}.d b{display:block;font-size:22px}.d span{font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.ev small{display:block;color:var(--muted);font-size:13px}
.av{background:var(--warn-soft);border-radius:8px;padding:12px 14px;white-space:pre-wrap}.av b{color:var(--warn)}
.ft{border-top:1px solid var(--line);padding:14px 20px;font-size:12px;color:var(--muted)}
.empty{color:var(--muted)}
details{border:1px solid var(--line);border-radius:8px;margin-top:8px;background:var(--inset)}
summary{cursor:pointer;padding:12px;font-weight:600;display:flex;justify-content:space-between;gap:10px;list-style:none}
summary::-webkit-details-marker{display:none}summary:after{content:"+";color:var(--brand);font-weight:700}details[open] summary:after{content:"–"}
summary span{color:var(--muted);font-weight:500;font-size:13px;margin-left:auto}summary:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.old{padding:0 12px 12px;display:flex;flex-direction:column;gap:12px}
</style></head><body>`;
  const logo = '<img src="/icons/icon-192.png" alt="BolaComVisão" width="80" height="80">';
  if (!issue) {
    return `${head}<div class="w"><div class="hd">${logo}<div><div class="wk">${esc(teamName)}</div><h1>Resumo da semana</h1></div></div><div class="bd"><p class="empty">O treinador ainda não publicou o resumo desta semana.</p></div></div></body></html>`;
  }
  const resultsOf = (list: NewsletterResult[]) =>
    list
      .map((r) => {
        const left = r.home === false ? r.opponent : teamName;
        const right = r.home === false ? teamName : r.opponent;
        const score = r.home === false ? `${r.theirs} – ${r.ours}` : `${r.ours} – ${r.theirs}`;
        const meta = [shortDay(r.date), r.competition, r.home === null ? '' : r.home ? 'Em casa' : 'Fora']
          .filter(Boolean)
          .join(' · ');
        return `<div class="res"><div class="sc"><b>${esc(left)}</b><span class="n">${esc(score)}</span><b>${esc(right)}</b></div><div class="meta">${esc(meta)}${r.scorers ? ` · Golos: ${esc(r.scorers)}` : ''}</div></div>`;
      })
      .join('') || '<p class="empty">Não houve jogos nesta semana.</p>';
  const factsOf = (i: NewsletterIssue) =>
    [
      i.attendance
        ? `<li><span><b>Treinos:</b> ${i.attendance.trainings} ${i.attendance.trainings === 1 ? 'treino' : 'treinos'} com ${i.attendance.percent}% de presenças.</span></li>`
        : '',
      ...i.highlights.map((h) => `<li><span>${esc(h)}</span></li>`)
    ].join('');
  const results = resultsOf(issue.results);
  const facts = factsOf(issue);
  const older = archive.filter((a) => a.from !== issue.from);
  const archiveHtml = older.length
    ? `<section><h2>Semanas anteriores</h2>${older
        .map((a) => {
          const games = a.results.length
            ? a.results.map((r) => (r.home === false ? `${r.theirs}–${r.ours}` : `${r.ours}–${r.theirs}`)).join(' · ')
            : 'sem jogos';
          const f = factsOf(a);
          return `<details><summary>${esc(weekLabel(a.from, a.to))}<span>${esc(games)}</span></summary><div class="old">${a.intro ? `<p class="intro">${esc(a.intro)}</p>` : ''}${resultsOf(a.results)}${f ? `<ul>${f}</ul>` : ''}</div></details>`;
        })
        .join('')}</section>`
    : '';
  const upcoming = issue.upcoming.length
    ? issue.upcoming
        .map((e) => {
          const [, m, d] = e.date.split('-');
          const wd = shortDay(e.date).split(' ')[0];
          const when = [e.time ? `${e.kind === 'jogo' ? 'Jogo' : 'Início'} às ${e.time}` : '', e.meeting]
            .filter(Boolean)
            .join(' · ');
          return `<div class="ev ${e.kind}"><div class="d"><b>${esc(d)}</b><span>${esc(wd)} ${esc(MONTHS[Number(m) - 1] || '')}</span></div><div><b>${esc(e.title)}</b>${when ? `<small>${esc(when)}</small>` : ''}${e.place ? `<small>📍 ${esc(e.place)}</small>` : ''}</div></div>`;
        })
        .join('')
    : '<p class="empty">Não há jogos nem treinos marcados para esta semana.</p>';
  return `${head}<div class="w"><div class="hd">${logo}<div><div class="wk">${esc(teamName)} · ${esc(weekLabel(issue.from, issue.to))}</div><h1>Resumo da semana</h1></div></div><div class="bd">${issue.intro ? `<p class="intro">${esc(issue.intro)}</p>` : ''}<section><h2>Resultados da semana</h2>${results}</section>${facts ? `<section><h2>Destaques</h2><ul>${facts}</ul></section>` : ''}<section><h2>Esta semana · ${esc(weekLabel(issue.nextFrom, issue.nextTo))}</h2>${upcoming}</section>${issue.notices ? `<div class="av"><b>Avisos:</b> ${esc(issue.notices)}</div>` : ''}${archiveHtml}</div><div class="ft">Publicado pelo treinador na BolaComVisão. Este link mostra sempre o resumo mais recente.</div></div></body></html>`;
}
