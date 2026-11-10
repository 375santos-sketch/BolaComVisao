import { describe, expect, it } from 'vitest';
import { Match, Player, ScheduledMatch } from '../types';
import {
  parentsGameOf,
  parentsLiveFromRestDocument,
  parentsLiveOf,
  renderParentsLiveContent,
  renderParentsLivePage
} from './parentsLive';

const roster = [
  { id: 'p1', name: 'Tomás Gonçalves Silva' },
  { id: 'p2', name: 'Rui Martins', nickname: 'Ruizinho' },
  { id: 'p3', name: 'Martim Costa' },
  { id: 'p4', name: 'André Lopes' },
  { id: 'p5', name: 'Duarte Reis' }
] as Player[];

const game = (extra: Partial<Match> = {}): Match =>
  ({
    id: 'm1',
    opponent: 'FC Ribeira',
    date: '2026-11-07',
    location: 'fora',
    finished: false,
    matchPhase: 'parte2',
    lineup: ['p1', 'p2', 'p3'],
    lineupSecondHalf: ['p1', 'p4', 'p5'],
    goals: [
      { id: 'g1', type: 'scored', half: 1, minute: 4, scorerId: 'p1', assistId: 'p2' },
      { id: 'g2', type: 'conceded', half: 1, minute: 12, scorerId: null },
      { id: 'g3', type: 'scored', half: 2, minute: 31, scorerId: 'p2' }
    ],
    subs: [{ id: 's1', outId: 'p3', inId: 'p5', minute: 20, playerOut: 'Martim Costa', playerIn: 'Duarte Reis' }],
    cards: [{ id: 'c1', playerId: 'p3', color: 'Amarelo', half: 1, minute: 18 }],
    shotsInBoxFor: 4,
    shotsOutBoxFor: 3,
    shotsInBoxAgainst: 1,
    shotsOutBoxAgainst: 3,
    cornersFor: 3,
    cornersAgainst: 2,
    timer: { isRunning: true, elapsedMs: 1800000, lastStartTs: 1_000_000 },
    ...extra
  }) as unknown as Match;

describe('parentsGameOf', () => {
  it('shows the score, goals with first names (most recent first), both line-ups and the numbers', () => {
    const g = parentsGameOf(game(), roster, false);
    expect([g.ours, g.theirs]).toEqual([2, 1]);
    expect(g.phase).toBe('parte2');
    expect(g.goals).toEqual([
      { minute: "31'", ours: true, name: 'Ruizinho' },
      { minute: "12'", ours: false, name: '' },
      { minute: "4'", ours: true, name: 'Tomás' }
    ]);
    expect(g.halftime).toEqual({ ours: 1, theirs: 1 });
    expect(g.lineup1).toEqual(['Tomás', 'Ruizinho', 'Martim']);
    expect(g.lineup2).toEqual(['Tomás', 'André', 'Duarte']);
    expect(g.stats).toEqual({ shotsFor: 7, shotsAgainst: 4, cornersFor: 3, cornersAgainst: 2 });
    expect(g.runningSince).toBe(1_000_000);
  });

  it('never carries the substitutions; the cards only when the coach turns them on', () => {
    const off = parentsGameOf(game(), roster, false);
    expect(JSON.stringify(off)).not.toMatch(/Sai|entra|subs|Duarte Reis|Martim Costa/);
    expect(off.cards).toEqual([]);
    expect(parentsGameOf(game(), roster, true).cards).toEqual([{ minute: "18'", name: 'Martim', red: false }]);
  });

  it('the 2nd-half line-up only from the break on', () => {
    expect(parentsGameOf(game({ matchPhase: 'parte1' }), roster, false).lineup2).toEqual([]);
    expect(parentsGameOf(game({ matchPhase: 'parte1' }), roster, false).halftime).toBeNull();
  });
});

describe('parentsLiveOf', () => {
  const schedule = [
    { id: 'a', opponent: 'Antigo FC', date: '2026-11-01', time: '10:00', location: 'casa' },
    { id: 'b', opponent: 'Vila Nova', date: '2026-11-14', time: '11:00', location: 'casa', venue: 'Campo Municipal' },
    { id: 'c', opponent: 'Depois FC', date: '2026-11-21', time: '10:00', location: 'fora' }
  ] as ScheduledMatch[];

  it('the game being played and the next game', () => {
    const r = parentsLiveOf({ matches: [game()], schedule, roster }, false, '2026-11-08');
    expect(r.game?.opponent).toBe('FC Ribeira');
    expect(r.next).toEqual({
      opponent: 'Vila Nova',
      date: '2026-11-14',
      time: '11:00',
      location: 'em casa',
      venue: 'Campo Municipal'
    });
  });

  it('without a game being played, the last result', () => {
    const old = game({ id: 'm0', date: '2026-10-31', opponent: 'Velho FC', finished: true });
    const last = game({ id: 'm2', date: '2026-11-07', finished: true });
    const r = parentsLiveOf({ matches: [old, last], schedule: [], roster }, false, '2026-11-08');
    expect(r.game?.opponent).toBe('FC Ribeira');
    expect(r.game?.phase).toBe('fim');
    expect(r.game?.runningSince).toBeNull();
    expect(r.next).toBeNull();
  });
});

describe('the page', () => {
  const page = {
    teamName: 'Os Leões Sub-11',
    color: '#16a34a',
    ...parentsLiveOf({ matches: [game()], schedule: [], roster }, false, '2026-11-08')
  };

  it('reads back what was published (through the REST format) and escapes the names', () => {
    const rest = (v: unknown): any =>
      v === null
        ? { nullValue: null }
        : Array.isArray(v)
          ? { arrayValue: { values: v.map(rest) } }
          : typeof v === 'object'
            ? { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, rest(x)])) } }
            : typeof v === 'number'
              ? { integerValue: String(v) }
              : typeof v === 'boolean'
                ? { booleanValue: v }
                : { stringValue: String(v) };
    const back = parentsLiveFromRestDocument({
      fields: rest({ ...page, clubId: 'c', teamId: 't', updatedAt: 1 }).mapValue.fields
    });
    expect(back).toEqual(page);
    const html = renderParentsLiveContent({ ...page, teamName: '<b>X</b>' });
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(html).toContain('EQUIPA INICIAL (1.ª PARTE)');
    expect(html).toContain('EQUIPA DA 2.ª PARTE');
    expect(html).toContain('Golo · Ruizinho');
    expect(html).toContain('Golo sofrido');
    expect(html).not.toMatch(/Substitui|🔄/);
  });

  it('refreshes itself from its own link', () => {
    expect(renderParentsLivePage(page, 'abcdefghijklmnopqrstuvwx')).toContain(
      '/aovivo/abcdefghijklmnopqrstuvwx?conteudo=1'
    );
  });
});
