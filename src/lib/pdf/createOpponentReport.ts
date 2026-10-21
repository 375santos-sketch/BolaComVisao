import { AppState, Match } from '../../types';
import { getJsPDF, drawDocumentHeader, addBolaComVisaoPageFooters } from './pdfLayout';
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

  drawDocumentHeader(doc, state, 'RELATÓRIO DO ADVERSÁRIO (PÓS-JOGO)', match.opponent);

  let y = 48;
  const left = 14;
  const width = 182;
  const ensure = (h: number) => {
    if (y + h > 280) {
      doc.addPage();
      y = 18;
    }
  };
  const heading = (text: string) => {
    ensure(12);
    doc.setFillColor(10, 25, 42);
    doc.rect(left, y - 4.5, width, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 190, 240);
    doc.text(text.toUpperCase(), left + 2, y);
    y += 7;
  };
  const paragraph = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, width - 4);
    lines.forEach((line: string) => {
      ensure(5);
      doc.text(line, left + 2, y);
      y += 4.8;
    });
    y += 2;
  };
  const list = (items?: string[]) => {
    const clean = (items || []).filter((s) => s.trim());
    if (clean.length === 0) paragraph('—');
    else clean.forEach((s) => paragraph(`•  ${s}`));
  };

  const home = match.location !== 'fora';
  const score = home
    ? `${club} ${f.scored} - ${f.conceded} ${match.opponent}`
    : `${match.opponent} ${f.conceded} - ${f.scored} ${club}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(score, 105, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${date}  •  ${home ? 'Casa' : 'Fora'}  •  ${comp.typeLabel}`, 105, y, { align: 'center' });
  y += 9;

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
