import { AppState } from '../../types';
import { buildGamesDashboard, GamesDashboard, RankRow } from '../gamesDashboard';
import { PLAYING_TIME_TARGET } from '../playingTime';
import { getJsPDF, drawDocumentHeader, addBolaComVisaoPageFooters } from './pdfLayout';
import { DashboardSelection, selectDashboardGames } from './createSeasonReport';

type Doc = InstanceType<Awaited<ReturnType<typeof getJsPDF>>>;
type RGB = [number, number, number];

// Light-surface steps of the validated categorical palette (slots 1 and 2), plus a neutral for "only as substitute".
const BLUE: RGB = [42, 120, 214];
const ORANGE: RGB = [235, 104, 52];
const GREY: RGB = [148, 163, 184];
const INK: RGB = [15, 23, 42];
const MUTED: RGB = [100, 116, 139];
const LINE: RGB = [226, 232, 240];
const CARD: RGB = [246, 248, 251];
const BRAND: RGB = [10, 25, 42];
const ACCENT: RGB = [0, 170, 220];

const L = 15;
const W = 180;
const BOTTOM = 280;

const pct = (v: number) => `${Math.round(v * 100)}%`;
const dec = (v: number) => v.toLocaleString('pt-PT', { maximumFractionDigits: 1 });

/** A4 "Painel de jogos" (no emojis: the PDF fonts cannot draw them). */
export async function buildGamesDashboardPDF(state: AppState, selection?: DashboardSelection) {
  const { games, label } = selectDashboardGames(state, selection);
  const d = buildGamesDashboard(games, state);
  const jsPDF = await getJsPDF();
  const doc: Doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawDocumentHeader(doc, state, 'PAINEL DE JOGOS');

  let y = 50;
  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      doc.addPage();
      y = 18;
    }
  };
  const text = (
    s: string,
    x: number,
    yy: number,
    size: number,
    color: RGB,
    bold = false,
    align: 'left' | 'right' | 'center' = 'left'
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(s, x, yy, { align });
  };
  const section = (title: string, subtitle: string, height: number) => {
    ensure(height + 14);
    doc.setFillColor(...BRAND);
    doc.rect(L, y, W, 7, 'F');
    doc.setFillColor(...ACCENT);
    doc.rect(L, y, 1.4, 7, 'F');
    text(title.toUpperCase(), L + 4, y + 4.9, 9.5, [255, 255, 255], true);
    y += 11;
    if (subtitle) {
      text(subtitle, L, y, 8, MUTED);
      y += 5;
    }
  };

  // Title and one-line summary
  text(`${label}  ·  Painel de jogos`, 105, y, 13, INK, true, 'center');
  y += 6;
  const best = d.topGoals[0];
  const bestA = d.topAssists[0];
  const summary = [
    `${d.scored} golos marcados em ${d.played} jogo(s).`,
    best ? `Melhor marcador: ${best.name} (${best.value} golos).` : null,
    bestA ? `Mais assistências: ${bestA.name} (${bestA.value}).` : null
  ]
    .filter(Boolean)
    .join(' ');
  text(summary, 105, y, 9, MUTED, false, 'center');
  y += 7;

  if (d.played === 0) {
    text('Sem jogos terminados nesta escolha.', 105, y + 6, 10, MUTED, false, 'center');
    addBolaComVisaoPageFooters(doc);
    return doc;
  }

  drawKpis(doc, d, y);
  y += 2 * 21 + 6;

  // Minutes per athlete
  const rowH = 6.2;
  section(
    'Minutos jogados',
    `Minutos e percentagem dos minutos possíveis. A linha tracejada marca ${pct(PLAYING_TIME_TARGET)}.`,
    d.squad.length * rowH + 12
  );
  legend(doc, L, y, [
    ['Titular em pelo menos 1 jogo', BLUE],
    ['Só suplente', GREY]
  ]);
  y += 5;
  const labelW = 40;
  const barX = L + labelW + 2;
  const barW = 105;
  const chartTop = y;
  d.squad.forEach((s) => {
    ensure(rowH);
    const label = `${s.number !== null && s.number !== '' ? `${s.number} · ` : ''}${s.name}`;
    text(label, barX - 3, y + 3.6, 8.5, INK, false, 'right');
    const w = Math.max(0, Math.min(1, s.share)) * barW;
    if (w > 0) {
      doc.setFillColor(...(s.started ? BLUE : GREY));
      doc.roundedRect(barX, y, w, 4.6, 1, 1, 'F');
    }
    text(`${s.minutes}' · ${pct(s.share)}`, barX + w + 2, y + 3.6, 8, MUTED);
    y += rowH;
  });
  if (y > chartTop) {
    const x50 = barX + PLAYING_TIME_TARGET * barW;
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(x50, chartTop - 1, x50, y);
    doc.setLineDashPattern([], 0);
    text(pct(PLAYING_TIME_TARGET), x50, y + 3, 7.5, MUTED, false, 'center');
    y += 6;
  }

  // How we score
  section('Como marcamos', 'Golos marcados por origem do lance.', d.origins.length * rowH + 4);
  const totalGoals = d.origins.reduce((n, o) => n + o.goals, 0);
  const maxOrigin = Math.max(1, ...d.origins.map((o) => o.goals));
  if (d.origins.length === 0) {
    text('Sem golos marcados.', L, y + 3, 9, MUTED);
    y += 7;
  }
  d.origins.forEach((o, i) => {
    ensure(rowH);
    text(o.label, barX - 3, y + 3.6, 8.5, INK, false, 'right');
    const w = (o.goals / maxOrigin) * barW;
    doc.setFillColor(...(i === 0 ? BLUE : GREY));
    doc.roundedRect(barX, y, Math.max(0.8, w), 4.6, 1, 1, 'F');
    text(`${o.goals} (${pct(totalGoals ? o.goals / totalGoals : 0)})`, barX + w + 2, y + 3.6, 8, MUTED);
    y += rowH;
  });
  y += 3;

  // When we score
  section('Quando marcamos', `Golos marcados por blocos de 10 minutos (jogo de 2 x ${d.halfMinutes}').`, 62);
  legend(doc, L, y, [
    ['1.ª parte', BLUE],
    ['2.ª parte', ORANGE]
  ]);
  y += 5;
  drawColumns(doc, L + 8, y, W - 8, 48, d.whenScored);
  y += 48 + 10;

  // Top 3 rankings (two columns)
  const topH = Math.max(
    rankHeight(d.topGoals),
    rankHeight(d.topAssists),
    rankHeight(d.mostMinutes),
    rankHeight(d.leastMinutes)
  );
  section('Top 3 ofensivo', 'Mais golos e mais assistências. Empatados partilham a posição.', topH + 4);
  rankList(doc, L, y, 'Golos', d.topGoals, 'golos');
  rankList(doc, L + W / 2 + 3, y, 'Assistências', d.topAssists, 'assist.');
  y += topH + 3;
  section(
    'Top 3 de minutos',
    'Mais e menos minutos entre os convocados. Ajuda a equilibrar a utilização do plantel.',
    topH + 4
  );
  rankList(doc, L, y, 'Mais minutos', d.mostMinutes, 'min');
  rankList(doc, L + W / 2 + 3, y, 'Menos minutos', d.leastMinutes, 'min');
  y += topH + 3;

  // Squad table
  section('Plantel', 'G+A = golos + assistências.', 14);
  y = table(
    doc,
    y,
    [
      { title: 'Nº', w: 12 },
      { title: 'Atleta', w: 62 },
      { title: 'Minutos', w: 22, align: 'right' },
      { title: '% min', w: 20, align: 'right' },
      { title: 'Golos', w: 20, align: 'right' },
      { title: 'Assist.', w: 22, align: 'right' },
      { title: 'G+A', w: 22, align: 'right' }
    ],
    d.squad.map((s) => [
      s.number === null ? '' : String(s.number),
      s.name,
      String(s.minutes),
      pct(s.share),
      String(s.goals),
      String(s.assists),
      String(s.goals + s.assists)
    ]),
    () => ensure(6),
    () => y,
    (v) => (y = v)
  );
  y += 4;

  // Games table
  section('Jogos', 'Um registo por ficha de jogo.', 14);
  table(
    doc,
    y,
    [
      { title: 'Data', w: 26 },
      { title: 'Adversário', w: 92 },
      { title: 'Condição', w: 30 },
      { title: 'Marc.-Sofr.', w: 32, align: 'right' }
    ],
    d.games.map((g) => [
      g.date.split('-').reverse().join('/'),
      g.opponent,
      g.home ? 'Casa' : 'Fora',
      `${g.scored}-${g.conceded}`
    ]),
    () => ensure(6),
    () => y,
    (v) => (y = v)
  );

  addBolaComVisaoPageFooters(doc);
  return doc;
}

function drawKpis(doc: Doc, d: GamesDashboard, top: number) {
  const s = d.shots;
  const cards: [string, string, string][] = [
    ['Jogos (V-E-D)', String(d.played), `${d.wins}-${d.draws}-${d.losses}`],
    ['Golos marcados', String(d.scored), `${dec(d.played ? d.scored / d.played : 0)} por jogo`],
    [
      'Golos sofridos',
      String(d.conceded),
      s.games ? `${s.against} remates contra` : `${dec(d.played ? d.conceded / d.played : 0)} por jogo`
    ],
    [
      'Remates a favor',
      s.games ? String(s.for) : '—',
      s.games && s.for ? `${pct(s.inBoxFor / s.for)} dentro da área` : 'não registados'
    ],
    [
      'Eficácia (golos por remate)',
      s.efficacy === null ? '—' : pct(s.efficacy),
      s.efficacy ? `1 golo a cada ${dec(1 / s.efficacy)} remates` : 'sem remates registados'
    ],
    [
      'Cantos a favor / contra',
      d.setPieces.games ? `${d.setPieces.cornersFor}-${d.setPieces.cornersAgainst}` : '—',
      d.setPieces.games
        ? `Faltas: ${d.setPieces.foulsCommitted} cometidas, ${d.setPieces.foulsSuffered} sofridas`
        : 'não registados'
    ]
  ];
  const cw = (W - 2 * 4) / 3;
  cards.forEach(([label, value, sub], i) => {
    const x = L + (i % 3) * (cw + 4);
    const y = top + Math.floor(i / 3) * 21;
    doc.setFillColor(...CARD);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, cw, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 3, y + 4.6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(value, x + 3, y + 11.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...MUTED);
    doc.text((doc.splitTextToSize(sub, cw - 6) as string[])[0], x + 3, y + 15.6);
  });
}

function legend(doc: Doc, x: number, y: number, items: [string, RGB][]) {
  let cx = x;
  items.forEach(([label, color]) => {
    doc.setFillColor(...color);
    doc.roundedRect(cx, y - 2.4, 3, 3, 0.6, 0.6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label, cx + 4.5, y);
    cx += 6 + doc.getTextWidth(label) + 6;
  });
}

function drawColumns(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  cols: { label: string; half: 1 | 2; goals: number }[]
) {
  const max = Math.max(1, ...cols.map((c) => c.goals));
  const step = max <= 5 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5);
  const top = Math.ceil(max / step) * step;
  const base = y + h - 6;
  const plotH = h - 10;
  doc.setLineWidth(0.2);
  for (let t = 0; t <= top; t += step) {
    const yy = base - (t / top) * plotH;
    doc.setDrawColor(...LINE);
    doc.line(x, yy, x + w, yy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(String(t), x - 2, yy + 1, { align: 'right' });
  }
  const slot = w / cols.length;
  const bw = Math.min(16, slot * 0.6);
  cols.forEach((c, i) => {
    const cx = x + i * slot + (slot - bw) / 2;
    const bh = (c.goals / top) * plotH;
    if (bh > 0) {
      doc.setFillColor(...(c.half === 1 ? BLUE : ORANGE));
      doc.roundedRect(cx, base - bh, bw, bh, 1, 1, 'F');
      doc.rect(cx, base - Math.min(1, bh), bw, Math.min(1, bh), 'F'); // square base on the axis
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    if (c.goals > 0) doc.text(String(c.goals), cx + bw / 2, base - bh - 1.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(c.label, cx + bw / 2, base + 4.5, { align: 'center' });
  });
  doc.setDrawColor(...MUTED);
  doc.line(x, base, x + w, base);
}

const rankHeight = (rows: RankRow[]) => 6 + Math.max(1, rows.length) * 6.5;

function rankList(doc: Doc, x: number, y: number, title: string, rows: RankRow[], unit: string) {
  const w = W / 2 - 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(title.toUpperCase(), x, y + 2);
  let yy = y + 8;
  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('—', x, yy);
  }
  rows.forEach((r) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...(r.rank === 1 ? INK : MUTED));
    doc.text(`${r.rank}º`, x, yy);
    doc.setTextColor(...INK);
    doc.text(r.name, x + 9, yy);
    doc.setFont('helvetica', 'bold');
    doc.text(`${r.value} ${unit}`, x + w, yy, { align: 'right' });
    doc.setDrawColor(...LINE);
    doc.line(x, yy + 2.2, x + w, yy + 2.2);
    yy += 6.5;
  });
}

type Col = { title: string; w: number; align?: 'left' | 'right' };

function table(
  doc: Doc,
  startY: number,
  cols: Col[],
  rows: string[][],
  ensure: () => void,
  getY: () => number,
  setY: (v: number) => void
): number {
  setY(startY);
  const header = () => {
    const y = getY();
    doc.setFillColor(...LINE);
    doc.rect(L, y - 4.2, W, 6, 'F');
    let x = L + 2;
    cols.forEach((c) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(c.title, c.align === 'right' ? x + c.w - 3 : x, y, { align: c.align || 'left' });
      x += c.w;
    });
    setY(y + 6);
  };
  header();
  rows.forEach((r, i) => {
    const before = getY();
    ensure();
    if (getY() < before) header();
    const y = getY();
    if (i % 2 === 1) {
      doc.setFillColor(...CARD);
      doc.rect(L, y - 4.2, W, 5.8, 'F');
    }
    let x = L + 2;
    cols.forEach((c, ci) => {
      doc.setFont('helvetica', ci === 1 ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      const v = (doc.splitTextToSize(r[ci] ?? '', c.w - 3) as string[])[0] || '';
      doc.text(v, c.align === 'right' ? x + c.w - 3 : x, y, { align: c.align || 'left' });
      x += c.w;
    });
    setY(y + 5.8);
  });
  return getY();
}

/** Estatísticas → "Exportar PDF" and the panel's "PDF": the dashboard for the chosen games (season by default). */
export async function generateGamesDashboardPDF(state: AppState, selection?: DashboardSelection) {
  const doc = await buildGamesDashboardPDF(state, selection);
  const club = (state.myClubName || 'Clube').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Painel_Jogos_${club}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
