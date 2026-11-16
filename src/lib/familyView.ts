import { AppState, Player, VjSession } from '../types';
import { sessionsOf } from './vjLibrary';
import { calendarEventsOf } from '../hooks/useCalendarPublisher';

/**
 * E1 — Contas dos encarregados: «O meu educando». The guardian NEVER reads the club's data: the coaches' phones
 * publish, for each accepted invitation, a page with only what the family may see (E1 decisions): the next games and
 * trainings, whether the child was called up, the child's own training attendance (not the minutes) and the
 * coach's season message. Never notes, evaluations, contacts, other athletes, line-ups or minutes.
 */

export const GUARDIANS_PER_ATHLETE = 2;
export const INVITE_DAYS = 7;

export interface GuardianInvite {
  id: string; // the secret code
  clubId: string;
  teamId: string;
  athleteId: string;
  athleteName: string;
  teamName: string;
  clubName: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'revoked' | 'left';
  acceptedBy?: string;
  acceptedAt?: number;
  consentData?: boolean;
  consentVideo?: boolean;
  consentAt?: number;
  revokedAt?: number;
  revokedBy?: string;
}

export interface FamilyEvent {
  kind: 'jogo' | 'treino';
  date: string;
  time?: string;
  title: string;
  location?: string;
  /** Games only, once the call-up is closed: whether THIS child was called up. */
  calledUp?: boolean;
}

export interface FamilyView {
  athleteName: string;
  teamName: string;
  clubName: string;
  season: string;
  next: FamilyEvent[];
  trainings: { attended: number; total: number };
  seasonMessage?: string;
  /** VJ6: the team's published Visão de Jogo sessions (the latest 5), to watch at home. Only the videos and the
   *  questions: never the runs nor who was there. */
  vjSessions?: VjSession[];
  updatedAt: number;
}

export const FAMILY_SESSIONS = 5;

/** The latest published sessions of the team, stripped to what a family may see. */
export function familySessionsOf(sessions: VjSession[]): VjSession[] {
  return sessions
    .filter((s) => s.status === 'publicado' && s.items.length > 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, FAMILY_SESSIONS)
    .map((s) => ({
      id: s.id,
      format: 'sessao',
      title: s.title,
      ...(s.objective ? { objective: s.objective } : {}),
      competencies: s.competencies,
      status: 'publicado',
      items: s.items.map((i) => ({
        id: i.id,
        kind: i.kind,
        youtubeId: i.youtubeId,
        ...(i.label ? { label: i.label } : {}),
        pauses: i.pauses || []
      })),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));
}

/** The invitations that still hold a place (at most 2 per athlete). */
export const activeInvites = (invites: GuardianInvite[], now = Date.now()) =>
  invites.filter((i) => i.status === 'accepted' || (i.status === 'pending' && i.expiresAt > now));

export const canInviteMore = (invites: GuardianInvite[], athleteId: string, now = Date.now()) =>
  activeInvites(
    invites.filter((i) => i.athleteId === athleteId),
    now
  ).length < GUARDIANS_PER_ATHLETE;

/** Who may invite a guardian (E1 decision: the coach or the director; owners/admins manage the club). */
export const canInviteGuardians = (user: { orgId?: string; orgRole?: string } | null | undefined) =>
  !!user && (!user.orgId || ['owner', 'admin', 'diretor', 'treinador'].includes(user.orgRole || ''));

/** The page of one athlete for the family: only the fields above, computed from the coach's state. */
export function familyViewOf(state: AppState, player: Player, today = new Date()): FamilyView {
  const day = today.toISOString().slice(0, 10);
  const games = new Map((state.schedule || []).map((g) => [g.id, g]));
  const next: FamilyEvent[] = calendarEventsOf(state, today)
    .filter((e) => (e.kind === 'jogo' || e.kind === 'treino') && e.date >= day)
    .slice(0, 6)
    .map((e) => {
      const game = e.kind === 'jogo' ? games.get(e.uid.replace(/^jogo-/, '')) : undefined;
      return {
        kind: e.kind as 'jogo' | 'treino',
        date: e.date,
        ...(e.time ? { time: e.time } : {}),
        title: e.title,
        ...(e.location ? { location: e.location } : {}),
        ...(game?.callupFinalized ? { calledUp: (game.callup || []).includes(player.id) } : {})
      };
    });
  const done = (state.trainings || []).filter(
    (t) => t.date.slice(0, 10) <= day && t.completed !== false && (!t.season || t.season === state.season)
  );
  const message = player.seasonMessages?.[state.season]?.trim();
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const vjSessions = familySessionsOf(sessionsOf(team));
  return {
    athleteName: player.name,
    teamName: [state.category].filter(Boolean).join(' ') || 'Equipa',
    clubName: state.myClubName || '',
    season: state.season || '',
    next,
    trainings: { attended: done.filter((t) => !(t.absences || []).includes(player.id)).length, total: done.length },
    ...(message ? { seasonMessage: message.slice(0, 2000) } : {}),
    ...(vjSessions.length ? { vjSessions } : {}),
    updatedAt: today.getTime()
  };
}

/** WhatsApp text with the invitation (the code goes in the link; it is used once and expires in 7 days). */
export const inviteMessage = (invite: Pick<GuardianInvite, 'id' | 'athleteName' | 'clubName'>, origin: string) =>
  `Olá! Convite do ${invite.clubName || 'clube'} para acompanhar ${invite.athleteName} na app BolaComVisão ` +
  `(próximos jogos e treinos, presenças). Abra e crie a sua conta de encarregado de educação: ` +
  `${origin}/encarregado?c=${invite.id} (válido ${INVITE_DAYS} dias, só pode ser usado uma vez).`;
