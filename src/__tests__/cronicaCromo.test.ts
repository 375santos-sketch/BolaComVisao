import { describe, expect, it } from 'vitest';
import { chronicleFacts, chronicleFallback, chroniclePrompt, cleanChronicle } from '../lib/matchChronicle';
import { cardNumberOf, playerCardStats, positionLabel } from '../lib/playerCard';
import { AppState, GoalEvent, Match, Player, Training } from '../types';

// Fictitious team
const roster = [
  { id: 'p1', name: 'Rui Silva', number: 9, positions: 'Avançado', active: true },
  { id: 'p2', name: 'Tomás Gonçalves', number: 7, positions: 'Médio', active: true, nickname: 'Tomé' },
  { id: 'p3', name: 'Duarte Matos', number: 1, positions: 'GR', active: true },
  { id: 'p4', name: 'Ex-atleta', number: 3, positions: 'Defesa', active: false }
] as Player[];

const goal = (type: 'scored' | 'conceded', half: 1 | 2, minute: string, scorerId: string | null = null): GoalEvent => ({
  id: `${type}${half}${minute}`,
  type,
  half,
  minute,
  scorerId,
  assistId: null
});

const game: Match = {
  id: 'm1',
  opponent: 'Abrantes',
  date: '2026-11-07',
  season: '2026/2027',
  type: 'campeonato',
  phase: 'Jornada 6',
  location: 'casa',
  finished: true,
  goals: [
    goal('conceded', 1, "8'"),
    goal('scored', 1, "20'", 'p2'),
    goal('scored', 2, "31'", 'p1'),
    goal('scored', 2, "48'", 'p2')
  ],
  subs: [],
  lineup: ['p1', 'p2', 'p3'],
  convocados: ['p1', 'p2', 'p3'],
  halfDurationMinutes: 25,
  rematesDentroArea: 8,
  rematesForaArea: 4,
  capitao: null
};

const state = {
  myClubName: 'Dragões',
  category: 'Sub-11',
  season: '2026/2027',
  roster,
  matches: [game],
  schedule: [
    { id: 's1', opponent: 'Tramagal', date: '2026-11-14', time: '10:30', location: 'fora', type: 'campeonato' }
  ],
  trainings: []
} as unknown as AppState;

describe('crónica do jogo', () => {
  it('gathers the story of the game: comeback, half-time, first names, shots, everyone played, next game', () => {
    const f = chronicleFacts(game, state, true, '2026-11-08');
    expect(f).toMatchObject({
      club: 'Dragões',
      opponent: 'Abrantes',
      home: true,
      competition: 'Campeonato · Jornada 6',
      scored: 3,
      conceded: 1,
      halfTime: { scored: 1, conceded: 1 },
      cameBack: true,
      shots: 12,
      calledUp: 3,
      allPlayed: true,
      next: { opponent: 'Tramagal', date: '2026-11-14', time: '10:30', home: false }
    });
    expect(f.goals).toEqual([
      { side: 'eles', minute: "8'" },
      { side: 'nós', minute: "20'", scorer: 'Tomé' },
      { side: 'nós', minute: "31'", scorer: 'Rui' },
      { side: 'nós', minute: "48'", scorer: 'Tomé' }
    ]);
  });

  it('leaves the names out when the coach says so', () => {
    const f = chronicleFacts(game, state, false, '2026-11-08');
    expect(f.goals.some((g) => g.scorer)).toBe(false);
    expect(JSON.stringify(f)).not.toMatch(/Rui|Tomé|Tomás/);
    expect(chroniclePrompt(f, 'clube')).not.toMatch(/Rui|Tomé/);
  });

  it('asks Gemini for the facts only, with no ratings or criticism', () => {
    const prompt = chroniclePrompt(chronicleFacts(game, state, true, '2026-11-08'), 'pais');
    expect(prompt).toContain('Não inventes');
    expect(prompt).toContain('Sem notas individuais');
    expect(prompt).toContain('WhatsApp dos pais');
    expect(prompt).toContain('"scorer":"Rui"');
  });

  it('tidies the written text', () => {
    expect(cleanChronicle('## **Vitória!**\n\n\n\nGrande jogo da equipa toda.')).toBe(
      'Vitória!\n\nGrande jogo da equipa toda.'
    );
    expect(cleanChronicle('curto')).toBeNull();
    expect(cleanChronicle(undefined)).toBeNull();
  });

  it('has its own plain text when Gemini is not available', () => {
    const f = chronicleFacts(game, state, true, '2026-11-08');
    const club = chronicleFallback(f, 'clube');
    expect(club).toContain('Vitória com reviravolta!');
    expect(club).toContain('venceu por 3-1 frente a Abrantes (Campeonato · Jornada 6)');
    expect(club).toContain('Ao intervalo estava 1-1.');
    expect(club).toContain('Golos de Tomé (2) e Rui.');
    expect(club).toContain('Todos os 3 convocados jogaram.');
    expect(club).toContain('fora, frente a Tramagal.');
    expect(chronicleFallback({ ...f, scored: 0, conceded: 2, cameBack: false, goals: [] }, 'pais')).toMatch(
      /^⚽ Jogo de aprendizagem/
    );
  });
});

describe('cromo do atleta', () => {
  const trainings = Array.from({ length: 4 }, (_, i) => ({
    id: `t${i}`,
    date: `2026-10-0${i + 1}`,
    absences: i === 0 ? ['p1'] : [],
    completed: true
  })) as unknown as Training[];
  const s = { ...state, trainings };

  it('shows trainings as attended/held, goals and assists', () => {
    expect(playerCardStats(s, roster[0], '2026/2027')).toEqual([
      ['1', 'JOGO'],
      ['1', 'GOLO'],
      ['0', 'ASSIST.'],
      ['3/4', 'TREINOS']
    ]);
  });

  it('shows clean sheets for the goalkeeper', () => {
    const clean = { ...game, id: 'm2', date: '2026-11-21', goals: [goal('scored', 1, "5'", 'p1')] };
    expect(playerCardStats({ ...s, matches: [game, clean] }, roster[2], '2026/2027')).toEqual([
      ['2', 'JOGOS'],
      ['1', 'SEM SOFRER'],
      ['0', 'GOLOS'],
      ['4/4', 'TREINOS']
    ]);
    expect(playerCardStats({ ...s, trainings: [] }, roster[0], '2026/2027')[3]).toEqual(['—', 'TREINOS']);
  });

  it('names the position and numbers the cards by shirt number', () => {
    expect(positionLabel('GR')).toBe('GUARDA-REDES');
    expect(positionLabel('Médio, Avançado')).toBe('MÉDIO');
    expect(positionLabel('')).toBe('');
    expect(cardNumberOf(roster, 'p1')).toEqual({ index: 3, total: 3 });
    expect(cardNumberOf(roster, 'p3')).toEqual({ index: 1, total: 3 });
    expect(cardNumberOf(roster, 'p4')).toEqual({});
  });
});
