import { describe, expect, it } from 'vitest';
import { countChanges, followEvents, followStats, liveMatchOf, liveScore } from './liveFollow';
import { Match, Player } from '../types';

const roster = [
  { id: 'p1', name: 'Rui Silva' },
  { id: 'p2', name: 'Tomás Gonçalves', nickname: 'Tomi' },
  { id: 'p3', name: 'André Lopes' }
] as unknown as Player[];

const match = (extra: Partial<Match> = {}): Match =>
  ({
    id: 'm',
    opponent: 'AD Tramagal',
    finished: false,
    matchPhase: 'parte2',
    goals: [
      { id: 'g1', type: 'scored', half: 1, minute: 4, clockSec: 230, scorerId: 'p1', assistId: 'p2' },
      { id: 'g2', type: 'conceded', half: 1, minute: 12, clockSec: 700, scorerId: null, assistId: null },
      {
        id: 'g3',
        type: 'scored',
        half: 2,
        minute: 31,
        clockSec: 300,
        scorerId: 'p2',
        assistId: null,
        goalType: 'Bola jogada'
      }
    ],
    subs: [{ id: 's1', outId: 'p3', inId: 'p1', half: 2, minute: 27, clockSec: 60 }],
    cards: [{ id: 'c1', playerId: 'p3', color: 'Amarelo', half: 1, minute: 18, clockSec: 1000 }],
    shotsInBoxFor: 4,
    shotsOutBoxFor: 3,
    shotsInBoxAgainst: 1,
    shotsOutBoxAgainst: 3,
    cornersFor: 3,
    cornersAgainst: 2,
    ...extra
  }) as unknown as Match;

describe('acompanhar ao vivo', () => {
  it('encontra o jogo a decorrer (começado e não terminado)', () => {
    expect(liveMatchOf([match({ id: 'a', finished: true }), match({ id: 'b' })])?.id).toBe('b');
    expect(liveMatchOf([match({ matchPhase: 'nao_iniciado' })])).toBeNull();
    expect(liveMatchOf(undefined)).toBeNull();
    expect(liveScore(match())).toEqual({ ours: 2, theirs: 1 });
  });

  it('lances do mais recente para o mais antigo, com o intervalo no sítio', () => {
    const ev = followEvents(match(), roster);
    expect(ev.map((e) => `${e.minute} ${e.icon} ${e.title}`)).toEqual([
      "31' ⚽ Golo · Tomi",
      "27' 🔄 Sai André, entra Rui",
      '— ⏸️ Intervalo · 1 – 1',
      "18' 🟨 André",
      "12' ⚽ Golo sofrido",
      "4' ⚽ Golo · Rui"
    ]);
    expect(ev[5].detail).toBe('Assist. Tomi');
    expect(ev[0].detail).toBe('Bola jogada');
  });

  it('no mesmo minuto, o último registado aparece primeiro', () => {
    const m = match({
      goals: [{ id: 'g', type: 'scored', half: 1, minute: 1, scorerId: 'p1', assistId: null }],
      cards: [{ id: 'c', playerId: 'p3', color: 'Amarelo', half: 1, minute: 1 }],
      subs: [],
      matchPhase: 'parte1'
    } as Partial<Match>);
    expect(followEvents(m, roster).map((e) => e.id)).toEqual(['c', 'g']);
  });

  it('números do jogo e remates/cantos novos vistos durante o jogo', () => {
    expect(followStats(match()).map((s) => `${s.label} ${s.ours}-${s.theirs}`)).toEqual([
      'Remates 7-4',
      'dentro da área 4-1',
      'Cantos 3-2',
      'Cartões amarelos 1-0'
    ]);
    const before = match();
    const after = match({ shotsInBoxFor: 5, cornersAgainst: 3 });
    expect(countChanges(before, after).map((c) => c.text)).toEqual([
      '🎯 Remate nosso dentro da área',
      '🚩 Canto contra'
    ]);
    expect(countChanges(null, after)).toEqual([]);
  });
});
