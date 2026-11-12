import { Match } from '../types';
import { getMatchPhase } from './matchPhaseUtils';

/**
 * 🔔 Avisos do jogo: what the phones of the other coaches are told while a game is being recorded (even with the
 * app closed): the start of the game, every goal and the final score. Each coach chooses which ones in "Avisos do jogo".
 */

export type PushKind = 'inicio' | 'golo' | 'fim';

export interface PushPrefs {
  inicio: boolean;
  golo: boolean;
  fim: boolean;
}

export const DEFAULT_PUSH_PREFS: PushPrefs = { inicio: true, golo: true, fim: true };

/** The public half of the app's VAPID keys (the private one is the server's VAPID_PRIVATE_KEY secret). */
export const VAPID_PUBLIC_KEY =
  'BDqsrXPNsvCzutR2U1dZKyTiC8Isk-05QvOixn4ZRrJB_wZwf20w_ryv7H-K01ZxbMeSoBsrlS21fb-3CchDxMs';

export interface PushMessage {
  /** «relatorio»: the monthly reports (asked for, delivered, sent back); not a game notice, so no preference. */
  kind: PushKind | 'relatorio';
  title: string;
  body: string;
  /** Same tag = the newer notice replaces the older one on the phone (one per game). */
  tag: string;
}

const score = (m: Match) => {
  const ours = (m.goals || []).filter((g) => g.type === 'scored').length;
  return { ours, theirs: (m.goals || []).length - ours };
};

const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || '';

/**
 * The notice for a change of the game (null when the change is not one the coaches are told about). `names` gives the
 * short name of a player by id ("Rui").
 */
export function matchPushMessage(
  before: Match | null | undefined,
  after: Match,
  club: string,
  names: (id: string | null | undefined) => string = () => ''
): PushMessage | null {
  const tag = `jogo-${after.id}`;
  const us = club || 'Nós';
  const { ours, theirs } = score(after);
  const line = `${us} ${ours} – ${theirs} ${after.opponent}`;
  if (!before) return null;
  if (!before.finished && after.finished) return { kind: 'fim', title: '🏁 Fim do jogo', body: line, tag };
  const was = getMatchPhase(before);
  const now = getMatchPhase(after);
  if (was === 'nao_iniciado' && now === 'parte1')
    return { kind: 'inicio', title: '⚽ Começou o jogo', body: `${us} vs ${after.opponent}`, tag };
  const goals = after.goals || [];
  if (goals.length > (before.goals || []).length) {
    const g = goals[goals.length - 1];
    const minute = g.minute !== null && g.minute !== undefined && `${g.minute}` !== '' ? `, ${g.minute}'` : '';
    if (g.type === 'scored') {
      const who = g.scorerId === 'autogolo' ? 'autogolo' : names(g.scorerId) || firstName(g.scorer);
      return {
        kind: 'golo',
        title: `⚽ Golo! ${us} ${ours} – ${theirs}`,
        body: `${who ? `${who}${minute}` : minute.slice(2)} · vs ${after.opponent}`.replace(/^ · /, ''),
        tag
      };
    }
    return {
      kind: 'golo',
      title: `Golo sofrido · ${ours} – ${theirs}`,
      body: `${line}${minute ? ` (${minute.slice(2)})` : ''}`,
      tag
    };
  }
  return null;
}

/** The preferences saved on a phone, cleaned (missing ones are on). */
export function cleanPrefs(raw: unknown): PushPrefs {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    inicio: r.inicio !== false,
    golo: r.golo !== false,
    fim: r.fim !== false
  };
}

// ---------- On the app's server (/api/avisar) ----------

interface NoticeRequest {
  clubId: string;
  teamId: string;
  kind: PushKind | 'relatorio' | 'teste';
  title: string;
  body: string;
  tag: string;
  /**
   * "Também dos jogos que eu registo": the other phones and tablets of the coach recording the game get the notice
   * too (never the phone that sends it, `fromSubscriptionId`).
   */
  alsoMine: boolean;
  fromSubscriptionId?: string;
}

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** The notice asked for by a phone, checked (null when it is not a valid one). */
export function cleanNoticeRequest(raw: unknown): NoticeRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const kind = r.kind;
  if (kind !== 'inicio' && kind !== 'golo' && kind !== 'fim' && kind !== 'relatorio' && kind !== 'teste') return null;
  const clubId = txt(r.clubId, 128);
  const teamId = txt(r.teamId, 128);
  const title = txt(r.title, 80);
  if (!ID.test(clubId) || !ID.test(teamId) || !title) return null;
  const from = txt(r.fromSubscriptionId, 128);
  return {
    clubId,
    teamId,
    kind,
    title,
    body: txt(r.body, 160),
    tag: txt(r.tag, 80) || 'bolacomvisao',
    alsoMine: kind !== 'teste' && r.alsoMine === true,
    fromSubscriptionId: ID.test(from) ? from : undefined
  };
}

interface StoredSubscription {
  id: string;
  uid: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  prefs: PushPrefs;
  teamIds: string[];
}

/** A subscription document read from Firestore (null when incomplete). */
export function cleanSubscription(id: string, raw: unknown): StoredSubscription | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  if (typeof r.uid !== 'string' || typeof r.endpoint !== 'string' || !/^https:\/\//.test(r.endpoint)) return null;
  if (typeof r.keys?.p256dh !== 'string' || typeof r.keys?.auth !== 'string') return null;
  return {
    id,
    uid: r.uid,
    endpoint: r.endpoint,
    keys: { p256dh: r.keys.p256dh, auth: r.keys.auth },
    prefs: cleanPrefs(r.prefs),
    teamIds: Array.isArray(r.teamIds) ? r.teamIds.filter((t: unknown) => typeof t === 'string') : []
  };
}

/**
 * Who gets the notice: the other coaches of the team who want this kind. The one who sent it gets it only on their
 * other phones and tablets, and only when they asked for it ("Também dos jogos que eu registo"); never on the phone
 * that sends it. A test notice goes only to the phones of whoever asked for it.
 */
export function subscriptionsToNotify(
  subs: StoredSubscription[],
  senderUid: string,
  notice: Pick<NoticeRequest, 'kind' | 'teamId'> & Partial<Pick<NoticeRequest, 'alsoMine' | 'fromSubscriptionId'>>
): StoredSubscription[] {
  if (notice.kind === 'teste') return subs.filter((s) => s.uid === senderUid);
  return subs.filter(
    (s) =>
      (s.uid !== senderUid || (notice.alsoMine === true && s.id !== notice.fromSubscriptionId)) &&
      (notice.kind === 'relatorio' || s.prefs[notice.kind as PushKind]) &&
      (s.teamIds.length === 0 || s.teamIds.includes(notice.teamId))
  );
}

/** What the test notice did, in words (the reason when the phone's push service refused it). */
export function testResult(r: { sent: number; phones: number; failed: Array<{ status: number; reason: string }> }) {
  if (r.sent)
    return `Aviso enviado e aceite pelo serviço de avisos do telemóvel (${r.sent}). Se não tocou, veja Definições → Notificações → BolaComVisão e o modo Foco.`;
  if (!r.phones) return 'Este telemóvel não aparece registado: desligue e volte a ligar os avisos e tente outra vez.';
  const f = r.failed[0];
  if (f && (f.status === 403 || /BadJwtToken|VapidPkHashMismatch/i.test(f.reason)))
    return `O serviço de avisos recusou a chave da app (código ${f.status}). Desligue e volte a ligar os avisos neste telemóvel.`;
  return `O serviço de avisos do telemóvel recusou o aviso${f ? ` (código ${f.status || '?'}${f.reason ? `: ${f.reason}` : ''})` : ''}.`;
}
