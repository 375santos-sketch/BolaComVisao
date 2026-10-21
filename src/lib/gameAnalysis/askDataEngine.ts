import { AppState } from '../../types';
import { parseMinuteToNumber } from './timingUtils';
import { getMatchSetPieces } from '../matchSetPieces';

export interface AskDataResponse {
  query: string;
  summary: string;
  keyPoints: string[];
  metrics?: {
    label: string;
    value: string | number;
    change?: string;
    variant?: 'cyan' | 'emerald' | 'amber' | 'rose';
  }[];
  recommendation?: string;
}

/**
 * Intelligent deterministic query engine that answers coaching questions
 * strictly based on real match data.
 */
export function queryTeamData(queryText: string, state: AppState): AskDataResponse {
  const cleanQ = queryText.toLowerCase().trim();
  const matches = (state.matches || []).filter((m) => m.finished);
  const totalMatches = matches.length;

  if (totalMatches === 0) {
    return {
      query: queryText,
      summary: 'Ainda não existem jogos terminados no registo da equipa.',
      keyPoints: [
        'Registe ou importe os primeiros jogos para ativar a análise inteligente.',
        'As respostas serão geradas com base em dados reais de golos, minutos, faltas e cartões.'
      ],
      recommendation: 'Inicie um jogo no Centro de Jogo ou importe o histórico via Excel.'
    };
  }

  // 1. "Últimos jogos" / "forma" / "momento"
  if (
    cleanQ.includes('último') ||
    cleanQ.includes('ultimos') ||
    cleanQ.includes('forma') ||
    cleanQ.includes('momento') ||
    cleanQ.includes('recent')
  ) {
    const n = cleanQ.includes('3') ? 3 : cleanQ.includes('10') ? 10 : 5;
    const recent = matches.slice(-n);
    let wins = 0,
      draws = 0,
      losses = 0,
      scored = 0,
      conceded = 0;

    recent.forEach((m) => {
      const s = (m.goals || []).filter((g) => g.type === 'scored').length;
      const c = (m.goals || []).filter((g) => g.type === 'conceded').length;
      scored += s;
      conceded += c;
      if (s > c) wins++;
      else if (s === c) draws++;
      else losses++;
    });

    const winPct = Math.round((wins / recent.length) * 100);
    const avgScored = (scored / recent.length).toFixed(1);
    const avgConceded = (conceded / recent.length).toFixed(1);

    return {
      query: queryText,
      summary: `Nos últimos ${recent.length} jogos: ${wins} Vitórias, ${draws} Empates e ${losses} Derrotas (${winPct}% de aproveitamento).`,
      keyPoints: [
        `Média de ${avgScored} golos marcados e ${avgConceded} sofridos por jogo.`,
        wins >= recent.length / 2
          ? 'Equipa com momento competitivo positivo e boa eficácia ofensiva.'
          : 'Fase com necessidade de consolidação defensiva.',
        scored > conceded
          ? `Saldo positivo de golos (+${scored - conceded}).`
          : `Saldo de golos neutro ou desfavorável (${scored - conceded}).`
      ],
      metrics: [
        { label: 'Vitórias', value: `${wins}/${recent.length}`, variant: 'emerald' },
        { label: 'Golos Marcados', value: scored, variant: 'cyan' },
        { label: 'Golos Sofridos', value: conceded, variant: 'rose' },
        { label: 'Média Marcados', value: avgScored }
      ],
      recommendation:
        conceded > scored
          ? 'Reforçar exercícios de transição defensiva e organização de bola parada nos treinos da semana.'
          : 'Manter a dinâmica de posse e circulação no terço ofensivo.'
    };
  }

  // 2. "Bolas paradas" / "cantos" / "livres" / "penalti"
  if (
    cleanQ.includes('canto') ||
    cleanQ.includes('bola parada') ||
    cleanQ.includes('livre') ||
    cleanQ.includes('penalti') ||
    cleanQ.includes('penálti')
  ) {
    let setPieceScored = 0;
    let setPieceConceded = 0;
    let totalScored = 0;
    let totalConceded = 0;
    let totalCorners = 0;

    matches.forEach((m) => {
      totalCorners += getMatchSetPieces(m).cornersFor || 0;
      (m.goals || []).forEach((g) => {
        const t = (g.goalType || '').toLowerCase();
        const isSetPiece = t.includes('canto') || t.includes('livre') || t.includes('pen') || t.includes('bola parada');
        if (g.type === 'scored') {
          totalScored++;
          if (isSetPiece) setPieceScored++;
        } else if (g.type === 'conceded') {
          totalConceded++;
          if (isSetPiece) setPieceConceded++;
        }
      });
    });

    const setPieceScoredPct = totalScored > 0 ? Math.round((setPieceScored / totalScored) * 100) : 0;
    const setPieceConcededPct = totalConceded > 0 ? Math.round((setPieceConceded / totalConceded) * 100) : 0;
    const avgCorners = (totalCorners / totalMatches).toFixed(1);

    return {
      query: queryText,
      summary: `Análise de Bolas Paradas: ${setPieceScoredPct}% dos nossos golos marcados e ${setPieceConcededPct}% dos sofridos surgem de lances de bola parada.`,
      keyPoints: [
        `Marcámos ${setPieceScored} golos de bola parada em ${totalScored} golos totais (${setPieceScoredPct}%).`,
        `Sofremos ${setPieceConceded} golos de bola parada em ${totalConceded} golos totais (${setPieceConcededPct}%).`,
        `Média de ${avgCorners} cantos a nosso favor por jogo.`
      ],
      metrics: [
        { label: 'Golos Marcados (BP)', value: `${setPieceScored} (${setPieceScoredPct}%)`, variant: 'cyan' },
        { label: 'Golos Sofridos (BP)', value: `${setPieceConceded} (${setPieceConcededPct}%)`, variant: 'rose' },
        { label: 'Média Cantos', value: avgCorners, variant: 'amber' }
      ],
      recommendation:
        setPieceConcededPct >= 30
          ? 'Atenção aos esquemas táticos defensivos em cantos e livres laterais. Considerar marcação mista.'
          : 'Excelente controlo defensivo nos lances de bola parada.'
    };
  }

  // 3. "Períodos" / "minutos" / "quando" / "sofrer" / "marcar"
  if (
    cleanQ.includes('período') ||
    cleanQ.includes('periodo') ||
    cleanQ.includes('minuto') ||
    cleanQ.includes('quando') ||
    cleanQ.includes('tempo')
  ) {
    let firstHalfScored = 0,
      firstHalfConceded = 0;
    let secondHalfScored = 0,
      secondHalfConceded = 0;
    let lateConceded = 0; // > 60' or 2nd half end

    matches.forEach((m) => {
      (m.goals || []).forEach((g) => {
        const min = parseMinuteToNumber(g.minute) || 0;
        const is2nd = g.period === '2' || g.period === '2T' || min > 35;
        if (g.type === 'scored') {
          if (is2nd) secondHalfScored++;
          else firstHalfScored++;
        } else {
          if (is2nd) secondHalfConceded++;
          else firstHalfConceded++;
          if (min >= 50 || (is2nd && min >= 20)) lateConceded++;
        }
      });
    });

    const totalConceded = firstHalfConceded + secondHalfConceded;
    const latePct = totalConceded > 0 ? Math.round((lateConceded / totalConceded) * 100) : 0;

    return {
      query: queryText,
      summary: `Distribuição por partes: Marcámos ${firstHalfScored} golos na 1ª Parte e ${secondHalfScored} na 2ª Parte. Sofremos ${firstHalfConceded} na 1ªP e ${secondHalfConceded} na 2ªP.`,
      keyPoints: [
        `1ª Parte: ${firstHalfScored} Marcados vs ${firstHalfConceded} Sofridos.`,
        `2ª Parte: ${secondHalfScored} Marcados vs ${secondHalfConceded} Sofridos.`,
        `${latePct}% dos golos sofridos acontecem na fase final do jogo (últimos minutos/fadiga).`
      ],
      metrics: [
        { label: '1ª Parte Marcados', value: firstHalfScored, variant: 'cyan' },
        { label: '2ª Parte Marcados', value: secondHalfScored, variant: 'emerald' },
        { label: 'Golos Sofridos Finais', value: `${latePct}%`, variant: 'rose' }
      ],
      recommendation:
        latePct >= 40
          ? 'Gerir as substituições a partir do meio da 2ª parte para manter a intensidade física e concentração defensiva.'
          : 'Boa consistência de ritmo e intensidade ao longo de todos os períodos do jogo.'
    };
  }

  // 4. "Adversário" específico
  const opponentMatch = matches.find((m) => cleanQ.includes(m.opponent.toLowerCase()));
  if (opponentMatch) {
    const oppName = opponentMatch.opponent;
    const oppGames = matches.filter((m) => m.opponent.toLowerCase() === oppName.toLowerCase());
    let oppWins = 0,
      oppDraws = 0,
      oppLosses = 0,
      oppScored = 0,
      oppConceded = 0;

    oppGames.forEach((m) => {
      const s = (m.goals || []).filter((g) => g.type === 'scored').length;
      const c = (m.goals || []).filter((g) => g.type === 'conceded').length;
      oppScored += s;
      oppConceded += c;
      if (s > c) oppWins++;
      else if (s === c) oppDraws++;
      else oppLosses++;
    });

    return {
      query: queryText,
      summary: `Histórico contra ${oppName}: ${oppGames.length} jogo(s) disputado(s) — ${oppWins}V, ${oppDraws}E, ${oppLosses}D.`,
      keyPoints: [
        `Golos Marcados: ${oppScored} (média de ${(oppScored / oppGames.length).toFixed(1)} por jogo).`,
        `Golos Sofridos: ${oppConceded} (média de ${(oppConceded / oppGames.length).toFixed(1)} por jogo).`,
        oppWins > oppLosses ? 'Vantagem histórica nos confrontos diretos.' : 'Confronto equilibrado e competitivo.'
      ],
      metrics: [
        { label: 'Jogos Disputados', value: oppGames.length },
        { label: 'Vitórias', value: oppWins, variant: 'emerald' },
        {
          label: 'Saldo Golos',
          value: oppScored - oppConceded >= 0 ? `+${oppScored - oppConceded}` : `${oppScored - oppConceded}`
        }
      ],
      recommendation: `Manter plano estratégico focado nas transições rápidas explorando as alas contra ${oppName}.`
    };
  }

  // 5. "Jogadores" / "marcadores" / "assistências"
  if (
    cleanQ.includes('marcador') ||
    cleanQ.includes('golos') ||
    cleanQ.includes('assist') ||
    cleanQ.includes('jogador') ||
    cleanQ.includes('destaque')
  ) {
    const playerGoals: Record<string, number> = {};
    const playerAssists: Record<string, number> = {};

    matches.forEach((m) => {
      (m.goals || []).forEach((g) => {
        if (g.type === 'scored') {
          const sId = g.scorerId || g.scorer;
          const aId = g.assistId || g.assist;
          if (sId) playerGoals[sId] = (playerGoals[sId] || 0) + 1;
          if (aId) playerAssists[aId] = (playerAssists[aId] || 0) + 1;
        }
      });
    });

    const topScorers = Object.entries(playerGoals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pId, count]) => {
        const player = (state.roster || []).find((p) => p.id === pId);
        return `${player?.name || pId} (${count} golos)`;
      });

    const topAssisters = Object.entries(playerAssists)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pId, count]) => {
        const player = (state.roster || []).find((p) => p.id === pId);
        return `${player?.name || pId} (${count} assistências)`;
      });

    return {
      query: queryText,
      summary: `Top Marcadores e Assistentes da época: ${topScorers.length > 0 ? topScorers.join(', ') : 'Nenhum registado'}.`,
      keyPoints: [
        `Melhores Marcadores: ${topScorers.join(' • ') || 'Nenhum registo'}`,
        `Melhores Assistentes: ${topAssisters.join(' • ') || 'Nenhum registo'}`,
        'Boa distribuição ofensiva entre os jogadores do plantel.'
      ],
      recommendation: 'Continuar a fomentar combinações ofensivas no corredor central e cruzamentos para a área.'
    };
  }

  // 6. Resposta Global Padrão (Visão Geral da Época)
  let totalWins = 0,
    totalDraws = 0,
    totalLosses = 0,
    totalScored = 0,
    totalConceded = 0;
  matches.forEach((m) => {
    const s = (m.goals || []).filter((g) => g.type === 'scored').length;
    const c = (m.goals || []).filter((g) => g.type === 'conceded').length;
    totalScored += s;
    totalConceded += c;
    if (s > c) totalWins++;
    else if (s === c) totalDraws++;
    else totalLosses++;
  });

  const winPercentage = Math.round((totalWins / totalMatches) * 100);
  const avgScoredAll = (totalScored / totalMatches).toFixed(1);
  const avgConcededAll = (totalConceded / totalMatches).toFixed(1);

  return {
    query: queryText,
    summary: `Balanço Geral da Época: ${totalMatches} jogos, ${totalWins} Vitórias, ${totalDraws} Empates e ${totalLosses} Derrotas (${winPercentage}% vitórias).`,
    keyPoints: [
      `Média global de ${avgScoredAll} golos marcados por jogo.`,
      `Média de ${avgConcededAll} golos sofridos por jogo.`,
      `Saldo de golos atual: ${totalScored - totalConceded >= 0 ? `+${totalScored - totalConceded}` : `${totalScored - totalConceded}`}.`
    ],
    metrics: [
      { label: 'Total Jogos', value: totalMatches },
      { label: 'Vitórias', value: `${winPercentage}%`, variant: 'emerald' },
      { label: 'Golos Marcados', value: totalScored, variant: 'cyan' },
      { label: 'Golos Sofridos', value: totalConceded, variant: 'rose' }
    ],
    recommendation:
      'Pode perguntar sobre momentos de jogo, cantos, confrontos contra um adversário específico ou últimos jogos.'
  };
}
