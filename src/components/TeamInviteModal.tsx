import React, { useState } from 'react';
import { AppState, TeamInvitation, UserClubRole } from '../types';
import { uid } from '../lib/utils';
import { recordAuditLog } from '../lib/auditEngine';
import { createTeamInvitation, revokeTeamInvitation } from '../services/cloudAuthService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface TeamInviteModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({ state, onUpdateState, onClose, onShowToast }) => {
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(state.activeTeamId || state.teams[0]?.id || '');
  const [selectedRole, setSelectedRole] = useState<UserClubRole>('Treinador Adjunto');
  const [generatedInvite, setGeneratedInvite] = useState<TeamInvitation | null>(null);

  const teams = state.teams || [];
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const invitations = state.invitations || [];

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      if (onShowToast) onShowToast('Introduza um email válido.');
      return;
    }

    // 8 characters from an unambiguous alphabet, from a cryptographic random source (32^8 ≈ 10^12 codes)
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const random = crypto.getRandomValues(new Uint32Array(8));
    const inviteCode = 'BCV-' + Array.from(random, (n) => alphabet[n % alphabet.length]).join('');
    const newInvite: TeamInvitation = {
      id: 'inv_' + uid(),
      email: email.trim().toLowerCase(),
      name: name.trim() || undefined,
      clubId: state.currentUser?.clubId || 'main',
      teamId: selectedTeamId,
      teamName: `${selectedTeam?.clubName} (${selectedTeam?.category || 'Geral'})`,
      role: selectedRole,
      inviteCode,
      invitedBy: state.currentUser?.id || 'admin',
      invitedByName: state.currentUser?.name || state.currentUser?.username || 'Administrador',
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      status: 'pending'
    };

    const updated = [newInvite, ...invitations];
    onUpdateState({ invitations: updated });
    setGeneratedInvite(newInvite);

    // Grava também na coleção Firestore /invitations (usando o código como ID) — é isto que
    // permite a quem ainda não tem conta "ler" o convite e juntar-se ao clube certo ao registar-se.
    createTeamInvitation(newInvite).catch((err) => {
      console.warn('Aviso: convite guardado localmente mas falhou a gravar na nuvem:', err);
    });

    recordAuditLog(
      state.currentUser,
      'invite',
      'utilizador',
      `Gerou convite para ${email} como ${selectedRole} na equipa ${newInvite.teamName} (Código: ${inviteCode})`,
      { teamId: selectedTeamId, teamName: newInvite.teamName }
    );

    if (onShowToast) onShowToast('Convite criado com sucesso! ✉️');
  };

  const handleCopyInviteLink = (invite: TeamInvitation) => {
    const text = `⚽ Convite BolaComVisão: Olá! Foste convidado para integrar a equipa técnica (${invite.teamName}) como ${invite.role}.\nCódigo de Acesso: ${invite.inviteCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (onShowToast) onShowToast('Texto de convite copiado para a área de transferência! 📋');
    }
  };

  const handleRevokeInvite = (inviteId: string) => {
    const target = invitations.find((inv) => inv.id === inviteId);
    const updated = invitations.map((inv) => (inv.id === inviteId ? { ...inv, status: 'revoked' as const } : inv));
    onUpdateState({ invitations: updated });
    if (target) {
      revokeTeamInvitation(target.inviteCode).catch((err) => {
        console.warn('Aviso: convite revogado localmente mas falhou a revogar na nuvem:', err);
      });
    }
    if (onShowToast) onShowToast('Convite revogado.');
  };

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn select-none">
      <div className="w-full max-w-2xl bg-slate-950 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88dvh] text-left">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xl shrink-0">
              👥
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-['Chakra_Petch'] uppercase tracking-wider text-white">
                Convidar Treinador ou Staff Técnico
              </h3>
              <p className="text-xs font-mono text-slate-400">Atribua funções e equipas com permissões seguras</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-secondary w-8 h-8 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 font-mono text-xs flex-1 scrollbar-thin">
          {/* Creation Form */}
          <form onSubmit={handleCreateInvite} className="ui-card p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-['Chakra_Petch'] uppercase font-bold">
                  Email do Treinador / Staff *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@clube.pt"
                  className="ui-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-['Chakra_Petch'] uppercase font-bold">
                  Nome (Opcional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do treinador"
                  className="ui-input w-full text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-['Chakra_Petch'] uppercase font-bold">
                  Equipa / Escalão *
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="ui-input w-full text-xs"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.clubName} ({t.category || 'Geral'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-['Chakra_Petch'] uppercase font-bold">
                  Função na Equipa *
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserClubRole)}
                  className="ui-input w-full text-xs"
                >
                  <option value="Treinador Principal">Treinador Principal</option>
                  <option value="Treinador Adjunto">Treinador Adjunto</option>
                  <option value="Treinador de Guarda-Redes">Treinador de Guarda-Redes</option>
                  <option value="Preparador Físico">Preparador Físico</option>
                  <option value="Analista">Analista</option>
                  <option value="Fisioterapeuta">Fisioterapeuta</option>
                  <option value="Diretor">Diretor / Coordenador</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="sm" icon={<span>✉️</span>}>
                Gerar Convite de Acesso
              </Button>
            </div>
          </form>

          {/* Generated Code Spotlight */}
          {generatedInvite && (
            <div className="p-4 bg-cyan-950/40 border border-cyan-500/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div>
                <div className="text-[10px] text-cyan-300 uppercase font-black tracking-widest">
                  Código de Acesso Gerado
                </div>
                <div className="text-xl font-black font-mono text-white tracking-widest mt-0.5">
                  {generatedInvite.inviteCode}
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Para: {generatedInvite.email} · {generatedInvite.role}
                </div>
              </div>
              <Button
                variant="secondary"
                size="xs"
                icon={<span>📋</span>}
                onClick={() => handleCopyInviteLink(generatedInvite)}
              >
                Copiar Mensagem
              </Button>
            </div>
          )}

          {/* List of Recent Invites */}
          <div>
            <h4 className="text-xs font-bold font-['Chakra_Petch'] uppercase text-slate-300 mb-2">
              Convites Ativos ({invitations.length})
            </h4>
            <div className="space-y-2">
              {invitations.length === 0 ? (
                <p className="text-slate-400 py-3 text-center">Nenhum convite emitido recentemente.</p>
              ) : (
                invitations.map((inv) => (
                  <div key={inv.id} className="ui-card p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{inv.email}</span>
                        <Badge
                          variant={inv.status === 'accepted' ? 'emerald' : inv.status === 'revoked' ? 'rose' : 'amber'}
                          size="xs"
                        >
                          {inv.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {inv.teamName} · {inv.role} · Código:{' '}
                        <span className="text-cyan-300 font-bold">{inv.inviteCode}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inv.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(inv)}
                            className="ui-btn ui-btn-secondary p-1.5"
                            title="Copiar"
                          >
                            📋
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="ui-btn ui-btn-secondary p-1.5"
                            title="Revogar"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/95 shrink-0 flex justify-end pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_rgba(0,0,0,0.4)]">
          <Button variant="secondary" size="sm" onClick={onClose} className="min-h-[44px]">
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
};
