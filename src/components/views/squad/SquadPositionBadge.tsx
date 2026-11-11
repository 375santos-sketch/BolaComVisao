import React from 'react';

interface SquadPositionBadgeProps {
  posStr?: string;
}

export const SquadPositionBadge: React.FC<SquadPositionBadgeProps> = ({ posStr }) => {
  if (!posStr) return <span className="text-[10px] text-ui-muted font-mono">S/P</span>;

  // Extract short acronym if enclosed in parenthesis or use word
  const match = posStr.match(/\(([^)]+)\)/);
  const label = match ? match[1] : posStr.split(' ')[0] || posStr;

  let colorClass = 'bg-ui-surface-2 text-ui-text border-ui-line-strong';
  const lower = posStr.toLowerCase();

  if (lower.includes('guarda') || lower.includes('gr') || lower.includes('gk')) {
    colorClass = 'bg-ui-warning-soft text-ui-warning border-ui-warning/40';
  } else if (
    lower.includes('defesa') ||
    lower.includes('dc') ||
    lower.includes('lateral') ||
    lower.includes('ld') ||
    lower.includes('le')
  ) {
    colorClass = 'bg-ui-brand-soft text-ui-brand border-ui-brand/40';
  } else if (lower.includes('médio') || lower.includes('mc') || lower.includes('mdf') || lower.includes('mo')) {
    colorClass = 'bg-ui-success-soft text-ui-success border-ui-success/40';
  } else if (
    lower.includes('avançado') ||
    lower.includes('extremo') ||
    lower.includes('pl') ||
    lower.includes('ac') ||
    lower.includes('ed') ||
    lower.includes('ee')
  ) {
    colorClass = 'bg-ui-danger-soft text-ui-danger border-ui-danger/40';
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${colorClass} tracking-wide whitespace-nowrap shadow-sm`}
    >
      {label}
    </span>
  );
};
