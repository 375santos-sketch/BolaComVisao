import { Match, AppState, ScheduledMatch, Player } from '../../types';
import { playerLabel, defaultSeason, formatMinute, sortPlayerObjs, getMatchCompetitionDetails } from '../utils';
import { getLineupSize } from '../constants';
import { t } from '../../i18n/dict';
import { getJsPDF, drawDocumentHeader, drawPlayerAvatar, addBolaComVisaoPageFooters } from './pdfLayout';

/**
 * 1. Convocatória Oficial em PDF com Fotos dos Jogadores
 */
export async function generateConvocatoriaPDF(match: ScheduledMatch, calledPlayers: Player[], state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');
  const dateFormatted = match.date.split('-').reverse().join('/');
  const locLabel = match.location === 'casa' ? t(state.lang, 'match_home') : t(state.lang, 'match_away');

  const compLabel =
    match.type === 'torneio'
      ? `${t(state.lang, 'sch_tour')}: ${match.tournamentName || ''}${match.phase ? ' - ' + match.phase : ''}`
      : match.type === 'campeonato'
        ? `${t(state.lang, 'sch_champ')}${match.phase ? ' - ' + match.phase : ''}`
        : t(state.lang, 'sch_friendly');

  const darkGreen = [10, 25, 40];
  const lightGray = [242, 246, 250];
  const darkText = [20, 30, 40];
  const mutedText = [90, 110, 130];

  // Header with Left Club Crest & Right BolaComVisao Logo
  drawDocumentHeader(doc, state, 'CONVOCATÓRIA OFICIAL DE JOGO', `vs ${match.opponent}`);

  // Match Information Card
  let curY = 47;
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, curY, 180, 48, 3, 3, 'F');

  doc.setDrawColor(200, 220, 235);
  doc.roundedRect(15, curY, 180, 48, 3, 3, 'S');

  // Match Title / Opponent
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  const matchVsText =
    match.location === 'casa' ? `${myClub}  vs  ${match.opponent}` : `${match.opponent}  vs  ${myClub}`;
  doc.text(matchVsText, 22, curY + 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);

  // Details Grid
  doc.setFont('helvetica', 'bold');
  doc.text('Data do Jogo:', 22, curY + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(dateFormatted, 50, curY + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('Hora do Jogo:', 22, curY + 28);
  doc.setFont('helvetica', 'normal');
  doc.text(`${match.time}h`, 50, curY + 28);

  doc.setFont('helvetica', 'bold');
  doc.text('Competição:', 22, curY + 35);
  doc.setFont('helvetica', 'normal');
  doc.text(compLabel, 50, curY + 35);

  doc.setFont('helvetica', 'bold');
  doc.text('Condição:', 22, curY + 42);
  doc.setFont('helvetica', 'normal');
  doc.text(locLabel, 50, curY + 42);

  // Column 2
  const col2X = 110;
  doc.setFont('helvetica', 'bold');
  doc.text('Concentração:', col2X, curY + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(match.meetingTime ? `${match.meetingTime}h` : '--:--', col2X + 30, curY + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('Local / Estádio:', col2X, curY + 28);
  doc.setFont('helvetica', 'normal');
  doc.text(
    match.venue || (match.location === 'casa' ? 'Estádio Municipal' : 'Campo do Adversário'),
    col2X + 30,
    curY + 28
  );

  if (match.meetingPoint) {
    doc.setFont('helvetica', 'bold');
    doc.text('Ponto Encontro:', col2X, curY + 35);
    doc.setFont('helvetica', 'normal');
    doc.text(match.meetingPoint, col2X + 30, curY + 35);
  }

  curY += 55;

  // Called Players Section
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.rect(15, curY, 180, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`JOGADORES CONVOCADOS (${calledPlayers.length})`, 20, curY + 5.5);

  curY += 12;

  // Table Headers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Nº', 18, curY);
  doc.text('FOTO', 28, curY);
  doc.text('NOME DO JOGADOR', 42, curY);
  doc.text('POSIÇÃO', 130, curY);
  doc.text('ESTADO', 170, curY);

  doc.setDrawColor(200, 220, 235);
  doc.line(15, curY + 2, 195, curY + 2);
  curY += 6;

  const sortedCalled = sortPlayerObjs(calledPlayers);

  if (sortedCalled.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(150, 150, 150);
    doc.text('Nenhum jogador selecionado para a convocatória.', 20, curY + 6);
    curY += 12;
  } else {
    sortedCalled.forEach((p, idx) => {
      if (curY > 255) {
        doc.addPage();
        curY = 20;

        doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.rect(15, curY, 180, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`JOGADORES CONVOCADOS (Continuação)`, 20, curY + 5.5);
        curY += 12;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        doc.text('Nº', 18, curY);
        doc.text('FOTO', 28, curY);
        doc.text('NOME DO JOGADOR', 42, curY);
        doc.text('POSIÇÃO', 130, curY);
        doc.text('ESTADO', 170, curY);

        doc.setDrawColor(200, 220, 235);
        doc.line(15, curY + 2, 195, curY + 2);
        curY += 6;
      }

      const rowHeight = 9.5;
      const photoSize = 7.5;
      const photoX = 27.5;
      const photoY = curY - 3;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 251, 253);
        doc.rect(15, curY - 4, 180, rowHeight, 'F');
      }

      // Player Number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 120, 180);
      doc.text(p.number !== null && p.number !== undefined ? String(p.number) : '-', 18, curY + 2);

      // Player Photo / Avatar next to name
      drawPlayerAvatar(doc, p, photoX, photoY, photoSize);

      // Player Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      const displayName = p.name.length > 40 ? p.name.substring(0, 38) + '...' : p.name;
      doc.text(displayName, 42, curY + 2);

      // Position
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(p.positions || 'Jogador', 130, curY + 2);

      // Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(16, 140, 70);
      doc.text('Convocado', 170, curY + 2);

      curY += rowHeight;
    });
  }

  // Extra notes / observations if present
  if (match.callupNotes && match.callupNotes.trim()) {
    curY += 6;
    if (curY > 245) {
      doc.addPage();
      curY = 20;
    }
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(15, curY, 180, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text('Observações e Recomendações:', 20, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);

    const splitNotes = doc.splitTextToSize(match.callupNotes.trim(), 170);
    doc.text(splitNotes, 20, curY + 12);

    curY += 26;
  }

  // Signature
  const footerY = Math.max(curY + 10, 260);
  if (footerY < 275) {
    doc.setDrawColor(180, 200, 215);
    doc.line(130, footerY, 190, footerY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('A Equipa Técnica', 160, footerY + 5, { align: 'center' });
  }

  // Apply Page Footers
  addBolaComVisaoPageFooters(doc);

  // Save PDF
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Convocatoria_${sanitize(myClub)}_vs_${sanitize(match.opponent)}_${match.date}.pdf`;
  doc.save(filename);
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
  const mutedText = [90, 110, 130];
  const greenText = [16, 140, 70];
  const redText = [200, 40, 40];

  const dateFormatted = match.date.includes('-')
    ? match.date.split('-').reverse().join('/')
    : match.date;

  const compDetails = getMatchCompetitionDetails(match, state);
  const typeLabel = compDetails.typeLabel;
  const phaseLabel = compDetails.faseJornadaText;

  const locLabel = (match.location || 'casa') === 'casa' ? 'JOGO EM CASA' : 'JOGO FORA';
  const compLabel =
    compDetails.type === 'torneio'
      ? `${compDetails.tournamentName || 'Torneio'}${compDetails.phase ? ' · ' + compDetails.phase : ''}`
      : compDetails.type === 'campeonato'
        ? `Campeonato${compDetails.phase ? ' · ' + compDetails.phase : ''}`
        : 'Jogo Particular / Amigável';

  const categoryLabel = state.category || 'Geral';
  const seasonLabel = match.season || state.season || defaultSeason();

  // Header with Left Club Crest & Right BolaComVisao Logo
  drawDocumentHeader(
    doc,
    state,
    'RELATÓRIO OFICIAL DO JOGO',
    `${myClub.toUpperCase()}  vs  ${match.opponent.toUpperCase()}`
  );

  let curY = 46;

  // 1. Banner Principal do Jogo (Scoreboard & Metadata)
  doc.setFillColor(15, 30, 52);
  doc.roundedRect(15, curY, 180, 31, 2.5, 2.5, 'F');
  doc.setDrawColor(0, 210, 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, curY, 180, 31, 2.5, 2.5, 'S');

  // Match Title vs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const fixtureTitle =
    (match.location || 'casa') === 'casa'
      ? `${myClub.toUpperCase()}  vs  ${match.opponent.toUpperCase()}`
      : `${match.opponent.toUpperCase()}  vs  ${myClub.toUpperCase()}`;
  doc.text(fixtureTitle, 105, curY + 6.5, { align: 'center' });

  // Big Score
  doc.setFontSize(16);
  doc.setTextColor(0, 210, 255);
  doc.text(`${sc}   -   ${co}`, 105, curY + 15, { align: 'center' });

  // Competition type and phase line: TIPO: CAMPEONATO • FASE/JORNADA: JORNADA 4
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 210, 255);
  const compTypePhaseText = `TIPO: ${typeLabel.toUpperCase()}   •   FASE/JORNADA: ${phaseLabel.toUpperCase()}`;
  doc.text(compTypePhaseText, 105, curY + 21.2, { align: 'center' });

  // Meta line: Data • Competição • Escalão • Local
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(200, 225, 245);
  const metaText = `📅 ${dateFormatted}  •  🏆 ${compLabel}  •  ⚡ ${categoryLabel} (${seasonLabel})  •  📍 ${locLabel}`;
  doc.text(metaText, 105, curY + 26.5, { align: 'center' });

  curY += 35;

  // 1.1 Caixa Dedicada de Informação do Jogo (Obtida da Agenda)
  doc.setFillColor(242, 248, 255);
  doc.roundedRect(15, curY, 180, 8.5, 1.5, 1.5, 'F');
  doc.setDrawColor(0, 180, 230);
  doc.setLineWidth(0.35);
  doc.roundedRect(15, curY, 180, 8.5, 1.5, 1.5, 'S');

  // TIPO:
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 30, 52);
  doc.text('TIPO:', 19, curY + 5.8);
  doc.setTextColor(0, 140, 220);
  doc.text(typeLabel.toUpperCase(), 30, curY + 5.8);

  // FASE/JORNADA:
  doc.setTextColor(15, 30, 52);
  doc.text('FASE/JORNADA:', 82, curY + 5.8);
  doc.setTextColor(215, 115, 0);
  doc.text(phaseLabel.toUpperCase(), 110, curY + 5.8);

  // Agenda status
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(95, 115, 140);
  const agendaStatusText = compDetails.scheduledMatch
    ? '📅 Sincronizado com a Agenda'
    : '📋 Ficha Oficial de Jogo';
  doc.text(agendaStatusText, 191, curY + 5.8, { align: 'right' });

  curY += 12.5;

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
    doc.setFillColor(15, 30, 52);
    doc.rect(15, curY, 180, 6, 'F');
    doc.setFillColor(0, 210, 255);
    doc.rect(15, curY, 2.5, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 20, curY + 4.2);
    curY += 9;
  };

  // 2. GOLOS DA NOSSA EQUIPA
  drawSectionHeader('Golos da Nossa Equipa', '⚽');

  if (scoredGoals.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Nenhum golo marcado registado.', 20, curY);
    curY += 6;
  } else {
    // Cabeçalho estruturado das colunas de golos marcados
    doc.setFillColor(236, 244, 252);
    doc.rect(15, curY - 3, 180, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(60, 90, 125);
    doc.text('MIN', 18, curY + 0.5);
    doc.text('MARCADOR & ASSISTÊNCIA', 34, curY + 0.5);
    doc.text('ORIGEM / TIPO DE GOLO', 113, curY + 0.5);
    doc.text('PERÍODO', 168, curY + 0.5);
    curY += 4.5;

    scoredGoals.forEach((g, idx) => {
      if (curY > 265) {
        doc.addPage();
        curY = 20;
      }
      doc.setFillColor(idx % 2 === 0 ? 246 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 254 : 255);
      doc.rect(15, curY - 3, 180, 8, 'F');

      const minStr = g.minute ? `${formatMinute(g.minute)}` : '-';
      const periodStr = g.period || (g.half ? `${g.half}ª Parte` : 'Tempo Reg.');
      const scorer = getPName(g.scorerId);
      const assist = g.assistId && g.assistId !== 'none' && g.assistId !== 'unknown' ? getPName(g.assistId) : null;
      const gType = g.goalType || 'Bola jogada';

      // Minuto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 140, 220);
      doc.text(minStr, 18, curY + 2.2);

      // Marcador & Assistência
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      const scorerText = assist ? `${scorer} (ast. ${assist})` : scorer;
      const maxScorerLen = 40;
      const displayScorer = scorerText.length > maxScorerLen ? scorerText.substring(0, maxScorerLen - 1) + '…' : scorerText;
      doc.text(displayScorer, 34, curY + 2.2);

      // Badge Origem / Tipo de Golo em Destaque
      doc.setFillColor(232, 248, 242);
      doc.roundedRect(110, curY - 2.2, 54, 6.2, 1.5, 1.5, 'F');
      doc.setDrawColor(160, 225, 200);
      doc.setLineWidth(0.3);
      doc.roundedRect(110, curY - 2.2, 54, 6.2, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(14, 130, 65);
      doc.text(`Origem: ${gType}`, 113, curY + 2);

      // Período
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(periodStr, 168, curY + 2);

      curY += 8.5;
    });
  }

  curY += 3;

  // 3. GOLOS CONTRA (GOLOS SOFRIDOS)
  drawSectionHeader('Golos Sofridos (Golos Contra)', '🔴');

  if (concededGoals.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Nenhum golo sofrido (Baliza inviolada).', 20, curY);
    curY += 6;
  } else {
    // Cabeçalho estruturado das colunas de golos sofridos
    doc.setFillColor(254, 242, 242);
    doc.rect(15, curY - 3, 180, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 75, 75);
    doc.text('MIN', 18, curY + 0.5);
    doc.text('EVENTO / ADVERSÁRIO', 34, curY + 0.5);
    doc.text('ORIGEM / TIPO DE LANCE', 113, curY + 0.5);
    doc.text('PERÍODO', 168, curY + 0.5);
    curY += 4.5;

    concededGoals.forEach((g, idx) => {
      if (curY > 265) {
        doc.addPage();
        curY = 20;
      }
      doc.setFillColor(idx % 2 === 0 ? 255 : 252, idx % 2 === 0 ? 245 : 240, idx % 2 === 0 ? 245 : 240);
      doc.rect(15, curY - 3, 180, 8, 'F');

      const minStr = g.minute ? `${formatMinute(g.minute)}` : '-';
      const periodStr = g.period || (g.half ? `${g.half}ª Parte` : 'Tempo Reg.');
      const concededType = g.goalType || 'Bola jogada';
      const obs = g.notes ? ` (${g.notes})` : '';

      // Minuto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(redText[0], redText[1], redText[2]);
      doc.text(minStr, 18, curY + 2.2);

      // Evento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      const eventText = `Golo Sofrido (${match.opponent})${obs}`;
      const maxEventLen = 40;
      const displayEvent = eventText.length > maxEventLen ? eventText.substring(0, maxEventLen - 1) + '…' : eventText;
      doc.text(displayEvent, 34, curY + 2.2);

      // Badge Origem / Tipo de Lance em Destaque
      doc.setFillColor(255, 238, 238);
      doc.roundedRect(110, curY - 2.2, 54, 6.2, 1.5, 1.5, 'F');
      doc.setDrawColor(245, 190, 190);
      doc.setLineWidth(0.3);
      doc.roundedRect(110, curY - 2.2, 54, 6.2, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(190, 40, 40);
      doc.text(`Origem: ${concededType}`, 113, curY + 2);

      // Período
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(periodStr, 168, curY + 2);

      curY += 8.5;
    });
  }

  curY += 3;

  // 4. TITULARES (1.ª e 2.ª PARTE)
  drawSectionHeader('Titulares', '👥');

  const lineup1 = match.lineup || [];
  const lineup2 = match.lineupSecondHalf || [];

  if (curY > 240) {
    doc.addPage();
    curY = 20;
  }

  const colWidth = 87;
  const col1X = 15;
  const col2X = 108;

  const lineupSize = getLineupSize(match);

  // Cabeçalho das colunas
  doc.setFillColor(236, 244, 252);
  doc.rect(col1X, curY - 3, colWidth, 5, 'F');
  doc.rect(col2X, curY - 3, colWidth, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 60, 95);
  doc.text(`1.ª PARTE (${lineupSize} TITULARES)`, col1X + 3, curY + 0.5);
  doc.text(`2.ª PARTE (${lineupSize} TITULARES)`, col2X + 3, curY + 0.5);

  curY += 4.5;
  const maxRows = Math.max(lineup1.length, lineup2.length, lineupSize);

  for (let i = 0; i < maxRows; i++) {
    if (curY > 265) {
      doc.addPage();
      curY = 20;
    }

    doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255, i % 2 === 0 ? 255 : 255);
    doc.rect(col1X, curY - 2.8, colWidth, 5.2, 'F');
    doc.rect(col2X, curY - 2.8, colWidth, 5.2, 'F');

    // Coluna 1: 1.ª Parte
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const p1Id = lineup1[i];
    const p1Text = p1Id ? `${i + 1}. ${getPName(p1Id)}` : i < lineupSize ? `${i + 1}. —` : '';
    doc.text(p1Text, col1X + 3, curY + 0.8);

    // Coluna 2: 2.ª Parte
    if (lineup2.length === 0) {
      if (i === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        doc.text('2.ª parte: não registado', col2X + 3, curY + 0.8);
      }
    } else {
      const p2Id = lineup2[i];
      const p2Text = p2Id ? `${i + 1}. ${getPName(p2Id)}` : i < lineupSize ? `${i + 1}. —` : '';
      doc.text(p2Text, col2X + 3, curY + 0.8);
    }

    curY += 5.2;
  }

  curY += 3;

  // 5. SUBSTITUIÇÕES
  drawSectionHeader('Substituições Realizadas', '🔄');

  if (!match.subs || match.subs.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Sem substituições registadas neste jogo.', 20, curY);
    curY += 6;
  } else {
    match.subs.forEach((s, idx) => {
      if (curY > 265) {
        doc.addPage();
        curY = 20;
      }
      doc.setFillColor(idx % 2 === 0 ? 246 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 254 : 255);
      doc.rect(15, curY - 3, 180, 7.5, 'F');

      const minStr = s.isHalftime ? 'INT' : s.minute ? `${formatMinute(s.minute)}` : '-';
      const periodStr = s.period ? ` (${s.period})` : '';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 140, 220);
      doc.text(minStr, 19, curY + 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(redText[0], redText[1], redText[2]);
      doc.text(`Sai: ${getPName(s.outId)}`, 36, curY + 2);

      doc.setTextColor(greenText[0], greenText[1], greenText[2]);
      doc.text(`Entra: ${getPName(s.inId)}${periodStr}`, 110, curY + 2);

      curY += 8;
    });
  }

  curY += 3;

  // 5. ESTATÍSTICAS DO JOGO (Remates, Cantos, Faltas e Disciplina)
  if (curY > 180) {
    doc.addPage();
    curY = 20;
  }

  drawSectionHeader('Estatísticas do Jogo & Remates', '📊');

  const boxW = 57;
  const boxH = 15;

  // Row 1: Remates a Favor (Nossa Equipa)
  let statBoxY = curY;
  // Remates Favor Dentro da Área
  doc.setFillColor(242, 252, 248);
  doc.roundedRect(15, statBoxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(180, 230, 210);
  doc.roundedRect(15, statBoxY, boxW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('REMATES FAVOR (D. ÁREA)', 19, statBoxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenText[0], greenText[1], greenText[2]);
  doc.text(`${shotsInBoxFor}`, 19, statBoxY + 11.8);

  // Remates Favor Fora da Área
  doc.setFillColor(242, 252, 248);
  doc.roundedRect(76, statBoxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(180, 230, 210);
  doc.roundedRect(76, statBoxY, boxW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('REMATES FAVOR (F. ÁREA)', 80, statBoxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 140, 150);
  doc.text(`${shotsOutBoxFor}`, 80, statBoxY + 11.8);

  // Total Remates Favor
  doc.setFillColor(235, 248, 255);
  doc.roundedRect(138, statBoxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(180, 220, 250);
  doc.roundedRect(138, statBoxY, boxW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('TOTAL REMATES A FAVOR', 142, statBoxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 120, 220);
  doc.text(`${totalShotsFor}`, 142, statBoxY + 11.8);

  curY += 18;

  // Row 2: Remates Contra (Adversário)
  statBoxY = curY;
  // Remates Contra Dentro da Área
  doc.setFillColor(255, 245, 245);
  doc.roundedRect(15, statBoxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(250, 205, 205);
  doc.roundedRect(15, statBoxY, boxW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('REMATES CONTRA (D. ÁREA)', 19, statBoxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(redText[0], redText[1], redText[2]);
  doc.text(`${shotsInBoxAgainst}`, 19, statBoxY + 11.8);

  // Remates Contra Fora da Área
  doc.setFillColor(255, 245, 245);
  doc.roundedRect(76, statBoxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(250, 205, 205);
  doc.roundedRect(76, statBoxY, boxW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('REMATES CONTRA (F. ÁREA)', 80, statBoxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(210, 100, 30);
  doc.text(`${shotsOutBoxAgainst}`, 80, statBoxY + 11.8);

  // Total Remates Contra
  doc.setFillColor(255, 242, 242);
  doc.roundedRect(138, statBoxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(250, 195, 195);
  doc.roundedRect(138, statBoxY, boxW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('TOTAL REMATES CONTRA', 142, statBoxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(190, 25, 25);
  doc.text(`${totalShotsAgainst}`, 142, statBoxY + 11.8);

  curY += 18;

  // Row 3: Cantos, Faltas e Substituições
  statBoxY = curY;
  // Cantos
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(15, statBoxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(210, 225, 240);
  doc.roundedRect(15, statBoxY, boxW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('CANTOS (NÓS - ADV)', 19, statBoxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`${cornersFor} - ${cornersAgainst}`, 19, statBoxY + 11.8);

  // Faltas
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(76, statBoxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(210, 225, 240);
  doc.roundedRect(76, statBoxY, boxW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('FALTAS (COMETIDAS / SOFRIDAS)', 80, statBoxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`${foulsCommitted} / ${foulsSuffered}`, 80, statBoxY + 11.8);

  // Substituições
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(138, statBoxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(210, 225, 240);
  doc.roundedRect(138, statBoxY, boxW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('SUBSTITUIÇÕES', 142, statBoxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 140, 220);
  doc.text(`${subsCount}`, 142, statBoxY + 11.8);

  curY += 20;

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
      doc.text(
        `${c.color === 'Amarelo' ? '🟨' : '🟥'} ${minStr}Cartão ${c.color}: ${getPName(c.playerId)}`,
        20,
        curY
      );
      curY += 5;
    });
    curY += 2;
  }

  // 6. RESUMO FINAL DO JOGO
  if (curY > 235) {
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
  doc.text(`• Resultado Final: ${sc} - ${co} (${sc > co ? 'Vitória' : sc === co ? 'Empate' : 'Derrota'})`, 20, curY + 5.5);
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
