import React, { useState } from 'react';
import { AppState } from '../../../types';
import { queryTeamData, AskDataResponse } from '../../../lib/gameAnalysis/askDataEngine';

interface AskDataSectionProps {
  state: AppState;
}

export const AskDataSection: React.FC<AskDataSectionProps> = ({ state }) => {
  const [queryInput, setQueryInput] = useState('');
  const [currentResponse, setCurrentResponse] = useState<AskDataResponse | null>(() =>
    queryTeamData('Como estamos nos últimos 5 jogos?', state)
  );

  const quickQuestions = [
    'Como estamos nos últimos 5 jogos?',
    'Quando marcamos e sofremos mais golos?',
    'Como é o nosso rendimento de bola parada?',
    'Quem são os jogadores mais decisivos?',
    'Qual é o balanço geral da época?'
  ];

  const handleAsk = (q: string) => {
    if (!q.trim()) return;
    const res = queryTeamData(q, state);
    setCurrentResponse(res);
    setQueryInput(q);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryInput.trim()) {
      handleAsk(queryInput);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl shadow-inner">
            🧠
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
              <span>Perguntar aos Dados</span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-mono">
                Coach Intelligence
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Respostas e análises táticas calculadas exclusivamente com base nos dados reais registados.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Suggestion Pills */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Perguntas Rápidas:
        </span>
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-cyan-300 transition-all text-left"
            >
              💡 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Ex: Como estamos nos últimos jogos? / Rendimento de cantos..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 shrink-0 font-['Chakra_Petch']"
        >
          <span>Consultar</span>
          <span>➔</span>
        </button>
      </form>

      {/* Response Card */}
      {currentResponse && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-4 animate-fadeIn shadow-inner">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <span className="text-xs font-mono text-cyan-400 font-bold">
              🔍 "{currentResponse.query}"
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Dados Verificados ✓</span>
          </div>

          <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
            {currentResponse.summary}
          </p>

          {/* Metrics Grid */}
          {currentResponse.metrics && currentResponse.metrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {currentResponse.metrics.map((m, idx) => {
                const colorClass =
                  m.variant === 'emerald'
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30'
                    : m.variant === 'rose'
                      ? 'text-rose-400 border-rose-500/30 bg-rose-950/30'
                      : m.variant === 'amber'
                        ? 'text-amber-400 border-amber-500/30 bg-amber-950/30'
                        : 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30';
                return (
                  <div key={idx} className={`p-3 rounded-xl border ${colorClass}`}>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider">{m.label}</div>
                    <div className="text-lg font-black font-mono mt-0.5">{m.value}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Key Bullet Points */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pontos-Chave:
            </span>
            <ul className="space-y-1 text-xs text-slate-300">
              {currentResponse.keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0 mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Practical Recommendation */}
          {currentResponse.recommendation && (
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <div>
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide block">
                  Recomendação Técnica:
                </span>
                <span className="text-xs text-cyan-100/90 leading-snug">
                  {currentResponse.recommendation}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
