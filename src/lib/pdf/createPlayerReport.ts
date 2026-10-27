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
import { PLAYING_TIME_TARGET } from '../playingTime';

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

  let curY = 48;

  // Table header
  curY += drawSectionTitle(doc, pdfBrand(state), 'Atletas', 15, curY, 180) + 2;

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
  w.skip(3);

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
  const tileW = (182 - 4 * 2.5) / 5;
  const top = w.y;
  tiles.forEach(([label, value, sub], i) => {
    const x = 14 + i * (tileW + 2.5);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(...PDF_TRACK);
    doc.roundedRect(x, top, tileW, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_MUTED);
    doc.text(label.toUpperCase(), x + tileW / 2, top + 4.5, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(...PDF_INK);
    doc.text(value, x + tileW / 2, top + 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(...PDF_MUTED);
    doc.text(sub, x + tileW / 2, top + 15.5, { align: 'center' });
  });
  w.skip(27);
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
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, w.y - 3.6, 182, 5, 'F');
      }
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

// Light-surface step of the validated palette (one series) and neutral tokens
export const PDF_BAR: [number, number, number] = [42, 120, 214];
export const PDF_TRACK: [number, number, number] = [226, 232, 240];
const PDF_GRID: [number, number, number] = [203, 213, 225];
export const PDF_MUTED: [number, number, number] = [100, 116, 139];
export const PDF_INK: [number, number, number] = [15, 23, 42];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type Writer = ReturnType<typeof createTextReportWriter>;

/** Minutes game by game: bar = minutes played over the game's minutes (track), dashed 50% line, G/A above. */
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
  const target = y(max * PLAYING_TIME_TARGET);
  doc.setLineDashPattern([1.2, 0.8], 0);
  doc.setDrawColor(...PDF_MUTED);
  doc.line(left, target, right, target);
  doc.setLineDashPattern([], 0);
  doc.text(`${Math.round(PLAYING_TIME_TARGET * 100)}%`, right + 1.5, target + 1);

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
