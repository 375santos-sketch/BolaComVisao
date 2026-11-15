import { describe, expect, it } from 'vitest';
import { cleanPause, clock, groupGotIt, nextPause, parseClock, pauseDue, withRun } from '../lib/vjPauses';
import { newSession } from '../lib/vjLibrary';
import { VjItem, VjPause } from '../types';

// Fictitious data, only for this test
const choice = (id: string, at: number): VjPause => ({
  id,
  at,
  question: 'Onde deve o médio receber?',
  kind: 'escolha',
  options: [
    { id: 'a', text: 'Entre linhas', correct: true, explanation: 'Fica ligado ao jogo' },
    { id: 'b', text: 'Junto à linha', correct: true },
    { id: 'c', text: 'Recuar', correct: false }
  ]
});
const video = (pauses: VjPause[]): VjItem => ({ id: 'v1', kind: 'video', youtubeId: 'dQw4w9WgXcQ', pauses });

describe('Visão de Jogo — pausas com perguntas (VJ2)', () => {
  it('times as m:ss', () => {
    expect(parseClock('0:42')).toBe(42);
    expect(parseClock('1:05')).toBe(65);
    expect(parseClock('75')).toBe(75);
    expect(parseClock('1:75')).toBeNull();
    expect(parseClock('abc')).toBeNull();
    expect(clock(65.4)).toBe('1:05');
  });

  it('a choice question needs a question, at least 2 answers and at least one right; an open one only a question', () => {
    expect(cleanPause(choice('p1', 42))).toMatchObject({ kind: 'escolha', at: 42 });
    expect(cleanPause({ ...choice('p1', 42), options: [{ id: 'a', text: 'Só uma', correct: true }] })).toBeNull();
    expect(
      cleanPause({ ...choice('p1', 42), options: choice('p1', 42).options!.map((o) => ({ ...o, correct: false })) })
    ).toBeNull();
    expect(cleanPause({ id: 'p2', at: 10, question: 'Que linha está livre?', kind: 'aberta' })).toMatchObject({
      kind: 'aberta'
    });
    expect(cleanPause({ id: 'p3', at: 10, question: '  ', kind: 'aberta' })).toBeNull();
  });

  it('the video stops at the first pause reached (with a small tolerance), each only once, in order', () => {
    const item = video([choice('late', 75), choice('early', 42)]);
    expect(pauseDue(item, 41.5, new Set())).toBeNull();
    expect(pauseDue(item, 41.8, new Set())?.id).toBe('early');
    expect(pauseDue(item, 80, new Set(['early']))?.id).toBe('late');
    expect(nextPause(item, new Set(['early', 'late']))).toBeNull();
  });

  it("the group's answer matches when it chose exactly the right answers; open questions are never right or wrong", () => {
    const p = choice('p1', 42);
    expect(groupGotIt(p, ['b', 'a'])).toBe(true);
    expect(groupGotIt(p, ['a'])).toBe(false);
    expect(groupGotIt({ id: 'o', at: 1, question: 'x', kind: 'aberta' }, [])).toBeNull();
  });

  it('only the latest 10 runs are kept', () => {
    let s = newSession({ id: 's', title: 'Sessão', now: '2026-11-15' });
    for (let i = 0; i < 12; i++) s = withRun(s, { id: `r${i}`, date: '2026-11-15', answers: {} });
    expect(s.runs!.map((r) => r.id)).toEqual(['r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11']);
  });
});
