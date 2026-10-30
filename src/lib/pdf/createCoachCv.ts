import { AppState } from '../../types';
import {
  addBolaComVisaoPageFooters,
  createTextReportWriter,
  drawDocumentHeader,
  getJsPDF,
  pdfBrand
} from './pdfLayout';
import { drawSignatureBlock } from './pdfSignature';
import { careerOf, careerStatus, dateLabel, sortCourses } from '../coachCareer';

/** 🎓 A minha carreira → Currículo de treinador: title, continuing education and the teams coached in the app. */
async function buildCoachCvPDF(state: AppState, today = new Date().toISOString().slice(0, 10)) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawDocumentHeader(doc, state, 'Currículo de treinador');
  const career = careerOf(state);
  const status = careerStatus(career, today);
  const w = createTextReportWriter(doc, 42, pdfBrand(state));
  w.centered(state.currentUser?.name || 'Treinador', { size: 16, bold: true });
  w.skip(2);

  w.heading('Título de treinador');
  w.list([
    career.title ? `${career.title}${career.titleNumber ? ` (n.º ${career.titleNumber})` : ''}` : 'Não indicado',
    career.validUntil ? `Válido até ${dateLabel(career.validUntil)}${status.expired ? ' (caducado)' : ''}` : ''
  ]);

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
    w.heading('Equipas');
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
