/**
 * F1.1b — Cópia cifrada da plataforma, só para o Administrador da plataforma. ONLY READS the cloud: it reads every
 * document, encrypts it on this device with the Administrator's passphrase and downloads a ".bcvbak" file. It also
 * opens a copy to check it (decrypt, check the manifest, show the counts). There is no download in clear and no
 * restore in the app: restoring exists only in the test tools, to the emulator.
 */
import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import {
  BackupManifest,
  MIN_PASSPHRASE,
  createBackupFile,
  openBackupFile,
  passphraseProblem
} from '../../lib/encryptedBackup';
import { readBackupDocuments } from '../../services/backupReader';

const ManifestSummary: React.FC<{ manifest: BackupManifest; label: string }> = ({ manifest, label }) => (
  <section aria-label={label} className="ui-card space-y-2 p-3.5 text-ui-caption">
    <h3 className="text-ui-body font-extrabold text-ui-text">{label}</h3>
    <p className="text-ui-muted">Feita em {new Date(manifest.createdAt).toLocaleString('pt-PT')}</p>
    <ul className="space-y-0.5 text-ui-text">
      {Object.entries(manifest.collections).map(([k, n]) => (
        <li key={k}>
          {k}: <strong>{n}</strong>
        </li>
      ))}
    </ul>
    {Object.entries(manifest.recordKinds).map(([ws, kinds]) => (
      <p key={ws} className="text-ui-muted">
        Registos de «{ws}»:{' '}
        {Object.entries(kinds)
          .map(([k, n]) => `${k} ${n}`)
          .join(' · ')}
      </p>
    ))}
    <p className="break-all text-ui-muted">SHA-256 do conjunto: {manifest.total}</p>
    {manifest.errors.length > 0 && <p className="text-ui-warning">Notas: {manifest.errors.join(' · ')}</p>}
  </section>
);

const EncryptedBackupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tab, setTab] = useState<'criar' | 'verificar'>('criar');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<BackupManifest | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [verifyPass, setVerifyPass] = useState('');
  const [verified, setVerified] = useState<BackupManifest | null>(null);

  const create = async () => {
    const problem = passphraseProblem(pass, confirm);
    if (problem) return setError(problem);
    setError('');
    setCreated(null);
    try {
      setBusy('A ler a nuvem…');
      const { documents, errors } = await readBackupDocuments(setBusy);
      setBusy('A cifrar neste aparelho…');
      const backup = await createBackupFile(documents, pass, { errors });
      // The file is checked before it is offered: it must open with the same passphrase
      setBusy('A verificar a cópia…');
      const check = await openBackupFile(backup, pass);
      if (check.ok === false) throw new Error(check.reason);
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bcv-backup-${backup.createdAt.slice(0, 10)}.bcvbak`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setCreated(check.payload.manifest);
      setPass('');
      setConfirm('');
    } catch (err) {
      setError((err as Error)?.message || String(err));
    } finally {
      setBusy('');
    }
  };

  const verify = async () => {
    if (!file) return setError('Escolha o ficheiro .bcvbak.');
    setError('');
    setVerified(null);
    try {
      setBusy('A abrir a cópia…');
      const result = await openBackupFile(JSON.parse(await file.text()), verifyPass);
      if (result.ok === false) return setError(result.reason);
      setVerified(result.payload.manifest);
    } catch {
      setError('Este ficheiro não é uma cópia cifrada do BolaComVisão.');
    } finally {
      setBusy('');
      setVerifyPass('');
    }
  };

  const tabButton = (id: 'criar' | 'verificar', text: string) => (
    <button
      type="button"
      aria-pressed={tab === id}
      onClick={() => {
        setTab(id);
        setError('');
      }}
      className={`flex-1 rounded-ui-sm px-3 py-2 text-ui-caption font-bold ${tab === id ? 'bg-ui-surface-3 text-ui-text' : 'text-ui-muted'}`}
    >
      {text}
    </button>
  );

  return (
    <Sheet title="Cópia cifrada da plataforma" onClose={onClose} size="lg">
      <div className="space-y-3">
        <p className="ui-inset p-3 text-ui-caption text-ui-text">
          <strong>Só leitura.</strong> A cópia lê a nuvem e é cifrada <strong>neste aparelho</strong> antes de ser
          guardada; nada é gravado na nuvem. Tem dados de crianças: guarde o ficheiro só neste aparelho e numa pen,
          nunca no GitHub nem na pasta do código. Sem a frase-passe a cópia não se abre — não há forma de a recuperar.
          Apague as cópias 90 dias depois de a migração estar concluída.
        </p>
        <div role="group" aria-label="Parte" className="ui-inset flex gap-1 p-1">
          {tabButton('criar', 'Criar cópia')}
          {tabButton('verificar', 'Verificar uma cópia')}
        </div>

        {tab === 'criar' ? (
          <div className="space-y-2">
            <label className="block text-ui-caption text-ui-muted">
              Frase-passe (pelo menos {MIN_PASSPHRASE} caracteres)
              <input
                type="password"
                autoComplete="new-password"
                className="ui-input mt-1 w-full"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </label>
            <label className="block text-ui-caption text-ui-muted">
              Repetir a frase-passe
              <input
                type="password"
                autoComplete="new-password"
                className="ui-input mt-1 w-full"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="ui-btn ui-btn-primary w-full px-4 py-2.5"
              disabled={Boolean(busy)}
              onClick={create}
            >
              {busy || 'Criar cópia cifrada'}
            </button>
            {created && (
              <>
                <p role="status" className="text-ui-caption font-bold text-ui-success">
                  Cópia criada, verificada e descarregada.
                </p>
                <ManifestSummary manifest={created} label="Conteúdo da cópia" />
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-ui-caption text-ui-muted">
              Ficheiro da cópia (.bcvbak)
              <input
                type="file"
                accept=".bcvbak"
                className="mt-1 block w-full text-ui-caption text-ui-text"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <label className="block text-ui-caption text-ui-muted">
              Frase-passe da cópia
              <input
                type="password"
                autoComplete="off"
                className="ui-input mt-1 w-full"
                value={verifyPass}
                onChange={(e) => setVerifyPass(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="ui-btn ui-btn-primary w-full px-4 py-2.5"
              disabled={Boolean(busy)}
              onClick={verify}
            >
              {busy || 'Verificar'}
            </button>
            {verified && (
              <>
                <p role="status" className="text-ui-caption font-bold text-ui-success">
                  Cópia íntegra: abre com esta frase-passe e todos os documentos conferem com o manifesto.
                </p>
                <ManifestSummary manifest={verified} label="Conteúdo verificado" />
              </>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="text-ui-caption font-bold text-ui-danger">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
};

export default EncryptedBackupModal;
