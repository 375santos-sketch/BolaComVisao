import { SquadProfile, VjPause, VjSession, VjStatus } from '../types';
import { cleanPause } from './vjPauses';

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
    items: (s.items || [])
      .filter((i) => i && i.kind === 'video' && /^[\w-]{11}$/.test(i.youtubeId))
      .slice(0, 10)
      .map((i) => ({
        ...i,
        pauses: (i.pauses || [])
          .map(cleanPause)
          .filter((p): p is VjPause => !!p)
          .sort((a, b) => a.at - b.at)
          .slice(0, 12)
      })),
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
  runs: [],
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

// ---------- VJ3: the club library ----------
// A coach proposes a session to the club (draft → review); who publishes (owner, admin, director, an allowed
// coordinator) approves and publishes it for every team of the club, returns it to the author, or archives it.

export interface ClubLibraryViewer {
  uid?: string;
  publishes: boolean;
}

export const clubSessionsOf = (state: { clubVjSessions?: VjSession[] }): VjSession[] =>
  (Array.isArray(state.clubVjSessions) ? state.clubVjSessions : []).filter((s) => s && s.id && s.format === 'sessao');

const isAuthor = (s: VjSession, v: ClubLibraryViewer) => !!v.uid && s.authorUid === v.uid;

/** Published sessions for everyone; drafts and reviews for their author and who publishes; archived ones only for
 *  who publishes. */
export const canSeeClubSession = (s: VjSession, v: ClubLibraryViewer): boolean =>
  s.status === 'publicado' || (v.publishes ? true : s.status !== 'arquivado' && isAuthor(s, v));

/** Who may change a session of the club library (the same as the rules). */
export const canEditClubSession = (s: VjSession, v: ClubLibraryViewer): boolean =>
  v.publishes || (isAuthor(s, v) && (s.status === 'rascunho' || s.status === 'revisao'));

/** What this person can do with a session of the club library, by its state. */
export function clubActions(s: VjSession, v: ClubLibraryViewer): Array<{ to: VjStatus; label: string }> {
  if (v.publishes) {
    switch (s.status) {
      case 'rascunho':
        return [{ to: 'publicado', label: 'Aprovar e publicar' }];
      case 'revisao':
        return [
          { to: 'publicado', label: 'Aprovar e publicar' },
          { to: 'rascunho', label: 'Devolver ao autor' }
        ];
      case 'publicado':
        return [{ to: 'arquivado', label: 'Arquivar' }];
      case 'arquivado':
        return [{ to: 'publicado', label: 'Publicar de novo' }];
    }
  }
  if (!isAuthor(s, v)) return [];
  if (s.status === 'rascunho') return [{ to: 'revisao', label: 'Enviar para revisão' }];
  if (s.status === 'revisao') return [{ to: 'rascunho', label: 'Retirar da revisão' }];
  return [];
}

/** A session moved to another state: publishing records who approved it. */
export const withClubStatus = (s: VjSession, to: VjStatus, approverName?: string): VjSession => ({
  ...s,
  status: to,
  ...(to === 'publicado' && approverName ? { approvedBy: approverName } : {})
});

/** A new proposal to the club, in the name of its author. */
export const newClubSession = (input: { id: string; authorUid?: string; authorName?: string; now: string }) => ({
  ...newSession({ id: input.id, title: '', authorName: input.authorName, now: input.now }),
  ...(input.authorUid ? { authorUid: input.authorUid } : {})
});

/** «Usar na minha equipa»: the team's own copy, ready to conduct, that remembers where it came from. */
export const clubSessionForTeam = (s: VjSession, newId: string, now: string): VjSession => {
  const { approvedBy: _a, authorUid: _u, ...rest } = s;
  return {
    ...rest,
    id: newId,
    status: 'publicado',
    favorite: false,
    copiedFrom: s.id,
    runs: [],
    createdAt: now,
    updatedAt: now
  };
};

/** The team's copy of a club session, when the team already uses it. */
export const teamCopyOf = (teamSessions: VjSession[], clubSessionId: string): VjSession | undefined =>
  teamSessions.find((t) => t.copiedFrom === clubSessionId && t.status !== 'arquivado');

// ---------- VJ4: the BolaComVisão library ----------
// Sessions prepared by the platform for every club: the platform Administrator publishes or withdraws them; the
// coaches use them (conduct, or copy to their team).

export function platformActions(status: VjStatus): Array<{ to: VjStatus; label: string }> {
  switch (status) {
    case 'rascunho':
    case 'revisao':
      return [{ to: 'publicado', label: 'Publicar para todos os clubes' }];
    case 'publicado':
      return [
        { to: 'rascunho', label: 'Voltar a rascunho' },
        { to: 'arquivado', label: 'Retirar (arquivar)' }
      ];
    case 'arquivado':
      return [{ to: 'publicado', label: 'Publicar de novo' }];
  }
}
