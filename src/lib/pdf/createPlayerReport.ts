import { Player, AppState } from '../../types';
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

  drawMinutesByGame(doc, w, s);

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
  drawTrainingMonths(doc, w, s);
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

// Light-surface step of the validated palette (one series) and neutral tokens
export const PDF_BAR: [number, number, number] = [42, 120, 214];
export const PDF_TRACK: [number, number, number] = [226, 232, 240];
const PDF_GRID: [number, number, number] = [203, 213, 225];
export const PDF_MUTED: [number, number, number] = [100, 116, 139];
export const PDF_INK: [number, number, number] = [15, 23, 42];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type Writer = ReturnType<typeof createTextReportWriter>;

/** Minutes game by game: bar = minutes played over the game's minutes (track), dashed 50% line, G/A above. */
export function drawMinutesByGame(doc: any, w: Writer, s: ReturnType<typeof buildPlayerSeason>) {
  const games = s.evolution.games;
  if (games.length === 0) return;
  w.heading('Minutos jogo a jogo');
  const h = 38;
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
