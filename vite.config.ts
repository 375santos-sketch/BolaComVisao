import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { precacheList, type BuildFile, type PrecacheManifest } from './src/lib/precache';

/** P1-01: one id per build. The service worker is registered with it, so each Publish refreshes the phones' copy. */
const BUILD_ID = Date.now().toString(36);

/**
 * P1-01: writes precache-manifest.json — the files the service worker keeps on the phone when it installs, so that
 * every screen opens without network (see src/lib/precache.ts and public/sw.js).
 */
function precacheManifest(): Plugin {
  return {
    name: 'bcv-precache-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      // The entries and everything they import at start-up are essential
      const essential = new Set<string>();
      const visit = (fileName: string) => {
        const item = bundle[fileName];
        if (!item || essential.has(fileName)) return;
        essential.add(fileName);
        if (item.type === 'chunk') {
          item.imports.forEach(visit);
          (item.viteMetadata?.importedCss || new Set<string>()).forEach(visit);
        }
      };
      Object.values(bundle).forEach((item) => item.type === 'chunk' && item.isEntry && visit(item.fileName));
      const files: BuildFile[] = Object.values(bundle).map((item) => ({
        fileName: item.fileName,
        size: item.type === 'chunk' ? item.code.length : (item.source as string | Uint8Array).length,
        essential: essential.has(item.fileName),
        // Static imports and the CSS a chunk needs: a kept file keeps them too (dynamic imports stay optional)
        imports:
          item.type === 'chunk' ? [...item.imports, ...(item.viteMetadata?.importedCss || new Set<string>())] : []
      }));
      const manifest: PrecacheManifest = { version: BUILD_ID, files: precacheList(files) };
      this.emitFile({ type: 'asset', fileName: 'precache-manifest.json', source: JSON.stringify(manifest) });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), precacheManifest()],
    define: {
      __BCV_BUILD__: JSON.stringify(BUILD_ID)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      },
      dedupe: ['react', 'react-dom']
    },
    optimizeDeps: {
      include: ['react', 'react-dom']
    },
    build: {
      rollupOptions: {
        // votar.html: the parents' voting page for the "Jogador do jogo" (tiny, without React)
        input: {
          main: path.resolve(__dirname, 'index.html'),
          votar: path.resolve(__dirname, 'votar.html')
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              // Excel (xlsx) and PDF (jspdf) are not grouped here on purpose: they are only loaded when a file is
              // imported/exported, and a manual chunk would also capture shared helpers the entry needs at start-up.
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {}
    }
  };
});
