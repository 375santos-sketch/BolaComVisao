import React from 'react';
import { OpponentFile } from '../../../types';
import { fileOf } from '../../../lib/opponents';

/** Pré-jogo: the staff's file on this opponent (Mais → Adversários), when there is one. */
export const OpponentFileCard: React.FC<{ files: OpponentFile[] | undefined; opponent?: string }> = ({
  files,
  opponent
}) => {
  const f = fileOf(files, opponent);
  if (!f) return null;
  const rows: Array<[string, string | undefined]> = [
    ['Formação habitual', f.formation],
    ['Pontos fortes', f.strengths?.join(' · ')],
    ['Pontos fracos', f.weaknesses?.join(' · ')],
    ['Notas', f.notes],
    ['Estratégia', f.strategy]
  ];
  return (
    <section aria-label="Ficha do adversário" className="ui-card space-y-1 p-3 text-xs">
      <div className="ui-kicker">🔭 Ficha de {f.name}</div>
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <p key={k} className="text-ui-text">
            <b className="text-ui-muted">{k}:</b> {v}
          </p>
        ))}
    </section>
  );
};
