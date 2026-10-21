import { AppState, PreMatchPlan, ScheduledMatch } from '../types';
import { previousReports } from './opponentReport';

/** Pré-jogo: one simple plan per scheduled game, stored with the game (ScheduledMatch.preMatchPlan). */

export const SEVEN_A_SIDE_SYSTEMS = ['2-3-1', '3-2-1', '2-1-2-1', '3-1-2', '2-2-2', '1-3-2'];
export const MAX_OBJECTIVES = 3;

const TYPE_LABEL: Record<string, string> = { amigavel: 'Jogo amigável', campeonato: 'Campeonato', torneio: 'Torneio' };

export function competitionLabel(s: ScheduledMatch): string {
  const type = s.type === 'torneio' && s.tournamentName ? s.tournamentName : TYPE_LABEL[s.type] || 'Jogo';
  return s.phase ? `${type} – ${s.phase}` : type;
}

export const dateLabel = (iso: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

/** Games still to play (today included), soonest first. */
export function upcomingGames(
  schedule: ScheduledMatch[],
  today = new Date().toISOString().slice(0, 10)
): ScheduledMatch[] {
  return (schedule || [])
    .filter((s) => s && s.date && s.date.slice(0, 10) >= today)
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
}

export const hasPlan = (p?: PreMatchPlan | null): boolean =>
  Boolean(
    p &&
    ((p.system && p.system.trim()) ||
      (p.objectives || []).some((o) => o.trim()) ||
      (p.withBall && p.withBall.trim()) ||
      (p.withoutBall && p.withoutBall.trim()) ||
      (p.motto && p.motto.trim()) ||
      (p.notes && p.notes.trim()))
  );

/** The plan without empty values (so an untouched form saves nothing). */
export function cleanPlan(p: PreMatchPlan, updatedBy?: string): PreMatchPlan {
  const plan: PreMatchPlan = {
    system: p.system?.trim() || undefined,
    objectives: (p.objectives || [])
      .map((o) => o.trim())
      .filter(Boolean)
      .slice(0, MAX_OBJECTIVES),
    withBall: p.withBall?.trim() || undefined,
    withoutBall: p.withoutBall?.trim() || undefined,
    motto: p.motto?.trim() || undefined,
    notes: p.notes?.trim() || undefined,
    updatedAt: Date.now(),
    updatedBy: updatedBy || undefined
  };
  return JSON.parse(JSON.stringify(plan));
}

/** WhatsApp summary for the coaching staff. */
export function buildPreMatchText(game: ScheduledMatch, state: AppState): string {
  const club = state.myClubName || 'A nossa equipa';
  const p = game.preMatchPlan || {};
  const lines = [
    `⚡ *Pré-jogo: ${club} vs ${game.opponent}*`,
    `📅 ${dateLabel(game.date)}${game.time ? ` às ${game.time}` : ''} · ${game.location === 'fora' ? 'Fora' : 'Casa'}${game.venue ? ` · ${game.venue}` : ''}`,
    `🏆 ${competitionLabel(game)}`
  ];
  if (game.meetingTime || game.meetingPoint)
    lines.push(`🕒 Concentração: ${[game.meetingTime, game.meetingPoint].filter(Boolean).join(' · ')}`);
  if (p.motto) lines.push('', `🔥 *${p.motto}*`);
  if (p.system) lines.push('', `🧩 Sistema: ${p.system}`);
  const objectives = (p.objectives || []).filter(Boolean);
  if (objectives.length) lines.push('', '🎯 *Objetivos*', ...objectives.map((o, i) => `${i + 1}. ${o}`));
  if (p.withBall) lines.push('', '⚽ *Com bola*', p.withBall);
  if (p.withoutBall) lines.push('', '🛡️ *Sem bola*', p.withoutBall);
  const last = previousReports(state.matches || [], game.opponent, game.date)[0];
  if (last?.opponentReport?.nextTime) lines.push('', `🔁 Da última vez contra eles: ${last.opponentReport.nextTime}`);
  if (p.notes) lines.push('', '📝 *Notas*', p.notes);
  return lines.join('\n');
}
