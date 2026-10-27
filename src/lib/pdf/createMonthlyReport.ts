import { AppState } from '../../types';
import { MonthlyReport } from '../monthlyReport';
import { addBolaComVisaoPageFooters, drawDocumentHeader, drawSectionTitle, getJsPDF, pdfBrand } from './pdfLayout';

/**
 * Monthly report PDF for the coordinator: summary tiles, the month's games, a table per athlete (attendance, games,
 * minutes, goals, assists), the objectives worked on and the coach's notes for the coordinator.
 */

type Doc = any;
type Rgb = [number, number, number];

const LEFT = 15;
const WIDTH = 180;
const PAGE_BOTTOM = 280;
const INK: Rgb = [15, 30, 52];
const MUTED: Rgb = [100, 115, 130];

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

interface Column {
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export async function buildMonthlyReportPDF(report: MonthlyReport, state: AppState, coachNotes = '') {
  const jsPDF = await getJsPDF();
  const doc: Doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawDocumentHeader(doc, state, 'Relatório mensal', report.label);
  const brand = pdfBrand(state);
  let y = 38;

  const ensure = (h: number) => {
    if (y + h > PAGE_BOTTOM) {
      doc.addPage();
      y = 18;
    }
  };

  const heading = (text: string) => {
    ensure(16);
    y += 1;
    y += drawSectionTitle(doc, brand, text, LEFT, y, WIDTH) + 1;
  };

  const muted = (text: string) => {
    ensure(7);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(text, LEFT + 2, y + 3);
    y += 8;
  };

  /** Table with a header row (repeated on a new page) and zebra rows; cells may carry their own colour. */
  const table = (columns: Column[], rows: { cells: string[]; colors?: (Rgb | undefined)[]; bold?: boolean }[]) => {
    const rowH = 6;
    const drawHeader = () => {
      doc.setFillColor(226, 236, 245);
      doc.rect(LEFT, y, WIDTH, rowH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...INK);
      let x = LEFT;
      columns.forEach((c) => {
        const tx = c.align === 'right' ? x + c.width - 2 : c.align === 'center' ? x + c.width / 2 : x + 2;
        doc.text(c.title, tx, y + 4.1, { align: c.align || 'left' });
        x += c.width;
      });
      y += rowH;
    };
    ensure(rowH * 2);
    drawHeader();
    rows.forEach((row, i) => {
      if (y + rowH > PAGE_BOTTOM) {
        doc.addPage();
        y = 18;
        drawHeader();
      }
      if (i % 2 === 1) {
        doc.setFillColor(246, 249, 252);
        doc.rect(LEFT, y, WIDTH, rowH, 'F');
      }
      doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
      doc.setFontSize(8);
      let x = LEFT;
      columns.forEach((c, k) => {
        const color = row.colors?.[k] || INK;
        doc.setTextColor(...color);
        let text = row.cells[k] ?? '';
        // Long names are shortened to the column width
        while (text.length > 1 && doc.getTextWidth(text) > c.width - 3) text = text.slice(0, -2) + '…';
        const tx = c.align === 'right' ? x + c.width - 2 : c.align === 'center' ? x + c.width / 2 : x + 2;
        doc.text(text, tx, y + 4.1, { align: c.align || 'left' });
        x += c.width;
      });
      y += rowH;
    });
    doc.setDrawColor(210, 222, 234);
    doc.line(LEFT, y, LEFT + WIDTH, y);
    y += 5;
  };

  const paragraph = (text: string, x = LEFT + 2, width = WIDTH - 4) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    (doc.splitTextToSize(text, width) as string[]).forEach((line) => {
      ensure(4.5);
      doc.text(line, x, y + 3);
      y += 4.3;
    });
  };

  // Summary tiles
  const { record, trainings } = report;
  const tiles: [string, string, string][] = [
    ['Jogos', String(report.games.length), `${record.won}V ${record.drawn}E ${record.lost}D`],
    ['Golos', `${record.goalsFor}-${record.goalsAgainst}`, 'marcados - sofridos'],
    [
      'Treinos',
      String(trainings.held),
      trainings.planned > trainings.held ? `de ${trainings.planned} marcados` : 'realizados'
    ],
    ['Assiduidade', trainings.attendance === null ? '—' : `${trainings.attendance}%`, 'média dos atletas']
  ];
  const tileW = (WIDTH - 9) / 4;
  tiles.forEach(([label, value, sub], i) => {
    const x = LEFT + i * (tileW + 3);
    doc.setFillColor(240, 247, 252);
    doc.setDrawColor(200, 222, 238);
    doc.roundedRect(x, y, tileW, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + tileW / 2, y + 5, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(value, x + tileW / 2, y + 12.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(sub, x + tileW / 2, y + 17, { align: 'center' });
  });
  y += 26;

  // Games
  heading('Jogos do mês');
  if (report.games.length === 0) muted('Sem jogos terminados neste mês.');
  else {
    const resultColor: Record<string, Rgb> = { V: [22, 140, 90], E: [180, 120, 0], D: [200, 40, 60] };
    table(
      [
        { title: 'Data', width: 16 },
        { title: 'Adversário', width: 62 },
        { title: 'Local', width: 18 },
        { title: 'Competição', width: 44 },
        { title: 'Resultado', width: 24, align: 'center' },
        { title: '', width: 16, align: 'center' }
      ],
      report.games.map((g) => ({
        cells: [
          ddmm(g.date),
          g.opponent,
          g.home ? 'Casa' : 'Fora',
          g.competition,
          `${g.scored} - ${g.conceded}`,
          g.result
        ],
        colors: [undefined, undefined, undefined, undefined, undefined, resultColor[g.result]]
      }))
    );
  }

  // Athletes
  heading('Atletas: treinos, jogos e minutos');
  if (report.players.length === 0) muted('Sem atletas no plantel.');
  else {
    const low = (p: { attendance: number | null }) => p.attendance !== null && p.attendance < 75;
    table(
      [
        { title: 'Nº', width: 10, align: 'center' },
        { title: 'Atleta', width: 50 },
        { title: 'Treinos', width: 26, align: 'center' },
        { title: 'Convoc.', width: 16, align: 'center' },
        { title: 'Jogou', width: 14, align: 'center' },
        { title: 'Titular', width: 14, align: 'center' },
        { title: 'Minutos', width: 18, align: 'center' },
        { title: 'Golos', width: 16, align: 'center' },
        { title: 'Assist.', width: 16, align: 'center' }
      ],
      report.players.map((p) => ({
        cells: [
          p.number === null ? '—' : String(p.number),
          p.name,
          p.trainingsHeld ? `${p.trainingsPresent}/${p.trainingsHeld} (${p.attendance}%)` : '—',
          String(p.calledUp),
          String(p.played),
          String(p.starts),
          p.share === null ? String(p.minutes) : `${p.minutes} (${p.share}%)`,
          String(p.goals),
          String(p.assists)
        ],
        colors: [undefined, undefined, low(p) ? [200, 40, 60] : undefined]
      }))
    );
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    ensure(5);
    doc.text(
      'Minutos: entre parênteses, a parte dos minutos dos jogos do mês. Treinos a vermelho: assiduidade abaixo de 75%.',
      LEFT + 2,
      y
    );
    y += 6;
  }

  // Objectives
  heading('Objetivos trabalhados');
  if (report.objectives.length === 0)
    muted('Sem objetivos registados nos planos de treino nem nos pré-jogos deste mês.');
  else {
    report.objectives.forEach((o) => {
      ensure(9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...brand);
      doc.text(`${ddmm(o.date)} · ${o.source}`, LEFT + 2, y + 3);
      y += 4.5;
      paragraph(o.text, LEFT + 4, WIDTH - 6);
      y += 1.5;
    });
    y += 3;
  }

  // Coach's notes for the coordinator
  if (coachNotes.trim()) {
    heading('Notas do treinador');
    paragraph(coachNotes.trim());
  }

  addBolaComVisaoPageFooters(doc);
  const club = (state.myClubName || 'Equipa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_');
  return { doc, filename: `Relatorio_Mensal_${club}_${report.month}.pdf` };
}
