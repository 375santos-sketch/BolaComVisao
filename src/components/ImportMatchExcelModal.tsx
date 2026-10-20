import React, { useState, useRef } from 'react';
import { AppState } from '../types';
import {
  readMatchExcelFile,
  parseMatchRows,
  switchMatchExcelSheet,
  downloadMatchExcelTemplate,
  buildMatchFromParsedRow,
  MatchExcelWorkbookData,
  MatchColumnMapping,
  ParsedMatchRow,
  MatchDuplicateAction
} from '../lib/matchExcelImporter';
import { defaultSeason } from '../lib/utils';
import { isMatchSheetWorkbook, readMatchSheetFile, MatchSheetImportResult } from '../lib/matchSheetImporter';

interface ImportMatchExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
}

export const ImportMatchExcelModal: React.FC<ImportMatchExcelModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateState,
  onShowToast
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'ficha'>('upload');
  const [sheetImport, setSheetImport] = useState<MatchSheetImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File & Raw ArrayBuffer
  const [rawFileBuffer, setRawFileBuffer] = useState<ArrayBuffer | null>(null);
  const [workbookData, setWorkbookData] = useState<MatchExcelWorkbookData | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Column Mapping
  const [columnMapping, setColumnMapping] = useState<MatchColumnMapping>({
    opponent: '',
    date: '',
    time: '',
    type: '',
    location: '',
    phase: '',
    tournamentName: '',
    season: '',
    goalsScored: '',
    goalsConceded: '',
    cornersFor: '',
    cornersAgainst: '',
    foulsCommitted: '',
    foulsSuffered: '',
    notes: ''
  });

  // Parsed results with duplicate detection
  const [parsedRows, setParsedRows] = useState<ParsedMatchRow[]>([]);

  // Preview Filters & Search
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'duplicates' | 'errors'>('all');
  const [searchInPreview, setSearchInPreview] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  // Handle File Selection and Parsing
  const handleFile = async (file: File) => {
    setLoading(true);
    setProcessingProgress(20);
    setProcessingStage('A ler ficheiro Excel de Jogos...');
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();

      // A "Ficha de Jogo" exported by the app holds one complete match: rebuild it directly.
      const XLSX = await import('xlsx');
      if (isMatchSheetWorkbook(XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames)) {
        const result = await readMatchSheetFile(file, {
          roster: state.roster || [],
          fallbackSeason: state.season || defaultSeason(),
          schedule: state.schedule || []
        });
        setSheetImport(result);
        setStep('ficha');
        return;
      }

      setRawFileBuffer(buffer);

      setProcessingProgress(50);
      setProcessingStage('A analisar folhas de cálculo e colunas...');

      const data = await readMatchExcelFile(file);
      setWorkbookData(data);
      setSelectedSheet(data.activeSheetName);
      setColumnMapping(data.detectedMapping);

      setProcessingProgress(80);
      setProcessingStage('A validar jogos e a verificar duplicados com o histórico...');

      // Parse rows with comparison against existing matches
      const parsed = parseMatchRows(
        data.rawRows,
        data.detectedMapping,
        state.matches || [],
        state.season || defaultSeason()
      );
      setParsedRows(parsed);

      setProcessingProgress(100);
      setProcessingStage('Processamento concluído com sucesso!');

      const hasCriticalMappings = data.detectedMapping.opponent && data.detectedMapping.date;
      if (hasCriticalMappings) {
        setStep('preview');
      } else {
        setStep('mapping');
      }
    } catch (err: any) {
      console.error('Error importing Excel file:', err);
      setErrorMessage(err?.message || 'Erro ao processar ficheiro Excel. Verifica a integridade do ficheiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!rawFileBuffer) return;
    setLoading(true);
    try {
      const data = await switchMatchExcelSheet(rawFileBuffer, sheetName);
      setWorkbookData(data);
      setSelectedSheet(sheetName);
      setColumnMapping(data.detectedMapping);

      const parsed = parseMatchRows(
        data.rawRows,
        data.detectedMapping,
        state.matches || [],
        state.season || defaultSeason()
      );
      setParsedRows(parsed);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao mudar de folha.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMapping = () => {
    if (!workbookData) return;
    if (!columnMapping.opponent) {
      setErrorMessage('A coluna do Adversário é obrigatória.');
      return;
    }
    if (!columnMapping.date) {
      setErrorMessage('A coluna da Data do Jogo é obrigatória.');
      return;
    }

    setErrorMessage(null);
    const parsed = parseMatchRows(
      workbookData.rawRows,
      columnMapping,
      state.matches || [],
      state.season || defaultSeason()
    );
    setParsedRows(parsed);
    setStep('preview');
  };

  // Toggle selection
  const handleToggleSelectRow = (id: string) => {
    setParsedRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedRows((prev) => prev.map((r) => (r.isValid ? { ...r, selected: select } : r)));
  };

  const handleSetDuplicateAction = (id: string, action: MatchDuplicateAction) => {
    setParsedRows((prev) => prev.map((r) => (r.id === id ? { ...r, duplicateAction: action } : r)));
  };

  const handleSetAllDuplicateActions = (action: MatchDuplicateAction) => {
    setParsedRows((prev) => prev.map((r) => (r.isDuplicate ? { ...r, duplicateAction: action } : r)));
  };

  // Imported matches belong to the active team
  const teamTag = { teamId: state.activeTeamId, teamName: state.myClubName };

  // Final Import Confirmation
  const handleConfirmImport = () => {
    const toImport = parsedRows.filter((r) => r.selected && r.isValid);
    if (toImport.length === 0) {
      onShowToast('Nenhum jogo selecionado para importação.');
      return;
    }

    const existingMatches = [...(state.matches || [])];
    let addedCount = 0;
    let replacedCount = 0;
    let skippedCount = 0;

    toImport.forEach((row) => {
      if (row.isDuplicate && row.duplicateWithMatchId) {
        if (row.duplicateAction === 'skip') {
          skippedCount++;
          return;
        }
        if (row.duplicateAction === 'replace') {
          const matchIndex = existingMatches.findIndex((m) => m.id === row.duplicateWithMatchId);
          if (matchIndex >= 0) {
            const updatedMatch = { ...buildMatchFromParsedRow(row, state.roster || []), ...teamTag };
            updatedMatch.id = row.duplicateWithMatchId;
            existingMatches[matchIndex] = updatedMatch;
            replacedCount++;
            return;
          }
        }
      }

      // Create new
      const newMatch = { ...buildMatchFromParsedRow(row, state.roster || []), ...teamTag };
      existingMatches.push(newMatch);
      addedCount++;
    });

    // Sort matches by date descending
    existingMatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    onUpdateState({ matches: existingMatches });
    onShowToast(
      `🎉 ${addedCount} novos jogos importados, ${replacedCount} atualizados` +
        (skippedCount > 0 ? `, ${skippedCount} ignorados!` : '!')
    );
    onClose();
  };

  const formatDate = (iso: string) => iso.split('-').reverse().join('/');
  const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const sheetDuplicate = sheetImport
    ? (state.matches || []).find(
        (m) => m.date === sheetImport.match.date && sameText(m.opponent, sheetImport.match.opponent)
      )
    : undefined;

  const handleConfirmSheetImport = (replaceExisting: boolean) => {
    if (!sheetImport) return;
    const existing = state.matches || [];
    const matches =
      replaceExisting && sheetDuplicate
        ? existing.map((m) =>
            m.id === sheetDuplicate.id ? { ...sheetImport.match, ...teamTag, id: sheetDuplicate.id } : m
          )
        : [...existing, { ...sheetImport.match, ...teamTag }];
    matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdateState({ matches });
    onShowToast(`🎉 Jogo vs ${sheetImport.match.opponent} recuperado da Ficha de Jogo!`);
    setSheetImport(null);
    setStep('upload');
    onClose();
  };

  // Filtered rows for preview table
  const filteredRows = parsedRows.filter((row) => {
    if (previewFilter === 'valid' && !row.isValid) return false;
    if (previewFilter === 'duplicates' && !row.isDuplicate) return false;
    if (previewFilter === 'errors' && row.isValid) return false;

    if (searchInPreview) {
      const q = searchInPreview.toLowerCase();
      const matchOpponent = row.opponent.toLowerCase().includes(q);
      const matchDate = (row.date || '').includes(q);
      const matchTournament = (row.tournamentName || '').toLowerCase().includes(q);
      if (!matchOpponent && !matchDate && !matchTournament) return false;
    }

    return true;
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;
  const selectedCount = parsedRows.filter((r) => r.selected && r.isValid).length;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-left">
      <div className="modal card max-w-5xl w-full max-h-[92dvh] overflow-y-auto bg-slate-950 border border-cyan-500/40 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,210,255,0.25)] flex flex-col scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(0,210,255,0.2)]">
              ⚽
            </div>
            <div>
              <h2 className="font-['Chakra_Petch'] font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                <span>Importação de Jogos via Excel</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  .XLSX / .XLS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Importa resultados em massa ou recupera um jogo a partir da Ficha de Jogo exportada
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

        {/* Progress Bar & Steps Tabs */}
        <div className="flex items-center justify-between gap-2 mb-4 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setStep('upload')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
              step === 'upload'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>1.</span>
            <span>Carregar Ficheiro</span>
          </button>
          <button
            onClick={() => workbookData && setStep('mapping')}
            disabled={!workbookData}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
              step === 'mapping'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                : !workbookData
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>2.</span>
            <span>Mapear Colunas</span>
          </button>
          <button
            onClick={() => parsedRows.length > 0 && setStep('preview')}
            disabled={parsedRows.length === 0}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
              step === 'preview'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                : parsedRows.length === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>3.</span>
            <span>Pré-visualização & Importação</span>
            {parsedRows.length > 0 && (
              <span className="text-[10px] bg-slate-950/40 px-1.5 py-0.2 rounded-full">{parsedRows.length}</span>
            )}
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* FICHA DE JOGO: single match recovered from an exported match sheet */}
        {step === 'ficha' && sheetImport && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-cyan-500/30 space-y-2">
              <div className="text-[11px] font-mono text-cyan-300 uppercase">Ficha de Jogo detetada</div>
              <div className="text-lg font-bold text-white">
                vs {sheetImport.match.opponent}{' '}
                <span className="text-cyan-300 font-mono">
                  {sheetImport.match.finalScore?.scored} - {sheetImport.match.finalScore?.conceded}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {formatDate(sheetImport.match.date)} · {sheetImport.match.location === 'fora' ? 'Fora' : 'Casa'}
                {sheetImport.match.phase ? ` · ${sheetImport.match.phase}` : ''} · Época {sheetImport.match.season}
              </div>
              <div className="text-xs text-slate-300 font-mono">
                {sheetImport.match.goals.length} golos · {(sheetImport.match.cards || []).length} cartões ·{' '}
                {sheetImport.match.subs.length} substituições · {sheetImport.match.lineup.length} titulares
              </div>
            </div>

            {sheetImport.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                <div className="font-bold">Alguns atletas não foram associados ao plantel:</div>
                {sheetImport.warnings.map((w) => (
                  <div key={w}>• {w}</div>
                ))}
              </div>
            )}

            {sheetDuplicate && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200">
                Já existe um jogo com {sheetDuplicate.opponent} em {formatDate(sheetDuplicate.date)}. Podes substituí-lo
                pelos dados da ficha ou importar como um jogo novo.
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSheetImport(null);
                  setStep('upload');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-700"
              >
                Cancelar
              </button>
              {sheetDuplicate && (
                <button
                  type="button"
                  onClick={() => handleConfirmSheetImport(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400"
                >
                  Substituir jogo existente
                </button>
              )}
              <button
                type="button"
                onClick={() => handleConfirmSheetImport(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400"
              >
                {sheetDuplicate ? 'Importar como novo' : 'Importar jogo'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4 flex-1 flex flex-col justify-center py-4">
            {loading && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span>{processingStage}</span>
                  <span>{processingProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-cyan-400 transition-all" style={{ width: `${processingProgress}%` }} />
                </div>
              </div>
            )}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_30px_rgba(0,210,255,0.3)]'
                  : 'border-slate-700 bg-slate-900/40 hover:border-cyan-500/50 hover:bg-slate-900/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-3xl mb-1 shadow-[0_0_20px_rgba(0,210,255,0.2)]">
                📥
              </div>
              <div className="font-['Chakra_Petch'] font-bold text-base text-white uppercase">
                Arrasta o teu ficheiro Excel de Jogos para aqui
              </div>
              <div className="text-xs text-slate-400 max-w-md">
                Suporta formatos <span className="text-cyan-300 font-mono">.xlsx</span>,{' '}
                <span className="text-cyan-300 font-mono">.xls</span> ou{' '}
                <span className="text-cyan-300 font-mono">.csv</span> com deteção automática de colunas.
              </div>
              <button
                type="button"
                className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:bg-cyan-400 transition-colors"
              >
                Procurar no Computador
              </button>
            </div>

            {/* Template Download Section */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <div className="text-xs font-bold text-white uppercase font-['Chakra_Petch']">
                    Ainda não tens um ficheiro estruturado?
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Descarrega o modelo Excel oficial pronto a preencher com adversários, golos e jornadas.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadMatchExcelTemplate}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-['Chakra_Petch'] uppercase transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <span>💾 Descarregar Modelo Excel</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: MAPPING */}
        {step === 'mapping' && workbookData && (
          <div className="space-y-4 flex-1">
            {/* Sheet Selector */}
            {workbookData.sheetNames.length > 1 && (
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300 font-bold">Folha do Excel Selecionada:</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="bg-slate-950 border border-cyan-500/30 text-cyan-300 text-xs rounded-xl px-3 py-1.5"
                >
                  {workbookData.sheetNames.map((sn) => (
                    <option key={sn} value={sn}>
                      {sn}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-xs text-slate-300">
              Associa as colunas do teu Excel aos campos correspondentes do sistema de Jogos:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Opponent */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <label className="block text-[11px] font-bold text-cyan-300 uppercase mb-1">Adversário *</label>
                <select
                  value={columnMapping.opponent}
                  onChange={(e) => setColumnMapping({ ...columnMapping, opponent: e.target.value })}
                  className="w-full bg-slate-950 border border-cyan-500/30 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">-- Não Mapeado --</option>
                  {workbookData.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <label className="block text-[11px] font-bold text-cyan-300 uppercase mb-1">Data do Jogo *</label>
                <select
                  value={columnMapping.date}
                  onChange={(e) => setColumnMapping({ ...columnMapping, date: e.target.value })}
                  className="w-full bg-slate-950 border border-cyan-500/30 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">-- Não Mapeado --</option>
                  {workbookData.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Hora de Início</label>
                <select
                  value={columnMapping.time}
                  onChange={(e) => setColumnMapping({ ...columnMapping, time: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">-- Não Mapeado --</option>
                  {workbookData.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Match Type */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Tipo de Jogo / Competição
                </label>
                <select
                  value={columnMapping.type}
                  onChange={(e) => setColumnMapping({ ...columnMapping, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">-- Não Mapeado --</option>
                  {workbookData.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Local (Casa / Fora)</label>
                <select
                  value={columnMapping.location}
                  onChange={(e) => setColumnMapping({ ...columnMapping, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">-- Não Mapeado --</option>
                  {workbookData.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Goals Scored / Score */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <label className="block text-[11px] font-bold text-emerald-400 uppercase mb-1">
                  Golos Marcados (ou Resultado ex: 3-1)
                </label>
                <select
                  value={columnMapping.goalsScored}
                  onChange={(e) => setColumnMapping({ ...columnMapping, goalsScored: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">-- Não Mapeado --</option>
                  {workbookData.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Goals Conceded */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <label className="block text-[11px] font-bold text-rose-400 uppercase mb-1">Golos Sofridos</label>
                <select
                  value={columnMapping.goalsConceded}
                  onChange={(e) => setColumnMapping({ ...columnMapping, goalsConceded: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">-- Não Mapeado --</option>
                  {workbookData.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phase / Round */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Jornada / Fase</label>
                <select
                  value={columnMapping.phase}
                  onChange={(e) => setColumnMapping({ ...columnMapping, phase: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">-- Não Mapeado --</option>
                  {workbookData.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Corners For */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Cantos a Favor</label>
                <select
                  value={columnMapping.cornersFor}
                  onChange={(e) => setColumnMapping({ ...columnMapping, cornersFor: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">-- Não Mapeado --</option>
                  {workbookData.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleApplyMapping}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:bg-cyan-400"
              >
                Aplicar Mapeamento & Pré-visualizar ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW & IMPORT */}
        {step === 'preview' && (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* EXPLICIT VALIDATION DIAGNOSTICS BANNER (Point 8) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider font-['Chakra_Petch']">
                    Validação e Diagnóstico Pré-Importação
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  {parsedRows.length} registos analisados
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-500/20 text-[11px] font-mono text-cyan-300">
                <span>ℹ️</span>
                <span>Texto convertido para maiúsculas e sem acentos/símbolos</span>
              </div>

              {/* Warnings and diagnostics breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2">
                  <span className="text-base">✅</span>
                  <div>
                    <div className="font-bold text-emerald-300 font-mono">{validCount} válidos</div>
                    <div className="text-[10px] text-emerald-400/80">Prontos para gravar</div>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <div>
                    <div className="font-bold text-amber-300 font-mono">{duplicateCount} duplicados</div>
                    <div className="text-[10px] text-amber-400/80">Com regras de mesclagem</div>
                    {duplicateCount > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleSetAllDuplicateActions(e.target.value as MatchDuplicateAction);
                        }}
                        className="mt-1 bg-slate-900 border border-amber-500/40 text-amber-300 text-[10px] rounded px-1.5 py-0.5"
                      >
                        <option value="">Aplicar a todos…</option>
                        <option value="replace">Substituir Existentes</option>
                        <option value="skip">Ignorar (Manter Atuais)</option>
                        <option value="create_new">Criar como Novos</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-2">
                  <span className="text-base">❌</span>
                  <div>
                    <div className="font-bold text-rose-300 font-mono">{errorCount} com erros</div>
                    <div className="text-[10px] text-rose-400/80">Ignorados automaticamente</div>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <div>
                    <div className="font-bold text-blue-300 font-mono">{selectedCount} selecionados</div>
                    <div className="text-[10px] text-blue-400/80">Serão importados agora</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    previewFilter === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('valid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    previewFilter === 'valid' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Válidos ({validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('duplicates')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    previewFilter === 'duplicates' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Duplicados ({duplicateCount})
                </button>
                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('errors')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      previewFilter === 'errors' ? 'bg-rose-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Erros ({errorCount})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchInPreview}
                  onChange={(e) => setSearchInPreview(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1"
                />
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(true)}
                  className="text-[11px] text-cyan-300 hover:underline"
                >
                  Sel. Todos
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(false)}
                  className="text-[11px] text-slate-400 hover:underline"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 max-h-[360px] overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/60 scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 text-slate-300 border-b border-slate-800 font-mono text-[11px]">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Sel</th>
                    <th className="p-2.5">Adversário</th>
                    <th className="p-2.5">Data & Hora</th>
                    <th className="p-2.5">Local</th>
                    <th className="p-2.5 text-center">Resultado</th>
                    <th className="p-2.5">Competição / Fase</th>
                    <th className="p-2.5">Ação Duplicado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-900/40 transition-colors ${
                        !row.isValid ? 'bg-rose-950/20' : row.isDuplicate ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!row.isValid}
                          onChange={() => handleToggleSelectRow(row.id)}
                          className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                        />
                      </td>
                      <td className="p-2.5 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{row.opponent}</span>
                          {row.isDuplicate && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Duplicado
                            </span>
                          )}
                        </div>
                        {row.validationErrors.length > 0 && (
                          <div className="text-[10px] text-rose-400 mt-0.5">{row.validationErrors.join(' • ')}</div>
                        )}
                      </td>
                      <td className="p-2.5 font-mono text-slate-300">
                        {row.date || '---'} {row.time ? `(${row.time})` : ''}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            row.location === 'casa'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {row.location === 'casa' ? '🏠 Casa' : '✈️ Fora'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        <span className="text-emerald-400">{row.goalsScored}</span>
                        <span className="text-slate-500 mx-1">-</span>
                        <span className="text-rose-400">{row.goalsConceded}</span>
                      </td>
                      <td className="p-2.5 text-slate-400">{row.phase || row.tournamentName || row.type}</td>
                      <td className="p-2.5">
                        {row.isDuplicate ? (
                          <select
                            value={row.duplicateAction}
                            onChange={(e) => handleSetDuplicateAction(row.id, e.target.value as MatchDuplicateAction)}
                            className="bg-slate-900 border border-amber-500/40 text-amber-300 text-[11px] rounded px-2 py-1"
                          >
                            <option value="replace">Substituir Existente</option>
                            <option value="skip">Ignorar (Manter Atual)</option>
                            <option value="create_new">Criar como Novo</option>
                          </select>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Novo Registo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Voltar ao Mapeamento
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  <strong className="text-cyan-300">{selectedCount}</strong> jogos prontos para importar
                </span>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase shadow-[0_0_20px_rgba(0,210,255,0.4)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Concluir & Importar Jogos ➔
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
