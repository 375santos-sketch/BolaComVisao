import { AppState, Match } from '../types';
import { getCalledUpPlayers, getMatchTotalMinutes, withPlayableDurations } from './playingTime';
import { teamGameRow } from './statsPanel';
import { absenceReasonLabel } from './trainingQuick';
import { calcPlayerMinutes, seasonFromDate } from './utils';

/**
 * Tables for Power BI (one sheet each, one header row, one fact per row) so relationships work by id:
 * Atletas, Jogos, Golos, MinutosPorJogo, Cartoes, Treinos, Presencas.
 * Only sports data: no contacts, birth dates or coach notes (the file may be shared).
 */
export type PowerBiTables = Record<string, (string | number | boolean | null)[][]>;

const yes = (b: boolean) => (b ? 'Sim' : 'Não');
const resultOf = (scored: number, conceded: number) => (scored > conceded ? 'V' : scored < conceded ? 'D' : 'E');
const typeLabel = (t?: string) => (t === 'campeonato' ? 'Campeonato' : t === 'torneio' ? 'Torneio' : 'Amigável');

export function buildPowerBiTables(
  state: Pick<AppState, 'roster' | 'matches' | 'trainings' | 'category'>
): PowerBiTables {
  const roster = state.roster || [];
  const games: Match[] = (state.matches || []).filter((m) => m && m.finished);

  const atletas = [
    ['AtletaId', 'Numero', 'Nome', 'Posicao', 'Ativo'],
    ...roster.map((p) => [p.id, p.number ?? null, p.name, p.positions || null, yes(p.active !== false)])
  ];

  const jogos: PowerBiTables[string] = [
    [
      'JogoId',
      'Data',
      'Epoca',
      'Adversario',
      'Local',
      'Competicao',
      'Fase',
      'GolosMarcados',
      'GolosSofridos',
      'Resultado',
      'RematesFavor',
      'RematesContra',
      'CantosFavor',
      'CantosContra',
      'MinutosJogo'
    ]
  ];
  const golos: PowerBiTables[string] = [['JogoId', 'Data', 'Tipo', 'Minuto', 'MarcadorId', 'AssistenciaId', 'Origem']];
  const minutos: PowerBiTables[string] = [
    ['JogoId', 'AtletaId', 'Data', 'Convocado', 'Titular', 'Minutos', 'MinutosPossiveis', 'Golos', 'Assistencias']
  ];
  const cartoes: PowerBiTables[string] = [['JogoId', 'AtletaId', 'Data', 'Cor', 'Minuto']];

  games.forEach((m) => {
    const r = teamGameRow(m);
    const total = getMatchTotalMinutes(m, state.category);
    jogos.push([
      m.id,
      m.date,
      m.season || seasonFromDate(m.date),
      m.opponent,
      r.home ? 'Casa' : 'Fora',
      typeLabel(m.type),
      m.phase || null,
      r.scored,
      r.conceded,
      resultOf(r.scored, r.conceded),
      r.shotsFor ?? null,
      r.shotsAgainst ?? null,
      r.cornersFor ?? null,
      r.cornersAgainst ?? null,
      total
    ]);
    (m.goals || []).forEach((g) =>
      golos.push([
        m.id,
        m.date,
        g.type === 'scored' ? 'Marcado' : 'Sofrido',
        g.minute ? parseInt(String(g.minute).replace(/[^0-9]/g, ''), 10) || null : null,
        g.type === 'scored' ? g.scorerId || null : null,
        g.type === 'scored' ? g.assistId || null : null,
        g.goalType || null
      ])
    );
    const called = new Set(getCalledUpPlayers(m));
    const full = withPlayableDurations(m, state.category);
    roster.forEach((p) => {
      const isCalled = called.has(p.id);
      const mins = calcPlayerMinutes(full, p.id);
      if (!isCalled && mins === 0) return;
      minutos.push([
        m.id,
        p.id,
        m.date,
        yes(isCalled),
        yes((m.lineup || []).includes(p.id)),
        mins,
        isCalled ? total : 0,
        (m.goals || []).filter((g) => g.type === 'scored' && g.scorerId === p.id).length,
        (m.goals || []).filter((g) => g.type === 'scored' && g.assistId === p.id).length
      ]);
    });
    (m.cards || []).forEach((c) =>
      cartoes.push([
        m.id,
        c.playerId,
        m.date,
        c.color === 'Vermelho' || c.type === 'red' ? 'Vermelho' : 'Amarelo',
        c.minute ? parseInt(String(c.minute).replace(/[^0-9]/g, ''), 10) || null : null
      ])
    );
  });

  const held = (state.trainings || []).filter((t) => t && t.completed !== false);
  const treinos = [
    ['TreinoId', 'Numero', 'Data', 'Epoca', 'Tipo', 'Local'],
    ...held.map((t) => [
      t.id,
      t.trainingNumber ?? null,
      t.date,
      t.season || seasonFromDate(t.date),
      t.type || null,
      t.location || null
    ])
  ];
  const presencas: PowerBiTables[string] = [['TreinoId', 'AtletaId', 'Data', 'Presente', 'MotivoFalta']];
  held.forEach((t) =>
    roster
      .filter((p) => p.active !== false)
      .forEach((p) => {
        const absent = (t.absences || []).includes(p.id);
        presencas.push([
          t.id,
          p.id,
          t.date,
          yes(!absent),
          absent ? absenceReasonLabel(t.absenceReasons?.[p.id]) : null
        ]);
      })
  );

  return {
    Atletas: atletas,
    Jogos: jogos,
    Golos: golos,
    MinutosPorJogo: minutos,
    Cartoes: cartoes,
    Treinos: treinos,
    Presencas: presencas
  };
}
