import { AppState, CoachSignature } from '../types';

/** ✍️ Assinatura nos documentos: the coach's own signature (per user account) and the PDFs it is added to. */

export type SignatureDoc = CoachSignature['docs'][number];

export const SIGNATURE_DOCS: { id: SignatureDoc; label: string }[] = [
  { id: 'convocatoria', label: 'Convocatória' },
  { id: 'relatorios', label: 'Relatório mensal' },
  { id: 'fim_epoca', label: 'Relatório de fim de época' },
  { id: 'curriculo', label: 'Currículo de treinador' }
];

const PNG = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
/** Well below the club document's limit. */
export const MAX_SIGNATURE_LENGTH = 120_000;

type SignatureState = Pick<AppState, 'coachSignatures' | 'currentUser'>;

export const signatureOf = (state: SignatureState): CoachSignature | null => {
  const s = state.currentUser?.id ? state.coachSignatures?.[state.currentUser.id] : undefined;
  return s && PNG.test(s.image) ? s : null;
};

/** The image to put on this kind of document, or null when the coach did not choose it. */
export const signatureFor = (state: SignatureState, doc: SignatureDoc): string | null => {
  const s = signatureOf(state);
  return s && s.docs.includes(doc) ? s.image : null;
};

/** The state with this user's signature replaced (null removes it); other coaches' signatures stay. */
export function withSignature(state: SignatureState, signature: CoachSignature | null) {
  const id = state.currentUser?.id;
  if (!id) return {};
  const all = { ...(state.coachSignatures || {}) };
  if (signature && PNG.test(signature.image) && signature.image.length <= MAX_SIGNATURE_LENGTH) all[id] = signature;
  else delete all[id];
  return { coachSignatures: all };
}
