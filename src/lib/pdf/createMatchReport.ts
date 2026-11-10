import { Match, AppState, ScheduledMatch, Player } from '../../types';
import { playerLabel, defaultSeason, formatMinute, sortPlayerObjs, getMatchCompetitionDetails } from '../utils';
import { getLineupSize } from '../constants';
import { t } from '../../i18n/dict';
import {
  getJsPDF,
  drawDocumentHeader,
  addBolaComVisaoPageFooters,
  drawSectionTitle,
  pdfBrand,
  PDF_INK,
  PDF_LINE,
  PDF_MUTED
} from './pdfLayout';
import { drawSignatureOnLine } from './pdfSignature';
import { dayLabel, factBoxes, gameTitle, noteBox } from './pdfBlocks';
import { card, compareRows, kpiRow, scoreHero, sidePanel, table } from './pdfDash';

/**
 * Convocatória em PDF, to print or send in the group: the game, the four facts the families need (day, kick-off,
 * meeting time and place) in big boxes, the called-up players in two columns and the notices.
 */
export async function generateConvocatoriaPDF(match: ScheduledMatch, calledPlayers: Player[], state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');
  const brand = pdfBrand(state);
  const away = match.location !== 'casa';
  const compLabel =
    match.type === 'torneio'
      ? `${t(state.lang, 'sch_tour')}${match.tournamentName ? ` ${match.tournamentName}` : ''}${match.phase ? ' · ' + match.phase : ''}`
      : match.type === 'campeonato'
        ? `${t(state.lang, 'sch_champ')}${match.phase ? ' · ' + match.phase : ''}`
        : t(state.lang, 'sch_friendly');

  drawDocumentHeader(doc, state, 'Convocatória');
  let y = 38;
  y += gameTitle(doc, brand, away ? match.opponent : myClub, away ? myClub : match.opponent, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_MUTED);
  doc.text(`${compLabel}  ·  jogo ${away ? 'fora' : 'em casa'}`, 15, y + 3);
  y += 8;

  y +=
    factBoxes(
      doc,
      [
        ['Dia', dayLabel(match.date)],
        ['Jogo', match.time || '—'],
        ['Concentração', match.meetingTime || '—'],
        ['Encontro', match.meetingPoint || '—']
      ],
      y
    ) + 3;
  if (match.venue) y += noteBox(doc, brand, `Campo: ${match.venue}`, y) + 3;

  // Called-up players, sorted by shirt number, in two columns
  const players = sortPlayerObjs(calledPlayers);
  y += 3;
  y += drawSectionTitle(doc, brand, `Convocados (${players.length})`, 15, y, 180);
  const rows = Math.ceil(players.length / 2);
  const rowH = 11;
  players.forEach((p, i) => {
    const col = i < rows ? 0 : 1;
    const row = col === 0 ? i : i - rows;
    const x = 15 + col * 93;
    const ry = y + row * rowH;
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.6);
    doc.circle(x + 4.5, ry + 4.5, 4.2, 'S');
    doc.setFont('helvetica', 'bold');
    const num = p.number !== null && p.number !== undefined && `${p.number}` !== '' ? String(p.number) : '–';
    doc.setFontSize(num.length > 2 ? 7.5 : 10);
    doc.setTextColor(...PDF_INK);
    doc.text(num, x + 4.5, ry + 6, { align: 'center' });
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(p.name, 74)[0], x + 12, ry + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MUTED);
    if (p.positions) doc.text(doc.splitTextToSize(p.positions, 74)[0], x + 12, ry + 8.2);
    doc.setDrawColor(...PDF_LINE);
    doc.setLineWidth(0.2);
    doc.line(x, ry + rowH - 0.5, x + 87, ry + rowH - 0.5);
  });
  y += rows * rowH + 6;

  if (match.callupNotes && match.callupNotes.trim()) {
    y += drawSectionTitle(doc, brand, 'Avisos', 15, y, 180);
    y += noteBox(doc, brand, match.callupNotes.trim(), y) + 4;
  }

  // Signature
  const signY = Math.max(y + 14, 262);
  if (signY < 278) {
    const signed = drawSignatureOnLine(doc, state, 'convocatoria', 165, signY);
    doc.setDrawColor(170, 180, 190);
    doc.setLineWidth(0.3);
    doc.line(135, signY, 195, signY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_MUTED);
    doc.text(signed ? `${state.currentUser?.name || 'O treinador'} · Treinador` : 'A equipa técnica', 165, signY + 5, {
      align: 'center'
    });
  }

  addBolaComVisaoPageFooters(doc);
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Convocatoria_${sanitize(myClub)}_vs_${sanitize(match.opponent)}_${match.date}.pdf`);
}

/**
 * Ficha & Relatório Oficial de Jogo em PDF
 */
export async function generateMatchSheetPDF(
  match: Match,
  state: AppState,
  download = true
): Promise<{ doc: any; dataUrl: string; filename: string }> {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');
  const scoredGoals = (match.goals || []).filter((g) => g.type === 'scored');
  const concededGoals = (match.goals || []).filter((g) => g.type === 'conceded');
  const sc = scoredGoals.length;
  const co = concededGoals.length;
  const subsCount = (match.subs || []).length;
  const foulsCommitted = match.foulsCommitted ?? match.faltas ?? 0;
  const foulsSuffered = match.foulsSuffered ?? match.faltasAdv ?? 0;
  const cornersFor = match.cantos ?? match.cornersFor ?? 0;
  const cornersAgainst = match.cantosAdv ?? match.cornersAgainst ?? 0;

  // Remates (a favor e contra, dentro e fora da área)
  const shotsInBoxFor = match.rematesDentroArea ?? match.shotsInBoxFor ?? 0;
  const shotsOutBoxFor = match.rematesForaArea ?? match.shotsOutBoxFor ?? 0;
  const totalShotsFor = shotsInBoxFor + shotsOutBoxFor;

  const shotsInBoxAgainst = match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0;
  const shotsOutBoxAgainst = match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0;
  const totalShotsAgainst = shotsInBoxAgainst + shotsOutBoxAgainst;

  const brandDark = [10, 25, 45];
  const lightGray = [244, 248, 252];
  const darkText = [20, 30, 42];

  const dateFormatted = match.date.includes('-') ? match.date.split('-').reverse().join('/') : match.date;

  const compDetails = getMatchCompetitionDetails(match, state);

  const compLabel =
    compDetails.type === 'torneio'
      ? `${compDetails.tournamentName || 'Torneio'}${compDetails.phase ? ' · ' + compDetails.phase : ''}`
      : compDetails.type === 'campeonato'
        ? `Campeonato${compDetails.phase ? ' · ' + compDetails.phase : ''}`
        : 'Jogo Particular / Amigável';

  const categoryLabel = state.category || 'Geral';
  const seasonLabel = match.season || state.season || defaultSeason();

  // Home team first (title and score): away games read "Adversário 1 - 10 Nós"
  const home = (match.location || 'casa') === 'casa';
  const fixtureScore = home ? `${sc}   -   ${co}` : `${co}   -   ${sc}`;

  const brand = pdfBrand(state);
  drawDocumentHeader(doc, state, 'Relatório do jogo');
  let curY = 36;

  // The game and the score, big, with the result; date, competition and place below
  const homeName = home ? myClub : match.opponent;
  const awayName = home ? match.opponent : myClub;
  const won = sc > co;
  const draw = sc === co;
  curY +=
    scoreHero(doc, curY, {
      kicker: 'Resultado final',
      home: homeName,
      away: awayName,
      score: fixtureScore.replace(/\s+/g, ' '),
      result: won
        ? { text: 'VITÓRIA', tone: 'success' }
        : draw
          ? { text: 'EMPATE', tone: 'warning' }
          : { text: 'DERROTA', tone: 'danger' },
      meta: [
        dayLabel(match.date, true) || dateFormatted,
        compLabel,
        home ? 'Casa' : 'Fora',
        `${categoryLabel} ${seasonLabel}`
      ]
        .filter(Boolean)
        .join('  ·  '),
      oursHome: home
    }) + 4;

  // The numbers of the game: goals and shots, then "us against them" and the changes and cards
  curY +=
    kpiRow(
      doc,
      [
        { label: 'Golos marcados', value: String(sc), tone: 'success' },
        { label: 'Golos sofridos', value: String(co), tone: co ? 'danger' : 'muted' },
        {
          label: 'Remates a favor',
          value: String(totalShotsFor),
          sub: `${shotsInBoxFor} dentro · ${shotsOutBoxFor} fora da área`
        },
        {
          label: 'Remates contra',
          value: String(totalShotsAgainst),
          sub: `${shotsInBoxAgainst} dentro · ${shotsOutBoxAgainst} fora da área`,
          tone: 'muted'
        }
      ],
      curY
    ) + 4;

  const yellow = (match.cards || []).filter((c) => c.color === 'Amarelo').length;
  const red = (match.cards || []).filter((c) => c.color === 'Vermelho').length;
  card(doc, 15, curY, 119, 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...PDF_MUTED);
  doc.text('ESTATÍSTICAS DO JOGO & REMATES', 19, curY + 6.5);
  compareRows(
    doc,
    [
      { label: 'Remates dentro da área', ours: shotsInBoxFor, theirs: shotsInBoxAgainst },
      { label: 'Remates fora da área', ours: shotsOutBoxFor, theirs: shotsOutBoxAgainst },
      { label: 'Cantos', ours: cornersFor, theirs: cornersAgainst },
      { label: 'Faltas cometidas', ours: foulsCommitted, theirs: foulsSuffered }
    ],
    19,
    curY + 9.5,
    111,
    ['Nós', match.opponent]
  );
  sidePanel(doc, 137, curY, 58, 'Trocas e disciplina', [
    ['Substituições', String(subsCount), 'brand'],
    ['Cartões amarelos', String(yellow), yellow ? 'warning' : undefined],
    ['Cartões vermelhos', String(red), red ? 'danger' : undefined],
    ['Faltas sofridas', String(foulsSuffered)]
  ]);
  curY += 56;

  const getPName = (id: string | null) => {
    if (!id || id === 'unknown' || id === 'none') return 'Sem assistência / Desconhecido';
    if (id === 'autogolo' || id === 'auto_golo' || id === 'auto-golo') return 'Auto Golo (Adversário)';
    const p = state.roster.find((x) => x.id === id);
    return p ? playerLabel(p) : '—';
  };

  // Helper Section Box
  const drawSectionHeader = (title: string, _icon = '') => {
    if (curY > 260) {
      doc.addPage();
      curY = 20;
    }
    curY += 1;
    curY += drawSectionTitle(doc, brand, title, 15, curY, 180);
  };

  const periodOf = (g: { period?: string; half?: number }) => g.period || (g.half ? `${g.half}ª Parte` : 'Tempo Reg.');
  const empty = (text: string) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MUTED);
    doc.text(text, 17, curY + 1.5);
    curY += 2;
  };

  // Goals scored
  drawSectionHeader('Golos da Nossa Equipa');
  if (scoredGoals.length === 0) empty('Nenhum golo marcado registado.');
  else {
    curY = table(
      doc,
      [
        { title: 'Min', w: 16 },
        { title: 'Marcador & assistência', w: 82 },
        { title: 'Origem / tipo de golo', w: 54 },
        { title: 'Período', w: 28 }
      ],
      scoredGoals.map((g) => {
        const scorer = getPName(g.scorerId);
        const assist = g.assistId && g.assistId !== 'none' && g.assistId !== 'unknown' ? getPName(g.assistId) : null;
        return [
          { text: g.minute ? `${formatMinute(g.minute)}` : '-', style: { bold: true, color: brand } },
          { text: assist ? `${scorer} (ast. ${assist})` : scorer, style: { bold: true } },
          { text: `Origem: ${g.goalType || 'Bola jogada'}`, style: { pill: 'success' } },
          { text: periodOf(g), style: { color: PDF_MUTED } }
        ];
      }),
      curY,
      { top: 20, accent: [34, 197, 94] }
    );
  }
  curY += 5;

  // Goals conceded
  drawSectionHeader('Golos Sofridos (Golos Contra)');
  if (concededGoals.length === 0) empty('Nenhum golo sofrido (Baliza inviolada).');
  else {
    curY = table(
      doc,
      [
        { title: 'Min', w: 16 },
        { title: 'Evento / adversário', w: 82 },
        { title: 'Origem / tipo de lance', w: 54 },
        { title: 'Período', w: 28 }
      ],
      concededGoals.map((g) => [
        { text: g.minute ? `${formatMinute(g.minute)}` : '-', style: { bold: true, color: [239, 68, 68] } },
        { text: `Golo Sofrido (${match.opponent})${g.notes ? ` (${g.notes})` : ''}`, style: { bold: true } },
        { text: `Origem: ${g.goalType || 'Bola jogada'}`, style: { pill: 'danger' } },
        { text: periodOf(g), style: { color: PDF_MUTED } }
      ]),
      curY,
      { top: 20, accent: [239, 68, 68] }
    );
  }
  curY += 5;

  // Starters of each half
  drawSectionHeader('Titulares');
  const lineup1 = match.lineup || [];
  const lineup2 = match.lineupSecondHalf || [];
  const lineupSize = getLineupSize(match);
  const maxRows = Math.max(lineup1.length, lineup2.length, lineupSize);
  const starter = (list: string[], i: number) =>
    list[i] ? `${i + 1}. ${getPName(list[i])}` : i < lineupSize ? `${i + 1}. —` : '';
  curY = table(
    doc,
    [
      { title: `1.ª parte (${lineupSize} titulares)`, w: 90 },
      { title: `2.ª parte (${lineupSize} titulares)`, w: 90 }
    ],
    Array.from({ length: maxRows }, (_, i) => [
      starter(lineup1, i),
      lineup2.length === 0
        ? { text: i === 0 ? '2.ª parte: não registado' : '', style: { color: PDF_MUTED } }
        : starter(lineup2, i)
    ]),
    curY,
    { top: 20, rowH: 6, size: 7.5 }
  );
  curY += 5;

  // Substitutions
  drawSectionHeader('Substituições Realizadas');
  if (!match.subs || match.subs.length === 0) empty('Sem substituições registadas neste jogo.');
  else {
    curY = table(
      doc,
      [
        { title: 'Min', w: 18 },
        { title: 'Sai', w: 78 },
        { title: 'Entra', w: 84 }
      ],
      match.subs.map((s) => [
        {
          text: s.isHalftime ? 'INT' : s.minute ? `${formatMinute(s.minute)}` : '-',
          style: { bold: true, color: brand }
        },
        { text: `Sai: ${getPName(s.outId)}`, style: { color: [239, 68, 68] } },
        { text: `Entra: ${getPName(s.inId)}${s.period ? ` (${s.period})` : ''}`, style: { color: [34, 197, 94] } }
      ]),
      curY,
      { top: 20 }
    );
  }
  curY += 5;

  // Cards (if any)
  if (match.cards && match.cards.length > 0) {
    match.cards.forEach((c) => {
      if (curY > 265) {
        doc.addPage();
        curY = 20;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      const minStr = c.minute ? `${formatMinute(c.minute)} ` : '';
      doc.text(`${minStr}Cartão ${c.color.toLowerCase()}: ${getPName(c.playerId)}`, 20, curY);
      curY += 5;
    });
    curY += 2;
  }

  // 6. RESUMO FINAL DO JOGO
  if (curY + 36 > 280) {
    doc.addPage();
    curY = 20;
  }

  drawSectionHeader('Resumo Final', '📊');

  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, curY, 180, 26, 2, 2, 'F');
  doc.setDrawColor(200, 220, 235);
  doc.roundedRect(15, curY, 180, 26, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(
    `• Resultado Final: ${home ? `${myClub} ${sc} - ${co} ${match.opponent}` : `${match.opponent} ${co} - ${sc} ${myClub}`} (${sc > co ? 'Vitória' : sc === co ? 'Empate' : 'Derrota'})`,
    20,
    curY + 5.5
  );
  doc.text(`• Total de Golos Marcados: ${sc}`, 20, curY + 11);
  doc.text(`• Total de Golos Sofridos: ${co}`, 20, curY + 16.5);
  doc.text(
    `• Remates a Favor: ${totalShotsFor} (${shotsInBoxFor} dentro da área, ${shotsOutBoxFor} fora)`,
    20,
    curY + 22
  );

  doc.text(`• Total de Substituições: ${subsCount}`, 108, curY + 5.5);
  doc.text(`• Cantos: ${cornersFor} (A favor) vs ${cornersAgainst} (Contra)`, 108, curY + 11);
  doc.text(`• Faltas Cometidas / Sofridas: ${foulsCommitted} / ${foulsSuffered}`, 108, curY + 16.5);
  doc.text(
    `• Remates Contra: ${totalShotsAgainst} (${shotsInBoxAgainst} dentro da área, ${shotsOutBoxAgainst} fora)`,
    108,
    curY + 22
  );

  curY += 31;

  // Notes from Coach
  if (match.notes && match.notes.trim()) {
    if (curY > 250) {
      doc.addPage();
      curY = 20;
    }
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(15, curY, 180, 18, 2, 2, 'F');
    doc.setDrawColor(215, 225, 235);
    doc.roundedRect(15, curY, 180, 18, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
    doc.text('Observações do Treinador:', 20, curY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const noteLines = doc.splitTextToSize(match.notes, 170);
    doc.text(noteLines.slice(0, 3), 20, curY + 11);

    curY += 23;
  }

  // Footer creation timestamp
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(110, 130, 150);
  const dateCreation = new Date().toLocaleString('pt-PT');
  doc.text(`Relatório gerado automaticamente em: ${dateCreation} • BolaComVisão`, 15, 282);

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Relatorio_Jogo_${sanitize(myClub)}_vs_${sanitize(match.opponent)}_${match.date}.pdf`;

  const dataUrl = doc.output('datauristring');

  if (download) {
    doc.save(filename);
  }

  return { doc, dataUrl, filename };
}
