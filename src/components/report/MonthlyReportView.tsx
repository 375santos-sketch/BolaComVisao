import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppState, MonthlyReportRecord } from '../../types';
import {
  COACH_STATUSES,
  REPORT_DIMENSIONS,
  REPORT_LEVELS,
  REPORT_NEXT_FIELDS,
  REPORT_STATUS_LABEL,
  REPORT_TEXT_FIELDS,
  buildMonthlyActivityReport,
  emptyReportRecord
} from '../../lib/monthlyActivityReport';
import { monthLabel, reportMonths } from '../../lib/monthlyReport';
import { signatureFor } from '../../lib/signature';
import { localDateISO } from '../../lib/trainingQuick';
import { reportFilename } from '../../lib/pdf/reportPagesPdf';
import { ReportPages } from './ReportPages';
import { PdfExport, ScaledPreview } from './ReportExport';
import { canReviewReports } from '../../lib/permissionsEngine';
import { notifyReport } from '../../lib/reportNotices';
import './monthlyReport.css';

interface Props {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onSwitchTeam: () => void;
  onClose: () => void;
}

type Tab = 'dados' | 'avaliacao' | 'previa';

const Card: React.FC<{ title: React.ReactNode; label: string; children: React.ReactNode }> = ({
  title,
  label,
  children
}) => (
  <section aria-label={label} className="ui-card space-y-2.5 p-3.5">
    <h3 className="flex items-center gap-2 text-ui-body font-extrabold text-ui-text">{title}</h3>
    {children}
  </section>
);

/**
 * 📑 Relatórios → Relatório mensal: the month's trainings, games and athletes from the app, what is missing, the
 * coach's analysis (saved per month in the team), the report's state, an A4 preview and the PDF for the coordinator.
 */
const MonthlyReportView: React.FC<Props> = ({ state, onUpdateState, onShowToast, onSwitchTeam, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const months = useMemo(() => {
    const list = reportMonths(state);
    const current = localDateISO().slice(0, 7);
    return list.includes(current) ? list : [current, ...list].sort((a, b) => b.localeCompare(a));
  }, [state]);
  const [month, setMonth] = useState(() => reportMonths(state)[0] || localDateISO().slice(0, 7));
  const report = useMemo(() => buildMonthlyActivityReport(state, month), [state, month]);
  const saved = useMemo(
    () => (team?.monthlyReports || []).find((r) => r.month === month) || emptyReportRecord(month),
    [team, month]
  );
  const [draft, setDraft] = useState<MonthlyReportRecord>(saved);
  const [tab, setTab] = useState<Tab>('dados');
  const [athleteId, setAthleteId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState<'pdf' | 'print' | null>(null);
  const coachName = state.currentUser?.name || '';
  const signature = signatureFor(state, 'relatorios');
  const reviewer = canReviewReports(state.currentUser);

  // Another month (or a change from another device while nothing is being typed): show the saved version
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setDraft(saved);
  }, [saved]);

  const changeMonth = (m: string) => {
    if (dirty.current) persist(draft);
    dirty.current = false;
    setMonth(m);
    setDraft((team?.monthlyReports || []).find((r) => r.month === m) || emptyReportRecord(m));
  };

  const persist = (rec: MonthlyReportRecord) => {
    if (!team) return;
    const now = new Date().toISOString();
    const withDate = { ...rec, createdAt: rec.createdAt || now, updatedAt: now };
    const others = (team.monthlyReports || []).filter((r) => r.id !== rec.id);
    onUpdateState({
      teams: (state.teams || []).map((t) => (t.id === team.id ? { ...t, monthlyReports: [...others, withDate] } : t))
    });
    dirty.current = false;
  };

  // The coach's text is saved a moment after typing stops
  useEffect(() => {
    if (!dirty.current) return;
    const id = window.setTimeout(() => persist(draft), 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const edit = (fn: (r: MonthlyReportRecord) => MonthlyReportRecord) => {
    dirty.current = true;
    setDraft((r) => fn(r));
  };

  const setStatus = (status: MonthlyReportRecord['status']) => {
    const now = new Date().toISOString();
    const again = draft.status === 'devolvido' || draft.status === 'revisto';
    const rec: MonthlyReportRecord = {
      ...draft,
      status,
      validatedAt: status === 'rascunho' ? undefined : draft.validatedAt || now,
      validatedBy: status === 'rascunho' ? undefined : draft.validatedBy || coachName || undefined,
      deliveredAt: status === 'entregue' ? (again ? now : draft.deliveredAt || now) : undefined,
      // delivered again after corrections: the coordinator reviews it anew
      reviewedAt: status === 'entregue' && again ? undefined : draft.reviewedAt,
      reviewedBy: status === 'entregue' && again ? undefined : draft.reviewedBy
    };
    setDraft(rec);
    persist(rec);
    onShowToast(`Relatório: ${REPORT_STATUS_LABEL[status]}`);
    if (status === 'entregue' && team) {
      notifyReport(
        state,
        team.id,
        `Relatório de ${report.label} entregue`,
        `${report.team}${coachName ? ` · ${coachName}` : ''}`,
        month
      );
    }
  };

  const close = () => {
    if (dirty.current) persist(draft);
    onClose();
  };

  // Print: only the pages (see .mr-print-root in monthlyReport.css)
  useEffect(() => {
    if (busy !== 'print') return;
    const html = document.documentElement;
    html.classList.add('mr-printing');
    const done = () => {
      html.classList.remove('mr-printing');
      setBusy(null);
    };
    window.addEventListener('afterprint', done, { once: true });
    const id = window.setTimeout(() => window.print(), 300);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('afterprint', done);
      html.classList.remove('mr-printing');
    };
  }, [busy]);

  const pages = (
    <ReportPages report={report} record={draft} coachName={coachName} athleteId={athleteId} signature={signature} />
  );
  const sel = report.athletes.find((a) => a.id === athleteId) || report.athletes[0];
  const field = 'ui-input w-full text-ui-caption';

  const dataPanel = (
    <div className="space-y-3">
      <Card label="Equipa e mês" title="1 · Equipa e mês">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-ui-caption font-bold text-ui-muted">Equipa</p>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-ui-caption font-bold text-ui-text">
                {report.team || '—'}
              </span>
              <button
                type="button"
                onClick={onSwitchTeam}
                className="ui-btn ui-btn-secondary shrink-0 px-2 py-1.5 text-[11px]"
              >
                Trocar
              </button>
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-ui-caption font-bold text-ui-muted">Mês</span>
            <select aria-label="Mês" className={field} value={month} onChange={(e) => changeMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card label="Dados recolhidos" title="2 · Dados recolhidos">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              [report.summary.trainingsHeld, 'treinos realizados'],
              [report.summary.games, 'jogos'],
              [report.summary.attendance === null ? '—' : `${report.summary.attendance}%`, 'assiduidade'],
              [`${report.summary.competitionMinutes}'`, 'de competição']
            ] as const
          ).map(([v, l]) => (
            <div key={l} className="ui-inset flex flex-col p-2.5">
              <strong className="text-[20px] leading-tight text-ui-brand">{v}</strong>
              <span className="text-[11px] text-ui-muted">{l}</span>
            </div>
          ))}
        </div>
        <p className="text-ui-caption text-ui-muted">
          Recolhido de Planeamento (treinos e presenças), Jogo (resultados, titulares, substituições, golos, cartões e
          estatísticas) e Plantel (atletas e posições). Os números não são guardados no relatório: são sempre
          calculados.
        </p>
        {report.athletes.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-ui-caption font-bold text-ui-muted">
              Consultar atleta (aparece na ficha individual do relatório)
            </span>
            <select
              aria-label="Consultar atleta"
              className={field}
              value={sel?.id}
              onChange={(e) => setAthleteId(e.target.value)}
            >
              {report.athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.number ?? ''} {a.name} — {a.trainingsPresent}/{a.trainingsHeld} treinos · {a.minutes}' em jogo
                </option>
              ))}
            </select>
          </label>
        )}
      </Card>

      <Card
        label="Informação em falta"
        title={
          <>
            3 · Informação em falta
            {report.missing.length > 0 && <span className="ui-badge ui-badge-warning">{report.missing.length}</span>}
          </>
        }
      >
        {report.missing.length ? (
          <ul className="space-y-1.5">
            {report.missing.map((m, i) => (
              <li key={i} className="ui-inset flex gap-2 p-2 text-ui-caption leading-snug text-ui-text">
                <span aria-hidden className={m.level === 'aviso' ? 'text-ui-warning' : 'text-ui-brand'}>
                  {m.level === 'aviso' ? '⚠' : 'ℹ'}
                </span>
                {m.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ui-caption text-ui-success">Nada em falta neste mês ✓</p>
        )}
        <p className="text-ui-caption text-ui-muted">
          A aplicação não preenche nada disto: completa-se no módulo de origem (treino, jogo) ou fica assinalado.
        </p>
      </Card>
    </div>
  );

  const evalPanel = (
    <div className="space-y-3">
      <Card label="Análise e desenvolvimento" title="4 · Análise e desenvolvimento">
        {REPORT_TEXT_FIELDS.map(([k, label]) => (
          <label key={k} className="block">
            <span className="mb-1 block text-ui-caption font-bold text-ui-muted">{label}</span>
            <textarea
              rows={k === 'evolucao' ? 3 : 2}
              className={field}
              value={draft.texts?.[k] || ''}
              onChange={(e) => {
                const v = e.target.value;
                edit((r) => ({ ...r, texts: { ...r.texts, [k]: v } }));
              }}
            />
          </label>
        ))}
      </Card>
      <Card label="Avaliação por dimensões" title="5 · Avaliação por dimensões">
        <p className="text-ui-caption text-ui-muted">
          Da responsabilidade do treinador; nunca calculada a partir das estatísticas.
        </p>
        {REPORT_DIMENSIONS.map((d) => (
          <div key={d} className="space-y-1">
            <p className="text-ui-caption font-bold text-ui-text">{d}</p>
            <div role="radiogroup" aria-label={d} className="ui-inset flex flex-wrap gap-1 p-1">
              {REPORT_LEVELS.map((l, i) => {
                const on = draft.dims?.[d] === i;
                return (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() =>
                      edit((r) => {
                        const dims = { ...(r.dims || {}) };
                        if (dims[d] === i) delete dims[d];
                        else dims[d] = i;
                        return { ...r, dims };
                      })
                    }
                    className={`flex-1 rounded-ui-sm px-2 py-1.5 text-[11px] font-bold ${
                      on ? 'bg-ui-brand text-ui-brand-ink' : 'text-ui-muted hover:text-ui-text'
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>
      <Card label="Planeamento do mês seguinte" title="6 · Planeamento do mês seguinte">
        {REPORT_NEXT_FIELDS.map(([k, label]) => (
          <label key={k} className="block">
            <span className="mb-1 block text-ui-caption font-bold text-ui-muted">{label}</span>
            <textarea
              rows={2}
              className={field}
              value={draft.next?.[k] || ''}
              onChange={(e) => {
                const v = e.target.value;
                edit((r) => ({ ...r, next: { ...r.next, [k]: v } }));
              }}
            />
          </label>
        ))}
        {report.nextMonth.objectives.length > 0 && (
          <p className="text-ui-caption text-ui-muted">
            Objetivos de {report.nextMonth.label} escritos em Época: {report.nextMonth.objectives.join(' · ')} (entram
            no relatório).
          </p>
        )}
      </Card>
      <Card label="Coordenação" title="7 · Observações do coordenador">
        {reviewer ? (
          <textarea
            rows={2}
            aria-label="Observações do coordenador"
            className={field}
            value={draft.coordinatorNotes || ''}
            onChange={(e) => {
              const v = e.target.value;
              edit((r) => ({ ...r, coordinatorNotes: v }));
            }}
          />
        ) : (
          <p className={`text-ui-caption ${draft.coordinatorNotes?.trim() ? 'text-ui-text' : 'text-ui-muted'}`}>
            {draft.coordinatorNotes?.trim() || 'Escritas pelo coordenador quando rever o relatório.'}
          </p>
        )}
      </Card>
    </div>
  );

  const hideNarrow = (show: boolean) => (show ? '' : 'max-xl:hidden');

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] overflow-y-auto bg-ui-bg">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Relatórios"
        className="mx-auto max-w-[1600px] px-3 pb-24 sm:px-5"
      >
        <header className="sticky top-0 z-10 -mx-3 flex flex-wrap items-center gap-2 border-b border-ui-line bg-ui-bg/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
          <button
            type="button"
            onClick={close}
            aria-label="Fechar relatórios"
            className="ui-btn ui-btn-secondary h-10 w-10 shrink-0"
          >
            ✕
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="bcv-title text-[26px] leading-none">Relatórios</h2>
            <p className="truncate text-ui-caption text-ui-muted">
              Relatório mensal · {report.team} · {report.label}
            </p>
          </div>
          <div role="group" aria-label="Estado do relatório" className="ui-inset flex gap-0.5 p-1 max-sm:w-full">
            {COACH_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={draft.status === s}
                onClick={() => draft.status !== s && setStatus(s)}
                className={`flex-1 rounded-ui-sm px-2.5 py-1.5 text-[11px] font-bold ${
                  draft.status === s ? 'bg-ui-brand-soft text-ui-brand' : 'text-ui-muted hover:text-ui-text'
                }`}
              >
                {REPORT_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 max-sm:w-full">
            <button
              type="button"
              onClick={() => setBusy('print')}
              disabled={busy !== null}
              className="ui-btn ui-btn-secondary px-3 py-2 text-ui-caption max-sm:flex-1"
            >
              Imprimir
            </button>
            <button
              type="button"
              onClick={() => setBusy('pdf')}
              disabled={busy !== null}
              className="ui-btn ui-btn-primary px-4 py-2 text-ui-caption max-sm:flex-1"
            >
              {busy === 'pdf' ? 'A criar o PDF…' : 'Gerar PDF'}
            </button>
          </div>
        </header>

        {(draft.status === 'devolvido' || draft.status === 'revisto') && (
          <div
            role="status"
            className={`mt-3 rounded-ui border-l-4 p-3 text-ui-caption ${
              draft.status === 'devolvido' ? 'border-ui-warning bg-ui-warning-soft' : 'border-ui-brand bg-ui-brand-soft'
            }`}
          >
            <p className="font-extrabold text-ui-text">
              {draft.status === 'devolvido'
                ? `Devolvido pelo coordenador${draft.returnedAt ? ` a ${draft.returnedAt.slice(8, 10)}/${draft.returnedAt.slice(5, 7)}` : ''}`
                : `Revisto pelo coordenador${draft.reviewedAt ? ` a ${draft.reviewedAt.slice(8, 10)}/${draft.reviewedAt.slice(5, 7)}` : ''}`}
            </p>
            {draft.coordinatorNotes?.trim() && <p className="mt-1 text-ui-text">«{draft.coordinatorNotes.trim()}»</p>}
            {draft.status === 'devolvido' && (
              <p className="mt-1 text-ui-muted">Corrija e volte a entregar (Entregue ao coordenador).</p>
            )}
          </div>
        )}

        <nav aria-label="Partes do relatório" className="ui-inset my-3 flex gap-1 p-1 xl:hidden">
          {(
            [
              ['dados', 'Dados e falhas'],
              ['avaliacao', 'Avaliação'],
              ['previa', 'Pré-visualização']
            ] as [Tab, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={tab === k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-ui-sm px-2 py-2 text-ui-caption font-bold ${
                tab === k ? 'bg-ui-brand-soft text-ui-brand' : 'text-ui-muted'
              }`}
            >
              {l}
            </button>
          ))}
        </nav>

        <div className="grid gap-5 pt-3 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:items-start">
          <aside
            className={`space-y-3 xl:sticky xl:top-[88px] xl:max-h-[calc(100dvh-110px)] xl:overflow-y-auto ${hideNarrow(tab !== 'previa')}`}
          >
            <div className={hideNarrow(tab === 'dados')}>{dataPanel}</div>
            <div className={hideNarrow(tab === 'avaliacao')}>{evalPanel}</div>
          </aside>
          <section aria-label="Pré-visualização do relatório" className={`min-w-0 ${hideNarrow(tab === 'previa')}`}>
            <ScaledPreview>{pages}</ScaledPreview>
          </section>
        </div>
      </div>

      {busy === 'pdf' && (
        <PdfExport
          filename={reportFilename(report.club, month)}
          onDone={(ok) => {
            setBusy(null);
            onShowToast(ok ? 'Relatório mensal criado 📄' : 'Não foi possível criar o PDF.');
          }}
        >
          {pages}
        </PdfExport>
      )}
      {busy === 'print' && createPortal(<div className="mr-print-root">{pages}</div>, document.body)}
    </div>
  );
};

export default MonthlyReportView;
