import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, UserAccount, TeamDataset, TeamDatabaseRow } from '../types';
import { uid } from '../lib/utils';
import { getUserAccessibleTeams, canManageTeamDatabase, getEffectiveTeamRole } from '../lib/permissionsEngine';
import {
  MAX_COLUMNS_LIMIT,
  MAX_FILE_SIZE_BYTES,
  inspectExcelBuffer,
  loadTeamDatasets,
  cleanSheetText,
  cleanSheetHeader,
  loadDatasetRows,
  saveTeamDatasetWithRows,
  exportTeamDatabaseToExcel,
  ParsedExcelSheet
} from '../lib/teamDatabaseService';

interface TeamDatabaseViewProps {
  state: AppState;
  onShowToast: (msg: string) => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
}

interface HistoryStep {
  columns: string[];
  rows: TeamDatabaseRow[];
}

function createEmptyRow(cols: string[], order: number, user?: UserAccount | null): TeamDatabaseRow {
  const newRow: TeamDatabaseRow = {
    id: uid(),
    data: {},
    order,
    updatedAt: Date.now(),
    updatedBy: user?.name || user?.username || 'Utilizador'
  };
  cols.forEach((col) => {
    newRow.data[col] = '';
  });
  return newRow;
}

export const TeamDatabaseView: React.FC<TeamDatabaseViewProps> = ({ state, onShowToast, onShowConfirm }) => {
  const currentUser = state.currentUser;
  const accessibleTeams = useMemo(() => {
    return getUserAccessibleTeams(currentUser, state.teams || []);
  }, [currentUser, state.teams]);

  // Selected team (defaults to state.activeTeamId if accessible, or first accessible)
  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    if (state.activeTeamId && accessibleTeams.some((t) => t.id === state.activeTeamId)) {
      return state.activeTeamId;
    }
    return accessibleTeams[0]?.id || '';
  });

  const activeTeam = useMemo(() => {
    return accessibleTeams.find((t) => t.id === selectedTeamId) || accessibleTeams[0] || null;
  }, [accessibleTeams, selectedTeamId]);

  // Permissions for currently selected team
  const canEdit = useMemo(() => {
    if (!activeTeam) return false;
    return canManageTeamDatabase(currentUser, activeTeam.id, currentUser?.clubId);
  }, [currentUser, activeTeam]);

  const userRoleOnTeam = useMemo(() => {
    if (!activeTeam) return 'Sem Acesso';
    return getEffectiveTeamRole(currentUser, activeTeam.id, currentUser?.clubId);
  }, [currentUser, activeTeam]);

  // Datasets state
  const [datasets, setDatasets] = useState<TeamDataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<TeamDatabaseRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // History for Undo
  const historyRef = useRef<HistoryStep[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Search & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Inline cell editing
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Column renaming / adding modal state
  const [colModal, setColModal] = useState<{
    mode: 'add' | 'rename';
    oldCol?: string;
    newColName: string;
  } | null>(null);

  // Import Modal state
  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    fileName: string;
    sheetNames: string[];
    selectedSheet: string;
    parsedSheets: Record<string, ParsedExcelSheet>;
    isProcessing: boolean;
  } | null>(null);

  // Keep track of unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load datasets when selected team changes
  useEffect(() => {
    let isMounted = true;
    if (!activeTeam) return;

    queueMicrotask(() => {
      if (isMounted) setIsLoading(true);
    });

    loadTeamDatasets(activeTeam.id)
      .then(async (dsList) => {
        if (!isMounted) return;
        setDatasets(dsList);
        if (dsList.length > 0) {
          const first = dsList[0];
          setActiveDatasetId(first.id);
          setColumns(first.columns);
          const rList = await loadDatasetRows(activeTeam.id, first.id);
          if (isMounted) {
            setRows(rList);
            historyRef.current = [];
            setCanUndo(false);
            setHasUnsavedChanges(false);
          }
        } else {
          setActiveDatasetId('');
          setColumns([]);
          setRows([]);
        }
      })
      .catch((_err) => {
        console.warn('Erro ao carregar dados da equipa:', _err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTeam]);

  // Load rows when active dataset changes
  const handleSelectDataset = async (datasetId: string) => {
    if (datasetId === activeDatasetId || !activeTeam) return;
    const target = datasets.find((d) => d.id === datasetId);
    if (!target) return;

    setIsLoading(true);
    setActiveDatasetId(target.id);
    setColumns(target.columns);
    try {
      const rList = await loadDatasetRows(activeTeam.id, target.id);
      setRows(rList);
      historyRef.current = [];
      setCanUndo(false);
      setHasUnsavedChanges(false);
    } catch (_err) {
      onShowToast('Erro ao carregar dados do dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  // Push snapshot to undo history
  const pushHistory = (currentCols: string[], currentRows: TeamDatabaseRow[]) => {
    historyRef.current.push({
      columns: [...currentCols],
      rows: JSON.parse(JSON.stringify(currentRows))
    });
    // keep max 25 steps
    if (historyRef.current.length > 25) {
      historyRef.current.shift();
    }
    setCanUndo(true);
    setHasUnsavedChanges(true);
  };

  // Undo function
  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const last = historyRef.current.pop()!;
    setColumns(last.columns);
    setRows(last.rows);
    setCanUndo(historyRef.current.length > 0);
    setHasUnsavedChanges(true);
    onShowToast('Última alteração desfeita! ↩️');
  };

  // Save changes
  const handleSave = async () => {
    if (!activeTeam || !currentUser || !activeDatasetId) return;
    if (!canEdit) {
      onShowToast('Não tens permissão para guardar alterações.');
      return;
    }

    setSaveStatus('saving');
    try {
      const targetDataset = datasets.find((d) => d.id === activeDatasetId) || {
        id: activeDatasetId,
        name: 'Base de Dados Principal',
        columns,
        rowCount: rows.length,
        version: 1,
        updatedAt: Date.now(),
        updatedBy: currentUser.name || currentUser.username
      };

      const updatedDataset: TeamDataset = {
        ...targetDataset,
        columns,
        rowCount: rows.length,
        updatedAt: Date.now(),
        updatedBy: currentUser.name || currentUser.username
      };

      await saveTeamDatasetWithRows(
        activeTeam.id,
        activeTeam.clubName,
        activeTeam.category || 'default',
        updatedDataset,
        rows,
        currentUser
      );

      setDatasets((prev) => prev.map((d) => (d.id === updatedDataset.id ? updatedDataset : d)));
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      onShowToast('Base de dados guardada com sucesso! ☁️');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      onShowToast('Erro ao guardar base de dados no servidor.');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // Add new Row
  const handleAddRow = () => {
    if (!canEdit) return;
    pushHistory(columns, rows);
    const newRow = createEmptyRow(columns, rows.length, currentUser);
    setRows((prev) => [...prev, newRow]);
    onShowToast('Linha adicionada!');
  };

  // Delete Row
  const handleDeleteRow = (rowId: string) => {
    if (!canEdit) return;
    pushHistory(columns, rows);
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    onShowToast('Linha removida!');
  };

  // Cell Editing
  const startEditingCell = (rowId: string, col: string, val: string | number | boolean | null) => {
    if (!canEdit) return;
    setEditingCell({ rowId, col });
    setEditValue(val !== null && val !== undefined ? String(val) : '');
  };

  const commitCellEdit = () => {
    if (!editingCell) return;
    const { rowId, col } = editingCell;
    const originalRow = rows.find((r) => r.id === rowId);
    if (!originalRow) {
      setEditingCell(null);
      return;
    }

    const currentVal = originalRow.data[col] ?? '';
    if (String(currentVal) !== editValue) {
      pushHistory(columns, rows);
      // Clean and sanitize string value
      const cleaned = cleanSheetText(editValue);
      setRows((prev) =>
        prev.map((r) => {
          if (r.id === rowId) {
            return {
              ...r,
              data: {
                ...r.data,
                [col]: cleaned
              },
              updatedAt: Date.now(),
              updatedBy: currentUser?.name || currentUser?.username || 'Utilizador'
            };
          }
          return r;
        })
      );
    }
    setEditingCell(null);
  };

  // Column management: Add Column
  const handleAddColumnConfirm = () => {
    if (!colModal || !colModal.newColName.trim() || !canEdit) return;
    if (columns.length >= MAX_COLUMNS_LIMIT) {
      onShowToast(`Limite máximo de ${MAX_COLUMNS_LIMIT} colunas atingido.`);
      return;
    }

    const sanitizedCol = cleanSheetHeader(colModal.newColName);
    if (!sanitizedCol) {
      onShowToast('Nome de coluna inválido.');
      return;
    }

    if (columns.includes(sanitizedCol)) {
      onShowToast('Já existe uma coluna com esse nome.');
      return;
    }

    pushHistory(columns, rows);
    const newCols = [...columns, sanitizedCol];
    setColumns(newCols);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        data: {
          ...r.data,
          [sanitizedCol]: ''
        }
      }))
    );
    setColModal(null);
    onShowToast(`Coluna "${sanitizedCol}" adicionada!`);
  };

  // Rename Column
  const handleRenameColumnConfirm = () => {
    if (!colModal || !colModal.oldCol || !colModal.newColName.trim() || !canEdit) return;
    const sanitizedCol = cleanSheetHeader(colModal.newColName);
    if (!sanitizedCol) {
      onShowToast('Nome de coluna inválido.');
      return;
    }

    if (sanitizedCol === colModal.oldCol) {
      setColModal(null);
      return;
    }

    if (columns.includes(sanitizedCol)) {
      onShowToast('Já existe uma coluna com esse nome.');
      return;
    }

    pushHistory(columns, rows);
    const oldCol = colModal.oldCol;
    const newCols = columns.map((c) => (c === oldCol ? sanitizedCol : c));
    setColumns(newCols);
    setRows((prev) =>
      prev.map((r) => {
        const val = r.data[oldCol];
        const nextData = { ...r.data, [sanitizedCol]: val };
        delete nextData[oldCol];
        return { ...r, data: nextData };
      })
    );
    setColModal(null);
    onShowToast(`Coluna renomeada para "${sanitizedCol}"!`);
  };

  // Delete Column
  const handleDeleteColumn = (colName: string) => {
    if (!canEdit) return;
    onShowConfirm(`Tens a certeza que queres apagar a coluna "${colName}" e todos os seus dados?`, () => {
      pushHistory(columns, rows);
      const newCols = columns.filter((c) => c !== colName);
      setColumns(newCols);
      setRows((prev) =>
        prev.map((r) => {
          const nextData = { ...r.data };
          delete nextData[colName];
          return { ...r, data: nextData };
        })
      );
      onShowToast(`Coluna "${colName}" apagada!`);
    });
  };

  // Export to Excel
  const handleExport = () => {
    if (!activeTeam) return;
    const currentDataset = datasets.find((d) => d.id === activeDatasetId) || {
      id: activeDatasetId || 'dataset_1',
      name: 'Base de Dados',
      columns,
      rowCount: rows.length,
      version: 1,
      updatedAt: Date.now(),
      updatedBy: currentUser?.name || 'Utilizador'
    };
    exportTeamDatabaseToExcel(currentDataset, rows, activeTeam.clubName);
    onShowToast('Base de dados exportada para Excel! 📥');
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) {
      onShowToast('Apenas Treinadores e Administrador podem importar dados.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      onShowToast('O ficheiro excede o limite máximo permitido de 2 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const inspection = inspectExcelBuffer(buffer, file.name);
        const firstSheet = inspection.sheetNames[0] || '';
        setImportModal({
          isOpen: true,
          fileName: file.name,
          sheetNames: inspection.sheetNames,
          selectedSheet: firstSheet,
          parsedSheets: inspection.sheets,
          isProcessing: false
        });
      } catch (err: any) {
        onShowToast(err.message || 'Erro ao ler o ficheiro Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!importModal || !activeTeam || !currentUser) return;
    const sheetData = importModal.parsedSheets[importModal.selectedSheet];
    if (!sheetData || sheetData.columns.length === 0) {
      onShowToast('A folha selecionada não tem colunas válidas.');
      return;
    }

    const cleanDatasetName = importModal.fileName.replace(/\.[^/.]+$/, '').slice(0, 80);
    const newDatasetId = uid();
    const newCols = sheetData.columns;

    const newRows: TeamDatabaseRow[] = sheetData.rows.map((rowMap, idx) => ({
      id: uid(),
      data: rowMap,
      order: idx,
      updatedAt: Date.now(),
      updatedBy: currentUser.name || currentUser.username
    }));

    const newDataset: TeamDataset = {
      id: newDatasetId,
      name: cleanDatasetName,
      columns: newCols,
      rowCount: newRows.length,
      version: 1,
      updatedAt: Date.now(),
      updatedBy: currentUser.name || currentUser.username
    };

    setImportModal(null);
    setIsLoading(true);

    try {
      await saveTeamDatasetWithRows(
        activeTeam.id,
        activeTeam.clubName,
        activeTeam.category || 'default',
        newDataset,
        newRows,
        currentUser
      );

      setDatasets((prev) => [newDataset, ...prev]);
      setActiveDatasetId(newDataset.id);
      setColumns(newCols);
      setRows(newRows);
      historyRef.current = [];
      setCanUndo(false);
      setHasUnsavedChanges(false);
      onShowToast(`Base de dados importada com sucesso (${newRows.length} linhas)! 🚀`);
    } catch (_err) {
      onShowToast('Erro ao gravar nova base de dados no servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter & Sort Rows
  const displayedRows = useMemo(() => {
    let result = [...rows];

    // Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((row) =>
        Object.values(row.data).some(
          (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(term)
        )
      );
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a.data[sortColumn] ?? '';
        const valB = b.data[sortColumn] ?? '';
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        const numA = Number(valA);
        const numB = Number(valB);
        const isNumeric = !isNaN(numA) && !isNaN(numB) && strA !== '' && strB !== '';

        const comparison = isNumeric ? numA - numB : strA.localeCompare(strB);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [rows, searchTerm, sortColumn, sortDirection]);

  const toggleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  if (accessibleTeams.length === 0) {
    return (
      <div className="p-6 text-center text-ui-muted">
        <div className="text-3xl mb-2">🔒</div>
        <div className="font-bold text-ui-text mb-1">Sem Acesso a Equipas</div>
        <p className="text-xs">Não tens permissões atribuídas para aceder a nenhuma equipa deste clube.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Team Selector & Header Bar */}
      <div className="ui-card flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold uppercase text-ui-brand">Equipa:</label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="ui-input text-xs"
          >
            {accessibleTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.clubName} ({team.category} {team.season})
              </option>
            ))}
          </select>

          {/* Dataset selector (if multiple) */}
          {datasets.length > 1 && (
            <select
              value={activeDatasetId}
              onChange={(e) => handleSelectDataset(e.target.value)}
              className="ui-input text-xs"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.rowCount} linhas)
                </option>
              ))}
            </select>
          )}

          <span
            className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums uppercase ${
              canEdit
                ? 'bg-ui-success/20 text-ui-success border border-ui-success/30'
                : 'bg-ui-warning/20 text-ui-warning border border-ui-warning/30'
            }`}
          >
            {canEdit ? `Editor (${userRoleOnTeam})` : `Modo Leitura (${userRoleOnTeam})`}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {canEdit && (
            <label className="cursor-pointer px-2.5 py-1.5 bg-ui-surface-2 hover:bg-ui-surface-3 text-ui-brand hover:text-ui-text rounded-lg text-xs font-bold uppercase border border-ui-brand/30 transition-all flex items-center gap-1">
              <span>📥</span>
              <span>Importar Excel</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          )}

          {columns.length > 0 && (
            <button
              onClick={handleExport}
              className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1"
            >
              <span>📤</span>
              <span>Exportar</span>
            </button>
          )}

          {canEdit && canUndo && (
            <button
              onClick={handleUndo}
              className="ui-btn ui-btn-soft-warning px-2.5 py-1.5 text-xs flex items-center gap-1"
              title="Desfazer última alteração"
            >
              <span>↩️</span>
              <span>Desfazer</span>
            </button>
          )}

          {canEdit && columns.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                saveStatus === 'saving'
                  ? 'bg-ui-warning text-ui-text'
                  : hasUnsavedChanges
                    ? 'bg-ui-brand text-ui-brand-ink hover:brightness-110'
                    : 'bg-ui-surface-2 text-ui-success border border-ui-success/30'
              }`}
            >
              {saveStatus === 'saving' ? (
                <>
                  <span>⏳</span>
                  <span>A guardar...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <span>✓</span>
                  <span>Guardado</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <span>💾</span>
                  <span>Guardar Alterações</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Guardado</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Warning Notice about Excel uppercase & symbols */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-ui-brand-soft border border-ui-brand/20 rounded-lg text-[11px] text-ui-brand">
        <div className="flex items-center gap-1.5">
          <span>ℹ️</span>
          <span>Nomes das colunas em maiúsculas; o resto fica como no ficheiro</span>
        </div>
        <div className="text-[10px] text-ui-muted tabular-nums">
          {displayedRows.length} de {rows.length} linhas | {columns.length} colunas
        </div>
      </div>

      {/* Main Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar em todas as colunas..."
            className="ui-input w-full text-xs"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-muted text-xs">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ui-muted hover:text-ui-text text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Table Modification Tools */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setColModal({ mode: 'add', newColName: '' })}
              className="ui-btn ui-btn-soft px-2.5 py-1 text-xs flex items-center gap-1"
            >
              <span>+</span>
              <span>Nova Coluna</span>
            </button>
            <button
              onClick={handleAddRow}
              className="ui-btn ui-btn-soft-success px-2.5 py-1 text-xs flex items-center gap-1"
            >
              <span>+</span>
              <span>Nova Linha</span>
            </button>
          </div>
        )}
      </div>

      {/* Data Table Container */}
      <div className="ui-inset flex-1 min-h-[350px] max-h-[550px] overflow-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-ui-muted">
            <div className="text-2xl animate-spin mb-2">🔄</div>
            <div className="text-xs">A carregar base de dados da equipa...</div>
          </div>
        ) : columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-ui-muted p-6 text-center">
            <div className="text-4xl mb-3">📊</div>
            <div className="font-bold text-ui-text text-sm mb-1 ">Base de Dados Vazia</div>
            <p className="text-xs text-ui-muted max-w-sm mb-4">
              Esta equipa ainda não tem nenhuma base de dados configurada. Importa um ficheiro Excel (.xlsx/.xls/.csv)
              ou cria uma nova coluna.
            </p>
            {canEdit && (
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-4 py-2 bg-ui-brand text-ui-brand-ink rounded-xl text-xs font-bold uppercase shadow-lg hover:brightness-110 transition-all flex items-center gap-2">
                  <span>📥</span>
                  <span>Importar Excel</span>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  onClick={() => setColModal({ mode: 'add', newColName: 'NOME' })}
                  className="ui-btn ui-btn-soft px-4 py-2 text-xs"
                >
                  + Criar Manualmente
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-ui-surface/95 backdrop-blur-sm border-b border-ui-brand/30 shadow-md">
              <tr>
                <th className="p-2 w-12 text-center text-[10px] tabular-nums text-ui-muted border-r border-ui-line">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="p-2.5 text-xs font-bold uppercase text-ui-brand border-r border-ui-line select-none whitespace-nowrap min-w-[140px]"
                  >
                    <div className="flex items-center justify-between gap-1 group">
                      <span
                        onClick={() => toggleSort(col)}
                        className="cursor-pointer hover:text-ui-text flex items-center gap-1"
                      >
                        <span>{col}</span>
                        {sortColumn === col && (
                          <span className="text-[10px] text-ui-brand">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </span>

                      {canEdit && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setColModal({ mode: 'rename', oldCol: col, newColName: col })}
                            className="p-1 hover:text-ui-brand text-ui-muted text-[10px]"
                            title="Renomear coluna"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteColumn(col)}
                            className="p-1 hover:text-ui-danger text-ui-muted text-[10px]"
                            title="Apagar coluna"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                {canEdit && <th className="p-2 w-12 text-center text-ui-muted tabular-nums text-[10px]">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-line/60 tabular-nums">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (canEdit ? 2 : 1)} className="p-6 text-center text-ui-muted text-xs">
                    Nenhum registo encontrado com o filtro atual.
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-ui-surface/60 transition-colors group">
                    <td className="p-2 text-center text-[10px] text-ui-muted border-r border-ui-line/80">{idx + 1}</td>

                    {columns.map((col) => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.col === col;
                      const cellVal = row.data[col] ?? '';

                      return (
                        <td
                          key={col}
                          className={`p-2 border-r border-ui-line/60 text-ui-text transition-colors ${
                            canEdit ? 'cursor-text hover:bg-ui-brand-soft' : ''
                          }`}
                          onDoubleClick={() => startEditingCell(row.id, col, cellVal)}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitCellEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitCellEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="ui-input w-full text-xs"
                            />
                          ) : (
                            <div
                              onClick={() => canEdit && startEditingCell(row.id, col, cellVal)}
                              className="min-h-[20px] truncate max-w-xs select-text"
                              title={String(cellVal)}
                            >
                              {cellVal !== '' ? String(cellVal) : <span className="text-ui-muted italic">—</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {canEdit && (
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-ui-danger text-ui-muted text-xs p-1 transition-all"
                          title="Apagar linha"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Column Modal: Add / Rename */}
      {colModal && (
        <div className="ui-overlay fixed inset-0 z-[100000] flex items-center justify-center p-4 animate-fade-in">
          <div className="ui-inset p-5 max-w-sm w-full text-left">
            <h3 className="font-bold text-sm text-ui-brand mb-3">
              {colModal.mode === 'add' ? 'Adicionar Nova Coluna' : `Renomear Coluna: ${colModal.oldCol}`}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-ui-text block mb-1">Nome da Coluna:</label>
                <input
                  type="text"
                  autoFocus
                  value={colModal.newColName}
                  onChange={(e) => setColModal({ ...colModal, newColName: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (colModal.mode === 'add') {
                        handleAddColumnConfirm();
                      } else {
                        handleRenameColumnConfirm();
                      }
                    }
                  }}
                  placeholder="Ex: POSICAO, MINUTOS, EVAL..."
                  className="ui-input w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setColModal(null)}
                  className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={colModal.mode === 'add' ? handleAddColumnConfirm : handleRenameColumnConfirm}
                  className="ui-btn ui-btn-primary px-3 py-1.5 text-xs"
                >
                  {colModal.mode === 'add' ? 'Adicionar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Preview Modal */}
      {importModal && (
        <div className="ui-overlay fixed inset-0 z-[100000] flex items-center justify-center p-4 animate-fade-in">
          <div className="ui-inset p-5 max-w-2xl w-full max-h-[85vh] flex flex-col text-left">
            <div className="flex items-center justify-between pb-3 border-b border-ui-line">
              <div className="font-bold text-base text-ui-brand flex items-center gap-2">
                <span>📊</span>
                <span>Pré-visualização do Ficheiro Excel</span>
              </div>
              <button onClick={() => setImportModal(null)} className="text-ui-muted hover:text-ui-text text-lg p-1">
                ✕
              </button>
            </div>

            <div className="py-3 space-y-3 flex-1 overflow-y-auto">
              <div className="ui-card flex flex-wrap items-center justify-between gap-2 p-2.5 text-xs">
                <div>
                  <span className="text-ui-muted">Ficheiro: </span>
                  <span className="font-bold text-ui-text">{importModal.fileName}</span>
                </div>

                {importModal.sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-ui-muted">Folha: </span>
                    <select
                      value={importModal.selectedSheet}
                      onChange={(e) => setImportModal({ ...importModal, selectedSheet: e.target.value })}
                      className="ui-input text-xs"
                    >
                      {importModal.sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Requirement 6 discrete notice */}
              <div className="p-2.5 bg-ui-brand-soft border border-ui-brand/30 rounded-xl text-xs text-ui-brand flex items-center gap-2">
                <span>✨</span>
                <span>Nomes das colunas em maiúsculas; o resto fica como no ficheiro</span>
              </div>

              {/* Preview Table */}
              {(() => {
                const sheet = importModal.parsedSheets[importModal.selectedSheet];
                if (!sheet || sheet.columns.length === 0) {
                  return (
                    <div className="p-6 text-center text-ui-muted text-xs">
                      Esta folha está vazia ou não tem cabeçalhos reconhecíveis.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="text-[11px] text-ui-muted">
                      A mostrar as primeiras 10 linhas de um total de {sheet.totalRows} linhas e {sheet.columns.length}{' '}
                      colunas:
                    </div>
                    <div className="max-h-64 overflow-auto border border-ui-line rounded-xl scrollbar-thin">
                      <table className="w-full text-left text-[11px] border-collapse tabular-nums">
                        <thead className="bg-ui-surface sticky top-0 border-b border-ui-line text-ui-brand">
                          <tr>
                            <th className="p-1.5 w-8 text-center text-ui-muted">#</th>
                            {sheet.columns.map((c) => (
                              <th key={c} className="p-1.5 border-r border-ui-line whitespace-nowrap">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ui-line/60">
                          {sheet.rows.slice(0, 10).map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-ui-surface/50">
                              <td className="p-1.5 text-center text-ui-muted">{rIdx + 1}</td>
                              {sheet.columns.map((c) => (
                                <td
                                  key={c}
                                  className="p-1.5 border-r border-ui-line whitespace-nowrap max-w-[160px] truncate text-ui-text"
                                >
                                  {r[c] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-ui-line flex items-center justify-between">
              <div className="text-[11px] text-ui-muted">
                Os dados serão associados exclusivamente à equipa <strong>{activeTeam.clubName}</strong>.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportModal(null)}
                  className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 rounded-lg bg-ui-brand text-ui-brand-ink font-bold text-xs shadow-md hover:brightness-110"
                >
                  Confirmar Importação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
