import { AppState, Match, Player } from '../types';
import { getMatchCompetitionDetails, parseMinuteOrder } from './utils';

/**
 * Short, friendly match summary for the parents' WhatsApp group: result, (optionally) who scored, a word of
 * encouragement and the next game. Scorers are optional because the players are minors.
 */

const AUTO_GOAL_IDS = ['autogolo', 'auto_golo', 'auto-golo'];

const dayLabel = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const text = d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Player display name for parents: name only (no shirt number). */
export const playerName = (roster: Player[], id: string | null | undefined): string | null => {
  if (!id) return null;
  if (AUTO_GOAL_IDS.includes(id)) return 'autogolo';
  return roster.find((p) => p.id === id)?.name || null;
};

/** "Rui Silva (2), Tomás Gonçalves" in order of the first goal. */
export function scorersSummary(match: Match, roster: Player[]): string {
  const goals = (match.goals || [])
    .filter((g) => g.type === 'scored')
    .sort((a, b) => parseMinuteOrder(a.minute) - parseMinuteOrder(b.minute));
  const counts = new Map<string, number>();
  goals.forEach((g) => {
    const name = playerName(roster, g.scorerId) || g.scorer || null;
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts].map(([name, n]) => (n > 1 ? `${name} (${n})` : name)).join(', ');
}

const resultWord = (scored: number, conceded: number) =>
  scored > conceded ? 'Vitória' : scored < conceded ? 'Derrota' : 'Empate';

const encouragement = (scored: number, conceded: number) =>
  scored > conceded
    ? 'Parabéns a todos os atletas pelo empenho! 💪'
    : scored === conceded
      ? 'Bom esforço de toda a equipa, continuamos a crescer! 💪'
      : 'Obrigado a todos pelo esforço, para a próxima vamos com tudo! 💪';

export function buildParentsMessage(match: Match, state: AppState, options: { includeScorers: boolean }): string {
  const club = state.myClubName || 'O Meu Clube';
  const scored = (match.goals || []).filter((g) => g.type === 'scored').length;
  const conceded = (match.goals || []).filter((g) => g.type === 'conceded').length;
  const home = match.location !== 'fora';
  const scoreLine = home
    ? `${club} ${scored}-${conceded} ${match.opponent}`
    : `${match.opponent} ${conceded}-${scored} ${club}`;

  const comp = getMatchCompetitionDetails(match, state);
  const phase = comp.faseJornadaText && comp.faseJornadaText !== '—' ? ` – ${comp.faseJornadaText}` : '';

  const lines = [
    `⚽ *${scoreLine}*`,
    `${resultWord(scored, conceded)} · ${dayLabel(match.date)} · ${home ? 'Casa' : 'Fora'} · ${comp.typeLabel}${phase}`
  ];

  if (options.includeScorers && scored > 0) {
    const scorers = scorersSummary(match, state.roster || []);
    if (scorers) lines.push('', `🥅 Golos: ${scorers}`);
  }

  lines.push('', encouragement(scored, conceded));

  const today = new Date().toISOString().slice(0, 10);
  const next = (state.schedule || [])
    .filter((s) => s && s.date >= today && s.date > match.date)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];
  if (next) {
    lines.push(
      '',
      `📅 Próximo jogo: ${dayLabel(next.date)}${next.time ? `, ${next.time}` : ''} vs ${next.opponent} (${next.location === 'fora' ? 'Fora' : 'Casa'})`
    );
  }
  return lines.join('\n');
}
