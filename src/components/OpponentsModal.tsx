import React, { useState } from 'react';
import { AppState, OpponentFile } from '../types';
import { OpponentSummary, opponentsOf, withFile } from '../lib/opponents';
import { headToHead } from '../lib/headToHead';
import { linesToList, listToLines } from '../lib/opponentReport';
import { localDateISO } from '../lib/trainingQuick';
import { uid } from '../lib/utils';

interface OpponentsModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const ddmm = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');

/** One opponent: the results against them, what the reports after the games said, and the staff's file. */
const OpponentDetail: React.FC<{
  state: AppState;
  opponent: OpponentSummary;
  onSave: (file: OpponentFile) => void;
  onBack: () => void;
}> = ({ state, opponent, onSave, onBack }) => {
  const h2h = headToHead(state.matches || [], state.roster || [], opponent.name);
  const f = opponent.file;
  const [name, setName] = useState(f?.name || opponent.name);
  const [formation, setFormation] = useState(f?.formation || '');
  const [strengths, setStrengths] = useState(listToLines(f?.strengths));
  const [weaknesses, setWeaknesses] = useState(listToLines(f?.weaknesses));
  const [notes, setNotes] = useState(f?.notes || '');
  const [strategy, setStrategy] = useState(f?.strategy || '');

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="text-xs font-bold text-ui-brand">
        ‹ Todos os adversários
      </button>
      <div>
        <h4 className="text-lg font-extrabold text-ui-text">{opponent.name}</h4>
        {opponent.next && (
          <span className="ui-badge ui-badge-brand mt-1">
            Próximo jogo: {ddmm(opponent.next.date)}
            {opponent.next.time ? ` · ${opponent.next.time}` : ''}
            {opponent.next.location === 'casa' ? ' · casa' : opponent.next.location === 'fora' ? ' · fora' : ''}
          </span>
        )}
      </div>

      <section aria-label="Resultados contra este adversário" className="ui-card p-3">
        <div className="ui-kicker mb-1">Resultados</div>
        {h2h ? (
          <>
            <p className="text-sm text-ui-text">
              {h2h.games.length} {h2h.games.length === 1 ? 'jogo' : 'jogos'} · {h2h.wins}V {h2h.draws}E {h2h.losses}D ·
              golos {h2h.goalsFor}-{h2h.goalsAgainst}
            </p>
            <ul className="mt-1 divide-y divide-ui-line">
              {h2h.games.map((g) => (
                <li key={g.id} className="flex items-center gap-2 py-1.5 text-xs">
                  <span
                    className={`ui-badge ${g.result === 'V' ? 'ui-badge-success' : g.result === 'D' ? 'ui-badge-danger' : ''}`}
                  >
                    {g.result}
                  </span>
                  <span className="font-bold text-ui-text">
                    {g.scored}-{g.conceded}
                  </span>
                  <span className="text-ui-muted">
                    {ddmm(g.date)} · {g.where}
                  </span>
                  {g.scorers.length > 0 && <span className="truncate text-ui-muted">· ⚽ {g.scorers.join(', ')}</span>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-ui-muted">Ainda não jogámos contra esta equipa.</p>
        )}
      </section>

      {h2h?.report && (
        <section aria-label="Último relatório do jogo" className="ui-card p-3 text-xs text-ui-text space-y-1">
          <div className="ui-kicker">Relatório depois do jogo de {ddmm(h2h.report.date)}</div>
          {h2h.report.system && <p>Sistema: {h2h.report.system}</p>}
          {h2h.report.dangerous.length > 0 && <p>Perigosos: {h2h.report.dangerous.join(' · ')}</p>}
          {h2h.report.weaknesses.length > 0 && <p>Pontos fracos: {h2h.report.weaknesses.join(' · ')}</p>}
          {h2h.report.nextTime && <p>Da próxima vez: {h2h.report.nextTime}</p>}
          {h2h.report.notes && <p className="text-ui-muted">{h2h.report.notes}</p>}
        </section>
      )}

      <section aria-label="Ficha do adversário" className="ui-card space-y-2 p-3">
        <div className="ui-kicker">Ficha (equipa técnica)</div>
        <label className="block text-[11px] text-ui-muted">
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="ui-input text-sm" />
        </label>
        <label className="block text-[11px] text-ui-muted">
          Formação habitual
          <input
            value={formation}
            onChange={(e) => setFormation(e.target.value)}
            maxLength={30}
            placeholder="ex.: 3-2-1"
            className="ui-input text-sm"
          />
        </label>
        <label className="block text-[11px] text-ui-muted">
          Pontos fortes (um por linha)
          <textarea
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            rows={3}
            className="ui-input text-sm"
          />
        </label>
        <label className="block text-[11px] text-ui-muted">
          Pontos fracos (um por linha)
          <textarea
            value={weaknesses}
            onChange={(e) => setWeaknesses(e.target.value)}
            rows={3}
            className="ui-input text-sm"
          />
        </label>
        <label className="block text-[11px] text-ui-muted">
          Notas
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="ui-input text-sm" />
        </label>
        <label className="block text-[11px] text-ui-muted">
          Estratégia para o próximo jogo
          <textarea
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            rows={3}
            className="ui-input text-sm"
          />
        </label>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              id: f?.id || uid(),
              name,
              formation,
              strengths: linesToList(strengths),
              weaknesses: linesToList(weaknesses),
              notes,
              strategy,
              updatedAt: Date.now()
            })
          }
          className="ui-btn ui-btn-primary w-full py-2.5 text-sm"
        >
          Guardar ficha
        </button>
        <p className="text-[11px] text-ui-muted">Só a equipa técnica vê a ficha. Fica guardada para todas as épocas.</p>
      </section>
    </div>
  );
};

/**
 * Mais → 🔭 Adversários: every opponent of the team with the results against them, the next game, the reports
 * written after each game and the staff's own file (usual system, strengths, weaknesses, notes, strategy).
 */
const OpponentsModal: React.FC<OpponentsModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const files = team?.opponentFiles || [];
  const list = opponentsOf(state.matches, state.schedule, files, localDateISO());
  const [openName, setOpenName] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const open = list.find((o) => o.name === openName) || (openName ? { ...emptySummary, name: openName } : null);
  const shown = list.filter((o) => !search.trim() || o.name.toLowerCase().includes(search.trim().toLowerCase()));

  const save = (file: OpponentFile) => {
    const next = withFile(files, file);
    onUpdateState({
      teams: (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, opponentFiles: next } : t))
    });
    setOpenName(file.name.trim());
    onShowToast(next.some((f) => f.id === file.id) ? 'Ficha guardada ✓' : 'Ficha vazia: apagada');
  };

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3">
      <div
        role="dialog"
        aria-label="Adversários"
        className="ui-card w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ui-text">🔭 Adversários</h3>
          <button type="button" onClick={onClose} aria-label="Fechar adversários" className="text-ui-muted text-lg">
            ✕
          </button>
        </div>
        {open ? (
          <OpponentDetail
            key={open.name}
            state={state}
            opponent={open}
            onSave={save}
            onBack={() => setOpenName(null)}
          />
        ) : (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Procurar adversário"
              aria-label="Procurar adversário"
              className="ui-input text-sm"
            />
            {shown.length === 0 ? (
              <p className="ui-inset p-3 text-xs text-ui-muted">
                {list.length === 0
                  ? 'Os adversários aparecem aqui com os jogos e a Agenda.'
                  : 'Nenhum adversário com esse nome.'}
              </p>
            ) : (
              <ul aria-label="Lista de adversários" className="ui-card divide-y divide-ui-line overflow-hidden">
                {shown.map((o) => (
                  <li key={o.name}>
                    <button
                      type="button"
                      onClick={() => setOpenName(o.name)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-ui-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm text-ui-text">{o.name}</b>
                        <span className="text-[11px] text-ui-muted">
                          {o.played
                            ? `${o.played} ${o.played === 1 ? 'jogo' : 'jogos'} · ${o.wins}V ${o.draws}E ${o.losses}D · ${o.goalsFor}-${o.goalsAgainst}`
                            : 'Ainda sem jogos'}
                        </span>
                      </span>
                      {o.next && <span className="ui-badge ui-badge-brand">{ddmm(o.next.date)}</span>}
                      {o.file && <span className="ui-badge">Ficha</span>}
                      <span className="text-ui-muted">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) setOpenName(newName.trim());
                setNewName('');
              }}
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={80}
                aria-label="Novo adversário"
                placeholder="Outro adversário (para observar antes do jogo)"
                className="ui-input min-w-0 flex-1 text-xs"
              />
              <button type="submit" className="ui-btn ui-btn-secondary px-3 text-xs">
                Abrir ficha
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const emptySummary: OpponentSummary = {
  name: '',
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0
};

export default OpponentsModal;
