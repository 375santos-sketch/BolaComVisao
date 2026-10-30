import { AppState, Training } from '../../types';
import { sortPlayerObjs } from '../utils';
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
import { dayLabel, factBoxes, noteBox } from './pdfBlocks';
import { teamSettings } from '../teamSettings';
import { kitBag } from '../kitBag';

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
  curY += drawSectionTitle(doc, pdfBrand(state), 'Assiduidade por atleta', 15, curY, 180) + 2;

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
  const brand = pdfBrand(state);
  drawDocumentHeader(
    doc,
    state,
    training.trainingNumber ? `Plano de treino nº ${training.trainingNumber}` : 'Plano de treino'
  );

  const blocks = training.sessionPlan?.blocks || [];
  const plannedMinutes = blocks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
  const length = training.durationMinutes || teamSettings(state).trainingMinutes;
  let curY = 38;
  curY +=
    factBoxes(
      doc,
      [
        ['Dia', dayLabel(training.date || '')],
        ['Hora', training.time || '—'],
        ['Duração', `${length} min`],
        ['Local', training.location || '—']
      ],
      curY
    ) + 4;
  if (training.type) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_MUTED);
    doc.text(`Tipo de treino: ${training.type.replace(/[^\p{L}\p{N}\s.,·/()-]/gu, '').trim()}`, 15, curY + 2);
    curY += 6;
  }

  // Text is never cut: sections continue on the next page when needed
  const PAGE_BOTTOM = 280;
  const PAGE_TOP = 20;
  const newPage = () => {
    doc.addPage();
    curY = PAGE_TOP;
  };

  /** Section title and all the lines of `text`, across pages if long. */
  const textSection = (title: string, text: string, size = 10) => {
    if (curY + 16 > PAGE_BOTTOM) newPage();
    curY += drawSectionTitle(doc, brand, title, 15, curY, 180);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...PDF_INK);
    (doc.splitTextToSize(text, 180) as string[]).forEach((line) => {
      if (curY + 5 > PAGE_BOTTOM) newPage();
      doc.text(line, 15, curY + 3);
      curY += size * 0.46;
    });
    curY += 5;
  };

  if (training.sessionPlan?.objective?.trim()) {
    if (curY + 20 > PAGE_BOTTOM) newPage();
    curY += drawSectionTitle(doc, brand, 'Objetivo', 15, curY, 180);
    curY += noteBox(doc, brand, training.sessionPlan.objective.trim(), curY, { size: 11, bold: true }) + 6;
  }

  const kit = kitBag(blocks, state.exerciseLibrary);
  if (kit.length) {
    if (curY + 20 > PAGE_BOTTOM) newPage();
    curY += drawSectionTitle(doc, brand, 'Material a levar', 15, curY, 180);
    curY += noteBox(doc, brand, kit.map((i) => i.label).join('  ·  '), curY) + 6;
  }

  if (curY + 30 > PAGE_BOTTOM) newPage();
  curY += drawSectionTitle(
    doc,
    brand,
    `Sessão · ${blocks.length} ${blocks.length === 1 ? 'bloco' : 'blocos'}${plannedMinutes ? ` · ${plannedMinutes} min planeados` : ''}`,
    15,
    curY,
    180
  );

  if (blocks.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_MUTED);
    doc.text('Sem blocos nem exercícios planeados para esta sessão.', 15, curY + 4);
    curY += 10;
  } else {
    // Time bar: each block's share of the session, in its category's colour
    if (plannedMinutes > 0) {
      let x = 15;
      blocks.forEach((b) => {
        const w = (180 * (b.durationMinutes || 0)) / plannedMinutes;
        if (w <= 0) return;
        doc.setFillColor(...categoryColor(b.category));
        doc.rect(x, curY, w, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        const label = `${categoryName(b.category) || b.title || ''} ${b.durationMinutes}'`;
        if (doc.getTextWidth(label) < w - 2) doc.text(label, x + w / 2, curY + 4.1, { align: 'center' });
        x += w;
      });
      curY += 10;
    }

    let minute = 0;
    blocks.forEach((block, idx) => {
      // Each block: minutes and title on top, the exercise's drawing below it, then the text across the whole page
      const exercise = block.exerciseId
        ? (state.exerciseLibrary || []).find((e) => e.id === block.exerciseId)
        : undefined;
      const image = exercise?.image;
      const LEFT = 15;
      const RIGHT = 195;
      const textWidth = RIGHT - LEFT;
      let imgW = 0;
      let imgH = 0;
      if (image) {
        try {
          const props = doc.getImageProperties(image);
          const scale = Math.min(150 / props.width, 75 / props.height);
          imgW = props.width * scale;
          imgH = props.height * scale;
        } catch {
          imgW = 0;
        }
      }
      const from = minute;
      minute += block.durationMinutes || 0;
      const range = block.durationMinutes ? `${from}–${minute}'` : `${idx + 1}.`;
      const cat = categoryName(block.category);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      const tagW = cat ? doc.getTextWidth(cat.toUpperCase()) + 5 : 0;
      const titleX = LEFT + 22 + (tagW ? tagW + 2 : 0);
      doc.setFontSize(11);
      const titleLines: string[] = doc.splitTextToSize(block.title || 'Bloco sem título', RIGHT - titleX);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const description = exercise?.description?.trim();
      const details = [block.notes?.trim(), description && description !== block.notes?.trim() ? description : '']
        .filter(Boolean)
        .join('\n');
      const noteLines: string[] = details ? doc.splitTextToSize(details, textWidth) : [];
      const lineH = 4.4;
      const titleH = (titleLines.length - 1) * 5 + 6;
      const imageTop = Math.max(titleH + 3, 11);
      // Below the title and the "N min" under the minutes
      const firstNoteY = imgW ? Math.max(imageTop + imgH + 5, 13) : Math.max(titleH + 3, 13);

      let i = 0;
      let part = 0;
      do {
        const first = part === 0;
        const noteY = first ? firstNoteY : 5;
        const minH = first ? noteY + lineH * Math.min(3, noteLines.length) + 2 : 12;
        if (curY + minH > PAGE_BOTTOM && curY > PAGE_TOP) newPage();
        const fit = Math.max(1, Math.floor((PAGE_BOTTOM - curY - noteY - 3) / lineH) + 1);
        const take = noteLines.slice(i, i + fit);

        if (first) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...PDF_INK);
          doc.text(range, LEFT, curY + 4.5);
          if (block.durationMinutes) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...PDF_MUTED);
            doc.text(`${block.durationMinutes} min`, LEFT, curY + 8.5);
          }
          if (cat) {
            doc.setFillColor(...categoryColor(block.category));
            doc.roundedRect(LEFT + 22, curY + 0.8, tagW, 5, 2.5, 2.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.text(cat.toUpperCase(), LEFT + 22 + tagW / 2, curY + 4.3, { align: 'center' });
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...PDF_INK);
          doc.text(titleLines, titleX, curY + 4.5, { lineHeightFactor: 1.3 });
          if (imgW) {
            const imgX = LEFT + (textWidth - imgW) / 2;
            doc.addImage(image!, 'JPEG', imgX, curY + imageTop, imgW, imgH);
            doc.setDrawColor(...PDF_LINE);
            doc.rect(imgX, curY + imageTop, imgW, imgH, 'S');
          }
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(...PDF_MUTED);
          doc.text(`${block.title || 'Bloco'} (continuação)`, LEFT, curY + 3);
        }

        if (take.length) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(55, 70, 85);
          doc.text(take, LEFT, curY + noteY + (first ? 1 : 0), { lineHeightFactor: 1.4 });
        }
        const used = take.length ? noteY + take.length * lineH + 1 : Math.max(noteY, first ? 10 : 6);
        i += take.length;
        part++;
        curY += used + 2;
        if (i < noteLines.length) newPage();
      } while (i < noteLines.length);
      doc.setDrawColor(...PDF_LINE);
      doc.setLineWidth(0.3);
      doc.line(LEFT, curY, RIGHT, curY);
      curY += 4;
    });
  }

  if (training.notes?.trim()) textSection('Notas', training.notes.trim());

  // Room to write after the session, when it fits on the page
  if (curY + 30 < PAGE_BOTTOM) {
    curY += drawSectionTitle(doc, brand, 'Depois do treino (à mão)', 15, curY, 180);
    doc.setDrawColor(200, 208, 216);
    doc.setLineDashPattern([1, 1], 0);
    for (let k = 1; k <= 3 && curY + k * 8 < PAGE_BOTTOM; k++) doc.line(15, curY + k * 8, 195, curY + k * 8);
    doc.setLineDashPattern([], 0);
  }

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const numPart = training.trainingNumber ? `_Treino_${training.trainingNumber}` : '';
  const filename = `Plano${numPart}_${sanitize(myClub)}_${training.date || 'sem_data'}.pdf`;
  return { doc, filename };
}

const CATEGORIES: Record<string, [string, [number, number, number]]> = {
  aquecimento: ['Aquecimento', [245, 158, 11]],
  tecnica: ['Técnico', [14, 165, 233]],
  tatica: ['Tático', [139, 92, 246]],
  fisico: ['Físico', [239, 68, 68]],
  jogo: ['Jogo', [16, 185, 129]],
  bolas_paradas: ['Bolas paradas', [100, 116, 139]]
};
const categoryName = (c?: string) => (c ? CATEGORIES[c]?.[0] || c : '');
const categoryColor = (c?: string): [number, number, number] => (c && CATEGORIES[c]?.[1]) || [71, 85, 105];
