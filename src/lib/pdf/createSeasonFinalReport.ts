import { AppState, Player } from '../../types';
import { buildPlayerSeason, PlayerSeason } from '../playerSeason';
import {
  getJsPDF,
  drawDocumentHeader,
  drawPlayerAvatar,
  addBolaComVisaoPageFooters,
  createTextReportWriter,
  pdfBrand
} from './pdfLayout';
import { drawMinutesByGame, drawTrainingMonths, PDF_BAR, PDF_INK, PDF_MUTED, PDF_TRACK } from './createPlayerReport';

/**
 * End-of-season report for each family: the athlete's season (games, minutes, goals, assists, training attendance,
 * evolution charts, highlights) and the coach's message. Like the athlete's sheet, never carries contacts, birth
 * date or the coach's private notes.
 */

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const joinPt = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;

/** The coach's message for that season (empty when not written). */
function seasonMessageOf(player: Player, season?: string): string {
  return (season && player.seasonMessages?.[season]?.trim()) || '';
}

/** Short sentences with the best moments of the athlete's season. */
export function seasonHighlights(s: PlayerSeason): string[] {
  const games = s.evolution.games.filter((g) => g.calledUp);
  const out: string[] = [];

  const firstGoal = games.find((g) => g.goals > 0);
  if (firstGoal) out.push(`Primeiro golo da época a ${ddmm(firstGoal.date)}, contra ${firstGoal.opponent}.`);

  const best = [...games]
    .filter((g) => g.goals + g.assists > 0)
    .sort((a, b) => b.goals + b.assists - (a.goals + a.assists) || b.goals - a.goals)[0];
  if (best && best.goals + best.assists > 1) {
    const parts = [
      best.goals ? plural(best.goals, 'golo', 'golos') : '',
      best.assists ? plural(best.assists, 'assistência', 'assistências') : ''
    ].filter(Boolean);
    out.push(`Melhor jogo: ${joinPt(parts)} contra ${best.opponent} (${ddmm(best.date)}).`);
  }

  const full = games.filter((g) => g.totalMinutes > 0 && g.minutes >= g.totalMinutes).length;
  if (full > 0) out.push(`Jogou o jogo inteiro em ${plural(full, 'jogo', 'jogos')}.`);
  if (s.games.starts > 0) out.push(`Titular em ${plural(s.games.starts, 'jogo', 'jogos')}.`);

  const perfect = s.evolution.trainingMonths
    .filter((m) => m.held > 0 && m.present === m.held)
    .map((m) => MONTH_NAMES[Number(m.month.slice(5, 7)) - 1]);
  if (perfect.length > 0) out.push(`Presente em todos os treinos de ${joinPt(perfect)}.`);
  return out;
}

type Doc = any;

function drawTiles(doc: Doc, top: number, s: PlayerSeason) {
  const g = s.games;
  const tiles: [string, string, string][] = [
    ['Jogos', String(g.played), `convocado ${g.calledUp}, titular ${g.starts}`],
    ['Minutos', String(g.minutes), `${Math.round(g.share * 100)}% dos minutos`],
    ['Golos', String(s.goals), s.goals ? 'marcados' : '—'],
    ['Assistências', String(s.assists), s.assists ? 'para golo' : '—'],
    [
      'Treinos',
      s.trainings.rate === null ? '—' : `${s.trainings.rate}%`,
      s.trainings.held ? `${s.trainings.present} de ${s.trainings.held}` : 'sem registos'
    ]
  ];
  const gap = 3;
  const cw = (182 - gap * 4) / 5;
  tiles.forEach(([label, value, sub], i) => {
    const x = 14 + i * (cw + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...PDF_TRACK);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, top, cw, 20, 2, 2, 'FD');
    doc.setFillColor(...PDF_BAR);
    doc.rect(x + 2, top, cw - 4, 0.9, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_MUTED);
    doc.text(label, x + cw / 2, top + 5.2, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...PDF_INK);
    doc.text(value, x + cw / 2, top + 12.6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_MUTED);
    doc.text(sub, x + cw / 2, top + 17.2, { align: 'center' });
  });
}

/** Draws one athlete's report starting on the current page. */
function drawSeasonFinalReport(doc: Doc, player: Player, state: AppState, season?: string) {
  const s = buildPlayerSeason(state, player.id, season);
  drawDocumentHeader(doc, state, 'Relatório de fim de época');

  drawPlayerAvatar(doc, player, 93, 44, 24);
  const w = createTextReportWriter(doc, 75, pdfBrand(state));
  const number =
    player.number !== null && player.number !== undefined && `${player.number}` !== '' ? `#${player.number}  ` : '';
  w.centered(`${number}${player.name}`, { size: 16, bold: true });
  w.skip(-1);
  if (player.positions) w.centered(player.positions, { size: 9, color: [71, 85, 105] });
  w.skip(2);

  drawTiles(doc, w.y, s);
  w.skip(27);

  const highlights = seasonHighlights(s);
  if (highlights.length > 0) {
    w.heading('Destaques da época');
    w.list(highlights);
    w.skip(1);
  }

  if (s.games.calledUp === 0) {
    w.heading('Jogos');
    w.paragraph('Ainda não foi convocado para jogos nesta época.');
  } else {
    drawMinutesByGame(doc, w, s);
  }

  w.heading('Assiduidade aos treinos');
  w.paragraph(
    s.trainings.held === 0
      ? 'Ainda sem treinos registados nesta época.'
      : `Presente em ${s.trainings.present} de ${s.trainings.held} treinos (${s.trainings.rate}%).`
  );
  drawTrainingMonths(doc, w, s);

  const message = seasonMessageOf(player, season);
  if (message) {
    w.skip(2);
    w.heading('Mensagem do treinador');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(message, 166) as string[];
    const signer = state.currentUser?.name?.trim();
    const h = lines.length * 5 + (signer ? 14 : 8);
    w.ensure(h + 2);
    const top = w.y - 2;
    doc.setFillColor(240, 247, 255);
    doc.setDrawColor(...PDF_BAR);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, top, 182, h, 2.5, 2.5, 'FD');
    doc.setFillColor(...PDF_BAR);
    doc.rect(14, top + 2, 1.4, h - 4, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_INK);
    lines.forEach((line, i) => doc.text(line, 22, top + 7 + i * 5));
    if (signer) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...PDF_MUTED);
      doc.text(`${signer}, treinador`, 190, top + h - 4, { align: 'right' });
    }
    w.skip(h + 4);
  }

  // Closing line only where it fits: never a page of its own
  if (w.y < 276) {
    w.skip(2);
    w.centered('Obrigado por esta época. Continua a crescer!', { size: 10, bold: true, color: [42, 120, 214] });
  }
}

/** One athlete per section (each starting on a new page); a single PDF for the whole squad when given many. */
export async function buildSeasonFinalReportPDF(players: Player[], state: AppState, season = state.season) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  players.forEach((p, i) => {
    if (i > 0) doc.addPage();
    drawSeasonFinalReport(doc, p, state, season);
  });
  addBolaComVisaoPageFooters(doc);
  return doc;
}

export async function generateSeasonFinalReportPDF(players: Player[], state: AppState) {
  const doc = await buildSeasonFinalReportPDF(players, state);
  const sanitize = (v: string) => v.replace(/[^a-zA-Z0-9]/g, '_');
  const season = sanitize(state.season || '');
  const name = players.length === 1 ? sanitize(players[0].name) : 'Plantel';
  doc.save(`Fim_de_Epoca_${name}_${season}.pdf`);
}
