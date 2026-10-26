import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { buildMonthlyReport, monthLabel, reportMonths } from '../lib/monthlyReport';
import { AutoTextarea } from './ui/AutoTextarea';

interface MonthlyReportModalProps {
  state: AppState;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/** Mais → Relatório mensal: pick the month, check the summary, add notes for the coordinator and get the PDF. */
const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ state, onShowToast, onClose }) => {
  const months = useMemo(() => reportMonths(state), [state]);
  const [month, setMonth] = useState(months[0] || new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const report = useMemo(() => buildMonthlyReport(state, month), [state, month]);
  const { record, trainings } = report;

  const generate = async () => {
    setBusy(true);
    try {
      const { buildMonthlyReportPDF } = await import('../lib/pdf/createMonthlyReport');
      const { doc, filename } = await buildMonthlyReportPDF(report, state, notes);
      doc.save(filename);
      onShowToast('Relatório mensal criado 📄');
    } catch {
      onShowToast('Não foi possível criar o PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Relatório mensal"
        className="ui-card w-full max-w-md rounded-b-none sm:rounded-2xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">📅 Relatório mensal</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar relatório mensal"
            className="text-slate-400 text-lg"
          >
            ✕
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Para o coordenador: resultados, presenças, minutos por atleta e objetivos trabalhados no mês. Só dados
          desportivos (sem contactos nem notas privadas).
        </p>

        <label className="block text-[11px] text-slate-400">
          Mês
          <select aria-label="Mês" className="ui-input mt-1" value={month} onChange={(e) => setMonth(e.target.value)}>
            {(months.length ? months : [month]).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>

        <div aria-label="Resumo do mês" className="grid grid-cols-2 gap-2 text-center">
          {[
            ['Jogos', `${report.games.length}`, `${record.won}V ${record.drawn}E ${record.lost}D`],
            ['Golos', `${record.goalsFor}-${record.goalsAgainst}`, 'marcados - sofridos'],
            ['Treinos', `${trainings.held}`, 'realizados'],
            ['Assiduidade', trainings.attendance === null ? '—' : `${trainings.attendance}%`, 'média']
          ].map(([label, value, sub]) => (
            <div key={label} className="ui-inset p-2">
              <div className="text-[10px] text-slate-400 uppercase">{label}</div>
              <div className="text-lg font-black text-white">{value}</div>
              <div className="text-[10px] text-slate-500">{sub}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">
          {report.players.length} atletas · {report.objectives.length} objetivo(s) dos planos de treino e pré-jogos
        </p>

        <label className="block text-[11px] text-slate-400">
          Notas para o coordenador (opcional)
          <AutoTextarea
            className="ui-input mt-1 text-xs"
            rows={3}
            value={notes}
            placeholder="Ex: Boa evolução na saída de bola; dois atletas lesionados; pedir mais um campo às quintas…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="ui-btn ui-btn-primary w-full py-2.5 text-sm"
        >
          {busy ? 'A criar o PDF…' : '📄 Gerar PDF'}
        </button>
      </div>
    </div>
  );
};

export default MonthlyReportModal;
