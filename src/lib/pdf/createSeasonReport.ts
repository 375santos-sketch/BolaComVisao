import { AppState } from '../../types';
import { playerLabel } from '../utils';
import { t } from '../../i18n/dict';
import type { TimePeriodKey, AggregatedAnalysis, AnalysisFilters } from '../gameAnalysisUtils';
import { getJsPDF, drawDocumentHeader, addBolaComVisaoPageFooters } from './pdfLayout';

/**
 * 1. Relatório de Estatísticas da Época em PDF
 */
export async function generateSeasonStatsPDF(state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');
  const brandDark = [8, 20, 30];
  const lightGray = [242, 246, 250];
  const darkText = [20, 30, 40];
  const mutedText = [90, 110, 130];

  // Header with Left Club Crest & Right BolaComVisao Logo
  drawDocumentHeader(doc, state, 'RELATÓRIO DE ESTATÍSTICAS DA ÉPOCA');

  let curY = 48;

  // Overview stats
  let scored = 0,
    conceded = 0,
    wins = 0,
    draws = 0,
    losses = 0;
  const scorerCount: Record<string, number> = {};
  const assistCount: Record<string, number> = {};

  state.matches.forEach((m) => {
    const sc = m.goals.filter((g) => g.type === 'scored').length;
    const co = m.goals.filter((g) => g.type === 'conceded').length;
    scored += sc;
    conceded += co;
    if (m.finished) {
      if (sc > co) wins++;
      else if (sc === co) draws++;
      else losses++;
    }
    m.goals.forEach((g) => {
      if (g.type === 'scored') {
        if (g.scorerId) scorerCount[g.scorerId] = (scorerCount[g.scorerId] || 0) + 1;
        if (g.assistId && g.assistId !== 'none' && g.assistId !== 'unknown')
          assistCount[g.assistId] = (assistCount[g.assistId] || 0) + 1;
      }
    });
  });

  // KPI boxes
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, curY, 180, 24, 3, 3, 'F');
  doc.setDrawColor(200, 220, 235);
  doc.roundedRect(15, curY, 180, 24, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text(`${state.matches.length}`, 35, curY + 11, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('JOGOS TOTAIS', 35, curY + 18, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(16, 140, 70);
  doc.text(`${wins}V - ${draws}E - ${losses}D`, 90, curY + 11, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('BALANÇO DE RESULTADOS', 90, curY + 18, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 140, 220);
  doc.text(`${scored} : ${conceded}`, 155, curY + 11, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('GOLOS MARCADOS / SOFRIDOS', 155, curY + 18, { align: 'center' });

  curY += 32;

  // Top Scorers
  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(15, curY, 180, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('MELHORES MARCADORES E ASSISTÊNCIAS', 20, curY + 5);
  curY += 12;

  const scorers = Object.entries(scorerCount)
    .map(([id, count]) => {
      const p = state.roster.find((x) => x.id === id);
      return { name: p ? playerLabel(p) : '—', count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  scorers.forEach((sc) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(sc.name, 20, curY);
    doc.setTextColor(0, 140, 220);
    doc.text(`${sc.count} golos`, 170, curY, { align: 'right' });
    curY += 6;
  });

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Estatisticas_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 2. Relatório Institucional da Direção em PDF
 */
export async function generateClubBoardReportPDF(state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName || 'BolaComVisão Clube';
  const season = state.season || '2025/2026';
  const teams = state.teams || [];

  drawDocumentHeader(doc, state, 'RELATÓRIO INSTITUCIONAL DA DIREÇÃO', `ÉPOCA DESPORTIVA ${season}`);

  let curY = 46;

  // Box 1: Indicadores Globais do Clube
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(12, curY, 186, 28, 2, 2, 'F');
  doc.setDrawColor(200, 215, 230);
  doc.roundedRect(12, curY, 186, 28, 2, 2, 'S');

  doc.setFillColor(15, 30, 52);
  doc.rect(12, curY, 186, 6, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(12, curY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('RESUMO EXECUTIVO — INDICADORES GLOBAIS DO CLUBE', 18, curY + 4.2);

  // Stats in 4 columns
  const totalTeams = teams.length;
  let totalPlayers = 0;
  let totalStaff = 0;
  let totalMatches = 0;
  let totalWins = 0;
  let totalGoalsScored = 0;
  let totalTrainings = 0;

  teams.forEach((t) => {
    totalPlayers += (t.roster || []).length;
    totalStaff += (t.staffMembers || []).length;
    totalTrainings += (t.trainings || []).length;
    (t.matches || []).forEach((m) => {
      if (m.finished) {
        totalMatches++;
        const s = (m.goals || []).filter((g) => g.type === 'scored').length;
        const c = (m.goals || []).filter((g) => g.type === 'conceded').length;
        if (s > c) totalWins++;
        totalGoalsScored += s;
      }
    });
  });

  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  const statCols = [
    { label: 'EQUIPAS / ESCALÕES', val: `${totalTeams}` },
    { label: 'ATLETAS REGISTADOS', val: `${totalPlayers} (${totalGoalsScored} golos)` },
    { label: 'STAFF TÉCNICO', val: `${totalStaff} (${totalTrainings} tr.)` },
    { label: 'JOGOS / % VITÓRIAS', val: `${totalMatches} (${winRate}%)` }
  ];

  statCols.forEach((col, idx) => {
    const colX = 16 + idx * 46;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 100, 120);
    doc.text(col.label, colX, curY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 30, 52);
    doc.text(col.val, colX, curY + 21);
  });

  curY += 34;

  // Box 2: Tabela de Desempenho e Assiduidade por Escalão
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, curY, 186, 115, 2, 2, 'F');
  doc.setDrawColor(200, 215, 230);
  doc.roundedRect(12, curY, 186, 115, 2, 2, 'S');

  doc.setFillColor(15, 30, 52);
  doc.rect(12, curY, 186, 6, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(12, curY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DESEMPENHO E ASSIDUIDADE POR EQUIPA / ESCALÃO', 18, curY + 4.2);

  // Table Headers
  const tableHeaderY = curY + 11;
  doc.setFillColor(235, 242, 250);
  doc.rect(14, tableHeaderY, 182, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 50, 75);

  doc.text('EQUIPA / ESCALÃO', 16, tableHeaderY + 4);
  doc.text('ATLETAS', 68, tableHeaderY + 4);
  doc.text('STAFF', 86, tableHeaderY + 4);
  doc.text('JOGOS (V-E-D)', 104, tableHeaderY + 4);
  doc.text('GOLOS (M-S)', 132, tableHeaderY + 4);
  doc.text('TREINOS', 156, tableHeaderY + 4);
  doc.text('ASSIDUIDADE', 174, tableHeaderY + 4);

  let rowY = tableHeaderY + 8;
  teams.forEach((t, i) => {
    if (rowY > 185) return;

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 253);
      doc.rect(14, rowY - 2.5, 182, 6, 'F');
    }

    const tRoster = t.roster || [];
    const tStaff = t.staffMembers || [];
    const tMatches = (t.matches || []).filter((m) => m.finished);
    const tTrainings = (t.trainings || []).filter((tr) => tr.completed !== false);

    let tWins = 0;
    let tDraws = 0;
    let tLosses = 0;
    let tGoalsScored = 0;
    let tGoalsConceded = 0;

    tMatches.forEach((m) => {
      const s = (m.goals || []).filter((g) => g.type === 'scored').length;
      const c = (m.goals || []).filter((g) => g.type === 'conceded').length;
      tGoalsScored += s;
      tGoalsConceded += c;
      if (s > c) tWins++;
      else if (s === c) tDraws++;
      else tLosses++;
    });

    let attended = 0;
    let expected = 0;
    tTrainings.forEach((tr) => {
      if (tRoster.length > 0) {
        const absences = (tr.absences || []).length;
        expected += tRoster.length;
        attended += Math.max(0, tRoster.length - absences);
      }
    });

    const attRate = expected > 0 ? Math.round((attended / expected) * 100) : 100;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 30, 52);

    const teamLabel = `${t.clubName} (${t.category || 'Geral'})`;
    doc.text(teamLabel.slice(0, 28), 16, rowY + 1.5);
    doc.text(`${tRoster.length}`, 72, rowY + 1.5);
    doc.text(`${tStaff.length}`, 89, rowY + 1.5);
    doc.text(`${tMatches.length} (${tWins}-${tDraws}-${tLosses})`, 104, rowY + 1.5);
    doc.text(`${tGoalsScored}-${tGoalsConceded}`, 134, rowY + 1.5);
    doc.text(`${tTrainings.length}`, 160, rowY + 1.5);

    doc.setFont('helvetica', 'bold');
    if (attRate >= 85) {
      doc.setTextColor(16, 120, 60);
    } else if (attRate >= 75) {
      doc.setTextColor(180, 100, 10);
    } else {
      doc.setTextColor(180, 20, 20);
    }
    doc.text(`${attRate}%`, 177, rowY + 1.5);

    rowY += 6.5;
  });

  curY += 122;

  // Box 3: Recomendações e Diretrizes da Direção
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(12, curY, 186, 38, 2, 2, 'F');
  doc.setDrawColor(200, 215, 230);
  doc.roundedRect(12, curY, 186, 38, 2, 2, 'S');

  doc.setFillColor(15, 30, 52);
  doc.rect(12, curY, 186, 6, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(12, curY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DIRETRIZES TÉCNICAS E PARECER INSTITUCIONAL', 18, curY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 45, 60);

  const guidelines = [
    '• Rigor e Assiduidade: Manter o acompanhamento diário das presenças e justificar ausências no painel.',
    '• Transição entre Escalões: Promover a observação contínua de atletas com potencial de escalão superior.',
    '• Prevenção e Recuperação: Coordenar planos de carga física com o departamento médico/fisioterapia.',
    '• Auditoria e Registos: Assegurar o preenchimento dos relatórios pós-jogo até 24h após o apito final.'
  ];

  guidelines.forEach((g, idx) => {
    doc.text(g, 16, curY + 12 + idx * 6);
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 120, 140);
  doc.text(
    `Documento emitido a ${new Date().toLocaleDateString('pt-PT')} · BolaComVisão Sistema de Gestão Desportiva`,
    16,
    280
  );

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Relatorio_Direcao_${sanitize(myClub)}_${season.replace('/', '_')}.pdf`);
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
