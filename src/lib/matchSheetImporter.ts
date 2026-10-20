import { Match, Player, GoalEvent, CardEvent, SubEvent, MatchPeriod, ScheduledMatch } from '../types';
import { uid, formatMinute } from './utils';
import { parseMatchType } from './matchExcelImporter';

/**
 * Reads back a "Ficha de Jogo" workbook produced by exportMatchSheetExcel / buildMatchSheetExcelWorkbook
 * so that a match can be recovered from the Excel file the coach exported.
 */

export const MATCH_SHEET_NAME = 'FICHA DE JOGO';

export interface MatchSheetImportResult {
  match: Match;
  warnings: string[];
}

const GOAL_TYPE_LABELS = [
  'Canto',
  'Livre',
  'Penálti',
  'Recuperação de bola',
  'Saída do pontapé de baliza',
  'Pontapé de baliza',
  'Ressalto',
  'Bola jogada',
  'Outro'
];

const fold = (v: unknown): string =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

const cell = (row: unknown[], i: number): string => {
  const v = row[i];
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s === '-' ? '' : s;
};

const firstInt = (v: string): number => {
  const m = v.match(/-?\d+/);
  return m ? Number(m[0]) : 0;
};

export function isMatchSheetWorkbook(sheetNames: string[]): boolean {
  return sheetNames.some((n) => fold(n) === fold(MATCH_SHEET_NAME));
}

function parseHalf(label: string): { half?: 1 | 2; period?: MatchPeriod | string } {
  const f = fold(label);
  if (/\b1\.?\s*[Aª]?\s*PARTE/.test(f)) return { half: 1, period: '1.ª parte' };
  if (/\b2\.?\s*[Aª]?\s*PARTE/.test(f)) return { half: 2, period: '2.ª parte' };
  if (f.includes('INTERVALO')) return { half: 1, period: 'Intervalo' };
  if (f.includes('PROLONGAMENTO')) return { period: 'prolongamento' };
  return {};
}

function parseMinute(v: string): string | null {
  if (!v) return null;
  if (fold(v) === 'INTERVALO') return 'INT';
  return formatMinute(v) || null;
}

function parseGoalType(v: string): string {
  if (!v) return 'Bola jogada';
  const f = fold(v);
  return GOAL_TYPE_LABELS.find((t) => fold(t) === f) || v.charAt(0) + v.slice(1).toLowerCase();
}

/** Resolves an exported player label ("10 - JOÃO SILVA") back to a roster player id. */
function createPlayerResolver(roster: Player[], warnings: string[]) {
  const unresolved = new Set<string>();
  return (label: string): string | null => {
    const raw = label.trim();
    const f = fold(raw);
    if (!raw || f === 'NAO ATRIBUIDO') return null;
    if (f.startsWith('AUTO GOLO')) return 'autogolo';

    const m = raw.match(/^(\d+)\s*-\s*(.+)$/);
    const num = m ? Number(m[1]) : null;
    const name = fold(m ? m[2] : raw);

    const byName = roster.filter((p) => fold(p.name) === name);
    const exact = byName.find((p) => num === null || p.number === num) || (byName.length === 1 ? byName[0] : undefined);
    if (exact) return exact.id;

    if (num !== null) {
      const byNumber = roster.filter((p) => p.number === num);
      if (byNumber.length === 1) return byNumber[0].id;
    }

    if (!unresolved.has(raw)) {
      unresolved.add(raw);
      warnings.push(`Atleta "${raw}" não encontrado no plantel atual.`);
    }
    return null;
  };
}

export function parseMatchSheetRows(
  rows: unknown[][],
  options: { roster: Player[]; fallbackSeason: string; schedule?: ScheduledMatch[] }
): MatchSheetImportResult {
  const warnings: string[] = [];
  const resolvePlayer = createPlayerResolver(options.roster || [], warnings);

  const headerIdx = rows.findIndex((r) => fold(cell(r, 0)) === 'TIPO DE REGISTO');
  if (headerIdx < 0) {
    throw new Error('Este ficheiro não parece ser uma Ficha de Jogo exportada pela BolaComVisão.');
  }

  let opponent = '';
  let season = '';
  for (const r of rows.slice(0, headerIdx)) {
    for (let i = 0; i < r.length - 1; i++) {
      const key = fold(cell(r, i));
      if (key === 'ADVERSARIO:' && !opponent) opponent = cell(r, i + 1);
      if (key === 'EPOCA:' && !season) season = cell(r, i + 1);
    }
  }

  let date = '';
  let location: Match['location'] = 'casa';
  let typeLabel = '';
  let phase = '';
  let competition = '';
  const stats: Partial<Match> = {};
  const goals: GoalEvent[] = [];
  const cards: CardEvent[] = [];
  const subs: SubEvent[] = [];
  const lineup: string[] = [];
  const lineupSecondHalf: string[] = [];

  for (const r of rows.slice(headerIdx + 1)) {
    const kind = fold(cell(r, 0));
    const detail = cell(r, 1);
    const origin = cell(r, 2);
    const minute = cell(r, 3);
    const who = cell(r, 4);
    if (!kind) continue;

    if (kind === 'RESULTADO FINAL') {
      const d = who.match(/(\d{4}-\d{2}-\d{2})/);
      if (d) date = d[1];
    } else if (kind === 'CONDICAO') {
      location = fold(detail) === 'FORA' ? 'fora' : 'casa';
    } else if (kind === 'TIPO DE JOGO') {
      typeLabel = detail;
    } else if (kind === 'FASE / JORNADA') {
      phase = detail;
    } else if (kind === 'COMPETICAO') {
      competition = detail;
    } else if (kind === 'REMATES A FAVOR (DENTRO DA AREA)') {
      stats.rematesDentroArea = firstInt(detail);
    } else if (kind === 'REMATES A FAVOR (FORA DA AREA)') {
      stats.rematesForaArea = firstInt(detail);
    } else if (kind === 'REMATES CONTRA (DENTRO DA AREA)') {
      stats.rematesDentroAreaAdv = firstInt(detail);
    } else if (kind === 'REMATES CONTRA (FORA DA AREA)') {
      stats.rematesForaAreaAdv = firstInt(detail);
    } else if (kind === 'CANTOS') {
      const m = fold(detail).match(/A FAVOR:\s*(\d+).*CONTRA:\s*(\d+)/);
      if (m) {
        stats.cantos = Number(m[1]);
        stats.cantosAdv = Number(m[2]);
      }
    } else if (kind === 'FALTAS') {
      const m = fold(detail).match(/COMETIDAS:\s*(\d+).*SOFRIDAS:\s*(\d+)/);
      if (m) {
        stats.faltas = Number(m[1]);
        stats.faltasAdv = Number(m[2]);
      }
    } else if (kind === 'GOLO MARCADO') {
      const m = who.match(/^(.*?)\s*\(ASSIST[ÊE]NCIA:\s*(.*)\)\s*$/i);
      const scorerId = resolvePlayer(m ? m[1] : who);
      const assistId = m ? resolvePlayer(m[2]) : null;
      goals.push({
        id: uid(),
        type: 'scored',
        scorerId,
        assistId: scorerId === 'autogolo' ? null : assistId,
        minute: parseMinute(minute),
        minuteBase: 'game',
        ...parseHalf(detail),
        goalType: parseGoalType(origin)
      });
    } else if (kind === 'GOLO SOFRIDO') {
      const notes = who.match(/NOTAS:\s*(.*)$/i);
      goals.push({
        id: uid(),
        type: 'conceded',
        scorerId: null,
        assistId: null,
        minute: parseMinute(minute),
        minuteBase: 'game',
        ...parseHalf(detail),
        goalType: parseGoalType(origin),
        ...(notes ? { notes: notes[1] } : {})
      });
    } else if (kind.startsWith('CARTAO ')) {
      const playerId = resolvePlayer(who);
      if (playerId) {
        cards.push({
          id: uid(),
          playerId,
          color: kind.includes('VERMELHO') ? 'Vermelho' : 'Amarelo',
          minute: parseMinute(minute),
          minuteBase: 'game',
          ...parseHalf(detail)
        });
      }
    } else if (kind === 'TITULAR 1.A PARTE' || kind === 'TITULAR 1.ª PARTE') {
      const id = resolvePlayer(who);
      if (id) lineup.push(id);
    } else if (kind === 'TITULAR 2.A PARTE' || kind === 'TITULAR 2.ª PARTE') {
      const id = resolvePlayer(who);
      if (id) lineupSecondHalf.push(id);
    } else if (kind === 'SUBSTITUICAO') {
      const outId = resolvePlayer(detail.replace(/^SAIU:\s*/i, ''));
      const inId = resolvePlayer(who.replace(/^ENTROU:\s*/i, ''));
      if (outId && inId) {
        const isHalftime = fold(minute) === 'INTERVALO';
        subs.push({
          id: uid(),
          outId,
          inId,
          minute: parseMinute(minute),
          minuteBase: 'game',
          ...(isHalftime ? { isHalftime: true, half: 1, period: 'Intervalo' } : {})
        });
      }
    }
  }

  if (!opponent) throw new Error('Não foi possível ler o adversário da Ficha de Jogo.');
  if (!date) throw new Error('Não foi possível ler a data do jogo da Ficha de Jogo.');

  // The sheet is all upper-case; reuse the original spelling from the Agenda when the game was scheduled there.
  const scheduled = (options.schedule || []).find((s) => s.date === date && fold(s.opponent) === fold(opponent));
  const type = scheduled?.type || parseMatchType(typeLabel);
  const tournamentName =
    type === 'torneio' ? scheduled?.tournamentName || competition.replace(new RegExp(`\\s*-\\s*${phase}$`), '') : '';

  const scored = goals.filter((g) => g.type === 'scored').length;
  const conceded = goals.length - scored;

  const match: Match = {
    id: uid(),
    opponent: scheduled?.opponent || opponent,
    date,
    type,
    phase: scheduled?.phase || phase || undefined,
    ...(tournamentName ? { tournamentName } : {}),
    season: season || options.fallbackSeason,
    location: scheduled?.location || location,
    finished: true,
    goals,
    cards,
    subs,
    lineup,
    ...(lineupSecondHalf.length > 0 ? { lineupSecondHalf } : {}),
    capitao: null,
    finalScore: { scored, conceded },
    ...stats
  };

  return { match, warnings };
}

export async function readMatchSheetFile(
  file: File,
  options: { roster: Player[]; fallbackSeason: string; schedule?: ScheduledMatch[] }
): Promise<MatchSheetImportResult> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = wb.SheetNames.find((n) => fold(n) === fold(MATCH_SHEET_NAME));
  if (!sheetName) throw new Error('Folha "FICHA DE JOGO" não encontrada no ficheiro.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: '' });
  return parseMatchSheetRows(rows, options);
}
