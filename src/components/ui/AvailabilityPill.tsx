import React from 'react';
import { Player } from '../../types';
import { returnSuffix } from '../../lib/availability';

const LOOK: Record<string, { label: string; cls: string }> = {
  disponivel: { label: 'Disponível', cls: 'ui-badge-success' },
  lesionado: { label: 'Lesionado', cls: 'ui-badge-danger' },
  suspenso: { label: 'Suspenso', cls: 'ui-badge-warning' },
  inativo: { label: 'Inativo', cls: '' }
};

/**
 * The athlete's availability in one pill: "Lesionado até 18/11", "Suspenso até 22/11 · 2 jogos de castigo".
 * `quiet` hides it when the athlete is available (lists stay clean: only what needs attention stands out).
 */
export const AvailabilityPill: React.FC<{ player: Player; quiet?: boolean; withNote?: boolean }> = ({
  player,
  quiet = false,
  withNote = false
}) => {
  const status = player.status || 'disponivel';
  if (quiet && status === 'disponivel') return null;
  const look = LOOK[status] || LOOK.disponivel;
  const until = status === 'disponivel' ? '' : returnSuffix(player);
  const note = withNote && player.statusNote && status !== 'disponivel' ? ` · ${player.statusNote}` : '';
  return (
    <span className={`ui-badge ${look.cls} whitespace-nowrap`}>
      {look.label}
      {until}
      {note}
    </span>
  );
};
