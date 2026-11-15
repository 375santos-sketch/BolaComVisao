import React, { useState } from 'react';
import { AppState, VjSession, VjStatus } from '../../types';
import { Sheet } from '../ui/Sheet';
import { COMPETENCIES, competencyLabel } from '../../lib/competencies';
import {
  VJ_STATUS,
  cleanSession,
  duplicateSession,
  filterSessions,
  newSession,
  sessionsOf,
  teamActions,
  withSession,
  withoutSession
} from '../../lib/vjLibrary';
import { youtubeIdOf } from '../../lib/gameVideo';
import { isReadOnlyRole } from '../../lib/orgPermissions';
import { uid } from '../../lib/utils';

type Tab = 'equipa' | 'clube' | 'plataforma';

/**
 * 🎬 Visão de Jogo — Biblioteca (VJ1): the team's sessions with their state, filters and favourites; create, edit,
 * publish, archive and duplicate. The club library and the platform library come in the next parts.
 */
const VisaoDeJogoModal: React.FC<{
  state: AppState;
  onUpdateState: (u: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const sessions = sessionsOf(team);
  const readOnly = isReadOnlyRole(state.currentUser) || !team;
  const [tab, setTab] = useState<Tab>('equipa');
  const [competency, setCompetency] = useState('');
  const [status, setStatus] = useState<VjStatus | 'ativas'>('ativas');
  const [favorites, setFavorites] = useState(false);
  const [editing, setEditing] = useState<VjSession | null>(null);
  const now = () => new Date().toISOString();

  const saveAll = (next: VjSession[], msg?: string) => {
    if (!team) return;
    onUpdateState({ teams: (state.teams || []).map((t) => (t.id === team.id ? { ...t, vjSessions: next } : t)) });
    if (msg) onShowToast(msg);
  };
  const save = (s: VjSession, msg?: string) => saveAll(withSession(sessions, cleanSession(s, now())), msg);

  if (editing) {
    return (
      <SessionEditor
        session={editing}
        readOnly={readOnly}
        onBack={() => setEditing(null)}
        onSave={(s, msg) => {
          save(s, msg);
          setEditing(null);
        }}
        onDuplicate={(s) => {
          const copy = duplicateSession(s, uid(), now());
          save(copy, 'Cópia criada: pode adaptá-la ✓');
          setEditing(copy);
        }}
        onDelete={(s) => {
          if (!window.confirm(`Apagar a sessão «${s.title}»?`)) return;
          saveAll(withoutSession(sessions, s.id), 'Sessão apagada');
          setEditing(null);
        }}
      />
    );
  }

  const shown = filterSessions(sessions, { competency: competency || undefined, status, favorites });
  const used = [...new Set(sessions.flatMap((s) => s.competencies))];

  return (
    <Sheet title="Visão de Jogo" onClose={onClose} size="lg">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Biblioteca">
          {(
            [
              ['equipa', 'Da equipa'],
              ['clube', 'Do clube'],
              ['plataforma', 'BolaComVisão']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-full border px-3 py-1 text-xs ${
                tab === key ? 'border-ui-brand bg-ui-brand/10 text-ui-text' : 'border-ui-line text-ui-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab !== 'equipa' ? (
          <p className="ui-card p-4 text-xs text-ui-muted">
            {tab === 'clube'
              ? 'A biblioteca do clube (propor, rever e aprovar sessões para todas as equipas) chega na próxima parte da Visão de Jogo.'
              : 'A biblioteca BolaComVisão (sessões preparadas pela plataforma) ainda está vazia.'}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <select
                aria-label="Competência"
                value={competency}
                onChange={(e) => setCompetency(e.target.value)}
                className="ui-input w-auto text-xs"
              >
                <option value="">Competência</option>
                {used.map((c) => (
                  <option key={c} value={c}>
                    {competencyLabel(c)}
                  </option>
                ))}
              </select>
              <select
                aria-label="Estado"
                value={status}
                onChange={(e) => setStatus(e.target.value as VjStatus | 'ativas')}
                className="ui-input w-auto text-xs"
              >
                <option value="ativas">Ativas</option>
                <option value="rascunho">Rascunhos</option>
                <option value="publicado">Publicadas</option>
                <option value="arquivado">Arquivadas</option>
              </select>
              <button
                type="button"
                aria-pressed={favorites}
                onClick={() => setFavorites(!favorites)}
                className={`rounded-ui border px-2 text-xs ${favorites ? 'border-ui-brand text-ui-text' : 'border-ui-line text-ui-muted'}`}
              >
                ⭐ Favoritas
              </button>
            </div>

            {shown.length === 0 && (
              <p className="text-xs text-ui-muted">
                {sessions.length === 0
                  ? 'Ainda sem sessões. Uma sessão junta vídeos (e, em breve, pausas com perguntas) para ver e discutir com a equipa.'
                  : 'Nenhuma sessão com estes filtros.'}
              </p>
            )}
            <ul className="space-y-2" aria-label="Sessões">
              {shown.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className="ui-card w-full p-3 text-left"
                    aria-label={`Abrir a sessão ${s.title}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <b className="block text-sm text-ui-text">
                          {s.favorite ? '⭐ ' : ''}
                          {s.title}
                        </b>
                        <span className="text-[11px] text-ui-muted">
                          {s.items.length} {s.items.length === 1 ? 'vídeo' : 'vídeos'}
                          {team?.category ? ` · ${team.category}` : ''}
                          {s.authorName ? ` · ${s.authorName}` : ''}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {s.competencies.map((c) => (
                            <span key={c} className="rounded-full bg-ui-brand/10 px-2 py-0.5 text-[10px] text-ui-brand">
                              {competencyLabel(c)}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${VJ_STATUS[s.status].cls}`}
                      >
                        {VJ_STATUS[s.status].label}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!readOnly && (
              <button
                type="button"
                onClick={() =>
                  setEditing(newSession({ id: uid(), title: '', authorName: state.currentUser?.name, now: now() }))
                }
                className="ui-btn ui-btn-primary w-full text-sm"
              >
                + Nova sessão
              </button>
            )}
            <p className="text-[11px] text-ui-muted">
              🔒 Só vídeos sem crianças identificáveis (por exemplo, jogos profissionais). Os vídeos do clube com
              atletas chegam mais tarde, com autorização dos encarregados.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
};

const SessionEditor: React.FC<{
  session: VjSession;
  readOnly: boolean;
  onBack: () => void;
  onSave: (s: VjSession, msg: string) => void;
  onDuplicate: (s: VjSession) => void;
  onDelete: (s: VjSession) => void;
}> = ({ session, readOnly, onBack, onSave, onDuplicate, onDelete }) => {
  const [draft, setDraft] = useState<VjSession>(session);
  const [link, setLink] = useState('');
  const [label, setLabel] = useState('');
  const [linkError, setLinkError] = useState('');
  const isNew = !session.title;
  const set = (patch: Partial<VjSession>) => setDraft({ ...draft, ...patch });
  const available = COMPETENCIES.filter((c) => !draft.competencies.includes(c.id));

  return (
    <Sheet title={isNew ? 'Nova sessão' : 'Editar sessão'} onClose={onBack} size="lg">
      <div className="space-y-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${VJ_STATUS[draft.status].cls}`}>
          {VJ_STATUS[draft.status].label}
        </span>
        <label className="block text-xs text-ui-muted">
          Título
          <input
            value={draft.title}
            readOnly={readOnly}
            onChange={(e) => set({ title: e.target.value })}
            maxLength={120}
            placeholder="Ex.: Onde receber? (receção orientada)"
            className="ui-input mt-1 w-full text-sm"
          />
        </label>
        <label className="block text-xs text-ui-muted">
          Objetivo
          <input
            value={draft.objective || ''}
            readOnly={readOnly}
            onChange={(e) => set({ objective: e.target.value })}
            maxLength={300}
            placeholder="Ex.: Perceber onde receber para virar para a frente"
            className="ui-input mt-1 w-full text-sm"
          />
        </label>
        <div className="space-y-1">
          <span className="text-xs text-ui-muted">Competências</span>
          <div className="flex flex-wrap gap-1">
            {draft.competencies.map((c) => (
              <button
                key={c}
                type="button"
                disabled={readOnly}
                onClick={() => set({ competencies: draft.competencies.filter((x) => x !== c) })}
                aria-label={`Tirar ${competencyLabel(c)}`}
                className="rounded-full bg-ui-brand/10 px-2 py-0.5 text-[11px] text-ui-brand"
              >
                {competencyLabel(c)} {readOnly ? '' : '✕'}
              </button>
            ))}
            {!readOnly && (
              <select
                aria-label="Juntar competência"
                value=""
                onChange={(e) => e.target.value && set({ competencies: [...draft.competencies, e.target.value] })}
                className="ui-input w-auto py-0.5 text-[11px]"
              >
                <option value="">+ Competência</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-ui-muted">Vídeos</span>
          {draft.items.length === 0 && <p className="text-[11px] text-ui-muted">Ainda sem vídeos.</p>}
          {draft.items.map((it, i) => (
            <div key={it.id} className="flex items-center justify-between gap-2 rounded-ui border border-ui-line p-2">
              <span className="min-w-0 text-xs">
                <b className="text-ui-text">▶ Vídeo {i + 1}</b>
                <span className="block truncate text-[11px] text-ui-muted">
                  youtube.com/watch?v={it.youtubeId}
                  {it.label ? ` · ${it.label}` : ''}
                </span>
              </span>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Tirar o vídeo ${i + 1}`}
                  onClick={() => set({ items: draft.items.filter((x) => x.id !== it.id) })}
                  className="px-1 text-xs text-ui-muted hover:text-ui-danger"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <div className="space-y-1.5 rounded-ui border border-dashed border-ui-line p-2">
              <input
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setLinkError('');
                }}
                aria-label="Link do vídeo do YouTube"
                placeholder="Link do YouTube (ex.: https://youtu.be/…)"
                className="ui-input w-full text-xs"
              />
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                aria-label="O que é o vídeo"
                placeholder="O que é (ex.: jogo profissional)"
                className="ui-input w-full text-xs"
              />
              {linkError && <p className="text-[11px] text-ui-danger">{linkError}</p>}
              <button
                type="button"
                onClick={() => {
                  const id = youtubeIdOf(link);
                  if (!id) return setLinkError('Este link não é de um vídeo do YouTube.');
                  set({
                    items: [
                      ...draft.items,
                      { id: uid(), kind: 'video', youtubeId: id, ...(label.trim() ? { label: label.trim() } : {}) }
                    ]
                  });
                  setLink('');
                  setLabel('');
                }}
                className="ui-btn ui-btn-soft w-full text-xs"
              >
                + Vídeo
              </button>
              <p className="text-[10px] text-ui-muted">
                As pausas com perguntas em cada vídeo chegam na próxima parte da Visão de Jogo.
              </p>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSave(draft, 'Sessão guardada ✓')}
              className="ui-btn ui-btn-soft text-xs"
            >
              Guardar
            </button>
            {teamActions(draft.status).map((a) => (
              <button
                key={a.to}
                type="button"
                onClick={() => onSave({ ...draft, status: a.to }, `${VJ_STATUS[a.to].label} ✓`)}
                className={`ui-btn text-xs ${a.to === 'publicado' ? 'ui-btn-primary' : 'ui-btn-soft'}`}
              >
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                onSave({ ...draft, favorite: !draft.favorite }, draft.favorite ? 'Tirada das favoritas' : 'Favorita ⭐')
              }
              className="ui-btn ui-btn-soft text-xs"
            >
              {draft.favorite ? '☆ Tirar das favoritas' : '⭐ Favorita'}
            </button>
            {!isNew && (
              <button type="button" onClick={() => onDuplicate(draft)} className="ui-btn ui-btn-soft text-xs">
                Duplicar e adaptar
              </button>
            )}
            {!isNew && (
              <button
                type="button"
                onClick={() => onDelete(draft)}
                className="ui-btn ui-btn-soft col-span-2 text-xs text-ui-danger"
              >
                Apagar a sessão
              </button>
            )}
          </div>
        )}
        <button type="button" onClick={onBack} className="ui-btn ui-btn-soft w-full text-xs">
          ← Biblioteca
        </button>
      </div>
    </Sheet>
  );
};

export default VisaoDeJogoModal;
