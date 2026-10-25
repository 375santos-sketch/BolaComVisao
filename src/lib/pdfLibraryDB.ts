// Helper to store imported PDF documents (base64 or ArrayBuffer) in IndexedDB
// and search metadata locally without memory or localStorage limitations.

const DB_NAME = 'BolaComVisao_PDFLibrary_DB';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_documents';

export interface PDFDocumentItem {
  id: string;
  title: string;
  category: 'aquecimento' | 'tecnica' | 'tatica' | 'fisico' | 'jogo' | 'bolas_paradas' | 'geral';
  tags: string[];
  description?: string;
  fileName: string;
  fileSize: number; // in bytes
  pageCount?: number;
  uploadedAt: string; // ISO date
  extractedText?: string; // Extracted text for rich instant search
  fileData?: string; // Data URL (data:application/pdf;base64,...)
}

function openPDFDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB não suportado neste navegador'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getPDFDocumentById(id: string): Promise<PDFDocumentItem | null> {
  try {
    const db = await openPDFDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Error getting PDF document by ID:', err);
    return null;
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
