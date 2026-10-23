import { Player, SetPiece, SetPieceRole, SetPieceType } from '../types';
import { uid } from './utils';

/**
 * The team's set-piece book (Pré-jogo / Convocatória → Bolas paradas): rehearsed corners, free kicks, throw-ins…
 * with a drawing and who does each job. For each game the app lists who takes each one among the athletes called
 * up, and warns when someone with a job is not called up.
 */

export const SET_PIECE_TYPES: { id: SetPieceType; label: string; icon: string; roles: string[] }[] = [
  { id: 'canto', label: 'Canto', icon: '🚩', roles: ['Marca', '1.º poste', '2.º poste', 'Entrada da área'] },
  { id: 'livre', label: 'Livre', icon: '🎯', roles: ['Marca', 'Barreira', 'Recarga'] },
  { id: 'lancamento', label: 'Lançamento', icon: '🙌', roles: ['Lança', 'Recebe', 'Apoio'] },
  { id: 'penalti', label: 'Penálti', icon: '⚽', roles: ['Marca', '2.º a marcar'] },
  { id: 'pontape_saida', label: 'Pontapé de saída', icon: '⭕', roles: ['Dá a saída', 'Recebe'] }
];

export const SIDE_LABEL: Record<string, string> = { esquerda: 'esquerda', direita: 'direita', central: 'central' };

export const setPieceType = (t: SetPieceType) => SET_PIECE_TYPES.find((x) => x.id === t) || SET_PIECE_TYPES[0];

export function newSetPiece(type: SetPieceType = 'canto'): SetPiece {
  return {
    id: uid(),
    name: '',
    type,
    roles: setPieceType(type).roles.map((label) => ({ label, playerId: null })),
    createdAt: new Date().toISOString()
  };
}

/** Short title: the name, or "Canto direita" when it has none. */
export function setPieceTitle(sp: SetPiece): string {
  const base = `${setPieceType(sp.type).label}${sp.side ? ` ${SIDE_LABEL[sp.side]}` : ''}`;
  return sp.name.trim() ? `${sp.name.trim()} (${base.toLowerCase()})` : base;
}

export interface RoleLine {
  role: SetPieceRole;
  player?: Player;
  /** The athlete with this job is not called up for the game. */
  missing: boolean;
}

export interface SetPieceAssignment {
  setPiece: SetPiece;
  lines: RoleLine[];
}

/** Who does each job in each set piece in a game with this call-up (only jobs with an athlete). */
export function setPieceAssignments(setPieces: SetPiece[], roster: Player[], callup: string[]): SetPieceAssignment[] {
  const byId = new Map((roster || []).map((p) => [p.id, p]));
  const called = new Set(callup || []);
  return (setPieces || [])
    .filter((sp) => sp && sp.id)
    .map((setPiece) => ({
      setPiece,
      lines: (setPiece.roles || [])
        .filter((r) => r && r.playerId)
        .map((role) => ({ role, player: byId.get(role.playerId!), missing: !called.has(role.playerId!) }))
        .filter((l) => l.player)
    }))
    .filter((a) => a.lines.length > 0);
}
