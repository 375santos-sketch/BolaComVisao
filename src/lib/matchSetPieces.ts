import { Match } from '../types';

/**
 * Corners and fouls are stored under two names: the live match and the Ficha de Jogo import use `cantos`,
 * `cantosAdv`, `faltas`, `faltasAdv`; the list-style Excel import uses `cornersFor`, `cornersAgainst`,
 * `foulsCommitted`, `foulsSuffered`. The live screen writes the first set (sometimes only that one), so it wins.
 * Undefined means "not recorded", which the analysis keeps apart from 0.
 */
export function getMatchSetPieces(m: Match): {
  cornersFor?: number;
  cornersAgainst?: number;
  foulsCommitted?: number;
  foulsSuffered?: number;
} {
  return {
    cornersFor: m.cantos ?? m.cornersFor,
    cornersAgainst: m.cantosAdv ?? m.cornersAgainst,
    foulsCommitted: m.faltas ?? m.foulsCommitted,
    foulsSuffered: m.faltasAdv ?? m.foulsSuffered
  };
}

/** The match with both sets of names filled in from whichever was recorded. */
export function withUnifiedSetPieces(m: Match): Match {
  const s = getMatchSetPieces(m);
  return {
    ...m,
    cornersFor: s.cornersFor,
    cornersAgainst: s.cornersAgainst,
    foulsCommitted: s.foulsCommitted,
    foulsSuffered: s.foulsSuffered,
    cantos: s.cornersFor,
    cantosAdv: s.cornersAgainst,
    faltas: s.foulsCommitted,
    faltasAdv: s.foulsSuffered
  };
}
