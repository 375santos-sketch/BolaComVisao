/**
 * P1-01 — Which files of the build the service worker keeps on the phone when it installs, so that every screen
 * (Início, Ao vivo, Convocatória, Treinos, Agenda, Plantel…) opens without network, even one never opened before.
 * Pure: used by vite.config.ts at build time (it writes precache-manifest.json) and by the tests.
 *
 * Left out: the heavy libraries only needed to make or read a file (PDF, Excel, pictures to share). They load when
 * the coach uses them, with network.
 */

/** One file of the build, as Rollup describes it. */
export interface BuildFile {
  fileName: string;
  size: number;
  /** The entry and what it imports at start-up: always kept (without them the app does not open). */
  essential?: boolean;
  /** Files this one imports statically (it cannot load without them). Dynamic imports are not listed here. */
  imports?: string[];
}

/** Libraries left out by name (PDF reader and writer, Excel, screenshots for pictures) and source maps. */
export const PRECACHE_EXCLUDE: RegExp[] = [/pdf/i, /xlsx/i, /html2canvas/i, /\.map$/i];
/** Anything not essential above this size is left out too (a heavy library under an unexpected name). */
export const PRECACHE_MAX_BYTES = 400_000;
/** Only code, styles, fonts and small pictures. */
const KINDS = /\.(js|mjs|css|woff2?|png|jpe?g|svg|webp)$/i;

/**
 * The paths to keep (sorted, each starting with "/"). Every file kept also keeps what it imports statically: a screen
 * kept without one of its pieces would fail to open without network. So a heavy library is left out only when the
 * screens load it on demand (a PDF being made, an Excel being read).
 */
export function precacheList(files: BuildFile[]): string[] {
  const byName = new Map(files.map((f) => [f.fileName, f]));
  const chosen = files.filter((f) => {
    if (!KINDS.test(f.fileName)) return false;
    if (/\.map$/i.test(f.fileName)) return false;
    if (f.essential) return true;
    if (PRECACHE_EXCLUDE.some((re) => re.test(f.fileName))) return false;
    return f.size <= PRECACHE_MAX_BYTES;
  });
  const keep = new Set<string>();
  const add = (name: string) => {
    if (keep.has(name) || /\.map$/i.test(name)) return;
    keep.add(name);
    (byName.get(name)?.imports || []).forEach(add);
  };
  chosen.forEach((f) => add(f.fileName));
  return [...keep].map((name) => `/${name.replace(/^\/+/, '')}`).sort();
}

/** The file the service worker reads when it installs. */
export interface PrecacheManifest {
  version: string;
  files: string[];
}
