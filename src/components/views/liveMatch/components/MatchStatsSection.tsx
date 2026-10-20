import React from 'react';
import { Match } from '../../../../types';

interface MatchStatsSectionProps {
  match: Match;
  onUpdateMatch: (updated: Match) => void;
}

export const MatchStatsSection: React.FC<MatchStatsSectionProps> = ({ match, onUpdateMatch }) => {
  // Remates Favor (Nossa Equipa)
  const rematesDentroArea = match.rematesDentroArea ?? match.shotsInBoxFor ?? 0;
  const rematesForaArea = match.rematesForaArea ?? match.shotsOutBoxFor ?? 0;
  const totalRematesFavor = rematesDentroArea + rematesForaArea;

  // Remates Contra (Adversário)
  const rematesDentroAreaAdv = match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0;
  const rematesForaAreaAdv = match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0;
  const totalRematesContra = rematesDentroAreaAdv + rematesForaAreaAdv;

  // Cantos e Faltas
  const cornersFor = match.cantos ?? match.cornersFor ?? 0;
  const cornersAgainst = match.cantosAdv ?? match.cornersAgainst ?? 0;
  const foulsCommitted = match.faltas ?? match.foulsCommitted ?? 0;
  const foulsSuffered = match.faltasAdv ?? match.foulsSuffered ?? 0;

  const handleStatChange = (
    field:
      | 'rematesDentroArea'
      | 'rematesForaArea'
      | 'rematesDentroAreaAdv'
      | 'rematesForaAreaAdv'
      | 'cornersFor'
      | 'cornersAgainst'
      | 'foulsCommitted'
      | 'foulsSuffered',
    delta: number
  ) => {
    const updated: Partial<Match> = {};

    if (field === 'rematesDentroArea') {
      const next = Math.max(0, rematesDentroArea + delta);
      updated.rematesDentroArea = next;
      updated.shotsInBoxFor = next;
    } else if (field === 'rematesForaArea') {
      const next = Math.max(0, rematesForaArea + delta);
      updated.rematesForaArea = next;
      updated.shotsOutBoxFor = next;
    } else if (field === 'rematesDentroAreaAdv') {
      const next = Math.max(0, rematesDentroAreaAdv + delta);
      updated.rematesDentroAreaAdv = next;
      updated.shotsInBoxAgainst = next;
    } else if (field === 'rematesForaAreaAdv') {
      const next = Math.max(0, rematesForaAreaAdv + delta);
      updated.rematesForaAreaAdv = next;
      updated.shotsOutBoxAgainst = next;
    } else if (field === 'cornersFor') {
      const next = Math.max(0, cornersFor + delta);
      updated.cornersFor = next;
      updated.cantos = next;
    } else if (field === 'cornersAgainst') {
      const next = Math.max(0, cornersAgainst + delta);
      updated.cornersAgainst = next;
      updated.cantosAdv = next;
    } else if (field === 'foulsCommitted') {
      const next = Math.max(0, foulsCommitted + delta);
      updated.foulsCommitted = next;
      updated.faltas = next;
    } else if (field === 'foulsSuffered') {
      const next = Math.max(0, foulsSuffered + delta);
      updated.foulsSuffered = next;
      updated.faltasAdv = next;
    }

    onUpdateMatch({ ...match, ...updated });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Chakra_Petch'] uppercase tracking-wider">
            <span>📊</span>
            <span>Estatísticas de Jogo em Direto</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Registe remates dentro e fora da área, cantos e faltas da partida.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-300">
            Total Remates: <span className="font-bold text-cyan-400">{totalRematesFavor}</span> (Nós) vs{' '}
            <span className="font-bold text-rose-400">{totalRematesContra}</span> (Adv)
          </div>
        </div>
      </div>

      {/* 1. SEÇÃO DE REMATES (DENTRO E FORA DA ÁREA) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-['Chakra_Petch']">
            <span>🎯</span>
            <span>Remates à Baliza (Dentro vs Fora da Área)</span>
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">Exportado no PDF e Excel</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Remates a Favor (Nossa Equipa) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/30 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">Remates a Favor (Nós)</span>
              </div>
              <span className="text-xs font-mono font-black text-white px-2.5 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40">
                Total: {totalRematesFavor}
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Remates a Favor - Dentro da Área */}
              <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">Dentro da Área</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Remates a favor no interior da grande área
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleStatChange('rematesDentroArea', -1)}
                    title="Diminuir"
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs active:scale-90 transition-all border border-slate-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-white text-base font-mono tabular-nums">
                    {rematesDentroArea}
                  </span>
                  <button
                    onClick={() => handleStatChange('rematesDentroArea', 1)}
                    title="Adicionar remate a favor dentro da área"
                    className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center text-xs active:scale-90 transition-all shadow-md shadow-emerald-950"
                  >
                    +1
                  </button>
                </div>
              </div>

              {/* Remates a Favor - Fora da Área */}
              <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-teal-400 block">Fora da Área</span>
                  <span className="text-[10px] text-slate-400 font-mono">Remates a favor de média/longa distância</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleStatChange('rematesForaArea', -1)}
                    title="Diminuir"
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs active:scale-90 transition-all border border-slate-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-white text-base font-mono tabular-nums">
                    {rematesForaArea}
                  </span>
                  <button
                    onClick={() => handleStatChange('rematesForaArea', 1)}
                    title="Adicionar remate a favor fora da área"
                    className="w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center justify-center text-xs active:scale-90 transition-all shadow-md shadow-teal-950"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Remates Contra (Adversário) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-rose-500/30 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                  Remates Contra (Adversário)
                </span>
              </div>
              <span className="text-xs font-mono font-black text-white px-2.5 py-0.5 rounded-lg bg-rose-950/80 border border-rose-500/40">
                Total: {totalRematesContra}
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Remates Contra - Dentro da Área */}
              <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-rose-400 block">Dentro da Área</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Remates sofridos dentro da nossa grande área
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleStatChange('rematesDentroAreaAdv', -1)}
                    title="Diminuir"
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs active:scale-90 transition-all border border-slate-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-white text-base font-mono tabular-nums">
                    {rematesDentroAreaAdv}
                  </span>
                  <button
                    onClick={() => handleStatChange('rematesDentroAreaAdv', 1)}
                    title="Adicionar remate sofrido dentro da área"
                    className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center text-xs active:scale-90 transition-all shadow-md shadow-rose-950"
                  >
                    +1
                  </button>
                </div>
              </div>

              {/* Remates Contra - Fora da Área */}
              <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-orange-400 block">Fora da Área</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Remates sofridos de média/longa distância
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleStatChange('rematesForaAreaAdv', -1)}
                    title="Diminuir"
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs active:scale-90 transition-all border border-slate-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-white text-base font-mono tabular-nums">
                    {rematesForaAreaAdv}
                  </span>
                  <button
                    onClick={() => handleStatChange('rematesForaAreaAdv', 1)}
                    title="Adicionar remate sofrido fora da área"
                    className="w-8 h-8 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-center text-xs active:scale-90 transition-all shadow-md shadow-orange-950"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEÇÃO DE CANTOS E FALTAS */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-['Chakra_Petch']">
          <span>🚩</span>
          <span>Bolas Paradas & Disciplina (Cantos e Faltas)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cantos */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>🚩 Cantos</span>
              <span className="text-white font-mono font-bold">
                {cornersFor} - {cornersAgainst}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-emerald-400 font-medium">A favor</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStatChange('cornersFor', -1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold text-white text-sm tabular-nums">{cornersFor}</span>
                  <button
                    onClick={() => handleStatChange('cornersFor', 1)}
                    className="w-6 h-6 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-red-400 font-medium">Contra</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStatChange('cornersAgainst', -1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold text-white text-sm tabular-nums">{cornersAgainst}</span>
                  <button
                    onClick={() => handleStatChange('cornersAgainst', 1)}
                    className="w-6 h-6 rounded bg-red-700 hover:bg-red-600 text-white font-bold flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Faltas */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>⚠️ Faltas</span>
              <span className="text-white font-mono font-bold">
                {foulsCommitted} - {foulsSuffered}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-amber-400 font-medium">Cometidas</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStatChange('foulsCommitted', -1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold text-white text-sm tabular-nums">{foulsCommitted}</span>
                  <button
                    onClick={() => handleStatChange('foulsCommitted', 1)}
                    className="w-6 h-6 rounded bg-amber-700 hover:bg-amber-600 text-white font-bold flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-blue-400 font-medium">Sofridas</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStatChange('foulsSuffered', -1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold text-white text-sm tabular-nums">{foulsSuffered}</span>
                  <button
                    onClick={() => handleStatChange('foulsSuffered', 1)}
                    className="w-6 h-6 rounded bg-blue-700 hover:bg-blue-600 text-white font-bold flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
