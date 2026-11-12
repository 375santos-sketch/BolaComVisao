import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, MonthlyReportRecord, SquadProfile } from '../../types';
import {
  MonthlyActivityReport,
  REPORT_STATUS_LABEL,
  buildMonthlyActivityReport,
  emptyReportRecord,
  reportTimeline,
  seasonMonths,
  teamCoachName,
  teamReportState
} from '../../lib/monthlyActivityReport';
import { monthLabel } from '../../lib/monthlyReport';
import { getUserAccessibleTeams } from '../../lib/permissionsEngine';
import { reportFilename } from '../../lib/pdf/reportPagesPdf';
import { notifyReport } from '../../lib/reportNotices';
import { localDateISO } from '../../lib/trainingQuick';
import { PdfExport, ScaledPreview } from './ReportExport';
import { ReportPages } from './ReportPages';
import './monthlyReport.css';

interface Props {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

type RowStatus = MonthlyReportRecord['status'] | 'sem';

const STATUS: Record<RowStatus, { label: string; tone: string; dot: string }> = {
  entregue: { label: 'Entregue', tone: 'ui-badge-success', dot: 'bg-ui-success' },
  revisto: { label: 'Revisto pelo coordenador', tone: 'ui-badge-brand', dot: 'bg-ui-brand' },
  devolvido: { label: 'Devolvido ao treinador', tone: 'ui-badge-warning', dot: 'bg-ui-warning' },
  validado: { label: 'Validado, por entregar', tone: 'ui-badge-warning', dot: 'bg-ui-warning' },
  rascunho: { label: 'Rascunho', tone: '', dot: 'bg-ui-line-strong' },
  sem: { label: 'Sem relatório', tone: 'ui-badge-danger', dot: 'bg-ui-danger' }
};
const OPENABLE: RowStatus[] = ['entregue', 'revisto', 'devolvido', 'validado'];
const dm = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const ageOf = (t: SquadProfile) => Number((t.category || '').match(/\d+/)?.[0] || 99);
const teamLabel = (t: SquadProfile) => t.category || t.clubName || 'Equipa';

/**
 * 🧭 Relatórios do clube (Coordenador Técnico): every team's monthly report — where it stands and the month's numbers
 * from the team's own data, by age group and never ranked — the season month by month, and the review of a delivered
 * report (notes for the coach, reviewed, sent back for corrections, PDF). A team without a report can be asked for
 * one with a phone notice.
 */
const ClubReportsView: React.FC<Props> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const teams = useMemo(
    () =>
      getUserAccessibleTeams(state.currentUser, state.teams || []).sort(
        (a, b) => ageOf(a) - ageOf(b) || teamLabel(a).localeCompare(teamLabel(b), 'pt-PT')
      ),
    [state.currentUser, state.teams]
  );
  const season = state.season || teams[0]?.season || '';
  const months = useMemo(() => {
    const all = seasonMonths(season);
    const now = localDateISO().slice(0, 7);
    const upTo = all.filter((m) => m <= now);
    return (upTo.length ? upTo : all).reverse();
  }, [season]);
  const [view, setView] = useState<'mes' | 'epoca'>('mes');
  const [month, setMonth] = useState(() => {
    const now = localDateISO().slice(0, 7);
    // the month just ended is the one the reports are about in the first days of a month
    const d = new Date();
    d.setDate(0);
    const last = localDateISO(d).slice(0, 7);
    return months.includes(last) ? last : months[0] || now;
  });
  const [open, setOpen] = useState<{ teamId: string; month: string } | null>(null);

  const recordOf = (t: SquadProfile, m: string) => (t.monthlyReports || []).find((r) => r.month === m);
  const rows = useMemo(
    () =>
      teams.map((t) => {
        const rec = recordOf(t, month);
        const report = buildMonthlyActivityReport(teamReportState(t, state.teams || []), month);
        const unused = report.summary.games ? report.athletes.filter((a) => a.played === 0).length : null;
        return { team: t, rec, status: (rec?.status || 'sem') as RowStatus, report, unused };
      }),
    [teams, month, state.teams]
  );
  const counts = rows.reduce<Record<RowStatus, number>>((c, r) => ({ ...c, [r.status]: (c[r.status] || 0) + 1 }), {
    entregue: 0,
    revisto: 0,
    devolvido: 0,
    validado: 0,
    rascunho: 0,
    sem: 0
  });

  const ask = async (t: SquadProfile) => {
    const r = await notifyReport(
      state,
      t.id,
      `Relatório de ${monthLabel(month)}`,
      `O coordenador pede o relatório mensal da equipa ${teamLabel(t)}.`,
      month
    );
    onShowToast(
      !r.ok
        ? r.error || 'Não foi possível enviar o pedido.'
        : r.sent
          ? `Pedido enviado para ${r.sent} telemóvel(is) de ${teamLabel(t)}.`
          : `Ninguém de ${teamLabel(t)} tem os avisos ligados no telemóvel: peça o relatório de outra forma.`
    );
  };

  const openTeam = open ? teams.find((t) => t.id === open.teamId) : undefined;

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] overflow-y-auto bg-ui-bg">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Relatórios do clube"
        className="mx-auto max-w-[1500px] px-3 pb-24 sm:px-5"
      >
        {openTeam && open ? (
          <ReviewPanel
            key={`${open.teamId}-${open.month}`}
            state={state}
            team={openTeam}
            month={open.month}
            onUpdateState={onUpdateState}
            onShowToast={onShowToast}
            onBack={() => setOpen(null)}
          />
        ) : (
          <>
            <header className="sticky top-0 z-10 -mx-3 flex flex-wrap items-center gap-2 border-b border-ui-line bg-ui-bg/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar relatórios do clube"
                className="ui-btn ui-btn-secondary h-10 w-10 shrink-0"
              >
                ✕
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="bcv-title text-[26px] leading-none">Relatórios do clube</h2>
                <p className="truncate text-ui-caption text-ui-muted">
                  Coordenação técnica · {state.myClubName || teams[0]?.clubName || ''} · Época {season}
                </p>
              </div>
              <div role="group" aria-label="Vista" className="ui-inset flex gap-0.5 p-1">
                {(
                  [
                    ['mes', 'Mês'],
                    ['epoca', 'Época']
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={view === k}
                    onClick={() => setView(k)}
                    className={`rounded-ui-sm px-3 py-1.5 text-ui-caption font-bold ${
                      view === k ? 'bg-ui-brand-soft text-ui-brand' : 'text-ui-muted'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {view === 'mes' && (
                <select
                  aria-label="Mês"
                  className="ui-input w-auto text-ui-caption"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {monthLabel(m)}
                    </option>
                  ))}
                </select>
              )}
            </header>

            {view === 'mes' ? (
              <>
                <section
                  aria-label="Resumo do mês"
                  className="my-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
                >
                  {(
                    [
                      ['Equipas', teams.length, 'border-t-ui-brand', ''],
                      [
                        'Entregues',
                        counts.entregue + counts.revisto,
                        'border-t-ui-success',
                        counts.revisto ? `${counts.revisto} já revisto(s)` : ''
                      ],
                      ['Validados ou devolvidos', counts.validado + counts.devolvido, 'border-t-ui-warning', ''],
                      ['Em rascunho', counts.rascunho, 'border-t-ui-line-strong', ''],
                      ['Sem relatório', counts.sem, 'border-t-ui-danger', '']
                    ] as const
                  ).map(([l, v, tone, hint]) => (
                    <div key={l} className={`ui-card border-t-[3px] p-3.5 ${tone}`}>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ui-muted">{l}</p>
                      <p className="text-[26px] font-black leading-tight text-ui-text">{v}</p>
                      {hint && <p className="text-[11px] text-ui-muted">{hint}</p>}
                    </div>
                  ))}
                </section>

                <section aria-label="Equipas" className="ui-card p-3.5 sm:p-4">
                  <h3 className="text-ui-body font-extrabold text-ui-text">Equipas · {monthLabel(month)}</h3>
                  <p className="mb-3 text-ui-caption text-ui-muted">
                    Por escalão, sem rankings. Os números vêm sempre dos dados de cada equipa; o estado é o do relatório
                    do treinador.
                  </p>
                  {teams.length === 0 ? (
                    <p className="text-ui-caption text-ui-muted">Sem equipas.</p>
                  ) : (
                    <>
                      <div
                        aria-hidden
                        className="mb-1 hidden gap-x-4 px-3 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ui-muted lg:grid lg:grid-cols-[1.2fr_1.4fr_0.6fr_0.7fr_0.8fr_1.2fr_0.6fr_auto]"
                      >
                        <span>Equipa</span>
                        <span>Relatório</span>
                        <span>Treinos</span>
                        <span>Assiduidade</span>
                        <span>Jogos</span>
                        <span>Utilização</span>
                        <span>Em falta</span>
                        <span className="w-[72px]" />
                      </div>
                      <ul className="space-y-2">
                        {rows.map(({ team: t, rec, status, report, unused }) => (
                          <li
                            key={t.id}
                            aria-label={teamLabel(t)}
                            className="ui-inset grid grid-cols-3 items-center gap-x-4 gap-y-2 p-3 lg:grid-cols-[1.2fr_1.4fr_0.6fr_0.7fr_0.8fr_1.2fr_0.6fr_auto]"
                          >
                            <div className="col-span-2 min-w-0 lg:col-span-1">
                              <p className="truncate font-extrabold text-ui-text">{teamLabel(t)}</p>
                              <p className="truncate text-ui-caption text-ui-muted">
                                {teamCoachName(t) || rec?.validatedBy || '—'}
                              </p>
                            </div>
                            <div className="text-right lg:text-left">
                              <span className={`ui-badge ${STATUS[status].tone}`}>{STATUS[status].label}</span>
                              {rec?.deliveredAt && (
                                <p className="text-[11px] text-ui-muted">Entregue a {dm(rec.deliveredAt)}</p>
                              )}
                            </div>
                            <Stat label="Treinos" value={report.summary.trainingsHeld} />
                            <Stat
                              label="Assiduidade"
                              value={report.summary.attendance === null ? '—' : `${report.summary.attendance}%`}
                            />
                            <Stat
                              label="Jogos"
                              value={`${report.summary.record.V}V ${report.summary.record.E}E ${report.summary.record.D}D`}
                            />
                            <Stat
                              label="Utilização"
                              value={
                                unused === null
                                  ? 'Sem jogos'
                                  : unused === 0
                                    ? 'Todos jogaram'
                                    : `${unused} atleta(s) sem minutos`
                              }
                            />
                            <Stat label="Em falta" value={report.missing.length ? report.missing.length : '✓'} />
                            {OPENABLE.includes(status) ? (
                              <button
                                type="button"
                                onClick={() => setOpen({ teamId: t.id, month })}
                                className="ui-btn ui-btn-primary col-span-3 px-4 py-2 text-ui-caption lg:col-span-1"
                              >
                                Abrir
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => ask(t)}
                                className="ui-btn ui-btn-secondary col-span-3 px-4 py-2 text-ui-caption lg:col-span-1"
                                aria-label={`Pedir o relatório a ${teamLabel(t)}`}
                              >
                                Pedir
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              </>
            ) : (
              <section aria-label="Época" className="ui-card mt-4 overflow-x-auto p-3.5 sm:p-4">
                <h3 className="text-ui-body font-extrabold text-ui-text">Época · relatórios por mês</h3>
                <p className="mb-3 text-ui-caption text-ui-muted">
                  Cada quadrado é o relatório de um mês. Toque num relatório entregue para o abrir.
                </p>
                <table className="w-full min-w-[640px] text-ui-caption">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.08em] text-ui-muted">
                      <th className="py-2 text-left">Equipa</th>
                      {seasonMonths(season).map((m) => (
                        <th key={m} className="py-2">
                          {monthLabel(m).slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t) => (
                      <tr key={t.id} className="border-t border-ui-line">
                        <td className="py-2.5 font-bold text-ui-text">{teamLabel(t)}</td>
                        {seasonMonths(season).map((m) => {
                          const past = m < localDateISO().slice(0, 7);
                          const st: RowStatus = recordOf(t, m)?.status || 'sem';
                          if (!past) {
                            return (
                              <td key={m} className="text-center text-ui-line-strong">
                                ·
                              </td>
                            );
                          }
                          const canOpen = OPENABLE.includes(st);
                          return (
                            <td key={m} className="text-center">
                              <button
                                type="button"
                                disabled={!canOpen}
                                onClick={() => setOpen({ teamId: t.id, month: m })}
                                title={`${teamLabel(t)} · ${monthLabel(m)}: ${STATUS[st].label}`}
                                aria-label={`${teamLabel(t)} · ${monthLabel(m)}: ${STATUS[st].label}`}
                                className={`inline-block h-3.5 w-3.5 rounded-[5px] ${STATUS[st].dot} ${canOpen ? '' : 'cursor-default'}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ui-muted">
                  {(['revisto', 'entregue', 'validado', 'rascunho', 'sem'] as RowStatus[]).map((k) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <i className={`inline-block h-3 w-3 rounded-[4px] ${STATUS[k].dot}`} />
                      {k === 'validado' ? 'Validado ou devolvido' : STATUS[k].label}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; wide?: boolean }> = ({ label, value, wide }) => (
  <div className={`min-w-0 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
    <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-ui-muted lg:hidden">{label}</p>
    <p className="truncate text-ui-caption text-ui-text">{value}</p>
  </div>
);

/** One report opened by the coordinator: the A4 report (read only), its history, the notes and the decision. */
const ReviewPanel: React.FC<{
  state: AppState;
  team: SquadProfile;
  month: string;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onBack: () => void;
}> = ({ state, team, month, onUpdateState, onShowToast, onBack }) => {
  const saved = (team.monthlyReports || []).find((r) => r.month === month) || emptyReportRecord(month);
  const [rec, setRec] = useState<MonthlyReportRecord>(saved);
  const [tab, setTab] = useState<'relatorio' | 'revisao'>('revisao');
  const [pdf, setPdf] = useState(false);
  const dirty = useRef(false);
  const report: MonthlyActivityReport = useMemo(
    () => buildMonthlyActivityReport(teamReportState(team, state.teams || []), month),
    [team, state.teams, month]
  );
  const me = state.currentUser?.name || '';
  const coach = teamCoachName(team) || rec.validatedBy || '';

  const persist = (r: MonthlyReportRecord) => {
    const now = new Date().toISOString();
    const others = (team.monthlyReports || []).filter((x) => x.id !== r.id);
    onUpdateState({
      teams: (state.teams || []).map((t) =>
        t.id === team.id
          ? { ...t, monthlyReports: [...others, { ...r, createdAt: r.createdAt || now, updatedAt: now }] }
          : t
      )
    });
    dirty.current = false;
  };
  useEffect(() => {
    if (!dirty.current) return;
    const id = window.setTimeout(() => persist(rec), 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec]);

  const decide = (status: 'revisto' | 'devolvido') => {
    if (status === 'devolvido' && !rec.coordinatorNotes?.trim()) {
      onShowToast('Escreva nas observações o que o treinador deve corrigir.');
      return;
    }
    const now = new Date().toISOString();
    const next: MonthlyReportRecord =
      status === 'revisto'
        ? { ...rec, status, reviewedAt: now, reviewedBy: me || undefined }
        : {
            ...rec,
            status,
            returnedAt: now,
            returnedBy: me || undefined,
            reviewedAt: undefined,
            reviewedBy: undefined
          };
    setRec(next);
    persist(next);
    onShowToast(`Relatório: ${REPORT_STATUS_LABEL[status]}`);
    notifyReport(
      state,
      team.id,
      status === 'revisto' ? `Relatório de ${report.label} revisto` : `Relatório de ${report.label} devolvido`,
      status === 'revisto' ? 'O coordenador reviu o relatório mensal.' : `Corrigir: ${rec.coordinatorNotes?.trim()}`,
      month
    );
  };

  const back = () => {
    if (dirty.current) persist(rec);
    onBack();
  };

  const pages = <ReportPages report={report} record={rec} coachName={coach} />;
  const hide = (show: boolean) => (show ? '' : 'max-xl:hidden');

  return (
    <>
      <header className="sticky top-0 z-10 -mx-3 flex flex-wrap items-center gap-2 border-b border-ui-line bg-ui-bg/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <button
          type="button"
          onClick={back}
          aria-label="Voltar aos relatórios do clube"
          className="ui-btn ui-btn-secondary h-10 w-10 shrink-0"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="bcv-title text-[24px] leading-none">
            {teamLabel(team)} · {monthLabel(month)}
          </h2>
          <p className="truncate text-ui-caption text-ui-muted">
            {coach || 'Treinador'} · {REPORT_STATUS_LABEL[rec.status]}
            {rec.deliveredAt ? ` · entregue a ${dm(rec.deliveredAt)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 max-sm:w-full">
          <button
            type="button"
            onClick={() => setPdf(true)}
            disabled={pdf}
            className="ui-btn ui-btn-secondary px-3 py-2 text-ui-caption max-sm:flex-1"
          >
            {pdf ? 'A criar…' : 'Descarregar PDF'}
          </button>
          <button
            type="button"
            onClick={() => decide('devolvido')}
            className="ui-btn ui-btn-secondary px-3 py-2 text-ui-caption max-sm:flex-1"
          >
            Devolver ao treinador
          </button>
          <button
            type="button"
            onClick={() => decide('revisto')}
            disabled={rec.status === 'revisto'}
            className="ui-btn ui-btn-primary px-4 py-2 text-ui-caption max-sm:w-full"
          >
            {rec.status === 'revisto' ? 'Revisto ✓' : 'Marcar como revisto'}
          </button>
        </div>
      </header>

      <nav aria-label="Partes" className="ui-inset my-3 flex gap-1 p-1 xl:hidden">
        {(
          [
            ['relatorio', 'Relatório'],
            ['revisao', 'Revisão']
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-ui-sm px-2 py-2 text-ui-caption font-bold ${tab === k ? 'bg-ui-brand-soft text-ui-brand' : 'text-ui-muted'}`}
          >
            {l}
          </button>
        ))}
      </nav>

      <div className="grid gap-5 pt-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] xl:items-start">
        <section aria-label="Relatório" className={`min-w-0 ${hide(tab === 'relatorio')}`}>
          <ScaledPreview>{pages}</ScaledPreview>
        </section>
        <aside className={`space-y-3 xl:sticky xl:top-[88px] ${hide(tab === 'revisao')}`}>
          <section aria-label="Estado" className="ui-card space-y-1 p-3.5">
            <h3 className="mb-1 text-ui-body font-extrabold text-ui-text">Estado</h3>
            {reportTimeline(rec).map((e) => (
              <p
                key={e.at + e.text}
                className="flex gap-3 border-b border-dashed border-ui-line py-1.5 text-ui-caption text-ui-text"
              >
                <span className="w-12 shrink-0 text-ui-muted">{dm(e.at)}</span>
                {e.text}
              </p>
            ))}
            {rec.status === 'entregue' && (
              <p className="pt-1 text-ui-caption font-bold text-ui-brand">À espera da sua revisão</p>
            )}
          </section>
          <section aria-label="Observações do coordenador" className="ui-card space-y-2 p-3.5">
            <h3 className="text-ui-body font-extrabold text-ui-text">Observações do coordenador</h3>
            <p className="text-ui-caption text-ui-muted">
              Só o coordenador escreve aqui. O treinador lê-as no seu relatório.
            </p>
            <textarea
              rows={5}
              aria-label="Observações do coordenador"
              className="ui-input w-full text-ui-caption"
              value={rec.coordinatorNotes || ''}
              onChange={(e) => {
                const v = e.target.value;
                dirty.current = true;
                setRec((r) => ({ ...r, coordinatorNotes: v }));
              }}
            />
          </section>
          <section aria-label="Informação em falta" className="ui-card space-y-2 p-3.5">
            <h3 className="text-ui-body font-extrabold text-ui-text">Informação em falta neste relatório</h3>
            {report.missing.length ? (
              report.missing.map((m, i) => (
                <p key={i} className="ui-inset flex gap-2 p-2 text-ui-caption text-ui-text">
                  <span aria-hidden className={m.level === 'aviso' ? 'text-ui-warning' : 'text-ui-brand'}>
                    {m.level === 'aviso' ? '⚠' : 'ℹ'}
                  </span>
                  {m.text}
                </p>
              ))
            ) : (
              <p className="text-ui-caption text-ui-success">Nada em falta ✓</p>
            )}
          </section>
        </aside>
      </div>

      {pdf && (
        <PdfExport
          filename={reportFilename(report.club || teamLabel(team), month)}
          onDone={(ok) => {
            setPdf(false);
            onShowToast(ok ? 'Relatório mensal criado 📄' : 'Não foi possível criar o PDF.');
          }}
        >
          {pages}
        </PdfExport>
      )}
    </>
  );
};

export default ClubReportsView;
