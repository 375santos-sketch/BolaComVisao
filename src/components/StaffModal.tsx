import React, { useState } from 'react';
import { StaffMember } from '../types';
import { uid } from '../lib/utils';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: StaffMember | null;
  onSave: (staff: StaffMember) => void;
  onDelete?: (id: string) => void;
  onShowToast: (msg: string) => void;
}

const PRESET_ROLES = [
  {
    label: 'Treinador Principal',
    icon: '👔',
    color: 'from-amber-400 to-amber-600',
    badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/50'
  },
  {
    label: 'Treinador Adjunto',
    icon: '📋',
    color: 'from-cyan-400 to-blue-500',
    badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
  },
  {
    label: 'Treinador de Guarda-Redes',
    icon: '🧤',
    color: 'from-emerald-400 to-teal-500',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
  },
  {
    label: 'Diretor',
    icon: '💼',
    color: 'from-purple-400 to-indigo-500',
    badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-500/50'
  }
];

const StaffModalForm: React.FC<Omit<StaffModalProps, 'isOpen'>> = ({
  onClose,
  staffToEdit,
  onSave,
  onDelete,
  onShowToast
}) => {
  const isPreset = staffToEdit?.role ? PRESET_ROLES.some((r) => r.label === staffToEdit.role) : true;
  const [name, setName] = useState(staffToEdit?.name || '');
  const [role, setRole] = useState(staffToEdit ? (isPreset ? staffToEdit.role : 'Outro') : 'Treinador Principal');
  const [customRole, setCustomRole] = useState(staffToEdit && !isPreset ? staffToEdit.role || '' : '');
  const [birthDate, setBirthDate] = useState(staffToEdit?.birthDate || '');
  const [bio, setBio] = useState(staffToEdit?.bio || '');
  const [phone, setPhone] = useState(staffToEdit?.phone || '');
  const [email, setEmail] = useState(staffToEdit?.email || '');
  const [photoUrl, setPhotoUrl] = useState(staffToEdit?.photoUrl || '');
  const [photoInputMode, setPhotoInputMode] = useState<'upload' | 'url'>('upload');

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('A fotografia deve ser inferior a 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
        onShowToast('Fotografia carregada com sucesso! 📷');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      onShowToast('Por favor insere o nome do elemento.');
      return;
    }

    const finalRole = role === 'Outro' ? customRole.trim() || 'Equipa Técnica' : role;

    const staffData: StaffMember = {
      id: staffToEdit ? staffToEdit.id : uid(),
      name: name.trim(),
      role: finalRole,
      birthDate: birthDate.trim() || undefined,
      bio: bio.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      createdAt: staffToEdit?.createdAt || new Date().toISOString()
    };

    onSave(staffData);
    onClose();
  };

  const getRoleIcon = (roleName: string) => {
    const found = PRESET_ROLES.find((r) => r.label === roleName);
    return found ? found.icon : '👔';
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border-t sm:border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-[0_0_50px_rgba(0,210,255,0.3)] text-left overflow-hidden">
        {/* Modal Header - Fixed at Top */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 border-b border-cyan-500/20 bg-slate-900/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-lg shadow-sm shrink-0">
              {getRoleIcon(role)}
            </div>
            <div className="min-w-0">
              <h3 className="font-['Chakra_Petch'] font-bold text-sm sm:text-base text-white uppercase tracking-wider truncate">
                {staffToEdit ? 'Editar Elemento Técnico' : 'Adicionar Elemento Técnico'}
              </h3>
              <p className="text-[11px] font-mono text-cyan-300/80 truncate">Equipa Técnica do Clube</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-sm font-bold active:scale-95"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          id="staff-modal-form"
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin"
        >
          {/* Photo Section with Live Preview & File Upload */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-cyan-500/40 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(0,210,255,0.15)]">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-3xl text-slate-500">👔</div>
                )}
              </div>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  title="Remover Fotografia"
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-md hover:bg-red-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex-1 w-full text-left space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-semibold text-slate-300">Fotografia do Elemento</label>
                <div className="flex gap-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setPhotoInputMode('upload')}
                    className={`px-2 py-0.5 rounded ${photoInputMode === 'upload' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}
                  >
                    Ficheiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoInputMode('url')}
                    className={`px-2 py-0.5 rounded ${photoInputMode === 'url' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}
                  >
                    Link Web
                  </button>
                </div>
              </div>

              {photoInputMode === 'upload' ? (
                <div>
                  <label className="block w-full text-center py-2 px-3 rounded-lg border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 text-xs font-mono cursor-pointer transition-colors">
                    <span>📷 Escolher Imagem (Max 5MB)</span>
                    <input type="file" accept="image/*" onChange={handlePhotoFileUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <input
                  type="url"
                  placeholder="https://exemplo.com/foto.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              )}
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
              Nome Completo <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: João Pereira"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Role / Cargo Quick Selector */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
              Cargo / Função <span className="text-cyan-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {PRESET_ROLES.map((r) => {
                const isSelected = role === r.label;
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => setRole(r.label)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-cyan-950 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,210,255,0.2)] font-bold'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{r.icon}</span>
                    <span className="text-xs truncate">{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom role toggle if other is selected */}
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setRole(role === 'Outro' ? 'Treinador Principal' : 'Outro')}
                className={`text-[11px] font-mono underline ${role === 'Outro' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-300'}`}
              >
                {role === 'Outro' ? '✓ Definir cargo personalizado' : '+ Outro cargo/função'}
              </button>
              {role === 'Outro' && (
                <input
                  type="text"
                  placeholder="Ex: Fisioterapeuta, Preparador Físico, etc."
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full mt-1.5 bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              )}
            </div>
          </div>

          {/* Birth Date Field */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
              🎂 Data de Nascimento <span className="text-slate-500 font-normal">(para alertas automáticos)</span>
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-slate-950 border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors font-mono"
            />
          </div>

          {/* Bio / Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-mono font-semibold text-slate-300">
                Breve Descrição / Biografia <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">{bio.length}/300 carateres</span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              placeholder="Ex: Licenciado em Ciências do Desporto, Grau II UEFA. Experiência de 5 anos na formação."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-slate-950 border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Contacts (Phone & Email) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Telefone <span className="text-slate-600">(opcional)</span>
              </label>
              <input
                type="tel"
                placeholder="Ex: 912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Email <span className="text-slate-600">(opcional)</span>
              </label>
              <input
                type="email"
                placeholder="Ex: treinador@clube.pt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
              />
            </div>
          </div>
        </form>

        {/* ALWAYS VISIBLE PINNED FOOTER - Guaranteed above any mobile bars */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/98 backdrop-blur-md shrink-0 flex items-center gap-2 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <button
            type="submit"
            form="staff-modal-form"
            className="flex-1 py-3 px-4 min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(0,210,255,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{staffToEdit ? '💾' : '➕'}</span>
            <span>{staffToEdit ? 'Guardar Alterações' : 'Adicionar à Equipa Técnica'}</span>
          </button>

          {staffToEdit && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(staffToEdit.id)}
              className="px-3.5 py-3 min-h-[48px] rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 hover:bg-red-900/70 font-mono text-xs font-bold transition-all flex items-center justify-center active:scale-95"
              title="Eliminar elemento"
            >
              🗑️
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition-colors active:scale-95 flex items-center justify-center"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export const StaffModal: React.FC<StaffModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <StaffModalForm {...props} key={props.staffToEdit?.id || 'new'} />;
};
