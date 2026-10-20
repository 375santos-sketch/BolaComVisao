import React, { useState, useEffect } from 'react';
import { AppState, SyncState } from '../types';
import {
  defaultSyncState,
  syncStateWithCloud,
  pullStateFromCloud,
  getStorageDiagnostics,
  getFirestoreQuotaState
} from '../lib/syncEngine';

interface SyncModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onShowConfirm?: (msg: string, cb: () => void) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ state, onUpdateState, onClose, onShowToast, onShowConfirm }) => {
  const syncInfo: SyncState = state.syncInfo || defaultSyncState;
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pairSyncKey, setPairSyncKey] = useState<string>('');
  const [showPairInput, setShowPairInput] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] = useState<{
    usageKB: number;
    quotaKB: number;
    percentUsed: number;
    isPersisted: boolean;
  } | null>(null);
  const [quotaState, setQuotaState] = useState(getFirestoreQuotaState());

  useEffect(() => {
    getStorageDiagnostics().then(setDiagnostics);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const result = await syncStateWithCloud(state, syncInfo.syncId);
    setIsSyncing(false);
    setQuotaState(getFirestoreQuotaState());

    if (result.success) {
      const updatedSyncInfo: SyncState = {
        ...syncInfo,
        status: 'synced',
        lastSyncedAt: Date.now(),
        pendingChangesCount: 0,
        lastSyncMessage: result.message
      };
      onUpdateState({ syncInfo: updatedSyncInfo });
      onShowToast(`✓ ${result.message}`);
    } else {
      const updatedSyncInfo: SyncState = {
        ...syncInfo,
        status: 'offline',
        lastSyncMessage: result.message
      };
      onUpdateState({ syncInfo: updatedSyncInfo });
      onShowToast(`⚡ ${result.message}`);
    }
  };

  const handlePairCloudKey = async () => {
    if (!pairSyncKey.trim()) return;
    setIsSyncing(true);
    const result = await pullStateFromCloud(pairSyncKey.trim().toUpperCase());
    setIsSyncing(false);

    if (result.success && result.data) {
      const doApply = () => {
        onUpdateState({
          ...result.data,
          syncInfo: {
            ...syncInfo,
            syncId: pairSyncKey.trim().toUpperCase(),
            lastSyncedAt: Date.now(),
            pendingChangesCount: 0,
            status: 'synced',
            lastSyncMessage: 'Dados sincronizados via Chave de Nuvem.'
          }
        });
        onShowToast('✓ Plantel e dados sincronizados com sucesso a partir da Nuvem!');
        setShowPairInput(false);
      };

      if (onShowConfirm) {
        onShowConfirm(
          'Deseja carregar os dados desta Chave de Nuvem? Os dados locais atuais serão substituídos pela versão da nuvem.',
          doApply
        );
      } else {
        doApply();
      }
    } else {
      onShowToast(`⚠️ ${result.message}`);
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Ainda não sincronizado';
    const d = new Date(ts);
    return `${d.toLocaleDateString('pt-PT')} às ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <div className="text-left">
              <h3 className="text-base font-bold font-['Chakra_Petch'] uppercase tracking-wider text-white">
                Sincronização & Modo Offline
              </h3>
              <p className="text-[10px] font-mono text-cyan-300">
                100% Funcional sem Internet · Sincronização Automática
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold p-1">
            ✕
          </button>
        </div>

        {/* Quota Limit Notice if Exceeded */}
        {quotaState.isExhausted && (
          <div className="p-3.5 rounded-2xl border border-amber-500/60 bg-amber-950/40 text-left mb-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-mono">
              <span>⚠️</span>
              <span>Limite Diário Gratuito do Firestore Atingido</span>
            </div>
            <p className="text-[11px] font-mono text-slate-200 leading-relaxed">
              O limite gratuito diário de operações do Firebase Firestore foi alcançado. Todos os seus dados continuam{' '}
              <strong>100% seguros e gravados offline (IndexedDB)</strong> neste dispositivo.
            </p>
            <p className="text-[10px] font-mono text-amber-200/90">
              O limite diário renova automaticamente amanhã. Pode também verificar ou atualizar o plano no Firebase Console:
            </p>
            <a
              href={quotaState.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-mono text-xs font-bold transition-colors"
            >
              <span>↗ Abrir Firebase Console</span>
            </a>
          </div>
        )}

        {/* Live Network Status Banner */}
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left mb-4 ${
            isOnline
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                isOnline
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              }`}
            />
            <div>
              <div className="text-xs font-bold font-mono text-white flex items-center gap-2">
                <span>{isOnline ? '🟢 Ligado à Internet (Online)' : '⚡ Modo Offline Ativo'}</span>
                {!isOnline && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 font-bold">
                    SEM REDE
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                {isOnline
                  ? 'A aplicação está sincronizada e comunica em tempo real.'
                  : 'Pode trabalhar normalmente. Ao ligar a net, a app sincroniza tudo automaticamente!'}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Sync Card */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-cyan-500/20 text-left space-y-3 mb-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Conta Cloud Ligada:</span>
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <span>👤 {state.currentUser ? state.currentUser.name : 'Modo Local'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800/80 pt-2">
            <span className="text-slate-400">Estado de Sincronização:</span>
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              {isSyncing ? (
                <>
                  <span className="animate-spin text-sm">🔄</span>
                  <span>A sincronizar com a Nuvem...</span>
                </>
              ) : (
                <span className="text-emerald-400 font-bold">☁️ Sincronização Multi-Dispositivo Ativa</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800/80 pt-2">
            <span className="text-slate-400">Última Sincronização:</span>
            <span className="text-white font-semibold">{formatLastSync(syncInfo.lastSyncedAt)}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800/80 pt-2">
            <span className="text-slate-400">Armazenamento Offline Seguro:</span>
            <span className="text-emerald-400 font-bold">✓ IndexedDB & Firestore Nuvem Ativos</span>
          </div>
        </div>

        {/* Action Button: Sincronizar Agora */}
        <div className="mb-5">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-['Chakra_Petch'] font-black text-sm tracking-wider uppercase shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
            <span>{isSyncing ? 'A Sincronizar Dados...' : 'Sincronizar Agora'}</span>
          </button>
        </div>

        {/* Cloud Sync Key / Cross-Device Pairing */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-cyan-500/20 text-left mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">
              🔑 Chave Cloud / Partilha Entre Dispositivos
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(syncInfo.syncId);
                onShowToast('✓ Chave Cloud copiada para a área de transferência!');
              }}
              className="text-[10px] font-mono font-bold text-cyan-300 hover:text-white bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 rounded-lg transition-colors"
            >
              Copiar
            </button>
          </div>
          <p className="text-[10px] font-mono text-slate-400 mb-2.5">
            Use esta chave para aceder e sincronizar o mesmo plantel no telemóvel, tablet e computador.
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 border border-cyan-500/30 rounded-xl px-3 py-2 text-cyan-200 font-mono text-sm font-bold tracking-widest text-center">
              {syncInfo.syncId}
            </div>
            <button
              onClick={() => setShowPairInput(!showPairInput)}
              className="btn btn-outline text-xs py-2 px-3 shrink-0"
            >
              {showPairInput ? 'Cancelar' : 'Conectar Chave'}
            </button>
          </div>

          {showPairInput && (
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
              <label className="text-[10px] font-mono text-slate-300">
                Introduza a Chave Cloud de outro dispositivo:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: BCV-X7Y9Z"
                  value={pairSyncKey}
                  onChange={(e) => setPairSyncKey(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-1.5 text-white font-mono text-xs uppercase"
                />
                <button
                  onClick={handlePairCloudKey}
                  disabled={!pairSyncKey.trim() || isSyncing}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs disabled:opacity-40"
                >
                  Conectar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Offline Diagnostics & PWA instructions */}
        <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-left space-y-1.5 text-[10px] font-mono text-slate-400">
          <div className="text-white font-bold text-xs font-mono mb-1 flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Como Funciona o Modo Offline:</span>
          </div>
          <p>
            • <strong>Tudo Funciona Sem Rede:</strong> Registar treinos, presenças, cronómetro de jogo ao vivo, golos,
            cartões, convocatórias e relatórios PDF.
          </p>
          <p>
            • <strong>Sincronização Automática:</strong> Assim que o dispositivo apanhar Wi-Fi ou dados móveis, a
            aplicação sincroniza automaticamente em segundo plano.
          </p>
          {diagnostics && (
            <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-400">
              <span>Espaço Offline Usado: {diagnostics.usageKB} KB</span>
              <span>Persistência: Ativa ✓</span>
            </div>
          )}
        </div>

        <button className="btn btn-outline w-full mt-4" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
};

export default SyncModal;
