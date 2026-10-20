import { describe, it, expect } from 'vitest';
import { Match, Player } from '../types';
import {
  computeCoachViewData,
  filterMatchesForCoachView,
  computeTopScorersAndAssisters,
  CoachViewFilter
} from '../lib/gameAnalysis/coachViewEngine';
import { normalizeClubState } from '../lib/storage';

describe('CoachViewEngine - Visão do Treinador', () => {
  const mockMatches: Match[] = [
    {
      id: 'm-1',
      date: '2026-09-10',
      season: '2026/27',
      opponent: 'SL Benfica',
      type: 'campeonato',
      location: 'casa',
      lineup: [],
      subs: [],
      capitao: null,
      finished: true,
      goals: [
        { id: 'g1', type: 'scored', scorerId: 'p1', assistId: null, minute: '12', goalType: 'Canto' },
        { id: 'g2', type: 'scored', scorerId: 'p2', assistId: 'p1', minute: '25', goalType: 'Bola jogada' },
        { id: 'g3', type: 'conceded', scorerId: null, assistId: null, minute: '45', goalType: 'Bola jogada' }
      ],
      cornersFor: 7,
      cornersAgainst: 3,
      foulsCommitted: 10,
      foulsSuffered: 8
    },
    {
      id: 'm-2',
      date: '2026-09-17',
      season: '2026/27',
      opponent: 'FC Porto',
      type: 'campeonato',
      location: 'fora',
      lineup: [],
      subs: [],
      capitao: null,
      finished: true,
      goals: [
        { id: 'g4', type: 'scored', scorerId: 'p3', assistId: null, minute: '15', goalType: 'Livre' },
        { id: 'g5', type: 'conceded', scorerId: null, assistId: null, minute: '50', goalType: 'Canto' },
        { id: 'g6', type: 'conceded', scorerId: null, assistId: null, minute: '58', goalType: 'Bola jogada' }
      ],
      cornersFor: 5,
      cornersAgainst: 6,
      foulsCommitted: 7,
      foulsSuffered: 6
    },
    {
      id: 'm-3',
      date: '2026-09-24',
      season: '2026/27',
      opponent: 'Sporting CP',
      type: 'campeonato',
      location: 'casa',
      lineup: [],
      subs: [],
      capitao: null,
      finished: true,
      goals: [
        { id: 'g7', type: 'scored', scorerId: 'p1', assistId: null, minute: '10', goalType: 'Penálti' },
        { id: 'g8', type: 'scored', scorerId: 'p2', assistId: 'p3', minute: '38', goalType: 'Bola jogada' },
        { id: 'g9', type: 'scored', scorerId: 'p1', assistId: 'p2', minute: '55', goalType: 'Bola jogada' }
      ],
      cornersFor: 6,
      cornersAgainst: 2,
      foulsCommitted: 8,
      foulsSuffered: 4
    },
    {
      id: 'm-4',
      date: '2026-10-01',
      season: '2026/27',
      opponent: 'SC Braga',
      type: 'campeonato',
      location: 'fora',
      lineup: [],
      subs: [],
      capitao: null,
      finished: true,
      goals: [
        { id: 'g10', type: 'scored', scorerId: 'p2', assistId: null, minute: '20', goalType: 'Bola jogada' },
        { id: 'g11', type: 'conceded', scorerId: null, assistId: null, minute: '28', goalType: 'Bola jogada' }
      ],
      cornersFor: 8,
      cornersAgainst: 4,
      foulsCommitted: 5,
      foulsSuffered: 5
    }
  ];

  it('computes the 5 main indicators accurately', () => {
    const filter: CoachViewFilter = { mode: 'season', season: '2026/27' };
    const data = computeCoachViewData(mockMatches, filter, 'Sub-11', '2026/27');

    expect(data.finishedMatchesCount).toBe(4);
    expect(data.goalsScoredTotal).toBe(7);
    expect(data.goalsConcededTotal).toBe(4);

    // Indicator 1: Golos por jogo (7 / 4 = 1.75 -> 1,8)
    expect(data.indicators.goalsScored.value).toBe('1,8');

    // Indicator 2: Golos sofridos por jogo (4 / 4 = 1.0 -> 1,0)
    expect(data.indicators.goalsConceded.value).toBe('1,0');

    // Indicator 3: Taxa de vitória (2 vitórias em 4 jogos -> 50%)
    expect(data.indicators.winRate.value).toBe('50%');

    // Indicator 4: Cantos por jogo (7+5+6+8 = 26 / 4 = 6.5 -> 6,5)
    expect(data.indicators.corners.value).toBe('6,5');

    // Indicator 5: Minuto médio do primeiro golo
    expect(data.indicators.firstGoalMinute.value).toBeTruthy();
  });

  it('correctly extracts the recent matches with scores and badges', () => {
    const filter: CoachViewFilter = { mode: 'season', season: '2026/27' };
    const data = computeCoachViewData(mockMatches, filter, 'Sub-11', '2026/27');

    expect(data.recentMatches.length).toBe(4);
    // Most recent first: m-4 vs SC Braga (1-1 -> Empate)
    expect(data.recentMatches[0].opponent).toBe('SC Braga');
    expect(data.recentMatches[0].result).toBe('E');
    expect(data.recentMatches[0].badgeVariant).toBe('amber');

    // m-3 vs Sporting CP (3-0 -> Vitória)
    expect(data.recentMatches[1].opponent).toBe('Sporting CP');
    expect(data.recentMatches[1].result).toBe('V');
    expect(data.recentMatches[1].badgeVariant).toBe('emerald');

    // m-2 vs FC Porto (1-2 -> Derrota)
    expect(data.recentMatches[2].opponent).toBe('FC Porto');
    expect(data.recentMatches[2].result).toBe('D');
    expect(data.recentMatches[2].badgeVariant).toBe('rose');
  });

  it('computes scored first and set piece metrics without inventing data', () => {
    const filter: CoachViewFilter = { mode: 'season', season: '2026/27' };
    const data = computeCoachViewData(mockMatches, filter, 'Sub-11', '2026/27');

    // We scored first in all 4 matches (m-1 min 12, m-2 min 15, m-3 min 10, m-4 min 20)
    expect(data.firstGoalStats.scoredFirstCount).toBe(4);
    expect(data.firstGoalStats.scoredFirstRate).toBe(100);
    expect(data.firstGoalStats.scoredFirstWins).toBe(2);
    expect(data.firstGoalStats.scoredFirstDraws).toBe(1);
    expect(data.firstGoalStats.scoredFirstLosses).toBe(1);

    // Set pieces: 3 scored (Canto, Livre, Penalti) out of 7 = 43%
    expect(data.setPieces.scoredCount).toBe(3);
    expect(data.setPieces.scoredRate).toBe(43);
  });

  it('handles insufficient history gracefully without generating false trends', () => {
    const singleMatch: Match[] = [mockMatches[0]];
    const filter: CoachViewFilter = { mode: 'season', season: '2026/27' };
    const data = computeCoachViewData(singleMatch, filter, 'Sub-11', '2026/27');

    expect(data.indicators.goalsScored.deltaText).toBe('Sem histórico suficiente');
    expect(data.indicators.goalsConceded.deltaText).toBe('Sem histórico suficiente');
    expect(data.trend.status).toBe('insufficient');
  });

  it('correctly filters by last 5 matches mode', () => {
    const { currentMatches } = filterMatchesForCoachView(mockMatches, { mode: 'last5' });
    expect(currentMatches.length).toBe(4);
  });

  describe('Top 3 Marcadores e Top 3 Assistentes', () => {
    const mockRoster: Player[] = [
      {
        id: 'p1',
        name: 'Cristiano Ronaldo',
        nickname: 'CR7',
        number: 7,
        positions: 'Avançado',
        birthDate: null,
        active: true
      },
      {
        id: 'p2',
        name: 'Bernardo Silva',
        nickname: 'Bernardo',
        number: 10,
        positions: 'Médio',
        birthDate: null,
        active: true
      },
      {
        id: 'p3',
        name: 'Bruno Fernandes',
        nickname: 'Bruno F.',
        number: 8,
        positions: 'Médio',
        birthDate: null,
        active: true
      },
      {
        id: 'p4',
        name: 'Diogo Jota',
        nickname: 'Jota',
        number: 20,
        positions: 'Extremo',
        birthDate: null,
        active: true
      }
    ];

    it('calculates top 3 scorers and top 3 assisters with correct ranks and counts', () => {
      const filter: CoachViewFilter = { mode: 'season', season: '2026/27' };
      const data = computeCoachViewData(mockMatches, filter, 'Sub-11', '2026/27', mockRoster);

      // Top scorers: p1 (3 goals), p2 (3 goals), p3 (1 goal)
      expect(data.topScorers).toHaveLength(3);
      expect(data.topScorers[0].count).toBe(3);
      expect(data.topScorers[1].count).toBe(3);
      expect(data.topScorers[2].count).toBe(1);

      // Verify player names & numbers
      const p1Stat = data.topScorers.find((s) => s.playerId === 'p1');
      expect(p1Stat).toBeDefined();
      expect(p1Stat?.playerName).toBe('CR7');
      expect(p1Stat?.playerNumber).toBe(7);

      const p2Stat = data.topScorers.find((s) => s.playerId === 'p2');
      expect(p2Stat).toBeDefined();
      expect(p2Stat?.playerName).toBe('Bernardo');
      expect(p2Stat?.playerNumber).toBe(10);

      // Top assisters: p1 (1 assist), p2 (1 assist), p3 (1 assist)
      expect(data.topAssisters).toHaveLength(3);
      expect(data.topAssisters.every((a) => a.count === 1)).toBe(true);
    });

    it('ignores autogolos, none, and unknown for both scorers and assisters', () => {
      const matchWithAutogolo: Match[] = [
        {
          id: 'm-auto',
          date: '2026-10-10',
          season: '2026/27',
          opponent: 'Portimonense',
          type: 'campeonato',
          location: 'casa',
          lineup: [],
          subs: [],
          capitao: null,
          finished: true,
          goals: [
            { id: 'ga1', type: 'scored', scorerId: 'autogolo', assistId: null, minute: '5' },
            { id: 'ga2', type: 'scored', scorerId: 'p4', assistId: 'none', minute: '20' },
            { id: 'ga3', type: 'scored', scorerId: 'p4', assistId: 'p1', minute: '35' },
            { id: 'ga4', type: 'conceded', scorerId: null, assistId: null, minute: '40' }
          ]
        }
      ];

      const { topScorers, topAssisters } = computeTopScorersAndAssisters(matchWithAutogolo, mockRoster);

      expect(topScorers).toHaveLength(1);
      expect(topScorers[0].playerId).toBe('p4');
      expect(topScorers[0].playerName).toBe('Jota');
      expect(topScorers[0].count).toBe(2);

      expect(topAssisters).toHaveLength(1);
      expect(topAssisters[0].playerId).toBe('p1');
      expect(topAssisters[0].count).toBe(1);
    });

    it('returns empty arrays when there are no goals or assists', () => {
      const matchNoGoals: Match[] = [
        {
          id: 'm-empty',
          date: '2026-10-12',
          season: '2026/27',
          opponent: 'Boavista',
          type: 'campeonato',
          location: 'fora',
          lineup: [],
          subs: [],
          capitao: null,
          finished: true,
          goals: []
        }
      ];

      const { topScorers, topAssisters } = computeTopScorersAndAssisters(matchNoGoals, mockRoster);
      expect(topScorers).toEqual([]);
      expect(topAssisters).toEqual([]);
    });

    it('correctly handles ties and limits top scorers and assisters strictly to max 3', () => {
      const matchManyGoals: Match[] = [
        {
          id: 'm-many',
          date: '2026-10-15',
          season: '2026/27',
          opponent: 'Vitória SC',
          type: 'campeonato',
          location: 'casa',
          lineup: [],
          subs: [],
          capitao: null,
          finished: true,
          goals: [
            { id: 'gm1', type: 'scored', scorerId: 'p1', assistId: 'p2', minute: '10' },
            { id: 'gm2', type: 'scored', scorerId: 'p2', assistId: 'p3', minute: '20' },
            { id: 'gm3', type: 'scored', scorerId: 'p3', assistId: 'p4', minute: '30' },
            { id: 'gm4', type: 'scored', scorerId: 'p4', assistId: 'p1', minute: '40' }
          ]
        }
      ];

      const { topScorers, topAssisters } = computeTopScorersAndAssisters(matchManyGoals, mockRoster);
      expect(topScorers.length).toBeLessThanOrEqual(3);
      expect(topAssisters.length).toBeLessThanOrEqual(3);
      expect(topScorers[0].count).toBe(1);
      expect(topAssisters[0].count).toBe(1);
    });

    it('strictly excludes goals and assists from players who are not in the squad roster or inactive', () => {
      const matchWithForeignPlayer: Match[] = [
        {
          id: 'm-foreign',
          date: '2026-10-18',
          season: '2026/27',
          opponent: 'Farense',
          type: 'campeonato',
          location: 'casa',
          lineup: [],
          subs: [],
          capitao: null,
          finished: true,
          goals: [
            { id: 'gf1', type: 'scored', scorerId: 'unknown_player_99', assistId: 'random_guy', minute: '10' },
            { id: 'gf2', type: 'scored', scorerId: 'p1', assistId: 'p2', minute: '25' }
          ]
        }
      ];

      const { topScorers, topAssisters } = computeTopScorersAndAssisters(matchWithForeignPlayer, mockRoster);
      expect(topScorers).toHaveLength(1);
      expect(topScorers[0].playerId).toBe('p1');
      expect(topAssisters).toHaveLength(1);
      expect(topAssisters[0].playerId).toBe('p2');
    });

    it('returns allSquadStats with exact goals, assists, and contributions for all squad players', () => {
      // 12-player roster like Dragões de Alferrarede - Sub11
      const squadOf12: Player[] = Array.from({ length: 12 }, (_, i) => ({
        id: `dragao_${i + 1}`,
        name: `Atleta ${i + 1}`,
        nickname: i === 0 ? 'Capitão' : undefined,
        number: i + 1,
        positions: i === 0 ? 'Guarda-Redes' : i < 5 ? 'Defesa' : i < 9 ? 'Médio' : 'Avançado',
        birthDate: '2016-04-10',
        active: true
      }));

      const testMatches: Match[] = [
        {
          id: 'm1',
          date: '2026-10-10',
          season: '2026/27',
          opponent: 'Ouriense',
          type: 'campeonato',
          location: 'casa',
          lineup: ['dragao_1', 'dragao_2', 'dragao_3', 'dragao_4', 'dragao_7', 'dragao_10', 'dragao_11'],
          subs: [],
          capitao: 'dragao_1',
          finished: true,
          goals: [
            { id: 'g1', type: 'scored', scorerId: 'dragao_11', assistId: 'dragao_10', minute: '12' },
            { id: 'g2', type: 'scored', scorerId: 'dragao_11', assistId: 'dragao_7', minute: '28' }
          ]
        },
        {
          id: 'm2',
          date: '2026-10-17',
          season: '2026/27',
          opponent: 'Tramagal',
          type: 'campeonato',
          location: 'fora',
          lineup: ['dragao_1', 'dragao_3', 'dragao_5', 'dragao_6', 'dragao_8', 'dragao_10', 'dragao_12'],
          subs: [],
          capitao: 'dragao_1',
          finished: true,
          goals: [{ id: 'g3', type: 'scored', scorerId: 'dragao_10', assistId: 'dragao_12', minute: '15' }]
        }
      ];

      const { topScorers, topAssisters, allSquadStats } = computeTopScorersAndAssisters(testMatches, squadOf12);

      // Exactly 12 players in allSquadStats
      expect(allSquadStats).toHaveLength(12);

      // Top Scorer: dragao_11 with 2 goals
      expect(topScorers[0].playerId).toBe('dragao_11');
      expect(topScorers[0].count).toBe(2);

      // Top Assister: dragao_10, dragao_7, dragao_12 with 1 assist each
      expect(topAssisters).toHaveLength(3);

      // Check stats for dragao_11
      const p11 = allSquadStats.find((p) => p.playerId === 'dragao_11');
      expect(p11?.goals).toBe(2);
      expect(p11?.assists).toBe(0);
      expect(p11?.totalContributions).toBe(2);

      // Check stats for dragao_10
      const p10 = allSquadStats.find((p) => p.playerId === 'dragao_10');
      expect(p10?.goals).toBe(1);
      expect(p10?.assists).toBe(1);
      expect(p10?.totalContributions).toBe(2);

      // Check stats for dragao_1 (0 goals, 0 assists, but 2 matches played)
      const p1 = allSquadStats.find((p) => p.playerId === 'dragao_1');
      expect(p1?.goals).toBe(0);
      expect(p1?.assists).toBe(0);
      expect(p1?.matchesPlayed).toBe(2);
    });

    it('never injects the placeholder Tramagal match and removes it from saved data', () => {
      const normalized = normalizeClubState({});
      expect(normalized.matches.some((m) => m.opponent.toLowerCase().includes('tramagal'))).toBe(false);
      expect(normalized.roster).toHaveLength(12);
      expect(normalized.myClubName).toBe('Dragões de Alferrarede');
      expect(normalized.category).toBe('Sub-11');

      // A previously persisted placeholder is purged from top-level and team match lists
      const placeholder = { id: 'match_tramagal_20261017', opponent: 'Tramagal', goals: [] } as any;
      const cleaned = normalizeClubState({
        activeTeamId: 'a',
        matches: [placeholder],
        teams: [{ id: 'a', matches: [placeholder] } as any, { id: 'b', matches: [placeholder] } as any]
      });
      expect(cleaned.matches.some((m) => m.id === placeholder.id)).toBe(false);
      cleaned.teams.forEach((t) => expect(t.matches.some((m) => m.id === placeholder.id)).toBe(false));
    });

    it('keeps a real Tramagal match even if teams array was empty', () => {
      const normalizedFromEmptyTeams = normalizeClubState({
        teams: [],
        matches: [
          {
            id: 'custom_tramagal',
            opponent: 'Tramagal SU',
            date: '2026-10-17',
            season: '2026/2027',
            type: 'campeonato',
            location: 'fora',
            finished: true,
            goals: []
          } as any
        ]
      });
      expect(normalizedFromEmptyTeams.matches.map((m) => m.id)).toContain('custom_tramagal');
    });

    it('treats missing sync timestamps as unknown age instead of now', () => {
      const normalized = normalizeClubState({ matches: [] });
      expect(normalized.updatedAt).toBe(0);
      expect(normalized.lastLocalMutationAt).toBe(0);
      expect(normalizeClubState({ updatedAt: 5, lastLocalMutationAt: 7 }).lastLocalMutationAt).toBe(7);
    });
  });
});
