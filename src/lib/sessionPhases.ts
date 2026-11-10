import { ExerciseCategory, SessionBlock } from '../types';

/**
 * 🧩 The three parts of a training session: warm-up (the "aquecimento" blocks), the main part (every exercise in
 * between) and the cool-down ("calma"). Minutes per part, against the session's length.
 */

export type SessionPhase = 'aquecimento' | 'fundamental' | 'calma';

export const PHASE_LABELS: Record<SessionPhase, string> = {
  aquecimento: 'Aquecimento',
  fundamental: 'Parte fundamental',
  calma: 'Retorno à calma'
};

export const phaseOf = (category?: ExerciseCategory): SessionPhase =>
  category === 'aquecimento' ? 'aquecimento' : category === 'calma' ? 'calma' : 'fundamental';

export interface SessionPhaseSummary {
  phase: SessionPhase;
  minutes: number;
  blocks: number;
}

/** Minutes and blocks in each part (always the three, in order). */
export function sessionPhases(blocks: SessionBlock[] | undefined): SessionPhaseSummary[] {
  const out: SessionPhaseSummary[] = (['aquecimento', 'fundamental', 'calma'] as SessionPhase[]).map((phase) => ({
    phase,
    minutes: 0,
    blocks: 0
  }));
  for (const b of blocks || []) {
    const part = out.find((p) => p.phase === phaseOf(b.category))!;
    part.minutes += Math.max(0, b.durationMinutes || 0);
    part.blocks += 1;
  }
  return out;
}

/** What the plan is missing, in words ("Falta o aquecimento", "Planeado 95 de 75 min"). */
export function sessionWarnings(blocks: SessionBlock[] | undefined, lengthMinutes: number): string[] {
  const list = blocks || [];
  if (!list.length) return [];
  const parts = sessionPhases(list);
  const planned = parts.reduce((s, p) => s + p.minutes, 0);
  const out: string[] = [];
  if (!parts[0].blocks) out.push('Sem aquecimento');
  if (!parts[2].blocks) out.push('Sem retorno à calma');
  if (lengthMinutes > 0 && planned > lengthMinutes) out.push(`Planeado ${planned} de ${lengthMinutes} min`);
  return out;
}
