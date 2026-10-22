import { AppState, Match } from '../../types';
import { PanelFilter, panelMatches, teamPanel } from '../statsPanel';
import { computeSeasonPlayingTime } from '../playingTime';
import { t } from '../../i18n/dict';
import type { TimePeriodKey, AggregatedAnalysis, AnalysisFilters } from '../gameAnalysisUtils';
import { getJsPDF, drawDocumentHeader, addBolaComVisaoPageFooters, createTextReportWriter } from './pdfLayout';

/** Which games a statistics report covers, in words (for the PDF heading). */
export function describePanelFilter(f: PanelFilter, state: Pick<AppState, 'matches'>): string {
  switch (f.scope) {
    case 'jogo': {
      const m = (state.matches || []).find((x) => x.id === f.matchId);
      return m ? `Jogo: ${m.date.split('-').reverse().join('/')} vs ${m.opponent}` : 'Jogo';
    }
    case 'confronto':
      return `Confronto: todos os jogos contra ${f.opponent || ''}`;
    case 'fase':
      return `Fase: ${f.phase || ''} (época ${f.season || ''})`;
    case 'periodo': {
      const d = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '…');
      return `Período: ${d(f.from)} a ${d(f.to)}`;
    }
    default:
      return `Época ${f.season || ''}`;
  }
}

type Col = { title: string; width: number; align?: 'left' | 'right' | 'center' };

/** Simple table with a dark header row, zebra rows and page breaks (no emojis: the PDF fonts cannot draw them). */
function drawTable(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  startY: number,
  cols: Col[],
  rows: string[][]
) {
  const left = 15;
  let y = startY;
  const header = () => {
    doc.setFillColor(226, 232, 240);
    doc.rect(left, y - 4.2, 180, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    let x = left + 2;
    cols.forEach((c) => {
      const tx = c.align === 'right' ? x + c.width - 3 : c.align === 'center' ? x + c.width / 2 : x;
      doc.text(c.title, tx, y, { align: c.align || 'left' });
      x += c.width;
    });
    y += 6;
  };
  header();
  rows.forEach((r, i) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
      header();
    }
    if (i % 2 === 1) {
      doc.setFillColor(246, 248, 251);
      doc.rect(left, y - 4.2, 180, 5.6, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 30, 40);
    let x = left + 2;
    cols.forEach((c, ci) => {
      const tx = c.align === 'right' ? x + c.width - 3 : c.align === 'center' ? x + c.width / 2 : x;
      const text = (doc.splitTextToSize(r[ci] ?? '', c.width - 3) as string[])[0] || '';
      doc.text(text, tx, y, { align: c.align || 'left' });
      x += c.width;
    });
    y += 5.6;
  });
  return y + 3;
}

/**
 * Statistics report for the games of a filter (season by default): results, goals and assists per athlete,
 * minutes per athlete and the games with who scored.
 */
export async function buildStatsReportPDF(state: AppState, filter?: PanelFilter) {
  const f: PanelFilter = filter || { scope: 'epoca', season: state.season };
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const games = panelMatches(state.matches || [], f);
  const team = teamPanel(games, state.roster || []);
  const roster = state.roster || [];
  const shirt = (id: string) => {
    const p = roster.find((x) => x.id === id);
    return p && p.number !== null && p.number !== undefined ? String(p.number) : '';
  };

  drawDocumentHeader(doc, state, 'RELATÓRIO DE ESTATÍSTICAS');
  const w = createTextReportWriter(doc, 48);
  w.centered(describePanelFilter(f, state), { size: 11, bold: true });
  w.skip(1);
  const extras = [
    team.shots.games ? `Remates ${team.shots.for}-${team.shots.against} (${team.shots.games} jogos)` : null,
    team.corners.games ? `Cantos ${team.corners.for}-${team.corners.against} (${team.corners.games} jogos)` : null
  ].filter(Boolean);
  w.centered(
    [
      `${team.played} jogos`,
      `${team.wins}V ${team.draws}E ${team.losses}D`,
      `golos ${team.scored}-${team.conceded}`,
      ...extras
    ].join('  •  '),
    { size: 9, color: [71, 85, 105] }
  );
  w.skip(4);

  w.heading('Golos e assistências');
  let y = w.y + 2;
  y =
    team.scorers.length === 0
      ? (w.paragraph('Sem golos registados.'), w.y)
      : drawTable(
          doc,
          y,
          [
            { title: 'Nº', width: 14 },
            { title: 'Atleta', width: 110 },
            { title: 'Golos', width: 28, align: 'right' },
            { title: 'Assist.', width: 28, align: 'right' }
          ],
          team.scorers.map((s) => [shirt(s.playerId), s.name, String(s.goals), String(s.assists)])
        );

  const minutes = computeSeasonPlayingTime(games, roster, state.category)
    .filter((r) => r.matchesCalledUp > 0)
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'pt-PT'));
  const w2 = createTextReportWriter(doc, y + 4);
  w2.heading('Minutos por atleta');
  y = w2.y + 2;
  y =
    minutes.length === 0
      ? (w2.paragraph('Sem minutos registados.'), w2.y)
      : drawTable(
          doc,
          y,
          [
            { title: 'Nº', width: 14 },
            { title: 'Atleta', width: 70 },
            { title: 'Jogou/conv.', width: 26, align: 'center' },
            { title: 'Titular', width: 20, align: 'center' },
            { title: 'Minutos', width: 24, align: 'right' },
            { title: '% possíveis', width: 26, align: 'right' }
          ],
          minutes.map((r) => [
            r.number !== null && r.number !== undefined ? String(r.number) : '',
            r.name,
            `${r.matchesPlayed}/${r.matchesCalledUp}`,
            String(r.starts),
            String(r.minutes),
            `${Math.round(r.share * 100)}%`
          ])
        );

  const w3 = createTextReportWriter(doc, y + 4);
  w3.heading('Jogos');
  y = w3.y + 2;
  const scorersOf = (m: Match) => {
    const counts = new Map<string, number>();
    (m.goals || [])
      .filter((g) => g.type === 'scored' && g.scorerId)
      .forEach((g) => {
        const name = roster.find((p) => p.id === g.scorerId)?.name || (g.scorerId === 'autogolo' ? 'Autogolo' : '');
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      });
    return [...counts].map(([n, c]) => (c > 1 ? `${n} (${c})` : n)).join(', ');
  };
  drawTable(
    doc,
    y,
    [
      { title: 'Data', width: 22 },
      { title: 'Adversário', width: 58 },
      { title: 'Res.', width: 16, align: 'center' },
      { title: 'Marcadores', width: 84 }
    ],
    games.map((m) => {
      const r = team.games.find((g) => g.matchId === m.id)!;
      return [
        m.date.split('-').reverse().join('/'),
        `${m.opponent}${r.home ? '' : ' (fora)'}`,
        `${r.scored}-${r.conceded}`,
        scorersOf(m) || '—'
      ];
    })
  );

  addBolaComVisaoPageFooters(doc);
  return doc;
}

/** Estatísticas → "Exportar PDF": the season report (or the games of the panel's filter). */
export async function generateSeasonStatsPDF(state: AppState, filter?: PanelFilter) {
  const doc = await buildStatsReportPDF(state, filter);
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');
  const sanitize = (v: string) => v.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Estatisticas_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 3. Relatório Oficial de Análise Estatística dos Jogos (Dashboard de Análise)
 */
export async function generateGameAnalysisPDF(analysis: AggregatedAnalysis, filters: AnalysisFilters, state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');
  const brandDark = [15, 30, 52];
  const lightGray = [245, 248, 252];
  const darkText = [20, 30, 42];
  const mutedText = [90, 110, 130];
  const greenText = [16, 140, 70];
  const redText = [200, 40, 40];

  // Header with Left Club Crest & Right BolaComVisao Logo
  drawDocumentHeader(doc, state, 'RELATÓRIO DE ANÁLISE DOS JOGOS', `DASHBOARD ESTATÍSTICO • ${myClub.toUpperCase()}`);

  let curY = 46;

  // 1. Filtros Aplicados no Topo
  doc.setFillColor(15, 30, 52);
  doc.roundedRect(15, curY, 180, 14, 2, 2, 'F');
  doc.setDrawColor(0, 210, 255);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, curY, 180, 14, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 210, 255);
  doc.text('FILTROS APLICADOS:', 20, curY + 5.5);

  const filterParts = [];
  if (filters.season && filters.season !== 'todas') filterParts.push(`Época: ${filters.season}`);
  if (filters.month && filters.month !== 'todos') filterParts.push(`Mês: ${filters.month}`);
  if (filters.opponent && filters.opponent !== 'todos') filterParts.push(`Adversário: ${filters.opponent}`);
  if (filters.matchType && filters.matchType !== 'todos') filterParts.push(`Tipo: ${filters.matchType}`);
  if (filters.location && filters.location !== 'todos') filterParts.push(`Local: ${filters.location}`);
  if (filters.eventType && filters.eventType !== 'todos') filterParts.push(`Evento: ${filters.eventType}`);
  if (filterParts.length === 0) filterParts.push('Todos os Jogos e Períodos');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(240, 248, 255);
  doc.text(filterParts.join('  •  '), 20, curY + 10.5);

  curY += 18;

  // 2. Indicadores Principais (KPIs em Caixas)
  const drawKpiCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    mainVal: string,
    subVal: string,
    color: number[]
  ) => {
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    doc.setDrawColor(210, 225, 240);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(title.toUpperCase(), x + 3, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(mainVal, x + 3, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(subVal, x + 3, y + 15);
  };

  const kpiW = 42;
  const kpiH = 17;
  const kpiY = curY;

  drawKpiCard(
    15,
    kpiY,
    kpiW,
    kpiH,
    'Jogos Analisados',
    `${analysis.totalMatches} jogos`,
    `${analysis.finishedMatchesCount} concluídos`,
    brandDark
  );
  drawKpiCard(
    61,
    kpiY,
    kpiW,
    kpiH,
    'Vitórias / Aproveitamento',
    `${analysis.wins}V (${analysis.winPercentage}%)`,
    `${analysis.draws}E • ${analysis.losses}D`,
    greenText
  );
  drawKpiCard(
    107,
    kpiY,
    kpiW,
    kpiH,
    'Golos Marcados / Sofridos',
    `${analysis.goalsScored} - ${analysis.goalsConceded}`,
    `Saldo: ${analysis.goalDifference > 0 ? '+' : ''}${analysis.goalDifference}`,
    [0, 140, 220]
  );
  drawKpiCard(
    153,
    kpiY,
    kpiW,
    kpiH,
    'Clean Sheets & Defesa',
    `${analysis.cleanSheets} jogos`,
    `Média sofr.: ${analysis.avgGoalsConceded}/j`,
    redText
  );

  curY += 21;

  // 2.5 Insights Automáticos ("O Que os Dados Nos Dizem")
  if (analysis.insights && analysis.insights.length > 0) {
    const topInsights = analysis.insights.slice(0, 3);
    const boxH = 5 + topInsights.length * 4.2;
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(15, curY, 180, boxH, 1.5, 1.5, 'F');
    doc.setDrawColor(0, 180, 230);
    doc.setLineWidth(0.4);
    doc.roundedRect(15, curY, 180, boxH, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 120, 200);
    doc.text('INSIGHTS AUTOMÁTICOS (O QUE OS DADOS NOS DIZEM):', 18, curY + 4);

    doc.setFontSize(6.2);
    topInsights.forEach((ins, idx) => {
      const insY = curY + 7.8 + idx * 4.2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(`• ${ins.badgeText}:`, 20, insY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(ins.description, 45, insY);
    });

    curY += boxH + 3.5;
  }

  // 3. Onde Estamos a Marcar e a Sofrer (Distribuição por Períodos do Jogo - 5 em 5 min)
  doc.setFillColor(15, 30, 52);
  doc.rect(15, curY, 180, 6, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(15, curY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DISTRIBUIÇÃO TEMPORAL DE GOLOS (SUB-11: 2 x 30 MIN EM BLOCOS DE 5 MIN)', 20, curY + 4.2);

  curY += 8;

  const halfColW = 88;
  const col1X = 15;
  const col2X = 107;

  // Header 1ª Parte
  doc.setFillColor(235, 242, 250);
  doc.rect(col1X, curY - 2.5, halfColW, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('1.ª Parte (0–30 min)', col1X + 3, curY + 1.2);
  doc.text('Golos', col1X + 45, curY + 1.2);
  doc.text('Saldo', col1X + 75, curY + 1.2);

  // Header 2ª Parte
  doc.setFillColor(235, 242, 250);
  doc.rect(col2X, curY - 2.5, halfColW, 5.5, 'F');
  doc.text('2.ª Parte (31–60 min)', col2X + 3, curY + 1.2);
  doc.text('Golos', col2X + 45, curY + 1.2);
  doc.text('Saldo', col2X + 75, curY + 1.2);

  curY += 5;

  const firstHalfKeys: TimePeriodKey[] = ['0-5', '6-10', '11-15', '16-20', '21-25', '26-30'];
  const secondHalfKeys: TimePeriodKey[] = ['31-35', '36-40', '41-45', '46-50', '51-55', '56-60', '60+'];

  const maxRows = Math.max(firstHalfKeys.length, secondHalfKeys.length);
  const startRowY = curY;

  for (let i = 0; i < maxRows; i++) {
    const rowY = startRowY + i * 5;

    // Left Column (1ª Parte)
    if (i < firstHalfKeys.length) {
      const key = firstHalfKeys[i];
      const tp = analysis.timePeriods[key] || { key, label: key, scored: 0, conceded: 0 };
      const diff = tp.scored - tp.conceded;
      const diffColor = diff > 0 ? greenText : diff < 0 ? redText : mutedText;

      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 251, i % 2 === 0 ? 255 : 254);
      doc.rect(col1X, rowY - 2.5, halfColW, 5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(tp.label, col1X + 3, rowY + 1.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 140, 220);
      doc.text(`Marcados: ${tp.scored}`, col1X + 43, rowY + 1.2);
      doc.setTextColor(redText[0], redText[1], redText[2]);
      doc.text(`Sofridos: ${tp.conceded}`, col1X + 60, rowY + 1.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
      doc.text(`${diff > 0 ? '+' : ''}${diff}`, col1X + 78, rowY + 1.2);
    }

    // Right Column (2ª Parte)
    if (i < secondHalfKeys.length) {
      const key = secondHalfKeys[i];
      const tp = analysis.timePeriods[key] || { key, label: key, scored: 0, conceded: 0 };
      const diff = tp.scored - tp.conceded;
      const diffColor = diff > 0 ? greenText : diff < 0 ? redText : mutedText;

      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 251, i % 2 === 0 ? 255 : 254);
      doc.rect(col2X, rowY - 2.5, halfColW, 5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(tp.label, col2X + 3, rowY + 1.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 140, 220);
      doc.text(`Marcados: ${tp.scored}`, col2X + 43, rowY + 1.2);
      doc.setTextColor(redText[0], redText[1], redText[2]);
      doc.text(`Sofridos: ${tp.conceded}`, col2X + 60, rowY + 1.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
      doc.text(`${diff > 0 ? '+' : ''}${diff}`, col2X + 78, rowY + 1.2);
    }
  }

  curY = startRowY + maxRows * 5 + 4;

  // 4. Origem dos Golos & Disciplina (2 Colunas)
  const colY = curY;
  const colW = 87;

  // Left: Origem dos Golos
  doc.setFillColor(15, 30, 52);
  doc.rect(15, colY, colW, 6, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(15, colY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('ORIGEM DOS GOLOS MARCADOS', 20, colY + 4.2);

  let goalTypeY = colY + 9;
  if (analysis.goalTypes.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Sem golos registados.', 20, goalTypeY);
  } else {
    analysis.goalTypes.slice(0, 6).forEach((gt, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 246, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 254);
      doc.rect(15, goalTypeY - 3, colW, 6, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(gt.type, 19, goalTypeY + 1);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 140, 220);
      doc.text(`${gt.count} (${gt.percentage}%)`, 95, goalTypeY + 1, { align: 'right' });

      goalTypeY += 6;
    });
  }

  // Right: Disciplina e Faltas
  doc.setFillColor(15, 30, 52);
  doc.rect(108, colY, colW, 6, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(108, colY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DISCIPLINA & FALTAS', 113, colY + 4.2);

  let discY = colY + 9;
  const discRows = [
    {
      label: 'Faltas Cometidas (Média)',
      val: analysis.foulsCommittedAvg !== null ? `${analysis.foulsCommittedAvg} / jogo` : 'Não registado'
    },
    {
      label: 'Faltas Sofridas (Média)',
      val: analysis.foulsSufferedAvg !== null ? `${analysis.foulsSufferedAvg} / jogo` : 'Não registado'
    },
    { label: 'Cartões Amarelos Totais', val: `${analysis.yellowCardsTotal}` },
    { label: 'Cartões Vermelhos Totais', val: `${analysis.redCardsTotal}` },
    { label: 'Média de Cartões / Jogo', val: `${analysis.cardsPerMatchAvg}` },
    { label: 'Fator Casa (Vitórias)', val: `${analysis.homeWins}V / ${analysis.homeMatches} jogos` }
  ];

  discRows.forEach((r, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 246, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 254);
    doc.rect(108, discY - 3, colW, 6, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(r.label, 112, discY + 1);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 30, 52);
    doc.text(r.val, 190, discY + 1, { align: 'right' });

    discY += 6;
  });

  curY = Math.max(goalTypeY, discY) + 5;

  // 5. Histórico de Jogos no Período
  if (curY > 230) {
    doc.addPage();
    curY = 20;
  }

  doc.setFillColor(15, 30, 52);
  doc.rect(15, curY, 180, 6, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(15, curY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('JOGOS INTEGRADOS NESTA ANÁLISE', 20, curY + 4.2);

  curY += 9;

  if (analysis.filteredMatches.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Nenhum jogo encontrado com os filtros selecionados.', 20, curY);
  } else {
    analysis.filteredMatches.slice(0, 10).forEach((m, idx) => {
      if (curY > 265) {
        doc.addPage();
        curY = 20;
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 251, idx % 2 === 0 ? 255 : 254);
      doc.rect(15, curY - 3, 180, 6.5, 'F');

      const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
      const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
      const resText = m.finished ? `${sc} - ${co}` : 'Agendado';
      const locText = m.location === 'casa' ? '(Casa)' : '(Fora)';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(`${m.date} • ${m.opponent} ${locText}`, 20, curY + 1.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(m.type || 'Jogo', 120, curY + 1.5);

      doc.setFont('helvetica', 'bold');
      const scoreColor = !m.finished ? mutedText : sc > co ? greenText : sc === co ? [210, 150, 0] : redText;
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(resText, 190, curY + 1.5, { align: 'right' });

      curY += 6.5;
    });
  }

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Analise_Jogos_BolaComVisao_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
