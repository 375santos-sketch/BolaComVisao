import React, { useState, useEffect } from 'react';
import { AppState, UserAccount } from '../types';
import {
  subscribeToAllClubUsers,
  approveCoachUser,
  rejectCoachUser,
  updateCoachRole,
  updateCoachAssignedTeams,
  deleteCoachAccount,
  createCoachUserAsAdmin,
  saveMasterClubState,
  isAppAdmin,
  isStrictAdminEmail,
  promoteUserToAdmin,
  demoteAdmin,
  ADMIN_EMAIL,
  logAuditEvent
} from '../services/cloudAuthService';
import { openWhatsAppRegistrationRequest, openEmailRegistrationRequest } from '../lib/notificationEngine';
import { MASTER_ADMIN_USERNAME } from '../lib/constants';

interface AdminUsersModalProps {
  isOpen?: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  state?: AppState;
  onUpdateState?: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  appState?: any;
}

const AVAILABLE_ROLES = [
  'Treinador Principal',
  'Treinador Adjunto',
  'Treinador de Guarda-Redes',
  'Preparador Físico',
  'Analista / Observador',
  'Fisioterapeuta / Médico',
  'Diretor Desportivo',
  'Coordenador Técnico',
  'Seccionista / Dirigente',
  'Outro'
];

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen = true,
  onClose,
  currentUser: explicitCurrentUser,
  state,
  onShowToast,
  appState
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'new_user' | 'cloud'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // New coach direct registration state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Treinador Principal');
  const [newAssignedTeams, setNewAssignedTeams] = useState<string[]>(['all']);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const currentUser = explicitCurrentUser || state?.currentUser || null;
  const currentAppState = state || appState;

  // Selected roles map for pending approval edits
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  // Selected teams map for pending approval edits
  const [selectedTeams, setSelectedTeams] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToAllClubUsers(
      (updatedUsers) => {
        setUsers(updatedUsers);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao subscrever utilizadores:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      setLoading(true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isAdmin = isAppAdmin(currentUser);

  const realAdmins = users.filter((u) => u.role === 'Administrador' || isStrictAdminEmail(u.email));

  const hasMasterAdminDoc = realAdmins.some((u) => isStrictAdminEmail(u.email));
  const masterAdminPlaceholder: UserAccount | null = hasMasterAdminDoc
    ? null
    : currentUser && isStrictAdminEmail(currentUser.email)
      ? { ...currentUser, role: 'Administrador', status: 'approved' as const, email: ADMIN_EMAIL }
      : {
          id: 'master-admin-santos',
          username: MASTER_ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          name: 'Administrador Principal',
          role: 'Administrador',
          status: 'approved' as const,
          assignedTeams: ['all'],
          createdAt: new Date().toISOString()
        };

  const adminUsers = masterAdminPlaceholder ? [masterAdminPlaceholder, ...realAdmins] : realAdmins;
  const adminIds = new Set(adminUsers.map((u) => u.id));

  const otherUsers = users.filter((u) => !adminIds.has(u.id));

  const pendingUsers = otherUsers.filter((u) => u.status === 'pending');
  const rejectedUsers = otherUsers.filter((u) => u.status === 'rejected');
  const coachUsers = otherUsers.filter((u) => u.status === 'approved');
  const approvedUsers = [...adminUsers, ...coachUsers];

  const handlePromoteToAdmin = async (user: UserAccount) => {
    if (!isAdmin) {
      onShowToast('❌ Apenas um Administrador pode promover outro utilizador.');
      return;
    }
    if (!window.confirm(`Tens a certeza que queres promover ${user.name} a Administrador? Vai ter acesso total.`)) {
      return;
    }
    setProcessingId(user.id);
    const res = await promoteUserToAdmin(user.id);
    setProcessingId(null);
    onShowToast(res.success ? `👑 ${res.message}` : `❌ ${res.message}`);
  };

  const handleDemoteAdmin = async (user: UserAccount) => {
    if (!isAdmin) {
      onShowToast('❌ Apenas um Administrador pode remover privilégios de outro.');
      return;
    }
    if (isStrictAdminEmail(user.email)) {
      onShowToast('❌ O Administrador Principal não pode perder privilégios.');
      return;
    }
    if (!window.confirm(`Remover os privilégios de Administrador de ${user.name}?`)) {
      return;
    }
    setProcessingId(user.id);
    const res = await demoteAdmin(user.id);
    setProcessingId(null);
    onShowToast(res.success ? `✓ ${res.message}` : `❌ ${res.message}`);
  };

  const clubTeams = currentAppState?.teams || [];

  const handleApprove = async (user: UserAccount) => {
    if (!isAdmin) {
      onShowToast('❌ Apenas o Administrador único pode autorizar utilizadores.');
      return;
    }
    const targetRole = selectedRoles[user.id] || user.role || 'Treinador Principal';
    const targetAssignedTeams =
      selectedTeams[user.id] !== undefined ? selectedTeams[user.id] : user.assignedTeams || [];

    if (targetAssignedTeams.length === 0) {
      const proceed = window.confirm(
        `Atenção: Nenhuma equipa foi selecionada para ${user.name}.\n\nO treinador será aprovado no estado "Sem equipa atribuída" até que uma equipa lhe seja associada pelo Administrador.\n\nDeseja continuar?`
      );
      if (!proceed) return;
    }

    setProcessingId(user.id);
    const adminName = currentUser?.name || 'Administrador (Santos)';

    const res = await approveCoachUser(user.id, adminName, targetRole, targetAssignedTeams);
    setProcessingId(null);

    if (res.success) {
      await logAuditEvent({
        userId: currentUser?.id || 'admin',
        userName: adminName,
        action: 'permission_change',
        target: user.name || user.username,
        details: `Autorizou o treinador ${user.name} com a função "${targetRole}" e equipas: ${targetAssignedTeams.length ? targetAssignedTeams.join(', ') : 'Nenhuma (Sem equipa atribuída)'}.`
      });
      onShowToast(`✓ ${user.name} foi autorizado como ${targetRole}! ⚽`);
    } else {
      onShowToast(`❌ ${res.message}`);
    }
  };

  const handleReject = async (user: UserAccount) => {
    if (!isAdmin) {
      onShowToast('❌ Apenas o Administrador único pode recusar utilizadores.');
      return;
    }
    if (isStrictAdminEmail(user.email)) {
      onShowToast('❌ O Administrador Principal não pode ser suspenso.');
      return;
    }
    setProcessingId(user.id);
    const adminName = currentUser?.name || 'Administrador (Santos)';

    const res = await rejectCoachUser(user.id, adminName);
    setProcessingId(null);

    if (res.success) {
      await logAuditEvent({
        userId: currentUser?.id || 'admin',
        userName: adminName,
        action: 'permission_change',
        target: user.name || user.username,
        details: `Suspendeu o acesso de ${user.name}.`
      });
      onShowToast(`Pedido de ${user.name} recusado.`);
    } else {
      onShowToast(`❌ ${res.message}`);
    }
  };

  const handleChangeRole = async (user: UserAccount, newRole: string) => {
    if (!isAdmin) {
      onShowToast('❌ Apenas o Administrador único pode alterar funções.');
      return;
    }
    setProcessingId(user.id);
    const res = await updateCoachRole(user.id, newRole);
    setProcessingId(null);

    if (res.success) {
      const adminName = currentUser?.name || 'Administrador';
      await logAuditEvent({
        userId: currentUser?.id || 'admin',
        userName: adminName,
        action: 'permission_change',
        target: user.name || user.username,
        details: `Alterou a função de ${user.name} para "${newRole}".`
      });
      onShowToast('Função atualizada com sucesso!');
    } else {
      onShowToast(`❌ ${res.message}`);
    }
  };

  const handleSaveAssignedTeams = async (user: UserAccount) => {
    if (!isAdmin) {
      onShowToast('❌ Apenas o Administrador único pode alterar permissões de equipa.');
      return;
    }
    setProcessingId(user.id);
    const targetAssignedTeams =
      selectedTeams[user.id] !== undefined ? selectedTeams[user.id] : user.assignedTeams || [];
    const res = await updateCoachAssignedTeams(user.id, targetAssignedTeams);
    setProcessingId(null);

    if (res.success) {
      const adminName = currentUser?.name || 'Administrador';
      await logAuditEvent({
        userId: currentUser?.id || 'admin',
        userName: adminName,
        action: 'permission_change',
        target: user.name || user.username,
        details: `Atualizou as equipas atribuídas a ${user.name}: ${targetAssignedTeams.length ? targetAssignedTeams.join(', ') : 'Nenhuma (Sem equipa atribuída)'}.`
      });
      onShowToast(`✓ Equipas de ${user.name} atualizadas com sucesso!`);
    } else {
      onShowToast(`❌ ${res.message}`);
    }
  };

  const handleDelete = async (user: UserAccount) => {
    if (!isAdmin) {
      onShowToast('❌ Apenas o Administrador único pode remover contas.');
      return;
    }
    if (isStrictAdminEmail(user.email)) {
      onShowToast('❌ A conta de Administrador Principal não pode ser eliminada.');
      return;
    }
    setProcessingId(user.id);
    const res = await deleteCoachAccount(user.id);
    setProcessingId(null);

    if (res.success) {
      onShowToast(`Conta de ${user.name} removida.`);
    } else {
      onShowToast(`❌ ${res.message}`);
    }
  };

  const handleForceMasterSync = async () => {
    if (!currentAppState) return;
    setProcessingId('sync_master');
    const res = await saveMasterClubState('main', currentAppState, currentUser?.id, currentUser?.name);
    setProcessingId(null);

    if (res.success) {
      onShowToast('✓ Base de dados master do clube sincronizada na Nuvem!');
    } else {
      onShowToast(`❌ ${res.message}`);
    }
  };

  const handleDirectCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onShowToast('❌ Apenas o Administrador pode criar utilizadores.');
      return;
    }
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      onShowToast('❌ Preencha todos os campos obrigatórios.');
      return;
    }
    if (newPassword.trim().length < 6) {
      onShowToast('❌ A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsCreatingUser(true);
    const res = await createCoachUserAsAdmin(newName, newEmail, newPassword, newRole, newAssignedTeams);
    setIsCreatingUser(false);

    if (res.success) {
      const msg = res.notice
        ? `✓ Treinador ${newName} pré-autorizado com sucesso! (Função: ${newRole})`
        : `✓ Treinador ${newName} criado e autorizado com sucesso! 🎉`;
      onShowToast(msg);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('Treinador Principal');
      setNewAssignedTeams(['all']);
      setActiveTab('approved');
    } else {
      onShowToast(`❌ ${res.error || 'Erro ao criar treinador'}`);
    }
  };

  const toggleNewUserTeam = (teamId: string) => {
    if (teamId === 'all') {
      setNewAssignedTeams(['all']);
      return;
    }
    setNewAssignedTeams((prev) => {
      if (prev.includes('all')) {
        return [teamId];
      }
      if (prev.includes(teamId)) {
        const next = prev.filter((t) => t !== teamId);
        return next.length === 0 ? ['all'] : next;
      }
      return [...prev, teamId];
    });
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-t sm:border border-cyan-500/30 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-[0_0_50px_rgba(0,210,255,0.2)] overflow-hidden text-left">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(0,210,255,0.2)]">
              👥
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-['Chakra_Petch'] uppercase tracking-wider text-white flex items-center gap-2">
                <span>Gestão de Acessos & Treinadores</span>
                {pendingUsers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-black animate-pulse">
                    {pendingUsers.length} Novo{pendingUsers.length > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <p className="text-xs font-mono text-cyan-300/70">
                Aprovação de novos registos e permissões da equipa técnica ({ADMIN_EMAIL})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-white flex items-center justify-center transition-all active:scale-95 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-950 p-1.5 border-b border-cyan-500/10 shrink-0 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
            }`}
          >
            <span>⏳ Pendentes</span>
            {pendingUsers.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  activeTab === 'pending' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500 text-slate-950'
                }`}
              >
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
            }`}
          >
            <span>✓ Treinadores ({approvedUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new_user')}
            className={`py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'new_user'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-900'
            }`}
          >
            <span>➕ Criar Treinador</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'cloud'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
            }`}
          >
            <span>☁️ Nuvem</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: PENDING REGISTRATIONS */}
          {activeTab === 'pending' && (
            <div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-4 text-xs text-amber-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">🛡️</span>
                <div>
                  <span className="font-bold text-amber-300">Controlo de Acesso pelo Administrador Único:</span> Novos
                  treinadores e membros da equipa técnica que se registem só conseguem aceder à base de dados do clube
                  após a sua autorização expressa.
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-cyan-300 font-mono text-xs flex flex-col items-center gap-2">
                  <span className="animate-spin text-2xl">🔄</span>
                  <span>A carregar pedidos na nuvem...</span>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 p-6">
                  <div className="text-3xl mb-2">✨</div>
                  <div className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase">
                    Não há pedidos pendentes
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Todos os registos de treinadores estão autorizados ou tratados.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((user) => {
                    const currentSelectedRole = selectedRoles[user.id] || user.role || 'Treinador Principal';
                    const userTeams =
                      selectedTeams[user.id] !== undefined ? selectedTeams[user.id] : user.assignedTeams || [];
                    const isAllTeams = userTeams.includes('all');
                    const isProcessing = processingId === user.id;

                    const toggleTeamAccess = (teamId: string) => {
                      setSelectedTeams((prev) => {
                        const current = prev[user.id] !== undefined ? prev[user.id] : user.assignedTeams || [];
                        if (teamId === 'all') {
                          return { ...prev, [user.id]: current.includes('all') ? [] : ['all'] };
                        }

                        let updated: string[];
                        if (current.includes('all')) {
                          updated = [teamId];
                        } else if (current.includes(teamId)) {
                          updated = current.filter((id) => id !== teamId);
                        } else {
                          updated = [...current, teamId];
                        }
                        return { ...prev, [user.id]: updated };
                      });
                    };

                    return (
                      <div
                        key={user.id}
                        className="bg-slate-950 border-2 border-amber-500/40 rounded-2xl p-4 transition-all hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)] flex flex-col gap-3.5"
                      >
                        {/* Header & User identity */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-white font-['Chakra_Petch']">
                                👤 {user.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono uppercase font-bold">
                                ⏳ Pendente
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-mono">
                              <div className="text-slate-300">
                                📧 Email:{' '}
                                <span className="text-cyan-300 font-bold">{user.email || 'Não indicado'}</span>
                              </div>
                              <div className="text-slate-300">
                                👤 Utilizador: <span className="text-white font-bold">@{user.username}</span>
                              </div>
                              <div className="text-slate-300">
                                👨‍💼 Função pretendida:{' '}
                                <span className="text-amber-300 font-bold">{user.role || 'Treinador'}</span>
                              </div>
                              <div className="text-slate-400 text-[11px]">
                                📅 Data do registo:{' '}
                                <span className="text-slate-200">
                                  {new Date(user.createdAt).toLocaleString('pt-PT')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                openWhatsAppRegistrationRequest(
                                  user,
                                  state?.notificationSettings?.adminContactPhone,
                                  state?.myClubName
                                );
                                onShowToast('A abrir WhatsApp... 💬');
                              }}
                              className="p-1.5 px-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 text-xs transition-all flex items-center gap-1 cursor-pointer"
                              title="Contactar via WhatsApp"
                            >
                              <span>💬</span>
                              <span className="text-[10px] font-mono hidden sm:inline">WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                openEmailRegistrationRequest(
                                  user,
                                  state?.notificationSettings?.adminContactEmail || ADMIN_EMAIL,
                                  state?.myClubName
                                );
                                onShowToast('A abrir cliente de e-mail... 📧');
                              }}
                              className="p-1.5 px-2 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-xs transition-all flex items-center gap-1 cursor-pointer"
                              title="Contactar via E-mail"
                            >
                              <span>📧</span>
                              <span className="text-[10px] font-mono hidden sm:inline">Email</span>
                            </button>
                          </div>
                        </div>

                        {/* Authorization Settings Section */}
                        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 space-y-3">
                          {/* Role Selection */}
                          <div>
                            <label className="block text-[11px] font-mono text-cyan-300 font-bold mb-1">
                              🏷️ Função Técnica a Atribuir:
                            </label>
                            <select
                              value={currentSelectedRole}
                              onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [user.id]: e.target.value }))}
                              className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                            >
                              {AVAILABLE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Teams / Squads Access Selection */}
                          <div>
                            <label className="block text-[11px] font-mono text-cyan-300 font-bold mb-1.5">
                              🛡️ Equipas / Escalões a que terá acesso:
                            </label>

                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleTeamAccess('all')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border cursor-pointer ${
                                  isAllTeams
                                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_8px_rgba(0,210,255,0.4)]'
                                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500'
                                }`}
                              >
                                {isAllTeams ? '✓ Todas as Equipas (Acesso Total)' : 'Todas as Equipas'}
                              </button>

                              {clubTeams.map((t) => {
                                const isSelected = !isAllTeams && userTeams.includes(t.id);
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => toggleTeamAccess(t.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                                    }`}
                                  >
                                    {isSelected ? `✓ ${t.category || t.clubName}` : t.category || t.clubName}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                          <button
                            onClick={() => handleApprove(user)}
                            disabled={isProcessing}
                            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-98 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isProcessing ? 'A processar...' : '✅ Autorizar Acesso'}
                          </button>

                          <button
                            onClick={() => handleReject(user)}
                            disabled={isProcessing}
                            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 font-['Chakra_Petch'] font-bold text-xs uppercase hover:bg-red-900 hover:text-white active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Recusar pedido de acesso"
                          >
                            <span>❌</span>
                            <span>Negar / Recusar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: APPROVED COACHES */}
          {activeTab === 'approved' && (
            <div className="space-y-4">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                    👑
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider">
                      Administradores
                    </div>
                    <div className="text-sm font-bold text-white font-['Chakra_Petch']">
                      {adminUsers.length} Administrador{adminUsers.length === 1 ? '' : 'es'}
                    </div>
                    <div className="text-[10px] font-mono text-amber-200/70 truncate max-w-[140px]">{ADMIN_EMAIL}</div>
                  </div>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl shrink-0">
                    ⚽
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                      Treinadores Ativos
                    </div>
                    <div className="text-sm font-bold text-white font-['Chakra_Petch']">
                      {coachUsers.length} Treinador{coachUsers.length === 1 ? '' : 'es'}
                    </div>
                    <div className="text-[10px] font-mono text-cyan-200/70">Equipa Técnica em Campo</div>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
                    🛡️
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
                      Total de Acessos
                    </div>
                    <div className="text-sm font-bold text-white font-['Chakra_Petch']">
                      {approvedUsers.length} Autorizados
                    </div>
                    <div className="text-[10px] font-mono text-emerald-200/70">Base Nuvem Partilhada</div>
                  </div>
                </div>
              </div>

              {/* Strict Rule Notice */}
              <div className="bg-slate-950/80 border border-cyan-500/20 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 flex items-center gap-2">
                <span className="text-amber-400 font-bold">🔒 Gestão de Permissões:</span>
                <span>
                  O Administrador Principal é <strong>inviolável</strong> ({ADMIN_EMAIL}). Podem ser promovidos outros
                  Treinadores a Administrador com acesso total.
                </span>
              </div>

              {/* Section 1: Master Administrator Account */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-300 font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-1.5">
                  <span>👑</span>
                  <span>
                    Administrador{adminUsers.length === 1 ? ' do Clube (1)' : `es do Clube (${adminUsers.length})`}
                  </span>
                </div>

                {adminUsers.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id || user.username === currentUser?.username;
                  const isMasterAdmin = isStrictAdminEmail(user.email);
                  const isProcessing = processingId === user.id;
                  return (
                    <div
                      key={user.id}
                      className="bg-slate-950 border-2 border-amber-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-lg shrink-0">
                          👑
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white font-['Chakra_Petch']">{user.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-black">
                              {isMasterAdmin ? 'Administrador Principal' : 'Administrador'}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono">
                                A sua Sessão
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-cyan-300/80 mt-0.5">
                            {user.email || ADMIN_EMAIL} · Acesso Total e Gestão de Autorizações
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isMasterAdmin ? (
                          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1">
                            <span>🔒</span>
                            <span>Inviolável</span>
                          </span>
                        ) : (
                          isAdmin && (
                            <button
                              onClick={() => handleDemoteAdmin(user)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                              title="Remover Privilégios de Administrador"
                            >
                              {isProcessing ? '...' : '⛔ Remover Privilégios'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {isAdmin && coachUsers.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-dashed border-amber-500/30">
                  <div className="text-xs font-bold text-amber-300 font-['Chakra_Petch'] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>👑</span>
                    <span>Promover a Administrador</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {coachUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handlePromoteToAdmin(user)}
                        disabled={processingId === user.id}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-200 text-[11px] font-mono hover:bg-amber-950/60 transition-all disabled:opacity-50"
                        title={`Promover ${user.name} a Administrador`}
                      >
                        + {user.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Active Coaches & Technical Staff */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-cyan-300 font-['Chakra_Petch'] uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>⚽</span>
                    <span>Equipa Técnica & Treinadores Ativos ({coachUsers.length})</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                    {coachUsers.length === 2
                      ? '2 Treinadores Ativos'
                      : `${coachUsers.length} Registado${coachUsers.length === 1 ? '' : 's'}`}
                  </span>
                </div>

                {coachUsers.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400 font-mono">
                    Ainda não existem treinadores adicionais autorizados. Quando outros treinadores se registarem,
                    aprove-os na aba <strong>Pedidos Pendentes</strong>.
                  </div>
                ) : (
                  coachUsers.map((user) => {
                    const isCurrentUser = user.id === currentUser?.id || user.username === currentUser?.username;
                    const isProcessing = processingId === user.id;
                    const userTeams =
                      selectedTeams[user.id] !== undefined ? selectedTeams[user.id] : user.assignedTeams || [];
                    const isAllTeams = userTeams.includes('all');
                    const originalTeams = user.assignedTeams || [];
                    const hasTeamChanges =
                      selectedTeams[user.id] !== undefined &&
                      JSON.stringify([...selectedTeams[user.id]].sort()) !== JSON.stringify([...originalTeams].sort());

                    const toggleCoachTeam = (teamId: string) => {
                      setSelectedTeams((prev) => {
                        const current = prev[user.id] !== undefined ? prev[user.id] : user.assignedTeams || [];
                        if (teamId === 'all') {
                          return { ...prev, [user.id]: current.includes('all') ? [] : ['all'] };
                        }
                        let updated: string[];
                        if (current.includes('all')) {
                          updated = [teamId];
                        } else if (current.includes(teamId)) {
                          updated = current.filter((id) => id !== teamId);
                        } else {
                          updated = [...current, teamId];
                        }
                        return { ...prev, [user.id]: updated };
                      });
                    };

                    return (
                      <div
                        key={user.id}
                        className="bg-slate-950 border border-cyan-500/20 rounded-2xl p-4 flex flex-col gap-3 hover:border-cyan-500/40 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-lg shrink-0">
                              ⚽
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-white font-['Chakra_Petch']">{user.name}</span>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono">
                                    Você
                                  </span>
                                )}
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                                  ✓ Treinador Ativo
                                </span>
                              </div>
                              <div className="text-xs font-mono text-slate-400 mt-0.5">
                                @{user.username} {user.email ? `· ${user.email}` : ''}
                              </div>
                            </div>
                          </div>

                          {/* Role and Actions */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <select
                              value={user.role || 'Treinador Principal'}
                              onChange={(e) => handleChangeRole(user, e.target.value)}
                              disabled={!isAdmin || isProcessing}
                              className="bg-slate-900 border border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-400 disabled:opacity-60 cursor-pointer"
                            >
                              {AVAILABLE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleReject(user)}
                                  disabled={isProcessing}
                                  className="p-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 hover:bg-amber-900 text-xs transition-all cursor-pointer"
                                  title="Suspender Acesso"
                                >
                                  ⏸️
                                </button>
                                <button
                                  onClick={() => handleDelete(user)}
                                  disabled={isProcessing}
                                  className="p-1.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900 text-xs transition-all cursor-pointer"
                                  title="Eliminar Conta"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Team Access Badges / Controls */}
                        <div className="w-full pt-2.5 border-t border-slate-900 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-cyan-300 font-bold">
                              🛡️ Equipas Autorizadas:
                            </span>
                            {isAdmin && hasTeamChanges && (
                              <button
                                onClick={() => handleSaveAssignedTeams(user)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-bold text-[11px] uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer"
                              >
                                {isProcessing ? 'A guardar...' : '💾 Guardar Autorizações'}
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 items-center">
                            {isAdmin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => toggleCoachTeam('all')}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all border cursor-pointer ${
                                    isAllTeams
                                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_8px_rgba(0,210,255,0.4)]'
                                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                                  }`}
                                >
                                  {isAllTeams ? '✓ Todas as Equipas (Acesso Total)' : 'Todas as Equipas'}
                                </button>
                                {clubTeams.map((t) => {
                                  const isSelected = !isAllTeams && userTeams.includes(t.id);
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => toggleCoachTeam(t.id)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all border cursor-pointer ${
                                        isSelected
                                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                                      }`}
                                    >
                                      {isSelected ? `✓ ${t.category || t.clubName}` : t.category || t.clubName}
                                    </button>
                                  );
                                })}
                              </>
                            ) : userTeams.length === 0 ? (
                              <span className="text-[11px] text-amber-400 font-mono">⚠️ Nenhuma equipa atribuída</span>
                            ) : isAllTeams ? (
                              <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono">
                                Todas as Equipas (Acesso Total)
                              </span>
                            ) : (
                              userTeams.map((tid) => {
                                const t = clubTeams.find((x) => x.id === tid);
                                return (
                                  <span
                                    key={tid}
                                    className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono"
                                  >
                                    {t ? t.category || t.clubName : tid}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {rejectedUsers.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="text-xs font-bold text-slate-400 font-['Chakra_Petch'] uppercase mb-2">
                    Contas Suspensas / Recusadas ({rejectedUsers.length})
                  </div>
                  <div className="space-y-2">
                    {rejectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="bg-slate-950/60 border border-red-500/20 rounded-xl p-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-300">{user.name}</span>
                          <span className="text-slate-500 font-mono ml-2">(@{user.username})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(user)}
                            className="px-2 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 font-mono text-[10px] cursor-pointer"
                          >
                            Reautorizar
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1 rounded-lg bg-red-950 border border-red-500/40 text-red-300 hover:bg-red-900 text-[10px] cursor-pointer"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE NEW COACH DIRECTLY */}
          {activeTab === 'new_user' && (
            <form onSubmit={handleDirectCreateUser} className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">🛡️</span>
                <div>
                  <span className="font-bold text-emerald-300">Criação Direta de Conta pelo Administrador:</span> Pode
                  criar imediatamente o acesso de um treinador ou adjunto com palavra-passe definitiva. O utilizador
                  fica <strong>automaticamente autorizado</strong> e a sua sessão de Administrador permanece 100% ativa.
                </div>
              </div>

              <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-mono text-cyan-300 font-bold mb-1">
                    Nome Completo do Treinador: *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: João Pereira"
                    className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-cyan-300 font-bold mb-1">
                      Email ou Utilizador: *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="treinador@exemplo.com ou j.pereira"
                      className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-cyan-300 font-bold mb-1">
                      Palavra-passe Inicial: *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 font-bold mb-1">
                    Função Técnica / Cargo:
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 font-bold mb-1.5">
                    Equipas e Escalões com Permissão:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleNewUserTeam('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                        newAssignedTeams.includes('all')
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_8px_rgba(0,210,255,0.4)]'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {newAssignedTeams.includes('all') ? '✓ Todas as Equipas' : 'Todas as Equipas'}
                    </button>

                    {clubTeams.map((t) => {
                      const isSel = !newAssignedTeams.includes('all') && newAssignedTeams.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleNewUserTeam(t.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                            isSel
                              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {isSel ? `✓ ${t.category || t.clubName}` : t.category || t.clubName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-98 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isCreatingUser ? (
                      <>
                        <span className="animate-spin text-base">🔄</span>
                        <span>A Criar Conta no Firebase Auth...</span>
                      </>
                    ) : (
                      <>
                        <span>✅</span>
                        <span>Criar e Autorizar Treinador</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 4: CLOUD & MULTI-DEVICE STATUS */}
          {activeTab === 'cloud' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 border border-cyan-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-['Chakra_Petch']">
                  <span>☁️ Base de Dados Partilhada do Clube</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Todos os treinadores autorizados trabalham na mesma base de dados centralizada do clube. As alterações
                  feitas em qualquer dispositivo (plantel, convocatórias, treinos, presenças, relatórios de jogos e
                  prancha tática) são sincronizadas em tempo real.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 font-mono text-[11px]">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Segurança:</span>
                    <span className="text-emerald-400 font-bold">✓ Autorização Obrigatória por {ADMIN_EMAIL}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Sincronização:</span>
                    <span className="text-cyan-300 font-bold">✓ Firestore Cloud em Tempo Real</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-cyan-500/20 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-white font-['Chakra_Petch']">Forçar Sincronização Master</div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Garante que todos os escalões locais atuais são salvaguardados como a versão principal na Nuvem.
                  </p>
                </div>
                <button
                  onClick={handleForceMasterSync}
                  disabled={processingId === 'sync_master'}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-extrabold uppercase text-xs hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,210,255,0.3)] shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {processingId === 'sync_master' ? 'A Sincronizar...' : 'Forçar Sync Master 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-cyan-500/20 bg-slate-950/95 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_rgba(0,0,0,0.4)]">
          <div>
            Administrador Autorizado: <strong className="text-cyan-300">{ADMIN_EMAIL}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersModal;
