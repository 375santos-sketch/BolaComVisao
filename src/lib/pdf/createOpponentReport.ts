import { AppState, Match } from '../../types';
import {
  getJsPDF,
  drawDocumentHeader,
  addBolaComVisaoPageFooters,
  createTextReportWriter,
  pdfBrand
} from './pdfLayout';
import { getOpponentMatchFacts } from '../opponentReport';
import { getMatchCompetitionDetails } from '../utils';

/** PDF of the post-match opponent report (no emojis: the PDF fonts cannot draw them). */
export async function buildOpponentReportPDF(match: Match, state: AppState) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const f = getOpponentMatchFacts(match);
  const r = match.opponentReport || {};
  const comp = getMatchCompetitionDetails(match, state);
  const club = state.myClubName || 'A nossa equipa';
  const date = match.date.split('-').reverse().join('/');

  drawDocumentHeader(doc, state, 'Relatório do adversário', `vs ${match.opponent}`);

  const w = createTextReportWriter(doc, 42, pdfBrand(state));
  const { heading, paragraph, list } = w;

  const home = match.location !== 'fora';
  const score = home
    ? `${club} ${f.scored} - ${f.conceded} ${match.opponent}`
    : `${match.opponent} ${f.conceded} - ${f.scored} ${club}`;
  w.centered(score, { size: 13, bold: true });
  w.skip(-0.5);
  w.centered(`${date}  •  ${home ? 'Casa' : 'Fora'}  •  ${comp.typeLabel}`, { size: 9, color: [71, 85, 105] });
  w.skip(4.5);

  heading('No jogo');
  paragraph(
    f.conceded === 0
      ? 'Golos do adversário: não marcou.'
      : `Golos do adversário (${f.conceded}): ${f.concededGoals
          .map((g) => [g.minute, g.origin].filter(Boolean).join(' ') || 'sem minuto')
          .join(', ')}.`
  );
  paragraph(
    [
      `Remates: ${f.shotsAgainst === null ? 'não registados' : `${f.shotsAgainst} (${f.shotsAgainstInBox} dentro, ${f.shotsAgainstOutBox} fora da área)`}`,
      `Cantos: ${f.cornersAgainst ?? 'não registados'}`,
      `Faltas cometidas: ${f.opponentFouls ?? 'não registadas'}`
    ].join('   |   ')
  );

  heading('Sistema tático');
  paragraph(r.system?.trim() || '—');
  heading('Pontos fortes');
  list(r.strengths);
  heading('Pontos fracos');
  list(r.weaknesses);
  heading('Jogadores perigosos');
  list(r.dangerousPlayers);
  if (r.notes?.trim()) {
    heading('Notas');
    paragraph(r.notes.trim());
  }
  heading('Para o próximo jogo contra eles');
  paragraph(r.nextTime?.trim() || '—');

  addBolaComVisaoPageFooters(doc);
  return doc;
}

export async function generateOpponentReportPDF(match: Match, state: AppState) {
  const doc = await buildOpponentReportPDF(match, state);
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Relatorio_Adversario_${safe(match.opponent)}_${match.date}.pdf`);
}
