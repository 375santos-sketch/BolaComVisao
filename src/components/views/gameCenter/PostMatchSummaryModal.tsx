import React, { useState } from 'react';
import { Match, AppState } from '../../../types';
import { MatchTimeline } from './MatchTimeline';
import { parseMinuteToNumber } from '../../../lib/gameAnalysisUtils';
import { getMatchCompetitionDetails } from '../../../lib/utils';

interface PostMatchSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  myClubName?: string;
  state?: AppState;
  onGeneratePdf?: () => void;
  onGenerateExcel?: () => void;
  onNavigate?: (tab: any, targetId?: string) => void;
}

export const PostMatchSummaryModal: React.FC<PostMatchSummaryModalProps> = ({
  isOpen,
  onClose,
  match,
  myClubName = 'Nossa Equipa',
  state,
  onGeneratePdf,
  onGenerateExcel,
  onNavigate
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const compDetails = getMatchCompetitionDetails(match, state);

  const scoredGoals = (match.goals || []).filter((g) => g.type === 'scored');
  const concededGoals = (match.goals || []).filter((g) => g.type === 'conceded');
  const scoredCount = scoredGoals.length;
  const concededCount = concededGoals.length;

  const isWin = scoredCount > concededCount;
  const isDraw = scoredCount === concededCount;

  // Remates
  const rematesDentroArea = match.rematesDentroArea ?? match.shotsInBoxFor ?? 0;
  const rematesForaArea = match.rematesForaArea ?? match.shotsOutBoxFor ?? 0;
  const totalRematesFavor = rematesDentroArea + rematesForaArea;

  const rematesDentroAreaAdv = match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0;
  const rematesForaAreaAdv = match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0;
  const totalRematesContra = rematesDentroAreaAdv + rematesForaAreaAdv;

  const statusLabel = isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota';
  const statusBadge = isWin
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : isDraw
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  // Analysis of what happened
  let openPlayGoals = 0;
  let setPieceGoals = 0;
  let firstGoalMin: number | null = null;

  if (scoredGoals.length > 0) {
    const sorted = [...scoredGoals].sort(
      (a, b) => (parseMinuteToNumber(a.minute) || 0) - (parseMinuteToNumber(b.minute) || 0)
    );
    firstGoalMin = sorted[0].minute ? parseMinuteToNumber(sorted[0].minute) : null;

    scoredGoals.forEach((g) => {
      const t = (g.goalType || '').toLowerCase();
      if (t.includes('canto') || t.includes('livre') || t.includes('pen') || t.includes('bola parada')) {
        setPieceGoals++;
      } else {
        openPlayGoals++;
      }
    });
  }

  const yellowCards = (match.cards || []).filter((c) => c.color === 'Amarelo' || c.type === 'yellow').length;
  const redCards = (match.cards || []).filter((c) => c.color === 'Vermelho' || c.type === 'red').length;

  // Lista formatada de marcadores da nossa equipa
  const scorersList = scoredGoals.map((g) => {
    const name = g.scorer || 'Jogador';
    const min = g.minute ? `${g.minute}'` : '';
    const assist = g.assist ? ` (assist. ${g.assist})` : '';
    const gt = g.goalType ? ` [${g.goalType}]` : '';
    return `${min ? `${min} ` : ''}${name}${assist}${gt}`;
  });

  // Mensagem para partilha WhatsApp
  const generateWhatsAppMessage = () => {
    const lines = [
      `⚽ *RESUMO DO JOGO | ${myClubName} vs ${match.opponent || 'Adversário'}*`,
      `📅 *Data:* ${match.date || 'Hoje'}`,
      `🏆 *Tipo:* ${compDetails.typeLabel} | *Fase/Jornada:* ${compDetails.faseJornadaText}`,
      `🏅 *Resultado Final:* ${myClubName} ${scoredCount} - ${concededCount} ${match.opponent || 'Adversário'} (${statusLabel.toUpperCase()})`,
      ''
    ];

    if (scorersList.length > 0) {
      lines.push(`⚽ *Golos (${myClubName}):*`);
      scorersList.forEach((s) => lines.push(`• ${s}`));
      lines.push('');
    }

    lines.push(
      `📊 *Estatísticas de Jogo:*`,
      `• Remates (Nós): ${totalRematesFavor} (${rematesDentroArea} dentro da área, ${rematesForaArea} fora da área)`,
      `• Remates (Adv): ${totalRematesContra} (${rematesDentroAreaAdv} dentro da área, ${rematesForaAreaAdv} fora da área)`,
      `• Cantos: ${match.cantos || 0} (Nós) vs ${match.cantosAdv || 0} (Adv)`,
      `• Faltas: ${match.faltas || 0} (Nós) vs ${match.faltasAdv || 0} (Adv)`,
      `• Disciplina: ${yellowCards} Amarelos, ${redCards} Vermelhos`,
      '',
      `💪 _Grande esforço e dedicação de toda a equipa!_`
    );

    return lines.join('\n');
  };

  const handleShareWhatsApp = () => {
    const msg = encodeURIComponent(generateWhatsAppMessage());
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 my-6 max-h-[92vh] overflow-y-auto">
        {/* 1. Header do Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black uppercase text-cyan-400 bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/40">
              Resumo Inteligente Pós-Jogo
            </span>
          </div>
          <span className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-full border ${statusBadge}`}>
            {isWin ? '🟢' : isDraw ? '🟡' : '🔴'} {statusLabel}
          </span>
        </div>

        {/* 1.1 Detalhes da Competição & Agenda */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between text-xs font-mono flex-wrap gap-2 shadow-inner">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Tipo:</span>
            <span className="text-cyan-300 font-bold">{compDetails.typeLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Fase / Jornada:</span>
            <span className="text-amber-300 font-bold">{compDetails.faseJornadaText}</span>
          </div>
          {compDetails.source === 'agenda' ? (
            <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
              📅 Agenda ✓
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
              📋 Ficha
            </span>
          )}
        </div>

        {/* 2. Placar de Destaque */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between shadow-inner">
          <div className="text-center flex-1">
            <span className="text-xs text-slate-400 font-mono uppercase block truncate">{myClubName}</span>
            <div className="text-4xl sm:text-5xl font-black font-mono text-cyan-400 mt-1">{scoredCount}</div>
          </div>

          <div className="px-3 text-2xl font-black text-slate-600 font-mono">—</div>

          <div className="text-center flex-1">
            <span className="text-xs text-slate-400 font-mono uppercase block truncate">
              {match.opponent || 'Adversário'}
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono text-rose-400 mt-1">{concededCount}</div>
          </div>
        </div>

        {/* 3. Marcadores da Partida (se houver) */}
        {scorersList.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block font-['Chakra_Petch']">
              ⚽ Marcadores ({myClubName}):
            </span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {scorersList.map((s, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-xl bg-emerald-900/40 text-emerald-200 border border-emerald-500/30 font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4. Estatísticas Rápidas do Jogo: Remates, Cantos, Faltas */}
        <div className="space-y-2">
          {/* Remates Box */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <span className="text-xs font-bold text-cyan-300 uppercase font-mono">Remates à Baliza:</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400">Nós: </span>
                <span className="font-black text-cyan-400">{totalRematesFavor}</span>{' '}
                <span className="text-[10px] text-slate-500">
                  ({rematesDentroArea} d.área, {rematesForaArea} f.área)
                </span>
              </div>
              <span className="text-slate-600 font-bold">vs</span>
              <div>
                <span className="text-slate-400">Adv: </span>
                <span className="font-black text-rose-400">{totalRematesContra}</span>{' '}
                <span className="text-[10px] text-slate-500">
                  ({rematesDentroAreaAdv} d.área, {rematesForaAreaAdv} f.área)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">🚩 Cantos</span>
              <span className="text-base sm:text-lg font-bold font-mono text-amber-400 mt-0.5 block">
                {match.cantos || 0} – {match.cantosAdv || 0}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Nós vs Adv</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">🚨 Faltas</span>
              <span className="text-base sm:text-lg font-bold font-mono text-rose-400 mt-0.5 block">
                {match.faltas || 0} – {match.faltasAdv || 0}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Nós vs Adv</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">🟨 Cartões</span>
              <span className="text-base sm:text-lg font-bold font-mono text-white mt-0.5 block">
                {yellowCards}A • {redCards}V
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Disciplina</span>
            </div>
          </div>
        </div>

        {/* 5. Resumo Narrativo Inteligente */}
        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block font-['Chakra_Petch'] flex items-center gap-1.5">
            <span>🧠</span>
            <span>Síntese do Treinador:</span>
          </span>
          <p className="text-xs text-slate-200 leading-relaxed">
            {isWin
              ? `Vitória consistente com ${scoredCount} golo${scoredCount > 1 ? 's' : ''} apontado${scoredCount > 1 ? 's' : ''}${firstGoalMin ? ` (inauguração do marcador aos ${firstGoalMin}')` : ''}. Eficácia ofensiva com ${openPlayGoals} golo${openPlayGoals > 1 ? 's' : ''} em jogada corrida${setPieceGoals > 0 ? ` e ${setPieceGoals} de bola parada` : ''}.`
              : isDraw
                ? `Empate a ${scoredCount} golos frente ao ${match.opponent || 'adversário'}. Partida disputada até ao apito final com equilíbrio nos momentos ofensivos.`
                : `Desfecho desfavorável frente ao ${match.opponent || 'adversário'}. Foco na correção dos momentos de transição e concentração defensiva para o próximo compromisso.`}
          </p>
        </div>

        {/* 6. Linha do Tempo */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cronologia de Jogo:</span>
          <div className="max-h-36 overflow-y-auto pr-1">
            <MatchTimeline match={match} />
          </div>
        </div>

        {/* 7. Ações e Partilha */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs font-['Chakra_Petch'] uppercase tracking-wider shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
              title="Partilhar Resumo no WhatsApp"
            >
              <span>📲</span>
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyText}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-slate-700"
              title="Copiar texto do resumo"
            >
              {copied ? '✓ Copiado!' : '📋 Copiar'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onGeneratePdf && (
              <button
                onClick={onGeneratePdf}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs font-['Chakra_Petch'] uppercase tracking-wider transition-colors border border-slate-700 flex items-center gap-1.5"
                title="Descarregar Ficha de Jogo em PDF"
              >
                <span>📄 PDF</span>
              </button>
            )}

            {onGenerateExcel && (
              <button
                onClick={onGenerateExcel}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-bold text-xs font-['Chakra_Petch'] uppercase tracking-wider transition-colors border border-emerald-500/40 flex items-center gap-1.5 active:scale-95"
                title="Descarregar Ficha de Jogo em Excel (.xlsx)"
              >
                <span>📊 Excel</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                if (onNavigate) onNavigate('resultados');
              }}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-['Chakra_Petch'] uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Histórico</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
