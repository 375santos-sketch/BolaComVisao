import React from 'react';
import { AppState } from '../types';
import { isAppAdmin } from '../services/cloudAuthService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import logoImg from '../assets/images/bolacomvisao_logo_1786622535530.jpg';
import { defaultSeason } from '../lib/utils';

interface MoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onNavigate: (tab: any) => void;
  onOpenSettings: () => void;
  onOpenDatabase: () => void;
  onOpenAdminUsers?: () => void;
  onOpenInviteStaff?: () => void;
  onOpenSeasons?: () => void;
  pendingUsersCount?: number;
  onLogout?: () => void;
}

export const MoreDrawer: React.FC<MoreDrawerProps> = ({
  isOpen,
  onClose,
  state,
  onNavigate,
  onOpenSettings,
  onOpenDatabase,
  onOpenAdminUsers,
  onOpenInviteStaff,
  onOpenSeasons,
  pendingUsersCount = 0,
  onLogout
}) => {
  if (!isOpen) return null;

  const isAdmin = isAppAdmin(state.currentUser);

  const handleAction = (cb: () => void) => {
    onClose();
    cb();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-slate-950 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 text-left flex flex-col max-h-[85vh] overflow-y-auto animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <img
              src={logoImg}
              alt="BolaComVisão"
              className="w-9 h-9 rounded-xl object-cover border border-cyan-500/40"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="text-sm font-bold font-['Chakra_Petch'] uppercase text-white">Gestão & Definições</h3>
              <p className="text-[11px] font-mono text-slate-400">
                {state.myClubName || 'BolaComVisão'} · {state.category || 'Sub-19'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Menu Options Grid */}
        <div className="py-3 space-y-1.5 font-mono text-xs">
          {/* Análise dos Jogos (Dashboard Estatístico) */}
          <button
            type="button"
            onClick={() => handleAction(() => onNavigate('analise_jogos'))}
            className="w-full p-3 rounded-xl bg-gradient-to-r from-cyan-950/90 to-blue-950/90 hover:from-cyan-900/90 hover:to-blue-900/90 border border-cyan-400/80 flex items-center justify-between gap-3 transition-all text-left shadow-lg group"
            id="more-drawer-analise-jogos-btn"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-base group-hover:scale-110 transition-transform">
                📊
              </span>
              <div>
                <div className="font-bold text-white font-['Chakra_Petch'] uppercase flex items-center gap-1.5 text-xs sm:text-sm">
                  <span>Análise dos Jogos</span>
                  <Badge variant="cyan" size="xs">
                    ESTATÍSTICAS
                  </Badge>
                </div>
                <div className="text-[11px] text-cyan-200/90 font-sans">
                  Gráficos, períodos de golo, confronto direto e exportação PDF/Excel
                </div>
              </div>
            </div>
            <span className="text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">➔</span>
          </button>

          {/* Trocar de Equipa */}
          <button
            type="button"
            onClick={() => handleAction(() => onNavigate('teams'))}
            className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-3 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-base">
                🔄
              </span>
              <div>
                <div className="font-bold text-white font-['Chakra_Petch'] uppercase">Trocar de Equipa</div>
                <div className="text-[11px] text-slate-400">Alternar entre escalões ou gerir equipas do clube</div>
              </div>
            </div>
            <span className="text-slate-400">➔</span>
          </button>

          {/* Gerir Épocas Desportivas */}
          {onOpenSeasons && (
            <button
              type="button"
              onClick={() => handleAction(onOpenSeasons)}
              className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-3 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-base">
                  📅
                </span>
                <div>
                  <div className="font-bold text-white font-['Chakra_Petch'] uppercase flex items-center gap-1.5">
                    <span>Épocas Desportivas</span>
                    <Badge variant="slate" size="xs">
                      {state.season || defaultSeason()}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400">Histórico multi-época sem perda de dados</div>
                </div>
              </div>
              <span className="text-slate-400">➔</span>
            </button>
          )}

          {/* Convidar Treinador / Staff */}
          {onOpenInviteStaff && (
            <button
              type="button"
              onClick={() => handleAction(onOpenInviteStaff)}
              className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-3 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-base">
                  ✉️
                </span>
                <div>
                  <div className="font-bold text-white font-['Chakra_Petch'] uppercase">Convidar Treinador / Staff</div>
                  <div className="text-[11px] text-slate-400">Gerar código ou link de acesso à equipa técnica</div>
                </div>
              </div>
              <span className="text-slate-400">➔</span>
            </button>
          )}

          {/* Admin Utilizadores & Acessos */}
          {isAdmin && onOpenAdminUsers && (
            <button
              type="button"
              onClick={() => handleAction(onOpenAdminUsers)}
              className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-3 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-base">
                  👥
                </span>
                <div>
                  <div className="font-bold text-white font-['Chakra_Petch'] uppercase flex items-center gap-1.5">
                    <span>Utilizadores & Acessos</span>
                    {pendingUsersCount > 0 && (
                      <Badge variant="amber" size="xs">
                        {pendingUsersCount} pendente
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">Aprovação de treinadores e gestão de permissões</div>
                </div>
              </div>
              <span className="text-slate-400">➔</span>
            </button>
          )}

          {/* Base de Dados & Backup */}
          <button
            type="button"
            onClick={() => handleAction(onOpenDatabase)}
            className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-3 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-base">💾</span>
              <div>
                <div className="font-bold text-white font-['Chakra_Petch'] uppercase">Base de Dados & Backup</div>
                <div className="text-[11px] text-slate-400">Exportar cópia de segurança JSON e restaurar dados</div>
              </div>
            </div>
            <span className="text-slate-400">➔</span>
          </button>

          {/* Definições */}
          <button
            type="button"
            onClick={() => handleAction(onOpenSettings)}
            className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-3 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-base">⚙️</span>
              <div>
                <div className="font-bold text-white font-['Chakra_Petch'] uppercase">Definições do Clube</div>
                <div className="text-[11px] text-slate-400">
                  Configurar nome, escalão, época, duração de partes e idioma
                </div>
              </div>
            </div>
            <span className="text-slate-400">➔</span>
          </button>

          {/* Download do Logo Vetorial (SVG / HD) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/70 via-slate-900/90 to-slate-950 border border-cyan-500/40 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-base">
                  📐
                </span>
                <div>
                  <div className="font-bold text-white font-['Chakra_Petch'] uppercase text-xs flex items-center gap-1.5">
                    <span>Logo Vetorial BolaComVisão</span>
                    <Badge variant="cyan" size="xs">
                      SVG
                    </Badge>
                  </div>
                  <div className="text-[11px] text-cyan-200/80">Guardar no computador para impressão ou design</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="/bolacomvisao-logo.svg"
                download="bolacomvisao-logo.svg"
                className="py-2 px-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-['Chakra_Petch'] font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <span>⬇️</span> SVG Vetorial
              </a>
              <a
                href="/bolacomvisao-logo-hd.svg"
                download="bolacomvisao-logo-hd.svg"
                className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-['Chakra_Petch'] font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>⬇️</span> SVG HD (Max)
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 px-0.5 font-mono">
              <span>Formato Vetor Escalável</span>
              <a
                href="/bolacomvisao-logo.png"
                download="bolacomvisao-logo.png"
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1"
              >
                <span>🖼️</span> Descarregar PNG (1024px)
              </a>
            </div>
          </div>
        </div>

        {/* Footer / Logout */}
        {onLogout && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] font-mono text-slate-400">{state.currentUser?.username}</div>
            <Button variant="danger" size="xs" icon={<span>🚪</span>} onClick={() => handleAction(onLogout)}>
              Terminar Sessão
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
