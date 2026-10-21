import React, { useState } from 'react';
import { AppState, Match, OpponentReport } from '../../../types';
import {
  buildOpponentReportText,
  getOpponentMatchFacts,
  linesToList,
  listToLines,
  previousReports
} from '../../../lib/opponentReport';

interface OpponentReportModalProps {
  match: Match;
  state: AppState;
  onSave: (match: Match) => void;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

const field =
  'w-full rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs p-2.5 placeholder-slate-500 focus:outline-none focus:border-cyan-400';

/** 🛡️ Relatório do adversário pós-jogo: the match's numbers about the opponent + the coach's notes. */
export const OpponentReportModal: React.FC<OpponentReportModalProps> = ({
  match,
  state,
  onSave,
  onClose,
  onShowToast
}) => {
  const r = match.opponentReport || {};
  const [system, setSystem] = useState(r.system || '');
  const [strengths, setStrengths] = useState(listToLines(r.strengths));
  const [weaknesses, setWeaknesses] = useState(listToLines(r.weaknesses));
  const [players, setPlayers] = useState(listToLines(r.dangerousPlayers));
  const [notes, setNotes] = useState(r.notes || '');
  const [nextTime, setNextTime] = useState(r.nextTime || '');
  const [busy, setBusy] = useState(false);

  const facts = getOpponentMatchFacts(match);
  const earlier = previousReports(state.matches || [], match.opponent, match.date);

  const current = (): Match => {
    const report: OpponentReport = {
      system: system.trim() || undefined,
      strengths: linesToList(strengths),
      weaknesses: linesToList(weaknesses),
      dangerousPlayers: linesToList(players),
      notes: notes.trim() || undefined,
      nextTime: nextTime.trim() || undefined,
      updatedAt: Date.now(),
      updatedBy: state.currentUser?.name || undefined
    };
    return { ...match, opponentReport: JSON.parse(JSON.stringify(report)) };
  };

  const save = () => {
    onSave(current());
    onShowToast?.(`Relatório do adversário (${match.opponent}) guardado ✓`);
    onClose();
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const { generateOpponentReportPDF } = await import('../../../lib/pdf/createOpponentReport');
      await generateOpponentReportPDF(current(), state);
    } catch {
      onShowToast?.('Não foi possível gerar o PDF.');
    } finally {
      setBusy(false);
    }
  };

  const shareWhatsApp = () =>
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(buildOpponentReportText(current(), state))}`,
      '_blank'
    );

  const stat = (label: string, value: React.ReactNode) => (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2 text-center">
      <div className="text-[10px] text-slate-400 uppercase font-bold">{label}</div>
      <div className="text-sm font-black text-white">{value}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-950 border border-cyan-500/40 p-4 space-y-3 text-left"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Relatório do adversário"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-sm">🛡️ Relatório do adversário: {match.opponent}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white px-2" aria-label="Fechar">
            ✕
          </button>
        </div>

        <section aria-label="Números do jogo" className="space-y-2">
          <div className="text-[11px] font-bold text-cyan-300 uppercase">
            📊 No jogo ({match.date.split('-').reverse().join('/')})
          </div>
          <div className="grid grid-cols-4 gap-2">
            {stat('Resultado', `${facts.scored}-${facts.conceded}`)}
            {stat('Remates', facts.shotsAgainst ?? '—')}
            {stat('Cantos', facts.cornersAgainst ?? '—')}
            {stat('Faltas', facts.opponentFouls ?? '—')}
          </div>
          <div className="text-xs text-slate-300">
            {facts.conceded === 0
              ? 'Não marcaram.'
              : `Golos deles: ${facts.concededGoals
                  .map((g) => [g.minute, g.origin].filter(Boolean).join(' ') || 'sem minuto')
                  .join(' · ')}`}
            {facts.opponentConversion !== null &&
              facts.conceded > 0 &&
              ` (${facts.opponentConversion}% dos remates deram golo)`}
          </div>
        </section>

        <label className="block text-[11px] font-bold text-slate-300 uppercase">
          🧩 Sistema tático
          <input
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            placeholder="ex.: 2-3-1"
            className={`${field} mt-1`}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="block text-[11px] font-bold text-emerald-300 uppercase">
            💪 Pontos fortes
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={3}
              placeholder="Um por linha"
              className={`${field} mt-1`}
            />
          </label>
          <label className="block text-[11px] font-bold text-rose-300 uppercase">
            🎯 Pontos fracos
            <textarea
              value={weaknesses}
              onChange={(e) => setWeaknesses(e.target.value)}
              rows={3}
              placeholder="Um por linha"
              className={`${field} mt-1`}
            />
          </label>
        </div>
        <label className="block text-[11px] font-bold text-amber-300 uppercase">
          ⚠️ Jogadores perigosos
          <textarea
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            rows={2}
            placeholder="Um por linha, ex.: Nº 7 – rápido, finta para dentro"
            className={`${field} mt-1`}
          />
        </label>
        <label className="block text-[11px] font-bold text-slate-300 uppercase">
          📝 Notas
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${field} mt-1`} />
        </label>
        <label className="block text-[11px] font-bold text-cyan-300 uppercase">
          🔁 Para o próximo jogo contra eles
          <textarea
            value={nextTime}
            onChange={(e) => setNextTime(e.target.value)}
            rows={2}
            placeholder="Aparece no Pré-jogo quando voltarmos a defrontá-los"
            className={`${field} mt-1`}
          />
        </label>

        {earlier.length > 0 && (
          <section aria-label="Jogos anteriores" className="rounded-xl border border-slate-800 p-2.5 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-300 uppercase">📚 Jogos anteriores contra eles</div>
            {earlier.map((m) => (
              <div key={m.id} className="text-xs text-slate-300">
                <span className="text-slate-400">{m.date.split('-').reverse().join('/')}:</span>{' '}
                {m.opponentReport?.nextTime ||
                  m.opponentReport?.notes ||
                  (m.opponentReport?.weaknesses || []).join(', ')}
              </div>
            ))}
          </section>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            className="py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={busy}
            className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold disabled:opacity-40"
          >
            {busy ? 'A gerar…' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
          >
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
