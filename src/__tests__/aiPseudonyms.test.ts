/** P1-05 — The codes J1, J2… that replace the athletes' names in what goes to the AI (fictitious names only). */
import { describe, it, expect } from 'vitest';
import { displayName, makePseudonyms } from '../lib/aiPseudonyms';

const roster = [
  { name: 'Rui Silva' },
  { name: 'Tomás Gonçalves', nickname: 'Tomé' },
  { name: 'Inês Araújo' },
  { name: 'Rui Matos' } // same first name as the first athlete
];

describe('P1-05 — códigos para os nomes dos atletas', () => {
  it('mostra a alcunha ou o primeiro nome', () => {
    expect(displayName({ name: 'Tomás Gonçalves', nickname: 'Tomé' })).toBe('Tomé');
    expect(displayName({ name: '  Inês   Araújo ' })).toBe('Inês');
  });

  it('dá um código por nome mostrado e repõe os nomes', () => {
    const p = makePseudonyms(roster);
    expect(p.code('Rui')).toBe('J1');
    expect(p.code('Tomé')).toBe('J2');
    expect(p.code('Inês')).toBe('J3');
    expect(p.code('rui')).toBe('J1'); // the two "Rui" share the name shown, so they share the code
    expect(p.restore('Golos de J1 e J2, assistência de J3.')).toBe('Golos de Rui e Tomé, assistência de Inês.');
  });

  it('troca no texto livre o nome completo, o primeiro nome e a alcunha, com acentos e sem olhar a maiúsculas', () => {
    const p = makePseudonyms(roster);
    const masked = p.mask('Grande jogo do Tomás Gonçalves! A inês defendeu tudo e o TOMÉ marcou. Rui Silva voltou.');
    expect(masked).toBe('Grande jogo do J2! A J3 defendeu tudo e o J2 marcou. J1 voltou.');
    for (const name of ['Tomás', 'Gonçalves', 'inês', 'TOMÉ', 'Silva']) expect(masked).not.toContain(name);
  });

  it('o nome mais longo ganha: "Rui Matos" não fica "J1 Matos"', () => {
    const p = makePseudonyms(roster);
    expect(p.mask('Rui Matos e Rui')).not.toContain('Matos');
  });

  it('só troca palavras inteiras', () => {
    const p = makePseudonyms([{ name: 'Rui Silva' }, { name: 'Ana Costa' }]);
    expect(p.mask('Ruivo, Banana e Rui.')).toBe('Ruivo, Banana e J1.');
  });

  it('distingue J1 de J10 ao repor', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ name: `Atleta${i + 1} Teste` }));
    const p = makePseudonyms(many);
    expect(p.code('Atleta10')).toBe('J10');
    expect(p.restore('J10 passou a J1.')).toBe('Atleta10 passou a Atleta1.');
  });

  it('deixa como estão os códigos que não conhece e um nome fora do plantel recebe um código novo', () => {
    const p = makePseudonyms(roster);
    expect(p.restore('J99 marcou.')).toBe('J99 marcou.');
    expect(p.code('Convidado')).toBe('J4');
    expect(p.restore('Golo de J4.')).toBe('Golo de Convidado.');
  });
});
