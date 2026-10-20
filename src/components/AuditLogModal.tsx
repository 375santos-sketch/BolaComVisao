import React, { useState, useEffect, useMemo } from 'react';
import { AppState, AuditLogEntry } from '../types';
import { getStoredAuditLogs, filterAuditLogs, subscribeToCloudAuditLogs } from '../lib/auditEngine';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface AuditLogModalProps {
  state: AppState;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ state, onClose }) => {
  const [cloudLogs, setCloudLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedUser] = useState<string>('all');
  const [selectedTeam] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [periodDays, setPeriodDays] = useState<number>(30);

  useEffect(() => {
    // Real-time Cloud Audit Subscription from Firestore
    const unsubscribe = subscribeToCloudAuditLogs((incomingLogs) => {
      setCloudLogs(incomingLogs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logs = useMemo(() => {
    const localLogs = getStoredAuditLogs();
    const stateLogs = state.auditLogs || [];
    const map = new Map<string, AuditLogEntry>();
    [...stateLogs, ...localLogs, ...cloudLogs].forEach((l) => map.set(l.id, l));
    return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [state.auditLogs, cloudLogs]);

  const filtered = filterAuditLogs(logs, {
    search,
    userId: selectedUser,
    teamId: selectedTeam,
    action: selectedAction,
    entityType: selectedEntityType,
    periodDays
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('delete')) return 'rose';
    if (action.includes('create') || action.includes('invite')) return 'emerald';
    if (action.includes('edit') || action.includes('permission')) return 'amber';
    return 'cyan';
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="w-full max-w-4xl bg-slate-950 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88dvh] text-left">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xl shrink-0">
              🔐
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-['Chakra_Petch'] uppercase tracking-wider text-white">
                Registo de Auditoria & Segurança
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Rastreio cronológico imutável de ações e alterações no clube ({filtered.length} eventos)
              </p>
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

        {/* Filter Controls */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/40 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-mono text-xs">
          {/* Search Box */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar descrição, utilizador..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas as Ações</option>
              <option value="login">Login / Sessão</option>
              <option value="create">Criações</option>
              <option value="edit">Edições</option>
              <option value="delete">Eliminações</option>
              <option value="permission_change">Permissões</option>
              <option value="invite">Convites</option>
              <option value="report_export">Exportações</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas as Entidades</option>
              <option value="jogador">Plantel / Jogadores</option>
              <option value="jogo">Jogos</option>
              <option value="treino">Treinos & Presenças</option>
              <option value="utilizador">Utilizadores</option>
              <option value="equipa">Equipas</option>
              <option value="relatorio">Relatórios</option>
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={0}>Todo o Histórico</option>
            </select>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2 font-mono text-xs">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <span className="text-3xl block mb-2">🔍</span>
              Nenhum registo de auditoria encontrado para os filtros selecionados.
            </div>
          ) : (
            filtered.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-base shrink-0 mt-0.5">
                      {log.action.includes('delete') ? '🗑️' : log.action.includes('create') ? '✨' : '📝'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs">{log.userName}</span>
                        <span className="text-[10px] text-slate-400">({log.userRole})</span>
                        <Badge variant={getActionBadgeVariant(log.action)} size="xs">
                          {log.action}
                        </Badge>
                        <Badge variant="slate" size="xs">
                          {log.entityType}
                        </Badge>
                        {log.teamName && <span className="text-[10px] text-cyan-300">[{log.teamName}]</span>}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">{log.description}</p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right text-[10px] text-slate-400 font-mono sm:pl-3">
                    <div>{dateStr}</div>
                    <div className="text-[9px] text-slate-400">{log.id}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/95 shrink-0 flex items-center justify-between pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_rgba(0,0,0,0.4)]">
          <span className="text-[11px] font-mono text-slate-400">Registo de integridade ativo · Apenas leitura</span>
          <Button variant="secondary" size="sm" onClick={onClose} className="min-h-[44px]">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogModal;
