/**
 * F1.8 — Migração do clube «main» (só para o Administrador da plataforma). Choose, account by account, who becomes
 * a member of the organization "main"; see the summary; run; see the automatic checks. BLOCKED in production
 * (MAIN_MIGRATION_ENABLED): the choices can be prepared, the button only lights up where the migration is allowed.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Sheet } from '../ui/Sheet';
import {
  MAIN_ORG_ID,
  MigrationAccount,
  MigrationChoice,
  migrationAccountsFrom,
  planMainMigration,
  recordCountsByKind
} from '../../lib/mainMigration';
import { orgRoleFromLegacy } from '../../lib/organizations';
import { MAIN_MIGRATION_ENABLED, MigrationReport, runMainMigration } from '../../services/mainMigration';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dono',
  admin: 'Administrador',
  diretor: 'Diretor',
  coordenador: 'Coordenador',
  treinador: 'Treinador',
  adjunto: 'Adjunto',
  staff: 'Staff'
};
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

const MainMigrationModal: React.FC<{ ownerUid: string; clubName: string; onClose: () => void }> = ({
  ownerUid,
  clubName,
  onClose
}) => {
  const [accounts, setAccounts] = useState<MigrationAccount[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [choices, setChoices] = useState<Record<string, MigrationChoice>>({});
  const [backupDone, setBackupDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    (async () => {
      try {
        const users = await getDocs(collection(db, 'users'));
        const list = migrationAccountsFrom(users.docs.map((d) => ({ id: d.id, data: d.data() })));
        setAccounts(list);
        // By default: approved accounts in, everything else out (the empty documents can never be chosen)
        setChoices(
          Object.fromEntries(list.map((a) => [a.uid, !a.empty && a.status === 'approved' ? 'membro' : 'fora']))
        );
        const records = await getDocs(collection(db, 'club_workspace', MAIN_ORG_ID, 'records'));
        setCounts(recordCountsByKind(records.docs.map((d) => ({ data: d.data() }))));
      } catch (err) {
        setError((err as Error)?.message || String(err));
      }
    })();
  }, []);

  const plan = useMemo(
    () =>
      accounts ? planMainMigration({ orgName: clubName, ownerUid, actorUid: ownerUid, accounts, choices, now }) : null,
    [accounts, choices, clubName, ownerUid, now]
  );
  const live = counts ? Object.entries(counts).filter(([k]) => !k.endsWith('(apagado)')) : [];
  const deleted = counts ? Object.entries(counts).filter(([k]) => k.endsWith('(apagado)')) : [];
  const sum = (rows: [string, number][]) => rows.reduce((n, [, v]) => n + v, 0);
  const empties = accounts?.filter((a) => a.empty) || [];
  const people = accounts?.filter((a) => !a.empty) || [];
  const canRun = MAIN_MIGRATION_ENABLED && backupDone && !!plan && plan.problems.length === 0 && !busy && !report;

  const run = async () => {
    if (!plan) return;
    setBusy(true);
    setError('');
    try {
      setReport(await runMainMigration(plan));
    } catch (err) {
      setError((err as Error)?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Migração do clube" onClose={onClose} size="lg">
      <div className="space-y-3">
        {!MAIN_MIGRATION_ENABLED && (
          <section
            aria-label="Bloqueio"
            className="rounded-ui border border-ui-danger/40 bg-ui-danger-soft p-3 text-ui-caption text-ui-text"
          >
            <p className="font-extrabold text-ui-danger">🔒 Bloqueada na produção</p>
            <p>
              Falta: F2 concluída e validada. Pode preparar as escolhas; o botão de migrar só acende quando tudo estiver
              cumprido.
            </p>
          </section>
        )}
        {error && (
          <p role="alert" className="text-ui-caption font-bold text-ui-danger">
            {error}
          </p>
        )}
        {!accounts ? (
          <p role="status" className="text-ui-caption text-ui-muted">
            A ler as contas…
          </p>
        ) : (
          <>
            <section aria-label="Quem fica no clube" className="space-y-2">
              <h3 className="text-ui-caption font-extrabold uppercase tracking-[0.08em] text-ui-muted">
                1 · Quem fica no clube
              </h3>
              <ul className="ui-card divide-y divide-ui-line px-3">
                {people.map((a) => {
                  const choice = choices[a.uid] || 'fora';
                  const role = orgRoleFromLegacy(a.role, a.uid === ownerUid);
                  return (
                    <li key={a.uid} className="flex items-center gap-3 py-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ui-surface-2 text-ui-caption font-extrabold text-ui-brand">
                        {initials(a.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ui-body font-bold text-ui-text">
                          {a.name || a.uid}
                          {a.uid === ownerUid ? ' ★' : ''}
                        </span>
                        <span className="block text-ui-caption text-ui-muted">
                          {a.status === 'approved'
                            ? `${a.role || 'Sem papel'} → ${ROLE_LABELS[role]}`
                            : 'Conta não aprovada'}
                        </span>
                      </span>
                      <span
                        role="group"
                        aria-label={`Escolha para ${a.name || a.uid}`}
                        className="flex shrink-0 rounded-ui-sm bg-ui-surface-2 p-0.5"
                      >
                        {(['membro', 'fora'] as MigrationChoice[]).map((c) => (
                          <button
                            key={c}
                            type="button"
                            aria-pressed={choice === c}
                            disabled={!!report}
                            onClick={() => setChoices((prev) => ({ ...prev, [a.uid]: c }))}
                            className={`rounded-ui-sm px-2.5 py-1.5 text-ui-caption font-extrabold ${
                              choice === c
                                ? c === 'membro'
                                  ? 'bg-ui-brand text-ui-brand-ink'
                                  : 'bg-ui-surface-3 text-ui-text'
                                : 'text-ui-muted'
                            }`}
                          >
                            {c === 'membro' ? 'Membro' : 'Fora'}
                          </button>
                        ))}
                      </span>
                    </li>
                  );
                })}
                {empties.length > 0 && (
                  <li className="flex items-center gap-3 py-2.5 opacity-60">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ui-surface-2 text-ui-caption font-extrabold text-ui-muted">
                      ?
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-ui-body font-bold text-ui-text">
                        Conta sem dados (×{empties.length})
                      </span>
                      <span className="block text-ui-caption text-ui-muted">
                        Documento sem dados de conta · fica de fora
                      </span>
                    </span>
                  </li>
                )}
              </ul>
              <p className="text-ui-caption text-ui-muted">
                Quem fica de fora continua a entrar como hoje até às regras finais (F1.10); depois deixa de ver o clube.
              </p>
            </section>

            <section aria-label="Antes de migrar" className="space-y-2">
              <h3 className="text-ui-caption font-extrabold uppercase tracking-[0.08em] text-ui-muted">
                2 · Antes de migrar
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="ui-inset p-2.5">
                  <p className="text-ui-lead font-extrabold text-ui-text">{plan?.members.length ?? 0}</p>
                  <p className="text-ui-caption text-ui-muted">membros a criar (dono incluído)</p>
                </div>
                <div className="ui-inset p-2.5">
                  <p className="text-ui-lead font-extrabold text-ui-text">
                    {counts ? `${sum(live)} · ${sum(deleted)}` : '…'}
                  </p>
                  <p className="text-ui-caption text-ui-muted">registos ativos · apagados</p>
                </div>
              </div>
              <label className="flex items-start gap-2 text-ui-caption text-ui-text">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={backupDone}
                  onChange={(e) => setBackupDone(e.target.checked)}
                />
                Fiz uma cópia cifrada da plataforma nas últimas 24 horas e verifiquei-a («Cópia íntegra»).
              </label>
              {plan && plan.problems.length > 0 && (
                <p className="text-ui-caption font-bold text-ui-warning">Falta resolver: {plan.problems.join(' · ')}</p>
              )}
              <p className="text-ui-caption text-ui-muted">
                A migração <strong>só acrescenta</strong>: os dados do clube não mudam. Correr duas vezes não duplica
                nem desfaz alterações feitas depois.
              </p>
              <button
                type="button"
                className="ui-btn ui-btn-primary w-full px-4 py-2.5"
                disabled={!canRun}
                onClick={run}
              >
                {busy ? 'A migrar…' : 'Criar organização e membros'}
              </button>
            </section>

            {report && (
              <section aria-label="Verificação automática" className="space-y-2">
                <h3 className="text-ui-caption font-extrabold uppercase tracking-[0.08em] text-ui-muted">
                  3 · Verificação automática
                </h3>
                <ul className="ui-card space-y-1 p-3 text-ui-caption">
                  {report.checks.map((c) => (
                    <li key={c.label} className={c.ok ? 'text-ui-text' : 'font-bold text-ui-danger'}>
                      <span className={c.ok ? 'font-extrabold text-ui-success' : ''}>{c.ok ? '✓' : '✗'}</span> {c.label}
                    </li>
                  ))}
                </ul>
                <p
                  role="status"
                  className={`text-ui-caption font-bold ${report.ok ? 'text-ui-success' : 'text-ui-danger'}`}
                >
                  {report.ok
                    ? 'Migração concluída e verificada.'
                    : 'A verificação encontrou problemas: não continue sem rever.'}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};

export default MainMigrationModal;
