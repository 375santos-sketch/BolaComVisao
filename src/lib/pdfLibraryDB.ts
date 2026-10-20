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

export async function getAllPDFDocuments(): Promise<PDFDocumentItem[]> {
  try {
    const db = await openPDFDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results: PDFDocumentItem[] = req.result || [];
        // Sort by uploadedAt descending
        results.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        resolve(results);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Error fetching PDF documents from IndexedDB:', err);
    return [];
  }
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

export async function savePDFDocument(doc: PDFDocumentItem): Promise<boolean> {
  try {
    const db = await openPDFDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(doc);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Error saving PDF document to IndexedDB:', err);
    return false;
  }
}

export async function deletePDFDocument(id: string): Promise<boolean> {
  try {
    const db = await openPDFDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Error deleting PDF document from IndexedDB:', err);
    return false;
  }
}

export async function clearAllPDFDocuments(): Promise<boolean> {
  try {
    const db = await openPDFDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Error clearing PDF documents:', err);
    return false;
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
