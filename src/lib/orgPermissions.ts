/**
 * F2.5 — What the app lets each person do, the same as the Firestore rules (F2.3) and decisions D1–D4. Accounts
 * without an organization yet keep today's behaviour (the old access) until the strict rules v3.
 */
import { UserAccount, UserClubRole } from '../types';

type OrgUser = Pick<UserAccount, 'orgId' | 'orgRole'> | null | undefined;

/** Staff only reads (D4). */
export const isReadOnlyRole = (user: OrgUser): boolean => Boolean(user?.orgId) && user?.orgRole === 'staff';

/** The club's settings (name, crest, colours, seasons): only who manages the club (owner, admin). */
export const canEditClubSettings = (user: OrgUser): boolean =>
  !user?.orgId || user.orgRole === 'owner' || user.orgRole === 'admin';

const ALL_INVITABLE: UserClubRole[] = [
  'Treinador Principal',
  'Treinador Adjunto',
  'Treinador de Guarda-Redes',
  'Preparador Físico',
  'Analista',
  'Fisioterapeuta',
  'Diretor'
];

/** The roles this person may invite (D3), in the order shown. */
export function invitableRoles(user: OrgUser): UserClubRole[] {
  if (!user?.orgId) return ALL_INVITABLE; // old access: as today (the rules decide)
  switch (user.orgRole) {
    case 'owner':
    case 'admin':
      return ALL_INVITABLE;
    case 'coordenador':
      return ['Treinador Principal', 'Treinador Adjunto'];
    case 'treinador':
      return ['Treinador Adjunto', 'Treinador de Guarda-Redes', 'Preparador Físico', 'Analista', 'Fisioterapeuta'];
    default:
      return [];
  }
}
