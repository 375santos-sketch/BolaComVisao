import React from 'react';
import { ATHLETES, DEMO, DemoGame, GAMES, NEXT_MONTH_GAMES, TRAININGS } from './demoData';
import {
  JUSTIFIED,
  THEME_LABEL,
  athleteDetail,
  athleteRows,
  collective,
  datePT,
  gameMinutes,
  nameOf,
  numberOf,
  present,
  realized,
  resultOf,
  score,
  summary,
  themes
} from './reportModel';
import { DIMENSIONS, LEVELS, NEXT_FIELDS, QUAL_FIELDS, Qualitative, ReportStatus, STATUS_LABEL } from './reportFields';

const TOTAL_PAGES = 9;
const dash = (v: number | null | undefined, suffix = '') => (v === null || v === undefined ? '—' : `${v}${suffix}`);
const RES_LABEL = { V: 'Vitória', E: 'Empate', D: 'Derrota' } as const;

const Page: React.FC<{ n: number; title: string; kicker: string; children: React.ReactNode }> = ({
  n,
  title,
  kicker,
  children
}) => (
  <section className="a4" aria-label={`Página ${n}: ${title}`}>
    <header className="a4-head">
      <img src="/icons/icon-192.png" alt="" />
      <div className="a4-head-title">
        <span>Relatório mensal de atividade e desenvolvimento</span>
        <strong>
          {DEMO.club} · {DEMO.team} · {DEMO.monthLabel}
        </strong>
      </div>
      <span className="demo-tag">Demonstração</span>
    </header>
    <div className="a4-body">
      <p className="a4-kicker">{kicker}</p>
      <h2 className="a4-title">{title}</h2>
      {children}
    </div>
    <footer className="a4-foot">
      <span>BolaComVisão · {DEMO.club}</span>
      <span>Dados fictícios — protótipo</span>
      <span>
        Página {n} de {TOTAL_PAGES}
      </span>
    </footer>
  </section>
);

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

const Text: React.FC<{ value: string; empty?: string }> = ({ value, empty = 'Por preencher pelo treinador.' }) =>
  value.trim() ? <p className="free-text">{value}</p> : <p className="free-text empty">{empty}</p>;

export const ReportPages: React.FC<{ q: Qualitative; status: ReportStatus; athleteId: string }> = ({
  q,
  status,
  athleteId
}) => {
  const sel = athleteRows.find((r) => r.id === athleteId) || athleteRows[0];
  const det = athleteDetail(sel.id);
  const maxTheme = Math.max(...themes.rows.map(([, m]) => m), 1);
  const maxMinutes = Math.max(...athleteRows.map((r) => r.calledUpMinutes), 1);

  const renderGame = (g: DemoGame) => {
    const s = score(g);
    const res = resultOf(g);
    const mins = gameMinutes(g);
    const bench = g.convocados.filter((id) => !g.lineup.includes(id));
    const usedBench = bench.filter((id) => (mins[id] || 0) > 0);
    return (
      <article key={g.id} className="game">
        <div className="game-head">
          <div>
            <p className="game-meta">
              {datePT(g.date)} · {g.time} · {g.home ? 'Casa' : 'Fora'} · {g.competition}
              {g.round ? ` · ${g.round}` : ''}
            </p>
            <h3>
              {DEMO.team} vs {g.opponent}
            </h3>
          </div>
          <div className={`score ${res}`}>
            <strong>
              {s.scored} – {s.conceded}
            </strong>
            <span>{RES_LABEL[res]}</span>
          </div>
        </div>
        <div className="game-grid">
          <div>
            <p className="lbl">Sistema tático</p>
            <p>{g.system || <span className="na">Não indicado</span>}</p>
            <p className="lbl">Titulares ({g.lineup.length})</p>
            <p className="small">
              {g.lineup.map((id) => `${numberOf(id)} ${nameOf(id).replace('Atleta Demo ', 'AD')}`).join(' · ')}
            </p>
            <p className="lbl">Suplentes utilizados</p>
            <p className="small">
              {usedBench.length ? usedBench.map((id) => `${numberOf(id)} (${mins[id]}')`).join(' · ') : 'Nenhum'}{' '}
              {bench.length > usedBench.length && (
                <span className="na">· {bench.length - usedBench.length} convocado(s) sem utilização</span>
              )}
            </p>
          </div>
          <div>
            <p className="lbl">Substituições</p>
            <p className="small">
              {g.subs.map((x, i) => (
                <span key={i} className="sub">
                  {x.minute}' ↓{numberOf(x.outId)} ↑{numberOf(x.inId)}
                </span>
              ))}
            </p>
            <p className="lbl">Acontecimentos</p>
            <p className="small">
              {[
                ...g.goals.map((x) => ({
                  m: x.minute,
                  t:
                    x.type === 'scored'
                      ? `⚽ ${nameOf(x.scorerId)}${x.assistId ? ` (assist. ${nameOf(x.assistId)})` : ''}`
                      : '⚽ golo sofrido'
                })),
                ...g.cards.map((c) => ({
                  m: c.minute,
                  t: `${c.color === 'Amarelo' ? '🟨' : '🟥'} ${nameOf(c.playerId)}`
                }))
              ]
                .sort((a, b) => a.m - b.m)
                .map((e, i) => (
                  <span key={i} className="evt">
                    {e.m}' {e.t}
                  </span>
                ))}
            </p>
          </div>
          <div className="stats">
            <p className="lbl">Estatísticas (nós · adversário)</p>
            <div className="stat">
              <span>Remates</span>
              <strong>{g.shots ? `${g.shots.for} · ${g.shots.against}` : '—'}</strong>
            </div>
            <div className="stat">
              <span>Cantos</span>
              <strong>{g.corners ? `${g.corners.for} · ${g.corners.against}` : '—'}</strong>
            </div>
            <div className="stat">
              <span>Faltas</span>
              <strong>{g.fouls ? `${g.fouls.for} · ${g.fouls.against}` : '—'}</strong>
            </div>
            <div className="stat">
              <span>Duração</span>
              <strong>
                2×{g.halfMinutes}'{!g.clockRecorded && <em className="est"> estimado</em>}
              </strong>
            </div>
          </div>
        </div>
        <div className="coach-box">
          <p className="lbl">Análise técnica e tática do treinador</p>
          <Text value={g.coachNotes || ''} empty="Sem análise escrita para este jogo." />
        </div>
      </article>
    );
  };

  return (
    <div className="pages">
      {/* 1 · CAPA E RESUMO EXECUTIVO */}
      <section className="a4 cover" aria-label="Página 1: Capa e resumo executivo">
        <div className="cover-top">
          <img src="/icons/icon-192.png" alt="BolaComVisão" className="cover-logo" />
          <span className="demo-tag on-dark">Demonstração · dados fictícios</span>
        </div>
        <div className="cover-title">
          <p className="cover-kicker">{DEMO.monthLabel}</p>
          <h1>
            Relatório mensal
            <br />
            de atividade e desenvolvimento
          </h1>
          <dl className="cover-meta">
            <div>
              <dt>Clube</dt>
              <dd>{DEMO.club}</dd>
            </div>
            <div>
              <dt>Equipa</dt>
              <dd>
                {DEMO.team} · {DEMO.format}
              </dd>
            </div>
            <div>
              <dt>Época</dt>
              <dd>{DEMO.season}</dd>
            </div>
            <div>
              <dt>Treinador</dt>
              <dd>{DEMO.coach}</dd>
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
          <Text value={q.evolucao} empty="O resumo é escrito pelo treinador na secção 5 (Evolução geral da equipa)." />
          <p className="cover-facts">
            {summary.record.gf} golos marcados · {summary.record.ga} sofridos · {summary.trainingsUnclosed} treino por
            fechar · {summary.trainingsScheduled} treino agendado até ao fim do mês
          </p>
        </div>
        <footer className="cover-foot">
          <span>Estado: {STATUS_LABEL[status]}</span>
          <span>Gerado em {DEMO.generatedOn} · BolaComVisão</span>
          <span>Página 1 de {TOTAL_PAGES}</span>
        </footer>
      </section>

      {/* 2 · TREINOS */}
      <Page n={2} kicker="Secção 1" title="Treinos">
        <div className="kpi-row">
          <Kpi label="Realizados" value={summary.trainingsHeld} tone="ok" />
          <Kpi label="Por fechar" value={summary.trainingsUnclosed} tone="warn" hint="não contam nas presenças" />
          <Kpi label="Agendados" value={summary.trainingsScheduled} hint="ainda por realizar" />
          <Kpi label="Minutos de treino" value={`${summary.trainingMinutes}'`} hint="duração total dos realizados" />
        </div>
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
            {TRAININGS.map((t) => (
              <tr key={t.id} className={t.status !== 'realizado' ? 'muted-row' : ''}>
                <td>{t.number}</td>
                <td>
                  {datePT(t.date)}
                  {t.status !== 'realizado' && (
                    <span className={`chip ${t.status === 'por_fechar' ? 'warn' : ''}`}>
                      {t.status === 'por_fechar' ? 'Por fechar' : 'Agendado'}
                    </span>
                  )}
                </td>
                <td>{t.durationMinutes}'</td>
                <td>{t.status === 'realizado' ? `${present(t)}/${ATHLETES.length}` : '—'}</td>
                <td>{t.focus}</td>
                <td>{t.objective || <span className="na">Sem objetivo indicado</span>}</td>
                <td className="small">
                  {t.blocks.length ? (
                    Object.entries(
                      t.blocks.reduce<Record<string, number>>(
                        (a, b) => ({ ...a, [b.theme]: (a[b.theme] || 0) + b.minutes }),
                        {}
                      )
                    )
                      .map(([k, m]) => `${THEME_LABEL[k as keyof typeof THEME_LABEL]} ${m}`)
                      .join(' · ')
                  ) : (
                    <span className="na">Sem plano de sessão</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="two-col">
          <div className="panel">
            <h3>Conteúdos mais trabalhados</h3>
            <p className="panel-hint">
              Minutos dos exercícios, por tema ({themes.withPlan}' com plano). Não é o mesmo que os{' '}
              {summary.trainingMinutes}' de treino: {themes.noPlanCount} treino sem plano ({themes.noPlanMinutes}') fica
              fora desta conta.
            </p>
            {themes.rows.map(([k, m]) => (
              <div key={k} className="bar-line">
                <span>{THEME_LABEL[k]}</span>
                <Bar value={m} max={maxTheme} />
                <strong>{m}'</strong>
              </div>
            ))}
          </div>
          <div className="panel">
            <h3>Observações dos treinos</h3>
            {realized
              .filter((t) => t.notes)
              .map((t) => (
                <p key={t.id} className="note">
                  <strong>
                    Treino nº {t.number} · {datePT(t.date)}
                  </strong>{' '}
                  {t.notes}
                </p>
              ))}
            <p className="panel-hint">
              A aplicação regista hoje temas técnicos, táticos, físicos, de jogo e de bolas paradas. Conteúdos
              psicológicos/comportamentais ainda não têm campo próprio.
            </p>
          </div>
        </div>
      </Page>

      {/* 3 · JOGOS */}
      <Page n={3} kicker="Secção 2" title="Jogos">
        <div className="kpi-row">
          <Kpi label="Jogos" value={summary.games} />
          <Kpi
            label="Vitórias · empates · derrotas"
            value={`${summary.record.V} · ${summary.record.E} · ${summary.record.D}`}
          />
          <Kpi label="Golos marcados" value={summary.record.gf} tone="ok" />
          <Kpi label="Golos sofridos" value={summary.record.ga} tone="bad" />
        </div>
        {GAMES.slice(0, 2).map(renderGame)}
        <p className="legend">Continua na página seguinte.</p>
      </Page>

      {/* 4 · JOGOS (continuação) + ESTATÍSTICAS COLETIVAS */}
      <Page n={4} kicker="Secção 2 · continuação" title="Jogos e estatísticas coletivas">
        {GAMES.slice(2).map(renderGame)}
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
              {collective.map((c) => (
                <tr key={c.label}>
                  <td className="strong">{c.label}</td>
                  <td>{c.for ?? '—'}</td>
                  <td>{c.against ?? '—'}</td>
                  <td>{c.perGame ?? '—'}</td>
                  <td>
                    {c.recorded} de {GAMES.length} jogos
                    {c.recorded < GAMES.length && <span className="chip warn">parcial</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="panel-hint">
            Os totais só somam os jogos em que o indicador foi registado; a média por jogo divide por esses jogos, não
            por todos.
          </p>
        </div>
        <p className="legend">«—» = não registado na aplicação (não significa zero).</p>
      </Page>

      {/* 4 · ESTATÍSTICAS INDIVIDUAIS */}
      <Page n={5} kicker="Secção 3" title="Estatísticas individuais">
        <p className="intro">
          Participação, utilização e desenvolvimento de cada atleta no mês, por ordem de número. Sem rankings: o
          objetivo é acompanhar, não classificar.
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
            {athleteRows.map((r) => (
              <tr key={r.id}>
                <td>{r.number}</td>
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
          1.ª parte · Supl. = entrou como suplente. * inclui minutos estimados (jogo sem relógio). Posições: posição
          principal da ficha do atleta (a posição em cada jogo ainda não é registada).
        </p>
        <div className="panel athlete-card">
          <h3>
            Ficha individual · {sel.number} {sel.name} <span className="chip brand">{sel.position}</span>
          </h3>
          <div className="two-col">
            <div>
              <p className="lbl">
                Treinos ({sel.trainingsPresent}/{sel.trainingsHeld})
              </p>
              <div className="att-bar wrap">
                {det.trainings.map((t) => (
                  <span key={t.number} className={`tday ${t.state.replace(' ', '-')}`} title={t.state}>
                    {datePT(t.date)}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="lbl">Jogos</p>
              {det.games.map((g) => (
                <div key={g.date} className="stat">
                  <span>
                    {datePT(g.date)} vs {g.opponent.replace('Equipa Demo ', '')}
                  </span>
                  <strong>
                    {!g.called
                      ? 'Não convocado'
                      : g.minutes === 0
                        ? 'Convocado, não utilizado'
                        : `${g.starter ? 'Titular' : 'Suplente'} · ${g.minutes}' de ${g.total}'${g.estimated ? '*' : ''}${g.goals ? ` · ⚽${g.goals}` : ''}${g.assists ? ` · 🅰${g.assists}` : ''}`}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Page>

      {/* 5 · ASSIDUIDADE */}
      <Page n={6} kicker="Secção 4" title="Assiduidade">
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
            {athleteRows.map((r) => (
              <div key={r.id} className="att-line">
                <span>
                  {r.number} · {r.name.replace('Atleta Demo', 'AD')}
                </span>
                <span className="att-bar" aria-label={`${r.trainingsPresent} presenças em ${r.trainingsHeld}`}>
                  {[
                    ...Array(r.trainingsPresent).fill('p'),
                    ...Array(r.justified).fill('j'),
                    ...Array(r.unjustified).fill('u'),
                    ...Array(r.noReason).fill('n')
                  ].map((cls, i) => (
                    <i key={i} className={cls} />
                  ))}
                </span>
                <strong>{dash(r.attendance, '%')}</strong>
              </div>
            ))}
            <p className="legend">
              <i className="sw p" /> presente <i className="sw j" /> falta justificada <i className="sw u" />{' '}
              injustificada <i className="sw n" /> sem motivo
            </p>
          </div>
          <div className="panel">
            <h3>Disponibilidade para os jogos</h3>
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
                {GAMES.map((g) => {
                  const mins = gameMinutes(g);
                  const used = g.convocados.filter((id) => (mins[id] || 0) > 0).length;
                  return (
                    <tr key={g.id}>
                      <td>
                        {datePT(g.date)} vs {g.opponent.replace('Equipa Demo ', '')}
                      </td>
                      <td>{g.convocados.length}</td>
                      <td>{used}</td>
                      <td>{g.convocados.length - used}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <h3 className="mt">Motivos das faltas justificadas</h3>
            {Object.entries(JUSTIFIED).map(([k, label]) => {
              const n = realized.reduce((c, t) => c + Object.values(t.absences).filter((r) => r === k).length, 0);
              return (
                <div key={k} className="bar-line">
                  <span>{label}</span>
                  <Bar value={n} max={Math.max(summary.absences.justified, 1)} tone="soft" />
                  <strong>{n}</strong>
                </div>
              );
            })}
            <p className="panel-hint">
              A aplicação guarda a disponibilidade atual de cada atleta (lesionado/castigado até uma data), não o
              histórico por jogo: por isso aqui mostra-se quem foi convocado e utilizado.
            </p>
          </div>
        </div>
      </Page>

      {/* 6 · ANÁLISE E DESENVOLVIMENTO */}
      <Page n={7} kicker="Secção 5" title="Análise e desenvolvimento">
        <p className="intro">Escrito pelo treinador. A aplicação não preenche esta secção a partir das estatísticas.</p>
        <div className="qual-grid">
          {QUAL_FIELDS.slice(1).map(([k, label]) => (
            <div key={k} className="panel">
              <h3>{label}</h3>
              <Text value={q[k] as string} />
            </div>
          ))}
        </div>
      </Page>

      {/* 7 · AVALIAÇÃO POR DIMENSÕES */}
      <Page n={8} kicker="Secção 5 · continuação" title="Avaliação qualitativa por dimensões">
        <div className="dims">
          {DIMENSIONS.map((d) => {
            const lv = q.dims[d];
            return (
              <div key={d} className="dim">
                <div className="dim-head">
                  <strong>{d}</strong>
                  <span className={`chip ${lv === null || lv === undefined ? 'warn' : 'brand'}`}>
                    {lv === null || lv === undefined ? 'Por avaliar' : LEVELS[lv]}
                  </span>
                </div>
                <div className="scale" aria-hidden>
                  {LEVELS.map((l, i) => (
                    <span key={l} className={lv !== null && lv !== undefined && i <= lv ? 'on' : ''} />
                  ))}
                </div>
                {q.dimNotes[d] && <p className="small">{q.dimNotes[d]}</p>}
              </div>
            );
          })}
        </div>
        <p className="legend">Escala: {LEVELS.join(' · ')}. Avaliação da responsabilidade do treinador.</p>
      </Page>

      {/* 8 · PLANEAMENTO DO MÊS SEGUINTE + VALIDAÇÃO */}
      <Page n={9} kicker="Secção 6 e validação" title="Planeamento do mês seguinte">
        <div className="qual-grid">
          {NEXT_FIELDS.map(([k, label]) => (
            <div key={k} className="panel">
              <h3>{label}</h3>
              <Text value={q.next[k] || ''} />
            </div>
          ))}
          <div className="panel">
            <h3>Jogos e atividades previstos</h3>
            {NEXT_MONTH_GAMES.map((g) => (
              <p key={g.date} className="small">
                <strong>{datePT(g.date)}</strong> vs {g.opponent} · {g.competition}
              </p>
            ))}
            <p className="panel-hint">Da Agenda (jogos já marcados para novembro).</p>
          </div>
        </div>
        <div className="validation">
          <h3>Validação</h3>
          <div className="val-grid">
            <div>
              <p className="lbl">Treinador</p>
              <p>{DEMO.coach}</p>
            </div>
            <div>
              <p className="lbl">Data de elaboração</p>
              <p>{DEMO.generatedOn}</p>
            </div>
            <div>
              <p className="lbl">Estado do relatório</p>
              <p>
                <span className={`chip ${status === 'rascunho' ? 'warn' : 'ok'}`}>{STATUS_LABEL[status]}</span>
              </p>
            </div>
          </div>
          <div className="val-grid two">
            <div className="sign">
              <p className="lbl">Validação do treinador</p>
              <div className="sign-line">{status !== 'rascunho' ? `✓ Validado por ${DEMO.coach}` : ''}</div>
            </div>
            <div className="sign">
              <p className="lbl">Observações do coordenador</p>
              <div className="sign-box">{q.coordinatorNotes}</div>
            </div>
          </div>
        </div>
      </Page>
    </div>
  );
};
