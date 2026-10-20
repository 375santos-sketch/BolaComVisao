import React, { useState, useEffect } from 'react';
import { PDFDocumentItem, getAllPDFDocuments, savePDFDocument, formatFileSize } from '../../../lib/pdfLibraryDB';
import { uid } from '../../../lib/utils';
import { PDFViewerModal } from './PDFViewerModal';

interface PDFPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPDF: (doc: PDFDocumentItem) => void;
  onShowToast?: (msg: string) => void;
}

const CATEGORY_TABS: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'Todos os PDFs', icon: '📚' },
  { key: 'tatica', label: 'Tática', icon: '⚡' },
  { key: 'tecnica', label: 'Técnica', icon: '⚽' },
  { key: 'fisico', label: 'Físico', icon: '🏃' },
  { key: 'bolas_paradas', label: 'Bolas Paradas', icon: '🛡️' },
  { key: 'aquecimento', label: 'Aquecimento', icon: '🔥' },
  { key: 'jogo', label: 'Jogo-Treino', icon: '🏆' },
  { key: 'geral', label: 'Geral', icon: '📁' }
];

export const PDFPickerModal: React.FC<PDFPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectPDF,
  onShowToast
}) => {
  const [documents, setDocuments] = useState<PDFDocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<PDFDocumentItem | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      getAllPDFDocuments()
        .then((docs) => {
          if (isMounted) {
            setDocuments(docs);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Error loading PDF documents:', err);
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle direct PDF upload from picker
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      if (onShowToast) onShowToast('Por favor seleciona um ficheiro PDF válido (.pdf).');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileData = reader.result as string;
        const newDoc: PDFDocumentItem = {
          id: uid(),
          title: file.name.replace(/\.pdf$/i, ''),
          category: 'geral',
          tags: ['exercicio', 'treino'],
          description: 'Documento PDF importado para exercícios de treino.',
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          fileData
        };

        const success = await savePDFDocument(newDoc);
        if (success) {
          if (onShowToast) onShowToast(`PDF "${file.name}" guardado na biblioteca! 📄`);
          setDocuments(await getAllPDFDocuments());
          onSelectPDF(newDoc);
        } else {
          if (onShowToast) onShowToast('Erro ao guardar PDF na base de dados local.');
        }
        setUploading(false);
      };
      reader.onerror = () => {
        setUploading(false);
        if (onShowToast) onShowToast('Erro ao ler ficheiro.');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploading(false);
      console.error('Error uploading PDF in picker:', err);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (activeCategory !== 'all' && doc.category !== activeCategory) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchTags = (doc.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchDesc = (doc.description || '').toLowerCase().includes(q);
      const matchFile = doc.fileName.toLowerCase().includes(q);
      if (!matchTitle && !matchTags && !matchDesc && !matchFile) return false;
    }

    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-left">
        <div className="modal card max-w-4xl w-full max-h-[90dvh] overflow-y-auto bg-slate-950 border border-cyan-500/40 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,210,255,0.25)] flex flex-col scrollbar-thin">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(0,210,255,0.2)]">
                📄
              </div>
              <div>
                <h2 className="font-['Chakra_Petch'] font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Selecionar Exercício da Biblioteca de PDFs</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {documents.length} Documentos
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Associa fichas de exercício, esquemas táticos e planos de treino em PDF à sessão
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 text-lg rounded-xl hover:bg-slate-900 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Search, Upload & Category Filter Bar */}
          <div className="space-y-3 mb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Pesquisar por título, tags ou conteúdo do PDF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Upload new PDF button */}
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                <span>{uploading ? '⏳ A processar...' : '➕ Carregar Novo PDF'}</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={uploading}
                  onChange={handleQuickUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeCategory === tab.key
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Documents Grid / List */}
          <div className="flex-1 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="animate-spin inline-block mr-2">🔄</span> A carregar biblioteca de PDFs...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
                <div className="text-3xl">📭</div>
                <div className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase">
                  {documents.length === 0
                    ? 'Nenhum Documento PDF Encontrado'
                    : 'Nenhum PDF corresponde à pesquisa'}
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {documents.length === 0
                    ? 'Importa planos de treino ou exercícios em formato PDF para enriquecer as tuas sessões.'
                    : 'Tenta pesquisar por outro termo ou seleciona outra categoria acima.'}
                </p>
                <label className="inline-flex cursor-pointer px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase font-['Chakra_Petch'] shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:bg-cyan-400 transition-colors">
                  <span>➕ Carregar Primeiro PDF</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleQuickUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📄</span>
                          <span className="font-['Chakra_Petch'] font-bold text-xs text-white uppercase group-hover:text-cyan-300 transition-colors line-clamp-1">
                            {doc.title}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono capitalize shrink-0">
                          {doc.category}
                        </span>
                      </div>

                      {doc.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                          {doc.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {(doc.tags || []).slice(0, 4).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <div className="font-mono">
                        {formatFileSize(doc.fileSize)} • {doc.uploadedAt?.slice(0, 10)}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
                          title="Pré-visualizar PDF"
                        >
                          👁️ Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectPDF(doc)}
                          className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase font-['Chakra_Petch'] shadow-[0_0_10px_rgba(0,210,255,0.2)] transition-all active:scale-95"
                        >
                          Selecionar ➔
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Close Action */}
          <div className="flex justify-end pt-3 border-t border-slate-800 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer preview modal if clicked */}
      {previewDoc && (
        <PDFViewerModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
};
