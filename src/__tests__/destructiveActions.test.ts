import { describe, expect, it } from 'vitest';
import {
  confirmWordMatches,
  ERASE_WORD,
  isSuspiciousMassDelete,
  MASS_DELETE_MIN,
  massDeleteNotice,
  REPLACE_WORD
} from '../lib/destructiveActions';

describe('P0-09 · palavra de confirmação', () => {
  it('aceita a palavra com espaços ou em minúsculas', () => {
    expect(confirmWordMatches('ELIMINAR', ERASE_WORD)).toBe(true);
    expect(confirmWordMatches('  eliminar ', ERASE_WORD)).toBe(true);
    expect(confirmWordMatches('Substituir', REPLACE_WORD)).toBe(true);
  });

  it('recusa vazio, outra palavra ou só parte dela', () => {
    expect(confirmWordMatches('', ERASE_WORD)).toBe(false);
    expect(confirmWordMatches(null, ERASE_WORD)).toBe(false);
    expect(confirmWordMatches('sim', ERASE_WORD)).toBe(false);
    expect(confirmWordMatches('ELIMINA', ERASE_WORD)).toBe(false);
    expect(confirmWordMatches('ELIMINAR', REPLACE_WORD)).toBe(false);
  });
});

describe('P0-09 · travão de apagamentos em massa', () => {
  it('nunca atua no uso normal (até 20 de cada vez)', () => {
    expect(isSuspiciousMassDelete(MASS_DELETE_MIN, MASS_DELETE_MIN)).toBe(false);
    expect(isSuspiciousMassDelete(5, 6)).toBe(false);
  });

  it('atua quando se apagaria mais de 20 e mais de metade dos registos', () => {
    expect(isSuspiciousMassDelete(30, 40)).toBe(true);
    expect(isSuspiciousMassDelete(21, 30)).toBe(true);
  });

  it('não atua quando é uma parte pequena do clube (ex.: 40 treinos num clube com 300 registos)', () => {
    expect(isSuspiciousMassDelete(40, 300)).toBe(false);
    expect(isSuspiciousMassDelete(30, 60)).toBe(false); // exatamente metade: não é "mais de metade"
  });

  it('o aviso diz quantos, que ficam na nuvem e como apagar de propósito', () => {
    const text = massDeleteNotice(34);
    expect(text).toContain('34 registos');
    expect(text).toContain('não foram apagados na nuvem');
    expect(text).toContain(`até ${MASS_DELETE_MIN}`);
  });
});
