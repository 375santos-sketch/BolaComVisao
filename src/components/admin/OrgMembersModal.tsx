/**
 * F1.6 — Membros do clube: the members of the organization in use, by status, and managing one person (role up to
 * the manager's own, teams, suspend, take access away, reactivate) with its history (the organization's audit).
 * Only the owner and the admins of the organization manage; the rules enforce the same.
 */
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Sheet } from '../ui/Sheet';
import {
  ALL_TEAMS,
  OrgAuditEntry,
  OrgMember,
  OrgRole,
  ORG_ROLES,
  canManageMembers,
  roleRank
} from '../../lib/organizations';
import {
  getMember,
  getOrganization,
  listMembers,
  setMemberStatus,
  updateMemberAccess
} from '../../services/organizations';

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Dono',
  admin: 'Administrador',
  diretor: 'Diretor',
  coordenador: 'Coordenador',
  treinador: 'Treinador',
  adjunto: 'Adjunto',
  staff: 'Staff'
};
const STATUS_TABS = [
  { id: 'active', label: 'Ativos' },
  { id: 'suspended', label: 'Suspensos' },
  { id: 'revoked', label: 'Sem acesso' }
] as const;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
const dayPT = (ms: number) => new Date(ms).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });

interface TeamOption {
  id: string;
  label: string;
}

/** One line of history in plain words. */
function historyLine(e: OrgAuditEntry, names: Record<string, string>): string {
  const who = names[e.actorUid] || 'Alguém';
  const d = e.details || {};
  const role = (r: unknown) => ROLE_LABELS[r as OrgRole] || String(r ?? '');
  switch (e.action) {
    case 'member.added':
      return d.via === 'migracao-m2'
        ? `Passou a membro na migração (${role(d.role)})`
        : `${who} acrescentou (${role(d.role)})`;
    case 'member.role':
      return `${who} mudou o papel de ${role(d.from)} para ${role(d.to)}`;
    case 'member.teams':
      return `${who} mudou as equipas`;
    case 'member.status':
      return `${who}: ${d.to === 'revoked' ? 'retirou o acesso' : d.to === 'suspended' ? 'suspendeu' : 'reativou'}`;
    default:
      return `${who}: ${e.action}`;
  }
}

const ManageMember: React.FC<{
  orgId: string;
  me: OrgMember;
  member: OrgMember;
  teams: TeamOption[];
  history: OrgAuditEntry[];
  names: Record<string, string>;
  onDone: (updated: OrgMember, message: string) => void;
  onClose: () => void;
}> = ({ orgId, me, member, teams, history, names, onDone, onClose }) => {
  const [role, setRole] = useState<OrgRole>(member.role);
  const [teamIds, setTeamIds] = useState<string[]>(member.teamIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const roles = ORG_ROLES.filter((r) => r !== 'owner' && roleRank(r) <= roleRank(me.role));
  const all = teamIds.includes(ALL_TEAMS);
  const toggleTeam = (id: string) =>
    setTeamIds((prev) => {
      if (id === ALL_TEAMS) return prev.includes(ALL_TEAMS) ? [] : [ALL_TEAMS];
      const rest = prev.filter((t) => t !== ALL_TEAMS);
      return rest.includes(id) ? rest.filter((t) => t !== id) : [...rest, id];
    });

  const act = async (work: () => Promise<OrgMember>, message: string) => {
    setBusy(true);
    setError('');
    try {
      onDone(await work(), message);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setError(
        code === 'permission-denied' ? 'Sem permissão para esta alteração.' : (err as Error)?.message || String(err)
      );
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    if (teamIds.length === 0) return setError('Escolha pelo menos uma equipa.');
    const change = {
      ...(role !== member.role ? { role } : {}),
      ...(teamIds.slice().sort().join(',') !== member.teamIds.slice().sort().join(',') ? { teamIds } : {})
    };
    if (!change.role && !change.teamIds) return onClose();
    act(() => updateMemberAccess(orgId, member, change, me.uid, Date.now()), 'Acesso guardado ✓');
  };

  return (
    <Sheet
      title="Gerir acesso"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ui-btn ui-btn-secondary flex-1 px-4 py-2.5" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="ui-btn ui-btn-primary flex-1 px-4 py-2.5" disabled={busy} onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ui-surface-2 text-ui-caption font-extrabold text-ui-brand">
            {initials(member.displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-ui-lead font-extrabold text-ui-text">{member.displayName || member.email}</p>
            <p className="truncate text-ui-caption text-ui-muted">
              {member.email} · membro desde {new Date(member.addedAt).toLocaleDateString('pt-PT')}
            </p>
          </div>
        </div>
        <label className="block text-ui-caption font-extrabold uppercase tracking-[0.08em] text-ui-muted">
          Papel
          <select
            className="ui-input mt-1 w-full normal-case tracking-normal"
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-ui-caption text-ui-muted">Só pode dar papéis até ao seu ({ROLE_LABELS[me.role]}).</p>
        <fieldset className="space-y-1">
          <legend className="text-ui-caption font-extrabold uppercase tracking-[0.08em] text-ui-muted">Equipas</legend>
          <div className="ui-card px-3 py-1.5">
            {[{ id: ALL_TEAMS, label: 'Todas as equipas' }, ...teams].map((t) => (
              <label key={t.id} className="flex items-center gap-2 py-1.5 text-ui-body text-ui-text">
                <input
                  type="checkbox"
                  checked={t.id === ALL_TEAMS ? all : !all && teamIds.includes(t.id)}
                  disabled={t.id !== ALL_TEAMS && all}
                  onChange={() => toggleTeam(t.id)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <section aria-label="Histórico">
          <h3 className="text-ui-caption font-extrabold uppercase tracking-[0.08em] text-ui-muted">Histórico</h3>
          {history.length === 0 ? (
            <p className="py-1.5 text-ui-caption text-ui-muted">Sem registos.</p>
          ) : (
            history.map((e, i) => (
              <p key={i} className="border-b border-dashed border-ui-line py-1.5 text-ui-caption text-ui-muted">
                <strong className="text-ui-text">{dayPT(e.at)}</strong> · {historyLine(e, names)}
              </p>
            ))
          )}
        </section>
        {member.status === 'active' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="ui-btn ui-btn-secondary px-3 py-2.5"
              disabled={busy}
              onClick={() => act(() => setMemberStatus(orgId, member, 'suspended', me.uid, Date.now()), 'Suspenso')}
            >
              Suspender
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-danger px-3 py-2.5"
              disabled={busy}
              onClick={() =>
                act(() => setMemberStatus(orgId, member, 'revoked', me.uid, Date.now()), 'Acesso retirado')
              }
            >
              Retirar acesso
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ui-btn ui-btn-secondary w-full px-3 py-2.5"
            disabled={busy}
            onClick={() =>
              act(() => setMemberStatus(orgId, member, 'active', me.uid, Date.now()), 'Acesso reativado ✓')
            }
          >
            Reativar acesso
          </button>
        )}
        <p className="rounded-ui border border-ui-warning/40 bg-ui-warning-soft p-2.5 text-ui-caption text-ui-text">
          «Retirar acesso» corta a entrada <strong>no momento</strong>. Os dados do clube ficam no clube; o registo fica
          no histórico.
        </p>
        {error && (
          <p role="alert" className="text-ui-caption font-bold text-ui-danger">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
};

const OrgMembersModal: React.FC<{
  orgId: string;
  myUid: string;
  orgName: string;
  teams: TeamOption[];
  onShowToast: (message: string) => void;
  onClose: () => void;
}> = ({ orgId, myUid, orgName, teams, onShowToast, onClose }) => {
  const [me, setMe] = useState<OrgMember | null>(null);
  const [members, setMembers] = useState<OrgMember[] | null>(null);
  const [audit, setAudit] = useState<OrgAuditEntry[]>([]);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]['id']>('active');
  const [managing, setManaging] = useState<OrgMember | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState(orgName);

  const readAudit = async () => {
    const snap = await getDocs(collection(db, 'organizations', orgId, 'audit'));
    setAudit(snap.docs.map((d) => d.data() as OrgAuditEntry).sort((a, b) => b.at - a.at));
  };
  useEffect(() => {
    (async () => {
      try {
        const mine = await getMember(orgId, myUid);
        setMe(mine);
        const org = await getOrganization(orgId).catch(() => null);
        if (org?.name) setName(org.name);
        setMembers(await listMembers(orgId));
        if (mine && canManageMembers(mine.role)) {
          const snap = await getDocs(collection(db, 'organizations', orgId, 'audit'));
          setAudit(snap.docs.map((d) => d.data() as OrgAuditEntry).sort((a, b) => b.at - a.at));
        }
      } catch (err) {
        setError((err as Error)?.message || String(err));
      }
    })();
  }, [orgId, myUid]);

  const names = Object.fromEntries((members || []).map((m) => [m.uid, m.displayName]));
  const teamLabel = (id: string) =>
    id === ALL_TEAMS ? 'Todas as equipas' : teams.find((t) => t.id === id)?.label || id;
  const manager = me && canManageMembers(me.role) && me.status === 'active';
  const shown = (members || []).filter((m) => m.status === tab);
  const canManage = (m: OrgMember) =>
    manager && m.uid !== myUid && m.role !== 'owner' && roleRank(m.role) <= roleRank(me!.role);

  return (
    <>
      <Sheet title="Membros do clube" onClose={onClose} size="md">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="club-crest" aria-hidden>
              {initials(name)}
            </span>
            <div>
              <p className="text-ui-lead font-extrabold text-ui-text">{name}</p>
              {me && (
                <p className="text-ui-caption text-ui-muted">
                  Tu: <strong className="text-ui-text">{ROLE_LABELS[me.role]}</strong>
                </p>
              )}
            </div>
          </div>
          {error && (
            <p role="alert" className="text-ui-caption font-bold text-ui-danger">
              Não foi possível ler os membros: {error}
            </p>
          )}
          <div role="group" aria-label="Estado" className="ui-inset flex gap-1 p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-ui-sm px-2 py-2 text-ui-caption font-bold ${tab === t.id ? 'bg-ui-surface-3 text-ui-text' : 'text-ui-muted'}`}
              >
                {t.label} · {(members || []).filter((m) => m.status === t.id).length}
              </button>
            ))}
          </div>
          {!members ? (
            <p role="status" className="text-ui-caption text-ui-muted">
              A ler os membros…
            </p>
          ) : shown.length === 0 ? (
            <p className="text-ui-caption text-ui-muted">Ninguém neste estado.</p>
          ) : (
            <ul aria-label="Membros" className="ui-card divide-y divide-ui-line px-3">
              {shown.map((m) => (
                <li key={m.uid} className="flex items-center gap-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ui-surface-2 text-ui-caption font-extrabold text-ui-brand">
                    {initials(m.displayName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ui-body font-bold text-ui-text">
                      {m.displayName || m.email}
                      {m.role === 'owner' ? ' ★' : ''}
                    </span>
                    <span className="block truncate text-ui-caption text-ui-muted">{m.email}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full bg-ui-brand-soft px-2 py-0.5 text-ui-caption font-bold text-ui-brand">
                        {ROLE_LABELS[m.role]}
                      </span>
                      {m.teamIds.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-ui-surface-2 px-2 py-0.5 text-ui-caption font-bold text-ui-muted"
                        >
                          {teamLabel(t)}
                        </span>
                      ))}
                    </span>
                  </span>
                  {canManage(m) && (
                    <button
                      type="button"
                      className="ui-btn ui-btn-secondary px-3 py-2 text-ui-caption"
                      onClick={() => setManaging(m)}
                    >
                      Gerir
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {me && !manager && (
            <p className="text-ui-caption text-ui-muted">Só o dono e os administradores do clube gerem os membros.</p>
          )}
        </div>
      </Sheet>
      {managing && me && (
        <ManageMember
          orgId={orgId}
          me={me}
          member={managing}
          teams={teams}
          history={audit.filter((e) => e.targetUid === managing.uid)}
          names={names}
          onClose={() => setManaging(null)}
          onDone={(updated, message) => {
            setMembers((prev) => (prev || []).map((m) => (m.uid === updated.uid ? updated : m)));
            readAudit().catch(() => {});
            setManaging(null);
            onShowToast(message);
          }}
        />
      )}
    </>
  );
};

export default OrgMembersModal;
