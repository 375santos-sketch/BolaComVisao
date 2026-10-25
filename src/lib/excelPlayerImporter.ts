import { Player, DominantFoot, PlayerStatus } from '../types';
import { uid, computeAge, sanitizeExcelText, sanitizeExcelRawCell } from './utils';

async function getXLSX() {
  return await import('xlsx');
}

export interface ColumnMapping {
  name: string; // Full Name
  birthDate: string; // Birth Date
  positions: string; // Position in field
  dominantFoot: string; // Dominant Foot
  number: string; // Shirt Number
  height: string; // Height
  weight: string; // Weight
  emergencyContact: string; // Emergency Contact Name & Phone
  emergencyPhone?: string; // Optional separate emergency phone column
  phone?: string; // Player phone
  email?: string; // Player email
  status?: string; // Status
}

export type DuplicateAction = 'replace' | 'skip';

export interface ParsedPlayerRow {
  id: string;
  originalRowIndex: number;
  name: string;
  birthDate: string | null;
  age: number | null;
  positions: string;
  dominantFoot: DominantFoot;
  number: number | null;
  height: string;
  weight: string;
  emergencyContact: string;
  phone: string;
  email: string;
  status: PlayerStatus;

  // Validation and Duplicate Detection
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];

  // Duplicate fields
  isDuplicate: boolean;
  duplicateWithPlayerId: string | null;
  duplicatePlayerName: string | null;
  numberClashPlayerName: string | null;
  duplicateAction: DuplicateAction;

  // Selection
  selected: boolean;
}

export interface SheetDetail {
  name: string;
  rowCount: number;
  headerRowIndex: number;
  score: number;
  hasPlayerKeywords: boolean;
}

export interface ExcelWorkbookData {
  fileName: string;
  sheetNames: string[];
  activeSheetName: string;
  rawHeaders: string[];
  rawRows: Record<string, any>[];
  detectedMapping: ColumnMapping;
  detectedHeaderRowIndex: number; // 0-based index
  totalRawRows: number;
  dataRowCount: number;
  sheetDetails: SheetDetail[];
  rawMatrix?: any[][];
}

/**
 * Normalizes string for header matching using sanitizeExcelText
 */
export function normalizeHeader(str: string): string {
  return sanitizeExcelText(str);
}

/**
 * Scores a potential header row based on presence of player-related keywords
 */
function scoreHeaderRow(row: any[]): { score: number; matchedFields: string[] } {
  if (!Array.isArray(row) || row.length === 0) return { score: 0, matchedFields: [] };

  let score = 0;
  const matchedFields: string[] = [];
  const normalizedCells = row.map((cell) => normalizeHeader(String(cell || ''))).filter((c) => c.length > 0);

  if (normalizedCells.length === 0) return { score: 0, matchedFields: [] };

  normalizedCells.forEach((norm) => {
    const normUpper = norm.toUpperCase();
    const normClean = normUpper.replace(/\s+/g, '');

    // Name (High value)
    if (
      normClean.includes('NOMECOMPLETO') ||
      normClean === 'NOME' ||
      normClean.includes('ATLETA') ||
      normClean.includes('JOGADOR') ||
      normClean.includes('FULLNAME') ||
      normClean === 'NAME' ||
      normClean.includes('NOMEDOATLETA') ||
      normClean.includes('NOMEDOJOGADOR') ||
      normClean.includes('JOGADORES') ||
      normClean.includes('ATLETAS') ||
      normUpper.includes('NOME')
    ) {
      if (!matchedFields.includes('name')) {
        score += 20;
        matchedFields.push('name');
      }
      return;
    }

    // Number / Shirt (High value)
    if (
      normClean.includes('NCAMISOLA') ||
      normClean.includes('NUMCAMISOLA') ||
      normClean.includes('CAMISOLA') ||
      normClean.includes('DORSAL') ||
      normClean === 'NUMERO' ||
      normClean === 'NUM' ||
      normClean === 'N' ||
      normClean === 'NUMBER' ||
      normClean === 'JERSEY' ||
      normClean.includes('NUMERODECAMISOLA') ||
      normClean.includes('UNIFORME') ||
      normUpper.includes('CAMISOLA')
    ) {
      if (!matchedFields.includes('number')) {
        score += 15;
        matchedFields.push('number');
      }
      return;
    }

    // Birth Date (High value)
    if (
      normClean.includes('DATANASCIMENTO') ||
      normClean.includes('DATADENASCIMENTO') ||
      normClean.includes('DATANASC') ||
      normClean.includes('NASCIMENTO') ||
      normClean.includes('BIRTHDATE') ||
      normClean.includes('DOB') ||
      normClean === 'NASC' ||
      normClean.includes('ANIVERSARIO') ||
      normUpper.includes('NASCIMENTO')
    ) {
      if (!matchedFields.includes('birthDate')) {
        score += 15;
        matchedFields.push('birthDate');
      }
      return;
    }

    // Position (High value)
    if (
      normClean.includes('POSICAO') ||
      normClean.includes('POSICAOCAMPING') ||
      normClean.includes('POSICAONOCAMPO') ||
      normClean === 'POS' ||
      normClean.includes('POSITION') ||
      normClean.includes('FUNCAO') ||
      normClean.includes('POSICOES') ||
      normUpper.includes('POSICAO')
    ) {
      if (!matchedFields.includes('positions')) {
        score += 15;
        matchedFields.push('positions');
      }
      return;
    }

    // Dominant Foot
    if (
      normClean.includes('PEDOMINANTE') ||
      normClean.includes('PEPREFERIDO') ||
      normClean === 'PE' ||
      normClean.includes('FOOT') ||
      normClean.includes('DOMINANTFOOT') ||
      normUpper.includes('PE')
    ) {
      if (!matchedFields.includes('dominantFoot')) {
        score += 10;
        matchedFields.push('dominantFoot');
      }
      return;
    }

    // Height / Weight
    if (
      normClean.includes('ALTURA') ||
      normClean.includes('HEIGHT') ||
      normClean === 'ALT' ||
      normClean.includes('ESTATURA') ||
      normUpper.includes('ALTURA')
    ) {
      if (!matchedFields.includes('height')) {
        score += 8;
        matchedFields.push('height');
      }
      return;
    }
    if (normClean.includes('PESO') || normClean.includes('WEIGHT') || normUpper.includes('PESO')) {
      if (!matchedFields.includes('weight')) {
        score += 8;
        matchedFields.push('weight');
      }
      return;
    }

    // Emergency Contact
    if (
      normClean.includes('EMERGENCIA') ||
      normClean.includes('EMERGENCY') ||
      normClean.includes('CONTACTOEMERG') ||
      normClean.includes('CONTATOEMERG') ||
      normClean.includes('ENCARREGADODEEDUCACAO') ||
      normClean.includes('TUTOR') ||
      normClean.includes('CONTACTOPAIS') ||
      normUpper.includes('EMERGENCIA')
    ) {
      if (!matchedFields.includes('emergencyContact')) {
        score += 10;
        matchedFields.push('emergencyContact');
      }
      return;
    }

    // Phone / Email / Status
    if (
      normClean.includes('TELEMOVEL') ||
      normClean.includes('TELEFONE') ||
      normClean === 'TEL' ||
      normClean === 'PHONE' ||
      normClean.includes('CONTACTO') ||
      normUpper.includes('TELEFONE') ||
      normUpper.includes('TELEMOVEL')
    ) {
      if (!matchedFields.includes('phone')) {
        score += 8;
        matchedFields.push('phone');
      }
      return;
    }
    if (
      normClean.includes('EMAIL') ||
      normClean.includes('CORREIOELETRONICO') ||
      normClean === 'MAIL' ||
      normUpper.includes('EMAIL')
    ) {
      if (!matchedFields.includes('email')) {
        score += 8;
        matchedFields.push('email');
      }
      return;
    }
    if (
      normClean.includes('ESTADO') ||
      normClean.includes('STATUS') ||
      normClean.includes('SITUACAO') ||
      normClean.includes('DISPONIBILIDADE') ||
      normUpper.includes('ESTADO')
    ) {
      if (!matchedFields.includes('status')) {
        score += 8;
        matchedFields.push('status');
      }
      return;
    }
  });

  return { score, matchedFields };
}

/**
 * Auto-detects the header row from a 2D sheet matrix scanning up to maxScanRows (default 25)
 */
function detectHeaderRowInMatrix(
  matrix: any[][],
  maxScanRows = 25
): { headerRowIndex: number; rawHeaders: string[]; score: number } {
  if (!matrix || matrix.length === 0) {
    return { headerRowIndex: 0, rawHeaders: [], score: 0 };
  }

  let bestIndex = 0;
  let bestScore = -1;
  const scanLimit = Math.min(matrix.length, maxScanRows);

  for (let i = 0; i < scanLimit; i++) {
    const row = matrix[i];
    const { score } = scoreHeaderRow(row);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // If score is 0, fallback to first row with at least 2 non-empty text cells
  if (bestScore <= 0) {
    for (let i = 0; i < scanLimit; i++) {
      const row = matrix[i];
      if (Array.isArray(row)) {
        const textCells = row.filter((c) => c !== null && c !== undefined && String(c).trim().length > 0);
        if (textCells.length >= 2) {
          bestIndex = i;
          bestScore = 1;
          break;
        }
      }
    }
  }

  const rawHeaderRow = matrix[bestIndex] || [];
  const rawHeaders: string[] = [];
  const seenHeaderNames = new Map<string, number>();

  rawHeaderRow.forEach((cellVal, colIdx) => {
    const cleanVal = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '';
    let headerName = cleanVal || `Coluna_${colIdx + 1}`;

    const occurrences = (seenHeaderNames.get(headerName) || 0) + 1;
    seenHeaderNames.set(headerName, occurrences);
    if (occurrences > 1) {
      headerName = `${headerName}_${occurrences}`;
    }

    rawHeaders.push(headerName);
  });

  // Remove trailing blank column placeholders if not needed
  while (rawHeaders.length > 0 && rawHeaders[rawHeaders.length - 1].startsWith('Coluna_') && rawHeaders.length > 1) {
    // Check if any data exists in this trailing column
    const colIdx = rawHeaders.length - 1;
    let hasData = false;
    for (let r = bestIndex + 1; r < matrix.length; r++) {
      if (matrix[r] && matrix[r][colIdx] !== undefined && String(matrix[r][colIdx]).trim() !== '') {
        hasData = true;
        break;
      }
    }
    if (!hasData) {
      rawHeaders.pop();
    } else {
      break;
    }
  }

  return {
    headerRowIndex: bestIndex,
    rawHeaders,
    score: bestScore
  };
}

/**
 * Converts a 2D sheet matrix into row objects using the specified header row index
 */
function extractRowsFromMatrix(matrix: any[][], headerRowIndex: number, headers: string[]): Record<string, any>[] {
  const rows: Record<string, any>[] = [];

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const rawRow = matrix[r];
    if (!rawRow || !Array.isArray(rawRow)) continue;

    // Check if row has any non-empty cell
    const hasContent = rawRow.some((c) => c !== null && c !== undefined && String(c).trim().length > 0);
    if (!hasContent) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((header, colIdx) => {
      const val = rawRow[colIdx];
      rowObj[header] = val !== undefined && val !== null ? val : '';
    });

    rows.push(rowObj);
  }

  return rows;
}

/**
 * Auto-detects column mappings with deep alias normalization
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
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
  };

  headers.forEach((h) => {
    const norm = normalizeHeader(h);
    if (!norm) return;
    const normUpper = norm.toUpperCase();
    const normClean = normUpper.replace(/\s+/g, '');

    // 1. Name
    if (
      !mapping.name &&
      (normClean.includes('NOMECOMPLETO') ||
        normClean === 'NOME' ||
        normClean.includes('ATLETA') ||
        normClean.includes('JOGADOR') ||
        normClean.includes('FULLNAME') ||
        normClean === 'NAME' ||
        normClean.includes('NOMEDOATLETA') ||
        normClean.includes('NOMEDOJOGADOR') ||
        normClean.includes('JOGADORES') ||
        normClean.includes('ATLETAS') ||
        normClean.includes('NOMEEAPELIDO') ||
        normClean.includes('PRIMEIRONOME') ||
        normUpper.includes('NOME'))
    ) {
      mapping.name = h;
      return;
    }

    // 2. Number / Jersey
    if (
      !mapping.number &&
      (normClean.includes('NCAMISOLA') ||
        normClean.includes('NUMCAMISOLA') ||
        normClean.includes('CAMISOLA') ||
        normClean.includes('DORSAL') ||
        normClean === 'NUMERO' ||
        normClean === 'NUM' ||
        normClean === 'N' ||
        normClean === 'NUMBER' ||
        normClean === 'JERSEY' ||
        normClean.includes('NUMERODECAMISOLA') ||
        normClean.includes('NUNIFORME') ||
        normClean.includes('UNIFORME') ||
        normClean.includes('SHIRTNUMBER') ||
        normUpper.includes('CAMISOLA'))
    ) {
      mapping.number = h;
      return;
    }

    // 3. Position
    if (
      !mapping.positions &&
      (normClean.includes('POSICAO') ||
        normClean.includes('POSICAOCAMPING') ||
        normClean.includes('POSICAONOCAMPO') ||
        normClean.includes('POSICAODECAMPO') ||
        normClean.includes('POSICAOPRINCIPAL') ||
        normClean === 'POS' ||
        normClean.includes('POSITION') ||
        normClean.includes('FUNCAO') ||
        normClean.includes('POSICOES') ||
        normClean.includes('POSICOE') ||
        normClean.includes('ROLE') ||
        normUpper.includes('POSICAO'))
    ) {
      mapping.positions = h;
      return;
    }

    // 4. Birth Date
    if (
      !mapping.birthDate &&
      (normClean.includes('DATANASCIMENTO') ||
        normClean.includes('DATADENASCIMENTO') ||
        normClean.includes('DATANASC') ||
        normClean.includes('NASCIMENTO') ||
        normClean.includes('BIRTHDATE') ||
        normClean.includes('DATEOFBIRTH') ||
        normClean.includes('DOB') ||
        normClean === 'NASC' ||
        normClean.includes('ANIVERSARIO') ||
        normClean.includes('DATANASCIM') ||
        normClean === 'DATA' ||
        normUpper.includes('NASCIMENTO'))
    ) {
      mapping.birthDate = h;
      return;
    }

    // 5. Dominant Foot
    if (
      !mapping.dominantFoot &&
      (normClean.includes('PEDOMINANTE') ||
        normClean.includes('PEPREFERIDO') ||
        normClean === 'PE' ||
        normClean.includes('FOOT') ||
        normClean.includes('DOMINANTFOOT') ||
        normClean.includes('PREFERREDFOOT') ||
        normClean.includes('DESTROCANHOTO') ||
        normUpper.includes('PE'))
    ) {
      mapping.dominantFoot = h;
      return;
    }

    // 6. Height
    if (
      !mapping.height &&
      (normClean.includes('ALTURA') ||
        normClean.includes('HEIGHT') ||
        normClean === 'ALT' ||
        normClean.includes('ESTATURA') ||
        normUpper.includes('ALTURA'))
    ) {
      mapping.height = h;
      return;
    }

    // 7. Weight
    if (
      !mapping.weight &&
      (normClean.includes('PESO') || normClean.includes('WEIGHT') || normClean === 'KG' || normUpper.includes('PESO'))
    ) {
      mapping.weight = h;
      return;
    }

    // 8. Emergency Contact
    if (
      !mapping.emergencyContact &&
      (normClean.includes('NOMEEEXCONTACTODEEMERGENCIA') ||
        normClean.includes('NOMEEEMERGENCIA') ||
        normClean.includes('CONTACTODEEMERGENCIA') ||
        normClean.includes('CONTATODEEMERGENCIA') ||
        normClean.includes('EMERGENCIA') ||
        normClean.includes('EMERGENCY') ||
        normClean.includes('CONTACTOEMERGENCIA') ||
        normClean.includes('CONTATOEMERGENCIA') ||
        normClean.includes('ENCARREGADODEEDUCACAO') ||
        normClean.includes('ENCARREGADO') ||
        normClean.includes('TUTOR') ||
        normClean.includes('CONTACTOPAIS') ||
        normClean.includes('RESPONSAVEL') ||
        normClean.includes('PAIS') ||
        normUpper.includes('EMERGENCIA'))
    ) {
      mapping.emergencyContact = h;
      return;
    }

    // 9. Emergency Phone (separate)
    if (
      !mapping.emergencyPhone &&
      (normClean.includes('TELEFONEEMERGENCIA') ||
        normClean.includes('TELEMOVELEMERGENCIA') ||
        normClean.includes('CONTACTOEMERG') ||
        normClean.includes('CELULAREMERGENCIA'))
    ) {
      mapping.emergencyPhone = h;
      return;
    }

    // 10. Phone
    if (
      !mapping.phone &&
      (normClean.includes('TELEMOVEL') ||
        normClean.includes('TELEFONE') ||
        normClean.includes('CELULAR') ||
        normClean === 'TEL' ||
        normClean === 'PHONE' ||
        normClean === 'MOBILE' ||
        normClean.includes('CONTACTO') ||
        normClean.includes('CONTATO') ||
        normUpper.includes('TELEFONE') ||
        normUpper.includes('TELEMOVEL'))
    ) {
      mapping.phone = h;
      return;
    }

    // 11. Email
    if (
      !mapping.email &&
      (normClean.includes('EMAIL') ||
        normClean.includes('CORREIOELETRONICO') ||
        normClean === 'MAIL' ||
        normUpper.includes('EMAIL'))
    ) {
      mapping.email = h;
      return;
    }

    // 12. Status
    if (
      !mapping.status &&
      (normClean.includes('ESTADO') ||
        normClean.includes('STATUS') ||
        normClean.includes('SITUACAO') ||
        normClean.includes('DISPONIBILIDADE') ||
        normClean.includes('CONDICAO') ||
        normUpper.includes('ESTADO'))
    ) {
      mapping.status = h;
      return;
    }
  });

  return mapping;
}

/**
 * Parses and formats Date string / Excel date serial into YYYY-MM-DD
 */
function formatExcelDate(val: any): string | null {
  if (val === null || val === undefined || val === '') return null;

  // If it's already a JS Date
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }

  // If it's an Excel numeric serial date (e.g. 38500)
  if (typeof val === 'number' && val > 1000) {
    try {
      const utc_days = Math.floor(val - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      if (!isNaN(date_info.getTime())) {
        const year = date_info.getUTCFullYear();
        const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date_info.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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

  // Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format: DD/MM/YY (2-digit year)
  const dmyShortMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (dmyShortMatch) {
    const day = dmyShortMatch[1].padStart(2, '0');
    const month = dmyShortMatch[2].padStart(2, '0');
    const shortYear = parseInt(dmyShortMatch[3], 10);
    const fullYear = shortYear > 40 ? 1900 + shortYear : 2000 + shortYear;
    return `${fullYear}-${month}-${day}`;
  }

  // Format: YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    if (year >= 1950 && year <= new Date().getFullYear()) {
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return str;
}

/**
 * Normalizes Dominant Foot
 */
function normalizeDominantFoot(val: any): DominantFoot {
  if (!val) return 'Direito';
  const str = String(val).toLowerCase().trim();
  if (str.includes('esq') || str === 'e' || str === 'l' || str.includes('left') || str.includes('canhoto'))
    return 'Esquerdo';
  if (str.includes('amb') || str.includes('ambos') || str.includes('both') || str === 'a') return 'Ambidestro';
  return 'Direito';
}

/**
 * Normalizes Player Number
 */
export function normalizePlayerNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Normalizes Height (e.g. 1.82m, 182cm -> 1.82 M)
 */
export function normalizeHeight(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).trim();
  if (!str) return '';

  // If formatted like 1,82 or 1.82
  const matchDecimal = str.match(/^([12])[,.]([0-9]{1,2})/);
  if (matchDecimal) {
    const meters = matchDecimal[1];
    const cm = matchDecimal[2].padEnd(2, '0');
    return `${meters}.${cm} M`;
  }

  // If formatted like 182 or 182cm
  const matchCm = str.match(/^([12][0-9]{2})/);
  if (matchCm) {
    const valNum = parseInt(matchCm[1], 10);
    return `${(valNum / 100).toFixed(2)} M`;
  }

  return '';
}

/**
 * Normalizes Weight (e.g. 75 -> 75 KG)
 */
export function normalizeWeight(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).trim();
  if (!str) return '';

  const numMatch = str.match(/^([0-9]{2,3}(?:[,.][0-9])?)/);
  if (numMatch) {
    const numClean = numMatch[1].replace(',', '.');
    return `${numClean} KG`;
  }

  return '';
}

/**
 * Normalizes Position string
 */
function normalizePosition(val: any): string {
  if (!val) return 'Jogador';
  const str = String(val).trim();
  if (!str) return 'Jogador';

  const low = str.toLowerCase();
  if (
    low === 'gr' ||
    low.includes('guarda-redes') ||
    low.includes('guarda redes') ||
    low.includes('gk') ||
    low.includes('portero') ||
    low.includes('goalkeeper') ||
    low.includes('goleiro')
  )
    return 'Guarda-Redes (GR)';
  if (
    low === 'dc' ||
    low.includes('central') ||
    low.includes('defesa central') ||
    low.includes('cb') ||
    low.includes('stopper') ||
    low.includes('zagueiro')
  )
    return 'Defesa Central (DC)';
  if (low === 'ld' || low.includes('lateral direito') || low.includes('rb') || low.includes('ala direito'))
    return 'Lateral Direito (LD)';
  if (low === 'le' || low.includes('lateral esquerdo') || low.includes('lb') || low.includes('ala esquerdo'))
    return 'Lateral Esquerdo (LE)';
  if (
    low === 'mdf' ||
    low.includes('defensivo') ||
    low.includes('trinco') ||
    low.includes('cdm') ||
    low.includes('dm') ||
    low.includes('volante')
  )
    return 'Médio Defensivo (MDF)';
  if (
    low === 'mc' ||
    low.includes('medio centro') ||
    low.includes('médio centro') ||
    low.includes('cm') ||
    low.includes('meio campo') ||
    low.includes('meia')
  )
    return 'Médio Centro (MC)';
  if (
    low === 'mo' ||
    low.includes('ofensivo') ||
    low.includes('medio ofensivo') ||
    low.includes('médio ofensivo') ||
    low.includes('cam') ||
    low.includes('10')
  )
    return 'Médio Ofensivo (MO)';
  if (
    low === 'ed' ||
    low.includes('extremo direito') ||
    low.includes('ponta direita') ||
    low.includes('rw') ||
    low.includes('wing direito')
  )
    return 'Extremo Direito (ED)';
  if (
    low === 'ee' ||
    low.includes('extremo esquerdo') ||
    low.includes('ponta esquerda') ||
    low.includes('lw') ||
    low.includes('wing esquerdo')
  )
    return 'Extremo Esquerdo (EE)';
  if (
    low === 'pl' ||
    low === 'ac' ||
    low.includes('avancado') ||
    low.includes('avançado') ||
    low.includes('ponta de lanca') ||
    low.includes('ponta de lança') ||
    low.includes('st') ||
    low.includes('cf') ||
    low.includes('atacante') ||
    low.includes('centroavante') ||
    low.includes('9')
  )
    return 'Avançado Centro (PL/AC)';

  return str;
}

/**
 * Normalizes Emergency Contact (combines Name and Phone if applicable)
 */
function normalizeEmergencyContact(contactVal: any, phoneVal?: any): string {
  const contactStr = contactVal ? String(contactVal).trim() : '';
  const phoneStr = phoneVal ? String(phoneVal).trim() : '';

  if (contactStr && phoneStr && !contactStr.includes(phoneStr)) {
    return `${contactStr} (${phoneStr})`;
  }
  return contactStr || phoneStr || '';
}

/**
 * Reads an Excel/CSV file from browser with dynamic header scanning and intelligent sheet selection
 */
export async function readExcelFile(file: File): Promise<ExcelWorkbookData> {
  const XLSX = await getXLSX();
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('O ficheiro Excel não contém nenhuma folha com dados.');
  }

  // Scan all sheets to calculate row counts and header scores
  const sheetDetails: SheetDetail[] = [];
  let bestSheetName = workbook.SheetNames[0];
  let bestSheetScore = -1;

  workbook.SheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    if (!ws) return;

    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
      blankrows: false
    });
    const matrix = rawMatrix.map((row) => (Array.isArray(row) ? row.map(sanitizeExcelRawCell) : []));

    const totalRows = matrix.length;
    const { headerRowIndex, score } = detectHeaderRowInMatrix(matrix, 25);
    const hasPlayerKeywords = score >= 10;

    // Bonus score if sheet name itself matches player/plantel keywords
    const normSheetName = normalizeHeader(name);
    let nameBonus = 0;
    if (
      normSheetName.includes('plantel') ||
      normSheetName.includes('jogadores') ||
      normSheetName.includes('atletas') ||
      normSheetName.includes('roster') ||
      normSheetName.includes('equipa') ||
      normSheetName.includes('players')
    ) {
      nameBonus = 15;
    }

    const totalSheetScore = score + nameBonus;

    sheetDetails.push({
      name,
      rowCount: totalRows,
      headerRowIndex,
      score: totalSheetScore,
      hasPlayerKeywords
    });

    if (totalSheetScore > bestSheetScore && totalRows > 1) {
      bestSheetScore = totalSheetScore;
      bestSheetName = name;
    }
  });

  const activeSheetName = bestSheetName;
  const worksheet = workbook.Sheets[activeSheetName];
  const rawActiveMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
    blankrows: false
  });
  const activeMatrix = rawActiveMatrix.map((row) => (Array.isArray(row) ? row.map(sanitizeExcelRawCell) : []));

  if (activeMatrix.length === 0) {
    throw new Error('A folha do ficheiro Excel está vazia ou sem linhas de dados.');
  }

  const { headerRowIndex, rawHeaders } = detectHeaderRowInMatrix(activeMatrix, 25);
  const rawRows = extractRowsFromMatrix(activeMatrix, headerRowIndex, rawHeaders);

  if (rawRows.length === 0 && activeMatrix.length > 0) {
    // If extraction resulted in 0 rows, try index 0 as fallback
    const fallbackHeaders = (activeMatrix[0] || []).map((c, i) => String(c || `Coluna_${i + 1}`).trim());
    const fallbackRows = extractRowsFromMatrix(activeMatrix, 0, fallbackHeaders);
    const detectedMapping = autoDetectColumnMapping(fallbackHeaders);

    return {
      fileName: file.name,
      sheetNames: workbook.SheetNames,
      activeSheetName,
      rawHeaders: fallbackHeaders,
      rawRows: fallbackRows,
      detectedMapping,
      detectedHeaderRowIndex: 0,
      totalRawRows: activeMatrix.length,
      dataRowCount: fallbackRows.length,
      sheetDetails,
      rawMatrix: activeMatrix
    };
  }

  const detectedMapping = autoDetectColumnMapping(rawHeaders);

  return {
    fileName: file.name,
    sheetNames: workbook.SheetNames,
    activeSheetName,
    rawHeaders,
    rawRows,
    detectedMapping,
    detectedHeaderRowIndex: headerRowIndex,
    totalRawRows: activeMatrix.length,
    dataRowCount: rawRows.length,
    sheetDetails,
    rawMatrix: activeMatrix
  };
}

/**
 * Re-parses a sheet matrix using a manually selected header row index
 */
export function reParseWithCustomHeaderRow(
  matrix: any[][],
  customHeaderRowIndex: number
): {
  rawHeaders: string[];
  rawRows: Record<string, any>[];
  detectedMapping: ColumnMapping;
  detectedHeaderRowIndex: number;
} {
  const safeIndex = Math.max(0, Math.min(matrix.length - 1, customHeaderRowIndex));
  const rawHeaderRow = matrix[safeIndex] || [];
  const rawHeaders: string[] = [];
  const seenHeaderNames = new Map<string, number>();

  rawHeaderRow.forEach((cellVal, colIdx) => {
    const cleanVal = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '';
    let headerName = cleanVal || `Coluna_${colIdx + 1}`;

    const occurrences = (seenHeaderNames.get(headerName) || 0) + 1;
    seenHeaderNames.set(headerName, occurrences);
    if (occurrences > 1) {
      headerName = `${headerName}_${occurrences}`;
    }
    rawHeaders.push(headerName);
  });

  const rawRows = extractRowsFromMatrix(matrix, safeIndex, rawHeaders);
  const detectedMapping = autoDetectColumnMapping(rawHeaders);

  return {
    rawHeaders,
    rawRows,
    detectedMapping,
    detectedHeaderRowIndex: safeIndex
  };
}

/**
 * Switches the active sheet in a workbook and returns fresh rows & detected mapping with dynamic header scan
 */
export async function switchExcelSheet(
  fileData: ArrayBuffer,
  sheetName: string
): Promise<{
  rawHeaders: string[];
  rawRows: Record<string, any>[];
  detectedMapping: ColumnMapping;
  detectedHeaderRowIndex: number;
  totalRawRows: number;
  dataRowCount: number;
  rawMatrix: any[][];
}> {
  const XLSX = await getXLSX();
  const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`A folha "${sheetName}" não foi encontrada no ficheiro.`);
  }

  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
    blankrows: false
  });
  const matrix = rawMatrix.map((row) => (Array.isArray(row) ? row.map(sanitizeExcelRawCell) : []));

  if (matrix.length === 0) {
    throw new Error(`A folha "${sheetName}" está vazia.`);
  }

  const { headerRowIndex, rawHeaders } = detectHeaderRowInMatrix(matrix, 25);
  const rawRows = extractRowsFromMatrix(matrix, headerRowIndex, rawHeaders);
  const detectedMapping = autoDetectColumnMapping(rawHeaders);

  return {
    rawHeaders,
    rawRows,
    detectedMapping,
    detectedHeaderRowIndex: headerRowIndex,
    totalRawRows: matrix.length,
    dataRowCount: rawRows.length,
    rawMatrix: matrix
  };
}

/**
 * Strict player name normalizer for duplicate prevention.
 * Uses sanitizeExcelText to ensure exact uppercase, accent-free, symbol-free comparison.
 */
export function normalizePlayerName(name: string): string {
  return sanitizeExcelText(name);
}

/**
 * Parses raw Excel rows into structured ParsedPlayerRow objects based on column mapping
 * Compares against existing roster to identify duplicates and jersey number clashes
 */
export function parseRosterRows(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  existingRoster: Player[] = []
): ParsedPlayerRow[] {
  // Map all existing players by normalized name and jersey number
  const existingByNameMap = new Map<string, Player>();
  existingRoster.forEach((p) => {
    if (!p.name) return;
    const normalized = normalizePlayerName(p.name);
    if (normalized) existingByNameMap.set(normalized, p);
  });

  // Map existing players by jersey number
  const existingByNumberMap = new Map<number, Player>();
  existingRoster.forEach((p) => {
    if (p.number !== null && p.number !== undefined) {
      existingByNumberMap.set(p.number, p);
    }
  });

  // Track names seen inside this sheet to detect duplicates inside the file itself
  const seenNamesInSheet = new Map<string, { id: string; name: string; rowIndex: number }>();
  // Track jersey numbers in sheet
  const seenNumbersInSheet = new Map<number, number>(); // number -> count

  return rows.map((row, idx) => {
    const rawName = mapping.name
      ? row[mapping.name]
      : row['Nome'] ||
        row['Nome Completo'] ||
        row['Jogador'] ||
        row['Atleta'] ||
        row['NOME'] ||
        row['NOME COMPLETO'] ||
        '';
    const name = sanitizeExcelText(rawName);
    const normName = normalizePlayerName(name);

    const rawNumber = mapping.number
      ? row[mapping.number]
      : row['Nº'] || row['Camisola'] || row['Dorsal'] || row['Numero'] || row['CAMISOLA'] || row['N DE CAMISOLA'] || '';
    const number = normalizePlayerNumber(rawNumber);

    const rawPos = mapping.positions
      ? row[mapping.positions]
      : row['Posição'] || row['Posicao'] || row['Pos'] || row['POSICAO'] || '';
    const positions = sanitizeExcelText(normalizePosition(rawPos));

    const rawBirth = mapping.birthDate
      ? row[mapping.birthDate]
      : row['Data de Nascimento'] || row['Nascimento'] || row['Data'] || row['DATA DE NASCIMENTO'] || '';
    const birthDate = formatExcelDate(rawBirth);
    const age = birthDate ? computeAge(birthDate) : null;

    const rawFoot = mapping.dominantFoot
      ? row[mapping.dominantFoot]
      : row['Pé Dominante'] || row['Pé'] || row['Pe'] || row['PE DOMINANTE'] || '';
    const dominantFoot = normalizeDominantFoot(rawFoot);

    const rawHeight = mapping.height ? row[mapping.height] : row['Altura'] || row['ALTURA'] || '';
    const height = normalizeHeight(rawHeight);

    const rawWeight = mapping.weight ? row[mapping.weight] : row['Peso'] || row['PESO'] || '';
    const weight = normalizeWeight(rawWeight);

    const rawEmerg = mapping.emergencyContact
      ? row[mapping.emergencyContact]
      : row['Nome e Contato de Emergência'] ||
        row['Contacto Emergência'] ||
        row['Emergência'] ||
        row['Encarregado de Educação'] ||
        row['NOME E CONTATO DE EMERGENCIA'] ||
        '';
    const rawEmergPhone = mapping.emergencyPhone ? row[mapping.emergencyPhone] : '';
    const emergencyContact = sanitizeExcelText(normalizeEmergencyContact(rawEmerg, rawEmergPhone));

    const rawPhone = mapping.phone
      ? row[mapping.phone]
      : row['Telefone'] || row['Telemóvel'] || row['Contacto'] || row['TELEFONE'] || row['TELEMOVEL DO JOGADOR'] || '';
    const phone = String(rawPhone || '').replace(/\D/g, '');

    const rawEmail = mapping.email
      ? row[mapping.email]
      : row['Email'] || row['Correio Eletrónico'] || row['EMAIL'] || '';
    const email = String(rawEmail || '')
      .trim()
      .toLowerCase();

    const rawStatus = mapping.status ? row[mapping.status] : row['Estado'] || row['Status'] || '';
    let status: PlayerStatus = 'disponivel';
    const statusLow = String(rawStatus || '').toLowerCase();
    if (statusLow.includes('lesion') || statusLow.includes('injured')) status = 'lesionado';
    else if (statusLow.includes('susp')) status = 'suspenso';
    else if (statusLow.includes('inat') || statusLow.includes('inact')) status = 'inativo';

    // Errors & Warnings
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Validation: Name is mandatory
    if (!name) {
      validationErrors.push('Nome do atleta é obrigatório');
    }

    // Validation: BirthDate
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      validationWarnings.push(`Formato de data incomum: "${birthDate}"`);
    } else if (birthDate) {
      const year = parseInt(birthDate.slice(0, 4), 10);
      const currentYear = new Date().getFullYear();
      if (year < 1950 || year > currentYear) {
        validationWarnings.push(`Ano de nascimento improvável (${year})`);
      }
    }

    // Duplicate Check against existing roster OR previous row in sheet by Name
    let existingPlayer: Player | null = null;
    if (normName && existingByNameMap.has(normName)) {
      existingPlayer = existingByNameMap.get(normName)!;
    } else if (normName) {
      existingPlayer =
        existingRoster.find((p) => {
          if (!p.name) return false;
          return normalizePlayerName(p.name) === normName;
        }) || null;
    }

    const previousInSheet = !existingPlayer && normName ? seenNamesInSheet.get(normName) : null;
    const isDuplicate = !!existingPlayer || !!previousInSheet;
    const duplicateWithPlayerId = existingPlayer ? existingPlayer.id : previousInSheet ? previousInSheet.id : null;
    const duplicatePlayerName = existingPlayer ? existingPlayer.name : previousInSheet ? previousInSheet.name : null;

    const rowId = uid();

    if (name && normName && !seenNamesInSheet.has(normName)) {
      seenNamesInSheet.set(normName, { id: rowId, name, rowIndex: idx + 1 });
    }

    if (isDuplicate) {
      if (existingPlayer) {
        validationWarnings.push(
          `Atleta "${existingPlayer.name}" já existe no plantel (os dados serão alterados/atualizados)`
        );
      } else if (previousInSheet) {
        validationWarnings.push(`Nome repetido nesta folha (linha ${previousInSheet.rowIndex}) — será unificado`);
      }
    }

    // Number clash check
    let numberClashPlayerName: string | null = null;
    if (number !== null) {
      const existingWithNumber = existingByNumberMap.get(number);
      if (existingWithNumber && (!existingPlayer || existingWithNumber.id !== existingPlayer.id)) {
        numberClashPlayerName = existingWithNumber.name;
        validationWarnings.push(`Camisola #${number} já atribuída a ${existingWithNumber.name}`);
      }

      // Check if repeated in the sheet
      const occurrences = (seenNumbersInSheet.get(number) || 0) + 1;
      seenNumbersInSheet.set(number, occurrences);
      if (occurrences > 1) {
        validationWarnings.push(`Camisola #${number} repetida na folha Excel (${occurrences}x)`);
      }
    }

    // Default action for duplicates: ONLY 'replace' (alterar dados) or 'skip' (ignorar)
    const duplicateAction: DuplicateAction = 'replace';
    const isValid = validationErrors.length === 0 && name.length > 0;

    return {
      id: rowId,
      originalRowIndex: idx + 1,
      name,
      birthDate,
      age,
      positions,
      dominantFoot,
      number,
      height,
      weight,
      emergencyContact,
      phone,
      email,
      status,
      isValid,
      validationErrors,
      validationWarnings,
      isDuplicate,
      duplicateWithPlayerId,
      duplicatePlayerName,
      numberClashPlayerName,
      duplicateAction,
      selected: isValid
    };
  });
}

/**
 * Downloads a pre-formatted Excel template for player import with header styling and example rows
 */
export async function downloadExcelPlayerTemplate(clubName: string = 'BolaComVisao FC') {
  const XLSX = await getXLSX();
  const headers = [
    'Nº de Camisola',
    'Nome Completo',
    'Data de Nascimento',
    'Posição em Campo',
    'Pé dominante',
    'Altura',
    'Peso',
    'Nome e Contato de Emergência',
    'Telefone do Jogador',
    'Email',
    'Estado'
  ];

  const sampleRows = [
    [
      1,
      'Rodrigo Silva Fernandes',
      '2007-03-15',
      'Guarda-Redes (GR)',
      'Direito',
      '1.88 m',
      '80 kg',
      'Carlos Fernandes (Pai) - 912 345 678',
      '912 111 222',
      'rodrigo.fernandes@exemplo.com',
      'Disponível'
    ],
    [
      4,
      'Martim Alves Pereira',
      '2007-07-22',
      'Defesa Central (DC)',
      'Direito',
      '1.85 m',
      '77 kg',
      'Ana Pereira (Mãe) - 963 852 741',
      '963 111 333',
      'martim.pereira@exemplo.com',
      'Disponível'
    ],
    [
      3,
      'Tiago Miguel Santos',
      '2008-01-10',
      'Lateral Esquerdo (LE)',
      'Esquerdo',
      '1.76 m',
      '68 kg',
      'Manuel Santos (Pai) - 934 567 890',
      '934 222 444',
      'tiago.santos@exemplo.com',
      'Disponível'
    ],
    [
      6,
      'Bernardo Costa Ribeiro',
      '2007-11-05',
      'Médio Defensivo (MDF)',
      'Direito',
      '1.81 m',
      '74 kg',
      'Sofia Ribeiro (Mãe) - 918 273 645',
      '918 333 555',
      'bernardo.costa@exemplo.com',
      'Disponível'
    ],
    [
      10,
      'Gabriel Lourenço Antunes',
      '2007-05-18',
      'Médio Ofensivo (MO)',
      'Ambidestro',
      '1.74 m',
      '66 kg',
      'João Antunes (Pai) - 929 384 756',
      '929 444 666',
      'gabriel.antunes@exemplo.com',
      'Disponível'
    ],
    [
      7,
      'Lucas Ferreira Martins',
      '2008-09-03',
      'Extremo Direito (ED)',
      'Direito',
      '1.78 m',
      '70 kg',
      'Helena Martins (Mãe) - 917 283 940',
      '917 555 777',
      'lucas.martins@exemplo.com',
      'Disponível'
    ],
    [
      9,
      'Afonso Henrique Neves',
      '2007-02-28',
      'Avançado Centro (PL/AC)',
      'Direito',
      '1.83 m',
      '76 kg',
      'Rui Neves (Pai) - 968 192 837',
      '968 666 888',
      'afonso.neves@exemplo.com',
      'Disponível'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    ['⚽ BolaComVisao - Modelo Oficial de Importação de Plantel / Jogadores'],
    ['CLUBE:', clubName, 'DATA:', new Date().toLocaleDateString('pt-PT')],
    [
      'INSTRUÇÕES:',
      'Preencha os dados dos atletas nas colunas abaixo. O Nome Completo é obrigatório. As datas devem estar em YYYY-MM-DD ou DD/MM/AAAA.'
    ],
    [], // Blank separator
    headers,
    ...sampleRows
  ]);

  ws['!cols'] = [
    { wch: 15 }, // Nº
    { wch: 28 }, // Nome Completo
    { wch: 20 }, // Data Nasc
    { wch: 24 }, // Posição
    { wch: 16 }, // Pé
    { wch: 12 }, // Altura
    { wch: 12 }, // Peso
    { wch: 38 }, // Emergência
    { wch: 20 }, // Telefone
    { wch: 30 }, // Email
    { wch: 14 } // Estado
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantel');

  XLSX.writeFile(wb, `Modelo_Importacao_Plantel_BolaComVisao.xlsx`);
}
