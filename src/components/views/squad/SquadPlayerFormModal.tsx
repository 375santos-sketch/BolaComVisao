import React from 'react';
import { PlayerStatus, DominantFoot } from '../../../types';
import { POSITION_OPTIONS } from './types';

interface SquadPlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPlayerId: string | null;
  formName: string;
  setFormName: (val: string) => void;
  formNumber: string;
  setFormNumber: (val: string) => void;
  formPosition: string;
  setFormPosition: (val: string) => void;
  formBirthDate: string;
  setFormBirthDate: (val: string) => void;
  formDominantFoot: DominantFoot;
  setFormDominantFoot: (val: DominantFoot) => void;
  formHeight: string;
  setFormHeight: (val: string) => void;
  formWeight: string;
  setFormWeight: (val: string) => void;
  formPhone: string;
  setFormPhone: (val: string) => void;
  formEmail: string;
  setFormEmail: (val: string) => void;
  formEmergencyContact: string;
  setFormEmergencyContact: (val: string) => void;
  formStatus: PlayerStatus;
  setFormStatus: (val: PlayerStatus) => void;
  formStatusUntil?: string;
  setFormStatusUntil?: (val: string) => void;
  formStatusNote?: string;
  setFormStatusNote?: (val: string) => void;
  formPhotoUrl: string;
  setFormPhotoUrl: (val: string) => void;
  onPhotoFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSavePlayer: (e: React.FormEvent) => void;
}

export const SquadPlayerFormModal: React.FC<SquadPlayerFormModalProps> = ({
  isOpen,
  onClose,
  editingPlayerId,
  formName,
  setFormName,
  formNumber,
  setFormNumber,
  formPosition,
  setFormPosition,
  formBirthDate,
  setFormBirthDate,
  formDominantFoot,
  setFormDominantFoot,
  formHeight,
  setFormHeight,
  formWeight,
  setFormWeight,
  formPhone,
  setFormPhone,
  formEmail,
  setFormEmail,
  formEmergencyContact,
  setFormEmergencyContact,
  formStatus,
  setFormStatus,
  formStatusUntil = '',
  setFormStatusUntil,
  formStatusNote = '',
  setFormStatusNote,
  formPhotoUrl,
  setFormPhotoUrl,
  onPhotoFileUpload,
  onSavePlayer
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border-t sm:border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,210,255,0.3)] max-h-[92dvh] sm:max-h-[88dvh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-3 shrink-0">
          <h3 className="text-base sm:text-lg font-bold font-['Chakra_Petch'] uppercase text-white flex items-center gap-2">
            <span>{editingPlayerId ? '✏️ Editar Ficha de Atleta' : '➕ Novo Atleta do Plantel'}</span>
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm active:scale-95 transition-colors"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSavePlayer} id="player-form" className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Form Fields */}
          <div className="overflow-y-auto pr-1.5 space-y-4 flex-1 min-h-0 scrollbar-thin">
            {/* Photo Upload Section */}
            <div className="bg-slate-950/80 border border-cyan-500/20 rounded-2xl p-3 text-center">
              <label className="block text-xs font-mono text-cyan-300 mb-2">📷 Fotografia do Jogador</label>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {/* Photo Preview */}
                <div className="relative">
                  {formPhotoUrl ? (
                    <img
                      src={formPhotoUrl}
                      alt="Preview"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-dashed border-cyan-500/40 flex items-center justify-center text-2xl text-slate-500 font-mono">
                      👤
                    </div>
                  )}
                  {formPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormPhotoUrl('')}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                      title="Remover Foto"
                    >
                      ✖
                    </button>
                  )}
                </div>

                {/* Upload Actions */}
                <div className="space-y-2 text-left w-full sm:w-auto flex-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-mono text-xs font-bold hover:bg-cyan-500/30 w-full justify-center">
                    <span>📁 Ficheiro do Dispositivo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={onPhotoFileUpload} />
                  </label>

                  <input
                    type="text"
                    placeholder="ou cole o URL da foto..."
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 1: DADOS PRINCIPAIS */}
            <div className="space-y-3">
              <div className="text-xs font-['Chakra_Petch'] font-bold uppercase text-cyan-400 tracking-wider">
                1. Identificação & Posicionamento
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Nome Completo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cristiano Ronaldo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Nº da Camisola</label>
                  <input
                    type="number"
                    placeholder="Ex: 7"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Situação Desportiva</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as PlayerStatus)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value="disponivel">🟢 Disponível</option>
                    <option value="lesionado">🏥 Lesionado</option>
                    <option value="suspenso">🟨 Suspenso</option>
                    <option value="inativo">⏸️ Inativo</option>
                  </select>
                </div>
              </div>

              {(formStatus === 'lesionado' || formStatus === 'suspenso') && setFormStatusUntil && setFormStatusNote && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                  <div>
                    <label className="block text-xs font-mono text-amber-200 mb-1" htmlFor="player-status-until">
                      Regressa a
                    </label>
                    <input
                      id="player-status-until"
                      type="date"
                      value={formStatusUntil}
                      onChange={(e) => setFormStatusUntil(e.target.value)}
                      className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-amber-200 mb-1" htmlFor="player-status-note">
                      Motivo
                    </label>
                    <input
                      id="player-status-note"
                      type="text"
                      maxLength={60}
                      placeholder={formStatus === 'lesionado' ? 'Ex: entorse' : 'Ex: 2 jogos'}
                      value={formStatusNote}
                      onChange={(e) => setFormStatusNote(e.target.value)}
                      className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <p className="col-span-2 text-[10px] text-amber-200/80">
                    Fica indisponível na Convocatória até esta data; a partir dela volta a estar disponível sozinho.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Posição em Campo</label>
                <select
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="">Selecione a posição principal...</option>
                  {POSITION_OPTIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTION 2: PERFIL FÍSICO */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="text-xs font-['Chakra_Petch'] font-bold uppercase text-cyan-400 tracking-wider">
                2. Perfil Físico & Biometria
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Data Nascimento</label>
                  <input
                    type="date"
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Pé Dominante</label>
                  <select
                    value={formDominantFoot}
                    onChange={(e) => setFormDominantFoot(e.target.value as DominantFoot)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value="Direito">Direito (Destro)</option>
                    <option value="Esquerdo">Esquerdo (Esquerdino)</option>
                    <option value="Ambidestro">Ambidestro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Altura</label>
                  <input
                    type="text"
                    placeholder="Ex: 1.82 m"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Peso</label>
                  <input
                    type="text"
                    placeholder="Ex: 75 kg"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: CONTACTOS */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="text-xs font-['Chakra_Petch'] font-bold uppercase text-cyan-400 tracking-wider">
                3. Contactos & Encarregados de Educação
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Telefone</label>
                  <input
                    type="tel"
                    placeholder="Ex: 912 345 678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="Ex: jogador@email.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Contacto Emergência / Encarregado Educação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pai (Manuel Silva) - 961 234 567"
                  value={formEmergencyContact}
                  onChange={(e) => setFormEmergencyContact(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Pinned Action Buttons Footer */}
          <div className="flex gap-2 pt-3 mt-2 border-t border-slate-800 shrink-0 bg-slate-900 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_rgba(0,0,0,0.4)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 min-h-[48px] rounded-xl bg-slate-950 border border-slate-700 text-slate-300 font-mono text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex-1 py-3 min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              {editingPlayerId ? 'Guardar Alterações 💾' : 'Adicionar Atleta 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
