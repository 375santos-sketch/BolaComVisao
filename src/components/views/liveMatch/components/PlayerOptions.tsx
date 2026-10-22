import React from 'react';
import { Player } from '../../../../types';
import { playerLabel } from '../../../../lib/utils';

interface PlayerOptionsProps {
  players: Player[];
  /** Players currently on the pitch: listed in their own group so the coach picks the right one. */
  onPitchIds?: string[];
  /** Bench group first (e.g. the player coming on in a substitution). */
  benchFirst?: boolean;
  optionState?: (p: Player) => { disabled?: boolean; suffix?: string };
}

/** <option>s for a player <select> in the live match, grouped into "Em campo" and "No banco". */
export const PlayerOptions: React.FC<PlayerOptionsProps> = ({ players, onPitchIds, benchFirst, optionState }) => {
  const option = (p: Player) => {
    const extra = optionState?.(p) || {};
    return (
      <option key={p.id} value={p.id} disabled={extra.disabled}>
        {playerLabel(p, 'Sem nome')} {p.number ? `(#${p.number})` : ''}
        {extra.suffix || ''}
      </option>
    );
  };
  if (!onPitchIds || onPitchIds.length === 0) return <optgroup label="Plantel">{players.map(option)}</optgroup>;
  const onPitch = new Set(onPitchIds);
  const groups = [
    <optgroup key="campo" label="Em campo">
      {players.filter((p) => onPitch.has(p.id)).map(option)}
    </optgroup>,
    <optgroup key="banco" label="No banco">
      {players.filter((p) => !onPitch.has(p.id)).map(option)}
    </optgroup>
  ];
  return <>{benchFirst ? groups.reverse() : groups}</>;
};
