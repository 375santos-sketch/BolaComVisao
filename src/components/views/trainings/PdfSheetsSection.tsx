import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Exercise } from '../../../types';
import { PDFDocumentItem, formatFileSize, getAllPDFDocuments } from '../../../lib/pdfLibraryDB';
import { fileToDataUrl, pageExercises, pdfPageImages, replaceSheetExercises, sheetDone } from '../../../lib/pdfSheet';
import { readPrintData } from '../../../lib/readPrint';
import { cropImageSource } from '../../../lib/imageCompress';
import { dateLabel } from '../../../lib/coachCareer';

const PDFViewerModal = lazy(() => import('./PDFViewerModal').then((m) => ({ default: m.PDFViewerModal })));

interface PdfSheetsSectionProps {
  exercises: Exercise[];
  onSave: (exercises: Exercise[]) => void;
  onShowToast: (msg: string) => void;
}

/**
 * Treinos → Biblioteca → 📄 Fichas PDF: the sheets of the old Biblioteca de PDFs that are still in this device, to see
 * them and pass them to the library (each exercise of each page with only its drawing and its explanation, in the
 * cloud), and new PDF sheets imported straight in.
 */
export const PdfSheetsSection: React.FC<PdfSheetsSectionProps> = ({ exercises, onSave, onShowToast }) => {
  const [docs, setDocs] = useState<PDFDocumentItem[] | null>(null);
  const [viewing, setViewing] = useState<PDFDocumentItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAllPDFDocuments().then((d) => alive && setDocs(d));
    return () => {
      alive = false;
    };
  }, []);

  const done = (id: string) => sheetDone(exercises, id);
  const pending = (docs || []).filter((d) => !done(d.id) && d.fileData);
  const countOf = (id: string) => exercises.filter((e) => e.fromPdfId === id).length;

  /**
   * Reads the sheets page by page: the AI finds each exercise, its drawing is cut from the page and it goes to the
   * library with its explanation. What a sheet had given before (whole pages) is replaced. Saved once at the end.
   */
  const pass = async (list: PDFDocumentItem[], link = true) => {
    let library = exercises;
    let added = 0;
    let failed = 0;
    let error = '';
    for (const [i, doc] of list.entries()) {
      const sheet = list.length > 1 ? `Ficha ${i + 1} de ${list.length}: ` : '';
      try {
        setBusy(`${sheet}a abrir o PDF…`);
        const pages = await pdfPageImages(doc.fileData || '');
        const made: Exercise[] = [];
        for (const [p, image] of pages.entries()) {
          setBusy(`${sheet}a ler a página ${p + 1} de ${pages.length}…`);
          const answer = await readPrintData(image, 'exercicios');
          made.push(
            ...(await pageExercises(answer, p + 1, link ? doc.id : undefined, (box) => cropImageSource(image, box)))
          );
        }
        if (!made.length) throw new Error('Não encontrei exercícios nesta ficha.');
        library = replaceSheetExercises(library, link ? doc.id : undefined, made);
        added += made.length;
      } catch (err) {
        failed++;
        error = (err as Error).message || 'Não foi possível ler a ficha PDF.';
      }
    }
    setBusy(null);
    if (added) onSave(library);
    onShowToast(
      added
        ? `${added} ${added === 1 ? 'exercício passou' : 'exercícios passaram'} para a biblioteca ✓${failed ? ` (${failed} ${failed === 1 ? 'ficha não deu' : 'fichas não deram'} para ler)` : ''}`
        : error || 'Não foi possível ler a ficha PDF.'
    );
  };

  const importNew = async (files: FileList | null) => {
    const pdfs = Array.from(files || []).filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    if (!pdfs.length) return;
    const list: PDFDocumentItem[] = [];
    for (const f of pdfs) {
      list.push({
        id: `novo-${f.name}-${f.size}`,
        title: f.name,
        fileName: f.name,
        fileSize: f.size,
        category: 'geral',
        tags: [],
        uploadedAt: new Date().toISOString(),
        fileData: await fileToDataUrl(f)
      });
    }
    await pass(list, false);
  };

  const importButton = (
    <label className="ui-btn ui-btn-secondary flex-1 cursor-pointer py-2 text-xs">
      📄 Importar ficha PDF
      <input
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        aria-label="Importar ficha PDF"
        disabled={Boolean(busy)}
        onChange={(e) => {
          importNew(e.target.files);
          e.target.value = '';
        }}
      />
    </label>
  );

  return (
    <section aria-label="Fichas PDF" className="ui-card mb-3 space-y-2 rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">📄 Fichas PDF</h3>
        {docs && docs.length > 0 && (
          <span className="text-[11px] text-slate-400">
            {docs.length} {docs.length === 1 ? 'guardada' : 'guardadas'} neste aparelho
          </span>
        )}
      </div>

      {docs === null ? (
        <p className="text-xs text-slate-400">A procurar as fichas guardadas neste aparelho…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-slate-400">
          Não há fichas antigas neste aparelho. As fichas da antiga biblioteca de PDFs ficavam só no telemóvel ou
          computador onde foram importadas: abra a app nesse aparelho e elas aparecem aqui.
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-400">
            Estas fichas estão só neste aparelho. Ao passá-las para a biblioteca, a app separa cada exercício: fica só o
            desenho dele e a explicação, em todos os aparelhos e nos planos de treino.
          </p>
          {pending.length > 0 && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => pass(pending)}
              className="ui-btn ui-btn-primary w-full py-2.5 text-xs"
            >
              ⬇️ Passar {pending.length === 1 ? 'a ficha' : `as ${pending.length} fichas`} para a biblioteca
            </button>
          )}
          <ul aria-label="Fichas guardadas neste aparelho" className="divide-y divide-slate-800">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm text-white">{d.title || d.fileName}</b>
                  <span className="text-[11px] text-slate-400">
                    {[
                      dateLabel(d.uploadedAt),
                      d.fileSize ? formatFileSize(d.fileSize) : '',
                      d.pageCount ? `${d.pageCount} pág.` : ''
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setViewing(d)}
                  aria-label={`Ver ${d.title || d.fileName}`}
                  className="ui-btn ui-btn-secondary shrink-0 px-2.5 py-1.5 text-[11px]"
                >
                  👁️ Ver
                </button>
                {done(d.id) ? (
                  <span className="shrink-0 text-[11px] font-semibold text-emerald-300">
                    ✓ {countOf(d.id)} {countOf(d.id) === 1 ? 'exercício' : 'exercícios'}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(busy) || !d.fileData}
                    onClick={() => pass([d])}
                    aria-label={`Passar ${d.title || d.fileName} para a biblioteca`}
                    className="ui-btn ui-btn-primary shrink-0 px-2.5 py-1.5 text-[11px]"
                  >
                    ➕ Biblioteca
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-2">{importButton}</div>
      {busy && (
        <p role="status" className="text-xs font-semibold text-cyan-300">
          ⏳ {busy}
        </p>
      )}

      {viewing && (
        <Suspense fallback={null}>
          <PDFViewerModal document={viewing} onClose={() => setViewing(null)} />
        </Suspense>
      )}
    </section>
  );
};
