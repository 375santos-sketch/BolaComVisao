/**
 * F1.1a — Inventário da plataforma, só para o Administrador da plataforma. ONLY READS: it shows the counts and the
 * adult accounts, and downloads them as a JSON file with a checksum. It writes nothing to the cloud (no state
 * update is passed to it, and the lint configuration forbids the Firestore write functions here).
 */
import React, { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { StatTile } from '../ui/StatTile';
import { Inventory, InventoryWorkspace, buildInventory, inventoryFile } from '../../lib/inventory';
import { readInventorySource } from '../../services/inventoryReader';

const KIND_LABELS: Record<string, string> = {
  club: 'Clube (documento comum)',
  player: 'Atletas',
  match: 'Jogos',
  training: 'Treinos',
  schedule: 'Agenda',
  message: 'Mensagens da equipa técnica',
  scouting: 'Observação de adversários',
  exercise: 'Exercícios',
  setpiece: 'Bolas paradas',
  tacticplay: 'Jogadas (quadro antigo)',
  teamphoto: 'Fotos da equipa',
  report: 'Relatórios mensais',
  teamconfig: 'Definições da equipa'
};
const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovada',
  pending: 'Pendente',
  rejected: 'Recusada',
  accepted: 'Aceite',
  revoked: 'Revogado'
};
const label = (map: Record<string, string>, key: string) => map[key] || key;
const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

const Table: React.FC<{ label: string; head: string[]; rows: React.ReactNode[][] }> = ({ label: name, head, rows }) => (
  <div className="overflow-x-auto">
    <table aria-label={name} className="w-full text-left text-ui-caption">
      <thead className="text-ui-muted">
        <tr>
          {head.map((h) => (
            <th key={h} className="px-2 py-1.5 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-ui-text">
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-ui-line">
            {r.map((c, j) => (
              <td key={j} className="px-2 py-1.5 align-top">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section aria-label={title} className="ui-card space-y-2 p-3.5">
    <h3 className="text-ui-body font-extrabold text-ui-text">{title}</h3>
    {children}
  </section>
);

const Counts: React.FC<{ map: Record<string, number>; names?: Record<string, string> }> = ({ map, names = {} }) => (
  <p className="text-ui-caption text-ui-muted">
    {Object.entries(map)
      .map(([k, n]) => `${label(names, k)}: ${n}`)
      .join(' · ') || '—'}
  </p>
);

const fieldList = (fields: Record<string, number>) =>
  Object.entries(fields)
    .map(([k, n]) => `${k} (${n})`)
    .join(', ');

const SharedDocLine: React.FC<{ title: string; doc: InventoryWorkspace['clubRecord'] }> = ({ title, doc }) => (
  <div className="ui-inset space-y-1 p-2.5 text-ui-caption">
    <p className="font-bold text-ui-text">
      {title}: {doc.exists ? `existe (${kb(doc.bytes)})` : 'não existe'}
    </p>
    {doc.exists && (
      <>
        <p className={doc.users.count > 0 ? 'font-bold text-ui-warning' : 'text-ui-muted'}>
          {doc.users.count > 0
            ? `Contém ${doc.users.count} ${doc.users.count === 1 ? 'conta' : 'contas'} de utilizadores · campos: ${fieldList(doc.users.fields)}`
            : 'Não contém contas de utilizadores'}
        </p>
        <p className="text-ui-muted">
          Convites: {doc.invitations} · Equipas: {doc.teams} · Contactos da equipa técnica: {doc.staffMembers}
        </p>
      </>
    )}
  </div>
);

const WorkspaceCard: React.FC<{ ws: InventoryWorkspace }> = ({ ws }) => (
  <Section title={`Espaço «${ws.id}»`}>
    <p className="text-ui-caption text-ui-muted">
      Formato: {ws.mode} · Contas que trabalham aqui: {ws.accounts} · Registos: {ws.records.live} ativos,{' '}
      {ws.records.deleted} apagados (marcas)
      {ws.records.unknownKind > 0 ? ` · ${ws.records.unknownKind} sem tipo` : ''}
    </p>
    <SharedDocLine title="Documento comum (registo «club»)" doc={ws.clubRecord} />
    <SharedDocLine title="Documento antigo (cópia de antes da migração)" doc={ws.legacyDoc} />
    <Table
      label={`Registos por tipo em ${ws.id}`}
      head={['Tipo', 'Ativos', 'Apagados']}
      rows={Object.entries(ws.records.byKind).map(([k, c]) => [label(KIND_LABELS, k), c.live, c.deleted])}
    />
    <Table
      label={`Registos por equipa em ${ws.id}`}
      head={['Equipa', 'Registos', 'Por tipo']}
      rows={ws.teams.map((t) => [
        t.label,
        t.live,
        Object.entries(t.byKind)
          .map(([k, n]) => `${label(KIND_LABELS, k)} ${n}`)
          .join(' · ') || '—'
      ])}
    />
    <p className="text-ui-caption text-ui-muted">
      Telemóveis com avisos: {ws.pushSubscriptions.phones} (de {ws.pushSubscriptions.accounts}{' '}
      {ws.pushSubscriptions.accounts === 1 ? 'conta' : 'contas'}) · Links públicos ligados:{' '}
      {Object.entries(ws.publicLinks)
        .map(([k, n]) => `${k} ${n}`)
        .join(' · ')}
    </p>
    {ws.errors.length > 0 && <p className="text-ui-caption font-bold text-ui-danger">Erros: {ws.errors.join(' · ')}</p>}
  </Section>
);

const InventoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [checksum, setChecksum] = useState('');
  const [failure, setFailure] = useState('');
  // Seconds since the reading started: shows that the app is working (and for how long)
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const run = async () => {
    setBusy(true);
    setSeconds(0);
    setFailure('');
    try {
      const source = await readInventorySource(setProgress);
      const result = buildInventory(source, new Date());
      const file = await inventoryFile(result);
      setInventory(result);
      setChecksum(file.sha256);
    } catch (err) {
      setFailure((err as Error)?.message || String(err));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const download = async () => {
    if (!inventory) return;
    const file = await inventoryFile(inventory);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bcv-inventario-${inventory.generatedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const a = inventory?.accounts;
  return (
    <Sheet
      title="Inventário da plataforma"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="ui-btn ui-btn-secondary flex-1 px-4 py-2.5" onClick={onClose}>
            Fechar
          </button>
          {inventory ? (
            <button type="button" className="ui-btn ui-btn-primary flex-1 px-4 py-2.5" onClick={download}>
              Descarregar inventário (JSON)
            </button>
          ) : (
            <button type="button" className="ui-btn ui-btn-primary flex-1 px-4 py-2.5" onClick={run} disabled={busy}>
              {busy ? 'A ler…' : 'Fazer inventário'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <p className="ui-inset p-3 text-ui-caption text-ui-text">
          <strong>Só leitura.</strong> Este ecrã lê a nuvem e não grava nada. Mostra contagens e as contas de adultos;
          dos atletas só mostra números, nunca nomes nem dados. O ficheiro descarregado tem nomes e emails de adultos:
          guarde-o com cuidado e fora da pasta do código.
        </p>
        {busy && (
          <p role="status" className="text-ui-caption text-ui-muted">
            {progress || 'A ler…'} ({seconds} s)
          </p>
        )}
        {failure && (
          <p role="alert" className="text-ui-caption font-bold text-ui-danger">
            Não foi possível fazer o inventário: {failure}
          </p>
        )}
        {inventory && a && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Contas" value={a.total} hint={`${a.withoutClub} sem clube`} />
              <StatTile label="Convites" value={inventory.invitations.total} tone="neutral" />
              <StatTile label="Espaços de clube" value={inventory.workspaces.length} tone="neutral" />
              <StatTile
                label="Registos ativos"
                value={inventory.workspaces.reduce((n, w) => n + w.records.live, 0)}
                tone="neutral"
              />
            </div>

            <Section title="O documento comum do clube tem contas de utilizadores?">
              {inventory.sharedDocHoldsUsers.map((s) => (
                <p key={s.workspace} className="text-ui-caption text-ui-text">
                  «{s.workspace}»:{' '}
                  {s.clubRecord + s.legacyDoc > 0 ? (
                    <strong className="text-ui-warning">
                      Sim — {s.clubRecord} no registo «club», {s.legacyDoc} no documento antigo
                    </strong>
                  ) : (
                    'Não'
                  )}
                </p>
              ))}
            </Section>

            <Section title="Contas de adultos">
              <Counts map={a.byStatus} names={STATUS_LABELS} />
              <Counts map={a.byRole} />
              <p className="text-ui-caption text-ui-muted">
                Por espaço:{' '}
                {Object.entries(a.byWorkspace)
                  .map(([k, n]) => `${k} ${n}`)
                  .join(' · ')}{' '}
                · Administradores da plataforma: {a.platformAdmins}
              </p>
              <Table
                label="Lista de contas"
                head={['Conta', 'Nome', 'Email', 'Papel', 'Estado', 'Clube', 'Equipas', 'Desde']}
                rows={a.list.map((u) => [
                  <span key="c" className="font-mono">
                    {u.uid.slice(0, 8)}
                    {u.format === 'account' ? (
                      ''
                    ) : (
                      <span className="block font-sans text-ui-warning">
                        {u.format === 'antigo' ? 'formato antigo' : 'sem dados de conta'}
                        {u.fields.length ? ` · campos: ${u.fields.join(', ')}` : ' · documento vazio'}
                      </span>
                    )}
                  </span>,
                  <span key="n">
                    {u.name || '—'}
                    {u.platformAdmin ? ' ★' : ''}
                  </span>,
                  u.email || '—',
                  u.role || '—',
                  label(STATUS_LABELS, u.status),
                  u.clubId || '(nenhum → main)',
                  u.assignedTeams.join(', ') || '—',
                  u.createdAt ? u.createdAt.slice(0, 10) : '—'
                ])}
              />
              {(a.byFormat['antigo'] || 0) + (a.byFormat['sem dados'] || 0) > 0 && (
                <p className="ui-inset p-2.5 text-ui-caption text-ui-warning">
                  {a.byFormat['sem dados'] || 0} documento(s) sem dados de conta e {a.byFormat['antigo'] || 0} no
                  formato antigo. Campos encontrados neles (só os nomes):{' '}
                  {Object.entries(a.fieldsWithoutAccount)
                    .map(([k, n]) => `${k} (${n})`)
                    .join(', ') || 'nenhum'}
                  . «Conta» é o início do identificador do documento em users/ na consola do Firebase.
                </p>
              )}
              <p className="text-ui-caption text-ui-muted">★ Administrador da plataforma. Sem telefones.</p>
            </Section>

            <Section title="Convites">
              <Counts map={inventory.invitations.byStatus} names={STATUS_LABELS} />
              <p className="text-ui-caption text-ui-muted">
                Por clube:{' '}
                {Object.entries(inventory.invitations.byClub)
                  .map(([k, n]) => `${k} ${n}`)
                  .join(' · ') || '—'}{' '}
                · Pendentes já expirados: {inventory.invitations.pendingExpired}
              </p>
            </Section>

            {inventory.workspaces.map((ws) => (
              <WorkspaceCard key={ws.id} ws={ws} />
            ))}

            <Section title="Outras coleções">
              <p className="text-ui-caption text-ui-muted">
                {Object.entries(inventory.otherCollections)
                  .map(([k, n]) => `${k}: ${n === null ? 'não foi possível contar' : n}`)
                  .join(' · ')}
              </p>
              <p className="text-ui-caption text-ui-muted">
                Links públicos e votações: as regras não deixam listá-los (só se abrem com o código); os ligados
                aparecem em cada espaço.
              </p>
            </Section>

            {inventory.errors.length > 0 && (
              <Section title="Erros de leitura">
                <p className="text-ui-caption font-bold text-ui-danger">{inventory.errors.join(' · ')}</p>
              </Section>
            )}

            <p className="break-all text-ui-caption text-ui-muted">
              Feito em {new Date(inventory.generatedAt).toLocaleString('pt-PT')} · SHA-256: {checksum}
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
};

export default InventoryModal;
