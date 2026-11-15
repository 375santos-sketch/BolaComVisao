import { SquadProfile, VjSession, VjStatus } from '../types';

/**
 * 🎬 Visão de Jogo — the team's library of sessions (VJ1). Each session is its own record of the team (kind
 * "challenge", format «sessão»), synced and protected by the same rules as the team's other data. The team's coach
 * publishes for the team; the club library (review and approval) and the platform library come next.
 */

export const VJ_STATUS: Record<VjStatus, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-ui-surface-2 text-ui-muted' },
  revisao: { label: 'Em revisão', cls: 'bg-ui-warning/15 text-ui-warning' },
  publicado: { label: 'Publicada', cls: 'bg-ui-success/15 text-ui-success' },
  arquivado: { label: 'Arquivada', cls: 'bg-ui-surface-2 text-ui-muted' }
};

/** What the team's coach can do with a session of the team library, by its state. */
export function teamActions(status: VjStatus): Array<{ to: VjStatus; label: string }> {
  switch (status) {
    case 'rascunho':
    case 'revisao':
      return [{ to: 'publicado', label: 'Publicar na equipa' }];
    case 'publicado':
      return [
        { to: 'rascunho', label: 'Voltar a rascunho' },
        { to: 'arquivado', label: 'Arquivar' }
      ];
    case 'arquivado':
      return [{ to: 'rascunho', label: 'Reabrir como rascunho' }];
  }
}

export function newSession(input: { id: string; title: string; authorName?: string; now: string }): VjSession {
  return {
    id: input.id,
    format: 'sessao',
    title: input.title.trim().slice(0, 120),
    competencies: [],
    status: 'rascunho',
    items: [],
    ...(input.authorName ? { authorName: input.authorName } : {}),
    createdAt: input.now,
    updatedAt: input.now
  };
}

/** A clean session (title kept short, no empty or repeated competencies, only valid videos). */
export function cleanSession(s: VjSession, now: string): VjSession {
  return {
    ...s,
    title: s.title.trim().slice(0, 120) || 'Sessão sem título',
    objective: (s.objective || '').trim().slice(0, 300) || undefined,
    competencies: [...new Set((s.competencies || []).filter(Boolean))].slice(0, 8),
    items: (s.items || []).filter((i) => i && i.kind === 'video' && /^[\w-]{11}$/.test(i.youtubeId)).slice(0, 10),
    updatedAt: now
  };
}

export const sessionsOf = (team: Pick<SquadProfile, 'vjSessions'> | undefined): VjSession[] =>
  (Array.isArray(team?.vjSessions) ? team!.vjSessions! : []).filter((s) => s && s.id && s.format === 'sessao');

/** The team's sessions with this one added or replaced. */
export const withSession = (sessions: VjSession[], s: VjSession): VjSession[] => [
  ...sessions.filter((x) => x.id !== s.id),
  s
];

export const withoutSession = (sessions: VjSession[], id: string): VjSession[] => sessions.filter((x) => x.id !== id);

/** A copy to adapt (a new draft that remembers where it came from). */
export const duplicateSession = (s: VjSession, newId: string, now: string): VjSession => ({
  ...s,
  id: newId,
  title: `${s.title} (cópia)`.slice(0, 120),
  status: 'rascunho',
  favorite: false,
  copiedFrom: s.id,
  createdAt: now,
  updatedAt: now
});

export interface VjFilter {
  competency?: string;
  status?: VjStatus | 'ativas';
  favorites?: boolean;
}

/** Filtered sessions: favourites first, then the most recently changed. Archived ones only when asked for. */
export function filterSessions(sessions: VjSession[], f: VjFilter): VjSession[] {
  return sessions
    .filter((s) => (f.status && f.status !== 'ativas' ? s.status === f.status : s.status !== 'arquivado'))
    .filter((s) => !f.competency || s.competencies.includes(f.competency))
    .filter((s) => !f.favorites || s.favorite)
    .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || b.updatedAt.localeCompare(a.updatedAt));
}
