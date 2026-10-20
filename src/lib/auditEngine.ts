import { AuditLogEntry, AuditActionType, AuditEntityType, UserAccount } from '../types';
import { uid } from './utils';
import { db, auth } from '../services/firebase';
import { doc, setDoc, collection, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';

const AUDIT_STORAGE_KEY = 'bolacomvisao_audit_logs_v1';
const MAX_AUDIT_ENTRIES = 500;

/**
 * Creates and records a new immutable audit log entry.
 * Stores immediately in local storage, writes to Firestore /audit_logs/{id} (immutable rules)
 * and dispatches to server /api/audit/log.
 */
export function recordAuditLog(
  user: UserAccount | null | undefined,
  action: AuditActionType,
  entityType: AuditEntityType,
  description: string,
  meta?: {
    entityId?: string;
    clubId?: string;
    teamId?: string;
    teamName?: string;
    details?: Record<string, any>;
  }
): AuditLogEntry {
  const entryId = 'aud_' + uid() + '_' + Date.now().toString(36);
  const entry: AuditLogEntry = {
    id: entryId,
    timestamp: Date.now(),
    userId: user?.id || 'anonymous',
    userName: user?.name || user?.username || 'Utilizador',
    userRole: user?.role || 'Utilizador',
    action,
    entityType,
    entityId: meta?.entityId,
    clubId: meta?.clubId || user?.clubId,
    teamId: meta?.teamId,
    teamName: meta?.teamName,
    description,
    details: meta?.details,
    clientInfo: typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 80)}` : undefined
  };

  // 1. Local Storage for fast UI updates & offline preservation
  try {
    const existing = getStoredAuditLogs();
    const updated = [entry, ...existing].slice(0, MAX_AUDIT_ENTRIES);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao guardar log de auditoria local:', e);
  }

  // 2. Server-side API Logging & Firestore Immutable Cloud Record
  if (typeof navigator === 'undefined' || navigator.onLine) {
    // A. Direct Firestore Immutable write
    try {
      const logDocRef = doc(db, 'audit_logs', entryId);
      setDoc(logDocRef, {
        ...entry,
        createdAtServer: Date.now()
      }).catch((err) => {
        console.warn('Persistência de auditoria Firestore em espera:', err?.message || err);
      });
    } catch (err) {
      console.warn('Erro ao preparar log para Firestore:', err);
    }

    // B. Server-side notification with ID Token if available
    try {
      auth.currentUser
        ?.getIdToken()
        .then((token) => {
          fetch('/api/audit/log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(entry)
          }).catch((fetchErr) => {
            console.debug('Falha não-bloqueante no envio de log para backend:', fetchErr);
          });
        })
        .catch((tokenErr) => {
          console.debug('Falha não-bloqueante ao obter token para log:', tokenErr);
        });
    } catch (apiErr) {
      console.debug('Falha não-bloqueante na rota de auditoria:', apiErr);
    }
  }

  return entry;
}

/**
 * Retrieves stored audit logs from local storage
 */
export function getStoredAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AuditLogEntry[];
    }
  } catch (e) {
    console.warn('Erro ao carregar logs de auditoria:', e);
  }
  return [];
}

/**
 * Subscribes to real-time immutable audit logs from Firestore
 */
export function subscribeToCloudAuditLogs(
  onUpdate: (logs: AuditLogEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const auditCol = collection(db, 'audit_logs');
    const q = query(auditCol, orderBy('timestamp', 'desc'), limit(150));
    return onSnapshot(
      q,
      (snapshot) => {
        const cloudLogs: AuditLogEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.timestamp) {
            cloudLogs.push({ ...data, id: docSnap.id } as AuditLogEntry);
          }
        });
        if (cloudLogs.length > 0) {
          // Update local cache
          try {
            const local = getStoredAuditLogs();
            const map = new Map<string, AuditLogEntry>();
            [...cloudLogs, ...local].forEach((l) => map.set(l.id, l));
            const merged = Array.from(map.values())
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, MAX_AUDIT_ENTRIES);
            localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(merged));
          } catch (storageErr) {
            console.warn('Aviso ao persistir cache de auditoria:', storageErr);
          }
          if (typeof onUpdate === 'function') {
            onUpdate(cloudLogs);
          }
        }
      },
      (error) => {
        console.warn('Subscrição de auditoria cloud (fallback local ativo):', error);
        if (typeof onError === 'function') onError(error);
      }
    );
  } catch (err) {
    console.warn('Erro ao iniciar subscrição de auditoria:', err);
    return () => {};
  }
}

/**
 * Filters audit logs by query criteria
 */
export function filterAuditLogs(
  logs: AuditLogEntry[],
  criteria: {
    search?: string;
    userId?: string;
    teamId?: string;
    action?: string;
    entityType?: string;
    periodDays?: number;
  }
): AuditLogEntry[] {
  const now = Date.now();
  const cutoff = criteria.periodDays && criteria.periodDays > 0 ? now - criteria.periodDays * 24 * 60 * 60 * 1000 : 0;

  return logs.filter((log) => {
    if (cutoff > 0 && log.timestamp < cutoff) return false;
    if (criteria.userId && criteria.userId !== 'all' && log.userId !== criteria.userId) return false;
    if (criteria.teamId && criteria.teamId !== 'all' && log.teamId !== criteria.teamId) return false;
    if (criteria.action && criteria.action !== 'all' && log.action !== criteria.action) return false;
    if (criteria.entityType && criteria.entityType !== 'all' && log.entityType !== criteria.entityType) return false;

    if (criteria.search && criteria.search.trim()) {
      const q = criteria.search.toLowerCase().trim();
      const match =
        log.description.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        (log.teamName && log.teamName.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
}
