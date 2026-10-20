import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildMatchSheetExcelWorkbook } from '../lib/exportUtils';
import { parseMatchSheetRows, isMatchSheetWorkbook } from '../lib/matchSheetImporter';
import { initialDefaultState } from '../lib/storage';
import { AppState, Match, Player } from '../types';

const roster: Player[] = [
  { id: 'p1', name: 'João Grilo', number: 1, positions: 'Guarda-Redes', birthDate: null, active: true },
  { id: 'p7', name: 'Tomás Gonçalves', number: 7, positions: 'Médio', birthDate: null, active: true },
  { id: 'p9', name: 'Rui Silva', number: 9, positions: 'Avançado', birthDate: null, active: true },
  { id: 'p10', name: 'André Lopes', number: 10, positions: 'Avançado', birthDate: null, active: true },
  { id: 'p14', name: 'Duarte Matos', number: 14, positions: 'Defesa', birthDate: null, active: true }
];

const match: Match = {
  id: 'orig',
  opponent: 'Tramagal SU',
  date: '2026-10-17',
  season: '2025/2026',
  type: 'campeonato',
  phase: 'Jornada 2',
  location: 'fora',
  finished: true,
  goals: [
    {
      id: 'g1',
      type: 'scored',
      scorerId: 'p9',
      assistId: 'p7',
      minute: "12'",
      half: 1,
      period: '1.ª parte',
      goalType: 'Canto'
    },
    { id: 'g2', type: 'conceded', scorerId: null, assistId: null, minute: "31'", half: 2, goalType: 'Penálti' },
    { id: 'g3', type: 'scored', scorerId: 'autogolo', assistId: null, minute: "40'", half: 2, goalType: 'Ressalto' }
  ],
  cards: [{ id: 'c1', playerId: 'p10', color: 'Amarelo', half: 2, minute: "35'" }],
  subs: [
    { id: 's1', outId: 'p10', inId: 'p14', minute: 'INT', isHalftime: true, half: 1 },
    { id: 's2', outId: 'p7', inId: 'p10', minute: "45'", half: 2 }
  ],
  lineup: ['p1', 'p7', 'p9', 'p10'],
  capitao: 'p1',
  rematesDentroArea: 6,
  rematesForaArea: 3,
  rematesDentroAreaAdv: 2,
  rematesForaAreaAdv: 1,
  cantos: 5,
  cantosAdv: 2,
  faltas: 4,
  faltasAdv: 7
};

const state: AppState = {
  ...initialDefaultState,
  myClubName: 'Dragões de Alferrarede',
  season: '2025/2026',
  roster,
  schedule: [
    {
      id: 'sch1',
      opponent: 'Tramagal SU',
      date: '2026-10-17',
      time: '10:00',
      location: 'fora',
      type: 'campeonato',
      phase: 'Jornada 2',
      callup: []
    } as any
  ]
};

function exportRows(m: Match, s: AppState): unknown[][] {
  const { wb } = buildMatchSheetExcelWorkbook(m, s, XLSX);
  // Simulate the real file round-trip (write + read) the coach does with the downloaded .xlsx
  const read = XLSX.read(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
  expect(isMatchSheetWorkbook(read.SheetNames)).toBe(true);
  return XLSX.utils.sheet_to_json<unknown[]>(read.Sheets['FICHA DE JOGO'], { header: 1, defval: '' });
}

describe('Importar Ficha de Jogo (Excel exportado)', () => {
  it('reconstructs the match exported by the app', () => {
    const { match: m, warnings } = parseMatchSheetRows(exportRows(match, state), {
      roster,
      fallbackSeason: '2025/2026',
      schedule: state.schedule
    });

    expect(warnings).toEqual([]);
    expect(m.opponent).toBe('Tramagal SU'); // original spelling recovered from the Agenda
    expect(m.date).toBe('2026-10-17');
    expect(m.location).toBe('fora');
    expect(m.type).toBe('campeonato');
    expect(m.phase).toBe('Jornada 2');
    expect(m.season).toBe('2026/2027'); // from the game's date, not the sheet's selected season
    expect(m.finished).toBe(true);
    expect(m.finalScore).toEqual({ scored: 2, conceded: 1 });

    expect(m.goals.map((g) => [g.type, g.scorerId, g.assistId, g.minute, g.half, g.goalType])).toEqual([
      ['scored', 'p9', 'p7', "12'", 1, 'Canto'],
      ['conceded', null, null, "31'", 2, 'Penálti'],
      ['scored', 'autogolo', null, "40'", 2, 'Ressalto']
    ]);
    expect(m.cards?.map((c) => [c.playerId, c.color, c.minute])).toEqual([['p10', 'Amarelo', "35'"]]);
    expect(m.subs.map((s) => [s.outId, s.inId, s.minute, !!s.isHalftime])).toEqual([
      ['p10', 'p14', 'INT', true],
      ['p7', 'p10', "45'", false]
    ]);
    expect(m.lineup).toEqual(['p1', 'p7', 'p9', 'p10']);
    expect([m.rematesDentroArea, m.rematesForaArea, m.rematesDentroAreaAdv, m.rematesForaAreaAdv]).toEqual([
      6, 3, 2, 1
    ]);
    expect([m.cantos, m.cantosAdv, m.faltas, m.faltasAdv]).toEqual([5, 2, 4, 7]);
  });

  it('warns about players that are not in the current roster', () => {
    const { match: m, warnings } = parseMatchSheetRows(exportRows(match, state), {
      roster: roster.filter((p) => p.id !== 'p14'),
      fallbackSeason: '2025/2026'
    });
    expect(warnings).toEqual(['Atleta "14 - DUARTE MATOS" não encontrado no plantel atual.']);
    expect(m.opponent).toBe('TRAMAGAL SU'); // not scheduled: keeps the sheet's spelling
    expect(m.subs).toHaveLength(1);
  });

  it('rejects files that are not a match sheet', () => {
    expect(() => parseMatchSheetRows([['Adversário', 'Data']], { roster, fallbackSeason: '' })).toThrow(
      /Ficha de Jogo/
    );
  });
});
