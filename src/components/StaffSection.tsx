import React, { useState } from 'react';
import { AppState, StaffMember } from '../types';
import { StaffModal } from './StaffModal';
import { defaultSeason } from '../lib/utils';

interface StaffSectionProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast: (msg: string) => void;
}

const ROLE_CONFIG: Record<string, { icon: string; badgeClass: string; order: number }> = {
  'Treinador Principal': {
    icon: '👔',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    order: 1
  },
  'Treinador Adjunto': {
    icon: '📋',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,210,255,0.2)]',
    order: 2
  },
  'Treinador de Guarda-Redes': {
    icon: '🧤',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    order: 3
  },
  Diretor: {
    icon: '💼',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
    order: 4
  }
};

export const StaffSection: React.FC<StaffSectionProps> = ({ state, onUpdateState, onShowConfirm, onShowToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('todos');

  const staffMembers: StaffMember[] = state.staffMembers || [];

  // Sort staff members logically by hierarchy
  const sortedStaff = [...staffMembers].sort((a, b) => {
    const orderA = ROLE_CONFIG[a.role]?.order || 99;
    const orderB = ROLE_CONFIG[b.role]?.order || 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || '').localeCompare(b.name || '', 'pt-PT');
  });

  const filteredStaff = sortedStaff.filter((s) => {
    if (roleFilter === 'todos') return true;
    return s.role === roleFilter;
  });

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsModalOpen(true);
  };

  const handleSaveStaff = (savedMember: StaffMember) => {
    const existingIndex = staffMembers.findIndex((s) => s.id === savedMember.id);
    let updatedStaff: StaffMember[];

    if (existingIndex >= 0) {
      updatedStaff = staffMembers.map((s) => (s.id === savedMember.id ? savedMember : s));
      onShowToast(`Elemento "${savedMember.name}" atualizado com sucesso! ✓`);
    } else {
      updatedStaff = [...staffMembers, savedMember];
      onShowToast(`"${savedMember.name}" adicionado à equipa técnica! 🎉`);
    }

    onUpdateState({ staffMembers: updatedStaff });
  };

  const handleDeleteStaff = (id: string) => {
    const target = staffMembers.find((s) => s.id === id);
    const targetName = target ? target.name : 'este elemento';

    onShowConfirm(`Tens a certeza que queres remover "${targetName}" da equipa técnica?`, () => {
      const updatedStaff = staffMembers.filter((s) => s.id !== id);
      onUpdateState({ staffMembers: updatedStaff });
      setIsModalOpen(false);
      onShowToast(`"${targetName}" removido da equipa técnica.`);
    });
  };

  const getRoleBadge = (roleName: string) => {
    const conf = ROLE_CONFIG[roleName] || {
      icon: '👔',
      badgeClass: 'bg-slate-900 text-slate-300 border-slate-700',
      order: 99
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${conf.badgeClass}`}
      >
        <span>{conf.icon}</span>
        <span>{roleName}</span>
      </span>
    );
  };

  return (
    <div className="staff-section space-y-4 animate-fade-in text-left">
      {/* Top Banner with Actions */}
      <div className="ui-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-base sm:text-lg font-bold font-['Chakra_Petch'] uppercase text-white flex items-center gap-2">
                <span>👔 Equipa Técnica</span>
              </h2>
              <span className="text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full font-bold">
                {staffMembers.length} {staffMembers.length === 1 ? 'Elemento' : 'Elementos'}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Gestão da equipa técnica e liderança associada ao escalão {state.category || 'Sub-19'} (
              {state.season || defaultSeason()}).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>+ Adicionar Elemento</span>
            </button>
          </div>
        </div>

        {/* Quick Role Filters */}
        {staffMembers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-3 mt-3 border-t border-cyan-500/20">
            <span className="text-[11px] font-mono text-slate-400 mr-1">Filtrar:</span>
            <button
              onClick={() => setRoleFilter('todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                roleFilter === 'todos'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Todos ({staffMembers.length})
            </button>
            {Object.keys(ROLE_CONFIG).map((rName) => {
              const count = staffMembers.filter((s) => s.role === rName).length;
              if (count === 0) return null;
              return (
                <button
                  key={rName}
                  onClick={() => setRoleFilter(rName)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
                    roleFilter === rName
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{ROLE_CONFIG[rName].icon}</span>
                  <span>{rName}</span>
                  <span className="text-[10px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff Cards Grid */}
      {filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStaff.map((staff) => {
            const roleConf = ROLE_CONFIG[staff.role];

            return (
              <div
                key={staff.id}
                className="ui-card p-4 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden"
              >
                {/* Background ambient gradient glow */}
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />

                <div>
                  {/* Top: Avatar + Role Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border-2 border-cyan-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                        {staff.photoUrl ? (
                          <img
                            src={staff.photoUrl}
                            alt={staff.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-2xl">{roleConf ? roleConf.icon : '👔'}</div>
                        )}
                      </div>

                      <div>
                        <h3 className="font-['Chakra_Petch'] font-bold text-base text-white group-hover:text-cyan-300 transition-colors leading-tight">
                          {staff.name}
                        </h3>
                        <div className="mt-1">{getRoleBadge(staff.role)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Biography / Description */}
                  {staff.bio && (
                    <p className="text-xs font-mono text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 mb-3 leading-relaxed">
                      {staff.bio}
                    </p>
                  )}

                  {/* Contacts if available */}
                  {(staff.phone || staff.email) && (
                    <div className="ui-inset space-y-1.5 text-[11px] font-mono text-slate-400 p-2 mb-3">
                      {staff.phone && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span>📞</span>
                          <a href={`tel:${staff.phone}`} className="hover:text-cyan-300 transition-colors">
                            {staff.phone}
                          </a>
                        </div>
                      )}
                      {staff.email && (
                        <div className="flex items-center gap-1.5 text-slate-300 truncate">
                          <span>✉️</span>
                          <a href={`mailto:${staff.email}`} className="hover:text-cyan-300 transition-colors truncate">
                            {staff.email}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 mt-1">
                  <span className="text-[10px] font-mono text-cyan-400/60">BolaComVisão Staff</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(staff)}
                      className="ui-btn ui-btn-soft px-2.5 py-1 text-xs flex items-center gap-1"
                      title="Editar elemento"
                    >
                      <span>✏️</span>
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(staff.id)}
                      className="ui-btn ui-btn-secondary p-1 px-2 text-xs"
                      title="Eliminar elemento"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="ui-card p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-3xl flex items-center justify-center mx-auto mb-3 text-cyan-300">
            👔
          </div>
          <h3 className="font-['Chakra_Petch'] font-bold text-base text-white uppercase tracking-wider mb-1">
            Nenhum Elemento Registado
          </h3>
          <p className="text-xs font-mono text-slate-400 mb-4 max-w-sm mx-auto">
            Adiciona os elementos da equipa técnica (Treinador Principal, Adjunto, Guarda-Redes, Diretor) para organizar
            a liderança do escalão.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            <span>+ Adicionar Elemento Técnico</span>
          </button>
        </div>
      )}

      {/* Staff Modal */}
      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffToEdit={editingStaff}
        onSave={handleSaveStaff}
        onDelete={handleDeleteStaff}
        onShowToast={onShowToast}
      />
    </div>
  );
};
