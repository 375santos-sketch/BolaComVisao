import * as XLSX from 'xlsx';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { TeamDataset, TeamDatabaseRow, UserAccount } from '../types';
import { sanitizeExcelText } from './utils';

export const MAX_COLUMNS_LIMIT = 40;
export const MAX_ROWS_LIMIT = 5000;
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_STRING_LENGTH = 500;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==============================================================================
// LOCAL OFFLINE CACHE (IndexedDB / LocalStorage fallback)
// ==============================================================================
const LOCAL_CACHE_PREFIX = 'bcv_team_db_v1_';

function getLocalCacheKey(teamId: string, datasetId: string): string {
  return `${LOCAL_CACHE_PREFIX}${teamId}_${datasetId}`;
}

export function saveToLocalCache(
  teamId: string,
  dataset: TeamDataset,
  rows: TeamDatabaseRow[]
): void {
  try {
    const key = getLocalCacheKey(teamId, dataset.id);
    const payload = JSON.stringify({ dataset, rows, cachedAt: Date.now() });
    localStorage.setItem(key, payload);
  } catch (err) {
    console.warn('Falha ao guardar cache local da base de dados:', err);
  }
}

export function loadFromLocalCache(
  teamId: string,
  datasetId: string
): { dataset: TeamDataset; rows: TeamDatabaseRow[] } | null {
  try {
    const key = getLocalCacheKey(teamId, datasetId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { dataset: parsed.dataset, rows: parsed.rows };
  } catch {
    return null;
  }
}

// ==============================================================================
// EXCEL IMPORT & SANITIZATION PIPELINE
// ==============================================================================
export interface ParsedExcelSheet {
  sheetName: string;
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface ExcelWorkbookInspection {
  sheetNames: string[];
  sheets: Record<string, ParsedExcelSheet>;
}

/**
 * Deduplicates and sanitizes column headers
 */
export function sanitizeAndDeduplicateHeaders(rawHeaders: unknown[]): string[] {
  const result: string[] = [];
  const counts = new Map<string, number>();

  rawHeaders.forEach((col, idx) => {
    let sanitized = sanitizeExcelText(col);
    if (!sanitized) {
      sanitized = `COLUNA ${idx + 1}`;
    }
    if (sanitized.length > 100) {
      sanitized = sanitized.slice(0, 100).trim();
    }

    const currentCount = counts.get(sanitized) || 0;
    counts.set(sanitized, currentCount + 1);

    if (currentCount > 0) {
      result.push(`${sanitized} (${currentCount + 1})`);
    } else {
      result.push(sanitized);
    }
  });

  return result.slice(0, MAX_COLUMNS_LIMIT);
}

/**
 * Parses an Excel or CSV file buffer and applies prompt sanitization rules
 */
export function inspectExcelBuffer(
  buffer: ArrayBuffer | Uint8Array,
  _fileName?: string
): ExcelWorkbookInspection {
  if (!buffer) {
    throw new Error('Buffer do ficheiro inválido ou vazio.');
  }

  const byteLength =
    buffer instanceof Uint8Array ? buffer.byteLength : (buffer as ArrayBuffer).byteLength;

  if (byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `O ficheiro excede o limite máximo permitido de 2 MB (tamanho: ${(
        byteLength /
        (1024 * 1024)
      ).toFixed(2)} MB).`
    );
  }

  const u8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  const workbook = XLSX.read(u8Array, {
    type: 'array',
    cellDates: true,
    raw: false,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('O ficheiro Excel não contém qualquer folha de cálculo.');
  }

  const sheets: Record<string, ParsedExcelSheet> = {};

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });

    if (rawMatrix.length === 0) {
      sheets[sheetName] = {
        sheetName,
        columns: [],
        rows: [],
        totalRows: 0,
      };
      continue;
    }

    // First non-empty row is treated as header
    let headerRowIndex = 0;
    while (
      headerRowIndex < rawMatrix.length &&
      rawMatrix[headerRowIndex].every((c) => !String(c).trim())
    ) {
      headerRowIndex++;
    }

    if (headerRowIndex >= rawMatrix.length) {
      sheets[sheetName] = { sheetName, columns: [], rows: [], totalRows: 0 };
      continue;
    }

    const rawHeaders = rawMatrix[headerRowIndex];
    if (rawHeaders.length > MAX_COLUMNS_LIMIT) {
      throw new Error(`A folha "${sheetName}" contém ${rawHeaders.length} colunas. O limite máximo permitido é de ${MAX_COLUMNS_LIMIT} colunas.`);
    }

    const columns = sanitizeAndDeduplicateHeaders(rawHeaders);

    const rows: Record<string, string>[] = [];
    const dataRows = rawMatrix.slice(headerRowIndex + 1);

    for (let i = 0; i < dataRows.length; i++) {
      const rowArr = dataRows[i];
      if (!Array.isArray(rowArr)) continue;

      // Check if row is completely empty
      const hasContent = rowArr.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
      if (!hasContent) continue;

      const rowMap: Record<string, string> = {};
      columns.forEach((colName, colIdx) => {
        const rawCell = rowArr[colIdx];
        if (rawCell === null || rawCell === undefined) {
          rowMap[colName] = '';
          return;
        }

        const cellStr = String(rawCell).trim();
        // Check for email exception
        if (cellStr.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cellStr.toLowerCase())) {
          rowMap[colName] = cellStr.toLowerCase().slice(0, MAX_STRING_LENGTH);
        } else {
          let sanitized = sanitizeExcelText(rawCell);
          if (sanitized.length > MAX_STRING_LENGTH) {
            sanitized = sanitized.slice(0, MAX_STRING_LENGTH);
          }
          rowMap[colName] = sanitized;
        }
      });

      rows.push(rowMap);

      if (rows.length > MAX_ROWS_LIMIT) {
        throw new Error(`A folha "${sheetName}" excede o limite máximo permitido de ${MAX_ROWS_LIMIT} linhas.`);
      }
    }

    sheets[sheetName] = {
      sheetName,
      columns,
      rows,
      totalRows: rows.length,
    };
  }

  return {
    sheetNames: workbook.SheetNames,
    sheets,
  };
}

// ==============================================================================
// FIRESTORE CRUD & BATCH WRITES (MAX 500 PER BATCH)
// ==============================================================================

/**
 * Loads metadata and datasets for a specific team
 */
export async function loadTeamDatasets(teamId: string): Promise<TeamDataset[]> {
  const path = `team_databases/${teamId}/datasets`;
  try {
    const snap = await getDocs(collection(db, path));
    const datasets: TeamDataset[] = [];
    snap.forEach((d) => {
      datasets.push({ id: d.id, ...(d.data() as Omit<TeamDataset, 'id'>) });
    });
    return datasets.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Loads all rows for a dataset
 */
export async function loadDatasetRows(teamId: string, datasetId: string): Promise<TeamDatabaseRow[]> {
  const path = `team_databases/${teamId}/datasets/${datasetId}/rows`;
  try {
    const snap = await getDocs(collection(db, path));
    const remoteRows: TeamDatabaseRow[] = [];
    snap.forEach((d) => {
      remoteRows.push({ id: d.id, ...(d.data() as Omit<TeamDatabaseRow, 'id'>) });
    });

    // Offline reconciliation: Last-write-wins at row level
    const local = loadFromLocalCache(teamId, datasetId);
    if (!local || local.rows.length === 0) {
      return remoteRows.sort((a, b) => a.order - b.order);
    }

    const rowMap = new Map<string, TeamDatabaseRow>();
    remoteRows.forEach((r) => rowMap.set(r.id, r));

    local.rows.forEach((localRow) => {
      const existing = rowMap.get(localRow.id);
      if (!existing || localRow.updatedAt > existing.updatedAt) {
        rowMap.set(localRow.id, localRow);
      }
    });

    return Array.from(rowMap.values()).sort((a, b) => a.order - b.order);
  } catch (err) {
    // If offline or network error, fallback to local cache
    const cached = loadFromLocalCache(teamId, datasetId);
    if (cached) {
      return cached.rows.sort((a, b) => a.order - b.order);
    }
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Saves or updates a full dataset and its rows using chunked batch writes (<= 450 per batch)
 */
export async function saveTeamDatasetWithRows(
  teamId: string,
  teamName: string,
  clubId: string,
  dataset: TeamDataset,
  rows: TeamDatabaseRow[],
  user: UserAccount
): Promise<void> {
  const now = Date.now();
  const userName = user.name || user.username || 'Utilizador';

  // Always update local cache immediately for offline protection
  saveToLocalCache(teamId, dataset, rows);

  // 1. Save / Update team metadata
  const metaPath = `team_databases/${teamId}`;
  try {
    const metaRef = doc(db, metaPath);
    await setDoc(
      metaRef,
      {
        clubId: clubId || 'default',
        name: teamName || 'Equipa',
        createdBy: user.id,
        updatedAt: now,
        updatedBy: userName,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, metaPath);
  }

  // 2. Save dataset document
  const datasetPath = `team_databases/${teamId}/datasets/${dataset.id}`;
  try {
    const datasetRef = doc(db, datasetPath);
    await setDoc(datasetRef, {
      name: dataset.name.slice(0, 100),
      columns: dataset.columns.slice(0, MAX_COLUMNS_LIMIT),
      rowCount: Math.min(rows.length, MAX_ROWS_LIMIT),
      version: (dataset.version || 0) + 1,
      updatedAt: now,
      updatedBy: userName,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, datasetPath);
  }

  // 3. Batch write rows in chunks of max 450 operations per batch
  const BATCH_CHUNK_SIZE = 450;
  const rowsToSave = rows.slice(0, MAX_ROWS_LIMIT);

  for (let i = 0; i < rowsToSave.length; i += BATCH_CHUNK_SIZE) {
    const chunk = rowsToSave.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((row, idx) => {
      const rowRef = doc(db, `team_databases/${teamId}/datasets/${dataset.id}/rows/${row.id}`);
      // Clean and sanitize row data map
      const cleanedData: Record<string, string | number | boolean | null> = {};
      Object.keys(row.data).forEach((col) => {
        const val = row.data[col];
        if (typeof val === 'string') {
          cleanedData[col] = val.slice(0, MAX_STRING_LENGTH);
        } else {
          cleanedData[col] = val;
        }
      });

      batch.set(rowRef, {
        data: cleanedData,
        order: row.order ?? (i + idx),
        updatedAt: row.updatedAt || now,
        updatedBy: row.updatedBy || userName,
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `team_databases/${teamId}/datasets/${dataset.id}/rows`
      );
    }
  }
}

/**
 * Deletes a single row from a dataset
 */
export async function deleteTeamDatabaseRow(
  teamId: string,
  datasetId: string,
  rowId: string
): Promise<void> {
  const path = `team_databases/${teamId}/datasets/${datasetId}/rows/${rowId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Deletes an entire dataset (Admin-only in firestore.rules)
 */
export async function deleteTeamDataset(teamId: string, datasetId: string): Promise<void> {
  const path = `team_databases/${teamId}/datasets/${datasetId}`;
  try {
    // Delete rows in subcollection first
    const rowsSnap = await getDocs(collection(db, `${path}/rows`));
    const batch = writeBatch(db);
    rowsSnap.forEach((r) => batch.delete(r.ref));
    await batch.commit();

    await deleteDoc(doc(db, path));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==============================================================================
// EXPORT TO EXCEL (.xlsx)
// ==============================================================================
export function exportTeamDatabaseToExcel(
  dataset: TeamDataset,
  rows: TeamDatabaseRow[],
  teamName: string
): void {
  const exportData = rows.map((r) => {
    const rowObj: Record<string, string | number | boolean | null> = {};
    dataset.columns.forEach((col) => {
      rowObj[col] = r.data[col] ?? '';
    });
    return rowObj;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = dataset.columns.map((col) => ({
    wch: Math.max(col.length + 4, 14),
  }));
  ws['!cols'] = colWidths;

  const safeSheetName = (dataset.name || 'Base de Dados').replace(/[*?:/[\]]/g, '').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName || 'Dados');

  const safeTeam = teamName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDataset = (dataset.name || 'dataset').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Base_Dados_${safeTeam}_${safeDataset}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
