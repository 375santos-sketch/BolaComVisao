import { describe, expect, it } from 'vitest';
import { addStep, movePiece, movesInto, newPlay, positionsAt, removeStep } from '../lib/tacticBoard';
import { answerQuestion } from '../lib/coachAssistant';
import { assembleState, extractRecords } from '../lib/recordSync';
import { normalizeClubState } from '../lib/storage';
import { AppState, Match, Player, Training } from '../types';

describe('Quadro tático', () => {
  it('a new 7x7 play has our 7 players, 7 opponents (mirrored) and the ball', () => {
    const play = newPlay(7, true);
    expect(play.pieces.filter((p) => p.kind === 'own').map((p) => p.label)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7'
    ]);
    expect(play.pieces.filter((p) => p.kind === 'opp')).toHaveLength(7);
    const f = play.frames[0].positions;
    expect(f.opp1).toEqual({ x: 100 - f.own1.x, y: 100 - f.own1.y });
    expect(newPlay(5, false).pieces.map((p) => p.kind)).toEqual(['own', 'own', 'own', 'own', 'own', 'ball']);
  });

  it('steps start where the previous one ends; moving shows the path and the animation goes in between', () => {
    let play = addStep(newPlay(7, false), 0);
    play = movePiece(play, 1, 'ball', 30, 60);
    play = movePiece(play, 1, 'own2', 150, -10); // kept inside the pitch
    expect(play.frames[1].positions.own2).toEqual({ x: 98, y: 2 });
    expect(play.frames[0].positions.ball).toEqual({ x: 50, y: 88 });
    expect(
      movesInto(play, 1)
        .map((m) => m.id)
        .sort()
    ).toEqual(['ball', 'own2']);
    const mid = positionsAt(play, 0.5).ball;
    expect(mid.x).toBeCloseTo(40);
    expect(mid.y).toBeCloseTo(74);
    expect(positionsAt(play, 9).ball).toEqual({ x: 30, y: 60 });
    expect(removeStep(play, 1).frames).toHaveLength(1);
    expect(removeStep(removeStep(play, 1), 0).frames).toHaveLength(1); // the last step stays
  });

  it('each play is its own cloud record, kept per team', () => {
    const state = normalizeClubState({ myClubName: 'Dragões' } as never);
    const play = { ...newPlay(7), id: 'jog1', name: 'Saída curta' };
    const withPlay = {
      ...state,
      teams: state.teams.map((t) => (t.id === state.activeTeamId ? { ...t, tacticPlays: [play] } : t))
    } as AppState;
    const records = extractRecords(withPlay);
    expect([...records.values()].find((r) => r.kind === 'tacticplay')?.entityId).toBe('jog1');
    expect(JSON.stringify(records.get('club')?.data)).not.toContain('Saída curta');
    const back = assembleState(records, state as AppState);
    expect(back.teams.find((t) => t.id === back.activeTeamId)?.tacticPlays?.[0]?.name).toBe('Saída curta');
  });
});

describe('Assistente (perguntas sobre a equipa)', () => {
  const p = (id: string, name: string, number: number): Player => ({
    id,
    name,
    number,
    positions: '',
    birthDate: null,
    active: true
  });
  const roster = [p('a', 'Rui Silva', 9), p('b', 'Tomás Gonçalves', 7), p('c', 'André Lopes', 10)];
  const game = (id: string, date: string, opponent: string, extra: Partial<Match> = {}): Match =>
    ({
      id,
      opponent,
      date,
      season: '2026/2027',
      type: 'campeonato',
      location: 'casa',
      finished: true,
      goals: [],
      subs: [],
      cards: [],
      lineup: ['a', 'b'],
      lineupSize: 2,
      convocados: ['a', 'b', 'c'],
      capitao: null,
      halfDurationMinutes: 25,
      ...extra
    }) as Match;
  const training = (id: string, date: string, absences: string[]): Training => ({
    id,
    date,
    notes: '',
    absences,
    completed: true
  });
  const state = {
    season: '2026/2027',
    category: 'Sub-11',
    myClubName: 'Dragões',
    roster,
    schedule: [{ id: 's1', opponent: 'Abrantes', date: '2026-11-07', time: '10:30', location: 'casa', callup: ['a'] }],
    trainings: [
      training('t1', '2026-10-06', ['c']),
      training('t2', '2026-10-08', ['c', 'b']),
      training('t3', '2026-09-20', [])
    ],
    matches: [
      game('m1', '2026-09-27', 'Mação', {
        goals: [{ id: 'g1', type: 'scored', scorerId: 'a', assistId: 'b', minute: "5'", goalType: 'Canto' }]
      } as Partial<Match>),
      game('m2', '2026-10-17', 'Tramagal SU', {
        location: 'fora',
        goals: [
          { id: 'g2', type: 'scored', scorerId: 'a', assistId: null, minute: "3'", goalType: 'Bola jogada' },
          { id: 'g3', type: 'scored', scorerId: 'b', assistId: 'a', minute: "9'", goalType: 'Canto' },
          { id: 'g4', type: 'conceded', scorerId: null, assistId: null, minute: "20'" }
        ],
        subs: [{ id: 's1', outId: 'b', inId: 'c', minute: "40'", half: 2, minuteInHalf: 15 }]
      } as Partial<Match>)
    ]
  } as unknown as AppState;
  const today = new Date(2026, 9, 23); // 23 Oct 2026
  const ask = (q: string) => answerQuestion(q, state, today);

  it('who played least this month (only October games)', () => {
    const a = ask('Quem jogou menos este mês?');
    expect(a.title).toBe('Quem jogou menos este mês (1 jogo(s))');
    expect(a.lines[0]).toMatch(/^1\. 10 · André Lopes — 10 min/);
  });

  it('goals from corners, scorers and assists', () => {
    expect(ask('Quantos golos de canto marcámos?').title).toBe('2 golo(s) de canto marcados esta época');
    expect(ask('Quem é o melhor marcador?').lines[0]).toBe('1. 9 · Rui Silva — 2 golo(s)');
    expect(ask('Quem fez mais assistências?').lines).toEqual([
      '1. 9 · Rui Silva — 1 assistência(s)',
      '2. 7 · Tomás Gonçalves — 1 assistência(s)'
    ]);
  });

  it('absences, head to head, one athlete and the next game', () => {
    expect(ask('Quem faltou mais aos treinos em outubro?').lines[0]).toBe('1. 10 · André Lopes — 2 falta(s) em 2');
    const h2h = ask('Como correu contra o Tramagal?');
    expect(h2h.title).toBe('Jogos contra Tramagal SU: 1');
    expect(h2h.lines[0]).toBe('17/10 · fora · 1-2 (vitória)');
    const rui = ask('Quantos minutos jogou o Rui?');
    expect(rui.title).toBe('9 · Rui Silva esta época');
    expect(rui.lines[0]).toMatch(/^⏱️ 100 minutos em 2 jogo\(s\)/);
    expect(rui.lines[1]).toBe('⚽ 2 golo(s) · 🅰️ 1 assistência(s)');
    expect(ask('Quando é o próximo jogo?').lines[0]).toBe('📅 07/11 às 10:30 · em casa');
  });

  it('season record and questions it does not understand', () => {
    expect(ask('Quantas vitórias temos?').title).toBe('2 jogo(s) esta época: 2 vitória(s), 0 empate(s), 0 derrota(s)');
    const unknown = ask('Qual é a cor do equipamento?');
    expect(unknown.understood).toBe(false);
  });
});
