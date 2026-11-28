import React, { useState } from 'react';
import { UserAccount } from '../types';
import { auth, signOut } from '../services/firebase';
import { loginCoachUser, loginWithGoogle } from '../services/cloudAuthService';

interface SessionExpiredBannerProps {
  user: UserAccount;
  onRestored: () => void;
}

/**
 * The Firebase session ended on this device while the app still shows the coach signed in: nothing can be saved
 * to the cloud. Signing in again here keeps this device's data (unlike "Terminar sessão", which deletes it).
 */
export const SessionExpiredBanner: React.FC<SessionExpiredBannerProps> = ({ user, onRestored }) => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = user.email || user.username || '';

  const finish = async (ok: boolean, message?: string) => {
    if (!ok) {
      setError(message || 'Não foi possível entrar.');
      return;
    }
    if (auth.currentUser && auth.currentUser.uid !== user.id) {
      await signOut(auth).catch(() => {});
      setError(`Entrou com outra conta. Use a conta de ${user.name || login}.`);
      return;
    }
    setOpen(false);
    setPassword('');
    onRestored();
  };

  const withPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await loginCoachUser(login, password);
      await finish(res.success, res.error);
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await loginWithGoogle();
      await finish(res.success, (res as { error?: string }).error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="alert"
      className="mb-3 rounded-ui-lg border border-ui-danger/50 bg-ui-danger-soft p-3 text-xs text-ui-text space-y-2"
    >
      <div>
        <div className="font-bold text-ui-danger text-ui-body">A sessão na nuvem terminou</div>
        As alterações estão guardadas neste aparelho, mas só vão para a nuvem depois de entrar de novo. Não use
        &quot;Terminar sessão&quot;: isso apagava-as deste aparelho.
      </div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="ui-btn ui-btn-danger px-3 py-2">
          Entrar de novo
        </button>
      ) : (
        <form onSubmit={withPassword} className="space-y-2">
          <div className="text-ui-muted">
            Conta: <strong>{login}</strong>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Palavra-passe"
            aria-label="Palavra-passe"
            autoComplete="current-password"
            className="ui-input w-full text-sm"
          />
          {error && <div className="text-ui-danger">{error}</div>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !password} className="ui-btn ui-btn-danger px-3 py-2">
              {busy ? 'A entrar…' : 'Entrar'}
            </button>
            <button type="button" disabled={busy} onClick={withGoogle} className="ui-btn ui-btn-secondary px-3 py-2">
              Entrar com a conta Google
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
