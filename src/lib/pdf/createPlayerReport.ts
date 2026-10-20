import { ScheduledMatch, Player, AppState } from '../../types';
import { sortPlayerObjs, computeAge } from '../utils';
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
export async function generatePlayerProfilePDF(player: Player, stats: any, state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const brandDark = [8, 20, 30];
  const lightGray = [242, 246, 250];
  const darkText = [20, 30, 40];
  const mutedText = [90, 110, 130];

  // Header with Left Club Crest & Right BolaComVisao Logo
  drawDocumentHeader(doc, state, `FICHA INDIVIDUAL - ${player.name}`, player.number ? `#${player.number}` : undefined);

  let curY = 48;

  // Main Card with Photo & Bio
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, curY, 180, 42, 3, 3, 'F');
  doc.setDrawColor(200, 220, 235);
  doc.roundedRect(15, curY, 180, 42, 3, 3, 'S');

  // Photo
  let textLeft = 22;
  if (player.photoUrl) {
    try {
      doc.addImage(player.photoUrl, 20, curY + 6, 30, 30);
      textLeft = 56;
    } catch (e) {
      console.warn('Could not add player photo to PDF:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text(player.name, textLeft, curY + 11);

  doc.setFontSize(9.5);
  doc.setTextColor(0, 140, 220);
  doc.text(
    `${player.positions || 'Jogador'}  •  Nº ${player.number !== null && player.number !== undefined ? player.number : 'S/N'}`,
    textLeft,
    curY + 18
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  const age = player.birthDate ? `${computeAge(player.birthDate)} anos` : 'Idade N/D';
  doc.text(`Data Nasc.: ${player.birthDate || 'N/D'} (${age})`, textLeft, curY + 25);
  doc.text(
    `Pé Dominante: ${player.dominantFoot || 'Direito'}  •  Alt: ${player.height || 'N/D'}  •  Peso: ${player.weight || 'N/D'}`,
    textLeft,
    curY + 31
  );
  doc.text(`Estado Desportivo: ${(player.status || 'disponivel').toUpperCase()}`, textLeft, curY + 37);

  curY += 49;

  // Contacts
  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(15, curY, 180, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('CONTACTOS & ENCARREGADOS DE EDUCAÇÃO', 20, curY + 5);
  curY += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`Telefone Atleta: ${player.phone || 'Não registado'}`, 20, curY);
  doc.text(`Email: ${player.email || 'Não registado'}`, 110, curY);
  curY += 7;
  doc.text(`Contacto Emergência / Enc. Educação: ${player.emergencyContact || 'Não registado'}`, 20, curY);
  curY += 12;

  // Match & Training Statistics
  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(15, curY, 180, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('ESTATÍSTICAS E RENDIMENTO NA ÉPOCA', 20, curY + 5);
  curY += 12;

  // Grid Stats
  const statItems = [
    { label: 'Golos Marcados ⚽', value: stats.golos || 0 },
    { label: 'Assistências 🎯', value: stats.assistencias || 0 },
    { label: 'Média de Avaliação ⭐', value: stats.media || '-' },
    { label: 'Minutos Jogados ⏱️', value: stats.minutos || 0 },
    { label: 'Jogos a titular (1.ª parte) 👕', value: stats.jogosTitular || 0 },
    { label: 'Titular 2.ª parte 👕', value: stats.titularSegundaParte || 0 },
    { label: 'Partes a titular ⏱️', value: stats.partesTitular || 0 },
    { label: 'Cartões Amarelos 🟨', value: stats.amarelos || 0 },
    { label: 'Cartões Vermelhos 🟥', value: stats.vermelhos || 0 },
    { label: 'Faltas a Treinos ❌', value: stats.faltasTreino || 0 }
  ];

  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, curY, 180, 58, 2, 2, 'F');

  let sY = curY + 8;
  for (let i = 0; i < statItems.length; i += 2) {
    const s1 = statItems[i];
    const s2 = statItems[i + 1];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(s1.label, 22, sY);
    if (s2) doc.text(s2.label, 110, sY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
    doc.text(String(s1.value), 85, sY, { align: 'right' });
    if (s2) doc.text(String(s2.value), 178, sY, { align: 'right' });

    sY += 10;
  }

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Ficha_Atleta_${sanitize(player.name)}.pdf`);
}
