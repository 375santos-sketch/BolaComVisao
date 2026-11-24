import { describe, expect, it } from 'vitest';
import { precacheList, PRECACHE_MAX_BYTES } from '../lib/precache';

/** P1-01 — what the service worker keeps on the phone when it installs (names as the real build makes them). */
const KB = 1024;
const build = [
  { fileName: 'assets/main-Bv-M7LOc.js', size: 324 * KB, essential: true },
  { fileName: 'assets/vendor-react-Cp4CQckB.js', size: 218 * KB, essential: true },
  { fileName: 'assets/vendor-firebase-BgOqoMIF.js', size: 681 * KB, essential: true },
  { fileName: 'assets/main-D2CfRWHt.css', size: 188 * KB, essential: true },
  { fileName: 'assets/LiveMatchView-AbC123.js', size: 60 * KB },
  { fileName: 'assets/ConvocatoriaView-x1.js', size: 40 * KB },
  { fileName: 'assets/TrainingsView-x2.js', size: 120 * KB },
  { fileName: 'assets/GameAnalysisDashboard-tI3So6-G.js', size: 194 * KB },
  { fileName: 'assets/bolacomvisao_logo_256-CiCl1pee.jpg', size: 23 * KB },
  { fileName: 'assets/pdf.worker.min-CIqJB0yW.mjs', size: 1242 * KB },
  { fileName: 'assets/pdf-AVAxhmeW.js', size: 490 * KB },
  { fileName: 'assets/xlsx-CbTSpprj.js', size: 419 * KB },
  { fileName: 'assets/jspdf.es.min-ikt84Koa.js', size: 375 * KB },
  { fileName: 'assets/html2canvas-pro.esm-ruOJi9R8.js', size: 206 * KB },
  { fileName: 'assets/main-Bv-M7LOc.js.map', size: 900 * KB },
  { fileName: 'assets/biblioteca-pesada-x9.js', size: PRECACHE_MAX_BYTES + 1 },
  { fileName: 'index.html', size: 2 * KB },
  { fileName: 'manifest.webmanifest', size: 1 * KB }
];
const list = precacheList(build);

describe('P1-01 · ficheiros guardados no telemóvel na instalação', () => {
  it('guarda sempre a entrada da app, mesmo os ficheiros grandes (sem eles a app não abre)', () => {
    expect(list).toContain('/assets/main-Bv-M7LOc.js');
    expect(list).toContain('/assets/vendor-firebase-BgOqoMIF.js');
    expect(list).toContain('/assets/main-D2CfRWHt.css');
  });

  it('guarda os ecrãs do dia de jogo e de treino, mesmo nunca abertos', () => {
    expect(list).toContain('/assets/LiveMatchView-AbC123.js');
    expect(list).toContain('/assets/ConvocatoriaView-x1.js');
    expect(list).toContain('/assets/TrainingsView-x2.js');
    expect(list).toContain('/assets/GameAnalysisDashboard-tI3So6-G.js');
    expect(list).toContain('/assets/bolacomvisao_logo_256-CiCl1pee.jpg');
  });

  it('deixa de fora PDF, Excel, imagens para partilhar, mapas de código e o que for grande demais', () => {
    for (const out of ['pdf.worker', 'pdf-', 'xlsx', 'jspdf', 'html2canvas', '.map', 'biblioteca-pesada'])
      expect(
        list.some((f) => f.includes(out)),
        out
      ).toBe(false);
  });

  it('o HTML não entra na lista (vem sempre da rede primeiro, para receber atualizações)', () => {
    expect(list).not.toContain('/index.html');
    expect(list).not.toContain('/manifest.webmanifest');
  });

  it('guarda o que um ecrã guardado importa de forma fixa, mesmo com nome de PDF (sem isso o ecrã não abre sem rede)', () => {
    const withImports = precacheList([
      { fileName: 'assets/main-A.js', size: 300 * KB, essential: true },
      { fileName: 'assets/ConvocatoriaView-B.js', size: 40 * KB, imports: ['assets/pdfUtils-C.js'] },
      { fileName: 'assets/pdfUtils-C.js', size: 27 * KB, imports: ['assets/pdfLayout-D.js'] },
      { fileName: 'assets/pdfLayout-D.js', size: 7 * KB },
      // Only loaded on demand (dynamic import): stays out
      { fileName: 'assets/jspdf.es.min-E.js', size: 375 * KB }
    ]);
    expect(withImports).toEqual([
      '/assets/ConvocatoriaView-B.js',
      '/assets/main-A.js',
      '/assets/pdfLayout-D.js',
      '/assets/pdfUtils-C.js'
    ]);
  });

  it('caminhos começam por "/", sem repetidos, por ordem', () => {
    expect(list.every((f) => f.startsWith('/'))).toBe(true);
    expect(new Set(list).size).toBe(list.length);
    expect([...list].sort()).toEqual(list);
  });
});
