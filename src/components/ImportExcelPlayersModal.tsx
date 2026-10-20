import React, { useState, useRef } from 'react';
import { Player, AppState, SquadProfile } from '../types';
import {
  readExcelFile,
  parseRosterRows,
  switchExcelSheet,
  reParseWithCustomHeaderRow,
  downloadExcelPlayerTemplate,
  autoDetectColumnMapping,
  ExcelWorkbookData,
  ColumnMapping,
  ParsedPlayerRow,
  DuplicateAction,
  normalizePlayerName
} from '../lib/excelPlayerImporter';
import { uid } from '../lib/utils';
import { saveMasterClubState, auth } from '../services/firebase';

interface ImportExcelPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
}

export const ImportExcelPlayersModal: React.FC<ImportExcelPlayersModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateState,
  onShowToast
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [loading, setLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File & Raw ArrayBuffer
  const [rawFileBuffer, setRawFileBuffer] = useState<ArrayBuffer | null>(null);
  const [workbookData, setWorkbookData] = useState<ExcelWorkbookData | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedHeaderRowIdx, setSelectedHeaderRowIdx] = useState<number>(0);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState<boolean>(false);

  // Column Mapping
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    birthDate: '',
    positions: '',
    dominantFoot: '',
    number: '',
    height: '',
    weight: '',
    emergencyContact: '',
    emergencyPhone: '',
    phone: '',
    email: '',
    status: ''
  });

  // Parsed results with duplicate detection
  const [parsedRows, setParsedRows] = useState<ParsedPlayerRow[]>([]);

  // Preview Filters & Search
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'duplicates' | 'errors'>('all');
  const [searchInPreview, setSearchInPreview] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  // Active Team and active roster for duplicate checking (fully unified and deduplicated)
  const activeTeam = (state.teams || []).find((t) => t.id === state.activeTeamId) || state.teams?.[0];
  const targetRoster = (() => {
    const combined = [...(activeTeam?.roster || []), ...(state.roster || [])];
    const map = new Map<string, Player>();
    combined.forEach((p) => {
      if (p && p.id && !map.has(p.id)) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  })();

  // Handle File Selection and Parsing
  const handleFile = async (file: File) => {
    setLoading(true);
    setProcessingProgress(15);
    setProcessingStage('A ler ficheiro Excel no browser...');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      setRawFileBuffer(buffer);

      setProcessingProgress(45);
      setProcessingStage('A analisar folhas de cálculo e a detetar cabeçalhos...');

      const data = await readExcelFile(file);
      setWorkbookData(data);
      setSelectedSheet(data.activeSheetName);
      setSelectedHeaderRowIdx(data.detectedHeaderRowIndex);
      setColumnMapping(data.detectedMapping);

      setProcessingProgress(75);
      setProcessingStage('A validar atletas e a verificar duplicados com o plantel atual...');

      // Parse rows with comparison against existing active roster
      const parsed = parseRosterRows(data.rawRows, data.detectedMapping, targetRoster);
      setParsedRows(parsed);

      setProcessingProgress(100);
      setProcessingStage('Processamento concluído!');

      const validCount = parsed.filter((r) => r.isValid).length;

      setTimeout(() => {
        setLoading(false);
        if (!data.detectedMapping.name || validCount === 0) {
          // If no name column was auto-detected or 0 valid players, open mapping directly with diagnostic guidance
          setStep('mapping');
          setShowDiagnosticPanel(true);
          setErrorMessage(
            '⚠️ Atenção: A coluna de "Nome Completo" não foi identificada com certeza. Por favor verifique o cabeçalho e confirme as colunas abaixo.'
          );
        } else {
          setStep('preview');
          setSuccessMessage(
            `Ficheiro "${file.name}" lido com sucesso: ${validCount} atletas detetados na folha "${data.activeSheetName}" (cabeçalho na Linha ${data.detectedHeaderRowIndex + 1})!`
          );
        }
      }, 350);
    } catch (err: any) {
      console.error('Erro ao ler ficheiro Excel:', err);
      setLoading(false);
      setErrorMessage(
        err.message || 'Erro ao processar ficheiro Excel. Certifique-se de que é um formato válido (.xlsx, .xls, .csv).'
      );
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // Sheet Switch Handler
  const handleSheetChange = async (sheetName: string) => {
    if (!rawFileBuffer || !workbookData) return;
    try {
      setLoading(true);
      setProcessingStage(`A carregar folha "${sheetName}"...`);
      const result = await switchExcelSheet(rawFileBuffer, sheetName);
      setSelectedSheet(sheetName);
      setSelectedHeaderRowIdx(result.detectedHeaderRowIndex);
      setColumnMapping(result.detectedMapping);

      const reParsed = parseRosterRows(result.rawRows, result.detectedMapping, targetRoster);
      setParsedRows(reParsed);

      setWorkbookData({
        ...workbookData,
        activeSheetName: sheetName,
        rawHeaders: result.rawHeaders,
        rawRows: result.rawRows,
        detectedMapping: result.detectedMapping,
        detectedHeaderRowIndex: result.detectedHeaderRowIndex,
        totalRawRows: result.totalRawRows,
        dataRowCount: result.dataRowCount,
        rawMatrix: result.rawMatrix
      });

      setLoading(false);
      onShowToast(`Folha "${sheetName}" carregada!`);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Erro ao mudar de folha.');
    }
  };

  // Change Header Row Index Manually (Diagnostic & Custom Header Selector)
  const handleHeaderRowChange = (newRowIndex: number) => {
    if (!workbookData || !workbookData.rawMatrix) return;
    const reParsedData = reParseWithCustomHeaderRow(workbookData.rawMatrix, newRowIndex);
    setSelectedHeaderRowIdx(reParsedData.detectedHeaderRowIndex);
    setColumnMapping(reParsedData.detectedMapping);

    const reParsedRows = parseRosterRows(reParsedData.rawRows, reParsedData.detectedMapping, targetRoster);
    setParsedRows(reParsedRows);

    setWorkbookData({
      ...workbookData,
      rawHeaders: reParsedData.rawHeaders,
      rawRows: reParsedData.rawRows,
      detectedMapping: reParsedData.detectedMapping,
      detectedHeaderRowIndex: reParsedData.detectedHeaderRowIndex,
      dataRowCount: reParsedData.rawRows.length
    });

    onShowToast(`Linha de cabeçalho alterada para Linha ${newRowIndex + 1} (${reParsedData.rawHeaders.length} colunas encontradas)`);
  };

  // Mapping Change Handler
  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const updated = { ...columnMapping, [field]: value };
    setColumnMapping(updated);
    if (workbookData) {
      const reParsed = parseRosterRows(workbookData.rawRows, updated, targetRoster);
      setParsedRows(reParsed);
    }
  };

  // Toggle selection for a single row
  const toggleRowSelected = (id: string) => {
    setParsedRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  };

  // Change duplicate resolution action for a row
  const handleRowDuplicateAction = (id: string, action: DuplicateAction) => {
    setParsedRows((prev) => prev.map((r) => (r.id === id ? { ...r, duplicateAction: action } : r)));
  };

  // Bulk Duplicate Resolution (Only Replace/Update or Skip)
  const applyBulkDuplicateAction = (action: DuplicateAction) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.isDuplicate) {
          return { ...r, duplicateAction: action, selected: action !== 'skip' };
        }
        return r;
      })
    );
    const label = action === 'replace' ? 'atualizar dados dos atletas existentes' : 'ignorar existentes';
    onShowToast(`Ação em lote aplicada: ${label}`);
  };

  // Select / Deselect All Valid Rows
  const toggleSelectAll = (select: boolean) => {
    setParsedRows((prev) => prev.map((r) => (r.isValid ? { ...r, selected: select } : r)));
  };

  // Final Import Confirmation Execution (Atomic Local + Cloud State Sync)
  const handleConfirmImport = async () => {
    const rowsToProcess = parsedRows.filter((r) => r.selected && r.isValid && r.duplicateAction !== 'skip');

    if (rowsToProcess.length === 0) {
      onShowToast('❌ Nenhum atleta válido selecionado para importação.');
      return;
    }

    setLoading(true);
    setProcessingProgress(25);
    setProcessingStage('A integrar atletas no plantel ativo...');

    try {
      // Start with the existing roster
      const currentRoster: Player[] = [...targetRoster];
      let updatedCount = 0;
      let addedCount = 0;

      rowsToProcess.forEach((row) => {
        const rowNormName = normalizePlayerName(row.name);
        const rowLowerName = (row.name || '').trim().toLowerCase();

        // Check if matching player already exists in currentRoster by ID or Name
        const index = currentRoster.findIndex((p) => {
          if (row.duplicateWithPlayerId && p.id === row.duplicateWithPlayerId) return true;
          if (rowLowerName && (p.name || '').trim().toLowerCase() === rowLowerName) return true;
          if (rowNormName && normalizePlayerName(p.name) === rowNormName) return true;
          return false;
        });

        if (index !== -1) {
          // ALWAYS update/alter existing player's data — NEVER duplicate equal names!
          const existing = currentRoster[index];
          currentRoster[index] = {
            ...existing,
            name: row.name ? row.name.trim() : existing.name,
            number: row.number !== null && row.number !== undefined ? row.number : existing.number,
            positions: row.positions && row.positions !== 'Jogador' ? row.positions : (existing.positions || row.positions),
            birthDate: row.birthDate || existing.birthDate,
            dominantFoot: row.dominantFoot || existing.dominantFoot,
            height: row.height || existing.height,
            weight: row.weight || existing.weight,
            emergencyContact: row.emergencyContact || existing.emergencyContact,
            phone: row.phone || existing.phone,
            email: row.email || existing.email,
            status: row.status || existing.status,
            active: true
          };
          updatedCount++;
        } else {
          // Add as a new player (only when no player with this name exists)
          const newPlayer: Player = {
            id: uid(),
            name: row.name ? row.name.trim() : 'Jogador',
            number: row.number,
            positions: row.positions || 'Jogador',
            birthDate: row.birthDate,
            dominantFoot: row.dominantFoot,
            height: row.height,
            weight: row.weight,
            emergencyContact: row.emergencyContact,
            phone: row.phone,
            email: row.email,
            status: row.status,
            active: true
          };
          currentRoster.push(newPlayer);
          addedCount++;
        }
      });

      // Extra guarantee: Sanitize and deduplicate currentRoster so no identical names exist
      const finalRoster: Player[] = [];
      const seenNames = new Set<string>();

      currentRoster.forEach((p) => {
        const norm = normalizePlayerName(p.name);
        if (!seenNames.has(norm)) {
          seenNames.add(norm);
          finalRoster.push(p);
        } else {
          // Merge with previously added entry with the same name
          const targetIdx = finalRoster.findIndex((ep) => normalizePlayerName(ep.name) === norm);
          if (targetIdx !== -1) {
            finalRoster[targetIdx] = {
              ...finalRoster[targetIdx],
              number: finalRoster[targetIdx].number ?? p.number,
              positions: finalRoster[targetIdx].positions || p.positions,
              birthDate: finalRoster[targetIdx].birthDate || p.birthDate,
              phone: finalRoster[targetIdx].phone || p.phone,
              email: finalRoster[targetIdx].email || p.email,
              emergencyContact: finalRoster[targetIdx].emergencyContact || p.emergencyContact,
              height: finalRoster[targetIdx].height || p.height,
              weight: finalRoster[targetIdx].weight || p.weight,
              status: finalRoster[targetIdx].status || p.status
            };
          }
        }
      });

      setProcessingProgress(65);
      setProcessingStage('A sincronizar com a equipa ativa e armazenamento seguro...');

      // Update teams in state to keep squad profile and top-level roster completely in sync
      const updatedTeams: SquadProfile[] = (state.teams || []).map((t) => {
        if (t.id === (activeTeam?.id || state.activeTeamId)) {
          return {
            ...t,
            roster: finalRoster
          };
        }
        return t;
      });

      const nextStateUpdates: Partial<AppState> = {
        roster: finalRoster,
        teams: updatedTeams.length > 0 ? updatedTeams : undefined
      };

      // 1. Update local AppState immediately
      onUpdateState(nextStateUpdates);

      // 2. If user is logged in to Firebase, push to shared cloud immediately
      if (state.currentUser && auth.currentUser) {
        setProcessingProgress(85);
        setProcessingStage('A guardar dados na Nuvem partilhada do Clube...');
        const fullNextState: AppState = {
          ...state,
          roster: finalRoster,
          teams: updatedTeams.length > 0 ? updatedTeams : (state.teams || [])
        };
        await saveMasterClubState(
          state.currentUser.clubId || 'main',
          fullNextState,
          state.currentUser.id,
          state.currentUser.name
        );
      }

      setProcessingProgress(100);
      setProcessingStage('Importação concluída com sucesso!');

      setTimeout(() => {
        setLoading(false);
        onShowToast(`✓ Sucesso! ${addedCount} novos atletas e ${updatedCount} atualizações de dados realizadas. ⚽🎉`);
        onClose();
      }, 250);
    } catch (err: any) {
      console.error('Erro na importação de jogadores:', err);
      setLoading(false);
      onShowToast('❌ Ocorreu um erro ao guardar os atletas. Tente novamente.');
    }
  };

  // Counts
  const totalCount = parsedRows.length;
  const validCount = parsedRows.filter((r) => r.isValid).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;
  const selectedCount = parsedRows.filter((r) => r.selected && r.isValid && r.duplicateAction !== 'skip').length;

  // Filtered displayed rows
  const displayedRows = parsedRows.filter((r) => {
    if (previewFilter === 'valid' && (!r.isValid || r.isDuplicate)) return false;
    if (previewFilter === 'duplicates' && !r.isDuplicate) return false;
    if (previewFilter === 'errors' && r.isValid) return false;

    if (searchInPreview) {
      const q = searchInPreview.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchNum = r.number !== null && String(r.number).includes(q);
      const matchPos = r.positions.toLowerCase().includes(q);
      return matchName || matchNum || matchPos;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border-t sm:border-2 border-cyan-500/40 rounded-t-3xl sm:rounded-3xl w-full max-w-5xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-[0_0_50px_rgba(0,210,255,0.3)] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/30 flex items-center justify-between bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black font-['Chakra_Petch'] text-white uppercase tracking-wider">
                  Importar Plantel de Excel
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  .XLSX / .XLS / .CSV
                </span>
                {activeTeam && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono">
                    Equipa: {activeTeam.name || 'Ativa'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Deteção automática inteligente com validação linha a linha, resolução de duplicados e diagnóstico em tempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadExcelPlayerTemplate(state.myClubName)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-all"
              title="Descarregar folha de cálculo modelo .xlsx pré-configurada"
            >
              <span>📥</span>
              <span>Modelo Excel</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 hover:border-red-500/50 hover:bg-red-950/80 text-slate-400 hover:text-red-300 flex items-center justify-center font-mono text-sm transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Bar Header (Visible when processing or loading) */}
        {loading && (
          <div className="bg-slate-950 px-4 py-3 border-b border-cyan-500/30 shrink-0">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-cyan-300 font-bold flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                <span>{processingStage || 'A processar dados...'}</span>
              </span>
              <span className="text-cyan-400 font-bold">{processingProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-cyan-500/30">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Navigation Step Tabs */}
        {workbookData && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/60 border-b border-cyan-500/20 text-xs font-mono shrink-0 overflow-x-auto justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  step === 'upload' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>1. Ficheiro</span>
                <span className="text-[10px] opacity-80">({workbookData.fileName})</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('mapping')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  step === 'mapping' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>2. Mapeamento de Colunas</span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-900/60 text-[10px] text-cyan-300 border border-cyan-500/40">
                  {columnMapping.name ? '✓ Nome OK' : '⚠️ Sem Nome'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStep('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  step === 'preview' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>3. Pré-visualização & Duplicados</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-900/60 text-[10px] text-emerald-300 border border-emerald-500/40 font-bold">
                  {validCount} Válidos
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowDiagnosticPanel(!showDiagnosticPanel)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                showDiagnosticPanel
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Exibir painel de diagnóstico técnico do ficheiro Excel"
            >
              <span>🔍</span>
              <span>Diagnóstico {showDiagnosticPanel ? '▲' : '▼'}</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Visual Alert Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/90 border border-red-500/50 text-red-200 text-xs font-mono flex items-start gap-2.5 shadow-lg">
              <span className="text-lg shrink-0">⚠️</span>
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-start gap-2.5 shadow-lg">
              <span className="text-lg shrink-0">✓</span>
              <div className="flex-1 leading-relaxed">{successMessage}</div>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* DIAGNOSTIC PANEL (Always available when workbookData exists or toggled) */}
          {workbookData && (showDiagnosticPanel || !columnMapping.name || validCount === 0) && (
            <div className="p-4 rounded-2xl bg-slate-950/95 border-2 border-amber-500/40 space-y-3 font-mono text-xs shadow-lg">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold uppercase">
                  <span>🛠️</span>
                  <span>Diagnóstico Técnico do Excel</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Total Linhas: <strong className="text-white">{workbookData.totalRawRows}</strong> | Linhas de Dados: <strong className="text-emerald-400">{workbookData.dataRowCount}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Sheet Selection */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">📑 Folha Ativa:</span>
                  {workbookData.sheetNames.length > 1 ? (
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-1.5 text-white font-mono text-xs"
                    >
                      {workbookData.sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <strong className="text-cyan-300">{selectedSheet}</strong>
                  )}
                </div>

                {/* Header Row Index Selector */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">🎯 Linha do Cabeçalho:</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedHeaderRowIdx}
                      onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-lg p-1.5 text-amber-300 font-mono text-xs font-bold"
                    >
                      {Array.from({ length: Math.min(25, workbookData.totalRawRows || 1) }, (_, i) => (
                        <option key={i} value={i}>
                          Linha {i + 1} {i === workbookData.detectedHeaderRowIndex ? '(Detetada)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status of Key Fields */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">👤 Coluna 'Nome':</span>
                  <div>
                    {columnMapping.name ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                        ✓ {columnMapping.name}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40 text-[11px] font-bold animate-pulse">
                        ❌ Não Detetada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detected Header Badges */}
              <div className="space-y-1 pt-1">
                <span className="text-slate-400 text-[11px] block">
                  Colunas Encontradas na Linha {selectedHeaderRowIdx + 1} ({workbookData.rawHeaders.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {workbookData.rawHeaders.map((h, idx) => {
                    const isMappedToName = columnMapping.name === h;
                    return (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded-md text-[10px] border ${
                          isMappedToName
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 font-bold'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {h}
                      </span>
                    );
                  })}
                </div>
              </div>

              {!columnMapping.name && (
                <div className="pt-2 flex items-center justify-between bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30">
                  <span className="text-amber-200 text-xs">
                    💡 Selecione a coluna onde estão os nomes dos jogadores na aba <strong>"2. Mapeamento de Colunas"</strong>.
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep('mapping')}
                    className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 text-xs"
                  >
                    Mapear Agora ➔
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 1: UPLOAD ================= */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-950/50 scale-[1.01]'
                    : 'border-cyan-500/40 bg-slate-950/70 hover:border-cyan-400 hover:bg-slate-950'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileInputChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-pulse">
                  📄
                </div>

                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] uppercase">
                    Arrasta o teu ficheiro Excel (.xlsx, .xls, .csv) aqui
                  </div>
                  <p className="text-xs text-cyan-300/80 font-mono">
                    ou clica para selecionar do teu computador ou telemóvel
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>📥</span>
                    <span>Selecionar e Ler Ficheiro Excel</span>
                  </button>
                </div>
              </div>

              {/* Template Download & Field List Info */}
              <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-white font-['Chakra_Petch'] uppercase flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Estrutura de dados recomendada para o plantel:</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadExcelPlayerTemplate(state.myClubName)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 font-mono text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                  >
                    <span>📥</span>
                    <span>Descarregar Modelo Excel (.xlsx)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                    <span className="text-cyan-400">👤</span>
                    <span>Nome Completo *</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                    <span className="text-cyan-400">🔢</span>
                    <span>Nº de Camisola</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                    <span className="text-cyan-400">⚽</span>
                    <span>Posição em Campo</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                    <span className="text-cyan-400">📅</span>
                    <span>Data de Nascimento</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                    <span className="text-cyan-400">🦶</span>
                    <span>Pé dominante</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                    <span className="text-cyan-400">📏</span>
                    <span>Altura</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                    <span className="text-cyan-400">⚖️</span>
                    <span>Peso</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                    <span className="text-cyan-400">🚨</span>
                    <span>Contacto Emergência</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: COLUMN MAPPING ================= */}
          {step === 'mapping' && workbookData && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div>
                    <div className="text-xs font-bold text-white font-['Chakra_Petch'] uppercase">
                      Mapeamento de Colunas do Excel
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Associa cada coluna do teu ficheiro ao respetivo campo do atleta:
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const detected = autoDetectColumnMapping(workbookData.rawHeaders);
                        setColumnMapping(detected);
                        const reParsed = parseRosterRows(workbookData.rawRows, detected, targetRoster);
                        setParsedRows(reParsed);
                        onShowToast('Mapeamento automático restaurado!');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 hover:bg-slate-800 text-[11px] font-mono"
                    >
                      ⚡ Auto-Detetar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs pt-2">
                  {/* Nome Completo */}
                  <div className={`p-3 rounded-xl border space-y-1 ${!columnMapping.name ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-900 border-slate-800'}`}>
                    <label className="block text-cyan-300 font-bold">
                      👤 Nome Completo <span className="text-red-400">* (Obrigatório)</span>:
                    </label>
                    <select
                      value={columnMapping.name}
                      onChange={(e) => handleMappingChange('name', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Selecionar Coluna --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {columnMapping.name && workbookData.rawRows[0]?.[columnMapping.name] && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Exemplo:{' '}
                        <span className="text-slate-200">"{String(workbookData.rawRows[0][columnMapping.name])}"</span>
                      </div>
                    )}
                  </div>

                  {/* Nº de Camisola */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">🔢 Nº de Camisola:</label>
                    <select
                      value={columnMapping.number}
                      onChange={(e) => handleMappingChange('number', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear (Vazio) --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {columnMapping.number && workbookData.rawRows[0]?.[columnMapping.number] && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Exemplo:{' '}
                        <span className="text-slate-200">
                          "{String(workbookData.rawRows[0][columnMapping.number])}"
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Posição em Campo */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">⚽ Posição em Campo:</label>
                    <select
                      value={columnMapping.positions}
                      onChange={(e) => handleMappingChange('positions', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {columnMapping.positions && workbookData.rawRows[0]?.[columnMapping.positions] && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Exemplo:{' '}
                        <span className="text-slate-200">
                          "{String(workbookData.rawRows[0][columnMapping.positions])}"
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Data de Nascimento */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">📅 Data de Nascimento:</label>
                    <select
                      value={columnMapping.birthDate}
                      onChange={(e) => handleMappingChange('birthDate', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {columnMapping.birthDate && workbookData.rawRows[0]?.[columnMapping.birthDate] && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Exemplo:{' '}
                        <span className="text-slate-200">
                          "{String(workbookData.rawRows[0][columnMapping.birthDate])}"
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pé dominante */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">🦶 Pé dominante:</label>
                    <select
                      value={columnMapping.dominantFoot}
                      onChange={(e) => handleMappingChange('dominantFoot', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear (Direito) --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {columnMapping.dominantFoot && workbookData.rawRows[0]?.[columnMapping.dominantFoot] && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Exemplo:{' '}
                        <span className="text-slate-200">
                          "{String(workbookData.rawRows[0][columnMapping.dominantFoot])}"
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Altura */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">📏 Altura:</label>
                    <select
                      value={columnMapping.height}
                      onChange={(e) => handleMappingChange('height', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Peso */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">⚖️ Peso:</label>
                    <select
                      value={columnMapping.weight}
                      onChange={(e) => handleMappingChange('weight', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nome e Contato de Emergência */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">🚨 Contacto de Emergência:</label>
                    <select
                      value={columnMapping.emergencyContact}
                      onChange={(e) => handleMappingChange('emergencyContact', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Telefone do Atleta */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">📱 Telefone do Atleta:</label>
                    <select
                      value={columnMapping.phone}
                      onChange={(e) => handleMappingChange('phone', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email do Atleta */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">✉️ Email do Atleta:</label>
                    <select
                      value={columnMapping.email}
                      onChange={(e) => handleMappingChange('email', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estado / Disponibilidade */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="block text-cyan-300 font-bold">🟢 Estado / Disponibilidade:</label>
                    <select
                      value={columnMapping.status}
                      onChange={(e) => handleMappingChange('status', e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400"
                    >
                      <option value="">-- Não Mapear (Disponível) --</option>
                      {workbookData.rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep('preview')}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all flex items-center gap-2"
                  >
                    <span>Ver Pré-visualização & Duplicados</span>
                    <span>➔</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PREVIEW & DUPLICATES ================= */}
          {step === 'preview' && workbookData && (
            <div className="space-y-4">
              {/* Top Banner: Stats & Bulk Actions */}
              <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase flex items-center gap-2 flex-wrap">
                      <span>Resumo da Importação:</span>
                      <span className="text-emerald-400 font-black text-base">
                        {selectedCount} Atletas Selecionados
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({totalCount} linhas no total)</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Reveja cada linha, resolva duplicados e confirme a inclusão no plantel ativo.
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-500/20 text-[11px] font-mono text-cyan-300">
                      <span>ℹ️</span>
                      <span>Texto convertido para maiúsculas e sem acentos/símbolos</span>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 font-mono text-xs flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('all')}
                      className={`px-2.5 py-1 rounded-lg border transition-all ${
                        previewFilter === 'all'
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Todos ({totalCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewFilter('valid')}
                      className={`px-2.5 py-1 rounded-lg border transition-all ${
                        previewFilter === 'valid'
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                          : 'bg-slate-900 text-emerald-400 border-slate-800'
                      }`}
                    >
                      Novos ({validCount - duplicateCount})
                    </button>

                    {duplicateCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('duplicates')}
                        className={`px-2.5 py-1 rounded-lg border transition-all ${
                          previewFilter === 'duplicates'
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                            : 'bg-slate-900 text-amber-400 border-slate-800'
                        }`}
                      >
                        ⚠️ Duplicados ({duplicateCount})
                      </button>
                    )}

                    {errorCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('errors')}
                        className={`px-2.5 py-1 rounded-lg border transition-all ${
                          previewFilter === 'errors'
                            ? 'bg-red-500 text-slate-950 font-bold border-red-400'
                            : 'bg-slate-900 text-red-400 border-slate-800'
                        }`}
                      >
                        ❌ Erros ({errorCount})
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk Duplicate Action Bar (If duplicates detected) */}
                {duplicateCount > 0 && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
                    <div className="flex items-center gap-2 text-amber-300">
                      <span className="text-base">⚠️</span>
                      <span>
                        Foram detetados <strong>{duplicateCount} atletas</strong> com nomes coincidentes no plantel. Ação:
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyBulkDuplicateAction('replace')}
                        className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center gap-1.5"
                      >
                        <span>🔄</span>
                        <span>Atualizar Dados dos Existentes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyBulkDuplicateAction('skip')}
                        className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] flex items-center gap-1.5"
                      >
                        <span>🚫</span>
                        <span>Ignorar (Manter Atuais)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Search & Quick Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="relative flex-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, número ou posição..."
                      value={searchInPreview}
                      onChange={(e) => setSearchInPreview(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder:text-slate-500 focus:border-cyan-400"
                    />
                    {searchInPreview && (
                      <button
                        onClick={() => setSearchInPreview('')}
                        className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(true)}
                      className="hover:text-cyan-300 transition-colors"
                    >
                      ✓ Selecionar Todos Válidos
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(false)}
                      className="hover:text-cyan-300 transition-colors"
                    >
                      ✕ Desmarcar Todos
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="border border-cyan-500/30 rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
                <div className="overflow-x-auto max-h-[46vh]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-cyan-300 sticky top-0 z-10 border-b border-cyan-500/30 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="p-2.5 pl-3 w-10 text-center">Sel.</th>
                        <th className="p-2.5 w-12">Nº</th>
                        <th className="p-2.5">Nome do Atleta</th>
                        <th className="p-2.5">Posição</th>
                        <th className="p-2.5">Nasc. (Idade)</th>
                        <th className="p-2.5">Pé</th>
                        <th className="p-2.5">Físico</th>
                        <th className="p-2.5">Emergência</th>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5 pr-3">Validação & Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center p-8 text-slate-500">
                            {validCount === 0 ? (
                              <div className="space-y-2">
                                <p className="text-amber-400 font-bold">Nenhum atleta válido detetado.</p>
                                <p className="text-xs text-slate-400">
                                  Verifique se a coluna do Nome Completo está selecionada no Mapeamento ou se a linha do cabeçalho está correta.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setStep('mapping')}
                                  className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs uppercase font-['Chakra_Petch']"
                                >
                                  Ajustar Mapeamento de Colunas
                                </button>
                              </div>
                            ) : (
                              'Nenhum atleta corresponde aos filtros ou pesquisa selecionada.'
                            )}
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row) => {
                          const hasErrors = row.validationErrors.length > 0;
                          const isWarning = row.validationWarnings.length > 0;

                          return (
                            <tr
                              key={row.id}
                              className={`hover:bg-slate-900/60 transition-colors ${
                                !row.isValid ? 'bg-red-950/20 text-red-300' : row.isDuplicate ? 'bg-amber-950/15' : ''
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="p-2.5 pl-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.selected}
                                  disabled={!row.isValid}
                                  onChange={() => toggleRowSelected(row.id)}
                                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer disabled:opacity-30"
                                />
                              </td>

                              {/* Number */}
                              <td className="p-2.5 font-bold text-cyan-400 whitespace-nowrap">
                                {row.number !== null ? `#${row.number}` : <span className="text-slate-600">-</span>}
                              </td>

                              {/* Name */}
                              <td className="p-2.5 font-bold text-white whitespace-nowrap">
                                {row.name ? (
                                  <span>{row.name}</span>
                                ) : (
                                  <span className="text-red-400 italic">Sem Nome (Obrigatório)</span>
                                )}
                              </td>

                              {/* Position */}
                              <td className="p-2.5 text-emerald-300 whitespace-nowrap">{row.positions || 'Jogador'}</td>

                              {/* BirthDate */}
                              <td className="p-2.5 text-slate-300 whitespace-nowrap">
                                {row.birthDate ? (
                                  <span>
                                    {row.birthDate} {row.age !== null ? `(${row.age}a)` : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>

                              {/* Dominant Foot */}
                              <td className="p-2.5 text-slate-300 whitespace-nowrap">{row.dominantFoot}</td>

                              {/* Physical (Height & Weight) */}
                              <td className="p-2.5 text-slate-400 whitespace-nowrap text-[11px]">
                                {row.height || row.weight ? (
                                  <span>
                                    {row.height || '-'} / {row.weight || '-'}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>

                              {/* Emergency Contact */}
                              <td
                                className="p-2.5 text-amber-300/90 whitespace-nowrap text-[11px] max-w-[150px] truncate"
                                title={row.emergencyContact}
                              >
                                {row.emergencyContact || <span className="text-slate-600">-</span>}
                              </td>

                              {/* Status */}
                              <td className="p-2.5 whitespace-nowrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    row.status === 'disponivel'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                      : row.status === 'lesionado'
                                        ? 'bg-red-950 text-red-300 border border-red-500/30'
                                        : row.status === 'suspenso'
                                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {row.status}
                                </span>
                              </td>

                              {/* Validation & Action Column */}
                              <td className="p-2.5 pr-3 whitespace-nowrap">
                                {hasErrors ? (
                                  <div className="flex items-center gap-1.5 text-red-400 font-bold text-[11px]">
                                    <span>❌</span>
                                    <span>{row.validationErrors.join(', ')}</span>
                                  </div>
                                ) : row.isDuplicate ? (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={row.duplicateAction}
                                      onChange={(e) =>
                                        handleRowDuplicateAction(row.id, e.target.value as DuplicateAction)
                                      }
                                      className="bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 text-[11px] text-amber-300 font-mono font-bold"
                                    >
                                      <option value="replace">🔄 Atualizar Dados</option>
                                      <option value="skip">🚫 Ignorar (Manter)</option>
                                    </select>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                      <span>🟢</span>
                                      <span>Novo</span>
                                    </span>
                                    {isWarning && (
                                      <span
                                        className="text-[10px] text-amber-400/90 cursor-help"
                                        title={row.validationWarnings.join(' | ')}
                                      >
                                        ℹ️
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-cyan-500/30 bg-slate-950/98 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_rgba(0,0,0,0.4)]">
          <div className="text-xs font-mono text-slate-400 text-center sm:text-left">
            {workbookData && (
              <span>
                Ficheiro: <strong className="text-cyan-300">{workbookData.fileName}</strong> •{' '}
                <strong className="text-emerald-400">{selectedCount}</strong> atletas selecionados para o plantel ativo
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-mono transition-all flex items-center justify-center"
            >
              Cancelar
            </button>

            {workbookData && step !== 'upload' && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedCount === 0 || loading}
                className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>✅</span>
                <span>Confirmar e Importar ({selectedCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
