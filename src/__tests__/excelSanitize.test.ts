import { describe, it, expect } from 'vitest';
import { sanitizeExcelText, sanitizeExcelRawCell } from '../lib/utils';
import {
  normalizePlayerName,
  normalizeHeader as normalizePlayerHeader,
  parseRosterRows,
  normalizeHeight,
  normalizeWeight,
  normalizePlayerNumber
} from '../lib/excelPlayerImporter';
import {
  parseMatchRows,
  normalizeHeader as normalizeMatchHeader
} from '../lib/matchExcelImporter';
import { Player, Match } from '../types';

describe('Excel Text Sanitization & Structured Fields', () => {
  // Test 1: "João d'Almeida-Silva" → "JOAO DALMEIDASILVA"
  it('converts "João d\'Almeida-Silva" into "JOAO DALMEIDASILVA"', () => {
    const result = sanitizeExcelText("João d'Almeida-Silva");
    expect(result).toBe('JOAO DALMEIDASILVA');
  });

  // Test 2: "  Sporting   C.P. " → "SPORTING CP"
  it('converts "  Sporting   C.P. " into "SPORTING CP"', () => {
    const result = sanitizeExcelText('  Sporting   C.P. ');
    expect(result).toBe('SPORTING CP');
  });

  // Test 3: "Avançado/Médio (Ala)" → "AVANCADOMEDIO ALA"
  it('converts "Avançado/Médio (Ala)" into "AVANCADOMEDIO ALA"', () => {
    const result = sanitizeExcelText('Avançado/Médio (Ala)');
    expect(result).toBe('AVANCADOMEDIO ALA');
  });

  // Test 4: "3-1" continua a dar golos 3 e 1
  it('"3-1" continua a dar golos 3 e 1', () => {
    const rows = [
      {
        ADVERSARIO: 'SPORTING CP',
        DATA: '2024-10-15',
        RESULTADO: '3-1'
      }
    ];

    const mapping = {
      opponent: 'ADVERSARIO',
      date: 'DATA',
      goalsScored: 'RESULTADO'
    };

    const parsed = parseMatchRows(rows, mapping, []);
    expect(parsed.length).toBe(1);
    expect(parsed[0].goalsScored).toBe(3);
    expect(parsed[0].goalsConceded).toBe(1);
  });

  // Test 5: email mantém-se intacto
  it('email mantém-se intacto (em minúsculas, com @ e . preservados)', () => {
    const emailTest = 'Joao.Almeida@Clube.Pt';
    const sanitizedCell = sanitizeExcelRawCell(emailTest);
    expect(sanitizedCell).toBe('joao.almeida@clube.pt');

    const playerRows = [
      {
        NOME: 'JOAO SILVA',
        EMAIL: 'Joao.Almeida@Clube.Pt'
      }
    ];

    const mapping = {
      name: 'NOME',
      birthDate: '',
      positions: '',
      dominantFoot: '',
      number: '',
      height: '',
      weight: '',
      emergencyContact: '',
      email: 'EMAIL'
    };

    const parsed = parseRosterRows(playerRows, mapping, []);
    expect(parsed.length).toBe(1);
    expect(parsed[0].email).toBe('joao.almeida@clube.pt');
  });

  // Test 6: duplicados "José" e "JOSE" são detetados como o mesmo jogador
  it('duplicados "José" e "JOSE" são detetados como o mesmo jogador', () => {
    expect(normalizePlayerName('José')).toBe('JOSE');
    expect(normalizePlayerName('JOSE')).toBe('JOSE');
    expect(normalizePlayerName('José')).toBe(normalizePlayerName('JOSE'));

    const existingRoster: Player[] = [
      {
        id: 'player-1',
        name: 'José',
        number: 10,
        positions: 'Médio',
        birthDate: '2008-05-10',
        active: true
      }
    ];

    const newRows = [
      {
        NOME: 'JOSE',
        CAMISOLA: 10
      }
    ];

    const mapping = {
      name: 'NOME',
      birthDate: '',
      positions: '',
      dominantFoot: '',
      number: 'CAMISOLA',
      height: '',
      weight: '',
      emergencyContact: ''
    };

    const parsed = parseRosterRows(newRows, mapping, existingRoster);
    expect(parsed.length).toBe(1);
    expect(parsed[0].isDuplicate).toBe(true);
    expect(parsed[0].duplicateWithPlayerId).toBe('player-1');
  });

  // Test 7: Células vazias continuam vazias (sem "UNDEFINED" nem "NULL")
  it('células vazias continuam vazias e não geram "UNDEFINED" nem "NULL"', () => {
    expect(sanitizeExcelText(null)).toBe('');
    expect(sanitizeExcelText(undefined)).toBe('');
    expect(sanitizeExcelText('')).toBe('');
    expect(sanitizeExcelText('   ')).toBe('');
    expect(sanitizeExcelText('null')).toBe('');
    expect(sanitizeExcelText('undefined')).toBe('');
    expect(sanitizeExcelText('NULL')).toBe('');
    expect(sanitizeExcelText('UNDEFINED')).toBe('');

    expect(sanitizeExcelRawCell(null)).toBe('');
    expect(sanitizeExcelRawCell(undefined)).toBe('');
    expect(sanitizeExcelRawCell('')).toBe('');
  });

  // Test 8: Campos estruturados adicionais
  it('preserva campos estruturados como altura, peso, números e datas', () => {
    // Altura e peso
    expect(normalizeHeight('1.82m')).toBe('1.82 M');
    expect(normalizeHeight('182cm')).toBe('1.82 M');
    expect(normalizeHeight('1,82')).toBe('1.82 M');

    expect(normalizeWeight('75kg')).toBe('75 KG');
    expect(normalizeWeight('75.5kg')).toBe('75.5 KG');
    expect(normalizeWeight('75,5kg')).toBe('75.5 KG');

    // Número
    expect(normalizePlayerNumber('10')).toBe(10);
    expect(normalizePlayerNumber('#7')).toBe(7);

    // Headers normalizados
    expect(normalizePlayerHeader('Nº de Camisola')).toBe('N DE CAMISOLA');
    expect(normalizeMatchHeader('Adversário')).toBe('ADVERSARIO');
  });
});
