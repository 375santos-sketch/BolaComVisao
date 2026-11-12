import React, { useLayoutEffect, useRef, useState } from 'react';
import { DEMO } from './demoData';
import { athleteRows, missing, summary } from './reportModel';
import { ReportPages } from './ReportPages';
import { DIMENSIONS, LEVELS, NEXT_FIELDS, QUAL_FIELDS, Qualitative, ReportStatus, STATUS_LABEL } from './reportFields';

/** The coach's text in the demonstration (fictitious, so the preview shows a filled report). */
const DEMO_TEXT: Qualitative = {
  evolucao:
    'Mês de consolidação da saída de bola curta e de introdução da reação à perda. A equipa ganhou confiança com bola e começou a pressionar de forma coordenada nos primeiros segundos após a perda.',
  positivos:
    'Compromisso nos treinos (assiduidade elevada), melhoria na circulação pelo corredor central e maior número de remates.',
  dificuldades: 'Comunicação defensiva e ocupação do corredor lateral direito quando a bola está no lado contrário.',
  consolidados: 'Saída curta com o guarda-redes; apoio frontal ao portador da bola.',
  melhorar: 'Largura no último terço e remate com o pé menos dominante.',
  acompanhamento: '',
  observacoes: '',
  dims: {
    'Organização ofensiva': 2,
    'Organização defensiva': 1,
    Transições: 1,
    'Reação à perda': 2,
    'Tomada de decisão': 1,
    'Técnica individual': 2,
    'Espírito de equipa': 3,
    'Disciplina e compromisso': null
  },
  dimNotes: { 'Reação à perda': 'Melhoria clara desde o treino nº 11.' },
  next: {
    tecnicos: 'Remate de primeira e com o pé menos dominante; receção orientada.',
    taticos: 'Ocupação dos corredores laterais; largura no último terço.',
    fisicos: 'Velocidade de reação e mudanças de direção com bola.',
    comportamentais: 'Comunicação entre a linha defensiva; liderança positiva nos treinos.',
    prioritarios: 'Consolidar a saída de bola com o guarda-redes.',
    coordenacao: ''
  },
  coordinatorNotes: ''
};

const STEPS = ['Equipa', 'Mês', 'Recolha', 'Resumo', 'Em falta', 'Avaliação', 'Pré-visualização', 'PDF'];

/** A4 (210 mm) is 794 px wide at 96 dpi: the preview scales the pages down to the space it has. */
const A4_PX = 794;

const ScaledPreview: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>();
  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / A4_PX);
      setScale(s);
      setHeight(inner.current.scrollHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="preview-outer" style={{ height }}>
      <div ref={inner} className="preview-scale" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
};

type Tab = 'dados' | 'avaliacao' | 'previa';

export const Prototipo: React.FC = () => {
  const [q, setQ] = useState<Qualitative>(DEMO_TEXT);
  const [status, setStatus] = useState<ReportStatus>('rascunho');
  const [tab, setTab] = useState<Tab>('dados');
  const [athleteId, setAthleteId] = useState('a5');
  const set = (k: keyof Qualitative, v: string) => setQ((p) => ({ ...p, [k]: v }));

  const dataPanel = (
    <>
      <section className="card" aria-label="Equipa e mês">
        <h2 className="card-title">1 · Equipa e mês</h2>
        <div className="field-row">
          <label className="field">
            <span>Equipa</span>
            <select defaultValue="a" aria-label="Equipa">
              <option value="a">
                {DEMO.team} · {DEMO.season}
              </option>
              <option value="b" disabled>
                Sub-13 B (demonstração)
              </option>
            </select>
          </label>
          <label className="field">
            <span>Mês</span>
            <select defaultValue="2026-10" aria-label="Mês">
              <option value="2026-10">{DEMO.monthLabel}</option>
              <option value="2026-09">Setembro 2026</option>
            </select>
          </label>
        </div>
      </section>

      <section className="card" aria-label="Dados recolhidos">
        <h2 className="card-title">2 · Dados recolhidos</h2>
        <div className="mini-kpis">
          <div>
            <strong>{summary.trainingsHeld}</strong>
            <span>treinos realizados</span>
          </div>
          <div>
            <strong>{summary.games}</strong>
            <span>jogos</span>
          </div>
          <div>
            <strong>{summary.attendance}%</strong>
            <span>assiduidade</span>
          </div>
          <div>
            <strong>{summary.competitionMinutes}'</strong>
            <span>de competição</span>
          </div>
        </div>
        <p className="muted">
          Recolhido automaticamente de Planeamento (treinos e presenças), Jogo (resultados, titulares, substituições,
          golos, cartões e estatísticas) e Plantel (atletas e posições).
        </p>
        <label className="field athlete-pick">
          <span>Consultar atleta (aparece na ficha individual do relatório)</span>
          <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)} aria-label="Consultar atleta">
            {athleteRows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} · {r.name} — {r.trainingsPresent}/{r.trainingsHeld} treinos · {r.minutes}' em jogo
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card" aria-label="Informação em falta">
        <h2 className="card-title">
          3 · Informação em falta <span className="count">{missing.length}</span>
        </h2>
        <ul className="missing">
          {missing.map((m, i) => (
            <li key={i} className={m.level}>
              <span aria-hidden>{m.level === 'aviso' ? '⚠' : 'ℹ'}</span>
              {m.text}
            </li>
          ))}
        </ul>
        <p className="muted">
          Nada disto é preenchido pela aplicação: o treinador completa no módulo de origem ou deixa assinalado.
        </p>
      </section>
    </>
  );

  const evalPanel = (
    <>
      <section className="card" aria-label="Análise e desenvolvimento">
        <h2 className="card-title">4 · Análise e desenvolvimento</h2>
        {QUAL_FIELDS.map(([k, label]) => (
          <label key={k} className="field">
            <span>{label}</span>
            <textarea rows={k === 'evolucao' ? 3 : 2} value={q[k] as string} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
      </section>
      <section className="card" aria-label="Avaliação por dimensões">
        <h2 className="card-title">5 · Avaliação por dimensões</h2>
        <p className="muted">Da responsabilidade do treinador; nunca calculada a partir das estatísticas.</p>
        {DIMENSIONS.map((d) => (
          <div key={d} className="dim-edit">
            <span>{d}</span>
            <div role="radiogroup" aria-label={d} className="seg">
              {LEVELS.map((l, i) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={q.dims[d] === i}
                  className={q.dims[d] === i ? 'on' : ''}
                  onClick={() => setQ((p) => ({ ...p, dims: { ...p.dims, [d]: p.dims[d] === i ? null : i } }))}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="card" aria-label="Planeamento do mês seguinte">
        <h2 className="card-title">6 · Planeamento do mês seguinte</h2>
        {NEXT_FIELDS.map(([k, label]) => (
          <label key={k} className="field">
            <span>{label}</span>
            <textarea
              rows={2}
              value={q.next[k] || ''}
              onChange={(e) => setQ((p) => ({ ...p, next: { ...p.next, [k]: e.target.value } }))}
            />
          </label>
        ))}
      </section>
    </>
  );

  return (
    <div className="proto">
      <div className="demo-banner" role="note">
        Protótipo · dados fictícios de demonstração · nada é guardado nem lido da aplicação
      </div>
      <header className="proto-head">
        <div className="proto-title">
          <img src="/icons/icon-192.png" alt="" />
          <div>
            <h1>Relatórios</h1>
            <p>
              Relatório mensal · {DEMO.team} · {DEMO.monthLabel}
            </p>
          </div>
        </div>
        <div className="proto-actions">
          <div role="group" aria-label="Estado do relatório" className="status-seg">
            {(Object.keys(STATUS_LABEL) as ReportStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                className={status === s ? 'on' : ''}
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Gerar PDF
          </button>
        </div>
      </header>

      <ol className="steps" aria-label="Passos">
        {STEPS.map((s, i) => (
          <li key={s} className={i < 7 ? 'done' : ''}>
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <nav className="tabs" aria-label="Partes do relatório">
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
            className={tab === k ? 'on' : ''}
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </nav>

      <main className="proto-main">
        <aside className={`side ${tab === 'previa' ? 'hide-narrow' : ''}`}>
          <div className={tab === 'dados' ? '' : 'hide-narrow'}>{dataPanel}</div>
          <div className={tab === 'avaliacao' ? '' : 'hide-narrow'}>{evalPanel}</div>
        </aside>
        <section
          className={`preview ${tab === 'previa' ? '' : 'hide-narrow'}`}
          aria-label="Pré-visualização do relatório"
        >
          <ScaledPreview>
            <ReportPages q={q} status={status} athleteId={athleteId} />
          </ScaledPreview>
        </section>
      </main>
    </div>
  );
};
