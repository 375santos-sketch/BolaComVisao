import { AppState, Match, Player } from '../types';
import { calcPlayerMinutes, getMatchCompetitionDetails, parseMinuteOrder } from './utils';
import { getMatchShots } from './matchShots';
import { getCalledUpPlayers } from './playingTime';
import { playerName } from './parentsShare';

/**
 * 📰 Crónica do jogo: a short, warm text about a finished game for the club's page or the parents' group. The app
 * gathers the facts (no ratings, no notes, no criticism; scorers by first name only and only when the coach wants),
 * the server asks Gemini to write it, and a plain text made here is used when that is not possible.
 */

export type ChronicleAudience = 'clube' | 'pais';

export interface ChronicleFacts {
  club: string;
  category: string;
  opponent: string;
  home: boolean;
  date: string; // YYYY-MM-DD
  competition: string; // "Campeonato · Jornada 6", "Jogo Amigável", "Torneio (Natal)"
  scored: number;
  conceded: number;
  halfTime?: { scored: number; conceded: number };
  /** In order: who scored (ours) and when; "nós"/"eles" so the text can tell the story. */
  goals: { side: 'nós' | 'eles'; minute?: string; scorer?: string }[];
  cameBack: boolean;
  shots?: number;
  shotsAgainst?: number;
  calledUp: number;
  allPlayed: boolean;
  next?: { opponent: string; date: string; time?: string; home: boolean };
}

const firstName = (roster: Player[], id: string | null | undefined, fallback?: string | null) => {
  const full = playerName(roster, id) || fallback || '';
  if (!full || full === 'autogolo') return full === 'autogolo' ? 'autogolo' : undefined;
  const p = (roster || []).find((r) => r && r.id === id);
  return p?.nickname?.trim() || full.trim().split(/\s+/)[0];
};

const halfOf = (g: Match['goals'][number]): 1 | 2 | undefined =>
  g.half ?? (/^1/.test(String(g.period || '')) ? 1 : /^2/.test(String(g.period || '')) ? 2 : undefined);

export function chronicleFacts(match: Match, state: AppState, withScorers: boolean, today?: string): ChronicleFacts {
  const roster = state.roster || [];
  const goals = [...(match.goals || [])].sort(
    (a, b) => (halfOf(a) || 0) - (halfOf(b) || 0) || parseMinuteOrder(a.minute) - parseMinuteOrder(b.minute)
  );
  const scored = goals.filter((g) => g.type === 'scored').length;
  const conceded = goals.length - scored;

  // Behind at some point and did not lose
  let us = 0;
  let them = 0;
  let wasBehind = false;
  goals.forEach((g) => {
    if (g.type === 'scored') us++;
    else them++;
    if (them > us) wasBehind = true;
  });

  const halves = goals.map(halfOf);
  const halfTime = halves.every(Boolean)
    ? {
        scored: goals.filter((g, i) => g.type === 'scored' && halves[i] === 1).length,
        conceded: goals.filter((g, i) => g.type === 'conceded' && halves[i] === 1).length
      }
    : undefined;

  const s = getMatchShots(match);
  const shots =
    s.inBoxFor !== undefined || s.outBoxFor !== undefined ? (s.inBoxFor || 0) + (s.outBoxFor || 0) : undefined;
  const shotsAgainst =
    s.inBoxAgainst !== undefined || s.outBoxAgainst !== undefined
      ? (s.inBoxAgainst || 0) + (s.outBoxAgainst || 0)
      : undefined;

  const called = getCalledUpPlayers(match);
  const allPlayed =
    called.length > 0 && (match.lineup || []).length > 0 && called.every((id) => calcPlayerMinutes(match, id) > 0);

  const comp = getMatchCompetitionDetails(match, state);
  const phase = comp.faseJornadaText && comp.faseJornadaText !== '—' ? ` · ${comp.faseJornadaText}` : '';
  const day = today || new Date().toISOString().slice(0, 10);
  const next = (state.schedule || [])
    .filter((g) => g && g.date >= day && g.date > match.date)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];

  return {
    club: state.myClubName || 'A nossa equipa',
    category: state.category || '',
    opponent: match.opponent,
    home: match.location !== 'fora',
    date: match.date.slice(0, 10),
    competition: `${comp.typeLabel}${phase}`,
    scored,
    conceded,
    ...(halfTime ? { halfTime } : {}),
    goals: goals.map((g) => {
      const minute = g.minute !== null && g.minute !== undefined && `${g.minute}` !== '' ? String(g.minute) : undefined;
      const scorer = g.type === 'scored' && withScorers ? firstName(roster, g.scorerId, g.scorer) : undefined;
      return {
        side: g.type === 'scored' ? 'nós' : 'eles',
        ...(minute ? { minute: minute.replace(/'+$/, '') + "'" } : {}),
        ...(scorer ? { scorer } : {})
      };
    }),
    cameBack: wasBehind && scored >= conceded,
    ...(shots !== undefined ? { shots } : {}),
    ...(shotsAgainst !== undefined ? { shotsAgainst } : {}),
    calledUp: called.length,
    allPlayed,
    ...(next
      ? {
          next: {
            opponent: next.opponent,
            date: next.date,
            ...(next.time ? { time: next.time } : {}),
            home: next.location !== 'fora'
          }
        }
      : {})
  };
}

const AUDIENCE: Record<ChronicleAudience, string> = {
  clube:
    'para a página de Facebook do clube: tom de notícia de futebol de formação, entusiasta mas sóbrio, com um título curto na primeira linha e 2 a 3 parágrafos curtos; no máximo 2 emojis',
  pais: 'para o grupo de WhatsApp dos pais: tom próximo e caloroso, 2 parágrafos curtos, alguns emojis'
};

/** What Gemini is asked to write (the facts go as JSON, so nothing else is invented). */
export function chroniclePrompt(facts: ChronicleFacts, audience: ChronicleAudience): string {
  return `Escreve em português de Portugal uma crónica curta de um jogo de futebol de formação (crianças), ${AUDIENCE[audience]}.
Regras:
- Usa só os factos do JSON abaixo. Não inventes lances, nomes, minutos, tempo, público nem estatísticas.
- "goals" está pela ordem do jogo: "nós" são golos do ${facts.club}, "eles" do adversário. Conta a história do resultado (quem abriu o marcador, reviravolta, intervalo) só com o que lá está.
- Só nomeia jogadores que aparecem em "scorer" (primeiro nome). Sem notas individuais, sem críticas a jogadores, ao árbitro ou ao adversário.
- Termina a valorizar o esforço e a atitude de toda a equipa e, se houver "next", diz qual é o próximo jogo.
- Até 120 palavras. Texto simples, sem markdown, sem asteriscos nem cardinais.
Factos: ${JSON.stringify(facts)}`;
}

/** The model's answer, tidied: plain text, at most 1500 characters (null when empty). */
export function cleanChronicle(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const clean = text
    .replace(/\r/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*?|__/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1500);
  return clean.length >= 20 ? clean : null;
}

const dayLabel = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
};

const list = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}` : names[0];

/** The text made by the app itself (no internet, no Gemini key, or the model failed). */
export function chronicleFallback(f: ChronicleFacts, audience: ChronicleAudience): string {
  const team = `${f.club}${f.category ? ` (${f.category})` : ''}`;
  const result = f.scored > f.conceded ? 'venceu' : f.scored < f.conceded ? 'perdeu' : 'empatou';
  const score = `${f.scored}-${f.conceded}`;
  const title =
    f.scored > f.conceded
      ? f.cameBack
        ? 'Vitória com reviravolta!'
        : 'Vitória da nossa equipa!'
      : f.scored === f.conceded
        ? 'Empate com muita luta'
        : 'Jogo de aprendizagem';
  const first = `${f.home ? 'Em casa' : 'Fora de casa'}, a equipa ${team} ${result} por ${score} frente a ${f.opponent} (${f.competition}).`;
  const counts = new Map<string, number>();
  f.goals.forEach((g) => g.scorer && g.scorer !== 'autogolo' && counts.set(g.scorer, (counts.get(g.scorer) || 0) + 1));
  const scorers = [...counts].map(([n, k]) => (k > 1 ? `${n} (${k})` : n));
  const parts = [
    first,
    f.halfTime ? `Ao intervalo estava ${f.halfTime.scored}-${f.halfTime.conceded}.` : '',
    f.cameBack ? 'A equipa esteve em desvantagem mas nunca baixou os braços.' : '',
    scorers.length ? `Golos de ${list(scorers)}.` : '',
    f.shots ? `Fizemos ${f.shots} remates.` : '',
    f.allPlayed ? `Todos os ${f.calledUp} convocados jogaram.` : ''
  ].filter(Boolean);
  const effort =
    f.scored >= f.conceded
      ? 'Parabéns a todos pelo esforço e pela atitude!'
      : 'Obrigado a todos pelo esforço: é assim que se cresce!';
  const next = f.next
    ? `Próximo jogo: ${dayLabel(f.next.date)}${f.next.time ? `, às ${f.next.time}` : ''}, ${f.next.home ? 'em casa' : 'fora'}, frente a ${f.next.opponent}.`
    : '';
  return audience === 'clube'
    ? [title, parts.join(' '), [effort, next].filter(Boolean).join(' ')].join('\n\n')
    : [`⚽ ${title}`, parts.join(' '), `💪 ${effort}${next ? `\n📅 ${next}` : ''}`].join('\n\n');
}
