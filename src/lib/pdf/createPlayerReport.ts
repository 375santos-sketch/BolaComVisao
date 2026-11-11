import { Player, AppState } from '../../types';
import { sortPlayerObjs, computeAge, homeFirstScore } from '../utils';
import { t } from '../../i18n/dict';
import {
  getJsPDF,
  drawDocumentHeader,
  drawPlayerAvatar,
  addBolaComVisaoPageFooters,
  createTextReportWriter,
  pdfBrand,
  drawSectionTitle
} from './pdfLayout';
import { buildPlayerSeason } from '../playerSeason';
import { absenceReasonLabel } from '../trainingQuick';
import { APP } from './pdfTheme';
import { kpiRow, ring } from './pdfDash';

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

  const darkText = [20, 30, 40];
  const mutedText = [90, 110, 130];

  // Header with Left Club Crest & Right BolaComVisao Logo
  drawDocumentHeader(doc, state, 'Plantel', `${activePlayers.length} atletas`);

  let curY = 37;

  // The squad in numbers: how many athletes and how many are available, injured or suspended
  const statusCount = (st: string) => activePlayers.filter((p) => (p.status || 'disponivel') === st).length;
  curY +=
    kpiRow(
      doc,
      [
        { label: 'Atletas', value: String(activePlayers.length) },
        { label: 'Disponíveis', value: String(statusCount('disponivel')), tone: 'success' },
        {
          label: 'Lesionados',
          value: String(statusCount('lesionado')),
          tone: statusCount('lesionado') ? 'danger' : 'muted'
        },
        {
          label: 'Suspensos',
          value: String(statusCount('suspenso')),
          tone: statusCount('suspenso') ? 'warning' : 'muted'
        }
      ],
      curY
    ) + 5;

  // Table header (a band, drawn again on every new page)
  curY += drawSectionTitle(doc, pdfBrand(state), 'Atletas', 15, curY, 180) + 2;
  const headerBand = (yy: number) => {
    doc.setFillColor(...APP.surface2);
    doc.roundedRect(15, yy - 4, 180, 6, 1.5, 1.5, 'F');
    doc.setFillColor(...APP.brand);
    doc.rect(15, yy + 1.6, 180, 0.4, 'F');
  };
  headerBand(curY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Nº', 18, curY);
  doc.text('FOTO', 28, curY);
  doc.text('NOME COMPLETO', 42, curY);
  doc.text('POSIÇÃO', 100, curY);
  doc.text('IDADE / PÉ', 140, curY);
  doc.text('ESTADO', 170, curY);

  curY += 6;

  activePlayers.forEach((p, idx) => {
    if (curY > 268) {
      doc.addPage();
      curY = 20;
      headerBand(curY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text('Nº', 18, curY);
      doc.text('FOTO', 28, curY);
      doc.text('NOME COMPLETO', 42, curY);
      doc.text('POSIÇÃO', 100, curY);
      doc.text('IDADE / PÉ', 140, curY);
      doc.text('ESTADO', 170, curY);

      curY += 6;
    }

    const rowHeight = 9.5;
    const photoSize = 7.5;
    const photoX = 27.5;
    const photoY = curY - 3;

    doc.setFillColor(...(idx % 2 === 0 ? APP.surface : APP.bg));
    doc.rect(15, curY - 4, 180, rowHeight, 'F');

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
/**
 * Builds the athlete's season sheet on a single page (for meetings with the coordinator, or to show the parents):
 * summary tiles, minutes game by game, latest games, training attendance month by month and absences by reason.
 * No contacts, no coach notes, no emojis.
 */
export async function buildPlayerProfilePDF(player: Player, state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const s = buildPlayerSeason(state, player.id, state.season);
  const g = s.games;

  drawDocumentHeader(doc, state, 'Ficha do atleta');
  const w = createTextReportWriter(doc, 42, pdfBrand(state));
  const { heading } = w;

  const number =
    player.number !== null && player.number !== undefined && `${player.number}` !== '' ? `#${player.number} ` : '';
  const age = player.birthDate ? computeAge(player.birthDate) : null;
  const info = [
    player.positions,
    age ? `${age} anos` : null,
    player.dominantFoot ? `Pé ${player.dominantFoot.toLowerCase()}` : null
  ]
    .filter(Boolean)
    .join('  •  ');

  // The athlete's card: initials, name and details on the left; share of minutes and training attendance as rings
  const top = 36;
  doc.setFillColor(...APP.surface);
  doc.setDrawColor(...APP.line);
  doc.setLineWidth(0.25);
  doc.roundedRect(14, top, 182, 34, 3, 3, 'FD');
  doc.setFillColor(...APP.brand);
  doc.roundedRect(14, top, 182, 1.2, 0.6, 0.6, 'F');
  const initials = player.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  doc.setFillColor(...APP.surface3);
  doc.setDrawColor(...APP.brand);
  doc.setLineWidth(0.6);
  doc.circle(31, top + 17.5, 10, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...APP.brand);
  doc.text(initials || '?', 31, top + 22, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...APP.text);
  doc.text((doc.splitTextToSize(`${number}${player.name}`, 92) as string[])[0], 46, top + 15);
  if (info) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...APP.muted);
    doc.text((doc.splitTextToSize(info, 92) as string[])[0], 46, top + 22);
  }
  ring(
    doc,
    155,
    top + 15,
    7.5,
    g.calledUp ? g.share : 0,
    APP.brand,
    g.calledUp ? `${Math.round(g.share * 100)}%` : '—',
    {
      label: 'dos minutos'
    }
  );
  ring(
    doc,
    180,
    top + 15,
    7.5,
    s.trainings.held ? s.trainings.rate / 100 : 0,
    APP.success,
    s.trainings.held ? `${s.trainings.rate}%` : '—',
    {
      label: 'nos treinos'
    }
  );
  w.skip(top + 38 - w.y);

  // Summary tiles
  const tiles: [string, string, string][] = [
    ['Jogos', String(g.played), g.calledUp ? `convocado ${g.calledUp}, titular ${g.starts}` : 'sem convocatórias'],
    ['Minutos', String(g.minutes), g.calledUp ? `${Math.round(g.share * 100)}% dos minutos` : '—'],
    ['Golos', String(s.goals), 'marcados'],
    ['Assistências', String(s.assists), 'para golo'],
    [
      'Treinos',
      s.trainings.held ? `${s.trainings.rate}%` : '—',
      s.trainings.held ? `${s.trainings.present} de ${s.trainings.held}` : 'sem treinos'
    ]
  ];
  kpiRow(
    doc,
    tiles.map(([label, value, sub]) => ({ label, value, sub })),
    w.y,
    { x: 14, width: 182 }
  );
  w.skip(26);
  const extras = [
    s.yellowCards || s.redCards ? `Cartões: ${s.yellowCards} amarelo(s), ${s.redCards} vermelho(s)` : '',
    s.ratingAverage !== null ? `Nota média do treinador: ${s.ratingAverage}` : ''
  ].filter(Boolean);
  if (extras.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MUTED);
    doc.text(extras.join('   •   '), 105, w.y, { align: 'center' });
    w.skip(5);
  }

  drawMinutesByGame(doc, w, s, 30);

  heading('Últimos jogos');
  if (s.recentGames.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_MUTED);
    doc.text('Ainda sem jogos nesta época.', 16, w.y);
    w.skip(6);
  } else {
    doc.setFontSize(8.5);
    s.recentGames.forEach((r, i) => {
      doc.setFillColor(...(i % 2 === 0 ? APP.surface : APP.bg));
      doc.rect(14, w.y - 3.6, 182, 5, 'F');
      const date = r.date.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_INK);
      doc.text(date, 16, w.y);
      let opp = `${r.opponent} (${r.home ? 'casa' : 'fora'})`;
      while (opp.length > 4 && doc.getTextWidth(opp) > 70) opp = opp.slice(0, -2);
      doc.text(opp, 30, w.y);
      doc.setFont('helvetica', 'bold');
      doc.text(homeFirstScore(r.scored, r.conceded, r.home), 104, w.y, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      const detail = !r.calledUp
        ? 'não convocado'
        : [
            `${r.minutes} min`,
            r.started ? 'titular' : null,
            r.goals ? `${r.goals} golo(s)` : null,
            r.assists ? `${r.assists} assist.` : null
          ]
            .filter(Boolean)
            .join(', ');
      doc.setTextColor(...(r.calledUp ? PDF_INK : PDF_MUTED));
      doc.text(detail, 118, w.y);
      w.skip(5);
    });
    w.skip(3);
  }

  heading('Treinos');
  if (s.trainings.held === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_MUTED);
    doc.text('Ainda sem treinos registados nesta época.', 16, w.y);
    w.skip(6);
  } else {
    drawTrainingMonths(doc, w, s);
    if (s.absences.length > 0) {
      // Absences by reason, in one line (the full list would not fit on one page)
      const byReason = new Map<string, number>();
      s.absences.forEach((a) => {
        const label = absenceReasonLabel(a.reason);
        byReason.set(label, (byReason.get(label) || 0) + 1);
      });
      const text = `Faltas: ${s.absences.length} (${[...byReason.entries()].map(([r, n]) => `${r} ${n}`).join(', ')})`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_INK);
      (doc.splitTextToSize(text, 178) as string[]).slice(0, 2).forEach((line) => {
        doc.text(line, 16, w.y);
        w.skip(4.5);
      });
    }
  }

  addBolaComVisaoPageFooters(doc);
  return doc;
}

// The app's colours: cyan bars on a navy track
export const PDF_BAR: [number, number, number] = APP.brand;
export const PDF_TRACK: [number, number, number] = APP.surface3;
const PDF_GRID: [number, number, number] = APP.line;
export const PDF_MUTED: [number, number, number] = APP.muted;
export const PDF_INK: [number, number, number] = APP.text;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type Writer = ReturnType<typeof createTextReportWriter>;

/** Minutes game by game: bar = minutes played over the game's minutes (track), G/A above. */
export function drawMinutesByGame(doc: any, w: Writer, s: ReturnType<typeof buildPlayerSeason>, h = 38) {
  const games = s.evolution.games;
  if (games.length === 0) return;
  w.heading('Minutos jogo a jogo');
  w.ensure(h + 12);
  const left = 24;
  const right = 188;
  const top = w.y;
  const bottom = top + h;
  const max = Math.max(1, ...games.map((g) => g.totalMinutes || 0));
  const y = (v: number) => bottom - (v / max) * h;
  const slot = (right - left) / games.length;
  const barW = Math.max(1.5, Math.min(9, slot - 1.2));

  doc.setLineWidth(0.15);
  doc.setDrawColor(...PDF_GRID);
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_MUTED);
  [0, max].forEach((v) => {
    doc.line(left, y(v), right, y(v));
    doc.text(`${v}'`, left - 1.5, y(v) + 1, { align: 'right' });
  });

  const labelEvery = Math.ceil(games.length / 12);
  games.forEach((g, i) => {
    const x = left + i * slot + (slot - barW) / 2;
    const cx = x + barW / 2;
    if (g.calledUp) {
      doc.setFillColor(...PDF_TRACK);
      doc.roundedRect(x, y(g.totalMinutes), barW, bottom - y(g.totalMinutes), 0.6, 0.6, 'F');
      if (g.minutes > 0) {
        doc.setFillColor(...PDF_BAR);
        doc.roundedRect(x, y(g.minutes), barW, bottom - y(g.minutes), 0.6, 0.6, 'F');
      }
    } else {
      doc.setTextColor(...PDF_MUTED);
      doc.text('-', cx, bottom - 1, { align: 'center' });
    }
    const extras = [
      g.goals ? `G${g.goals > 1 ? g.goals : ''}` : '',
      g.assists ? `A${g.assists > 1 ? g.assists : ''}` : ''
    ]
      .filter(Boolean)
      .join(' ');
    if (extras) {
      doc.setTextColor(...PDF_INK);
      doc.text(extras, cx, (g.calledUp ? y(g.minutes) : bottom - 4) - 1.2, { align: 'center' });
    }
    if (i % labelEvery === 0) {
      doc.setTextColor(...PDF_MUTED);
      doc.text(`${g.date.slice(8, 10)}/${g.date.slice(5, 7)}`, cx, bottom + 4, { align: 'center' });
    }
  });
  w.skip(h + 7);
  doc.setFontSize(7);
  doc.setTextColor(...PDF_MUTED);
  doc.text('Azul: minutos jogados. Fundo: minutos do jogo. G = golos, A = assistencias, - = nao convocado.', 14, w.y);
  w.skip(6);
}

/** Training attendance per month: one thin bar per month with "presente/realizados". */
export function drawTrainingMonths(doc: any, w: Writer, s: ReturnType<typeof buildPlayerSeason>) {
  const months = s.evolution.trainingMonths;
  if (months.length === 0) return;
  w.ensure(months.length * 5 + 4);
  const left = 30;
  const width = 130;
  doc.setFontSize(7.5);
  months.forEach((m) => {
    const pct = m.held ? m.present / m.held : 0;
    const y = w.y;
    doc.setTextColor(...PDF_MUTED);
    doc.text(MONTHS[Number(m.month.slice(5, 7)) - 1] || m.month, 16, y + 2.4);
    doc.setFillColor(...PDF_TRACK);
    doc.roundedRect(left, y, width, 3, 1.5, 1.5, 'F');
    if (pct > 0) {
      doc.setFillColor(...PDF_BAR);
      doc.roundedRect(left, y, Math.max(3, width * pct), 3, 1.5, 1.5, 'F');
    }
    doc.setTextColor(...PDF_INK);
    doc.text(`${m.present}/${m.held}  ${Math.round(pct * 100)}%`, left + width + 3, y + 2.4);
    w.skip(5);
  });
  w.skip(4);
}

export async function generatePlayerProfilePDF(player: Player, state: AppState) {
  const doc = await buildPlayerProfilePDF(player, state);
  const sanitize = (v: string) => v.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Ficha_Atleta_${sanitize(player.name)}.pdf`);
}
