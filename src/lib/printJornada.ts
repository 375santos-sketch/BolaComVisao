import { LeagueGame } from '../types';
import { looseDate, teamKey } from './leagueTable';
import { uid } from './utils';

/**
 * Classificação → "📷 Importar print da jornada": the coach sends a screenshot of a round (FPF site, association
 * app…) and the server asks Gemini to read the games. The prompt and the cleaning of the answer live here so they can
 * be tested; the server only calls the model.
 */

export const PRINT_PROMPT = `Esta imagem é um print de uma página de resultados de futebol jovem em Portugal (por exemplo resultados.fpf.pt ou a app de uma associação).
Lê todos os jogos que aparecem. Para cada jogo indica:
- home: nome da equipa da casa, exatamente como está escrito
- away: nome da equipa de fora, exatamente como está escrito
- homeGoals e awayGoals: golos (números inteiros); se o jogo ainda não tem resultado, não o incluas
- date: a data como aparece (por exemplo "24 OUT" ou "24/10"), ou vazio se não houver
- round: número da jornada se aparecer, senão 0
Não inventes jogos nem nomes. Ignora o nome do campo, horários, publicidade e menus.`;

/** Answer format asked to the model (JSON schema in the Gemini format). */
export const PRINT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    games: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          home: { type: 'STRING' },
          away: { type: 'STRING' },
          homeGoals: { type: 'INTEGER' },
          awayGoals: { type: 'INTEGER' },
          date: { type: 'STRING' },
          round: { type: 'INTEGER' }
        },
        required: ['home', 'away', 'homeGoals', 'awayGoals']
      }
    }
  },
  required: ['games']
} as const;

/** A game as read from the picture (date still as written). */
export interface PrintGame {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  date?: string;
  round?: number;
}

const name = (v: unknown) =>
  typeof v === 'string'
    ? v
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60)
    : '';
const goals = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 99 ? n : NaN;
};

/** Keeps only well-formed games from the model's answer (at most 40, names cleaned, no repeated game). */
export function cleanPrintGames(raw: unknown): PrintGame[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.games) ? (raw as any).games : [];
  const out: PrintGame[] = [];
  for (const g of list.slice(0, 60)) {
    if (!g || typeof g !== 'object') continue;
    const home = name(g.home);
    const away = name(g.away);
    const hg = goals(g.homeGoals);
    const ag = goals(g.awayGoals);
    if (!home || !away || isNaN(hg) || isNaN(ag) || teamKey(home) === teamKey(away)) continue;
    if (out.some((o) => teamKey(o.home) === teamKey(home) && teamKey(o.away) === teamKey(away))) continue;
    const round = goals(g.round);
    out.push({
      home,
      away,
      homeGoals: hg,
      awayGoals: ag,
      date: name(g.date) || undefined,
      round: round > 0 ? round : undefined
    });
    if (out.length >= 40) break;
  }
  return out;
}

/** The games read from the picture as league games (dates in YYYY-MM-DD for the season). */
export function printToLeagueGames(games: PrintGame[], season?: string): LeagueGame[] {
  return games.map((g) => ({
    id: uid(),
    round: g.round,
    date: looseDate(g.date, season),
    home: g.home,
    away: g.away,
    homeGoals: g.homeGoals,
    awayGoals: g.awayGoals
  }));
}
