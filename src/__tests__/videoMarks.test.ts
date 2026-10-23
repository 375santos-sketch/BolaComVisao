import { describe, expect, it } from 'vitest';
import { formatVideoTime, parseVideoTime, videoLinkAt, videoMarks, youTubeId } from '../lib/videoMarks';
import { Match, Player } from '../types';

const roster: Player[] = [
  { id: 'p1', name: 'Rui Silva', number: 9, positions: '', birthDate: null, active: true },
  { id: 'p2', name: 'Tomás Gonçalves', number: 7, positions: '', birthDate: null, active: true }
];

const match = {
  id: 'm1',
  opponent: 'Tramagal SU',
  date: '2026-10-17',
  finished: true,
  halfDurationMinutes: 25,
  goals: [
    { id: 'g2', type: 'conceded', scorerId: null, assistId: null, minute: "30'", half: 2, minuteInHalf: 5 },
    { id: 'g1', type: 'scored', scorerId: 'p1', assistId: 'p2', minute: "12'", half: 1, minuteInHalf: 12 }
  ],
  cards: [{ id: 'c1', playerId: 'p2', color: 'Amarelo', minute: "40'", half: 2 }],
  subs: [
    { id: 's0', outId: 'p1', inId: 'p2', minute: 'INT', isHalftime: true, half: 1 },
    { id: 's1', outId: 'p2', inId: 'p1', minute: "45'", half: 2, minuteInHalf: 20 }
  ],
  lineup: [],
  video: { url: 'https://www.youtube.com/watch?v=abc123XYZ', half1Start: 135, half2Start: 2080 }
} as unknown as Match;

describe('Vídeo do jogo', () => {
  it('reads video times written in several ways', () => {
    expect(parseVideoTime('2:15')).toBe(135);
    expect(parseVideoTime('1:02:03')).toBe(3723);
    expect(parseVideoTime('754')).toBe(754);
    expect(parseVideoTime('12m34s')).toBe(754);
    expect(parseVideoTime('12:75')).toBeNull();
    expect(parseVideoTime('abc')).toBeNull();
    expect(formatVideoTime(754)).toBe('12:34');
    expect(formatVideoTime(3723)).toBe('1:02:03');
  });

  it('recognises YouTube links and jumps to the second', () => {
    expect(youTubeId('https://youtu.be/abc123XYZ?si=x')).toBe('abc123XYZ');
    expect(youTubeId('https://m.youtube.com/watch?v=abc123XYZ&t=3')).toBe('abc123XYZ');
    expect(youTubeId('https://www.youtube.com/live/abc123XYZ')).toBe('abc123XYZ');
    expect(youTubeId('https://drive.google.com/file/d/xyz/view')).toBeNull();
    expect(videoLinkAt('https://www.youtube.com/watch?v=abc123XYZ', 800)).toBe('https://youtu.be/abc123XYZ?t=800');
    expect(videoLinkAt('https://drive.google.com/file/d/xyz/view', 800)).toBe(
      'https://drive.google.com/file/d/xyz/view'
    );
  });

  it('lists goals, cards and substitutions in game order, 15 seconds before each moment', () => {
    const marks = videoMarks(match, roster, 'Sub-11', 'Tramagal SU');
    expect(marks.map((m) => [m.minute, m.label, m.seconds])).toEqual([
      ["12'", 'Golo de Rui Silva (assistência Tomás Gonçalves)', 135 + 11 * 60 - 15],
      ["30'", 'Golo sofrido (Tramagal SU)', 2080 + 4 * 60 - 15],
      ["40'", 'Cartão amarelo: Tomás Gonçalves', 2080 + 14 * 60 - 15],
      ["45'", 'Entra Rui Silva, sai Tomás Gonçalves', 2080 + 19 * 60 - 15]
    ]);
    expect(marks[0].link).toBe(`https://youtu.be/abc123XYZ?t=${135 + 11 * 60 - 15}`);
  });

  it('without the start of a half there is no time for its moments; a 2nd-half link is used for that half', () => {
    const noStart = videoMarks({ ...match, video: { url: 'https://youtu.be/a1', half1Start: 0 } }, roster);
    expect(noStart.filter((m) => m.half === 2).every((m) => m.link === null)).toBe(true);
    expect(noStart[0].seconds).toBe(11 * 60 - 15);
    const two = videoMarks(
      { ...match, video: { url: 'https://youtu.be/a1', url2: 'https://youtu.be/b2', half1Start: 0, half2Start: 0 } },
      roster
    );
    expect(two.find((m) => m.half === 2)?.link).toMatch(/^https:\/\/youtu\.be\/b2\?t=/);
  });
});
