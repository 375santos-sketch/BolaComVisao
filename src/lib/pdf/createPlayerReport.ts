import { ScheduledMatch, Player, AppState } from '../../types';
import { sortPlayerObjs, computeAge, homeFirstScore } from '../utils';
import { t } from '../../i18n/dict';
import {
  getJsPDF,
  drawDocumentHeader,
  drawPlayerAvatar,
  addBolaComVisaoPageFooters,
  createTextReportWriter
} from './pdfLayout';
import { buildPlayerSeason } from '../playerSeason';
import { absenceReasonLabel } from '../trainingQuick';

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
  doc.text(match.meetingTime ? `${match.meetingTime}h` : 'A definir', col2X + 30, curY + 21);

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
 * 2. Dossier Oficial do Plantel em PDF
 */
export async function generateSquadPDF(state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');
  const activePlayers = sortPlayerObjs(state.roster.filter((p) => p.active !== false));

  const brandDark = [8, 20, 30];
  const darkText = [20, 30, 40];
  const mutedText = [90, 110, 130];

  // Header with Left Club Crest & Right BolaComVisao Logo
  drawDocumentHeader(doc, state, 'DOSSIER OFICIAL DO PLANTEL', `${activePlayers.length} Atletas`);

  let curY = 48;

  // Table header
  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(15, curY, 180, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('LISTA COMPLETA DE ATLETAS', 20, curY + 5.5);

  curY += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Nº', 18, curY);
  doc.text('FOTO', 28, curY);
  doc.text('NOME COMPLETO', 42, curY);
  doc.text('POSIÇÃO', 100, curY);
  doc.text('IDADE / PÉ', 140, curY);
  doc.text('ESTADO', 170, curY);

  doc.setDrawColor(200, 220, 235);
  doc.line(15, curY + 2, 195, curY + 2);
  curY += 6;

  activePlayers.forEach((p, idx) => {
    if (curY > 255) {
      doc.addPage();
      curY = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text('Nº', 18, curY);
      doc.text('FOTO', 28, curY);
      doc.text('NOME COMPLETO', 42, curY);
      doc.text('POSIÇÃO', 100, curY);
      doc.text('IDADE / PÉ', 140, curY);
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

    // Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 140, 200);
    doc.text(p.number !== null && p.number !== undefined ? `#${p.number}` : '-', 18, curY + 2);

    // Photo / Avatar
    drawPlayerAvatar(doc, p, photoX, photoY, photoSize);

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const shortName = p.name.length > 28 ? p.name.substring(0, 26) + '...' : p.name;
    doc.text(shortName, 42, curY + 2);

    // Position
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(p.positions || 'Jogador', 100, curY + 2);

    // Age / Foot
    const ageStr = p.birthDate ? `${computeAge(p.birthDate)}a` : '-';
    const footStr = p.dominantFoot ? `(${p.dominantFoot[0]})` : '';
    doc.text(`${ageStr} ${footStr}`, 140, curY + 2);

    // Status
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const st = p.status || 'disponivel';
    if (st === 'disponivel') {
      doc.setTextColor(16, 140, 70);
      doc.text('Disponível', 170, curY + 2);
    } else if (st === 'lesionado') {
      doc.setTextColor(200, 40, 40);
      doc.text('Lesionado', 170, curY + 2);
    } else if (st === 'suspenso') {
      doc.setTextColor(200, 140, 0);
      doc.text('Suspenso', 170, curY + 2);
    } else {
      doc.setTextColor(100, 110, 120);
      doc.text(st.toUpperCase(), 170, curY + 2);
    }

    curY += rowHeight;
  });

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Plantel_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 3. Ficha Individual de Atleta em PDF
 */
/** Builds the athlete's season sheet (to show parents or the coordinator: no contacts, no coach notes, no emojis). */
export async function buildPlayerProfilePDF(player: Player, state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const s = buildPlayerSeason(state, player.id, state.season);
  const g = s.games;

  drawDocumentHeader(doc, state, 'FICHA DO ATLETA');
  const w = createTextReportWriter(doc, 48);
  const { heading, paragraph, list } = w;

  const number =
    player.number !== null && player.number !== undefined && `${player.number}` !== '' ? `#${player.number} ` : '';
  w.centered(`${number}${player.name}`, { size: 14, bold: true });
  w.skip(-0.5);
  const age = player.birthDate ? computeAge(player.birthDate) : null;
  const info = [
    player.positions,
    age ? `${age} anos` : null,
    player.dominantFoot ? `Pé ${player.dominantFoot.toLowerCase()}` : null
  ]
    .filter(Boolean)
    .join('  •  ');
  if (info) w.centered(info, { size: 9, color: [71, 85, 105] });
  w.skip(4.5);

  heading('Jogos');
  paragraph(
    g.calledUp === 0
      ? 'Ainda não foi convocado para jogos nesta época.'
      : `Convocado para ${g.calledUp} jogo(s), jogou ${g.played}, titular em ${g.starts}. ` +
          `${g.minutes} minutos jogados, ${Math.round(g.share * 100)}% dos minutos dos jogos.`
  );
  paragraph(
    `Golos: ${s.goals}  •  Assistências: ${s.assists}` +
      (s.yellowCards || s.redCards ? `  •  Cartões: ${s.yellowCards} amarelo(s), ${s.redCards} vermelho(s)` : '')
  );

  heading('Últimos jogos');
  list(
    s.recentGames.map((r) => {
      const date = r.date.slice(0, 10).split('-').reverse().join('/');
      const game = `${date}  ${r.opponent} (${r.home ? 'casa' : 'fora'}) ${homeFirstScore(r.scored, r.conceded, r.home)}`;
      if (!r.calledUp) return `${game}: não convocado`;
      const extras = [
        r.started ? 'titular' : null,
        r.goals ? `${r.goals} golo(s)` : null,
        r.assists ? `${r.assists} assist.` : null
      ]
        .filter(Boolean)
        .join(', ');
      return `${game}: ${r.minutes} min${extras ? `, ${extras}` : ''}`;
    })
  );

  heading('Treinos');
  paragraph(
    s.trainings.held === 0
      ? 'Ainda sem treinos registados nesta época.'
      : `Presente em ${s.trainings.present} de ${s.trainings.held} treinos (${s.trainings.rate}%).`
  );
  if (s.absences.length > 0) {
    list(
      s.absences.map((a) => {
        const date = a.date.slice(0, 10).split('-').reverse().join('/');
        return `${date}${a.trainingNumber ? ` (treino ${a.trainingNumber})` : ''}: ${absenceReasonLabel(a.reason)}`;
      })
    );
  }

  addBolaComVisaoPageFooters(doc);
  return doc;
}

export async function generatePlayerProfilePDF(player: Player, state: AppState) {
  const doc = await buildPlayerProfilePDF(player, state);
  const sanitize = (v: string) => v.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Ficha_Atleta_${sanitize(player.name)}.pdf`);
}
