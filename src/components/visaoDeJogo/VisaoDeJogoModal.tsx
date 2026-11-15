import React, { useEffect, useRef, useState } from 'react';
import { AppState, VjSession, VjStatus } from '../../types';
import { Sheet } from '../ui/Sheet';
import { COMPETENCIES, competencyLabel } from '../../lib/competencies';
import {
  VJ_STATUS,
  ClubLibraryViewer,
  canEditClubSession,
  canSeeClubSession,
  clubActions,
  clubSessionForTeam,
  clubSessionsOf,
  newClubSession,
  platformActions,
  teamCopyOf,
  withClubStatus,
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
import { canPublishClubLibrary, isReadOnlyRole } from '../../lib/orgPermissions';
import { isAppAdmin } from '../../services/cloudAuthService';
import { cachedPlatformSessions, loadPlatformSessions, savePlatformSession } from '../../services/platformLibrary';
import { uid } from '../../lib/utils';
import { PauseEditor } from './PauseEditor';
import { ConductSession } from './ConductSession';
import { pauseCount, withRun } from '../../lib/vjPauses';

type Tab = 'equipa' | 'clube' | 'plataforma';
type Action = { to: VjStatus; label: string };

/**
 * 🎬 Visão de Jogo — Biblioteca: the team's sessions (VJ1) and the club library (VJ3: a coach proposes, who publishes
 * approves for every team of the club). The platform library comes later.
 */
const VisaoDeJogoModal: React.FC<{
  state: AppState;
  onUpdateState: (u: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const sessions = sessionsOf(team);
  const club = clubSessionsOf(state);
  const user = state.currentUser;
  const readOnly = isReadOnlyRole(user) || !team;
  const viewer: ClubLibraryViewer = { uid: user?.id, publishes: canPublishClubLibrary(user) && !isReadOnlyRole(user) };
  const [tab, setTab] = useState<Tab>('equipa');
  const [competency, setCompetency] = useState('');
  const [status, setStatus] = useState<VjStatus | 'ativas'>('ativas');
  const [favorites, setFavorites] = useState(false);
  const [editing, setEditing] = useState<{ session: VjSession; scope: Tab } | null>(null);
  const [conducting, setConducting] = useState<{ session: VjSession; scope: Tab } | null>(null);
  // VJ4: the BolaComVisão library, read when its tab opens (the last copy read stays on the device for offline)
  const admin = isAppAdmin(user);
  const [platform, setPlatform] = useState<VjSession[]>(() => cachedPlatformSessions());
  const [platformNote, setPlatformNote] = useState('');
  const platformLoaded = useRef(false);
  useEffect(() => {
    if (tab !== 'plataforma' || platformLoaded.current) return;
    platformLoaded.current = true;
    let gone = false;
    loadPlatformSessions(admin).then(
      (list) => {
        if (gone) return;
        setPlatform(list);
        setPlatformNote('');
      },
      () => {
        if (gone) return;
        platformLoaded.current = false;
        setPlatformNote('Sem ligação: mostra a última cópia guardada neste aparelho.');
      }
    );
    return () => {
      gone = true;
    };
  }, [tab, admin]);
  const now = () => new Date().toISOString();

  const saveAll = (next: VjSession[], msg?: string) => {
    if (!team) return;
    onUpdateState({ teams: (state.teams || []).map((t) => (t.id === team.id ? { ...t, vjSessions: next } : t)) });
    if (msg) onShowToast(msg);
  };
  const save = (s: VjSession, msg?: string) => saveAll(withSession(sessions, cleanSession(s, now())), msg);
  const savePlatform = (s: VjSession, msg: string) => {
    const clean = cleanSession(s, now());
    savePlatformSession(clean).then(
      () => {
        setPlatform((list) => withSession(list, clean));
        onShowToast(msg);
      },
      () => onShowToast('Não foi possível guardar na biblioteca BolaComVisão (sem ligação?).')
    );
  };
  const saveClub = (s: VjSession, msg?: string) => {
    onUpdateState({ clubVjSessions: withSession(club, cleanSession(s, now())) });
    if (msg) onShowToast(msg);
  };
  /** «Usar na minha equipa»: the team's copy (made once). */
  const copyToTeam = (s: VjSession) => {
    if (!team || teamCopyOf(sessions, s.id)) return;
    save(clubSessionForTeam(s, uid(), now()), `«${s.title}» já está na biblioteca da equipa ✓`);
  };

  if (conducting) {
    const { session, scope } = conducting;
    const fromClub = scope !== 'equipa';
    return (
      <ConductSession
        session={session}
        onFinish={
          readOnly
            ? undefined
            : (run) => {
                if (!fromClub) return save(withRun(session, run), 'Respostas do grupo guardadas ✓');
                // A club session is the same for every team: the group's answers stay in the team's copy
                const copy = teamCopyOf(sessions, session.id) || clubSessionForTeam(session, uid(), now());
                save(withRun(copy, run), 'Respostas do grupo guardadas na sessão da equipa ✓');
              }
        }
        onClose={() => setConducting(null)}
      />
    );
  }

  if (editing && editing.scope === 'plataforma') {
    const s = editing.session;
    return (
      <SessionEditor
        session={s}
        readOnly={!admin}
        actions={(d) => (admin ? platformActions(d.status) : [])}
        onBack={() => setEditing(null)}
        onSave={(next, msg) => {
          savePlatform(next, msg);
          setEditing(null);
        }}
      />
    );
  }

  if (editing && editing.scope === 'clube') {
    const s = editing.session;
    const isNew = !club.some((x) => x.id === s.id);
    const canEdit = !isReadOnlyRole(user) && (isNew || canEditClubSession(s, viewer));
    return (
      <SessionEditor
        session={s}
        readOnly={!canEdit}
        actions={(d) => (canEdit ? clubActions(d, viewer) : [])}
        onAction={(d, to) => withClubStatus(d, to, user?.name)}
        onBack={() => setEditing(null)}
        onSave={(next, msg) => {
          saveClub(next, msg);
          setEditing(null);
        }}
        onDelete={
          viewer.publishes && !isNew
            ? (d) => {
                if (!window.confirm(`Apagar a sessão «${d.title}» da biblioteca do clube?`)) return;
                onUpdateState({ clubVjSessions: withoutSession(club, d.id) });
                onShowToast('Sessão apagada');
                setEditing(null);
              }
            : undefined
        }
      />
    );
  }

  if (editing) {
    return (
      <SessionEditor
        session={editing.session}
        readOnly={readOnly}
        actions={(d) => teamActions(d.status)}
        favorite
        onBack={() => setEditing(null)}
        onSave={(s, msg) => {
          save(s, msg);
          setEditing(null);
        }}
        onDuplicate={(s) => {
          const copy = duplicateSession(s, uid(), now());
          save(copy, 'Cópia criada: pode adaptá-la ✓');
          setEditing({ session: copy, scope: 'equipa' });
        }}
        onDelete={(s) => {
          if (!window.confirm(`Apagar a sessão «${s.title}»?`)) return;
          saveAll(withoutSession(sessions, s.id), 'Sessão apagada');
          setEditing(null);
        }}
      />
    );
  }

  const isClub = tab === 'clube';
  const isPlatform = tab === 'plataforma';
  const shared = isClub || isPlatform;
  const pool = isPlatform
    ? platform.filter((s) => admin || s.status === 'publicado')
    : isClub
      ? club.filter((s) => canSeeClubSession(s, viewer))
      : sessions;
  const shown = filterSessions(pool, { competency: competency || undefined, status, favorites: !shared && favorites });
  const used = [...new Set(pool.flatMap((s) => s.competencies))];
  const toReview = viewer.publishes ? club.filter((s) => s.status === 'revisao').length : 0;
  const switchTab = (next: Tab) => {
    setTab(next);
    setCompetency('');
    setStatus(next === 'clube' && toReview > 0 ? 'revisao' : 'ativas');
  };

  return (
    <Sheet title="Visão de Jogo" onClose={onClose} size="lg">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Biblioteca">
          {(
            [
              ['equipa', 'Da equipa'],
              ['clube', toReview > 0 ? `Do clube · ${toReview} por rever` : 'Do clube'],
              ['plataforma', 'BolaComVisão']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => switchTab(key)}
              className={`rounded-full border px-3 py-1 text-xs ${
                tab === key ? 'border-ui-brand bg-ui-brand/10 text-ui-text' : 'border-ui-line text-ui-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {
          <>
            {isPlatform && (
              <p className="text-[11px] text-ui-muted">
                {admin
                  ? 'Administrador: as sessões que publicar aqui ficam disponíveis para todos os clubes.'
                  : 'Sessões preparadas pela BolaComVisão para todos os clubes. Use-as no treino ou copie-as para a sua equipa.'}
                {platformNote ? ` ${platformNote}` : ''}
              </p>
            )}
            {isClub && (
              <p className="text-[11px] text-ui-muted">
                {viewer.publishes
                  ? 'Revê as propostas dos treinadores e publica para todas as equipas do clube.'
                  : 'Sessões aprovadas para todas as equipas do clube. Pode propor uma sessão: um coordenador autorizado revê e publica.'}
              </p>
            )}
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
                {isClub && <option value="revisao">Em revisão</option>}
                <option value="publicado">Publicadas</option>
                {(isPlatform ? admin : !isClub || viewer.publishes) && <option value="arquivado">Arquivadas</option>}
              </select>
              {!shared && (
                <button
                  type="button"
                  aria-pressed={favorites}
                  onClick={() => setFavorites(!favorites)}
                  className={`rounded-ui border px-2 text-xs ${favorites ? 'border-ui-brand text-ui-text' : 'border-ui-line text-ui-muted'}`}
                >
                  ⭐ Favoritas
                </button>
              )}
            </div>

            {shown.length === 0 && (
              <p className="text-xs text-ui-muted">
                {pool.length > 0
                  ? 'Nenhuma sessão com estes filtros.'
                  : isPlatform
                    ? 'A biblioteca BolaComVisão ainda está vazia.'
                    : isClub
                      ? 'A biblioteca do clube ainda está vazia.'
                      : 'Ainda sem sessões. Uma sessão junta vídeos com pausas e perguntas para ver e discutir com a equipa.'}
              </p>
            )}
            <ul className="space-y-2" aria-label="Sessões">
              {shown.map((s) => (
                <li key={s.id}>
                  <SessionCard
                    session={s}
                    detail={shared ? undefined : team?.category}
                    onOpen={() => setEditing({ session: s, scope: tab })}
                  />
                  {s.status === 'publicado' && s.items.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setConducting({ session: s, scope: tab })}
                        className="ui-btn ui-btn-primary flex-1 text-xs"
                        aria-label={`Conduzir no treino: ${s.title}`}
                      >
                        ▶ Conduzir no treino
                      </button>
                      {shared &&
                        !readOnly &&
                        (teamCopyOf(sessions, s.id) ? (
                          <span className="ui-btn ui-btn-soft flex-1 text-xs text-ui-success">✓ Na minha equipa</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => copyToTeam(s)}
                            className="ui-btn ui-btn-soft flex-1 text-xs"
                            aria-label={`Usar na minha equipa: ${s.title}`}
                          >
                            Usar na minha equipa
                          </button>
                        ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {isPlatform
              ? admin && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        session: newSession({ id: uid(), title: '', authorName: 'BolaComVisão', now: now() }),
                        scope: 'plataforma'
                      })
                    }
                    className="ui-btn ui-btn-primary w-full text-sm"
                  >
                    + Nova sessão BolaComVisão
                  </button>
                )
              : isClub
                ? !isReadOnlyRole(user) && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          session: newClubSession({
                            id: uid(),
                            authorUid: user?.id,
                            authorName: user?.name,
                            now: now()
                          }),
                          scope: 'clube'
                        })
                      }
                      className="ui-btn ui-btn-primary w-full text-sm"
                    >
                      {viewer.publishes ? '+ Nova sessão do clube' : '+ Propor sessão ao clube'}
                    </button>
                  )
                : !readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          session: newSession({ id: uid(), title: '', authorName: user?.name, now: now() }),
                          scope: 'equipa'
                        })
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
        }
      </div>
    </Sheet>
  );
};

const SessionCard: React.FC<{ session: VjSession; detail?: string; onOpen: () => void }> = ({
  session: s,
  detail,
  onOpen
}) => (
  <button
    type="button"
    onClick={onOpen}
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
          {s.items.length} {s.items.length === 1 ? 'vídeo' : 'vídeos'} · {pauseCount(s)}{' '}
          {pauseCount(s) === 1 ? 'pergunta' : 'perguntas'}
          {detail ? ` · ${detail}` : ''}
          {s.authorName ? ` · ${s.authorName}` : ''}
          {s.status === 'publicado' && s.approvedBy ? ` · aprovada por ${s.approvedBy}` : ''}
        </span>
        <span className="mt-1 flex flex-wrap gap-1">
          {s.competencies.map((c) => (
            <span key={c} className="rounded-full bg-ui-brand/10 px-2 py-0.5 text-[10px] text-ui-brand">
              {competencyLabel(c)}
            </span>
          ))}
        </span>
      </span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${VJ_STATUS[s.status].cls}`}>
        {VJ_STATUS[s.status].label}
      </span>
    </span>
  </button>
);

const SessionEditor: React.FC<{
  session: VjSession;
  readOnly: boolean;
  /** What can be done with the session in its state (publish, send for review…). */
  actions: (s: VjSession) => Action[];
  /** The session in its new state (default: only the state changes). */
  onAction?: (s: VjSession, to: VjStatus) => VjSession;
  favorite?: boolean;
  onBack: () => void;
  onSave: (s: VjSession, msg: string) => void;
  onDuplicate?: (s: VjSession) => void;
  onDelete?: (s: VjSession) => void;
}> = ({ session, readOnly, actions, onAction, favorite, onBack, onSave, onDuplicate, onDelete }) => {
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
            <div key={it.id} className="space-y-1.5 rounded-ui border border-ui-line p-2">
              <div className="flex items-center justify-between gap-2">
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
              <PauseEditor
                item={it}
                index={i}
                readOnly={readOnly}
                onChange={(pauses) => set({ items: draft.items.map((x) => (x.id === it.id ? { ...x, pauses } : x)) })}
              />
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
            {actions(draft).map((a) => (
              <button
                key={a.to}
                type="button"
                onClick={() =>
                  onSave(onAction ? onAction(draft, a.to) : { ...draft, status: a.to }, `${VJ_STATUS[a.to].label} ✓`)
                }
                className={`ui-btn text-xs ${a.to === 'publicado' ? 'ui-btn-primary' : 'ui-btn-soft'}`}
              >
                {a.label}
              </button>
            ))}
            {favorite && (
              <button
                type="button"
                onClick={() =>
                  onSave(
                    { ...draft, favorite: !draft.favorite },
                    draft.favorite ? 'Tirada das favoritas' : 'Favorita ⭐'
                  )
                }
                className="ui-btn ui-btn-soft text-xs"
              >
                {draft.favorite ? '☆ Tirar das favoritas' : '⭐ Favorita'}
              </button>
            )}
            {!isNew && onDuplicate && (
              <button type="button" onClick={() => onDuplicate(draft)} className="ui-btn ui-btn-soft text-xs">
                Duplicar e adaptar
              </button>
            )}
            {!isNew && onDelete && (
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
