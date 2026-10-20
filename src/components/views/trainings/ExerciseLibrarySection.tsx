import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, ExerciseCategory } from '../../../types';
import { uid } from '../../../lib/utils';
import {
  PDFDocumentItem,
  getAllPDFDocuments,
  savePDFDocument,
  deletePDFDocument,
  clearAllPDFDocuments,
  formatFileSize
} from '../../../lib/pdfLibraryDB';
import { PDFViewerModal } from './PDFViewerModal';

interface ExerciseLibrarySectionProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onCreateTrainingWithExercise?: (exercise: any) => void;
}

export type PDFCategory = ExerciseCategory | 'geral';

const PDF_CATEGORIES: {
  key: PDFCategory;
  label: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}[] = [
  {
    key: 'tatica',
    label: 'Tática & Organização',
    icon: '⚡',
    color: 'blue',
    badgeBg: 'bg-blue-950/40',
    badgeBorder: 'border-blue-500/50',
    badgeText: 'text-blue-300'
  },
  {
    key: 'tecnica',
    label: 'Técnica & Passe',
    icon: '⚽',
    color: 'cyan',
    badgeBg: 'bg-cyan-950/40',
    badgeBorder: 'border-cyan-500/50',
    badgeText: 'text-cyan-300'
  },
  {
    key: 'aquecimento',
    label: 'Aquecimento & Rondos',
    icon: '🔥',
    color: 'orange',
    badgeBg: 'bg-orange-950/40',
    badgeBorder: 'border-orange-500/50',
    badgeText: 'text-orange-300'
  },
  {
    key: 'jogo',
    label: 'Jogos & Reduzidos',
    icon: '🥅',
    color: 'purple',
    badgeBg: 'bg-purple-950/40',
    badgeBorder: 'border-purple-500/50',
    badgeText: 'text-purple-300'
  },
  {
    key: 'bolas_paradas',
    label: 'Bolas Paradas',
    icon: '🛡️',
    color: 'amber',
    badgeBg: 'bg-amber-950/40',
    badgeBorder: 'border-amber-500/50',
    badgeText: 'text-amber-300'
  },
  {
    key: 'fisico',
    label: 'Físico & Condição',
    icon: '🏃',
    color: 'emerald',
    badgeBg: 'bg-emerald-950/40',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-300'
  },
  {
    key: 'geral',
    label: 'Dossiês & Manuais',
    icon: '📁',
    color: 'slate',
    badgeBg: 'bg-slate-950/40',
    badgeBorder: 'border-slate-500/50',
    badgeText: 'text-slate-300'
  }
];

export const ExerciseLibrarySection: React.FC<ExerciseLibrarySectionProps> = ({ onShowToast, onShowConfirm }) => {
  const [documents, setDocuments] = useState<PDFDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PDFCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Preview & Reader Modal State
  const [selectedDoc, setSelectedDoc] = useState<PDFDocumentItem | null>(null);

  // Edit / Categorize Modal
  const [editingDoc, setEditingDoc] = useState<PDFDocumentItem | null>(null);
  const [editTagInput, setEditTagInput] = useState('');

  // Drag & drop highlight state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents from IndexedDB
  const reloadDocs = async () => {
    try {
      setIsLoading(true);
      const docs = await getAllPDFDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading docs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getAllPDFDocuments()
      .then((docs) => {
        if (isMounted) {
          setDocuments(docs);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading docs on mount:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Quick auto-categorize helper based on filename
  const autoDetectCategory = (filename: string): PDFCategory => {
    const fn = filename.toLowerCase();
    if (
      fn.includes('tat') ||
      fn.includes('press') ||
      fn.includes('bloco') ||
      fn.includes('estrategia') ||
      fn.includes('linha')
    ) {
      return 'tatica';
    }
    if (
      fn.includes('tecn') ||
      fn.includes('passe') ||
      fn.includes('controlo') ||
      fn.includes('condu') ||
      fn.includes('recep')
    ) {
      return 'tecnica';
    }
    if (fn.includes('aquec') || fn.includes('rondo') || fn.includes('warm') || fn.includes('ativacao')) {
      return 'aquecimento';
    }
    if (
      fn.includes('jogo') ||
      fn.includes('reduzid') ||
      fn.includes('posse') ||
      fn.includes('mini') ||
      fn.includes('gkr')
    ) {
      return 'jogo';
    }
    if (
      fn.includes('canto') ||
      fn.includes('livre') ||
      fn.includes('parada') ||
      fn.includes('penalti') ||
      fn.includes('barreira')
    ) {
      return 'bolas_paradas';
    }
    if (
      fn.includes('fisic') ||
      fn.includes('velocid') ||
      fn.includes('forca') ||
      fn.includes('resisten') ||
      fn.includes('agil')
    ) {
      return 'fisico';
    }
    return 'geral';
  };

  // Convert File to Base64 Data URL and extract title
  const processFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (validFiles.length === 0) {
      onShowToast('⚠️ Por favor seleciona ficheiros no formato PDF (.pdf).');
      return;
    }

    setIsProcessingFiles(true);
    let successCount = 0;

    for (const file of validFiles) {
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Clean name without .pdf extension
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        const detectedCategory = autoDetectCategory(file.name);

        const newDoc: PDFDocumentItem = {
          id: uid(),
          title: cleanTitle,
          fileName: file.name,
          fileSize: file.size,
          category: detectedCategory,
          tags: [detectedCategory],
          uploadedAt: new Date().toISOString(),
          fileData: base64Data
        };

        await savePDFDocument(newDoc);
        successCount++;
      } catch (err) {
        console.error('Error reading PDF file:', err);
      }
    }

    setIsProcessingFiles(false);
    await reloadDocs();

    if (successCount === 1) {
      onShowToast(`PDF importado e guardado na base de dados com sucesso! 📄`);
    } else if (successCount > 1) {
      onShowToast(`🎉 ${successCount} PDFs importados e guardados na base de dados!`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = (id: string, title: string) => {
    onShowConfirm(`Tens a certeza que pretendes remover o PDF "${title}" da base de dados?`, async () => {
      await deletePDFDocument(id);
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      await reloadDocs();
      onShowToast(`PDF "${title}" removido da biblioteca. 🗑️`);
    });
  };

  const handleClearAll = () => {
    if (documents.length === 0) return;
    onShowConfirm('Tens a certeza que pretendes apagar todos os PDFs guardados na biblioteca?', async () => {
      await clearAllPDFDocuments();
      setSelectedDoc(null);
      await reloadDocs();
      onShowToast('Base de dados de PDFs limpa com sucesso. 🗑️');
    });
  };

  const handleDownloadPDF = (doc: PDFDocumentItem) => {
    if (!doc.fileData) {
      onShowToast('❌ Ficheiro indisponível para download.');
      return;
    }
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.fileName || `${doc.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(`Download iniciado: ${doc.fileName} 📥`);
  };

  const handleSaveDocMetadata = async () => {
    if (!editingDoc || !editingDoc.title.trim()) {
      onShowToast('❌ O título do documento é obrigatório.');
      return;
    }
    await savePDFDocument(editingDoc);
    setEditingDoc(null);
    await reloadDocs();
    if (selectedDoc?.id === editingDoc.id) {
      setSelectedDoc(editingDoc);
    }
    onShowToast(`Informações de "${editingDoc.title}" atualizadas! ✏️`);
  };

  const handleAddEditTag = () => {
    if (!editTagInput.trim() || !editingDoc) return;
    const tag = editTagInput.trim();
    if (!editingDoc.tags.includes(tag)) {
      setEditingDoc({ ...editingDoc, tags: [...editingDoc.tags, tag] });
    }
    setEditTagInput('');
  };

  const handleRemoveEditTag = (tag: string) => {
    if (!editingDoc) return;
    setEditingDoc({ ...editingDoc, tags: editingDoc.tags.filter((t) => t !== tag) });
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchCat = selectedCategory === 'all' || doc.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        (doc.description || '').toLowerCase().includes(q) ||
        (doc.tags || []).some((t) => t.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  // Statistics
  const totalCount = documents.length;
  const totalBytes = documents.reduce((acc, d) => acc + (d.fileSize || 0), 0);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PDF_CATEGORIES.forEach((c) => {
      counts[c.key] = documents.filter((d) => d.category === c.key).length;
    });
    return counts;
  }, [documents]);

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & DATABASE OVERVIEW */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden text-left">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-lg text-cyan-300">
                📚
              </div>
              <h2 className="text-base sm:text-lg font-bold font-['Chakra_Petch'] text-white uppercase tracking-wider">
                Biblioteca & Base de Dados de PDFs
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono max-w-xl">
              Importa e armazena os teus documentos, exercícios, relatórios técnicos e manuais em formato PDF. Pesquisa
              e consulta a qualquer momento em visualizador integrado ou descarrega em qualquer dispositivo.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={isProcessingFiles}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <span>{isProcessingFiles ? '⏳' : '📥'}</span>
              <span>{isProcessingFiles ? 'A Importar...' : 'Importar PDF(s)'}</span>
            </button>

            {documents.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 text-xs font-mono transition-all flex items-center gap-1.5"
                title="Limpar todos os PDFs da base de dados"
              >
                <span>🗑️</span>
                <span className="hidden sm:inline">Limpar Base de Dados</span>
              </button>
            )}
          </div>
        </div>

        {/* Database Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Total PDFs Guardados</span>
            <span className="text-lg font-bold font-['Chakra_Petch'] text-cyan-300">{totalCount}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Armazenamento Usado</span>
            <span className="text-lg font-bold font-['Chakra_Petch'] text-emerald-300">
              {formatFileSize(totalBytes)}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Táticos & Jogos</span>
            <span className="text-lg font-bold font-['Chakra_Petch'] text-blue-300">
              {(categoryCounts['tatica'] || 0) + (categoryCounts['jogo'] || 0)}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Técnica & Outros</span>
            <span className="text-lg font-bold font-['Chakra_Petch'] text-amber-300">
              {(categoryCounts['tecnica'] || 0) + (categoryCounts['geral'] || 0) + (categoryCounts['aquecimento'] || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. DRAG AND DROP ZONE */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-5 sm:p-7 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/40 scale-[1.01] shadow-[0_0_25px_rgba(0,210,255,0.3)]'
            : 'border-slate-800 hover:border-cyan-500/50 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl text-cyan-400 animate-pulse">
          📄
        </div>
        <div>
          <span className="text-xs sm:text-sm font-['Chakra_Petch'] font-bold text-white uppercase tracking-wider block">
            {isDragging
              ? 'Larga os ficheiros PDF aqui para guardar!'
              : 'Arrasta e larga ficheiros PDF aqui ou clica para importar'}
          </span>
          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
            Suporta múltiplos ficheiros simultâneos (.pdf). Os documentos ficam gravados de forma segura na tua base de
            dados.
          </span>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3 text-left">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Pesquisar PDF por título, nome do ficheiro, descrição ou tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:border-cyan-500 focus:outline-none"
            />
            <span className="absolute left-3 top-3 text-xs text-slate-500">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Vista em Grelha"
              >
                🔲
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'list' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Vista em Lista"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <span>🌟</span>
            <span>Todos ({documents.length})</span>
          </button>

          {PDF_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key] || 0;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? `${cat.badgeBg} ${cat.badgeBorder} ${cat.badgeText} border shadow-[0_0_10px_rgba(0,210,255,0.2)]`
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. DOCUMENTS LIST / GRID */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-xs">A carregar base de dados de PDFs... ⏳</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-8 space-y-3">
          <div className="text-4xl">📚</div>
          <h3 className="text-base font-bold font-['Chakra_Petch'] text-cyan-300 uppercase">
            Nenhum documento PDF encontrado
          </h3>
          <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
            {documents.length === 0
              ? 'A tua biblioteca de PDFs está vazia. Clica no botão acima ou arrasta ficheiros PDF para guardares os teus exercícios e dossiês.'
              : 'Não existem documentos que correspondam aos filtros ou termo de pesquisa pesquisado.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {searchQuery || selectedCategory !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold"
              >
                Limpar Filtros
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase"
            >
              📥 Importar PDF
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-left">
          {filteredDocuments.map((doc) => {
            const catConfig = PDF_CATEGORIES.find((c) => c.key === doc.category) || PDF_CATEGORIES[0];
            return (
              <div
                key={doc.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 group relative shadow-md hover:shadow-[0_4px_20px_rgba(0,210,255,0.1)]"
              >
                <div className="space-y-2.5">
                  {/* Category badge & size header */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 ${catConfig.badgeBg} ${catConfig.badgeBorder} ${catConfig.badgeText}`}
                    >
                      <span>{catConfig.icon}</span>
                      <span>{catConfig.label}</span>
                    </span>

                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-lg">
                      {formatFileSize(doc.fileSize)}
                    </span>
                  </div>

                  {/* Title & Preview Trigger */}
                  <div
                    onClick={() => setSelectedDoc(doc)}
                    className="cursor-pointer group-hover:text-cyan-300 transition-colors"
                  >
                    <h3 className="font-['Chakra_Petch'] font-bold text-sm text-white line-clamp-2 leading-tight">
                      {doc.title}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 block truncate mt-0.5">
                      📁 {doc.fileName}
                    </span>
                  </div>

                  {/* Description if present */}
                  {doc.description && (
                    <p className="text-xs font-mono text-slate-300 line-clamp-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                      {doc.description}
                    </p>
                  )}

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {doc.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono text-cyan-400/80 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded-md"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(doc.uploadedAt).toLocaleDateString('pt-PT')}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                      title="Visualizar PDF"
                    >
                      <span>👁️</span>
                      <span>Ver</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPDF(doc)}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                      title="Descarregar PDF"
                    >
                      📥
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingDoc(doc)}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                      title="Editar Metadados / Categoria"
                    >
                      ✏️
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 text-xs transition-colors"
                      title="Eliminar da Biblioteca"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 overflow-hidden text-left">
          {filteredDocuments.map((doc) => {
            const catConfig = PDF_CATEGORIES.find((c) => c.key === doc.category) || PDF_CATEGORIES[0];
            return (
              <div
                key={doc.id}
                className="p-3.5 hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div
                  onClick={() => setSelectedDoc(doc)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-lg shrink-0">
                    {catConfig.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold font-['Chakra_Petch'] text-white hover:text-cyan-300 truncate">
                        {doc.title}
                      </h4>
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.2 rounded-md border ${catConfig.badgeBg} ${catConfig.badgeBorder} ${catConfig.badgeText}`}
                      >
                        {catConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 mt-0.5">
                      <span>📁 {doc.fileName}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString('pt-PT')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1"
                  >
                    <span>👁️</span>
                    <span>Abrir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(doc)}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs"
                    title="Descarregar"
                  >
                    📥
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingDoc(doc)}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs"
                    title="Editar"
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 text-xs"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: PDF VIEWER / READER (CANVAS-BASED RENDERER) */}
      {selectedDoc && (
        <PDFViewerModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDownload={handleDownloadPDF}
          onEditMetadata={(doc) => {
            setEditingDoc(doc);
            setSelectedDoc(null);
          }}
        />
      )}

      {/* 6. MODAL: EDIT METADATA & CATEGORIZATION */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fade-in text-left">
          <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,210,255,0.25)] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-cyan-500/20 bg-slate-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">✏️</span>
                <div>
                  <h3 className="text-sm font-bold font-['Chakra_Petch'] text-white uppercase">
                    Editar Informações do Documento
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Organiza o título, categoria e etiquetas para pesquisa rápida.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-cyan-300 font-bold block mb-1">
                  Título do Documento *
                </label>
                <input
                  type="text"
                  value={editingDoc.title}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Categoria da Base de Dados
                </label>
                <select
                  value={editingDoc.category}
                  onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value as PDFCategory })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                >
                  {PDF_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Notas / Descrição do Conteúdo
                </label>
                <textarea
                  rows={3}
                  placeholder="Apontamentos sobre os exercícios ou dinâmicas contidas neste PDF..."
                  value={editingDoc.description || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-400 block">🏷️ Tags para Pesquisa</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar tag (Ex: Sub19, Rondo, Finalização)..."
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEditTag();
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddEditTag}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs font-mono hover:text-white"
                  >
                    + Tag
                  </button>
                </div>

                {editingDoc.tags && editingDoc.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {editingDoc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-slate-950 border border-slate-800 text-cyan-300 text-xs px-2 py-0.5 rounded-md flex items-center gap-1"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveEditTag(tag)}
                          className="text-slate-500 hover:text-red-400 ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDocMetadata}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase"
              >
                Guardar Alterações 💾
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
