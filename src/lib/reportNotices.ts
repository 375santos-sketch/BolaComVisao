import { AppState } from '../types';
import { workspaceIdOf } from './deviceCache';
import { sendNotice } from '../services/push';

/**
 * 📑 A phone notice about a monthly report (asked for by the coordinator, delivered by the coach, sent back for
 * corrections) to the team's phones, with the notices the app already has. Never gets in the way: the result says how
 * many phones got it, or why it was not sent.
 */
export async function notifyReport(
  state: Pick<AppState, 'currentUser'>,
  teamId: string,
  title: string,
  body: string,
  month: string
): Promise<{ ok: boolean; sent: number; error?: string }> {
  try {
    const r = await sendNotice(workspaceIdOf(state.currentUser), teamId, {
      kind: 'relatorio',
      title,
      body,
      tag: `relatorio-${teamId}-${month}`
    });
    return { ok: true, sent: r.sent };
  } catch (err) {
    return { ok: false, sent: 0, error: (err as Error).message };
  }
}
