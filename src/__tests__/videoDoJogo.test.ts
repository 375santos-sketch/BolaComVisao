import { describe, expect, it } from 'vitest';
import { formatVideoTime, goalsMessage, parseVideoTime, videoEvents, videoLink, youtubeIdOf } from '../lib/gameVideo';
import { clockSecondsFor } from '../lib/matchPhaseUtils';
import { Match, Player } from '../types';

// Fictitious team
const roster = [
  { id: 'p1', name: 'Rui Silva', number: 9, positions: 'Avançado', active: true },
  { id: 'p2', name: 'Tomás Gonçalves', number: 7, positions: 'Médio', active: true, nickname: 'Tomé' },
  { id: 'p3', name: 'Duarte Matos', number: 1, positions: 'GR', active: true }
] as Player[];

const game = {
  id: 'm1',
  opponent: 'Abrantes',
  date: '2026-11-07',
  season: '2026/2027',
  type: 'campeonato',
  location: 'casa',
  finished: true,
  halfDurationMinutes: 25,
  goals: [
    { id: 'g1', type: 'conceded', scorerId: null, assistId: null, minute: "8'", half: 1, minuteInHalf: 8 },
    {
      id: 'g2',
      type: 'scored',
      scorerId: 'p2',
      assistId: 'p1',
      minute: "20'",
      half: 1,
      minuteInHalf: 20,
      clockSec: 1150,
      goalType: 'Boa jogada'
    },
    // Minute changed by hand after recording: the old second no longer matches and is ignored
    { id: 'g3', type: 'scored', scorerId: 'p1', assistId: null, minute: "31'", half: 2, minuteInHalf: 6, clockSec: 100 }
  ],
  subs: [
    { id: 's1', outId: 'p3', inId: 'p2', minute: 'INT', half: 1, isHalftime: true },
    { id: 's2', outId: 'p1', inId: 'p3', minute: "40'", half: 2, minuteInHalf: 15 }
  ],
  cards: [{ id: 'c1', playerId: 'p1', color: 'Amarelo', minute: "45'", half: 2 }],
  lineup: ['p1', 'p2', 'p3'],
  capitao: null
} as unknown as Match;

describe('vídeo do jogo', () => {
  it('reads the video id from every kind of YouTube link', () => {
    for (const link of [
      'https://youtu.be/aB3xQ_9-zZk',
      'https://www.youtube.com/watch?v=aB3xQ_9-zZk&t=30',
      'm.youtube.com/watch?v=aB3xQ_9-zZk',
      'https://youtube.com/shorts/aB3xQ_9-zZk',
      'https://www.youtube.com/live/aB3xQ_9-zZk?si=x',
      'aB3xQ_9-zZk'
    ]) {
      expect(youtubeIdOf(link)).toBe('aB3xQ_9-zZk');
    }
    expect(youtubeIdOf('https://vimeo.com/123')).toBeNull();
    expect(youtubeIdOf('https://youtube.com/watch?v=curto')).toBeNull();
    expect(youtubeIdOf('')).toBeNull();
  });

  it('reads and writes video times', () => {
    expect(parseVideoTime('2:15')).toBe(135);
    expect(parseVideoTime('1:02:15')).toBe(3735);
    expect(parseVideoTime('95')).toBe(95);
    expect(parseVideoTime('2:xx')).toBeNull();
    expect(parseVideoTime('')).toBeNull();
    expect(formatVideoTime(135)).toBe('2:15');
    expect(formatVideoTime(3735)).toBe('1:02:15');
  });

  it('places every event in the video, 10 seconds before it', () => {
    const events = videoEvents(game, { youtubeId: 'aB3xQ_9-zZk', half1At: 135, half2At: 2020 }, roster);
    expect(events.map((e) => [e.id, e.minute, e.title, e.at, e.estimated])).toEqual([
      ['g1', "8'", 'Golo sofrido', 135 + 7 * 60 - 10, false],
      // exact second recorded with the clock
      ['g2', "20'", 'Golo · Tomé', 135 + 1150 - 10, false],
      ['g3', "31'", 'Golo · Rui', 2020 + 5 * 60 - 10, false],
      ['s2', "40'", 'Sai Rui, entra Duarte', 2020 + 14 * 60 - 10, false],
      ['c1', "45'", '🟨 Rui', 2020 + 19 * 60 - 10, false]
    ]);
    expect(events[1]).toMatchObject({ detail: 'Assist. Rui · Boa jogada', playerIds: ['p2', 'p1'] });
  });

  it('guesses the second half when only the first kick-off is known, and applies the fine-tuning', () => {
    const events = videoEvents(game, { youtubeId: 'aB3xQ_9-zZk', half1At: 135, nudges: { g3: -5 } }, roster);
    const g3 = events.find((e) => e.id === 'g3')!;
    expect(g3).toMatchObject({ estimated: true, at: 135 + 25 * 60 + 5 * 60 - 10 - 5 });
  });

  it('makes the parents message with a link to each goal (names only when wanted)', () => {
    const video = { youtubeId: 'aB3xQ_9-zZk', half1At: 135, half2At: 2020 };
    const events = videoEvents(game, video, roster);
    const text = goalsMessage(game, video, events, 'Dragões');
    expect(text).toContain('🎥 Os golos do jogo Dragões 2-1 Abrantes');
    expect(text).toContain(`⚽ 20' Tomé: ${videoLink('aB3xQ_9-zZk', 1275)}`);
    expect(text).toContain('Jogo completo: https://youtu.be/aB3xQ_9-zZk');
    const anonymous = goalsMessage(game, video, events, 'Dragões', false);
    expect(anonymous).not.toMatch(/Tomé|Rui/);
    expect(anonymous).toContain("⚽ 31': https://youtu.be/aB3xQ_9-zZk?t=2310");
  });

  it('records the exact second only with the clock running in that half and the same minute', () => {
    const running = {
      ...game,
      finished: false,
      phase: 'parte1',
      timer: { isRunning: false, elapsedMs: 754_000, lastStartTs: null }
    } as unknown as Match;
    expect(clockSecondsFor(running, 1, 13)).toBe(754);
    expect(clockSecondsFor(running, 1, 15)).toBeUndefined();
    expect(clockSecondsFor(running, 2, 13)).toBeUndefined();
  });
});
