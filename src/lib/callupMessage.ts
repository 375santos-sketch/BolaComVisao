import { AppState, Player, ScheduledMatch } from '../types';
import { sortPlayerObjs } from './utils';

/**
 * The call-up message for the players' and parents' WhatsApp group. One text for every place that shares a
 * call-up (Agenda card and Convocatória screen); lines without data are left out.
 */

const dayLabel = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.split('-').reverse().join('/');
  const text = d.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: '2-digit' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const competitionLabel = (match: ScheduledMatch): string => {
  if (match.type === 'torneio') {
    return [match.tournamentName || 'Torneio', match.phase].filter(Boolean).join(' – ');
  }
  if (match.type === 'campeonato') return ['Campeonato', match.phase].filter(Boolean).join(' – ');
  return 'Jogo amigável';
};

/** Called-up players of the squad, in squad order (players removed from the squad are left out). */
function calledUpPlayers(match: ScheduledMatch, roster: Player[]): Player[] {
  const ids = new Set(match.callup || []);
  return sortPlayerObjs((roster || []).filter((p) => ids.has(p.id)));
}

const shirt = (p: Player) =>
  p.number !== null && p.number !== undefined && `${p.number}` !== '' ? `${p.number} – ` : '';

export function buildCallupMessage(match: ScheduledMatch, state: Pick<AppState, 'myClubName' | 'roster'>): string {
  const club = (state.myClubName || '').trim() || 'A nossa equipa';
  const teams = match.location === 'casa' ? `${club} vs ${match.opponent}` : `${match.opponent} vs ${club}`;
  const players = calledUpPlayers(match, state.roster || []);

  const lines: (string | null)[] = [
    `📋 *CONVOCATÓRIA – ${club.toUpperCase()}*`,
    '',
    `⚽ *${teams}*`,
    `🏆 ${competitionLabel(match)}`,
    `📅 ${dayLabel(match.date)}${match.time ? ` · jogo às ${match.time}` : ''}`,
    match.meetingTime
      ? `⏰ Concentração às ${match.meetingTime}${match.meetingPoint ? ` – ${match.meetingPoint}` : ''}`
      : null,
    !match.meetingTime && match.meetingPoint ? `📍 Ponto de encontro: ${match.meetingPoint}` : null,
    `🏟️ ${match.venue ? match.venue : match.location === 'casa' ? 'Em casa' : 'Fora'}`,
    match.callupNotes ? `📝 ${match.callupNotes}` : null,
    '',
    `👥 *Convocados (${players.length}):*`,
    ...(players.length > 0 ? players.map((p) => `• ${shirt(p)}${p.name}`) : ['(ainda sem convocados)'])
  ];
  return lines.filter((l) => l !== null).join('\n');
}
