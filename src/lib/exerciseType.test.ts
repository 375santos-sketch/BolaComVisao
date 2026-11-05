import { describe, expect, it } from 'vitest';
import { categoryFromType, typeOf } from './exerciseType';
import { kitBag, materialTextOf, parseMaterialText } from './kitBag';

describe('tipo e material escritos pelo treinador', () => {
  it('o tipo escrito dá o grupo das cores do plano', () => {
    expect(categoryFromType('Rondo')).toBe('tecnica');
    expect(categoryFromType('Finalização')).toBe('tecnica');
    expect(categoryFromType('Jogo reduzido')).toBe('jogo');
    expect(categoryFromType('Posse de bola')).toBe('tatica');
    expect(categoryFromType('Aquecimento com bola')).toBe('aquecimento');
    expect(categoryFromType('Cantos')).toBe('bolas_paradas');
    expect(categoryFromType('Coordenação')).toBe('fisico');
    expect(categoryFromType('Qualquer coisa', 'jogo')).toBe('jogo');
    expect(typeOf({ typeText: ' Rondo ', category: 'tecnica' })).toBe('Rondo');
    expect(typeOf({ category: 'bolas_paradas' })).toBe('Bolas paradas');
  });

  it('o material escrito é lido em quantidades; o resto fica como está', () => {
    expect(parseMaterialText('16 cones, 2 balizas pequenas, 1 bola e apito')).toEqual({
      material: { cones: 16, balizas: 2, bolas: 1 },
      others: ['apito']
    });
    expect(parseMaterialText('10 Coletes\n- 6 bolas\n4 mini-barreiras; 8 argolas')).toEqual({
      material: { coletes: 10, bolas: 6, barreiras: 4, arcos: 8 },
      others: []
    });
    expect(parseMaterialText('coletes')).toEqual({ material: undefined, others: ['coletes'] });
    expect(parseMaterialText('')).toEqual({ material: undefined, others: [] });
    expect(materialTextOf({ material: { cones: 4, bolas: 2 } })).toBe('4 cones · 2 bolas');
    expect(materialTextOf({ materialText: '4 cones e apito', material: { cones: 4 } })).toBe('4 cones e apito');
  });

  it('levar para o treino junta as quantidades e o que foi escrito à parte', () => {
    const lib = [
      {
        id: 'a',
        name: 'A',
        category: 'jogo' as const,
        durationMinutes: 10,
        createdAt: '',
        materialText: '12 cones e apito',
        material: { cones: 12 }
      },
      {
        id: 'b',
        name: 'B',
        category: 'jogo' as const,
        durationMinutes: 10,
        createdAt: '',
        materialText: '16 cones, Apito',
        material: { cones: 16 }
      }
    ];
    const kit = kitBag(
      [
        { id: '1', exerciseId: 'a', title: 'A', durationMinutes: 10 },
        { id: '2', exerciseId: 'b', title: 'B', durationMinutes: 10 }
      ],
      lib
    );
    expect(kit.map((k) => k.label)).toEqual(['16 cones', 'Apito']);
  });
});
