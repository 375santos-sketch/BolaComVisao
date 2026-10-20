import React, { useState } from 'react';
import { AppState, StaffMember } from '../types';
import { StaffModal } from './StaffModal';
import { defaultSeason } from '../lib/utils';

interface StaffHighlightSectionProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigateToStaffSection?: () => void;
  onShowToast: (msg: string) => void;
}

const ROLE_BADGES: Record<string, { icon: string; badgeClass: string; order: number }> = {
  'Treinador Principal': {
    icon: '👔',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
    order: 1
  },
  'Treinador Adjunto': {
    icon: '📋',
    badgeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(0,210,255,0.25)]',
    order: 2
  },
  'Treinador de Guarda-Redes': {
    icon: '🧤',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]',
    order: 3
  },
  Diretor: {
    icon: '💼',
    badgeClass: 'bg-purple-950/90 text-purple-300 border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.25)]',
    order: 4
  }
};

export const StaffHighlightSection: React.FC<StaffHighlightSectionProps> = ({
  state,
  onUpdateState,
  onNavigateToStaffSection,
  onShowToast
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);

  const staffMembers: StaffMember[] = state.staffMembers || [];

  const sortedStaff = [...staffMembers].sort((a, b) => {
    const orderA = ROLE_BADGES[a.role]?.order || 99;
    const orderB = ROLE_BADGES[b.role]?.order || 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || '').localeCompare(b.name || '', 'pt-PT');
  });

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

  const getRoleIcon = (roleName: string) => {
    return ROLE_BADGES[roleName]?.icon || '👔';
  };

  const getRoleBadgeClass = (roleName: string) => {
    return ROLE_BADGES[roleName]?.badgeClass || 'bg-slate-900 text-slate-300 border-slate-700';
  };

  return (
    <div className="mt-8 pt-6 border-t-2 border-cyan-500/30 text-left">
      {/* Highlight Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_15px_rgba(0,210,255,0.4)] text-lg">
            👔
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black font-['Chakra_Petch'] uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
              EQUIPA TÉCNICA
            </h2>
            <div className="text-[11px] font-mono text-cyan-400/80">
              Quadro Técnico & Liderança • {state.category || 'Sub-19'} {state.season || defaultSeason()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToStaffSection && (
            <button
              onClick={onNavigateToStaffSection}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-mono text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <span>Gerir Equipa Técnica</span>
              <span>➔</span>
            </button>
          )}

          <button
            onClick={() => {
              setStaffToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase shadow-[0_0_12px_rgba(0,210,255,0.3)] hover:brightness-110 active:scale-95 transition-all"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {/* Staff Cards Highlight Display */}
      {sortedStaff.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedStaff.map((staff) => (
            <div
              key={staff.id}
              onClick={() => {
                setStaffToEdit(staff);
                setIsModalOpen(true);
              }}
              className="bg-slate-950/90 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-3.5 flex items-center gap-3 transition-all hover:shadow-[0_0_20px_rgba(0,210,255,0.2)] hover:bg-slate-900 cursor-pointer group relative overflow-hidden"
            >
              {/* Photo Avatar */}
              <div className="relative w-14 h-14 rounded-xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:border-cyan-300 transition-colors">
                {staff.photoUrl ? (
                  <img
                    src={staff.photoUrl}
                    alt={staff.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-2xl">{getRoleIcon(staff.role)}</span>
                )}
              </div>

              {/* Name & Role */}
              <div className="min-w-0 flex-1">
                <h4 className="font-['Chakra_Petch'] font-bold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                  {staff.name}
                </h4>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border truncate max-w-full ${getRoleBadgeClass(staff.role)}`}
                  >
                    <span>{getRoleIcon(staff.role)}</span>
                    <span className="truncate">{staff.role}</span>
                  </span>
                </div>
                {staff.bio && <p className="text-[10px] font-mono text-slate-400 truncate mt-1">{staff.bio}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950/70 border border-dashed border-cyan-500/30 rounded-2xl p-5 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-left">
            <span className="text-2xl">👔</span>
            <div>
              <p className="text-xs font-bold text-white font-['Chakra_Petch'] uppercase">
                Ainda não foram inseridos elementos na Equipa Técnica
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                Regista o Treinador Principal, Treinador Adjunto, Treinador de Guarda-Redes e Diretor.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStaffToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase shadow-[0_0_10px_rgba(0,210,255,0.3)] hover:brightness-110 active:scale-95 transition-all shrink-0"
          >
            + Adicionar Elemento
          </button>
        </div>
      )}

      {/* Staff Modal */}
      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffToEdit={staffToEdit}
        onSave={handleSaveStaff}
        onDelete={(id) => {
          const updatedStaff = staffMembers.filter((s) => s.id !== id);
          onUpdateState({ staffMembers: updatedStaff });
          setIsModalOpen(false);
          onShowToast('Elemento removido da equipa técnica.');
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
