import { AppState, Training } from '../../types';
import { sortPlayerObjs } from '../utils';
import { t } from '../../i18n/dict';
import { getJsPDF, drawDocumentHeader, addBolaComVisaoPageFooters } from './pdfLayout';

/**
 * 1. Relatório de Assiduidade e Treinos em PDF
 */
export async function generateTrainingsStatsPDF(state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');
  const completedTrainings = (state.trainings || []).filter((tr) => tr.completed !== false);
  const totalTrainings = completedTrainings.length;
  const activePlayers = sortPlayerObjs(state.roster.filter((p) => p.active !== false));

  // Compute individual stats
  const playerStats = activePlayers
    .map((p) => {
      const absences = completedTrainings.filter((tr) => (tr.absences || []).includes(p.id)).length;
      const presences = Math.max(0, totalTrainings - absences);
      const pct = totalTrainings > 0 ? Math.round((presences / totalTrainings) * 100) : 0;
      return {
        player: p,
        presences,
        absences,
        totalTrainings,
        pct
      };
    })
    .sort((a, b) => b.pct - a.pct || b.presences - a.presences);

  const totalPresencesSum = playerStats.reduce((sum, item) => sum + item.presences, 0);
  const maxPossiblePresences = activePlayers.length * totalTrainings;
  const clubAvgPct = maxPossiblePresences > 0 ? Math.round((totalPresencesSum / maxPossiblePresences) * 100) : 0;

  const brandDark = [8, 20, 30];
  const brandGreen = [0, 200, 110];
  const brandRed = [239, 68, 68];
  const lightGray = [242, 246, 250];
  const darkText = [20, 30, 40];
  const mutedText = [90, 110, 130];

  // Header with Left Club Crest & Right BolaComVisao Logo
  drawDocumentHeader(doc, state, 'RELATÓRIO DE ASSIDUIDADE E TREINOS');

  // KPI Summary Card
  let curY = 48;
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, curY, 180, 26, 3, 3, 'F');
  doc.setDrawColor(200, 220, 235);
  doc.roundedRect(15, curY, 180, 26, 3, 3, 'S');

  // KPI 1: Total Treinos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text(String(totalTrainings), 35, curY + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('TOTAL DE TREINOS', 35, curY + 19, { align: 'center' });

  // Divider
  doc.setDrawColor(210, 220, 230);
  doc.line(70, curY + 4, 70, curY + 22);

  // KPI 2: Média Global
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 160, 210);
  doc.text(`${clubAvgPct}%`, 105, curY + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('ASSIDUIDADE MÉDIA', 105, curY + 19, { align: 'center' });

  // Divider
  doc.line(140, curY + 4, 140, curY + 22);

  // KPI 3: Atletas Analisados
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text(String(activePlayers.length), 175, curY + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('ATLETAS NO PLANTEL', 175, curY + 19, { align: 'center' });

  curY += 34;

  // Table Section Header
  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(15, curY, 180, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DETALHE DE ASSIDUIDADE POR ATLETA', 20, curY + 5.5);

  curY += 12;

  // Columns header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Nº', 20, curY);
  doc.text('JOGADOR', 32, curY);
  doc.text('PRES. / TOTAL', 88, curY);
  doc.text('GRÁFICO DE ASSIDUIDADE', 122, curY);
  doc.text('% PRESENÇA', 175, curY);

  doc.setDrawColor(200, 220, 235);
  doc.line(15, curY + 2, 195, curY + 2);

  curY += 6;

  if (playerStats.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(150, 150, 150);
    doc.text('Nenhum jogador no plantel ativo.', 20, curY + 6);
  } else {
    playerStats.forEach((st, idx) => {
      if (curY > 265) {
        doc.addPage();
        curY = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        doc.text('Nº', 20, curY);
        doc.text('JOGADOR', 32, curY);
        doc.text('PRES. / TOTAL', 88, curY);
        doc.text('GRÁFICO DE ASSIDUIDADE', 122, curY);
        doc.text('% PRESENÇA', 175, curY);

        doc.setDrawColor(200, 220, 235);
        doc.line(15, curY + 2, 195, curY + 2);
        curY += 6;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 251, 253);
        doc.rect(15, curY - 4, 180, 8, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
      doc.text(
        st.player.number !== null && st.player.number !== undefined ? String(st.player.number) : '-',
        20,
        curY + 1
      );

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      const shortName = st.player.name.length > 24 ? st.player.name.substring(0, 22) + '...' : st.player.name;
      doc.text(shortName, 32, curY + 1);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(`${st.presences} / ${st.totalTrainings}`, 88, curY + 1);

      const barX = 122;
      const barY = curY - 2.5;
      const maxBarWidth = 45;
      const barHeight = 4;
      const fillWidth = Math.max(0, (st.pct / 100) * maxBarWidth);

      doc.setFillColor(220, 230, 240);
      doc.roundedRect(barX, barY, maxBarWidth, barHeight, 1, 1, 'F');

      if (fillWidth > 0) {
        if (st.pct >= 80) {
          doc.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        } else if (st.pct >= 50) {
          doc.setFillColor(0, 180, 230);
        } else {
          doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
        }
        doc.roundedRect(barX, barY, fillWidth, barHeight, 1, 1, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      if (st.pct >= 80) {
        doc.setTextColor(0, 150, 70);
      } else if (st.pct >= 50) {
        doc.setTextColor(0, 140, 180);
      } else {
        doc.setTextColor(200, 40, 40);
      }
      doc.text(`${st.pct}%`, 175, curY + 1);

      curY += 8;
    });
  }

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Assiduidade_Treinos_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * 2. Plano de Sessão de Treino em PDF
 */
export async function generateTrainingSessionPDF(training: Training, state: AppState) {
  const { doc, filename } = await buildTrainingSessionPDF(training, state);
  doc.save(filename);
}

/** Session plan PDF (for the assistant coach): blocks with duration and objective, and the drawing of each exercise. */
export async function buildTrainingSessionPDF(training: Training, state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName || 'A Minha Equipa';

  const docTitle = training.trainingNumber
    ? `PLANO DE TREINO Nº ${training.trainingNumber}`
    : 'PLANO DE SESSÃO DE TREINO';
  const docSubtitle = `DATA: ${training.date || '—'}${training.type ? ` | ${training.type.toUpperCase()}` : ''}`;
  drawDocumentHeader(doc, state, docTitle, docSubtitle);

  let curY = 46;

  // Header Banner for Training info
  doc.setFillColor(15, 30, 52);
  doc.roundedRect(15, curY, 180, 22, 3, 3, 'F');
  doc.setDrawColor(0, 210, 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, curY, 180, 22, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const bannerTitle = training.trainingNumber
    ? `TREINO Nº ${training.trainingNumber} — ${training.date || 'DATA NÃO DEFINIDA'}`
    : `SESSÃO DE TREINO — ${training.date || 'DATA NÃO DEFINIDA'}`;
  doc.text(bannerTitle, 20, curY + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 210, 255);
  const typeStr = training.type || 'Geral';
  const timeStr = training.time ? ` às ${training.time}` : '';
  const locStr = training.location ? ` • ${training.location}` : '';
  const durStr = ` • ${training.durationMinutes || 90} min`;
  const statusStr = training.completed ? ' • Concluído' : ' • Planeado';
  doc.text(`${typeStr}${timeStr}${locStr}${durStr}${statusStr}`, 20, curY + 15);

  curY += 27;

  // Box 1: Objetivo Principal da Sessão (se existir)
  if (training.sessionPlan?.objective) {
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(15, curY, 180, 20, 2, 2, 'F');
    doc.setDrawColor(180, 215, 245);
    doc.roundedRect(15, curY, 180, 20, 2, 2, 'S');

    doc.setFillColor(0, 140, 220);
    doc.rect(15, curY, 180, 5.5, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(15, curY, 2.5, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('OBJETIVO PRINCIPAL DA SESSÃO', 20, curY + 4);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 30, 52);
    const objLines = doc.splitTextToSize(training.sessionPlan.objective, 174);
    doc.text(objLines.slice(0, 2), 18, curY + 11);

    curY += 24;
  }

  // Box 2: Blocos e Exercícios da Sessão
  const blocks = training.sessionPlan?.blocks || [];
  const plannedMinutes = blocks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

  doc.setFillColor(15, 30, 52);
  doc.rect(15, curY, 180, 7.5, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(15, curY, 2.5, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ESTRUTURA DA SESSÃO (${blocks.length} ${blocks.length === 1 ? 'bloco' : 'blocos'} · ${plannedMinutes} min planeados)`,
    20,
    curY + 5
  );

  curY += 10;

  if (blocks.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, curY, 180, 16, 2, 2, 'F');
    doc.setDrawColor(220, 230, 240);
    doc.roundedRect(15, curY, 180, 16, 2, 2, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 115, 130);
    doc.text('Nenhum bloco ou exercício estruturado para esta sessão.', 20, curY + 10);
    curY += 20;
  } else {
    blocks.forEach((block, idx) => {
      // Exercises from the library bring their drawing: the block grows to fit it on the right
      const exercise = block.exerciseId
        ? (state.exerciseLibrary || []).find((e) => e.id === block.exerciseId)
        : undefined;
      const image = exercise?.image;
      let imgW = 0;
      let imgH = 0;
      if (image) {
        try {
          const props = doc.getImageProperties(image);
          imgW = 70;
          imgH = Math.min(52, (props.height / props.width) * imgW);
          if (imgH === 52) imgW = (props.width / props.height) * imgH;
        } catch {
          imgW = 0;
        }
      }
      const textWidth = imgW ? 176 - imgW - 18 : 166;
      const details = [block.notes, exercise?.description].filter(Boolean).join('\n');
      const noteLines = details ? doc.splitTextToSize(details, textWidth).slice(0, imgW ? 8 : 2) : [];
      const boxH = Math.max(22, imgW ? imgH + 8 : 0, 16 + noteLines.length * 3.6);

      if (curY + boxH > 280) {
        doc.addPage();
        curY = 20;
      }

      const catLabel = block.category ? `[${block.category.toUpperCase()}] ` : '';
      const duration = block.durationMinutes ? `${block.durationMinutes} min` : '';

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, curY, 180, boxH, 2, 2, 'F');
      doc.setDrawColor(200, 220, 235);
      doc.roundedRect(15, curY, 180, boxH, 2, 2, 'S');
      if (imgW) {
        doc.addImage(image!, 'JPEG', 192 - imgW, curY + 4, imgW, imgH);
      }

      // Index badge
      doc.setFillColor(0, 180, 230);
      doc.roundedRect(18, curY + 3.5, 6, 6, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(String(idx + 1), 21, curY + 7.7, { align: 'center' });

      // Title & duration
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 30, 52);
      doc.text(doc.splitTextToSize(`${catLabel}${block.title || 'Bloco sem título'}`, textWidth)[0], 27, curY + 8);

      if (duration) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 140, 200);
        doc.text(duration, imgW ? 27 : 188, imgW ? curY + 13 : curY + 8, { align: imgW ? 'left' : 'right' });
      }

      // Objective / notes and the exercise's rules
      if (noteLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(60, 75, 90);
        doc.text(noteLines, 27, curY + (imgW ? 18 : 14));
      }

      curY += boxH + 3;
    });
  }

  // Box 3: Notas Gerais / Observações do Treinador
  if (training.notes && curY < 250) {
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(15, curY, 180, 22, 2, 2, 'F');
    doc.setDrawColor(215, 225, 235);
    doc.roundedRect(15, curY, 180, 22, 2, 2, 'S');

    doc.setFillColor(40, 55, 75);
    doc.rect(15, curY, 180, 5.5, 'F');
    doc.setFillColor(0, 210, 255);
    doc.rect(15, curY, 2.5, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('NOTAS GERAIS / OBSERVAÇÕES', 20, curY + 4);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 40, 50);
    const noteLines = doc.splitTextToSize(training.notes, 174);
    doc.text(noteLines.slice(0, 3), 18, curY + 10.5);

    curY += 26;
  }

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const numPart = training.trainingNumber ? `_Treino_${training.trainingNumber}` : '';
  const filename = `Plano${numPart}_${sanitize(myClub)}_${training.date || 'sem_data'}.pdf`;
  return { doc, filename };
}
