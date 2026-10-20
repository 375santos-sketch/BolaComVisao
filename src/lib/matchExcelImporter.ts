import { Match, MatchType, MatchLocation, GoalEvent, Player } from '../types';
import { uid, defaultSeason, sanitizeExcelText, sanitizeExcelRawCell } from './utils';

async function getXLSX() {
  return await import('xlsx');
}

export interface MatchColumnMapping {
  opponent: string; // Opponent team name
  date: string; // Match date
  time?: string; // Match kickoff time
  type?: string; // Match type: amigavel, campeonato, torneio
  location?: string; // Location: casa, fora
  phase?: string; // Phase / Jornada / Rodada
  tournamentName?: string; // Competition name
  season?: string; // Season
  goalsScored?: string; // Goals scored by our team (or score like '3-1')
  goalsConceded?: string; // Goals conceded
  cornersFor?: string; // Corners for
  cornersAgainst?: string; // Corners against
  foulsCommitted?: string; // Fouls committed
  foulsSuffered?: string; // Fouls suffered
  notes?: string; // Match notes
}

export type MatchDuplicateAction = 'replace' | 'skip' | 'create_new';

export interface ParsedMatchRow {
  id: string;
  originalRowIndex: number;
  opponent: string;
  date: string | null;
  time?: string;
  type: MatchType;
  location: MatchLocation;
  phase?: string;
  tournamentName?: string;
  season: string;
  goalsScored: number;
  goalsConceded: number;
  cornersFor?: number;
  cornersAgainst?: number;
  foulsCommitted?: number;
  foulsSuffered?: number;
  notes?: string;
  finished: boolean;

  // Validation
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];

  // Duplication
  isDuplicate: boolean;
  duplicateWithMatchId: string | null;
  duplicateMatchDescription: string | null;
  duplicateAction: MatchDuplicateAction;

  // Selection
  selected: boolean;
}

export interface MatchExcelWorkbookData {
  fileName: string;
  sheetNames: string[];
  activeSheetName: string;
  rawHeaders: string[];
  rawRows: Record<string, any>[];
  detectedMapping: MatchColumnMapping;
}

export function normalizeHeader(str: string): string {
  return sanitizeExcelText(str);
}

/**
 * Auto-detects columns from raw Excel headers for Match data
 */
export function autoDetectMatchColumnMapping(headers: string[]): MatchColumnMapping {
  const mapping: MatchColumnMapping = {
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
  };

  headers.forEach((h) => {
    const norm = normalizeHeader(h);
    if (!norm) return;
    const normUpper = norm.toUpperCase();
    const normClean = normUpper.replace(/\s+/g, '');

    // Opponent
    if (
      !mapping.opponent &&
      (normClean.includes('ADVERSARIO') ||
        normClean.includes('OPONENTE') ||
        normClean.includes('EQUIPAADVERSARIA') ||
        normClean === 'RIVAL' ||
        normClean === 'VS' ||
        normClean.includes('OPPONENT') ||
        normClean === 'EQUIPA' ||
        normClean === 'EQUIPE' ||
        normClean === 'VISITANTE' ||
        normClean === 'VISITADO' ||
        normUpper.includes('ADVERSARIO'))
    ) {
      mapping.opponent = h;
      return;
    }

    // Date
    if (
      !mapping.date &&
      (normClean.includes('DATAJOGO') ||
        normClean.includes('DATA') ||
        normClean.includes('DATE') ||
        normClean.includes('MATCHDATE') ||
        normClean === 'DIA' ||
        normUpper.includes('DATA'))
    ) {
      mapping.date = h;
      return;
    }

    // Time
    if (
      !mapping.time &&
      (normClean.includes('HORA') ||
        normClean.includes('HORARIO') ||
        normClean.includes('TIME') ||
        normClean.includes('KICKOFF') ||
        normClean === 'HR' ||
        normUpper.includes('HORA'))
    ) {
      mapping.time = h;
      return;
    }

    // Match Type
    if (
      !mapping.type &&
      (normClean.includes('TIPODEJOGO') ||
        normClean.includes('TIPOJOGO') ||
        normClean.includes('TIPO') ||
        normClean.includes('COMPETICAO') ||
        normClean.includes('COMPETITION') ||
        normClean.includes('MATCHTYPE') ||
        normUpper.includes('TIPO'))
    ) {
      mapping.type = h;
      return;
    }

    // Location (Casa / Fora)
    if (
      !mapping.location &&
      (normClean.includes('LOCAL') ||
        normClean.includes('LOCALIZACAO') ||
        normClean.includes('CASAFORA') ||
        normClean.includes('CONDICAO') ||
        normClean.includes('VENUE') ||
        normClean === 'CAMPO' ||
        normUpper.includes('LOCAL'))
    ) {
      mapping.location = h;
      return;
    }

    // Phase / Round
    if (
      !mapping.phase &&
      (normClean.includes('JORNADA') ||
        normClean.includes('FASE') ||
        normClean.includes('RODADA') ||
        normClean.includes('ROUND') ||
        normClean.includes('SEMANA') ||
        normClean === 'JORN' ||
        normUpper.includes('JORNADA') ||
        normUpper.includes('FASE'))
    ) {
      mapping.phase = h;
      return;
    }

    // Tournament Name
    if (
      !mapping.tournamentName &&
      (normClean.includes('NOMETORNEIO') ||
        normClean.includes('TORNEIO') ||
        normClean.includes('CAMPEONATO') ||
        normClean.includes('LIGA') ||
        normClean.includes('LEAGUE') ||
        normClean.includes('PROVA') ||
        normUpper.includes('TORNEIO'))
    ) {
      mapping.tournamentName = h;
      return;
    }

    // Season
    if (
      !mapping.season &&
      (normClean.includes('EPOCA') ||
        normClean.includes('TEMPORADA') ||
        normClean.includes('SEASON') ||
        normUpper.includes('EPOCA'))
    ) {
      mapping.season = h;
      return;
    }

    // Goals Scored / Result
    if (
      !mapping.goalsScored &&
      (normClean.includes('GOLOSMARCADOS') ||
        normClean.includes('GOLOSAFAVOR') ||
        normClean.includes('GOLOSFAVOR') ||
        normClean.includes('GM') ||
        normClean.includes('GOLOSPRO') ||
        normClean.includes('NOSSOSGOLOS') ||
        normClean.includes('RESULTADO') ||
        normClean.includes('SCORE') ||
        normClean === 'GF' ||
        normUpper.includes('GOLOS MARCADOS') ||
        normUpper.includes('RESULTADO'))
    ) {
      mapping.goalsScored = h;
      return;
    }

    // Goals Conceded
    if (
      !mapping.goalsConceded &&
      (normClean.includes('GOLOSSOFRIDOS') ||
        normClean.includes('GOLOSCONTRA') ||
        normClean.includes('GS') ||
        normClean.includes('GC') ||
        normClean.includes('GOLOSADVERSARIO') ||
        normClean === 'GA' ||
        normUpper.includes('GOLOS SOFRIDOS'))
    ) {
      mapping.goalsConceded = h;
      return;
    }

    // Corners For
    if (
      !mapping.cornersFor &&
      (normClean.includes('CANTOSFAVOR') ||
        normClean.includes('CANTOSAFAVOR') ||
        normClean.includes('CANTOSMARCADOS') ||
        normClean.includes('CORNERSFOR') ||
        normClean === 'CANTOS' ||
        normClean === 'CORNERS' ||
        normUpper.includes('CANTOS'))
    ) {
      mapping.cornersFor = h;
      return;
    }

    // Corners Against
    if (
      !mapping.cornersAgainst &&
      (normClean.includes('CANTOSCONTRA') ||
        normClean.includes('CANTOSSOFRIDOS') ||
        normClean.includes('CORNERSAGAINST'))
    ) {
      mapping.cornersAgainst = h;
      return;
    }

    // Fouls Committed
    if (
      !mapping.foulsCommitted &&
      (normClean.includes('FALTASCOMETIDAS') ||
        normClean.includes('FALTASFEITAS') ||
        normClean.includes('FOULSCOMMITTED') ||
        normClean === 'FALTAS' ||
        normUpper.includes('FALTAS'))
    ) {
      mapping.foulsCommitted = h;
      return;
    }

    // Fouls Suffered
    if (
      !mapping.foulsSuffered &&
      (normClean.includes('FALTASSOFRIDAS') ||
        normClean.includes('FALTASRECEBIDAS') ||
        normClean.includes('FOULSSUFFERED'))
    ) {
      mapping.foulsSuffered = h;
      return;
    }

    // Notes
    if (
      !mapping.notes &&
      (normClean.includes('OBSERVACOES') ||
        normClean.includes('NOTAS') ||
        normClean.includes('COMENTARIOS') ||
        normClean.includes('RESUMO') ||
        normClean.includes('NOTES') ||
        normUpper.includes('OBSERVACOES') ||
        normUpper.includes('NOTAS'))
    ) {
      mapping.notes = h;
      return;
    }
  });

  return mapping;
}

/**
 * Parses and formats Date string / Excel serial into YYYY-MM-DD
 */
export function parseExcelDate(val: any): string | null {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    // Excel serial date number
    try {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      if (!isNaN(dateInfo.getTime())) {
        return dateInfo.toISOString().split('T')[0];
      }
    } catch {
      // Fallback
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    } else if (parts[2].length === 4) {
      // DD/MM/YYYY
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parses Match Type
 */
export function parseMatchType(val: any): MatchType {
  const norm = normalizeHeader(String(val || ''));
  if (norm.includes('torneio') || norm.includes('taca') || norm.includes('cup') || norm.includes('tournament')) {
    return 'torneio';
  }
  if (
    norm.includes('amigavel') ||
    norm.includes('treino') ||
    norm.includes('friendly') ||
    norm.includes('preparacao')
  ) {
    return 'amigavel';
  }
  return 'campeonato';
}

/**
 * Parses Match Location
 */
export function parseMatchLocation(val: any): MatchLocation {
  const norm = normalizeHeader(String(val || ''));
  if (norm.includes('fora') || norm.includes('visitante') || norm.includes('away') || norm === 'f') {
    return 'fora';
  }
  return 'casa';
}

/**
 * Read Excel file into raw sheets and detected rows
 */
export async function readMatchExcelFile(file: File): Promise<MatchExcelWorkbookData> {
  const XLSX = await getXLSX();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('O ficheiro Excel não contém nenhuma folha de cálculo válida.');
  }

  const firstSheetName = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRowsUnclean = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  const rawRows = rawRowsUnclean.map((row) => {
    const cleanRow: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      cleanRow[sanitizeExcelText(k)] = sanitizeExcelRawCell(v);
    }
    return cleanRow;
  });

  let rawHeaders: string[] = [];
  if (rawRows.length > 0) {
    rawHeaders = Object.keys(rawRows[0]);
  } else {
    // Attempt header extraction from worksheet range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
      if (cell && cell.v) rawHeaders.push(sanitizeExcelText(cell.v));
    }
  }

  const detectedMapping = autoDetectMatchColumnMapping(rawHeaders);

  return {
    fileName: file.name,
    sheetNames,
    activeSheetName: firstSheetName,
    rawHeaders,
    rawRows,
    detectedMapping
  };
}

/**
 * Switch sheet in Excel workbook
 */
export async function switchMatchExcelSheet(buffer: ArrayBuffer, sheetName: string): Promise<MatchExcelWorkbookData> {
  const XLSX = await getXLSX();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`Folha "${sheetName}" não encontrada no ficheiro.`);
  }

  const rawRowsUnclean = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  const rawRows = rawRowsUnclean.map((row) => {
    const cleanRow: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      cleanRow[sanitizeExcelText(k)] = sanitizeExcelRawCell(v);
    }
    return cleanRow;
  });
  const rawHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const detectedMapping = autoDetectMatchColumnMapping(rawHeaders);

  return {
    fileName: '',
    sheetNames: workbook.SheetNames,
    activeSheetName: sheetName,
    rawHeaders,
    rawRows,
    detectedMapping
  };
}

/**
 * Parses raw Excel rows into structured match rows with validation and duplicate checks
 */
export function parseMatchRows(
  rawRows: Record<string, any>[],
  mapping: MatchColumnMapping,
  existingMatches: Match[],
  currentSeason?: string
): ParsedMatchRow[] {
  const seasonFallback = currentSeason || defaultSeason();

  return rawRows.map((row, idx) => {
    const rawOpponent = mapping.opponent
      ? sanitizeExcelText(row[mapping.opponent])
      : sanitizeExcelText(row['ADVERSARIO'] || row['Adversário'] || '');
    const rawDate = mapping.date ? row[mapping.date] : null;
    const rawTime = mapping.time ? String(row[mapping.time] || '').trim() : '';
    const rawType = mapping.type ? row[mapping.type] : 'campeonato';
    const rawLocation = mapping.location ? row[mapping.location] : 'casa';
    const rawPhase = mapping.phase ? sanitizeExcelText(row[mapping.phase]) : '';
    const rawTournament = mapping.tournamentName ? sanitizeExcelText(row[mapping.tournamentName]) : '';
    const rawSeason = mapping.season ? String(row[mapping.season] || '').trim() : seasonFallback;
    const rawNotes = mapping.notes ? sanitizeExcelText(row[mapping.notes]) : '';

    // Handle goals & scores (support '3-1', '2x0', etc.)
    let goalsScored = 0;
    let goalsConceded = 0;

    const rawScoredVal = mapping.goalsScored ? String(row[mapping.goalsScored] || '').trim() : '';
    const rawConcededVal = mapping.goalsConceded ? String(row[mapping.goalsConceded] || '').trim() : '';

    if (rawScoredVal.includes('-') || rawScoredVal.includes('x') || rawScoredVal.includes(':')) {
      const parts = rawScoredVal.split(/[-x:]/).map((s) => s.trim());
      const s1 = parseInt(parts[0], 10);
      const s2 = parseInt(parts[1], 10);
      if (!isNaN(s1)) goalsScored = s1;
      if (!isNaN(s2)) goalsConceded = s2;
    } else {
      const parsedS = parseInt(rawScoredVal, 10);
      if (!isNaN(parsedS)) goalsScored = Math.max(0, parsedS);
      const parsedC = parseInt(rawConcededVal, 10);
      if (!isNaN(parsedC)) goalsConceded = Math.max(0, parsedC);
    }

    // Corners & Fouls
    let cornersFor: number | undefined;
    let cornersAgainst: number | undefined;
    let foulsCommitted: number | undefined;
    let foulsSuffered: number | undefined;

    if (mapping.cornersFor && row[mapping.cornersFor] !== undefined && row[mapping.cornersFor] !== '') {
      const val = parseInt(String(row[mapping.cornersFor]), 10);
      if (!isNaN(val)) cornersFor = Math.max(0, val);
    }
    if (mapping.cornersAgainst && row[mapping.cornersAgainst] !== undefined && row[mapping.cornersAgainst] !== '') {
      const val = parseInt(String(row[mapping.cornersAgainst]), 10);
      if (!isNaN(val)) cornersAgainst = Math.max(0, val);
    }
    if (mapping.foulsCommitted && row[mapping.foulsCommitted] !== undefined && row[mapping.foulsCommitted] !== '') {
      const val = parseInt(String(row[mapping.foulsCommitted]), 10);
      if (!isNaN(val)) foulsCommitted = Math.max(0, val);
    }
    if (mapping.foulsSuffered && row[mapping.foulsSuffered] !== undefined && row[mapping.foulsSuffered] !== '') {
      const val = parseInt(String(row[mapping.foulsSuffered]), 10);
      if (!isNaN(val)) foulsSuffered = Math.max(0, val);
    }

    const parsedDate = parseExcelDate(rawDate);
    const matchType = parseMatchType(rawType);
    const matchLocation = parseMatchLocation(rawLocation);

    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    if (!rawOpponent) {
      validationErrors.push('Nome do adversário em falta.');
    }

    if (!parsedDate) {
      validationErrors.push('Data do jogo inválida ou em falta.');
    }

    // Check duplicate with existing matches
    let isDuplicate = false;
    let duplicateWithMatchId: string | null = null;
    let duplicateMatchDescription: string | null = null;

    if (rawOpponent && parsedDate) {
      const normOpp = normalizeHeader(rawOpponent);
      const existing = existingMatches.find((m) => {
        const normExistingOpp = normalizeHeader(m.opponent);
        return (
          (normExistingOpp === normOpp || normExistingOpp.includes(normOpp) || normOpp.includes(normExistingOpp)) &&
          m.date === parsedDate
        );
      });

      if (existing) {
        isDuplicate = true;
        duplicateWithMatchId = existing.id;
        duplicateMatchDescription = `Jogo vs ${existing.opponent} em ${existing.date} (${existing.location === 'casa' ? 'Casa' : 'Fora'})`;
        validationWarnings.push(`Jogo duplicado detetado: vs ${existing.opponent} (${existing.date}).`);
      }
    }

    const isValid = validationErrors.length === 0;

    return {
      id: uid(),
      originalRowIndex: idx + 2,
      opponent: rawOpponent || 'Adversário Desconhecido',
      date: parsedDate,
      time: rawTime || '15:00',
      type: matchType,
      location: matchLocation,
      phase: rawPhase || undefined,
      tournamentName: rawTournament || undefined,
      season: rawSeason || seasonFallback,
      goalsScored,
      goalsConceded,
      cornersFor,
      cornersAgainst,
      foulsCommitted,
      foulsSuffered,
      notes: rawNotes || undefined,
      finished: true,
      isValid,
      validationErrors,
      validationWarnings,
      isDuplicate,
      duplicateWithMatchId,
      duplicateMatchDescription,
      duplicateAction: 'replace',
      selected: isValid
    };
  });
}

/**
 * Downloads official Excel Template for Matches
 */
export async function downloadMatchExcelTemplate(): Promise<void> {
  const XLSX = await getXLSX();

  const templateRows = [
    {
      Adversário: 'Sporting CP B',
      'Data (AAAA-MM-DD)': '2025-10-12',
      Hora: '15:30',
      'Tipo de Jogo': 'Campeonato',
      'Local (Casa/Fora)': 'Casa',
      'Jornada/Fase': 'Jornada 5',
      'Competição/Torneio': 'Campeonato Nacional',
      Época: '2025/2026',
      'Golos Marcados': 3,
      'Golos Sofridos': 1,
      'Cantos a Favor': 6,
      'Cantos Contra': 2,
      'Faltas Cometidas': 11,
      'Faltas Sofridas': 14,
      Notas: 'Excelente exibição com pressão alta na 1ª parte.'
    },
    {
      Adversário: 'SL Benfica B',
      'Data (AAAA-MM-DD)': '2025-10-19',
      Hora: '11:00',
      'Tipo de Jogo': 'Campeonato',
      'Local (Casa/Fora)': 'Fora',
      'Jornada/Fase': 'Jornada 6',
      'Competição/Torneio': 'Campeonato Nacional',
      Época: '2025/2026',
      'Golos Marcados': 2,
      'Golos Sofridos': 2,
      'Cantos a Favor': 4,
      'Cantos Contra': 5,
      'Faltas Cometidas': 15,
      'Faltas Sofridas': 12,
      Notas: 'Empate disputado até ao último minuto.'
    },
    {
      Adversário: 'FC Porto Sub-19',
      'Data (AAAA-MM-DD)': '2025-10-26',
      Hora: '16:00',
      'Tipo de Jogo': 'Torneio',
      'Local (Casa/Fora)': 'Casa',
      'Jornada/Fase': 'Quartos de Final',
      'Competição/Torneio': 'Taça Associação',
      Época: '2025/2026',
      'Golos Marcados': 1,
      'Golos Sofridos': 0,
      'Cantos a Favor': 7,
      'Cantos Contra': 3,
      'Faltas Cometidas': 9,
      'Faltas Sofridas': 16,
      Notas: 'Golo de canto aos 75m.'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jogos');

  XLSX.writeFile(wb, 'Modelo_Importacao_Jogos_BolaComVisao.xlsx');
}

/**
 * Builds full Match entity from parsed row
 */
export function buildMatchFromParsedRow(parsed: ParsedMatchRow, roster: Player[] = []): Match {
  const goals: GoalEvent[] = [];

  // Generate scored goal events
  for (let i = 0; i < parsed.goalsScored; i++) {
    goals.push({
      id: uid(),
      type: 'scored',
      minute: 20 + i * 25,
      scorerId: roster.length > 0 ? roster[i % roster.length].id : null,
      assistId: null,
      goalType: 'Bola jogada'
    });
  }

  // Generate conceded goal events
  for (let i = 0; i < parsed.goalsConceded; i++) {
    goals.push({
      id: uid(),
      type: 'conceded',
      minute: 35 + i * 30,
      scorerId: null,
      assistId: null,
      goalType: 'Bola jogada'
    });
  }

  return {
    id: parsed.id || uid(),
    opponent: parsed.opponent,
    date: parsed.date || new Date().toISOString().split('T')[0],
    type: parsed.type,
    location: parsed.location,
    phase: parsed.phase,
    tournamentName: parsed.tournamentName,
    season: parsed.season || defaultSeason(),
    finished: true,
    goals,
    subs: [],
    lineup: roster.slice(0, 11).map((p) => p.id),
    capitao: roster.length > 0 ? roster[0].id : null,
    cornersFor: parsed.cornersFor,
    cornersAgainst: parsed.cornersAgainst,
    foulsCommitted: parsed.foulsCommitted,
    foulsSuffered: parsed.foulsSuffered,
    notes: parsed.notes,
    finalScore: { scored: parsed.goalsScored, conceded: parsed.goalsConceded }
  };
}
