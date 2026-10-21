import { AppState, ScheduledMatch } from '../../types';
import { getJsPDF, drawDocumentHeader, addBolaComVisaoPageFooters, createTextReportWriter } from './pdfLayout';
import { competitionLabel, dateLabel } from '../preMatchPlan';
import { previousReports } from '../opponentReport';

/** PDF of the Pré-jogo plan for a scheduled game. */
export async function buildPreMatchPlanPDF(game: ScheduledMatch, state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const p = game.preMatchPlan || {};
  const club = state.myClubName || 'A nossa equipa';

  drawDocumentHeader(doc, state, 'PLANO PRÉ-JOGO', `vs ${game.opponent}`);
  const w = createTextReportWriter(doc, 48);

  w.centered(`${club} vs ${game.opponent}`, { size: 13, bold: true });
  w.skip(-0.5);
  w.centered(
    `${dateLabel(game.date)}${game.time ? ` às ${game.time}` : ''}  •  ${game.location === 'fora' ? 'Fora' : 'Casa'}${game.venue ? `  •  ${game.venue}` : ''}  •  ${competitionLabel(game)}`,
    { size: 9, color: [71, 85, 105] }
  );
  if (game.meetingTime || game.meetingPoint) {
    w.centered(`Concentração: ${[game.meetingTime, game.meetingPoint].filter(Boolean).join(' • ')}`, {
      size: 9,
      color: [71, 85, 105]
    });
  }
  w.skip(4.5);

  if (p.motto) {
    w.heading('Palavra de ordem');
    w.paragraph(p.motto);
  }
  w.heading('Sistema tático');
  w.paragraph(p.system || '—');
  w.heading('Objetivos');
  w.list(p.objectives, true);
  w.heading('Com bola');
  w.paragraph(p.withBall || '—');
  w.heading('Sem bola');
  w.paragraph(p.withoutBall || '—');
  const last = previousReports(state.matches || [], game.opponent, game.date)[0];
  if (last?.opponentReport?.nextTime) {
    w.heading(`Da última vez contra eles (${dateLabel(last.date)})`);
    w.paragraph(last.opponentReport.nextTime);
  }
  if (p.notes) {
    w.heading('Notas');
    w.paragraph(p.notes);
  }

  addBolaComVisaoPageFooters(doc);
  return doc;
}

export async function generatePreMatchPlanPDF(game: ScheduledMatch, state: AppState) {
  const doc = await buildPreMatchPlanPDF(game, state);
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`PreJogo_${safe(game.opponent)}_${game.date}.pdf`);
}
