import React, { useMemo, useRef, useState } from 'react';
import { AppState, LeagueGame, LeagueSetup } from '../../../types';
import {
  computeStandings,
  harmonizeTeams,
  leagueGames,
  mergeLeagueGames,
  parseResults,
  phaseLabel,
  phaseRange,
  seasonPhases,
  teamKey,
  withoutOurGames
} from '../../../lib/leagueTable';
import { uid } from '../../../lib/utils';
import { cleanPrintGames, printToLeagueGames } from '../../../lib/printJornada';
import { compressImageFile } from '../../../lib/imageCompress';
import { auth } from '../../../services/firebase';

interface LeagueTableModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

type Panel = 'tabela' | 'resultados' | 'colar' | 'equipas';

const input =
  'w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-cyan-400 outline-none';
const ddmm = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const ddmmyyyy = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

/**
 * Resultados → Classificação: the championship table of the team's series. The other games of the series are typed
 * or pasted by the coach; the team's own championship games come from the app.
 */
export const LeagueTableModal: React.FC<LeagueTableModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const season = state.season || '';
  // A season can have several phases (1.ª fase, 2.ª fase…), each with its own teams and results
  const phases = useMemo(() => seasonPhases(team?.leagues, season), [team?.leagues, season]);
  const [phaseId, setPhaseId] = useState<string>(() => phases[phases.length - 1]?.id || '');
  const [draftId] = useState(uid);
  const stored = phases.find((l) => l.id === phaseId) || phases[phases.length - 1];
  const league: LeagueSetup = useMemo(
    () => stored || { id: draftId, season, teams: [], games: [] },
    [stored, season, draftId]
  );
  const range = useMemo(() => phaseRange(team?.leagues, league), [team?.leagues, league]);
  const ourName = (league.ourName || state.myClubName || 'A nossa equipa').trim();
  const allPhases = stored ? phases : [league];

  const [panel, setPanel] = useState<Panel>('tabela');
  const [pasted, setPasted] = useState('');
  const [teamsText, setTeamsText] = useState(league.teams.join('\n'));
  const [form, setForm] = useState({ round: '', date: '', home: '', homeGoals: '', awayGoals: '', away: '' });
  const [newPhase, setNewPhase] = useState<{ name: string; startDate: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [printGames, setPrintGames] = useState<{ games: LeagueGame[]; ours: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const games = useMemo(
    () => leagueGames(league, state.matches || [], ourName, range),
    [league, state.matches, ourName, range]
  );
  const table = useMemo(
    () => computeStandings(games, [ourName, ...league.teams], ourName),
    [games, league.teams, ourName]
  );
  const ours = table.find((r) => r.ours);
  const preview = useMemo(() => parseResults(pasted, season), [pasted, season]);
  const knownTeams = useMemo(() => {
    const names = new Map<string, string>();
    [...table.map((r) => r.team), ...(state.schedule || []).map((s) => s.opponent)].forEach((n) => {
      if (n && n.trim() && !names.has(teamKey(n))) names.set(teamKey(n), n.trim());
    });
    return [...names.values()].sort((a, b) => a.localeCompare(b, 'pt-PT'));
  }, [table, state.schedule]);

  /** Saves phases (replaced by id; the other phases and seasons are kept). */
  const saveAll = (next: LeagueSetup[]) => {
    if (!team) {
      onShowToast('Escolha primeiro uma equipa.');
      return false;
    }
    const ids = new Set(next.map((l) => l.id));
    const leagues = [...(team.leagues || []).filter((l) => !ids.has(l.id)), ...next];
    onUpdateState({ teams: (state.teams || []).map((t) => (t.id === team.id ? { ...t, leagues } : t)) });
    return true;
  };
  const save = (next: LeagueSetup) => saveAll([next]);

  const choosePhase = (l: LeagueSetup) => {
    setPhaseId(l.id);
    setTeamsText(l.teams.join('\n'));
    setPrintGames(null);
  };

  const createPhase = () => {
    if (!newPhase) return;
    const startDate = newPhase.startDate;
    if (!startDate) {
      onShowToast('Indique o dia em que começa a nova fase.');
      return;
    }
    if (allPhases.some((l) => (l.startDate || '') >= startDate)) {
      onShowToast('A nova fase tem de começar depois da fase anterior.');
      return;
    }
    const phase: LeagueSetup = {
      id: uid(),
      season,
      name: newPhase.name.trim() || undefined,
      startDate,
      ourName: league.ourName,
      teams: [],
      games: []
    };
    // The first phase is kept (saved too if it was never saved), with everything it had
    if (!saveAll(stored ? [phase] : [league, phase])) return;
    setNewPhase(null);
    choosePhase(phase);
    setPanel('equipas');
    onShowToast(`Nova fase criada a partir de ${ddmmyyyy(startDate)} ✓ Indique as equipas.`);
  };

  const deletePhase = () => {
    if (!team || !stored || phases.length < 2) return;
    if (!window.confirm(`Apagar "${phaseLabel(phases, league)}" e os resultados dessa fase?`)) return;
    const leagues = (team.leagues || []).filter((l) => l.id !== league.id);
    onUpdateState({ teams: (state.teams || []).map((t) => (t.id === team.id ? { ...t, leagues } : t)) });
    const rest = phases.filter((l) => l.id !== league.id);
    choosePhase(rest[rest.length - 1]);
    setPanel('tabela');
    onShowToast('Fase apagada.');
  };

  /** Names as the app already uses them: our team and opponents written differently on the site or picture. */
  const knownNames = () =>
    [
      ...league.teams,
      ...league.games.flatMap((g) => [g.home, g.away]),
      ...(state.matches || []).map((m) => m.opponent),
      ...(state.schedule || []).map((s) => s.opponent)
    ].filter(Boolean);

  const addGame = () => {
    const home = form.home.trim();
    const away = form.away.trim();
    const hg = Number(form.homeGoals);
    const ag = Number(form.awayGoals);
    if (!home || !away || form.homeGoals === '' || form.awayGoals === '' || isNaN(hg) || isNaN(ag)) {
      onShowToast('Preencha as duas equipas e o resultado.');
      return;
    }
    if (teamKey(home) === teamKey(away)) {
      onShowToast('Escolha duas equipas diferentes.');
      return;
    }
    if (teamKey(home) === teamKey(ourName) || teamKey(away) === teamKey(ourName)) {
      onShowToast(`Os jogos de ${ourName} entram sozinhos a partir dos jogos de campeonato da app.`);
      return;
    }
    const game: LeagueGame = {
      id: uid(),
      round: form.round ? Number(form.round) : undefined,
      date: form.date || undefined,
      home,
      away,
      homeGoals: hg,
      awayGoals: ag
    };
    save({ ...league, games: mergeLeagueGames(league.games, [game]) });
    setForm({ ...form, home: '', homeGoals: '', awayGoals: '', away: '' });
    onShowToast(`Resultado guardado: ${home} ${hg}-${ag} ${away} ✓`);
  };

  const importPasted = () => {
    if (preview.games.length === 0) {
      onShowToast('Não encontrei resultados no texto colado.');
      return;
    }
    const harmonized = harmonizeTeams(preview.games, { ourName, clubName: state.myClubName, known: knownNames() });
    // Our games come from the app: never imported, so they are not counted twice
    const games = withoutOurGames(harmonized.games, ourName);
    const ours = harmonized.games.length - games.length;
    if (games.length) save({ ...league, games: mergeLeagueGames(league.games, games) });
    setPasted('');
    setPanel('tabela');
    onShowToast(`${games.length} resultado(s) importado(s) ✓${ours ? ` (o jogo de ${ourName} já vem da app)` : ''}`);
  };

  const readPrint = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setPrintGames(null);
    try {
      const image = await compressImageFile(file, 1600, 600_000);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Entre na app com a sua conta para ler prints.');
      const resp = await fetch('/api/ler-jornada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.success) throw new Error(data.error || 'Não foi possível ler o print.');
      const read = printToLeagueGames(cleanPrintGames(data.games), season);
      if (!read.length) throw new Error('Não encontrei resultados neste print.');
      const harmonized = harmonizeTeams(read, { ourName, clubName: state.myClubName, known: knownNames() });
      const games = withoutOurGames(harmonized.games, ourName);
      setPrintGames({ games, ours: harmonized.games.length - games.length });
    } catch (err: any) {
      onShowToast(err?.message || 'Não foi possível ler o print.');
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const importPrint = () => {
    if (!printGames?.games.length) return;
    save({ ...league, games: mergeLeagueGames(league.games, printGames.games) });
    onShowToast(`${printGames.games.length} resultado(s) importado(s) do print ✓`);
    setPrintGames(null);
    setPanel('tabela');
  };

  const tabBtn = (id: Panel, label: string) => (
    <button
      type="button"
      onClick={() => setPanel(id)}
      className={`py-1.5 rounded-lg text-[11px] font-bold ${panel === id ? 'bg-cyan-500 text-slate-950' : 'text-cyan-200/80'}`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Classificação do campeonato"
        className="w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">📊 Classificação</h3>
            <div className="text-[11px] text-slate-400 truncate">
              {allPhases.length > 1 ? phaseLabel(allPhases, league) : league.name || 'Campeonato'} · Época {season}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar classificação" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>

        <div role="group" aria-label="Fases" className="flex flex-wrap items-center gap-1.5">
          {allPhases.length > 1 &&
            allPhases.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={l.id === league.id}
                onClick={() => choosePhase(l)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  l.id === league.id ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'border-slate-700 text-slate-300'
                }`}
              >
                {phaseLabel(allPhases, l)}
              </button>
            ))}
          <button
            type="button"
            onClick={() => setNewPhase(newPhase ? null : { name: '', startDate: '' })}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-dashed border-cyan-500/60 text-cyan-200"
          >
            ➕ Nova fase
          </button>
        </div>

        {newPhase && (
          <section
            aria-label="Nova fase"
            className="space-y-2 p-3 rounded-2xl bg-slate-950/60 border border-cyan-500/40"
          >
            <p className="text-[11px] text-slate-300">
              A fase atual fica guardada como está. A nova fase começa com a tabela a zeros, novas equipas e novas
              jornadas; os jogos de {ourName} a partir do dia indicado contam para ela.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-slate-400">
                Nome da fase
                <input
                  className={input}
                  value={newPhase.name}
                  placeholder={`${allPhases.length + 1}.ª fase`}
                  onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                />
              </label>
              <label className="text-[10px] text-slate-400">
                Começa em
                <input
                  type="date"
                  className={input}
                  value={newPhase.startDate}
                  onChange={(e) => setNewPhase({ ...newPhase, startDate: e.target.value })}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={createPhase}
              className="w-full py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase"
            >
              Criar fase
            </button>
          </section>
        )}

        {ours && ours.played > 0 && (
          <div
            aria-label="Posição da equipa"
            className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center gap-3"
          >
            <div className="text-3xl font-black text-cyan-300 font-['Chakra_Petch']">{ours.position}.º</div>
            <div className="text-xs text-slate-200">
              <b>{ourName}</b> em {ours.position}.º lugar de {table.length}
              <div className="text-[11px] text-slate-400">
                {ours.points} pontos · {ours.played} jogos ({ours.won}V {ours.drawn}E {ours.lost}D) · golos{' '}
                {ours.goalsFor}-{ours.goalsAgainst}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950/70 border border-slate-800">
          {tabBtn('tabela', 'Tabela')}
          {tabBtn('resultados', 'Resultados')}
          {tabBtn('colar', 'Colar')}
          {tabBtn('equipas', 'Equipas')}
        </div>

        {panel === 'tabela' && (
          <>
            {table.length <= 1 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Ainda sem equipas. Indique as equipas da série em <b>Equipas</b> e registe os resultados dos outros
                jogos em <b>Resultados</b> ou <b>Colar</b>. Os jogos de campeonato de {ourName} entram sozinhos.
              </p>
            ) : (
              <table aria-label="Tabela classificativa" className="w-full text-[11px] text-slate-200">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase">
                    <th className="text-left py-1 w-6">#</th>
                    <th className="text-left">Equipa</th>
                    <th title="Jogos">J</th>
                    <th title="Vitórias">V</th>
                    <th title="Empates">E</th>
                    <th title="Derrotas">D</th>
                    <th className="hidden sm:table-cell" title="Golos marcados e sofridos">
                      Golos
                    </th>
                    <th title="Diferença de golos">DG</th>
                    <th title="Pontos">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r) => (
                    <tr
                      key={r.team}
                      className={`border-t border-slate-800 text-center ${r.ours ? 'bg-cyan-500/15 text-white font-bold' : ''}`}
                    >
                      <td className="text-left py-1.5 font-mono">{r.position}</td>
                      <td className="text-left truncate max-w-[9rem] sm:max-w-none">{r.team}</td>
                      <td>{r.played}</td>
                      <td>{r.won}</td>
                      <td>{r.drawn}</td>
                      <td>{r.lost}</td>
                      <td className="hidden sm:table-cell font-mono">
                        {r.goalsFor}-{r.goalsAgainst}
                      </td>
                      <td className="font-mono">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                      <td className="font-black">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-[10px] text-slate-500">
              Vitória 3 pontos, empate 1. Em igualdade: jogos entre as equipas empatadas, depois diferença de golos e
              golos marcados.
            </p>
          </>
        )}

        {panel === 'resultados' && (
          <div className="space-y-3">
            <datalist id="league-teams">
              {knownTeams.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <section
              aria-label="Novo resultado"
              className="space-y-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800"
            >
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-slate-400">
                  Jornada
                  <input
                    type="number"
                    min={1}
                    className={input}
                    value={form.round}
                    onChange={(e) => setForm({ ...form, round: e.target.value })}
                  />
                </label>
                <label className="text-[10px] text-slate-400">
                  Data (opcional)
                  <input
                    type="date"
                    className={input}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
              </div>
              <div className="grid grid-cols-[1fr_3rem_3rem_1fr] gap-1.5 items-end">
                <label className="text-[10px] text-slate-400">
                  Casa
                  <input
                    list="league-teams"
                    className={input}
                    value={form.home}
                    onChange={(e) => setForm({ ...form, home: e.target.value })}
                  />
                </label>
                <input
                  aria-label="Golos da equipa da casa"
                  type="number"
                  min={0}
                  className={`${input} text-center`}
                  value={form.homeGoals}
                  onChange={(e) => setForm({ ...form, homeGoals: e.target.value })}
                />
                <input
                  aria-label="Golos da equipa de fora"
                  type="number"
                  min={0}
                  className={`${input} text-center`}
                  value={form.awayGoals}
                  onChange={(e) => setForm({ ...form, awayGoals: e.target.value })}
                />
                <label className="text-[10px] text-slate-400">
                  Fora
                  <input
                    list="league-teams"
                    className={input}
                    value={form.away}
                    onChange={(e) => setForm({ ...form, away: e.target.value })}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={addGame}
                className="w-full py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase"
              >
                Guardar resultado
              </button>
            </section>

            <ul aria-label="Resultados da série" className="space-y-1">
              {[...games].reverse().map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px]"
                >
                  <span className="w-12 shrink-0 text-slate-500 font-mono">
                    {g.round ? `J${g.round}` : ''} {ddmm(g.date)}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-slate-200">
                    {g.home}{' '}
                    <b className="font-mono">
                      {g.homeGoals}-{g.awayGoals}
                    </b>{' '}
                    {g.away}
                  </span>
                  {g.fromApp ? (
                    <span className="text-[10px] text-cyan-300/80 shrink-0">da app</span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Apagar ${g.home} ${g.homeGoals}-${g.awayGoals} ${g.away}`}
                      className="text-rose-300 shrink-0"
                      onClick={() => save({ ...league, games: league.games.filter((x) => x.id !== g.id) })}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {panel === 'colar' && (
          <div className="space-y-2">
            <section
              aria-label="Importar print"
              className="space-y-2 p-3 rounded-2xl bg-slate-950/60 border border-cyan-500/40"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                aria-label="Print da jornada"
                className="hidden"
                onChange={(e) => readPrint(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={reading}
                onClick={() => fileRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase disabled:opacity-50"
              >
                {reading ? 'A ler o print…' : '📷 Importar print da jornada'}
              </button>
              <p className="text-[10px] text-slate-400">
                Faça um print da jornada (site da FPF ou da associação) e escolha-o aqui. A app lê as equipas e os
                resultados; o jogo de {ourName} não é importado porque já vem da app.
              </p>
              {printGames && (
                <div className="space-y-1.5">
                  <ul aria-label="Jogos lidos do print" className="space-y-1">
                    {printGames.games.map((g) => (
                      <li
                        key={g.id}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                      >
                        <span className="text-slate-500 font-mono mr-1.5">{ddmm(g.date)}</span>
                        {g.home}{' '}
                        <b className="font-mono">
                          {g.homeGoals}-{g.awayGoals}
                        </b>{' '}
                        {g.away}
                      </li>
                    ))}
                  </ul>
                  {printGames.ours > 0 && (
                    <p className="text-[10px] text-cyan-300/80">
                      O jogo de {ourName} foi deixado de fora (já vem da app).
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintGames(null)}
                      className="py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={importPrint}
                      disabled={printGames.games.length === 0}
                      className="py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase disabled:opacity-40"
                    >
                      Importar {printGames.games.length} jogo(s)
                    </button>
                  </div>
                </div>
              )}
            </section>
            <p className="text-[11px] text-slate-300">
              <b>Do site da FPF:</b> abra a série em resultados.fpf.pt, separador <b>Jogos</b>, escolha a jornada,
              selecione tudo, copie e cole aqui (pode colar várias jornadas). A app reconhece a nossa equipa e os nomes
              dos adversários.
              <br />
              Também aceita resultados de uma mensagem ou do Excel, um jogo por linha, com a equipa da casa primeiro:
            </p>
            <pre className="text-[10px] text-slate-400 bg-slate-950 rounded-xl p-2 whitespace-pre-wrap">
              {'Jornada 3\nMação 2-2 Abrantes\n12/10 Torres Novas 0 x 4 Riachense'}
            </pre>
            <textarea
              aria-label="Resultados colados"
              rows={7}
              className={input}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Cole aqui os resultados…"
            />
            {pasted.trim() && (
              <div className="text-[11px] text-slate-300">
                {preview.games.length} jogo(s) reconhecido(s)
                {preview.skipped.length > 0 && (
                  <div className="text-amber-300">
                    Não percebi {preview.skipped.length} linha(s): {preview.skipped.slice(0, 3).join(' · ')}
                    {preview.skipped.length > 3 ? '…' : ''}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={importPasted}
              disabled={preview.games.length === 0}
              className="w-full py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase disabled:opacity-40"
            >
              Importar resultados
            </button>
          </div>
        )}

        {panel === 'equipas' && (
          <div key={league.id} className="space-y-2">
            <label className="block text-[11px] text-slate-400">
              {allPhases.length > 1 ? 'Nome da fase' : 'Nome da competição'}
              <input
                className={input}
                defaultValue={league.name || ''}
                placeholder="Ex: Distrital Sub-11 – Série B"
                onBlur={(e) => {
                  if ((league.name || '') !== e.target.value.trim()) save({ ...league, name: e.target.value.trim() });
                }}
              />
            </label>
            <label className="block text-[11px] text-slate-400">
              Nome da nossa equipa na tabela
              <input
                className={input}
                defaultValue={league.ourName || ''}
                placeholder={state.myClubName || 'A nossa equipa'}
                onBlur={(e) => {
                  if ((league.ourName || '') !== e.target.value.trim())
                    save({ ...league, ourName: e.target.value.trim() || undefined });
                }}
              />
            </label>
            {league.startDate && (
              <label className="block text-[11px] text-slate-400">
                Começa em
                <input
                  type="date"
                  aria-label="Começa em"
                  className={input}
                  defaultValue={league.startDate}
                  onBlur={(e) => {
                    const startDate = e.target.value;
                    if (!startDate || startDate === league.startDate) return;
                    const i = allPhases.findIndex((l) => l.id === league.id);
                    const prev = allPhases[i - 1];
                    const next = allPhases[i + 1];
                    if (
                      (prev && (prev.startDate || '') >= startDate) ||
                      (next?.startDate && next.startDate <= startDate)
                    ) {
                      onShowToast('A data tem de ficar entre a fase anterior e a seguinte.');
                      e.target.value = league.startDate || '';
                      return;
                    }
                    save({ ...league, startDate });
                  }}
                />
              </label>
            )}
            <label className="block text-[11px] text-slate-400">
              Equipas da série (uma por linha)
              <textarea
                aria-label="Equipas da série"
                rows={8}
                className={input}
                value={teamsText}
                onChange={(e) => setTeamsText(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const teams = teamsText
                  .split(/\r?\n/)
                  .map((t) => t.trim())
                  .filter((t, i, all) => t && all.findIndex((x) => teamKey(x) === teamKey(t)) === i);
                save({ ...league, teams });
                onShowToast(`Equipas da série guardadas (${teams.length}) ✓`);
                setPanel('tabela');
              }}
              className="w-full py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase"
            >
              Guardar equipas
            </button>
            <p className="text-[10px] text-slate-500">
              As equipas que aparecem nos resultados entram na tabela sozinhas. Os nomes comparam-se sem acentos nem
              maiúsculas (Mação = MACAO).
            </p>
            {stored && phases.length > 1 && (
              <button
                type="button"
                onClick={deletePhase}
                className="w-full py-2 rounded-xl border border-rose-500/50 text-rose-300 text-xs font-bold"
              >
                Apagar esta fase
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
