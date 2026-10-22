import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { buildGamesDashboardWorkbook } from '../lib/gamesDashboardExcel';
import { colName } from '../lib/excel/xlsxWriter';
import { AppState, Match, Player } from '../types';

const roster: Player[] = [
  { id: 'a', name: 'Afonso', number: 18, positions: '', birthDate: '2016-01-01', active: true, phone: '912345678' },
  { id: 'b', name: 'Diego & Cª', number: 19, positions: '', birthDate: null, active: true }
] as Player[];

const match = {
  id: 'm1',
  opponent: 'GRD Os Esparteiros',
  date: '2026-10-10',
  season: '2026/2027',
  type: 'campeonato',
  location: 'casa',
  finished: true,
  goals: [
    { id: 'g1', type: 'scored', scorerId: 'a', assistId: 'b', minute: "5'", goalType: 'Bola jogada' },
    { id: 'g2', type: 'scored', scorerId: 'a', assistId: null, minute: "45'", goalType: 'Penálti' }
  ],
  subs: [],
  lineup: ['a', 'b'],
  lineupSize: 2,
  convocados: ['a', 'b'],
  capitao: null,
  halfDurationMinutes: 30,
  rematesDentroArea: 4,
  rematesForaArea: 1
} as unknown as Match;

const state = {
  myClubName: 'Dragões',
  season: '2026/2027',
  category: 'Sub-11',
  roster,
  matches: [match],
  trainings: []
} as unknown as AppState;

describe('Excel com gráficos', () => {
  const files = unzipSync(buildGamesDashboardWorkbook(state));
  const text = (name: string) => strFromU8(files[name]);

  it('starts with the Painel sheet, then the charts data and the Power BI tables', () => {
    const wb = text('xl/workbook.xml');
    const names = [...wb.matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
    expect(names).toEqual([
      'Painel',
      'Dados dos gráficos',
      'Atletas',
      'Jogos',
      'Golos',
      'MinutosPorJogo',
      'Cartoes',
      'Treinos',
      'Presencas'
    ]);
  });

  it('has native charts on the Painel sheet, linked to the data sheet', () => {
    const charts = Object.keys(files).filter((f) => /^xl\/charts\/chart\d+\.xml$/.test(f));
    expect(charts).toHaveLength(5);
    const all = charts.map(text).join('');
    expect(all).toContain('Minutos jogados por atleta');
    expect(all).toContain('Quando marcamos');
    expect(all).toContain('&apos;Dados dos gráficos&apos;!$C$2:$C$3'); // minutes of the 2 athletes
    expect(all).toContain('Diego &amp; Cª'); // escaped
    expect(text('xl/worksheets/sheet1.xml')).toContain('<drawing r:id="rId1"/>');
    expect(text('[Content_Types].xml')).toContain('drawingml.chart+xml');
  });

  it('keeps personal data out', () => {
    const all = Object.values(files)
      .map((f) => strFromU8(f))
      .join('');
    expect(all).not.toContain('912345678');
    expect(all).not.toContain('2016-01-01');
  });

  it('names columns like Excel', () => {
    expect([0, 25, 26, 27, 51, 52].map(colName)).toEqual(['A', 'Z', 'AA', 'AB', 'AZ', 'BA']);
  });
});
