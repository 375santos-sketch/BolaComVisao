import { Player, Training, VjRun, VjSession } from '../types';
import { groupGotIt, pausesOf } from './vjPauses';

/**
 * VJ5 — Visão de Jogo nas competências: the group's answers in the sessions an athlete was in, by competency of the
 * session. It is the GROUP's result (never a mark of the child) and sits beside the coach's evaluation, which it never
 * changes. Who was in a session: the list kept at the end of it; for older sessions, who was at that day's training.
 */

export interface VjCompetencyStat {
  /** Times the athlete was in a session with this competency. */
  sessions: number;
  /** Multiple-choice questions the group answered, and how many right. */
  asked: number;
  right: number;
  lastDate: string;
  lastTitle: string;
}

/** The group's score in one run: the multiple-choice questions answered and how many right. */
export function runScore(session: VjSession, run: VjRun): { asked: number; right: number } {
  let asked = 0;
  let right = 0;
  for (const p of session.items.flatMap((i) => pausesOf(i))) {
    const chosen = run.answers?.[p.id];
    if (!chosen) continue;
    const got = groupGotIt(p, chosen);
    if (got === null) continue;
    asked++;
    if (got) right++;
  }
  return { asked, right };
}

/** Whether the athlete was in this run of a session. */
export function wasPresent(run: VjRun, trainings: Pick<Training, 'date' | 'absences'>[], playerId: string): boolean {
  if (Array.isArray(run.presentIds)) return run.presentIds.includes(playerId);
  const training = trainings.find((t) => t.date === run.date);
  return !!training && !(training.absences || []).includes(playerId);
}

/** Who is ticked at the end of a session: the athletes at today's training, or every active athlete without one. */
export function defaultPresentIds(
  roster: Pick<Player, 'id' | 'active'>[],
  trainings: Pick<Training, 'date' | 'absences'>[],
  date: string
): string[] {
  const active = roster.filter((p) => p.active !== false).map((p) => p.id);
  const training = trainings.find((t) => t.date === date);
  return training ? active.filter((id) => !(training.absences || []).includes(id)) : active;
}

/** For each competency, the sessions this athlete was in and the group's answers there. */
export function vjStatsFor(
  playerId: string,
  sessions: VjSession[],
  trainings: Pick<Training, 'date' | 'absences'>[]
): Record<string, VjCompetencyStat> {
  const out: Record<string, VjCompetencyStat> = {};
  for (const s of sessions) {
    for (const run of s.runs || []) {
      if (!wasPresent(run, trainings, playerId)) continue;
      const score = runScore(s, run);
      for (const c of s.competencies || []) {
        const st = (out[c] ||= { sessions: 0, asked: 0, right: 0, lastDate: '', lastTitle: '' });
        st.sessions++;
        st.asked += score.asked;
        st.right += score.right;
        if (run.date >= st.lastDate) {
          st.lastDate = run.date;
          st.lastTitle = s.title;
        }
      }
    }
  }
  return out;
}

/** «esteve em 3 sessões · o grupo acertou 5 de 7 perguntas» */
export function vjStatLine(st: VjCompetencyStat): string {
  const times = `esteve em ${st.sessions} ${st.sessions === 1 ? 'sessão' : 'sessões'}`;
  if (st.asked === 0) return `${times} · perguntas conversadas em grupo`;
  return `${times} · o grupo acertou ${st.right} de ${st.asked} ${st.asked === 1 ? 'pergunta' : 'perguntas'}`;
}
