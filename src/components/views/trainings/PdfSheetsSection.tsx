import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Exercise } from '../../../types';
import { PDFDocumentItem, formatFileSize, getAllPDFDocuments } from '../../../lib/pdfLibraryDB';
import { fileToDataUrl, readPdfSheet, sheetExercise } from '../../../lib/pdfSheet';
import { dateLabel } from '../../../lib/coachCareer';

const PDFViewerModal = lazy(() => import('./PDFViewerModal').then((m) => ({ default: m.PDFViewerModal })));

interface PdfSheetsSectionProps {
  exercises: Exercise[];
  onSave: (exercises: Exercise[]) => void;
  onShowToast: (msg: string) => void;
}

/**
 * Treinos → Biblioteca → 📄 Fichas PDF: the sheets of the old Biblioteca de PDFs that are still in this device, to see
 * them and pass them to the library (picture + explanation, in the cloud), and new PDF sheets imported straight in.
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

  const passed = new Set(exercises.map((e) => e.fromPdfId).filter(Boolean));
  const pending = (docs || []).filter((d) => !passed.has(d.id) && d.fileData);

  /** Reads the sheets one by one and saves them all at the end (the library list stays as it was until then). */
  const pass = async (list: PDFDocumentItem[], link = true) => {
    const made: Exercise[] = [];
    let failed = 0;
    for (const [i, doc] of list.entries()) {
      setBusy(list.length > 1 ? `A passar ${i + 1} de ${list.length}…` : doc.id);
      try {
        const ex = sheetExercise(doc, await readPdfSheet(doc.fileData || ''));
        if (!link) delete ex.fromPdfId;
        made.push(ex);
      } catch {
        failed++;
      }
    }
    setBusy(null);
    if (made.length) onSave([...exercises, ...made]);
    onShowToast(
      made.length
        ? `${made.length === 1 ? '1 ficha passou' : `${made.length} fichas passaram`} para a biblioteca ✓${failed ? ` (${failed} não deu para ler)` : ''}`
        : 'Não foi possível ler a ficha PDF.'
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
            Estas fichas estão só neste aparelho. Passe-as para a biblioteca: ficam com a imagem e a explicação, em
            todos os aparelhos e nos planos de treino.
          </p>
          {pending.length > 0 && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => pass(pending)}
              className="ui-btn ui-btn-primary w-full py-2.5 text-xs"
            >
              {busy && !docs.some((d) => d.id === busy)
                ? busy
                : `⬇️ Passar ${pending.length === 1 ? 'a ficha' : `as ${pending.length} fichas`} para a biblioteca`}
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
                {passed.has(d.id) ? (
                  <span className="shrink-0 text-[11px] font-semibold text-emerald-300">✓ na biblioteca</span>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(busy) || !d.fileData}
                    onClick={() => pass([d])}
                    aria-label={`Passar ${d.title || d.fileName} para a biblioteca`}
                    className="ui-btn ui-btn-primary shrink-0 px-2.5 py-1.5 text-[11px]"
                  >
                    {busy === d.id ? 'A ler…' : '➕ Biblioteca'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-2">{importButton}</div>
      {busy && !docs?.length && <p className="text-xs text-slate-400">A ler o PDF…</p>}

      {viewing && (
        <Suspense fallback={null}>
          <PDFViewerModal document={viewing} onClose={() => setViewing(null)} />
        </Suspense>
      )}
    </section>
  );
};
