import { AppState } from '../types';
import { buildXlsx, Cell, ChartSpec, SheetSpec } from './excel/xlsxWriter';
import { buildGamesDashboard, RankRow } from './gamesDashboard';
import { describePanelFilter } from './pdf/createSeasonReport';
import { buildPowerBiTables } from './powerBiExport';
import { PanelFilter, panelMatches } from './statsPanel';

// Light-surface steps of the validated categorical palette (same as the PDF) and a neutral.
const BLUE = '2A78D6';
const ORANGE = 'EB6834';
const GREY = '94A3B8';

const DATA = 'Dados dos gráficos';
const pct = (v: number) => Math.round(v * 100) / 100;

/**
 * Excel for the chosen games: sheet "Painel" with the headline figures and native charts (minutes per athlete,
 * goals per game, how and when we score, goals and assists), the charts' data, and the Power BI tables.
 */
export function buildGamesDashboardWorkbook(state: AppState, filter?: PanelFilter): Uint8Array {
  const f: PanelFilter = filter || { scope: 'epoca', season: state.season };
  const games = panelMatches(state.matches || [], f);
  const d = buildGamesDashboard(games, state);
  const club = (state.myClubName || '').trim() || 'A nossa equipa';

  // --- Data for the charts (blocks side by side, one header row each) ---
  const data: (Cell | string | number | null)[][] = [];
  const put = (r: number, c: number, v: Cell | string | number | null) => {
    while (data.length <= r) data.push([]);
    data[r][c] = v;
  };
  const header = (c: number, titles: string[]) => titles.forEach((t, i) => put(0, c + i, { v: t, s: 'header' }));

  header(0, ['Nº', 'Atleta', 'Minutos', '% possíveis', 'Golos', 'Assistências', 'Titular']);
  d.squad.forEach((s, i) => {
    put(i + 1, 0, s.number === null ? null : Number(s.number) || String(s.number));
    put(i + 1, 1, `${s.number !== null && s.number !== '' ? `${s.number} · ` : ''}${s.name}`);
    put(i + 1, 2, s.minutes);
    put(i + 1, 3, { v: pct(s.share), s: 'percent' });
    put(i + 1, 4, s.goals);
    put(i + 1, 5, s.assists);
    put(i + 1, 6, s.started ? 'Sim' : 'Só suplente');
  });
  header(8, ['Jogo', 'Marcados', 'Sofridos']);
  d.games.forEach((g, i) => {
    put(i + 1, 8, `${g.date.slice(8, 10)}/${g.date.slice(5, 7)} ${g.opponent}`);
    put(i + 1, 9, g.scored);
    put(i + 1, 10, g.conceded);
  });
  header(12, ['Origem', 'Golos']);
  d.origins.forEach((o, i) => {
    put(i + 1, 12, o.label);
    put(i + 1, 13, o.goals);
  });
  header(15, ['Bloco', '1.ª parte', '2.ª parte']);
  d.whenScored.forEach((b, i) => {
    put(i + 1, 15, b.label);
    put(i + 1, 16, b.half === 1 ? b.goals : null);
    put(i + 1, 17, b.half === 2 ? b.goals : null);
  });

  // --- Charts on the "Painel" sheet: two columns of charts below the figures ---
  const charts: ChartSpec[] = [];
  const left = { from: 0, to: 8 };
  const right = { from: 9, to: 17 };
  let rowL = 9;
  let rowR = 9;
  const place = (side: 'l' | 'r', height: number) => {
    const col = side === 'l' ? left : right;
    const start = side === 'l' ? rowL : rowR;
    if (side === 'l') rowL += height + 1;
    else rowR += height + 1;
    return { from: { col: col.from, row: start }, to: { col: col.to, row: start + height } };
  };
  const squadRows = Math.max(1, d.squad.length);
  if (d.squad.length > 0) {
    charts.push({
      title: 'Minutos jogados por atleta',
      dir: 'bar',
      dataSheet: DATA,
      firstRow: 1,
      lastRow: squadRows,
      categoriesCol: 1,
      categories: d.squad.map((s) => `${s.number !== null && s.number !== '' ? `${s.number} · ` : ''}${s.name}`),
      series: [{ name: 'Minutos', color: BLUE, valuesCol: 2, values: d.squad.map((s) => s.minutes) }],
      ...place('l', Math.max(14, Math.round(squadRows * 1.4) + 4))
    });
  }
  if (d.games.length > 0) {
    charts.push({
      title: 'Golos por jogo',
      dir: 'col',
      dataSheet: DATA,
      firstRow: 1,
      lastRow: d.games.length,
      categoriesCol: 8,
      categories: d.games.map((g) => `${g.date.slice(8, 10)}/${g.date.slice(5, 7)} ${g.opponent}`),
      series: [
        { name: 'Marcados', color: BLUE, valuesCol: 9, values: d.games.map((g) => g.scored) },
        { name: 'Sofridos', color: ORANGE, valuesCol: 10, values: d.games.map((g) => g.conceded) }
      ],
      ...place('r', 15)
    });
  }
  if (d.origins.length > 0) {
    charts.push({
      title: 'Como marcamos (origem dos golos)',
      dir: 'bar',
      dataSheet: DATA,
      firstRow: 1,
      lastRow: d.origins.length,
      categoriesCol: 12,
      categories: d.origins.map((o) => o.label),
      series: [{ name: 'Golos', color: BLUE, valuesCol: 13, values: d.origins.map((o) => o.goals) }],
      ...place('r', Math.max(10, d.origins.length * 2 + 4))
    });
  }
  charts.push({
    title: `Quando marcamos (blocos de 10', jogo de 2 x ${d.halfMinutes}')`,
    dir: 'col',
    dataSheet: DATA,
    firstRow: 1,
    lastRow: d.whenScored.length,
    categoriesCol: 15,
    categories: d.whenScored.map((b) => b.label),
    series: [
      {
        name: '1.ª parte',
        color: BLUE,
        valuesCol: 16,
        values: d.whenScored.map((b) => (b.half === 1 ? b.goals : null))
      },
      {
        name: '2.ª parte',
        color: ORANGE,
        valuesCol: 17,
        values: d.whenScored.map((b) => (b.half === 2 ? b.goals : null))
      }
    ],
    overlap: 100,
    ...place(rowL <= rowR ? 'l' : 'r', 15)
  });
  if (d.squad.some((s) => s.goals + s.assists > 0)) {
    charts.push({
      title: 'Golos e assistências por atleta',
      dir: 'col',
      dataSheet: DATA,
      firstRow: 1,
      lastRow: squadRows,
      categoriesCol: 1,
      categories: d.squad.map((s) => `${s.number !== null && s.number !== '' ? `${s.number} · ` : ''}${s.name}`),
      series: [
        { name: 'Golos', color: BLUE, valuesCol: 4, values: d.squad.map((s) => s.goals) },
        { name: 'Assistências', color: GREY, valuesCol: 5, values: d.squad.map((s) => s.assists) }
      ],
      ...place(rowL <= rowR ? 'l' : 'r', 16)
    });
  }

  // --- "Painel" sheet: title, figures, charts, then the top 3 rankings below the charts ---
  const s = d.shots;
  const panel: (Cell | string | number | null)[][] = [
    [{ v: `${club} · Painel de jogos`, s: 'title' }],
    [
      {
        v: `${describePanelFilter(f, state)} · BolaComVisão · emitido em ${new Date().toLocaleDateString('pt-PT')}`,
        s: 'subtitle'
      }
    ],
    [],
    [
      { v: 'Jogos', s: 'header' },
      { v: 'V-E-D', s: 'header' },
      { v: 'Golos marcados', s: 'header' },
      { v: 'Golos sofridos', s: 'header' },
      { v: 'Golos/jogo', s: 'header' },
      { v: 'Remates', s: 'header' },
      { v: '% dentro da área', s: 'header' },
      { v: 'Eficácia', s: 'header' },
      { v: 'Cantos (F-C)', s: 'header' }
    ],
    [
      { v: d.played, s: 'kpi' },
      { v: `${d.wins}-${d.draws}-${d.losses}`, s: 'kpi' },
      { v: d.scored, s: 'kpi' },
      { v: d.conceded, s: 'kpi' },
      { v: d.played ? Math.round((d.scored / d.played) * 10) / 10 : 0, s: 'kpi' },
      { v: s.games ? `${s.for}-${s.against}` : '—', s: 'kpi' },
      { v: s.games && s.for ? `${Math.round((s.inBoxFor / s.for) * 100)}%` : '—', s: 'kpi' },
      { v: s.efficacy === null ? '—' : `${Math.round(s.efficacy * 100)}%`, s: 'kpi' },
      { v: d.setPieces.games ? `${d.setPieces.cornersFor}-${d.setPieces.cornersAgainst}` : '—', s: 'kpi' }
    ],
    [
      {
        v: 'Os gráficos usam a folha "Dados dos gráficos"; as folhas seguintes são as tabelas para o Power BI.',
        s: 'muted'
      }
    ]
  ];
  const ranks = Math.max(rowL, rowR) + 1;
  const rankBlock = (col: number, title: string, rows: RankRow[], unit: string) => {
    const at = (r: number, c: number, v: Cell | string | number | null) => {
      while (panel.length <= r) panel.push([]);
      panel[r][c] = v;
    };
    at(ranks, col, { v: title, s: 'header' });
    at(ranks, col + 1, { v: '', s: 'header' });
    at(ranks, col + 2, { v: unit, s: 'header' });
    rows.forEach((r, i) => {
      at(ranks + 1 + i, col, `${r.rank}º`);
      at(ranks + 1 + i, col + 1, { v: r.name, s: 'bold' });
      at(ranks + 1 + i, col + 2, r.value);
    });
  };
  rankBlock(0, 'Top 3 golos', d.topGoals, 'golos');
  rankBlock(4, 'Top 3 assistências', d.topAssists, 'assist.');
  rankBlock(9, 'Mais minutos', d.mostMinutes, 'min');
  rankBlock(13, 'Menos minutos', d.leastMinutes, 'min');

  const pbi = buildPowerBiTables(state);
  const sheets: SheetSpec[] = [
    {
      name: 'Painel',
      rows: panel,
      colWidths: [10, 10, 15, 14, 11, 11, 15, 10, 12, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      charts
    },
    { name: DATA, rows: data, colWidths: [6, 22, 10, 12, 8, 12, 12, 3, 26, 10, 10, 3, 24, 8, 3, 10, 10, 10] },
    ...Object.entries(pbi).map(([name, rows]) => ({ name, rows }))
  ];
  return buildXlsx(sheets);
}

/** Downloads the Excel (Painel with charts + Power BI tables). */
export function exportGamesDashboardExcel(state: AppState, filter?: PanelFilter): string {
  const bytes = buildGamesDashboardWorkbook(state, filter);
  const club = (state.myClubName || 'Clube').replace(/[^a-zA-Z0-9]/g, '_');
  const name = `Painel_Jogos_${club}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}
