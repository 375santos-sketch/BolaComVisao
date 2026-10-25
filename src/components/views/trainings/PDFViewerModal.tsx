import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentItem, formatFileSize } from '../../../lib/pdfLibraryDB';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    // Set worker source to CDN matching pdfjs-dist or unpkg
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('PDF Worker initialization note:', err);
  }
}

interface PDFViewerModalProps {
  document: PDFDocumentItem;
  onClose: () => void;
  onEditMetadata?: (doc: PDFDocumentItem) => void;
  onDownload?: (doc: PDFDocumentItem) => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  document: docItem,
  onClose,
  onEditMetadata,
  onDownload
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [rotation, setRotation] = useState<number>(0);
  const [viewLayout, setViewLayout] = useState<'single' | 'scroll'>('scroll');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // PDF Document reference
  const pdfDocRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const pageCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // Helper to convert base64 to Uint8Array safely
  const base64ToUint8Array = (base64Data: string): Uint8Array => {
    let cleanBase64 = base64Data;
    if (base64Data.includes(',')) {
      cleanBase64 = base64Data.split(',')[1];
    }
    const binaryString = window.atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;

    const loadDoc = async () => {
      if (!docItem.fileData) {
        if (isMounted) {
          setLoadError('Ficheiro PDF não contém dados válidos.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = base64ToUint8Array(docItem.fileData);
        const loadingTask = pdfjsLib.getDocument({
          data,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true
        });

        const pdf = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setLoadError(null);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading PDF in viewer:', err);
        if (isMounted) {
          setIsLoading(false);
          setLoadError(err?.message || 'Não foi possível carregar a estrutura do ficheiro PDF.');
        }
      }
    };

    loadDoc();

    return () => {
      isMounted = false;
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // ignore
        }
        pdfDocRef.current = null;
      }
    };
  }, [docItem.fileData]);

  // Render a specific page to a canvas
  const renderPage = useCallback(
    async (pageNumber: number, canvas: HTMLCanvasElement) => {
      if (!pdfDocRef.current) return;
      try {
        const page = await pdfDocRef.current.getPage(pageNumber);
        const viewport = page.getViewport({ scale, rotation });

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error(`Error rendering page ${pageNumber}:`, err);
      }
    },
    [scale, rotation]
  );

  // Render all active visible canvases when scale, rotation, or doc changes
  useEffect(() => {
    if (!pdfDocRef.current || isLoading) return;

    if (viewLayout === 'single') {
      const canvas = pageCanvasesRef.current.get(currentPage);
      if (canvas) {
        renderPage(currentPage, canvas);
      }
    } else {
      // Scroll mode: render all pages
      for (let p = 1; p <= numPages; p++) {
        const canvas = pageCanvasesRef.current.get(p);
        if (canvas) {
          renderPage(p, canvas);
        }
      }
    }
  }, [pdfDocRef, numPages, currentPage, scale, rotation, viewLayout, isLoading, renderPage]);

  // Zoom Controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setScale(1.0);
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Page Controls
  const handlePrevPage = () => {
    setCurrentPage((prev) => {
      const next = Math.max(prev - 1, 1);
      if (viewLayout === 'scroll') {
        const el = pageCanvasesRef.current.get(next);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return next;
    });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => {
      const next = Math.min(prev + 1, numPages);
      if (viewLayout === 'scroll') {
        const el = pageCanvasesRef.current.get(next);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return next;
    });
  };

  const handleOpenInNewTab = () => {
    if (!docItem.fileData) return;
    try {
      const data = base64ToUint8Array(docItem.fileData);
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to open PDF in new tab:', err);
    }
  };

  return (
    <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in text-left">
      <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-3xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden">
        {/* HEADER BAR */}
        <div className="p-3 sm:p-4 border-b border-cyan-500/20 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-base text-cyan-300 shrink-0">
              📄
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold font-['Chakra_Petch'] text-white uppercase tracking-wider truncate">
                {docItem.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 truncate">
                <span>📁 {docItem.fileName}</span>
                <span>•</span>
                <span>{formatFileSize(docItem.fileSize)}</span>
                {numPages > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-300 font-bold">{numPages} Página(s)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1"
              title="Abrir em Nova Janela / Aba"
            >
              <span>↗️</span>
              <span className="hidden md:inline">Nova Aba</span>
            </button>

            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(docItem)}
                className="ui-btn ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1.5"
                title="Descarregar Ficheiro PDF Original"
              >
                <span>📥</span>
                <span>Descarregar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="ui-btn ui-btn-secondary p-1.5"
              title="Fechar Visualizador"
            >
              ✕
            </button>
          </div>
        </div>

        {/* TOOLBAR CONTROLS (ZOOM, PAGES, ROTATE, LAYOUT) */}
        <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-mono">
          {/* Pagination */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={handlePrevPage}
              className="ui-btn ui-btn-secondary p-1.5"
              title="Página Anterior"
            >
              ◀
            </button>

            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold min-w-[70px] text-center">
              {isLoading ? '...' : `${currentPage} / ${numPages || 1}`}
            </span>

            <button
              type="button"
              disabled={currentPage >= numPages || isLoading}
              onClick={handleNextPage}
              className="ui-btn ui-btn-secondary p-1.5"
              title="Página Seguinte"
            >
              ▶
            </button>
          </div>

          {/* Zoom & View Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="ui-btn ui-btn-secondary p-1.5 px-2"
              title="Diminuir Zoom"
            >
              🔍-
            </button>

            <button
              type="button"
              onClick={handleZoomReset}
              className="ui-btn ui-btn-secondary px-2 py-1 min-w-[50px] text-center"
              title="Repor Zoom (100%)"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              className="ui-btn ui-btn-secondary p-1.5 px-2"
              title="Aumentar Zoom"
            >
              🔍+
            </button>

            <span className="text-slate-700">|</span>

            <button type="button" onClick={handleRotate} className="ui-btn ui-btn-secondary p-1.5" title="Rodar 90º">
              🔄
            </button>

            <button
              type="button"
              onClick={() => setViewLayout(viewLayout === 'scroll' ? 'single' : 'scroll')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                viewLayout === 'scroll'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Alternar entre modo contínuo e página a página"
            >
              {viewLayout === 'scroll' ? '📜 Contínuo' : '📄 Página única'}
            </button>
          </div>
        </div>

        {/* CANVAS CANVAS CONTAINER / VIEWER BODY */}
        <div
          ref={canvasContainerRef}
          className="flex-1 bg-slate-950/95 overflow-auto p-4 sm:p-6 flex flex-col items-center gap-6"
        >
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-['Chakra_Petch'] font-bold text-cyan-300 uppercase">
                A processar e renderizar PDF com máxima qualidade...
              </div>
              <div className="text-xs font-mono text-slate-500">Por favor aguarda um momento</div>
            </div>
          )}

          {loadError && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md">
              <div className="text-5xl">⚠️</div>
              <div className="text-base font-bold font-['Chakra_Petch'] text-red-400 uppercase">
                Erro ao Renderizar Ficheiro
              </div>
              <p className="text-xs font-mono text-slate-400">{loadError}</p>
              <div className="flex gap-2">
                <button type="button" onClick={handleOpenInNewTab} className="ui-btn ui-btn-primary px-4 py-2 text-xs">
                  Abrir noutra janela ↗️
                </button>
                {onDownload && (
                  <button
                    type="button"
                    onClick={() => onDownload(docItem)}
                    className="ui-btn ui-btn-secondary px-4 py-2 text-xs"
                  >
                    Descarregar Ficheiro 📥
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Single Page Mode */}
          {!isLoading && !loadError && viewLayout === 'single' && (
            <div className="flex flex-col items-center justify-center shadow-2xl rounded-xl overflow-hidden border border-slate-700 bg-white">
              <canvas
                ref={(el) => {
                  if (el) {
                    pageCanvasesRef.current.set(currentPage, el);
                    renderPage(currentPage, el);
                  }
                }}
                className="max-w-full block"
              />
            </div>
          )}

          {/* Continuous Scroll Mode */}
          {!isLoading && !loadError && viewLayout === 'scroll' && (
            <div className="flex flex-col items-center gap-6 w-full">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <div
                  key={pageNum}
                  className="flex flex-col items-center relative group shadow-2xl rounded-xl overflow-hidden border border-slate-700 bg-white"
                >
                  <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-mono pointer-events-none">
                    Pág. {pageNum} / {numPages}
                  </span>
                  <canvas
                    ref={(el) => {
                      if (el) {
                        pageCanvasesRef.current.set(pageNum, el);
                        renderPage(pageNum, el);
                      }
                    }}
                    className="max-w-full block"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER BAR */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Categoria:</span>
            <span className="text-cyan-300 font-bold uppercase">{docItem.category}</span>
            {docItem.tags && docItem.tags.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 ml-2">
                {docItem.tags.map((t) => (
                  <span key={t} className="px-1.5 py-0.2 bg-slate-900 border border-slate-800 text-slate-400 rounded">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEditMetadata && (
              <button
                type="button"
                onClick={() => onEditMetadata(docItem)}
                className="ui-btn ui-btn-secondary px-3 py-1.5"
              >
                ✏️ Editar Dados
              </button>
            )}
            <button type="button" onClick={onClose} className="ui-btn ui-btn-primary px-4 py-1.5">
              Concluir / Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
