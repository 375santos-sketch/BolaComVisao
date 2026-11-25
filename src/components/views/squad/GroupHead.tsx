import React from 'react';

/** The title of a group of athletes ("Médios 10"): normal case, no emoji, the count beside it. */
export const GroupHead: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div className="flex items-center gap-2 px-1">
    <h3 className="text-ui-body font-bold text-ui-text">{label.replace(/^[^\p{L}\d]+/u, '')}</h3>
    <span className="text-ui-caption font-bold tabular-nums text-ui-muted">{count}</span>
  </div>
);
