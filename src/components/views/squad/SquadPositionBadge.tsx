import React from 'react';

interface SquadPositionBadgeProps {
  posStr?: string;
}

export const SquadPositionBadge: React.FC<SquadPositionBadgeProps> = ({ posStr }) => {
  if (!posStr) return <span className="text-[10px] text-slate-500 font-mono">S/P</span>;

  // Extract short acronym if enclosed in parenthesis or use word
  const match = posStr.match(/\(([^)]+)\)/);
  const label = match ? match[1] : posStr.split(' ')[0] || posStr;

  let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';
  const lower = posStr.toLowerCase();

  if (lower.includes('guarda') || lower.includes('gr') || lower.includes('gk')) {
    colorClass = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
  } else if (
    lower.includes('defesa') ||
    lower.includes('dc') ||
    lower.includes('lateral') ||
    lower.includes('ld') ||
    lower.includes('le')
  ) {
    colorClass = 'bg-blue-950/80 text-blue-300 border-blue-500/40';
  } else if (lower.includes('médio') || lower.includes('mc') || lower.includes('mdf') || lower.includes('mo')) {
    colorClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
  } else if (
    lower.includes('avançado') ||
    lower.includes('extremo') ||
    lower.includes('pl') ||
    lower.includes('ac') ||
    lower.includes('ed') ||
    lower.includes('ee')
  ) {
    colorClass = 'bg-rose-950/80 text-rose-300 border-rose-500/40';
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${colorClass} tracking-wide whitespace-nowrap shadow-sm`}
    >
      {label}
    </span>
  );
};
