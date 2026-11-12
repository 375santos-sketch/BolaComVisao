import React from 'react';
import { MonthlyReportRecord } from '../../types';
import {
  ABSENCE_LABEL,
  MonthlyActivityReport,
  REPORT_DIMENSIONS,
  REPORT_LEVELS,
  REPORT_NEXT_FIELDS,
  REPORT_STATUS_LABEL,
  REPORT_TEXT_FIELDS,
  ReportGame
} from '../../lib/monthlyActivityReport';

/**
 * 📑 The monthly report as A4 pages (210 × 297 mm): cover and summary, trainings, games (2 per page) and team
 * statistics, athletes, attendance, the coach's analysis, dimensions, next month and validation. Styles in
 * monthlyReport.css (.mr-pages). "—" always means "not recorded", never 0.
 */

const dm = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const dash = (v: number | null | undefined, suffix = '') => (v === null || v === undefined ? '—' : `${v}${suffix}`);
const RES_LABEL = { V: 'Vitória', E: 'Empate', D: 'Derrota' } as const;
const num = (n: number | null) => (n === null ? '' : `${n} `);

const Kpi: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({
  label,
  value,
  hint,
  tone
}) => (
  <div className={`kpi ${tone || ''}`}>
    <span className="kpi-label">{label}</span>
    <strong className="kpi-value">{value}</strong>
    {hint && <span className="kpi-hint">{hint}</span>}
  </div>
);

const Bar: React.FC<{ value: number; max: number; tone?: string }> = ({ value, max, tone }) => (
  <span className="bar">
    <span className={`bar-fill ${tone || ''}`} style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }} />
  </span>
);

const Text: React.FC<{ value?: string; empty?: string }> = ({ value, empty = 'Por preencher pelo treinador.' }) =>
  value?.trim() ? <p className="free-text">{value.trim()}</p> : <p className="free-text empty">{empty}</p>;

interface FrameProps {
  n: number;
  total: number;
  title: string;
  kicker: string;
  team: string;
  label: string;
  club: string;
  status: MonthlyReportRecord['status'];
  children: React.ReactNode;
}

/** An inside page: BolaComVisão band on top, section title, footer with the state and the page number. */
const ReportPage: React.FC<FrameProps> = ({ n, total, title, kicker, team, label, club, status, children }) => (
  <section className="a4" aria-label={`Página ${n}: ${title}`}>
    <header className="a4-head">
      <img src="/icons/icon-192.png" alt="" />
      <div className="a4-head-title">
        <span>Relatório mensal de atividade e desenvolvimento</span>
        <strong>
          {team} · {label}
        </strong>
      </div>
    </header>
    <div className="a4-body">
      <p className="a4-kicker">{kicker}</p>
      <h2 className="a4-title">{title}</h2>
      {children}
    </div>
    <footer className="a4-foot">
      <span>BolaComVisão · {club}</span>
      <span>{REPORT_STATUS_LABEL[status]}</span>
      <span>
        Página {n} de {total}
      </span>
    </footer>
  </section>
);

interface Props {
  report: MonthlyActivityReport;
  record: MonthlyReportRecord;
  coachName: string;
  athleteId?: string;
  signature?: string | null;
}

export const ReportPages: React.FC<Props> = ({ report, record, coachName, athleteId, signature }) => {
  const { summary, games } = report;
  const gamePages: ReportGame[][] = [];
  for (let i = 0; i < Math.max(games.length, 1); i += 2) gamePages.push(games.slice(i, i + 2));
  // the team statistics go with the last games page when it has one game, else on a page of their own
  const statsOwnPage = gamePages[gamePages.length - 1].length === 2;
  const totalPages = 1 + 1 + gamePages.length + (statsOwnPage && games.length ? 1 : 0) + 5;
  let page = 1;
  const next = () => ++page;
  const maxTheme = Math.max(...report.themes.rows.map((r) => r.minutes), 1);
  const maxMinutes = Math.max(
    ...report.athletes.map((a) => a.gameLines.reduce((n, g) => n + (g.called ? g.total : 0), 0)),
    1
  );
  const sel = report.athletes.find((a) => a.id === athleteId) || report.athletes[0];
  const texts = record.texts || {};
  const nextTexts = record.next || {};

  const frame = { team: report.team, label: report.label, club: report.club, status: record.status, total: totalPages };

  const renderGame = (g: ReportGame) => (
    <article key={g.id} className="game">
      <div className="game-head">
        <div>
          <p className="game-meta">
            {dm(g.date)} · {g.home ? 'Casa' : 'Fora'} · {g.competition}
            {g.round ? ` · ${g.round}` : ''}
          </p>
          <h3>vs {g.opponent}</h3>
        </div>
        <div className={`score ${g.result}`}>
          <strong>
            {g.scored} – {g.conceded}
          </strong>
          <span>{RES_LABEL[g.result]}</span>
        </div>
      </div>
      <div className="game-grid">
        <div>
          <p className="lbl">Sistema tático (planeado)</p>
          <p>{g.system || <span className="na">Não indicado</span>}</p>
          <p className="lbl">Titulares ({g.starters.length})</p>
          <p className="small">
            {g.starters.length ? (
              g.starters.map((s) => `${num(s.number)}${s.name}`).join(' · ')
            ) : (
              <span className="na">Não registados</span>
            )}
          </p>
          <p className="lbl">Suplentes utilizados</p>
          <p className="small">
            {g.benchUsed.length
              ? g.benchUsed.map((b) => `${num(b.number)}${b.name} (${b.minutes}')`).join(' · ')
              : 'Nenhum'}
            {g.benchUnused > 0 && <span className="na"> · {g.benchUnused} convocado(s) sem utilização</span>}
          </p>
        </div>
        <div>
          <p className="lbl">Substituições</p>
          <p className="small">
            {g.subs.length ? (
              g.subs.map((s, i) => (
                <span key={i} className="sub">
                  {s.minute} ↓{s.out} ↑{s.in}
                </span>
              ))
            ) : (
              <span className="na">Nenhuma</span>
            )}
          </p>
          <p className="lbl">Acontecimentos</p>
          <p className="small">
            {g.events.length ? (
              g.events.map((e, i) => (
                <span key={i} className="evt">
                  {e.minute}{' '}
                  {e.kind === 'golo' ? '⚽' : e.kind === 'sofrido' ? '⚽' : e.kind === 'amarelo' ? '🟨' : '🟥'} {e.text}
                </span>
              ))
            ) : (
              <span className="na">Sem golos nem cartões</span>
            )}
          </p>
        </div>
        <div className="stats">
          <p className="lbl">Estatísticas (nós · adv.)</p>
          {(
            [
              ['Remates', g.shots],
              ['Cantos', g.corners],
              ['Faltas', g.fouls]
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="stat">
              <span>{label}</span>
              <strong>{v ? `${v.for} · ${v.against}` : '—'}</strong>
            </div>
          ))}
          <div className="stat">
            <span>Duração</span>
            <strong>
              {g.halfMinutes[0]}' + {g.halfMinutes[1]}'{g.estimatedMinutes && <em className="est"> estimado</em>}
            </strong>
          </div>
        </div>
      </div>
      <div className="coach-box">
        <p className="lbl">Análise técnica e tática do treinador</p>
        <Text value={g.coachNotes} empty="Sem análise escrita para este jogo (notas do jogo)." />
      </div>
    </article>
  );

  const collectiveTable = (
    <div className="panel">
      <h3>Estatísticas coletivas do mês</h3>
      <table className="tbl dense">
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Nós</th>
            <th>Adversários</th>
            <th>Por jogo (nós)</th>
            <th>Registado em</th>
          </tr>
        </thead>
        <tbody>
          {report.collective.map((c) => (
            <tr key={c.label}>
              <td className="strong">{c.label}</td>
              <td>{dash(c.for)}</td>
              <td>{dash(c.against)}</td>
              <td>{c.perGame === null ? '—' : c.perGame.toLocaleString('pt-PT')}</td>
              <td>
                {c.recorded} de {games.length} jogos
                {c.recorded < games.length && <span className="chip warn">parcial</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="panel-hint">
        Os totais só somam os jogos em que o indicador foi registado; a média por jogo divide por esses jogos.
      </p>
    </div>
  );

  return (
    <div className="mr-pages">
      {/* 1 · CAPA E RESUMO EXECUTIVO */}
      <section className="a4 cover" aria-label="Página 1: Capa e resumo executivo">
        <div className="cover-top">
          <img src="/icons/icon-192.png" alt="BolaComVisão" className="cover-logo" />
        </div>
        <div className="cover-title">
          <p className="cover-kicker">{report.label}</p>
          <h1>
            Relatório mensal
            <br />
            de atividade e desenvolvimento
          </h1>
          <dl className="cover-meta">
            <div>
              <dt>Clube</dt>
              <dd>{report.club || '—'}</dd>
            </div>
            <div>
              <dt>Escalão</dt>
              <dd>{report.category || '—'}</dd>
            </div>
            <div>
              <dt>Época</dt>
              <dd>{report.season || '—'}</dd>
            </div>
            <div>
              <dt>Treinador</dt>
              <dd>{coachName || '—'}</dd>
            </div>
          </dl>
        </div>
        <div className="cover-kpis">
          <Kpi
            label="Treinos realizados"
            value={summary.trainingsHeld}
            hint={`${summary.trainingMinutes} min de treino`}
          />
          <Kpi
            label="Jogos realizados"
            value={summary.games}
            hint={`${summary.record.V}V · ${summary.record.E}E · ${summary.record.D}D`}
          />
          <Kpi label="Assiduidade média" value={dash(summary.attendance, '%')} hint="só treinos realizados" />
          <Kpi
            label="Minutos de competição"
            value={`${summary.competitionMinutes}'`}
            hint={`${summary.athletesUsed} atletas utilizados`}
          />
        </div>
        <div className="cover-summary">
          <h3>Resumo geral do mês</h3>
          <Text value={texts.evolucao} empty="Escrito pelo treinador (Evolução geral da equipa)." />
          <p className="cover-facts">
            {summary.record.gf} golos marcados · {summary.record.ga} sofridos
            {summary.trainingsUnclosed ? ` · ${summary.trainingsUnclosed} treino(s) por fechar` : ''}
            {summary.trainingsScheduled ? ` · ${summary.trainingsScheduled} treino(s) agendado(s)` : ''}
          </p>
        </div>
        <footer className="cover-foot">
          <span>Estado: {REPORT_STATUS_LABEL[record.status]}</span>
          <span>BolaComVisão</span>
          <span>Página 1 de {totalPages}</span>
        </footer>
      </section>

      {/* 2 · TREINOS */}
      <ReportPage {...frame} n={next()} kicker="Secção 1" title="Treinos">
        <div className="kpi-row">
          <Kpi label="Realizados" value={summary.trainingsHeld} tone="ok" />
          <Kpi label="Por fechar" value={summary.trainingsUnclosed} tone="warn" hint="não contam nas presenças" />
          <Kpi label="Agendados" value={summary.trainingsScheduled} hint="ainda por realizar" />
          <Kpi label="Minutos de treino" value={`${summary.trainingMinutes}'`} hint="duração dos realizados" />
        </div>
        {report.trainings.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Duração</th>
                <th>Presentes</th>
                <th>Foco</th>
                <th>Objetivo principal</th>
                <th>Conteúdos (min)</th>
              </tr>
            </thead>
            <tbody>
              {report.trainings.slice(0, 16).map((t) => (
                <tr key={t.id} className={t.status !== 'realizado' ? 'muted-row' : ''}>
                  <td>{t.number ?? ''}</td>
                  <td>
                    {dm(t.date)}
                    {t.status !== 'realizado' && (
                      <span className={`chip ${t.status === 'por_fechar' ? 'warn' : ''}`}>
                        {t.status === 'por_fechar' ? 'Por fechar' : 'Agendado'}
                      </span>
                    )}
                  </td>
                  <td>{dash(t.durationMinutes, "'")}</td>
                  <td>{t.present === null ? '—' : `${t.present}/${t.squad}`}</td>
                  <td>{t.focus || <span className="na">—</span>}</td>
                  <td>{t.objective || <span className="na">Sem objetivo indicado</span>}</td>
                  <td className="small">
                    {t.themes.length ? (
                      t.themes.map((th) => `${th.label} ${th.minutes}`).join(' · ')
                    ) : (
                      <span className="na">Sem plano de sessão</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="free-text empty">Sem treinos neste mês.</p>
        )}
        <div className="two-col">
          <div className="panel">
            <h3>Conteúdos mais trabalhados</h3>
            <p className="panel-hint">
              Minutos dos exercícios por tema ({report.themes.withPlan}' com plano), não os {summary.trainingMinutes}'
              de treino
              {report.themes.noPlanCount
                ? `: ${report.themes.noPlanCount} treino(s) sem plano (${report.themes.noPlanMinutes}') ficam fora desta conta`
                : ''}
              .
            </p>
            {report.themes.rows.length ? (
              report.themes.rows.map((r) => (
                <div key={r.key} className="bar-line">
                  <span>{r.label}</span>
                  <Bar value={r.minutes} max={maxTheme} />
                  <strong>{r.minutes}'</strong>
                </div>
              ))
            ) : (
              <p className="free-text empty">Sem planos de sessão neste mês.</p>
            )}
          </div>
          <div className="panel">
            <h3>Observações dos treinos</h3>
            {report.trainings.filter((t) => t.status === 'realizado' && t.notes).length ? (
              report.trainings
                .filter((t) => t.status === 'realizado' && t.notes)
                .slice(0, 6)
                .map((t) => (
                  <p key={t.id} className="note">
                    <strong>
                      {t.number ? `Treino nº ${t.number}` : 'Treino'} · {dm(t.date)}
                    </strong>{' '}
                    {t.notes}
                  </p>
                ))
            ) : (
              <p className="free-text empty">Sem observações escritas nos treinos.</p>
            )}
            <p className="panel-hint">
              Os conteúdos psicológicos/comportamentais ainda não têm campo próprio nos treinos: descrevem-se na secção
              5.
            </p>
          </div>
        </div>
      </ReportPage>

      {/* 3+ · JOGOS */}
      {gamePages.map((pg, i) => {
        const last = i === gamePages.length - 1;
        return (
          <ReportPage
            {...frame}
            key={i}
            n={next()}
            kicker={i === 0 ? 'Secção 2' : 'Secção 2 · continuação'}
            title={last && !statsOwnPage && games.length ? 'Jogos e estatísticas coletivas' : 'Jogos'}
          >
            {i === 0 && (
              <div className="kpi-row">
                <Kpi label="Jogos" value={summary.games} />
                <Kpi
                  label="Vitórias · empates · derrotas"
                  value={`${summary.record.V} · ${summary.record.E} · ${summary.record.D}`}
                />
                <Kpi label="Golos marcados" value={summary.record.gf} tone="ok" />
                <Kpi label="Golos sofridos" value={summary.record.ga} tone="bad" />
              </div>
            )}
            {games.length ? pg.map(renderGame) : <p className="free-text empty">Sem jogos realizados neste mês.</p>}
            {last && !statsOwnPage && games.length > 0 && collectiveTable}
            <p className="legend">«—» = não registado na aplicação (não significa zero).</p>
          </ReportPage>
        );
      })}
      {statsOwnPage && games.length > 0 && (
        <ReportPage {...frame} n={next()} kicker="Secção 2 · continuação" title="Estatísticas coletivas">
          {collectiveTable}
        </ReportPage>
      )}

      {/* ESTATÍSTICAS INDIVIDUAIS */}
      <ReportPage {...frame} n={next()} kicker="Secção 3" title="Estatísticas individuais">
        <p className="intro">
          Participação, utilização e desenvolvimento de cada atleta no mês, por número. Sem rankings: o objetivo é
          acompanhar, não classificar.
        </p>
        <table className="tbl dense">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Atleta</th>
              <th>Pos.</th>
              <th>Treinos</th>
              <th>Assid.</th>
              <th>Conv.</th>
              <th>Jogou</th>
              <th>Tit.</th>
              <th>Supl.</th>
              <th>Minutos</th>
              <th>Golos</th>
              <th>Assist.</th>
              <th>Cartões</th>
            </tr>
          </thead>
          <tbody>
            {report.athletes.map((r) => (
              <tr key={r.id}>
                <td>{r.number ?? ''}</td>
                <td className="strong">{r.name}</td>
                <td>{r.position}</td>
                <td>
                  {r.trainingsPresent}/{r.trainingsHeld}
                </td>
                <td>{dash(r.attendance, '%')}</td>
                <td>{r.calledUp}</td>
                <td>{r.played}</td>
                <td>{r.starts}</td>
                <td>{r.subIn}</td>
                <td>
                  {r.minutes}'{r.estimated && <sup>*</sup>}
                  <span className="mini-bar">
                    <Bar value={r.minutes} max={maxMinutes} />
                  </span>
                </td>
                <td>{r.goals}</td>
                <td>{r.assists}</td>
                <td>
                  {r.yellow ? `🟨${r.yellow}` : ''}
                  {r.red ? ` 🟥${r.red}` : ''}
                  {!r.yellow && !r.red ? '0' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="legend">
          Treinos = presenças / treinos realizados. Conv. = convocado · Jogou = mais de 0 minutos · Tit. = titular na
          1.ª parte · Supl. = entrou como suplente. * inclui minutos estimados (jogo sem relógio). Pos. = posição
          principal da ficha (a posição em cada jogo não é registada).
        </p>
        {sel && report.athletes.length <= 16 && (
          <div className="panel athlete-card">
            <h3>
              Ficha individual · {num(sel.number)}
              {sel.name} {sel.position && <span className="chip brand">{sel.position}</span>}
            </h3>
            <div className="two-col">
              <div>
                <p className="lbl">
                  Treinos ({sel.trainingsPresent}/{sel.trainingsHeld})
                </p>
                <div className="att-bar wrap">
                  {sel.trainingDays.map((t) => (
                    <span key={t.date} className={`tday ${t.state}`}>
                      {dm(t.date)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="lbl">Jogos</p>
                {sel.gameLines.map((g) => (
                  <div key={g.date + g.opponent} className="stat">
                    <span>
                      {dm(g.date)} vs {g.opponent}
                    </span>
                    <strong>
                      {!g.called
                        ? 'Não convocado'
                        : g.minutes === 0
                          ? 'Convocado, não utilizado'
                          : `${g.starter ? 'Titular' : 'Suplente'} · ${g.minutes}' de ${g.total}'${g.goals ? ` · ⚽${g.goals}` : ''}${g.assists ? ` · 🅰${g.assists}` : ''}`}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ReportPage>

      {/* ASSIDUIDADE */}
      <ReportPage {...frame} n={next()} kicker="Secção 4" title="Assiduidade">
        <div className="kpi-row">
          <Kpi
            label="Assiduidade da equipa"
            value={dash(summary.attendance, '%')}
            tone="ok"
            hint={`${summary.trainingsHeld} treinos realizados`}
          />
          <Kpi label="Faltas justificadas" value={summary.absences.justified} hint="doença, lesão, escola, família" />
          <Kpi label="Faltas injustificadas" value={summary.absences.unjustified} tone="bad" />
          <Kpi label="Faltas sem motivo" value={summary.absences.noReason} tone="warn" hint="motivo não indicado" />
        </div>
        <div className="two-col">
          <div className="panel">
            <h3>Presenças por atleta</h3>
            {report.athletes.map((r) => (
              <div key={r.id} className="att-line">
                <span>
                  {num(r.number)}
                  {r.name}
                </span>
                <span className="att-bar">
                  {r.trainingDays.map((t) => (
                    <i
                      key={t.date}
                      className={
                        t.state === 'presente'
                          ? 'p'
                          : t.state === 'justificada'
                            ? 'j'
                            : t.state === 'injustificada'
                              ? 'u'
                              : 'n'
                      }
                    />
                  ))}
                </span>
                <strong>{dash(r.attendance, '%')}</strong>
              </div>
            ))}
            <p className="legend">
              <i className="sw p" /> presente <i className="sw j" /> justificada <i className="sw u" /> injustificada{' '}
              <i className="sw n" /> sem motivo
            </p>
          </div>
          <div className="panel">
            <h3>Disponibilidade para os jogos</h3>
            {games.length ? (
              <table className="tbl dense">
                <thead>
                  <tr>
                    <th>Jogo</th>
                    <th>Convocados</th>
                    <th>Utilizados</th>
                    <th>Não utilizados</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => (
                    <tr key={g.id}>
                      <td>
                        {dm(g.date)} vs {g.opponent}
                      </td>
                      <td>{g.starters.length + g.benchUsed.length + g.benchUnused}</td>
                      <td>{g.starters.length + g.benchUsed.length}</td>
                      <td>{g.benchUnused}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="free-text empty">Sem jogos neste mês.</p>
            )}
            <h3 className="mt">Motivos das faltas</h3>
            {Object.keys(summary.absences.byReason).length ? (
              Object.entries(summary.absences.byReason).map(([k, n]) => (
                <div key={k} className="bar-line">
                  <span>{ABSENCE_LABEL[k] || 'Sem motivo'}</span>
                  <Bar
                    value={n}
                    max={Math.max(...Object.values(summary.absences.byReason), 1)}
                    tone={k === 'injustificada' ? '' : 'soft'}
                  />
                  <strong>{n}</strong>
                </div>
              ))
            ) : (
              <p className="free-text empty">Sem faltas nos treinos realizados.</p>
            )}
            <p className="panel-hint">
              A aplicação guarda a disponibilidade atual de cada atleta, não o histórico por jogo: aqui mostra-se quem
              foi convocado e utilizado.
            </p>
          </div>
        </div>
      </ReportPage>

      {/* ANÁLISE E DESENVOLVIMENTO */}
      <ReportPage {...frame} n={next()} kicker="Secção 5" title="Análise e desenvolvimento">
        <p className="intro">Escrito pelo treinador. A aplicação não preenche esta secção a partir das estatísticas.</p>
        <div className="qual-grid">
          {REPORT_TEXT_FIELDS.slice(1).map(([k, label]) => (
            <div key={k} className="panel">
              <h3>{label}</h3>
              <Text value={texts[k]} />
            </div>
          ))}
        </div>
      </ReportPage>

      {/* DIMENSÕES */}
      <ReportPage {...frame} n={next()} kicker="Secção 5 · continuação" title="Avaliação qualitativa por dimensões">
        <div className="dims">
          {REPORT_DIMENSIONS.map((d) => {
            const lv = record.dims?.[d];
            const set = lv !== undefined && lv !== null;
            return (
              <div key={d} className="dim">
                <div className="dim-head">
                  <strong>{d}</strong>
                  <span className={`chip ${set ? 'brand' : 'warn'}`}>{set ? REPORT_LEVELS[lv] : 'Por avaliar'}</span>
                </div>
                <div className="scale" aria-hidden>
                  {REPORT_LEVELS.map((l, i) => (
                    <span key={l} className={set && i <= lv ? 'on' : ''} />
                  ))}
                </div>
                {record.dimNotes?.[d]?.trim() && <p className="small">{record.dimNotes[d]}</p>}
              </div>
            );
          })}
        </div>
        <p className="legend">Escala: {REPORT_LEVELS.join(' · ')}. Avaliação da responsabilidade do treinador.</p>
      </ReportPage>

      {/* MÊS SEGUINTE + VALIDAÇÃO */}
      <ReportPage {...frame} n={next()} kicker="Secção 6 e validação" title="Planeamento do mês seguinte">
        <div className="qual-grid">
          {REPORT_NEXT_FIELDS.map(([k, label]) => (
            <div key={k} className="panel">
              <h3>{label}</h3>
              <Text value={nextTexts[k]} />
            </div>
          ))}
          <div className="panel">
            <h3>Jogos e atividades previstos</h3>
            {report.nextMonth.games.length ? (
              report.nextMonth.games.slice(0, 8).map((g) => (
                <p key={g.date + g.opponent} className="small">
                  <strong>{dm(g.date)}</strong> vs {g.opponent} · {g.competition}
                </p>
              ))
            ) : (
              <p className="free-text empty">Sem jogos marcados na Agenda para {report.nextMonth.label}.</p>
            )}
            {report.nextMonth.objectives.length > 0 && (
              <>
                <p className="lbl mt">Objetivos do mês (Época)</p>
                {report.nextMonth.objectives.map((o) => (
                  <p key={o} className="small">
                    • {o}
                  </p>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="validation">
          <h3>Validação</h3>
          <div className="val-grid">
            <div>
              <p className="lbl">Treinador</p>
              <p>{coachName || '—'}</p>
            </div>
            <div>
              <p className="lbl">Data de elaboração</p>
              <p>{record.updatedAt ? dm(record.updatedAt) + '/' + record.updatedAt.slice(0, 4) : '—'}</p>
            </div>
            <div>
              <p className="lbl">Estado do relatório</p>
              <p>
                <span className={`chip ${record.status === 'rascunho' ? 'warn' : 'ok'}`}>
                  {REPORT_STATUS_LABEL[record.status]}
                </span>
              </p>
            </div>
          </div>
          <div className="val-grid two">
            <div className="sign">
              <p className="lbl">Validação do treinador</p>
              <div className="sign-line">
                {signature ? (
                  <img src={signature} alt="Assinatura" className="sign-img" />
                ) : record.status !== 'rascunho' ? (
                  `✓ Validado por ${record.validatedBy || coachName}${record.validatedAt ? ` a ${dm(record.validatedAt)}/${record.validatedAt.slice(0, 4)}` : ''}`
                ) : (
                  ''
                )}
              </div>
            </div>
            <div className="sign">
              <p className="lbl">Observações do coordenador</p>
              <div className="sign-box">{record.coordinatorNotes}</div>
            </div>
          </div>
        </div>
      </ReportPage>
    </div>
  );
};
