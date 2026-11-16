import React, { useEffect, useState } from 'react';
import { AppState, Player } from '../../../types';
import {
  GuardianInvite,
  GUARDIANS_PER_ATHLETE,
  activeInvites,
  canInviteMore,
  inviteMessage
} from '../../../lib/familyView';
import { createGuardianInvite, revokeGuardianInvite, teamGuardianInvites } from '../../../services/guardians';
import { workspaceIdOf } from '../../../lib/deviceCache';

const ddmm = (ms: number) => new Date(ms).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });

/**
 * E1 — Encarregados do atleta (ficha → Perfil): invite up to 2 guardians with a one-use code (valid 7 days), sent by
 * WhatsApp; see who accepted (and the video consent); take the access away. The guardian sees only «O meu educando».
 */
const GuardiansCard: React.FC<{ state: AppState; player: Player; onShowToast: (msg: string) => void }> = ({
  state,
  player,
  onShowToast
}) => {
  const clubId = workspaceIdOf(state.currentUser);
  const teamId = state.activeTeamId;
  const [invites, setInvites] = useState<GuardianInvite[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let gone = false;
    teamGuardianInvites(clubId, teamId).then(
      (list) => !gone && setInvites(list.filter((i) => i.athleteId === player.id)),
      () => !gone && setError('Sem ligação: os convites aparecem quando houver rede.')
    );
    return () => {
      gone = true;
    };
  }, [clubId, teamId, player.id]);

  const shown = (invites || [])
    .filter((i) => i.status !== 'revoked' && i.status !== 'left')
    .sort((a, b) => b.createdAt - a.createdAt);
  const send = (invite: GuardianInvite) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage(invite, window.location.origin))}`, '_blank');

  const invite = async () => {
    setBusy(true);
    try {
      const created = await createGuardianInvite({
        clubId,
        teamId,
        athleteId: player.id,
        athleteName: player.name,
        teamName: state.category || '',
        clubName: state.myClubName || ''
      });
      setInvites((prev) => [...(prev || []), created]);
      onShowToast('Convite criado ✓ Envie-o por WhatsApp ao encarregado.');
      send(created);
    } catch {
      setError('Não foi possível criar o convite (sem ligação ou sem permissão).');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ui-card space-y-2 p-3" aria-label="Encarregados de educação">
      <div className="flex items-center justify-between gap-2">
        <span className="ui-kicker">Encarregados · até {GUARDIANS_PER_ATHLETE}</span>
      </div>
      {invites === null && !error && <p className="text-xs text-ui-muted">A carregar…</p>}
      {invites !== null && shown.length === 0 && (
        <p className="text-xs text-ui-muted">
          Ainda sem encarregados na app. Com um convite, o encarregado vê só este atleta: próximos jogos e treinos,
          convocatórias e presenças. Nunca notas, avaliações, contactos ou outros atletas.
        </p>
      )}
      <ul className="divide-y divide-ui-line">
        {shown.map((i) => {
          const expired = i.status === 'pending' && i.expiresAt <= now;
          return (
            <li key={i.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
              <span className="min-w-0 text-ui-text">
                {i.status === 'accepted' ? (
                  <>
                    ✓ Na app desde {ddmm(i.acceptedAt || i.createdAt)}
                    <span className="block text-[11px] text-ui-muted">
                      Vídeos com o educando: {i.consentVideo ? 'autorizados' : 'não autorizados'}
                    </span>
                  </>
                ) : expired ? (
                  <span className="text-ui-muted">Convite de {ddmm(i.createdAt)} expirou</span>
                ) : (
                  <>
                    Convite enviado {ddmm(i.createdAt)} · à espera
                    <button type="button" onClick={() => send(i)} className="ml-2 text-ui-brand underline">
                      Reenviar
                    </button>
                  </>
                )}
              </span>
              {!expired && (
                <button
                  type="button"
                  aria-label="Retirar o acesso do encarregado"
                  onClick={async () => {
                    if (!window.confirm('Retirar o acesso? O encarregado deixa de ver a página do educando.')) return;
                    try {
                      await revokeGuardianInvite(i.id);
                      setInvites((prev) => (prev || []).map((x) => (x.id === i.id ? { ...x, status: 'revoked' } : x)));
                      onShowToast('Acesso retirado');
                    } catch {
                      setError('Não foi possível retirar o acesso (sem ligação?).');
                    }
                  }}
                  className="shrink-0 text-[11px] text-ui-danger"
                >
                  Retirar
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-[11px] text-ui-danger">{error}</p>}
      {invites !== null && canInviteMore(invites, player.id, now) && (
        <button type="button" disabled={busy} onClick={invite} className="ui-btn ui-btn-primary w-full text-xs">
          + Convidar encarregado
        </button>
      )}
      {invites !== null &&
        activeInvites(
          invites.filter((i) => i.athleteId === player.id),
          now
        ).length >= 2 && <p className="text-[11px] text-ui-muted">Já tem os 2 encarregados possíveis.</p>}
      <p className="text-[11px] text-ui-muted">
        🔒 Fase de teste: só com famílias que saibam que é teste, até a validação jurídica estar feita.
      </p>
    </div>
  );
};

export default GuardiansCard;
