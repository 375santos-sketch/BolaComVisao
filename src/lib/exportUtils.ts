import { AppState, ScheduledMatch, Player, Match } from '../types';
import { playerLabel, computeAge, sortPlayerObjs, calcPlayerMinutes, getMatchCompetitionDetails } from './utils';

/**
 * Lazy loads the XLSX library on demand so it does not inflate the initial bundle.
 */
async function getXLSX() {
  return await import('xlsx');
}

/**
 * Remove imagens, emojis e símbolos (alvos, balizas, bolas, etc.),
 * remove apóstrofos (') de minutos e tempos de jogo,
 * e converte todo o texto para MAIÚSCULAS.
 */
export function sanitizeExcelModeGameText(val: any): string | number {
  if (val == null) return '-';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'SIM' : 'NÃO';

  let str = String(val);

  // 1. Remover emojis e símbolos pictográficos (balizas 🥅, alvos 🎯, bolas ⚽, escudos 🛡️, bandeiras 🚩, avisos ⚠️, etc.)
  str = str.replace(/\p{Extended_Pictographic}/gu, '');
  str = str.replace(/[\u2600-\u26FF\u2700-\u27BF]/gu, '');
  str = str.replace(/[\uFE0E\uFE0F]/g, '');

  // 2. Remover outros símbolos especiais (como ✓, ✔, •, ●, ➔, →, —, –, etc.)
  str = str.replace(/[✓✔•●➔→—–]/g, '-');

  // 3. Remover apóstrofos e aspas (ex: "45'" -> "45")
  str = str.replace(/['’`´"]/g, '');

  // 4. Normalizar espaços múltiplos e fazer trim
  str = str.replace(/\s+/g, ' ').trim();

  if (str === '' || str === '-') return '-';

  // 5. Se o resultado for puramente numérico (como minutos "45" ou contadores), retornar número
  if (/^-?\d+$/.test(str)) {
    return Number(str);
  }

  // 6. Converter tudo para MAIÚSCULAS
  return str.toUpperCase();
}

/**
 * Creates an Excel workbook with standard BolaComVisao Header watermark row
 */
function createBolaComVisaoSheet(
  XLSX: any,
  title: string,
  state: AppState,
  headerColumns: string[],
  dataRows: (string | number | null | undefined)[][],
  extraMetaRows?: (string | number | null | undefined)[][],
  cleanModeGame = false
) {
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'BolaComVisao FC';
  const currentDate = new Date().toLocaleDateString('pt-PT');

  const firstHeaderRow = cleanModeGame
    ? ['BOLACOMVISAO - PLATAFORMA DE GESTÃO DESPORTIVA DE FUTEBOL']
    : ['⚽ BolaComVisao - Plataforma de Gestão Desportiva de Futebol'];

  const metaRows: (string | number)[][] = [
    firstHeaderRow,
    ['DOCUMENTO:', title.toUpperCase()],
    ['CLUBE:', myClub, 'ESCALÃO:', state.category || 'Geral', 'ÉPOCA:', state.season || '2025/2026'],
    ...(Array.isArray(extraMetaRows) ? (extraMetaRows as (string | number)[][]) : []),
    ['EMISSÃO / MARCA DE ÁGUA:', 'BolaComVisao', 'DATA:', currentDate],
    [], // Blank separator row
    headerColumns
  ];

  let fullRows = [...metaRows, ...dataRows];

  if (cleanModeGame) {
    fullRows = fullRows.map((row) =>
      row.map((cell) => sanitizeExcelModeGameText(cell))
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(fullRows);

  // Auto-fit column widths based on headers and data
  const colWidths = headerColumns.map((h, colIdx) => {
    let maxLen = h.length;
    dataRows.forEach((row) => {
      const cellVal = row[colIdx];
      if (cellVal != null) {
        const len = String(cellVal).length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
  });

  ws['!cols'] = [{ wch: 25 }, ...colWidths.slice(1)];
  return ws;
}

/**
 * Export Convocatória in Excel (.xlsx)
 */
export async function exportConvocatoriaExcel(match: ScheduledMatch, calledPlayers: Player[], state: AppState) {
  const XLSX = await getXLSX();
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O Meu Clube';
  const sortedCalled = sortPlayerObjs(calledPlayers);

  const headers = [
    'Nº Camisola',
    'Nome do Atleta',
    'Posição',
    'Idade',
    'Pé Dominante',
    'Contacto',
    'Estado Convocatória'
  ];

  const rows = sortedCalled.map((p) => [
    p.number !== null && p.number !== undefined ? `#${p.number}` : '-',
    p.name,
    p.positions || 'Jogador',
    p.birthDate ? `${computeAge(p.birthDate)} anos` : '-',
    p.dominantFoot || 'Direito',
    p.phone || p.emergencyContact || '-',
    'CONVOCADO'
  ]);

  const ws = createBolaComVisaoSheet(XLSX, `Convocatória vs ${match.opponent}`, state, headers, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Convocatória');

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Convocatoria_BolaComVisao_${sanitize(myClub)}_vs_${sanitize(match.opponent)}_${match.date}.xlsx`);
}

/**
 * Export Treinos & Assiduidade in Excel (.xlsx)
 */
export async function exportTrainingsStatsExcel(state: AppState) {
  const XLSX = await getXLSX();
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O Meu Clube';
  const completedTrainings = (state.trainings || []).filter((tr) => tr.completed !== false);
  const totalTrainings = completedTrainings.length;
  const activePlayers = sortPlayerObjs(state.roster.filter((p) => p.active !== false));

  const headers = [
    'Nº',
    'Nome do Jogador',
    'Posição',
    'Presenças',
    'Faltas',
    'Total Treinos Concluídos',
    '% Assiduidade',
    'Classificação Assiduidade'
  ];

  const rows = activePlayers.map((p) => {
    const absences = completedTrainings.filter((tr) => (tr.absences || []).includes(p.id)).length;
    const presences = Math.max(0, totalTrainings - absences);
    const pct = totalTrainings > 0 ? Math.round((presences / totalTrainings) * 100) : 0;
    const grade = totalTrainings === 0 ? 'Sem dados' : pct >= 85 ? 'Excelente' : pct >= 70 ? 'Bom' : pct >= 50 ? 'Regular' : 'Baixa Assiduidade';

    return [
      p.number !== null && p.number !== undefined ? `#${p.number}` : '-',
      p.name,
      p.positions || 'Jogador',
      presences,
      absences,
      totalTrainings,
      totalTrainings > 0 ? `${pct}%` : '-',
      grade
    ];
  });

  const ws = createBolaComVisaoSheet(XLSX, 'Relatório de Assiduidade e Treinos', state, headers, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Assiduidade');

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(
    wb,
    `Assiduidade_Treinos_BolaComVisao_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

/**
 * Export Plantel de Jogadores in Excel (.xlsx)
 */
export async function exportSquadExcel(state: AppState) {
  const XLSX = await getXLSX();
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O Meu Clube';
  const activePlayers = sortPlayerObjs(state.roster.filter((p) => p.active !== false));

  const headers = [
    'Nº',
    'Nome Completo',
    'Posição',
    'Estado',
    'Idade',
    'Data Nascimento',
    'Pé',
    'Altura',
    'Peso',
    'Telefone',
    'Email',
    'Contacto Emergência',
    'Golos Marcados',
    'Assistências',
    'Cartões Amarelos',
    'Cartões Vermelhos',
    'Jogos a titular (1.ª parte)',
    'Titular 2.ª parte',
    'Partes a titular',
    'Minutos Jogados',
    'Média Avaliação'
  ];

  const calcStats = (pId: string) => {
    let golos = 0,
      assistencias = 0,
      amarelos = 0,
      vermelhos = 0,
      somaAvaliacoes = 0,
      numAvaliacoes = 0,
      jogosTitular = 0,
      titularSegundaParte = 0,
      partesTitular = 0,
      minutos = 0;
    (state.matches || []).forEach((m) => {
      if (state.trackSubs && m.finished) {
        const isStarter1 = (m.lineup || []).includes(pId);
        const isStarter2 = (m.lineupSecondHalf || []).includes(pId);
        if (isStarter1) jogosTitular++;
        if (isStarter2) titularSegundaParte++;
        partesTitular += (isStarter1 ? 1 : 0) + (isStarter2 ? 1 : 0);
        minutos += calcPlayerMinutes(m, pId);
      }
      (m.goals || []).forEach((g) => {
        if (g.type === 'scored' && g.scorerId === pId) golos++;
        if (g.type === 'scored' && g.assistId === pId) assistencias++;
      });
      (m.cards || []).forEach((c) => {
        if (c.playerId === pId) {
          if (c.color === 'Amarelo') amarelos++;
          else vermelhos++;
        }
      });
      if (m.ratings && m.ratings[pId]) {
        somaAvaliacoes += m.ratings[pId];
        numAvaliacoes++;
      }
    });
    return {
      golos,
      assistencias,
      amarelos,
      vermelhos,
      jogosTitular,
      titularSegundaParte,
      partesTitular,
      minutos,
      media: numAvaliacoes > 0 ? (somaAvaliacoes / numAvaliacoes).toFixed(1) : '-'
    };
  };

  const rows = activePlayers.map((p) => {
    const st = calcStats(p.id);
    return [
      p.number !== null && p.number !== undefined ? `#${p.number}` : '-',
      p.name,
      p.positions || 'Jogador',
      (p.status || 'disponivel').toUpperCase(),
      p.birthDate ? `${computeAge(p.birthDate)} anos` : '-',
      p.birthDate || '-',
      p.dominantFoot || 'Direito',
      p.height || '-',
      p.weight || '-',
      p.phone || '-',
      p.email || '-',
      p.emergencyContact || '-',
      st.golos,
      st.assistencias,
      st.amarelos,
      st.vermelhos,
      st.jogosTitular,
      st.titularSegundaParte,
      st.partesTitular,
      st.minutos,
      st.media
    ];
  });

  const ws = createBolaComVisaoSheet(XLSX, 'Dossier Completo do Plantel', state, headers, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantel');

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Plantel_BolaComVisao_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export Individual Player Profile in Excel (.xlsx)
 */
export async function exportPlayerProfileExcel(player: Player, stats: any, state: AppState) {
  const XLSX = await getXLSX();
  const headers = ['Campo / Métrica', 'Valor'];
  const rows = [
    ['Nº Camisola', player.number !== null && player.number !== undefined ? `#${player.number}` : '-'],
    ['Nome Completo', player.name],
    ['Posição Principal', player.positions || 'Jogador'],
    ['Estado Desportivo', (player.status || 'disponivel').toUpperCase()],
    ['Data de Nascimento', player.birthDate || '-'],
    ['Idade', player.birthDate ? `${computeAge(player.birthDate)} anos` : '-'],
    ['Pé Dominante', player.dominantFoot || 'Direito'],
    ['Altura', player.height || '-'],
    ['Peso', player.weight || '-'],
    ['Telefone', player.phone || '-'],
    ['Email', player.email || '-'],
    ['Contacto de Emergência', player.emergencyContact || '-'],
    ['Golos na Época', stats.golos || 0],
    ['Assistências', stats.assistencias || 0],
    ['Média de Avaliação', stats.media || '-'],
    ['Jogos a titular (1.ª parte)', stats.jogosTitular || 0],
    ['Titular 2.ª parte', stats.titularSegundaParte || 0],
    ['Partes a titular', stats.partesTitular || 0],
    ['Minutos Jogados', stats.minutos || 0],
    ['Cartões Amarelos', stats.amarelos || 0],
    ['Cartões Vermelhos', stats.vermelhos || 0],
    ['Faltas a Treinos', stats.faltasTreino || 0]
  ];

  const ws = createBolaComVisaoSheet(XLSX, `Ficha Individual - ${player.name}`, state, headers, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Perfil');

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Ficha_Atleta_BolaComVisao_${sanitize(player.name)}.xlsx`);
}

/**
 * Constrói o Workbook de Ficha de Jogo para Excel (.xlsx),
 * com todos os textos em MAIÚSCULAS, sem imagens nem símbolos,
 * e com tempos de jogo apenas em números (sem ').
 */
export function buildMatchSheetExcelWorkbook(match: Match, state: AppState, XLSX: any) {
  const myClub = (state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O MEU CLUBE').toUpperCase();
  const sc = match.goals.filter((g) => g.type === 'scored').length;
  const co = match.goals.filter((g) => g.type === 'conceded').length;

  const getPName = (id: string | null) => {
    if (!id || id === 'unknown' || id === 'none') return 'NÃO ATRIBUÍDO';
    if (id === 'autogolo' || id === 'auto_golo' || id === 'auto-golo') return 'AUTO GOLO (ADVERSÁRIO)';
    const p = state.roster.find((x) => x.id === id);
    return p ? playerLabel(p).toUpperCase() : '-';
  };

  const getStarterDetail = (id: string | null): string => {
    if (!id || id === 'unknown' || id === 'none') return '-';
    const p = state.roster.find((x) => x.id === id);
    if (!p) return '-';
    const parts: string[] = [];
    if (p.number !== null && p.number !== undefined && String(p.number).trim() !== '') {
      parts.push(`CAMISOLA ${p.number}`);
    }
    if (p.positions && p.positions.trim() !== '') {
      const cleanPos = p.positions
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .trim();
      if (cleanPos) parts.push(cleanPos);
    }
    return parts.length > 0 ? parts.join(' - ') : '-';
  };

  const compDetails = getMatchCompetitionDetails(match, state);
  const typeLabel = compDetails.typeLabel.toUpperCase();
  const phaseLabel = compDetails.faseJornadaText.toUpperCase();
  const compLabel = (
    compDetails.type === 'torneio'
      ? `${compDetails.tournamentName || 'TORNEIO'}${compDetails.phase ? ' - ' + compDetails.phase : ''}`
      : compDetails.type === 'campeonato'
        ? `CAMPEONATO${compDetails.phase ? ' - ' + compDetails.phase : ''}`
        : 'JOGO PARTICULAR / AMIGÁVEL'
  ).toUpperCase();

  const headers = ['TIPO DE REGISTO', 'DETALHE / EVENTO', 'ORIGEM / TIPO DE GOLO', 'MINUTO', 'ATLETA / INTERVENIENTES'];
  const rows: (string | number)[][] = [
    ['RESULTADO FINAL', `${myClub} ${sc} - ${co} ${match.opponent}`.toUpperCase(), '-', '-', `DATA: ${match.date}`.toUpperCase()],
    ['CONDIÇÃO', match.location === 'casa' ? 'CASA' : 'FORA', '-', '-', '-'],
    ['TIPO DE JOGO', typeLabel, '-', '-', `ORIGEM: ${compDetails.source === 'agenda' ? 'AGENDA DE JOGOS' : 'FICHA DE JOGO'}`],
    ['FASE / JORNADA', phaseLabel, '-', '-', `COMPETIÇÃO: ${compLabel}`],
    ['COMPETIÇÃO', compLabel, '-', '-', phaseLabel]
  ];

  // Remates dentro e fora da área
  const shotsInBoxFor = match.rematesDentroArea ?? match.shotsInBoxFor ?? 0;
  const shotsOutBoxFor = match.rematesForaArea ?? match.shotsOutBoxFor ?? 0;
  const totalShotsFor = shotsInBoxFor + shotsOutBoxFor;

  const shotsInBoxAgainst = match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0;
  const shotsOutBoxAgainst = match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0;
  const totalShotsAgainst = shotsInBoxAgainst + shotsOutBoxAgainst;

  const cornersFor = match.cantos ?? match.cornersFor ?? 0;
  const cornersAgainst = match.cantosAdv ?? match.cornersAgainst ?? 0;
  const foulsCommitted = match.foulsCommitted ?? match.faltas ?? 0;
  const foulsSuffered = match.foulsSuffered ?? match.faltasAdv ?? 0;

  // Remates da Nossa Equipa (sem símbolos ou imagens)
  rows.push(['REMATES A FAVOR (DENTRO DA ÁREA)', `${shotsInBoxFor} REMATES`, 'DENTRO DA ÁREA', '-', `EQUIPA: ${myClub}`.toUpperCase()]);
  rows.push(['REMATES A FAVOR (FORA DA ÁREA)', `${shotsOutBoxFor} REMATES`, 'FORA DA ÁREA', '-', `EQUIPA: ${myClub}`.toUpperCase()]);
  rows.push(['TOTAL DE REMATES A FAVOR', `${totalShotsFor} REMATES`, 'TOTAL', '-', `EQUIPA: ${myClub}`.toUpperCase()]);

  // Remates do Adversário (sem símbolos ou imagens)
  rows.push(['REMATES CONTRA (DENTRO DA ÁREA)', `${shotsInBoxAgainst} REMATES`, 'DENTRO DA ÁREA', '-', `ADVERSÁRIO: ${match.opponent}`.toUpperCase()]);
  rows.push(['REMATES CONTRA (FORA DA ÁREA)', `${shotsOutBoxAgainst} REMATES`, 'FORA DA ÁREA', '-', `ADVERSÁRIO: ${match.opponent}`.toUpperCase()]);
  rows.push(['TOTAL DE REMATES CONTRA', `${totalShotsAgainst} REMATES`, 'TOTAL', '-', `ADVERSÁRIO: ${match.opponent}`.toUpperCase()]);

  // Cantos e Faltas (sem símbolos)
  rows.push(['CANTOS', `A FAVOR: ${cornersFor} | CONTRA: ${cornersAgainst}`, 'BOLA PARADA', '-', `NÓS ${cornersFor} - ${cornersAgainst} ADV`]);
  rows.push(['FALTAS', `COMETIDAS: ${foulsCommitted} | SOFRIDAS: ${foulsSuffered}`, 'INFRAÇÕES', '-', `NÓS ${foulsCommitted} - ${foulsSuffered} ADV`]);

  // Goals com Origem / Tipo de Golo explícito (tempo puramente numérico, sem ' ou símbolos)
  match.goals.forEach((g) => {
    const minVal: string | number =
      g.minute != null && String(g.minute).trim() !== ''
        ? sanitizeExcelModeGameText(g.minute)
        : '-';
    const periodLabel = (g.half ? `${g.half}ª PARTE` : (g.period || 'TEMPO REGULAMENTAR')).toUpperCase();
    const goalOrigin = (g.goalType || 'BOLA JOGADA').toUpperCase();

    if (g.type === 'scored') {
      const ast = g.assistId ? ` (ASSISTÊNCIA: ${getPName(g.assistId)})` : '';
      rows.push([
        'GOLO MARCADO',
        `GOLO (${periodLabel}) - ORIGEM: ${goalOrigin}`,
        goalOrigin,
        minVal,
        `${getPName(g.scorerId)}${ast}`
      ]);
    } else {
      const notesStr = g.notes ? ` - NOTAS: ${g.notes.toUpperCase()}` : '';
      rows.push([
        'GOLO SOFRIDO',
        `GOLO SOFRIDO (${periodLabel}) - ORIGEM: ${goalOrigin}`,
        goalOrigin,
        minVal,
        `ADVERSÁRIO: ${match.opponent.toUpperCase()}${notesStr}`
      ]);
    }
  });

  // Cards (tempo puramente número, sem ')
  (match.cards || []).forEach((c) => {
    const minVal: string | number =
      c.minute != null && String(c.minute).trim() !== ''
        ? sanitizeExcelModeGameText(c.minute)
        : '-';
    const cardPeriodLabel = (c.period ? c.period : c.half ? `${c.half}ª PARTE` : 'TEMPO REGULAMENTAR').toUpperCase();
    rows.push([`CARTÃO ${c.color.toUpperCase()}`, `DISCIPLINA (${cardPeriodLabel})`, '-', minVal, getPName(c.playerId)]);
  });

  // Titulares 1.ª Parte e 2.ª Parte (sem texto repetido)
  (match.lineup || []).forEach((pid) => {
    rows.push(['TITULAR 1.ª PARTE', getStarterDetail(pid), '-', '-', getPName(pid).toUpperCase()]);
  });
  (match.lineupSecondHalf || []).forEach((pid) => {
    rows.push(['TITULAR 2.ª PARTE', getStarterDetail(pid), '-', '-', getPName(pid).toUpperCase()]);
  });

  // Subs (tempo puramente número, sem ' ou INTERVALO)
  (match.subs || []).forEach((s) => {
    const minVal: string | number = s.isHalftime
      ? 'INTERVALO'
      : s.minute != null && String(s.minute).trim() !== ''
        ? sanitizeExcelModeGameText(s.minute)
        : '-';
    rows.push(['SUBSTITUIÇÃO', `SAIU: ${getPName(s.outId)}`, '-', minVal, `ENTROU: ${getPName(s.inId)}`]);
  });

  // Folha 1: Ficha Principal de Jogo
  const extraMeta: (string | number)[][] = [
    ['TIPO:', typeLabel, 'FASE / JORNADA:', phaseLabel, 'ADVERSÁRIO:', match.opponent.toUpperCase()],
    ['COMPETIÇÃO:', compLabel, 'SINCRONIZAÇÃO:', compDetails.source === 'agenda' ? 'SINCRONIZADO COM A AGENDA' : 'FICHA DE JOGO']
  ];
  const ws = createBolaComVisaoSheet(
    XLSX,
    `FICHA DE JOGO VS ${match.opponent}`.toUpperCase(),
    state,
    headers,
    rows,
    extraMeta,
    true
  );

  // Folha 2: Resumo Dedicado da Origem e Tipo dos Golos
  const goalOriginHeaders = ['ORIGEM / TIPO DE LANCE', 'GOLOS MARCADOS (NÓS)', 'GOLOS SOFRIDOS (ADV)', 'TOTAL'];
  const standardTypes = [
    'BOLA JOGADA',
    'RECUPERAÇÃO DE BOLA',
    'CANTO',
    'LIVRE',
    'PENÁLTI',
    'PONTAPÉ DE BALIZA',
    'RESSALTO',
    'OUTRO'
  ];
  const originMap: Record<string, { scored: number; conceded: number }> = {};
  standardTypes.forEach((t) => {
    originMap[t] = { scored: 0, conceded: 0 };
  });

  match.goals.forEach((g) => {
    const origin = (g.goalType || 'BOLA JOGADA').toUpperCase();
    if (!originMap[origin]) {
      originMap[origin] = { scored: 0, conceded: 0 };
    }
    if (g.type === 'scored') {
      originMap[origin].scored++;
    } else {
      originMap[origin].conceded++;
    }
  });

  const goalOriginRows = Object.entries(originMap).map(([type, stats]) => [
    type,
    stats.scored,
    stats.conceded,
    stats.scored + stats.conceded
  ]);

  const wsOrigin = createBolaComVisaoSheet(
    XLSX,
    `ORIGEM E TIPOS DE GOLO VS ${match.opponent}`.toUpperCase(),
    state,
    goalOriginHeaders,
    goalOriginRows,
    undefined,
    true
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'FICHA DE JOGO');
  XLSX.utils.book_append_sheet(wb, wsOrigin, 'ORIGEM DOS GOLOS');

  return { wb, ws, wsOrigin };
}

/**
 * Export Match Sheet in Excel (.xlsx)
 */
export async function exportMatchSheetExcel(match: Match, state: AppState) {
  const XLSX = await getXLSX();
  const { wb } = buildMatchSheetExcelWorkbook(match, state, XLSX);
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  XLSX.writeFile(wb, `FICHA_JOGO_BOLACOMVISAO_${sanitize(match.opponent)}_${match.date}.xlsx`);
}

/**
 * Export Season Stats in Excel (.xlsx)
 */
export async function exportSeasonStatsExcel(state: AppState) {
  const XLSX = await getXLSX();
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O Meu Clube';
  const activePlayers = sortPlayerObjs(state.roster.filter((p) => p.active !== false));

  const headers = [
    'Nº',
    'Nome',
    'Posição',
    'Golos',
    'Assistências',
    'Cartões Amarelos',
    'Cartões Vermelhos',
    'Faltas Treino',
    'Jogos a titular (1.ª parte)',
    'Titular 2.ª parte',
    'Partes a titular',
    'Minutos',
    'Média Avaliação'
  ];

  const calcPlayerStats = (pId: string) => {
    let golos = 0,
      assistencias = 0,
      amarelos = 0,
      vermelhos = 0,
      somaAvaliacoes = 0,
      numAvaliacoes = 0,
      faltasTreino = 0,
      jogosTitular = 0,
      titularSegundaParte = 0,
      partesTitular = 0,
      minutos = 0;
    (state.matches || []).forEach((m) => {
      if (state.trackSubs && m.finished) {
        const isStarter1 = (m.lineup || []).includes(pId);
        const isStarter2 = (m.lineupSecondHalf || []).includes(pId);
        if (isStarter1) jogosTitular++;
        if (isStarter2) titularSegundaParte++;
        partesTitular += (isStarter1 ? 1 : 0) + (isStarter2 ? 1 : 0);
        minutos += calcPlayerMinutes(m, pId);
      }
      (m.goals || []).forEach((g) => {
        if (g.type === 'scored' && g.scorerId === pId) golos++;
        if (g.type === 'scored' && g.assistId === pId) assistencias++;
      });
      (m.cards || []).forEach((c) => {
        if (c.playerId === pId) {
          if (c.color === 'Amarelo') amarelos++;
          else vermelhos++;
        }
      });
      if (m.ratings && m.ratings[pId]) {
        somaAvaliacoes += m.ratings[pId];
        numAvaliacoes++;
      }
    });
    (state.trainings || []).forEach((tr) => {
      if (tr.completed !== false && tr.absences && tr.absences.includes(pId)) faltasTreino++;
    });
    return {
      golos,
      assistencias,
      amarelos,
      vermelhos,
      media: numAvaliacoes > 0 ? (somaAvaliacoes / numAvaliacoes).toFixed(1) : '-',
      faltasTreino,
      jogosTitular,
      titularSegundaParte,
      partesTitular,
      minutos
    };
  };

  const rows = activePlayers.map((p) => {
    const st = calcPlayerStats(p.id);
    return [
      p.number !== null && p.number !== undefined ? `#${p.number}` : '-',
      p.name,
      p.positions || 'Jogador',
      st.golos,
      st.assistencias,
      st.amarelos,
      st.vermelhos,
      st.faltasTreino,
      st.jogosTitular,
      st.titularSegundaParte,
      st.partesTitular,
      st.minutos,
      st.media
    ];
  });

  const ws = createBolaComVisaoSheet(XLSX, 'Estatísticas Gerais da Época', state, headers, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estatísticas');

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(
    wb,
    `Estatisticas_Epoca_BolaComVisao_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

/**
 * Export Game Analysis Dashboard Stats in Excel (.xlsx) with multiple sheets
 */
export async function exportGameAnalysisExcel(
  analysis: import('./gameAnalysisUtils').AggregatedAnalysis,
  filters: import('./gameAnalysisUtils').AnalysisFilters,
  state: AppState
) {
  const XLSX = await getXLSX();
  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'O Meu Clube';

  const getPName = (id: string | null | undefined) => {
    if (!id || id === 'unknown' || id === 'none') return '—';
    if (id === 'autogolo' || id === 'auto_golo' || id === 'auto-golo') return 'Auto-Golo';
    const p = state.roster.find((x) => x.id === id);
    return p ? playerLabel(p) : '—';
  };

  // Sheet 1: Resumo Indicadores
  const summaryHeaders = ['Indicador / Métrica', 'Valor'];
  const summaryRows: (string | number)[][] = [
    ['Total de Jogos no Filtro', analysis.totalMatches],
    ['Jogos Concluídos', analysis.finishedMatchesCount],
    ['Vitórias', `${analysis.wins} (${analysis.winPercentage}%)`],
    ['Empates', `${analysis.draws} (${analysis.drawPercentage}%)`],
    ['Derrotas', `${analysis.losses} (${analysis.lossPercentage}%)`],
    ['Golos Marcados', analysis.goalsScored],
    ['Média Golos Marcados / Jogo', analysis.avgGoalsScored],
    ['Golos Sofridos', analysis.goalsConceded],
    ['Média Golos Sofridos / Jogo', analysis.avgGoalsConceded],
    ['Saldo de Golos', `${analysis.goalDifference > 0 ? '+' : ''}${analysis.goalDifference}`],
    ['Clean Sheets (Sem Sofrer)', analysis.cleanSheets],
    ['Jogos Sem Marcar', analysis.failedToScore],
    ['Faltas Cometidas (Média)', analysis.foulsCommittedAvg !== null ? analysis.foulsCommittedAvg : 'Não registado'],
    ['Faltas Sofridas (Média)', analysis.foulsSufferedAvg !== null ? analysis.foulsSufferedAvg : 'Não registado'],
    ['Cartões Amarelos', analysis.yellowCardsTotal],
    ['Cartões Vermelhos', analysis.redCardsTotal],
    ['Média Cartões / Jogo', analysis.cardsPerMatchAvg]
  ];

  const wsSummary = createBolaComVisaoSheet(XLSX, 'Análise Estatística - Resumo Geral', state, summaryHeaders, summaryRows);

  // Sheet 1.5: Insights Automáticos (O que os dados nos dizem)
  const insightHeaders = ['Tipo / Categoria', 'Título', 'Destaque / Valor', 'Descrição'];
  const insightRows = (analysis.insights || []).map((ins) => [
    `${ins.icon} ${ins.badgeText}`,
    ins.title,
    ins.stat || '-',
    ins.description
  ]);
  const wsInsights = createBolaComVisaoSheet(XLSX, 'O que os dados nos dizem - Insights Automáticos', state, insightHeaders, insightRows);

  // Sheet 2: Distribuição Temporal (0-15, 16-30, 31-45, 46-60, 61-75, 76-90, 90+)
  const timeHeaders = ['Período de Jogo', 'Golos Marcados', 'Golos Sofridos', 'Saldo'];
  const timeRows = Object.values(analysis.timePeriods).map((tp) => [
    tp.label,
    tp.scored,
    tp.conceded,
    tp.scored - tp.conceded > 0 ? `+${tp.scored - tp.conceded}` : tp.scored - tp.conceded
  ]);
  const wsTime = createBolaComVisaoSheet(XLSX, 'Distribuição Temporal de Golos', state, timeHeaders, timeRows);

  // Sheet 3: Origem dos Golos Marcados e Sofridos
  const goalTypeHeaders = ['Tipo / Origem do Lance', 'Golos Marcados (Nós)', 'Percentagem Marcados (%)', 'Golos Sofridos (Adv)'];
  const concededMap = new Map((analysis.concededGoalTypes || []).map((cg) => [cg.type, cg.count]));
  const goalTypeRows = analysis.goalTypes.map((gt) => [
    gt.type,
    gt.count,
    `${gt.percentage}%`,
    concededMap.get(gt.type) || 0
  ]);
  const wsGoalTypes = createBolaComVisaoSheet(XLSX, 'Origem dos Golos Marcados e Sofridos', state, goalTypeHeaders, goalTypeRows);

  // Sheet 4: Lista de Jogos Filtrados
  const matchHeaders = [
    'Data',
    'Adversário',
    'Competição',
    'Condição',
    'Resultado',
    'Golos Marcados',
    'Golos Sofridos',
    'Remates Favor (Dentro Área)',
    'Remates Favor (Fora Área)',
    'Total Remates Favor',
    'Remates Contra (Dentro Área)',
    'Remates Contra (Fora Área)',
    'Total Remates Contra',
    'Cantos (Nós/Adv)',
    'Faltas (Comet/Sofr)'
  ];
  const matchRows = analysis.filteredMatches.map((m) => {
    const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
    const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
    const inFor = m.rematesDentroArea ?? m.shotsInBoxFor ?? 0;
    const outFor = m.rematesForaArea ?? m.shotsOutBoxFor ?? 0;
    const inAdv = m.rematesDentroAreaAdv ?? m.shotsInBoxAgainst ?? 0;
    const outAdv = m.rematesForaAreaAdv ?? m.shotsOutBoxAgainst ?? 0;
    const cFor = m.cantos ?? m.cornersFor ?? 0;
    const cAdv = m.cantosAdv ?? m.cornersAgainst ?? 0;
    const fCom = m.foulsCommitted ?? m.faltas ?? 0;
    const fSuf = m.foulsSuffered ?? m.faltasAdv ?? 0;

    return [
      m.date,
      m.opponent,
      m.type || 'Jogo',
      m.location === 'casa' ? 'Casa' : 'Fora',
      m.finished ? `${sc} - ${co}` : 'Agendado',
      sc,
      co,
      inFor,
      outFor,
      inFor + outFor,
      inAdv,
      outAdv,
      inAdv + outAdv,
      `${cFor} - ${cAdv}`,
      `${fCom} - ${fSuf}`
    ];
  });
  const wsMatches = createBolaComVisaoSheet(XLSX, 'Histórico de Jogos Analisados', state, matchHeaders, matchRows);

  // Sheet 5: Lista de Acontecimentos / Drill-down com Origem / Tipo de Golo
  const eventHeaders = [
    'Minuto',
    'Data',
    'Adversário',
    'Evento',
    'Origem / Tipo de Golo',
    'Jogador Principal',
    'Jogador Secundário / Assistência',
    'Detalhes / Notas'
  ];
  const eventRows = analysis.allEvents.map((ev) => [
    ev.minute != null ? `${ev.minute}'` : (ev.period || '-'),
    ev.match.date,
    ev.match.opponent,
    ev.detail,
    ev.goalType || (ev.kind === 'golo_marcado' || ev.kind === 'golo_sofrido' ? 'Bola jogada' : '-'),
    getPName(ev.playerPrimaryId),
    getPName(ev.playerSecondaryId),
    ev.notes || '-'
  ]);
  const wsEvents = createBolaComVisaoSheet(XLSX, 'Registo Detalhado de Acontecimentos', state, eventHeaders, eventRows);

  // Append all sheets to workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');
  XLSX.utils.book_append_sheet(wb, wsInsights, 'Insights Automáticos');
  XLSX.utils.book_append_sheet(wb, wsTime, 'Períodos de Jogo');
  XLSX.utils.book_append_sheet(wb, wsGoalTypes, 'Origem dos Golos');
  XLSX.utils.book_append_sheet(wb, wsMatches, 'Jogos');
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Acontecimentos');

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(
    wb,
    `Analise_Jogos_BolaComVisao_${sanitize(myClub)}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function exportJSONBackup(state: AppState) {
  const data = { ...state, lastBackupDate: Date.now() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bolacomvisao-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportCSVStats(state: AppState, lang: Language) {
  exportSeasonStatsExcel(state);
}

export function exportTXTReport(state: AppState, lang: Language) {
  const lines: string[] = [];
  lines.push('⚽ BolaComVisao - Relatório Geral de Futebol');
  lines.push(`Emitido em: ${new Date().toLocaleDateString('pt-PT')}`);
  lines.push('='.repeat(45));
  lines.push('');

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'BolaComVisao';
  lines.push(`Clube: ${myClub}`);
  lines.push(`Escalão: ${state.category || 'Geral'}`);
  lines.push(`Época: ${state.season || '2025/2026'}`);
  lines.push(`Total de Jogadores: ${state.roster.filter((p) => p.active !== false).length}`);
  lines.push(`Total de Jogos: ${state.matches.length}`);
  lines.push(`Total de Treinos: ${state.trainings.length}`);
  lines.push('');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-bolacomvisao-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
