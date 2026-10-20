import React, { useState } from 'react';
import { AppState, ClubSeason } from '../types';
import { uid } from '../lib/utils';
import { recordAuditLog } from '../lib/auditEngine';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface SeasonSelectorModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const SeasonSelectorModal: React.FC<SeasonSelectorModalProps> = ({
  state,
  onUpdateState,
  onClose,
  onShowToast
}) => {
  const [newSeasonName, setNewSeasonName] = useState<string>('');
  const [newSeasonStart] = useState<string>('');
  const [newSeasonEnd] = useState<string>('');

  const currentSeasonName = state.season || '2025/2026';
  const seasons: ClubSeason[] =
    state.seasons && state.seasons.length > 0
      ? state.seasons
      : [
          { id: 'season_2526', name: '2025/2026', startDate: '2025-08-01', endDate: '2026-06-30', isCurrent: true },
          { id: 'season_2425', name: '2024/2025', startDate: '2024-08-01', endDate: '2025-06-30', isCurrent: false },
          { id: 'season_2627', name: '2026/2027', startDate: '2026-08-01', endDate: '2027-06-30', isCurrent: false }
        ];

  const handleSelectSeason = (seasonName: string) => {
    const updatedSeasons = seasons.map((s) => ({
      ...s,
      isCurrent: s.name === seasonName
    }));

    onUpdateState({
      season: seasonName,
      seasons: updatedSeasons
    });

    recordAuditLog(state.currentUser, 'season_change', 'epoca', `Alterou a época ativa para ${seasonName}`);

    if (onShowToast) onShowToast(`Época alterada para ${seasonName} 📅`);
    onClose();
  };

  const handleCreateSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;

    if (seasons.some((s) => s.name.toLowerCase() === newSeasonName.trim().toLowerCase())) {
      if (onShowToast) onShowToast('Já existe uma época com esta designação.');
      return;
    }

    const newSeason: ClubSeason = {
      id: 'season_' + uid(),
      name: newSeasonName.trim(),
      startDate: newSeasonStart || `${new Date().getFullYear()}-08-01`,
      endDate: newSeasonEnd || `${new Date().getFullYear() + 1}-06-30`,
      isCurrent: false
    };

    const updated = [newSeason, ...seasons];
    onUpdateState({ seasons: updated });
    setNewSeasonName('');

    recordAuditLog(state.currentUser, 'create', 'epoca', `Criou nova época desportiva: ${newSeason.name}`);

    if (onShowToast) onShowToast(`Época ${newSeason.name} adicionada!`);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="w-full max-w-lg bg-slate-950 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88dvh] text-left">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xl shrink-0">
              📅
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-['Chakra_Petch'] uppercase tracking-wider text-white">
                Gestão de Épocas Desportivas
              </h3>
              <p className="text-xs font-mono text-slate-400">Preserve o histórico desportivo e alterne entre épocas</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer active:scale-95 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 font-mono text-xs flex-1 scrollbar-thin">
          {/* List of Seasons */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold font-['Chakra_Petch'] uppercase text-slate-300">Épocas Registadas</h4>
            {seasons.map((s) => {
              const isSelected = s.name === currentSeasonName;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSeason(s.name)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{isSelected ? '⭐' : '📁'}</span>
                    <div>
                      <div className="font-bold font-['Chakra_Petch'] text-sm uppercase flex items-center gap-2">
                        <span>Época {s.name}</span>
                        {isSelected && (
                          <Badge variant="cyan" size="xs">
                            Ativa
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {s.startDate} até {s.endDate}
                      </div>
                    </div>
                  </div>

                  <span className="text-cyan-400 font-bold">{isSelected ? '✓ Selecionada' : 'Ativar →'}</span>
                </div>
              );
            })}
          </div>

          {/* Add New Season Form */}
          <form
            onSubmit={handleCreateSeason}
            className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3"
          >
            <h4 className="text-xs font-bold font-['Chakra_Petch'] uppercase text-slate-300">Criar Nova Época</h4>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Designação da Época (ex: 2026/2027) *</label>
              <input
                type="text"
                required
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="2026/2027"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" size="xs" icon={<span>➕</span>}>
                Adicionar Época
              </Button>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/95 shrink-0 flex justify-end pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_rgba(0,0,0,0.4)]">
          <Button variant="secondary" size="sm" onClick={onClose} className="min-h-[44px]">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SeasonSelectorModal;
