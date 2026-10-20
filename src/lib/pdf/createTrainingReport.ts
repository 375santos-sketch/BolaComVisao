import { AppState, Training, Exercise } from '../../types';
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
      if (curY > 245) {
        doc.addPage();
        curY = 20;
      }

      const catLabel = block.category ? `[${block.category.toUpperCase()}] ` : '';
      const duration = block.durationMinutes ? `${block.durationMinutes} min` : '';

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, curY, 180, 22, 2, 2, 'F');
      doc.setDrawColor(200, 220, 235);
      doc.roundedRect(15, curY, 180, 22, 2, 2, 'S');

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
      doc.text(`${catLabel}${block.title || 'Bloco sem título'}`, 27, curY + 8);

      if (duration) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 140, 200);
        doc.text(duration, 188, curY + 8, { align: 'right' });
      }

      // Notes / Description
      if (block.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(60, 75, 90);
        const noteLines = doc.splitTextToSize(block.notes, 166);
        doc.text(noteLines.slice(0, 2), 27, curY + 14);
      }

      curY += 25;
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
  doc.save(filename);
}

/**
 * 3. Ficha Técnica de Exercício de Treino em PDF
 */
export async function generateExercisePDF(exercise: Exercise, state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const categoryLabels: Record<string, string> = {
    aquecimento: 'AQUECIMENTO & ATIVAÇÃO',
    tecnica: 'TÉCNICA & PASSE',
    tatica: 'TÁTICA & ORGANIZAÇÃO',
    jogo: 'JOGOS & REDUZIDOS',
    bolas_paradas: 'BOLAS PARADAS',
    fisico: 'FÍSICO & CONDIÇÃO'
  };

  const catTitle = categoryLabels[exercise.category] || 'EXERCÍCIO DE TREINO';
  drawDocumentHeader(doc, state, 'FICHA TÉCNICA DE EXERCÍCIO', catTitle);

  let curY = 46;

  // 1. Header Banner do Exercício
  doc.setFillColor(15, 30, 52);
  doc.roundedRect(15, curY, 180, 24, 3, 3, 'F');
  doc.setDrawColor(0, 210, 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, curY, 180, 24, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  const nameLines = doc.splitTextToSize(exercise.name.toUpperCase(), 172);
  doc.text(nameLines.slice(0, 2), 20, curY + 7.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 210, 255);

  const durStr = `${exercise.durationMinutes || 15} Minutos`;
  const intensityStr = exercise.intensity ? ` • Intensidade: ${exercise.intensity.toUpperCase()}` : '';
  const dateStr = exercise.createdAt ? ` • Criado a ${new Date(exercise.createdAt).toLocaleDateString('pt-PT')}` : '';
  doc.text(`${durStr}${intensityStr}${dateStr}`, 20, curY + 18.5);

  curY += 29;

  // 2. Quadro Resumo de Condições (4 Mini Cards / KPI)
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(15, curY, 180, 20, 2, 2, 'F');
  doc.setDrawColor(200, 215, 230);
  doc.roundedRect(15, curY, 180, 20, 2, 2, 'S');

  const kpis = [
    { label: 'CATEGORIA', val: catTitle.split('&')[0].trim() },
    { label: 'Nº JOGADORES', val: exercise.playersCount || 'Plantel' },
    { label: 'ESPAÇO / CAMPO', val: exercise.spaceDimensions || 'Definir no campo' },
    { label: 'INTENSIDADE', val: (exercise.intensity || 'Moderada').toUpperCase() }
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = 18 + idx * 45;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 100, 120);
    doc.text(kpi.label, kpiX, curY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 30, 52);
    const valLines = doc.splitTextToSize(kpi.val, 42);
    doc.text(valLines[0] || '—', kpiX, curY + 13);
  });

  curY += 25;

  // 3. Objetivos Táticos e Pedagógicos
  if (exercise.tacticalObjectives) {
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(15, curY, 180, 24, 2, 2, 'F');
    doc.setDrawColor(180, 215, 245);
    doc.roundedRect(15, curY, 180, 24, 2, 2, 'S');

    doc.setFillColor(0, 140, 220);
    doc.rect(15, curY, 180, 5.5, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(15, curY, 2.5, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('OBJETIVOS TÁTICOS & PEDAGÓGICOS', 20, curY + 4);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 30, 52);
    const objLines = doc.splitTextToSize(exercise.tacticalObjectives, 174);
    doc.text(objLines.slice(0, 3), 18, curY + 11);

    curY += 28;
  }

  // 4. Descrição da Dinâmica, Regras e Estrutura
  const descText = exercise.description || 'Sem descrição detalhada inserida para este exercício.';
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, curY, 180, 48, 2, 2, 'F');
  doc.setDrawColor(200, 215, 230);
  doc.roundedRect(15, curY, 180, 48, 2, 2, 'S');

  doc.setFillColor(15, 30, 52);
  doc.rect(15, curY, 180, 6, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(15, curY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DINÂMICA DO EXERCÍCIO, REGRAS & FUNCIONAMENTO', 20, curY + 4.2);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 45, 60);
  const descLines = doc.splitTextToSize(descText, 174);
  doc.text(descLines.slice(0, 8), 18, curY + 12);

  curY += 53;

  // 5. Comportamentos Chave (Coaching Points)
  const points = exercise.coachingPoints || [];
  if (points.length > 0) {
    const cpBoxH = Math.min(42, 10 + points.length * 6.5);
    doc.setFillColor(248, 252, 248);
    doc.roundedRect(15, curY, 180, cpBoxH, 2, 2, 'F');
    doc.setDrawColor(180, 225, 195);
    doc.roundedRect(15, curY, 180, cpBoxH, 2, 2, 'S');

    doc.setFillColor(20, 95, 55);
    doc.rect(15, curY, 180, 5.5, 'F');
    doc.setFillColor(100, 255, 180);
    doc.rect(15, curY, 2.5, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('COMPORTAMENTOS CHAVE (COACHING POINTS & CORREÇÕES)', 20, curY + 4);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 50, 35);

    points.slice(0, 5).forEach((pt, idx) => {
      const ptLines = doc.splitTextToSize(`•  ${pt}`, 172);
      doc.text(ptLines[0], 18, curY + 11 + idx * 6);
    });

    curY += cpBoxH + 5;
  }

  // 6. Variações & Progressões (se existirem)
  if (exercise.variations) {
    doc.setFillColor(255, 252, 245);
    doc.roundedRect(15, curY, 180, 22, 2, 2, 'F');
    doc.setDrawColor(240, 220, 180);
    doc.roundedRect(15, curY, 180, 22, 2, 2, 'S');

    doc.setFillColor(180, 120, 20);
    doc.rect(15, curY, 180, 5.5, 'F');
    doc.setFillColor(255, 220, 120);
    doc.rect(15, curY, 2.5, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('VARIAÇÕES & PROGRESSÕES DO EXERCÍCIO', 20, curY + 4);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 45, 20);
    const varLines = doc.splitTextToSize(exercise.variations, 174);
    doc.text(varLines.slice(0, 3), 18, curY + 11);

    curY += 26;
  }

  // 7. Material & Equipamento Necessário + Tags
  if (curY < 250) {
    doc.setFillColor(245, 248, 252);
    doc.roundedRect(15, curY, 180, 18, 2, 2, 'F');
    doc.setDrawColor(210, 225, 240);
    doc.roundedRect(15, curY, 180, 18, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 30, 52);
    doc.text('MATERIAL NECESSÁRIO:', 18, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 90, 110);
    const equipText =
      exercise.equipment && exercise.equipment.length > 0
        ? exercise.equipment.join(' • ')
        : 'Material padrão de treino (Bolas, Cones, Coletes)';
    doc.text(equipText, 56, curY + 6);

    if (exercise.tags && exercise.tags.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 30, 52);
      doc.text('CONCEITOS / TAGS:', 18, curY + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 140, 220);
      doc.text(exercise.tags.map((t) => `#${t}`).join('  '), 56, curY + 13);
    }
  }

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Exercicio_${sanitize(exercise.name)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * 4. Catálogo Completo de Exercícios de Treino em PDF
 */
export async function generateExerciseCatalogPDF(exercises: Exercise[], state: AppState, categoryFilter?: string) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName || 'A Minha Equipa';

  drawDocumentHeader(
    doc,
    state,
    'CATÁLOGO DE EXERCÍCIOS DE TREINO',
    categoryFilter ? `FILTRO: ${categoryFilter.toUpperCase()}` : `COLEÇÃO COMPLETA (${exercises.length} EXERCÍCIOS)`
  );

  let curY = 46;

  // Banner Informativo
  doc.setFillColor(15, 30, 52);
  doc.roundedRect(15, curY, 180, 18, 2, 2, 'F');
  doc.setDrawColor(0, 210, 255);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, curY, 180, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`DOSSIÊ TÉCNICO DE EXERCÍCIOS & DINÂMICAS`, 20, curY + 7);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 210, 255);
  doc.text(
    `Total: ${exercises.length} dinâmicas registadas • Emitido em ${new Date().toLocaleDateString('pt-PT')} • ${myClub}`,
    20,
    curY + 13
  );

  curY += 24;

  if (exercises.length === 0) {
    doc.setFillColor(245, 248, 252);
    doc.roundedRect(15, curY, 180, 20, 2, 2, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 120, 140);
    doc.text('Nenhum exercício encontrado na biblioteca para exportar.', 20, curY + 11);
  } else {
    exercises.forEach((ex, idx) => {
      if (curY > 235) {
        doc.addPage();
        curY = 20;
        doc.setFillColor(15, 30, 52);
        doc.rect(15, curY, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(`CATÁLOGO DE EXERCÍCIOS (CONTINUAÇÃO) · ${myClub}`, 18, curY + 4.8);
        curY += 12;
      }

      // Exercise Item Card
      doc.setFillColor(252, 254, 255);
      doc.roundedRect(15, curY, 180, 38, 2, 2, 'F');
      doc.setDrawColor(210, 225, 240);
      doc.roundedRect(15, curY, 180, 38, 2, 2, 'S');

      // Top bar with number and category
      doc.setFillColor(24, 48, 80);
      doc.rect(15, curY, 180, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`#${idx + 1}  ${ex.name.toUpperCase()}`, 18, curY + 4.2);

      doc.setFontSize(7);
      doc.setTextColor(0, 210, 255);
      doc.text(
        `${ex.category.toUpperCase()} • ${ex.durationMinutes} min • Intensidade: ${(ex.intensity || 'Mod').toUpperCase()}`,
        190,
        curY + 4.2,
        { align: 'right' }
      );

      // Exercise Details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(60, 75, 90);

      const obj = ex.tacticalObjectives ? `[Objetivo]: ${ex.tacticalObjectives}` : '';
      const desc = ex.description ? `[Descrição]: ${ex.description}` : '';
      const textToPrint = obj || desc || 'Sem notas adicionais.';

      const lines = doc.splitTextToSize(textToPrint, 172);
      doc.text(lines.slice(0, 2), 18, curY + 11);

      // Meta: players, space, equipment
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 30, 52);
      doc.text('Jogadores:', 18, curY + 23);
      doc.setFont('helvetica', 'normal');
      doc.text(ex.playersCount || 'Plantel', 33, curY + 23);

      doc.setFont('helvetica', 'bold');
      doc.text('Espaço:', 80, curY + 23);
      doc.setFont('helvetica', 'normal');
      doc.text(ex.spaceDimensions || 'Meio campo', 93, curY + 23);

      if (ex.equipment && ex.equipment.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Material:', 18, curY + 30);
        doc.setFont('helvetica', 'normal');
        doc.text(ex.equipment.slice(0, 4).join(', '), 31, curY + 30);
      }

      curY += 43;
    });
  }

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Catalogo_Exercicios_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
