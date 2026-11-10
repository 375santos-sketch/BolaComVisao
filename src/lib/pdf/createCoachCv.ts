import { AppState } from '../../types';
import {
  addBolaComVisaoPageFooters,
  createTextReportWriter,
  drawDocumentHeader,
  getJsPDF,
  pdfBrand
} from './pdfLayout';
import { drawSignatureBlock } from './pdfSignature';
import { careerOf, careerStatus, clubDetail, dateLabel, sortClubs, sortCourses } from '../coachCareer';

/** 🎓 A minha carreira → Currículo de treinador: title, continuing education and the teams coached in the app. */
async function buildCoachCvPDF(state: AppState, today = new Date().toISOString().slice(0, 10)) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawDocumentHeader(doc, state, 'Currículo de treinador');
  const career = careerOf(state);
  const status = careerStatus(career, today);
  // The coach's photo above the name, kept in proportion inside a 30 × 36 mm frame
  let top = 42;
  if (career.photo && /^data:image\/(jpeg|png);base64,/.test(career.photo)) {
    try {
      const props = doc.getImageProperties(career.photo);
      const scale = Math.min(30 / props.width, 36 / props.height);
      const pw = props.width * scale;
      const ph = props.height * scale;
      const pageW = doc.internal.pageSize.getWidth();
      doc.addImage(career.photo, (pageW - pw) / 2, 40, pw, ph);
      top = 40 + ph + 6;
    } catch {
      top = 42; // an unreadable photo: the CV goes without it
    }
  }
  const w = createTextReportWriter(doc, top, pdfBrand(state));
  w.centered(state.currentUser?.name || 'Treinador', { size: 16, bold: true });
  w.skip(2);

  w.heading('Título de treinador');
  w.list([
    career.title ? `${career.title}${career.titleNumber ? ` (n.º ${career.titleNumber})` : ''}` : 'Não indicado',
    career.validUntil ? `Válido até ${dateLabel(career.validUntil)}${status.expired ? ' (caducado)' : ''}` : ''
  ]);

  const clubs = sortClubs(career.clubs);
  if (clubs.length) {
    w.heading('Clubes por onde passou');
    w.list(clubs.map((c) => `${c.period} · ${c.club}${clubDetail(c) ? ` · ${clubDetail(c)}` : ''}`));
  }

  const courses = sortCourses(career.courses);
  w.heading(
    `Formação contínua · ${status.credits} ${status.credits === 1 ? 'crédito' : 'créditos'}${
      career.creditsNeeded ? ` de ${career.creditsNeeded}` : ''
    }`
  );
  w.list(
    courses.map(
      (c) =>
        `${dateLabel(c.date)} · ${c.name}${c.entity ? ` (${c.entity})` : ''} · ${c.credits} ${
          c.credits === 1 ? 'crédito' : 'créditos'
        }${c.hours ? ` · ${c.hours} h` : ''}${c.certificate ? ' · certificado' : ''}`
    )
  );

  const teams = (state.teams || []).filter(Boolean);
  if (teams.length) {
    w.heading('Equipas nesta app');
    w.list(teams.map((t) => [t.clubName, t.category, t.season].filter(Boolean).join(' · ')));
  }
  drawSignatureBlock(doc, state, 'curriculo', w.y);
  addBolaComVisaoPageFooters(doc);
  return doc;
}

export async function generateCoachCvPDF(state: AppState) {
  const doc = await buildCoachCvPDF(state);
  const name = (state.currentUser?.name || 'Treinador').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Curriculo_${name}.pdf`);
}
