import { AppState, Match, Player } from '../types';
import { getMatchPhase } from './matchPhaseUtils';
import { fromRest } from './calendarFeed';
import { liveMatchOf, liveScore } from './liveFollow';

/**
 * 📡 Link do jogo para os pais: one secret link per team (public_lives/{token}, shown by the server at
 * /aovivo/{token}) that anyone opens without an account. It shows the game being played (score, clock, goals with
 * the scorer's first name, the starting line-up of each half, shots and corners); without a game, the last result
 * and the next game. Never the substitutions, photos, contacts, birth dates or the coach's notes; the cards only
 * when the coach turns them on.
 */

interface ParentsGoal {
  minute: string;
  ours: boolean;
  name: string;
}

interface ParentsCard {
  minute: string;
  name: string;
  red: boolean;
}

export interface ParentsGame {
  opponent: string;
  competition: string;
  location: string;
  date: string;
  /** parte1 · intervalo · parte2 · fim */
  phase: string;
  ours: number;
  theirs: number;
  /** The game clock: time played when published, and since when it is running (null = stopped). */
  elapsedMs: number;
  runningSince: number | null;
  goals: ParentsGoal[];
  cards: ParentsCard[];
  halftime: { ours: number; theirs: number } | null;
  lineup1: string[];
  lineup2: string[];
  stats: { shotsFor: number; shotsAgainst: number; cornersFor: number; cornersAgainst: number };
}

interface ParentsNext {
  opponent: string;
  date: string;
  time: string;
  location: string;
  venue: string;
}

interface ParentsLivePage {
  teamName: string;
  color: string;
  game: ParentsGame | null;
  next: ParentsNext | null;
}

const firstName = (roster: Player[], id: string | null | undefined, fallback?: string | null) => {
  if (id === 'autogolo') return 'autogolo';
  const p = id ? roster.find((r) => r && r.id === id) : undefined;
  const name = p ? p.nickname?.trim() || p.name.trim().split(/\s+/)[0] : (fallback || '').trim().split(/\s+/)[0];
  return (name || '').slice(0, 40);
};

const minuteLabel = (m: number | string | null | undefined) =>
  m === null || m === undefined || `${m}` === '' ? '' : `${String(m).replace(/'+$/, '')}'`;

const halfOf = (e: { half?: 1 | 2; period?: string }) => e.half ?? (/^2/.test(String(e.period || '')) ? 2 : 1);

const orderOf = (e: { half?: 1 | 2; period?: string; minute: number | string | null; clockSec?: number }) => {
  const n = parseInt(String(e.minute ?? ''), 10);
  return halfOf(e) * 100000 + (typeof e.clockSec === 'number' ? e.clockSec : (Number.isFinite(n) ? n : 0) * 60);
};

const names = (roster: Player[], ids: string[] | undefined) =>
  (ids || []).map((id) => firstName(roster, id)).filter(Boolean);

/** A game as the parents see it (most recent goal first). */
export function parentsGameOf(match: Match, roster: Player[] | undefined, showCards: boolean): ParentsGame {
  const players = roster || [];
  const phase = match.finished ? 'fim' : getMatchPhase(match);
  const { ours, theirs } = liveScore(match);
  const goals = [...(match.goals || [])]
    .sort((a, b) => orderOf(b) - orderOf(a))
    .map((g) => ({
      minute: minuteLabel(g.minute),
      ours: g.type === 'scored',
      name: g.type === 'scored' ? firstName(players, g.scorerId, g.scorer) : ''
    }));
  const cards = showCards
    ? [...(match.cards || [])]
        .sort((a, b) => orderOf(b) - orderOf(a))
        .map((c) => ({
          minute: minuteLabel(c.minute),
          name: firstName(players, c.playerId, c.player),
          red: c.color === 'Vermelho'
        }))
    : [];
  const firstHalf = (match.goals || []).filter((g) => halfOf(g) === 1);
  const firstHalfOurs = firstHalf.filter((g) => g.type === 'scored').length;
  const secondHalfOn = phase === 'intervalo' || phase === 'parte2' || phase === 'fim';
  const timer = match.timer;
  return {
    opponent: match.opponent || 'Adversário',
    competition: [
      match.competitionPhase,
      typeof match.phase === 'string' && !/^(parte|intervalo|nao_)/.test(match.phase) ? match.phase : ''
    ]
      .filter(Boolean)
      .join(' · '),
    location: match.location === 'casa' ? 'em casa' : match.location === 'fora' ? 'fora' : '',
    date: match.date || '',
    phase,
    ours,
    theirs,
    elapsedMs: Math.max(0, timer?.elapsedMs || 0),
    runningSince: !match.finished && timer?.isRunning && timer.lastStartTs ? timer.lastStartTs : null,
    goals,
    cards,
    halftime: secondHalfOn ? { ours: firstHalfOurs, theirs: firstHalf.length - firstHalfOurs } : null,
    lineup1: names(players, match.lineup),
    lineup2: secondHalfOn ? names(players, match.lineupSecondHalf) : [],
    stats: {
      shotsFor: (match.shotsInBoxFor || 0) + (match.shotsOutBoxFor || 0),
      shotsAgainst: (match.shotsInBoxAgainst || 0) + (match.shotsOutBoxAgainst || 0),
      cornersFor: match.cornersFor || 0,
      cornersAgainst: match.cornersAgainst || 0
    }
  };
}

/** What the parents' link shows now: the game being played, or the last result; and the next game. */
export function parentsLiveOf(
  state: Pick<AppState, 'matches' | 'schedule' | 'roster'>,
  showCards: boolean,
  today: string
): { game: ParentsGame | null; next: ParentsNext | null } {
  const live = liveMatchOf(state.matches);
  const last = [...(state.matches || [])]
    .filter((m) => m && m.finished)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (b.liveAt || 0) - (a.liveAt || 0))[0];
  const shown = live || last || null;
  const upcoming = [...(state.schedule || [])]
    .filter((s) => s && s.date >= today)
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))[0];
  return {
    game: shown ? parentsGameOf(shown, state.roster, showCards) : null,
    next: upcoming
      ? {
          opponent: upcoming.opponent || 'Adversário',
          date: upcoming.date,
          time: upcoming.time || '',
          location: upcoming.location === 'casa' ? 'em casa' : upcoming.location === 'fora' ? 'fora' : '',
          venue: (upcoming.venue || '').slice(0, 120)
        }
      : null
  };
}

// ---------- The page (the app's server) ----------

const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const strList = (v: unknown, max = 30) =>
  Array.isArray(v)
    ? v
        .filter((x) => typeof x === 'string')
        .slice(0, max)
        .map((x) => (x as string).slice(0, 40))
    : [];

/** The published document read through Firestore's REST API (null when it is not a parents' link). */
export function parentsLiveFromRestDocument(
  doc: { fields?: Record<string, any> } | null | undefined
): ParentsLivePage | null {
  const data = fromRest({ mapValue: { fields: doc?.fields } }) as Record<string, any> | null;
  if (!data || typeof data.teamName !== 'string') return null;
  const g = data.game && typeof data.game === 'object' ? data.game : null;
  const n = data.next && typeof data.next === 'object' ? data.next : null;
  const list = <T>(v: unknown, f: (x: any) => T) => (Array.isArray(v) ? v.slice(0, 60).map(f) : []);
  return {
    teamName: data.teamName.slice(0, 200),
    color: /^#[0-9a-f]{6}$/i.test(data.color) ? data.color : '#0e8fb0',
    game: g
      ? {
          opponent: str(g.opponent) || 'Adversário',
          competition: str(g.competition),
          location: str(g.location),
          date: str(g.date, 10),
          phase: ['parte1', 'intervalo', 'parte2', 'fim'].includes(g.phase) ? g.phase : 'parte1',
          ours: num(g.ours),
          theirs: num(g.theirs),
          elapsedMs: num(g.elapsedMs),
          runningSince: typeof g.runningSince === 'number' ? g.runningSince : null,
          goals: list(g.goals, (x) => ({ minute: str(x?.minute, 8), ours: x?.ours === true, name: str(x?.name, 40) })),
          cards: list(g.cards, (x) => ({ minute: str(x?.minute, 8), name: str(x?.name, 40), red: x?.red === true })),
          halftime:
            g.halftime && typeof g.halftime === 'object'
              ? { ours: num(g.halftime.ours), theirs: num(g.halftime.theirs) }
              : null,
          lineup1: strList(g.lineup1),
          lineup2: strList(g.lineup2),
          stats: {
            shotsFor: num(g.stats?.shotsFor),
            shotsAgainst: num(g.stats?.shotsAgainst),
            cornersFor: num(g.stats?.cornersFor),
            cornersAgainst: num(g.stats?.cornersAgainst)
          }
        }
      : null,
    next: n
      ? {
          opponent: str(n.opponent) || 'Adversário',
          date: str(n.date, 10),
          time: str(n.time, 5),
          location: str(n.location, 20),
          venue: str(n.venue, 120)
        }
      : null
  };
}

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

const PHASES: Record<string, string> = { parte1: '1.ª parte', intervalo: 'Intervalo', parte2: '2.ª parte', fim: 'Fim' };
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const dayLabel = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T12:00:00`);
  return `${WEEKDAYS[d.getDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
};

/** The content of the page (refreshed every few seconds without reloading). */
export function renderParentsLiveContent({ teamName, game, next }: ParentsLivePage): string {
  const nextBlock = next
    ? `<div class="sec"><div class="t">PRÓXIMO JOGO</div><b>${esc(teamName)} vs ${esc(next.opponent)}</b><p>${esc(dayLabel(next.date))}${next.time ? ` · ${esc(next.time)}` : ''}${next.location ? ` · ${esc(next.location)}` : ''}</p>${next.venue ? `<p>📍 ${esc(next.venue)}</p>` : ''}</div>`
    : '';
  if (!game) {
    return `<div class="hdr"><div class="club">${esc(teamName.toUpperCase())}</div><div class="none">Ainda não há jogos.</div></div>${nextBlock}`;
  }
  const live = game.phase !== 'fim';
  const badge = live ? '<span class="live">● EM DIRETO</span>' : '<span class="live end">🏁 RESULTADO FINAL</span>';
  const clock = live
    ? `<span class="clock" id="clk" data-el="${game.elapsedMs}" data-since="${game.runningSince ?? ''}" data-ph="${esc(PHASES[game.phase] || '')}">${game.phase === 'intervalo' ? 'Intervalo' : esc(PHASES[game.phase] || '')}</span>`
    : '';
  const events: string[] = [];
  game.goals.forEach((g) =>
    events.push(
      `<div class="ev"><span class="min">${esc(g.minute || '—')}</span><span>⚽ ${g.ours ? `<b>Golo${g.name ? ` · ${esc(g.name)}` : ''}</b>` : 'Golo sofrido'}</span></div>`
    )
  );
  game.cards.forEach((c) =>
    events.push(
      `<div class="ev"><span class="min">${esc(c.minute || '—')}</span><span>${c.red ? '🟥' : '🟨'} ${esc(c.name)}</span></div>`
    )
  );
  const half = game.halftime
    ? `<div class="ev"><span class="min">—</span><span>⏸️ Intervalo · ${game.halftime.ours} – ${game.halftime.theirs}</span></div>`
    : '';
  const lineup = (title: string, list: string[]) =>
    list.length
      ? `<div class="sec"><div class="t">${title}</div><p class="xi">${list.map(esc).join(' · ')}</p></div>`
      : '';
  const s = game.stats;
  return `<div class="hdr"><div class="club">${esc([teamName, game.competition].filter(Boolean).join(' · ').toUpperCase())}</div>${badge}
<div class="score">${game.ours} – ${game.theirs}</div><div class="teams"><span>${esc(teamName)}</span><span>${esc(game.opponent)}</span></div>${clock}
${!live ? `<p class="when">${esc(dayLabel(game.date))}${game.location ? ` · ${esc(game.location)}` : ''}</p>` : ''}</div>
<div class="sec"><div class="t">LANCES (o mais recente em cima)</div>${events.length || half ? events.join('') + half : '<p>Ainda sem golos.</p>'}</div>
${lineup('EQUIPA DA 2.ª PARTE', game.lineup2)}${lineup('EQUIPA INICIAL (1.ª PARTE)', game.lineup1)}
<div class="sec"><div class="t">NÚMEROS DO JOGO</div><div class="stats"><b class="l">${s.shotsFor}</b><span>Remates</span><b>${s.shotsAgainst}</b><b class="l">${s.cornersFor}</b><span>Cantos</span><b>${s.cornersAgainst}</b></div></div>
${nextBlock}`;
}

/** The whole page: it asks the server for the content again every 5 seconds and ticks the clock on the phone. */
export function renderParentsLivePage(page: ParentsLivePage, token: string): string {
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Ao vivo · ${esc(page.teamName)}</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#f1f5f9;color:#0f172a;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:15px;padding-bottom:24px}
main{max-width:560px;margin:0 auto}.hdr{background:linear-gradient(135deg,${page.color},#0f172a);color:#fff;padding:18px 16px;text-align:center}
.club{font-size:12px;opacity:.85;letter-spacing:.04em}.none{margin-top:10px;font-weight:700}
.live{display:inline-block;margin-top:8px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;border-radius:99px;padding:3px 10px}.live.end{background:#0f172a}
.score{font-size:56px;font-weight:900;line-height:1;margin-top:8px;letter-spacing:2px}.teams{display:flex;justify-content:space-between;gap:10px;font-weight:800;font-size:14px;margin-top:8px}
.clock{display:inline-block;margin-top:10px;background:rgba(0,0,0,.35);border-radius:99px;padding:4px 12px;font-weight:800;color:#86efac}.when{margin-top:8px;font-size:13px;opacity:.85}
.sec{margin:12px 12px 0;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px}.t{font-size:11px;font-weight:800;color:#0e7490;margin-bottom:6px;letter-spacing:.03em}
.sec p{color:#475569;font-size:14px;margin-top:2px}.xi{line-height:1.6}
.ev{display:flex;gap:10px;padding:7px 0;border-top:1px solid #f1f5f9;font-size:14px}.ev:first-of-type{border-top:0}.min{flex:none;width:34px;font-weight:800;color:#0e7490}
.stats{display:grid;grid-template-columns:1fr auto 1fr;gap:4px 12px;align-items:center}.stats b{font-size:16px}.stats .l{text-align:right}.stats span{color:#64748b;font-size:12px;text-align:center}
.upd{font-size:11px;color:#64748b;text-align:center;margin-top:12px}
</style></head><body><main id="m">${renderParentsLiveContent(page)}</main><p class="upd" id="u">Atualiza-se sozinho</p><script>
(function(){var m=document.getElementById('m'),u=document.getElementById('u'),last=Date.now();
function tick(){var c=document.getElementById('clk');if(c&&c.dataset.ph&&c.textContent!=='Intervalo'){var el=+c.dataset.el||0,s=+c.dataset.since||0;if(s)el+=Math.max(0,Date.now()-s);
var t=Math.floor(el/1000);c.textContent='⏱ '+c.dataset.ph+' · '+String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
var a=Math.round((Date.now()-last)/1000);u.textContent='Atualiza-se sozinho · há '+(a<60?a+' s':Math.round(a/60)+' min');}
function load(){fetch(${JSON.stringify(`/aovivo/${token}?conteudo=1`)},{cache:'no-store'}).then(function(r){if(r.ok)return r.text();throw 0;}).then(function(h){m.innerHTML=h;last=Date.now();tick();}).catch(function(){});}
tick();setInterval(tick,1000);setInterval(load,5000);document.addEventListener('visibilitychange',function(){if(!document.hidden)load();});})();
</script></body></html>`;
}
