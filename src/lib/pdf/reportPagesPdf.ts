/**
 * 📑 Turns the report's A4 pages (HTML, .a4 elements) into a PDF file: each page is drawn as a picture at twice the
 * screen resolution and placed on an A4 page. Libraries are loaded only when a report is exported.
 */
export async function reportPagesToPdf(container: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, jspdf] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  const JsPDF = (jspdf as unknown as { jsPDF: new (o: object) => any }).jsPDF;
  if (document.fonts?.ready) await document.fonts.ready;
  const pages = Array.from(container.querySelectorAll<HTMLElement>('.a4'));
  if (!pages.length) throw new Error('Sem páginas para exportar');
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
    if (i > 0) doc.addPage('a4', 'portrait');
    doc.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }
  doc.save(filename);
}

/** "Relatorio_Mensal_Dragoes_2026-10.pdf" */
export const reportFilename = (club: string, month: string) =>
  `Relatorio_Mensal_${(club || 'Equipa')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')}_${month}.pdf`;
