import React from 'react';
import { Match, Language } from '../../../../types';
import { t } from '../../../../i18n/dict';

interface LiveMatchScoreProps {
  match: Match;
  myClubName: string;
  lang: Language;
  onOpenAddGoal: () => void;
  onOpenAddConceded: () => void;
  onOpenAddSub: () => void;
  onOpenAddCard: () => void;
  onOpenCaptainModal: () => void;
  captainName?: string | null;
}

export const LiveMatchScore: React.FC<LiveMatchScoreProps> = ({
  match,
  myClubName,
  lang,
  onOpenAddGoal,
  onOpenAddConceded,
  onOpenAddSub,
  onOpenAddCard,
  onOpenCaptainModal,
  captainName
}) => {
  const scored = (match.goals || []).filter((g) => g.type === 'scored').length;
  const conceded = (match.goals || []).filter((g) => g.type === 'conceded').length;
  const locLabel = (match.location || 'casa') === 'casa' ? t(lang, 'match_home') : t(lang, 'match_away');

  return (
    <div className="ui-card p-5 mb-6 relative overflow-hidden">
      {/* Background visual glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            EM DIRETO
          </span>
          <span className="text-xs font-medium text-slate-400">
            {match.type?.toUpperCase()} • {locLabel}
          </span>
          {match.tournamentName && (
            <span className="text-xs text-slate-500 hidden sm:inline">• {match.tournamentName}</span>
          )}
        </div>

        <button
          onClick={onOpenCaptainModal}
          className="ui-btn ui-btn-soft-warning text-xs px-3 py-1 flex items-center gap-1"
        >
          <span>©</span>
          <span>{captainName ? `Capitão: ${captainName}` : 'Definir Capitão'}</span>
        </button>
      </div>

      {/* Main Scoreboard */}
      <div className="grid grid-cols-5 items-center py-4 relative z-10">
        {/* Our Team */}
        <div className="col-span-2 text-center md:text-right pr-2">
          <h2 className="text-lg md:text-2xl font-black text-white truncate drop-shadow-sm">
            {myClubName || t(lang, 'def_club')}
          </h2>
          <span className="text-xs text-emerald-400 font-semibold tracking-wide uppercase">A Nossa Equipa</span>
        </div>

        {/* Score Display */}
        <div className="col-span-1 text-center flex flex-col items-center justify-center">
          <div className="ui-inset inline-flex items-center gap-2 px-4 py-2">
            <span className="text-3xl md:text-5xl font-black text-emerald-400 tabular-nums">{scored}</span>
            <span className="text-xl md:text-2xl font-bold text-slate-500">-</span>
            <span className="text-3xl md:text-5xl font-black text-red-400 tabular-nums">{conceded}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1.5 font-medium">{match.date}</span>
        </div>

        {/* Opponent */}
        <div className="col-span-2 text-center md:text-left pl-2">
          <h2 className="text-lg md:text-2xl font-black text-white truncate drop-shadow-sm">
            {match.opponent || 'Adversário'}
          </h2>
          <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Adversário</span>
        </div>
      </div>

      {/* Quick Action Event Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800/80 relative z-10">
        <button
          onClick={onOpenAddGoal}
          className="ui-btn ui-btn-success flex items-center justify-center gap-2 py-2.5 px-3 text-sm"
        >
          <span className="text-base">⚽</span>
          <span>+ Golo Marcado</span>
        </button>

        <button
          onClick={onOpenAddConceded}
          className="ui-btn ui-btn-soft-danger flex items-center justify-center gap-2 py-2.5 px-3 text-sm"
        >
          <span className="text-base">🛡️</span>
          <span>+ Golo Sofrido</span>
        </button>

        <button
          onClick={onOpenAddSub}
          className="ui-btn ui-btn-primary flex items-center justify-center gap-2 py-2.5 px-3 text-sm"
        >
          <span className="text-base">🔄</span>
          <span>+ Substituição</span>
        </button>

        <button
          onClick={onOpenAddCard}
          className="ui-btn ui-btn-warning flex items-center justify-center gap-2 py-2.5 px-3 text-sm"
        >
          <span className="text-base">🟨</span>
          <span>+ Disciplina</span>
        </button>
      </div>
    </div>
  );
};
