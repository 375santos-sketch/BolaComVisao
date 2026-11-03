import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

type Upsert<K, V> = {
  getOrInsert?: (key: K, value: V) => V;
  getOrInsertComputed?: (key: K, make: (key: K) => V) => V;
  has(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): unknown;
};

/**
 * PDF.js 6 uses Map/WeakMap.getOrInsert(Computed), still missing in many phones' browsers: without them a page
 * cannot be drawn. Same behaviour as the standard methods.
 */
export function ensureMapUpsert() {
  for (const proto of [Map.prototype, WeakMap.prototype] as unknown as Upsert<object, unknown>[]) {
    if (!proto.getOrInsertComputed)
      Object.defineProperty(proto, 'getOrInsertComputed', {
        configurable: true,
        writable: true,
        value(this: Upsert<object, unknown>, key: object, make: (key: object) => unknown) {
          if (!this.has(key)) this.set(key, make(key));
          return this.get(key);
        }
      });
    if (!proto.getOrInsert)
      Object.defineProperty(proto, 'getOrInsert', {
        configurable: true,
        writable: true,
        value(this: Upsert<object, unknown>, key: object, value: unknown) {
          if (!this.has(key)) this.set(key, value);
          return this.get(key);
        }
      });
  }
}

/** PDF.js, loaded only when a PDF is opened, with its worker served by the app itself (works without the internet). */
export async function loadPdfjs() {
  ensureMapUpsert();
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  return lib;
}
