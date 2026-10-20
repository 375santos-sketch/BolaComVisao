import { OpponentScouting, AppState, ScheduledMatch } from '../../types';
import { getJsPDF, drawDocumentHeader, addBolaComVisaoPageFooters } from './pdfLayout';

/**
 * Generates a Pre-Match Report PDF for OUR TEAM (Relatório Pré-Jogo — A Nossa Equipa)
 */
export async function generatePreMatchReportPDF(report: OpponentScouting, state: AppState, match?: ScheduledMatch) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName || 'A Minha Equipa';

  drawDocumentHeader(doc, state, 'RELATÓRIO PRÉ-JOGO — A NOSSA EQUIPA');

  const opponent = match?.opponent || report.opponentName || 'Adversário';
  const matchDate = match?.date || report.date || '';
  const matchTime = match?.time || report.time || '';
  const matchLoc = (match?.location || report.location) === 'casa' ? 'JOGO EM CASA' : 'JOGO FORA';
  const competition = match?.tournamentName
    ? match.tournamentName
    : (match?.type || report.matchType || 'JOGO OFICIAL').toUpperCase();
  const phase = match?.phase || report.phase || '';

  // ==========================================
  // 1. BANNER DO JOGO & PALAVRA DE ORDEM (Y: 41.5 -> 54.5, H: 13mm)
  // ==========================================
  const bannerY = 41.5;
  const bannerH = 13;

  if (report.teamMotto && report.teamMotto.trim() !== '') {
    // 2 Boxes: Left for match info, Right for team motto
    const leftW = 114;
    const rightW = 68;
    const rightX = 12 + leftW + 4; // 130

    // Left: Match Info
    doc.setFillColor(15, 30, 52);
    doc.roundedRect(12, bannerY, leftW, bannerH, 2, 2, 'F');
    doc.setDrawColor(0, 210, 255);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, bannerY, leftW, bannerH, 2, 2, 'S');

    doc.setFillColor(0, 210, 255);
    doc.rect(12, bannerY, 2.5, bannerH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${myClub.toUpperCase()}  vs  ${opponent.toUpperCase()}`, 17, bannerY + 5.2);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 210, 255);
    const matchInfoLine = `${competition} ${phase ? '• ' + phase : ''} • ${matchLoc} ${matchDate ? '• ' + matchDate : ''} ${matchTime ? 'às ' + matchTime : ''}${match?.venue ? ' • ' + match.venue : ''}`;
    doc.text(matchInfoLine, 17, bannerY + 9.8);

    // Right: Palavra de Ordem
    doc.setFillColor(24, 48, 80);
    doc.roundedRect(rightX, bannerY, rightW, bannerH, 2, 2, 'F');
    doc.setDrawColor(217, 164, 65);
    doc.setLineWidth(0.4);
    doc.roundedRect(rightX, bannerY, rightW, bannerH, 2, 2, 'S');

    doc.setFillColor(255, 215, 0);
    doc.rect(rightX, bannerY, 2.5, bannerH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 215, 0);
    doc.text('PALAVRA DE ORDEM / FOCO:', rightX + 5, bannerY + 4.5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    const mottoLines = doc.splitTextToSize(`"${report.teamMotto}"`, rightW - 7);
    doc.text(mottoLines.slice(0, 1), rightX + 5, bannerY + 9.5);
  } else {
    // Single full-width match banner
    doc.setFillColor(15, 30, 52);
    doc.roundedRect(12, bannerY, 186, bannerH, 2, 2, 'F');
    doc.setDrawColor(0, 210, 255);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, bannerY, 186, bannerH, 2, 2, 'S');

    doc.setFillColor(0, 210, 255);
    doc.rect(12, bannerY, 2.5, bannerH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`${myClub.toUpperCase()}  vs  ${opponent.toUpperCase()}`, 18, bannerY + 5.2);

    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 210, 255);
    const matchInfoLine = `${competition} ${phase ? '• ' + phase : ''} • ${matchLoc} ${matchDate ? '• ' + matchDate : ''} ${matchTime ? 'às ' + matchTime : ''}${match?.venue ? ' • ' + match.venue : ''}`;
    doc.text(matchInfoLine, 18, bannerY + 10);
  }

  // ==========================================
  // 2. SISTEMA TÁTICO & 3 OBJETIVOS (Y: 56.5 -> 74.5, H: 18mm)
  // ==========================================
  const sysY = 56.5;
  const sysH = 18;
  const colW = 91;

  // Coluna 1: Sistema & Modelo
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(12, sysY, colW, sysH, 2, 2, 'F');
  doc.setDrawColor(200, 220, 235);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, sysY, colW, sysH, 2, 2, 'S');

  doc.setFillColor(24, 48, 80);
  doc.rect(12, sysY, colW, 4.8, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(12, sysY, 2.5, 4.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('SISTEMA & MODELO DA NOSSA EQUIPA', 17, sysY + 3.5);

  const blockLabel =
    report.ourDefensiveBlock === 'alto'
      ? 'Bloco Alto (Pressão)'
      : report.ourDefensiveBlock === 'baixo'
        ? 'Bloco Baixo (Juntas)'
        : 'Bloco Médio (Equilíbrio)';

  doc.setFontSize(6.8);
  doc.setTextColor(15, 30, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('Formação: ', 15, sysY + 8.5);
  doc.setTextColor(0, 140, 220);
  doc.text(report.ourFormation || report.formation || '2-3-1', 29, sysY + 8.5);

  doc.setTextColor(15, 30, 52);
  doc.text(' |  Bloco: ', 40, sysY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 80);
  doc.text(blockLabel, 52, sysY + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 30, 52);
  doc.text('Modelo: ', 15, sysY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 60, 70);
  const modelText = doc.splitTextToSize(
    report.ourPlayingModel || report.gamePlan || 'Domínio posicional, circulação rápida e reação agressiva pós-perda.',
    74
  );
  doc.text(modelText.slice(0, 1), 27, sysY + 13.5);

  // Coluna 2: 3 Objetivos Inegociáveis
  const objX = 12 + colW + 4; // 107
  doc.setFillColor(242, 252, 246);
  doc.roundedRect(objX, sysY, colW, sysH, 2, 2, 'F');
  doc.setDrawColor(180, 230, 200);
  doc.setLineWidth(0.4);
  doc.roundedRect(objX, sysY, colW, sysH, 2, 2, 'S');

  doc.setFillColor(16, 140, 70);
  doc.rect(objX, sysY, colW, 4.8, 'F');
  doc.setFillColor(100, 255, 180);
  doc.rect(objX, sysY, 2.5, 4.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('3 OBJETIVOS INEGOCIÁVEIS', objX + 5, sysY + 3.5);

  const objs =
    report.keyObjectives && report.keyObjectives.length > 0
      ? report.keyObjectives
      : [
          'Ganhar os primeiros duelos nos primeiros 10 min',
          'Comunicação constante e entreajuda permanente',
          'Zero golos sofridos de bola parada'
        ];

  let objLineY = sysY + 8.2;
  objs.slice(0, 3).forEach((obj, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(16, 120, 60);
    doc.text(`${idx + 1}.`, objX + 3, objLineY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 50, 30);
    const lines = doc.splitTextToSize(obj, 82);
    doc.text(lines.slice(0, 1), objX + 7, objLineY);
    objLineY += 3.8;
  });

  // ==========================================
  // 3. DASHBOARD CENTRAL (Y: 76.5 -> 191.5, H: 115mm)
  // ESQUERDA: RELVADO TÁTICO FUT 7
  // DIREITA: BOLAS PARADAS (TOPO) + OS 4 MOMENTOS DE JOGO (BASE)
  // ==========================================
  const dashY = 76.5;
  const dashH = 115;
  const pitchColW = 84;
  const rightColX = 12 + pitchColW + 4; // 100
  const rightColW = 98;

  // --- COLUNA DA ESQUERDA: RELVADO TÁTICO VERTICAL ---
  doc.setFillColor(18, 68, 36);
  doc.roundedRect(12, dashY, pitchColW, dashH, 2, 2, 'F');
  doc.setDrawColor(210, 235, 215);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, dashY, pitchColW, dashH, 2, 2, 'S');

  // Header do Relvado
  doc.setFillColor(15, 30, 52);
  doc.rect(12, dashY, pitchColW, 5, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(12, dashY, 2.5, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `RELVADO TÁTICO (FUT 7 — ${report.ourFormation || report.formation || '2-3-1'})`,
    17,
    dashY + 3.6
  );

  const fieldX = 15;
  const fieldY = dashY + 8;
  const fieldW = 78;
  const fieldH = 104;

  const stripeH = fieldH / 8;
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) {
      doc.setFillColor(24, 88, 48);
    } else {
      doc.setFillColor(18, 70, 38);
    }
    doc.rect(fieldX, fieldY + i * stripeH, fieldW, stripeH, 'F');
  }

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.rect(fieldX, fieldY, fieldW, fieldH, 'S');

  // Balizas
  doc.setFillColor(255, 255, 255);
  doc.rect(fieldX + fieldW / 2 - 6.5, fieldY - 2.2, 13, 2.2, 'S');
  doc.rect(fieldX + fieldW / 2 - 6.5, fieldY + fieldH, 13, 2.2, 'S');

  // Linha de meio campo & Círculo central
  doc.line(fieldX, fieldY + fieldH / 2, fieldX + fieldW, fieldY + fieldH / 2);
  doc.circle(fieldX + fieldW / 2, fieldY + fieldH / 2, 7, 'S');
  doc.circle(fieldX + fieldW / 2, fieldY + fieldH / 2, 0.5, 'F');

  // Área Superior
  doc.rect(fieldX + fieldW / 2 - 14, fieldY, 28, 11, 'S');
  doc.rect(fieldX + fieldW / 2 - 6.5, fieldY, 13, 4.2, 'S');
  doc.circle(fieldX + fieldW / 2, fieldY + 7.5, 0.5, 'F');

  // Área Inferior
  doc.rect(fieldX + fieldW / 2 - 14, fieldY + fieldH - 11, 28, 11, 'S');
  doc.rect(fieldX + fieldW / 2 - 6.5, fieldY + fieldH - 4.2, 13, 4.2, 'S');
  doc.circle(fieldX + fieldW / 2, fieldY + fieldH - 7.5, 0.5, 'F');

  // Indicador de Sentido de Ataque (Topo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(200, 245, 210);
  doc.text('▲ ATAQUE / BALIZA ADVERSÁRIA ▲', fieldX + fieldW / 2, fieldY - 2.8, { align: 'center' });

  // 7 Atletas no Relvado
  const pitchPlayers =
    report.ourTacticalPitch && report.ourTacticalPitch.length === 7
      ? report.ourTacticalPitch
      : [
          { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
          { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 26, y: 70 },
          { id: 'p3', role: 'DD', name: 'Defesa Dir.', x: 74, y: 70 },
          { id: 'p4', role: 'ME', name: 'Ala / Médio Esq.', x: 18, y: 44 },
          { id: 'p5', role: 'MC', name: 'Médio Centro', x: 50, y: 46 },
          { id: 'p6', role: 'MD', name: 'Ala / Médio Dir.', x: 82, y: 44 },
          { id: 'p7', role: 'PL', name: 'Avançado', x: 50, y: 18 }
        ];

  pitchPlayers.forEach((p) => {
    const px = fieldX + ((p.x ?? 50) / 100) * fieldW;
    const py = fieldY + ((p.y ?? 50) / 100) * fieldH;

    const isGK = p.role === 'GR' || py > fieldY + fieldH - 14;

    if (isGK) {
      doc.setFillColor(245, 180, 20);
    } else {
      doc.setFillColor(0, 195, 245);
    }
    doc.circle(px, py, 3, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.35);
    doc.circle(px, py, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(10, 25, 45);
    doc.text(p.role, px, py + 1.4, { align: 'center' });

    const badgeW = 18;
    const badgeH = 3.6;
    const badgeX = px - badgeW / 2;

    let badgeY = py + 3.6;
    if (py > fieldY + fieldH - 12) {
      badgeY = py - 7.2;
    }

    doc.setFillColor(10, 25, 45);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.8, 0.8, 'F');
    doc.setDrawColor(0, 195, 245);
    doc.setLineWidth(0.2);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.8, 0.8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.4);
    doc.setTextColor(255, 255, 255);
    const displayName = p.name ? (p.name.length > 12 ? p.name.slice(0, 10) + '..' : p.name) : p.role;
    doc.text(displayName, px, badgeY + 2.5, { align: 'center' });
  });

  // --- COLUNA DA DIREITA: BOLAS PARADAS (TOPO) + 4 MOMENTOS (BASE) ---
  // 1. Bolas Paradas
  const setPiecesH = 43;
  doc.setFillColor(248, 250, 254);
  doc.roundedRect(rightColX, dashY, rightColW, setPiecesH, 2, 2, 'F');
  doc.setDrawColor(210, 225, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(rightColX, dashY, rightColW, setPiecesH, 2, 2, 'S');

  doc.setFillColor(15, 30, 52);
  doc.rect(rightColX, dashY, rightColW, 5, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(rightColX, dashY, 2.5, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('BOLAS PARADAS DA NOSSA EQUIPA', rightColX + 5, dashY + 3.6);

  const leftCorn = report.setPieceTakers?.leftCorner || '—';
  const rightCorn = report.setPieceTakers?.rightCorner || '—';
  const freekicks = report.setPieceTakers?.directFreekick || '—';
  const penalties = report.setPieceTakers?.penalties || '—';

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 120, 200);
  doc.text('Cantos Esq: ', rightColX + 3, dashY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 30, 52);
  doc.text(leftCorn, rightColX + 21, dashY + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 120, 200);
  doc.text('Cantos Dir: ', rightColX + 51, dashY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 30, 52);
  doc.text(rightCorn, rightColX + 69, dashY + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 120, 200);
  doc.text('Livres Dir: ', rightColX + 3, dashY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 30, 52);
  doc.text(freekicks, rightColX + 21, dashY + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 120, 200);
  doc.text('Penáltis: ', rightColX + 51, dashY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 30, 52);
  doc.text(penalties, rightColX + 69, dashY + 13.5);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 50, 60);
  doc.text('Rotinas Ofensivas: ', rightColX + 3, dashY + 19.5);
  doc.setFont('helvetica', 'normal');
  const offSpText = doc.splitTextToSize(
    report.ourOffensiveSetPieces || report.setPiecesNotes || 'Cantos ao 1º poste com bloqueio e 2º poste a fechar.',
    92
  );
  doc.text(offSpText.slice(0, 2), rightColX + 3, dashY + 23.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 50, 60);
  doc.text('Sistema Defensivo: ', rightColX + 3, dashY + 32);
  doc.setFont('helvetica', 'normal');
  const defSpText = doc.splitTextToSize(
    report.ourDefensiveSetPieces || 'Marcação mista (zona no primeiro poste + homem nos atletas altos).',
    92
  );
  doc.text(defSpText.slice(0, 2), rightColX + 3, dashY + 36);

  // 2. Os 4 Momentos de Jogo (Abaixo de Bolas Paradas)
  const momentsY = dashY + setPiecesH + 3; // 76.5 + 43 + 3 = 122.5
  const momentsH = dashH - setPiecesH - 3; // 115 - 43 - 3 = 69mm

  doc.setFillColor(252, 252, 252);
  doc.roundedRect(rightColX, momentsY, rightColW, momentsH, 2, 2, 'F');
  doc.setDrawColor(215, 225, 235);
  doc.setLineWidth(0.4);
  doc.roundedRect(rightColX, momentsY, rightColW, momentsH, 2, 2, 'S');

  doc.setFillColor(24, 48, 80);
  doc.rect(rightColX, momentsY, rightColW, 5, 'F');
  doc.setFillColor(255, 215, 0);
  doc.rect(rightColX, momentsY, 2.5, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('OS 4 MOMENTOS DO JOGO — DIRETRIZES TÁTICAS', rightColX + 5, momentsY + 3.6);

  // 4 Quadrantes (2x2)
  const quadW = 46.5;
  const quadH = 29.5;
  const qGap = 2;
  const qLeftX = rightColX + 1.5;
  const qRightX = qLeftX + quadW + qGap;
  const qTopY = momentsY + 6.5;
  const qBottomY = qTopY + quadH + qGap;

  // Q1: Org. Ofensiva
  doc.setFillColor(242, 250, 255);
  doc.roundedRect(qLeftX, qTopY, quadW, quadH, 1.5, 1.5, 'F');
  doc.setDrawColor(180, 220, 245);
  doc.roundedRect(qLeftX, qTopY, quadW, quadH, 1.5, 1.5, 'S');
  doc.setFillColor(0, 140, 220);
  doc.rect(qLeftX, qTopY, quadW, 3.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text('1. ORG. OFENSIVA (COM BOLA)', qLeftX + 2, qTopY + 2.7);

  const offList =
    report.offensiveOrganization && report.offensiveOrganization.length > 0
      ? report.offensiveOrganization
      : ['Construção apoiada e circulação rápida.', 'Largura total pelos alas para criar espaços.'];
  let q1Y = qTopY + 6.5;
  offList.slice(0, 2).forEach((txt) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(0, 120, 200);
    doc.text('•', qLeftX + 2, q1Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 30, 40);
    const wrapped = doc.splitTextToSize(txt, quadW - 6);
    doc.text(wrapped.slice(0, 2), qLeftX + 4.5, q1Y);
    q1Y += wrapped.slice(0, 2).length * 3.2 + 1;
  });

  // Q2: Transição Defensiva
  doc.setFillColor(255, 245, 245);
  doc.roundedRect(qRightX, qTopY, quadW, quadH, 1.5, 1.5, 'F');
  doc.setDrawColor(245, 195, 195);
  doc.roundedRect(qRightX, qTopY, quadW, quadH, 1.5, 1.5, 'S');
  doc.setFillColor(220, 45, 45);
  doc.rect(qRightX, qTopY, quadW, 3.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text('2. TRANS. DEFENSIVA (PERDA)', qRightX + 2, qTopY + 2.7);

  const transDefList =
    report.defensiveTransition && report.defensiveTransition.length > 0
      ? report.defensiveTransition
      : ['Reação imediata nos 5 seg pós-perda.', 'Pressionar o portador ou recuar em bloco.'];
  let q2Y = qTopY + 6.5;
  transDefList.slice(0, 2).forEach((txt) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(200, 30, 30);
    doc.text('•', qRightX + 2, q2Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 20, 20);
    const wrapped = doc.splitTextToSize(txt, quadW - 6);
    doc.text(wrapped.slice(0, 2), qRightX + 4.5, q2Y);
    q2Y += wrapped.slice(0, 2).length * 3.2 + 1;
  });

  // Q3: Org. Defensiva
  doc.setFillColor(255, 252, 242);
  doc.roundedRect(qLeftX, qBottomY, quadW, quadH, 1.5, 1.5, 'F');
  doc.setDrawColor(245, 225, 180);
  doc.roundedRect(qLeftX, qBottomY, quadW, quadH, 1.5, 1.5, 'S');
  doc.setFillColor(217, 140, 20);
  doc.rect(qLeftX, qBottomY, quadW, 3.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text('3. ORG. DEFENSIVA (SEM BOLA)', qLeftX + 2, qBottomY + 2.7);

  const defOrgList =
    report.defensiveOrganization && report.defensiveOrganization.length > 0
      ? report.defensiveOrganization
      : ['Linhas compactas e coberturas constantes.', 'Fechar corredor central e orientar para fora.'];
  let q3Y = qBottomY + 6.5;
  defOrgList.slice(0, 2).forEach((txt) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(190, 110, 10);
    doc.text('•', qLeftX + 2, q3Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 30, 10);
    const wrapped = doc.splitTextToSize(txt, quadW - 6);
    doc.text(wrapped.slice(0, 2), qLeftX + 4.5, q3Y);
    q3Y += wrapped.slice(0, 2).length * 3.2 + 1;
  });

  // Q4: Transição Ofensiva
  doc.setFillColor(242, 252, 246);
  doc.roundedRect(qRightX, qBottomY, quadW, quadH, 1.5, 1.5, 'F');
  doc.setDrawColor(180, 230, 200);
  doc.roundedRect(qRightX, qBottomY, quadW, quadH, 1.5, 1.5, 'S');
  doc.setFillColor(16, 140, 70);
  doc.rect(qRightX, qBottomY, quadW, 3.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text('4. TRANS. OFENSIVA (GANHO)', qRightX + 2, qBottomY + 2.7);

  const transOffList =
    report.offensiveTransition && report.offensiveTransition.length > 0
      ? report.offensiveTransition
      : ['Primeiro passe vertical de saída seguro.', 'Ataque à profundidade com apoios velozes.'];
  let q4Y = qBottomY + 6.5;
  transOffList.slice(0, 2).forEach((txt) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(16, 120, 60);
    doc.text('•', qRightX + 2, q4Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 40, 20);
    const wrapped = doc.splitTextToSize(txt, quadW - 6);
    doc.text(wrapped.slice(0, 2), qRightX + 4.5, q4Y);
    q4Y += wrapped.slice(0, 2).length * 3.2 + 1;
  });

  // ==========================================
  // 4. PRELEÇÃO TÉCNICA & DISCURSO DE BALNEÁRIO
  // ALTURA AJUSTADA DINAMICAMENTE AO TEXTO ESCRITO PELO TREINADOR
  // SEM ESPAÇO AZUL VAZIO DESNECESSÁRIO!
  // ==========================================
  const talkBoxY = dashY + dashH + 3.5; // 76.5 + 115 + 3.5 = 195mm

  const talkText =
    report.lockerRoomTalk && report.lockerRoomTalk.trim() !== ''
      ? report.lockerRoomTalk.trim()
      : 'Entrar com coragem, impor o nosso ritmo desde o apito inicial e confiar no trabalho realizado nos treinos. Concentração total em cada duelo, entreajuda permanente e atitude inegociável do primeiro ao último segundo!';

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const talkLines = doc.splitTextToSize(`"${talkText}"`, 172);

  // Altura proporcional e ajustada exatamente ao número de linhas:
  // Header (5.5) + espaçamento (3) + texto (linhas * 4.2) + espaçamento (2.5) + assinatura (3.5) + margem inferior (2.5)
  const exactTalkH = 5.5 + 3 + talkLines.length * 4.2 + 2.5 + 3.5 + 2.5;
  const maxAvailableH = 283.5 - talkBoxY;
  const talkBoxH = Math.min(maxAvailableH, Math.max(24, Math.round(exactTalkH)));

  doc.setFillColor(11, 26, 48);
  doc.roundedRect(12, talkBoxY, 186, talkBoxH, 2, 2, 'F');
  doc.setDrawColor(0, 210, 255);
  doc.setLineWidth(0.5);
  doc.roundedRect(12, talkBoxY, 186, talkBoxH, 2, 2, 'S');

  // Header da Preleção Técnica
  doc.setFillColor(16, 40, 74);
  doc.rect(12, talkBoxY, 186, 5.5, 'F');
  doc.setFillColor(255, 215, 0);
  doc.rect(12, talkBoxY, 3, 5.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 215, 0);
  doc.text('PRELEÇÃO TÉCNICA & DISCURSO DE BALNEÁRIO', 18, talkBoxY + 3.9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(170, 220, 255);
  doc.text('Mensagem Motivacional & Lembretes da Equipa Técnica', 194, talkBoxY + 3.9, { align: 'right' });

  // Barra de citação dourada vertical ajustada à altura do conteúdo
  const barH = Math.max(6, talkBoxH - 13);
  doc.setFillColor(255, 215, 0);
  doc.rect(17, talkBoxY + 7.5, 1.5, barH, 'F');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(245, 250, 255);
  const maxTalkLines = Math.max(1, Math.floor((talkBoxH - 14) / 4.2));
  doc.text(talkLines.slice(0, maxTalkLines), 22, talkBoxY + 11.5);

  // Assinatura do Treinador / Equipa Técnica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 210, 255);
  doc.text(`— A Equipa Técnica • ${myClub}`, 194, talkBoxY + talkBoxH - 2.8, { align: 'right' });

  // ==========================================
  // 5. OBSERVAÇÕES E NOTAS DO JOGO (SE HOUVER ESPAÇO LIVRE INFERIOR)
  // SE A PRELEÇÃO FOR CURTA, PREENCHE O RESTO DA FOLHA COM UM CARTÃO CLARO ELEGANTE
  // ==========================================
  const remY = talkBoxY + talkBoxH + 3;
  const remH = 283.5 - remY;

  if (remH >= 15) {
    doc.setFillColor(250, 252, 255);
    doc.roundedRect(12, remY, 186, remH, 2, 2, 'F');
    doc.setDrawColor(215, 225, 235);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, remY, 186, remH, 2, 2, 'S');

    doc.setFillColor(28, 44, 68);
    doc.rect(12, remY, 186, 4.8, 'F');
    doc.setFillColor(0, 210, 255);
    doc.rect(12, remY, 2.5, 4.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('OBSERVAÇÕES DO JOGO & DIRETRIZES DA EQUIPA', 17, remY + 3.5);

    const notesText =
      report.notes && report.notes.trim() !== ''
        ? report.notes
        : 'Entrar com concentração máxima nos primeiros minutos, cumprir com rigor as funções táticas atribuídas e manter a entreajuda do primeiro ao último lance.';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(40, 50, 60);
    const noteLines = doc.splitTextToSize(notesText, 180);
    const maxNoteLines = Math.max(1, Math.floor((remH - 7) / 3.8));
    doc.text(noteLines.slice(0, maxNoteLines), 16, remY + 8.5);
  }

  // Rodapé Oficial (Página 1 de 1)
  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`PreJogo_${sanitize(myClub)}_vs_${sanitize(opponent)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates an Opponent Scouting Report PDF (Próximo Adversário)
 */
export async function generateOpponentScoutingPDF(scout: OpponentScouting, state: AppState, match?: ScheduledMatch) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const myClub = state.myClubName || 'A Minha Equipa';

  drawDocumentHeader(doc, state, 'RELATÓRIO TÁTICO — PRÓXIMO ADVERSÁRIO');

  let curY = 46;

  const opponent = match?.opponent || scout.opponentName || 'Adversário';
  const matchDate = match?.date || scout.date || '';
  const matchTime = match?.time || scout.time || '';
  const matchLoc = (match?.location || scout.location) === 'casa' ? 'JOGO EM CASA' : 'JOGO FORA';
  const competition = match?.tournamentName
    ? match.tournamentName
    : (match?.type || scout.matchType || 'JOGO OFICIAL').toUpperCase();
  const phase = match?.phase || scout.phase || '';

  // Header Banner for Match & Opponent
  doc.setFillColor(15, 30, 52);
  doc.roundedRect(15, curY, 180, 20, 3, 3, 'F');
  doc.setDrawColor(0, 210, 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, curY, 180, 20, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`VS: ${opponent.toUpperCase()}`, 20, curY + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 210, 255);
  const matchInfoLine = `${competition} ${phase ? '• ' + phase : ''} • ${matchLoc} ${matchDate ? '• ' + matchDate : ''} ${matchTime ? 'às ' + matchTime : ''}${match?.venue ? ' • ' + match.venue : ''}`;
  doc.text(matchInfoLine, 20, curY + 14);

  curY += 25;

  // Box 1: Tática & Sistema
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(15, curY, 87, 34, 2, 2, 'F');
  doc.setDrawColor(200, 220, 235);
  doc.roundedRect(15, curY, 87, 34, 2, 2, 'S');

  doc.setFillColor(24, 48, 80);
  doc.rect(15, curY, 87, 6.5, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(15, curY, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('SISTEMA TÁTICO & DINÂMICA', 20, curY + 4.5);

  doc.setFontSize(8);
  doc.setTextColor(15, 30, 52);
  doc.setFont('helvetica', 'bold');
  doc.text(`Sistema: `, 18, curY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 120, 180);
  const sysLines = doc.splitTextToSize(scout.formation || '4-3-3', 56);
  doc.text(sysLines, 34, curY + 12);

  if (scout.tacticalNotes) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 30, 52);
    doc.text(`Dinâmica: `, 18, curY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 70);
    const dynLines = doc.splitTextToSize(scout.tacticalNotes, 56);
    doc.text(dynLines.slice(0, 2), 34, curY + 20);
  }

  // Box 2: Jogador Chave
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(108, curY, 87, 34, 2, 2, 'F');
  doc.setDrawColor(200, 220, 235);
  doc.roundedRect(108, curY, 87, 34, 2, 2, 'S');

  doc.setFillColor(217, 164, 65);
  doc.rect(108, curY, 87, 6.5, 'F');
  doc.setFillColor(255, 235, 120);
  doc.rect(108, curY, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 30, 52);
  doc.text('JOGADOR CHAVE ADVERSÁRIO', 113, curY + 4.5);

  doc.setFontSize(8);
  doc.setTextColor(15, 30, 52);
  doc.setFont('helvetica', 'bold');
  const kpName = scout.keyPlayer?.name
    ? `${scout.keyPlayer.name} ${scout.keyPlayer.number ? '(Nº ' + scout.keyPlayer.number + ')' : ''}`
    : 'Não especificado';
  doc.text(`Atleta: `, 111, curY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 100, 0);
  doc.text(kpName, 126, curY + 12);

  if (scout.keyPlayer?.positions) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 30, 52);
    doc.text(`Posição: `, 111, curY + 17);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 70);
    doc.text(scout.keyPlayer.positions, 126, curY + 17);
  }

  if (scout.keyPlayer?.threats) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 30, 52);
    doc.text(`Perigo: `, 111, curY + 22);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 70);
    const threatLines = doc.splitTextToSize(scout.keyPlayer.threats, 64);
    doc.text(threatLines.slice(0, 2), 126, curY + 22);
  }

  curY += 38;

  // Box 3: Pontos Fortes
  doc.setFillColor(242, 252, 246);
  doc.roundedRect(15, curY, 87, 44, 2, 2, 'F');
  doc.setDrawColor(180, 230, 200);
  doc.roundedRect(15, curY, 87, 44, 2, 2, 'S');

  doc.setFillColor(16, 140, 70);
  doc.rect(15, curY, 87, 6.5, 'F');
  doc.setFillColor(100, 255, 180);
  doc.rect(15, curY, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PONTOS FORTES (Atenção redobrada)', 20, curY + 4.5);

  let strongY = curY + 11;
  doc.setFontSize(7.5);
  doc.setTextColor(20, 50, 30);
  const strengthsList =
    scout.strengths && scout.strengths.length > 0 ? scout.strengths : ['Sem pontos fortes registados'];
  strengthsList.slice(0, 4).forEach((str) => {
    doc.setFont('helvetica', 'bold');
    doc.text('•', 18, strongY);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(str, 80);
    doc.text(lines, 21, strongY);
    strongY += lines.length * 4 + 1;
  });

  // Box 4: Pontos Fracos
  doc.setFillColor(254, 245, 245);
  doc.roundedRect(108, curY, 87, 44, 2, 2, 'F');
  doc.setDrawColor(245, 190, 190);
  doc.roundedRect(108, curY, 87, 44, 2, 2, 'S');

  doc.setFillColor(210, 40, 40);
  doc.rect(108, curY, 87, 6.5, 'F');
  doc.setFillColor(255, 160, 160);
  doc.rect(108, curY, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PONTOS FRACOS (Oportunidades a explorar)', 113, curY + 4.5);

  let weakY = curY + 11;
  doc.setFontSize(7.5);
  doc.setTextColor(60, 20, 20);
  const weakList =
    scout.weaknesses && scout.weaknesses.length > 0 ? scout.weaknesses : ['Sem pontos fracos registados'];
  weakList.slice(0, 4).forEach((wk) => {
    doc.setFont('helvetica', 'bold');
    doc.text('•', 111, weakY);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(wk, 80);
    doc.text(lines, 114, weakY);
    weakY += lines.length * 4 + 1;
  });

  curY += 48;

  // Box 5: Plano de Jogo da Nossa Equipa
  doc.setFillColor(240, 248, 255);
  doc.roundedRect(15, curY, 180, 28, 2, 2, 'F');
  doc.setDrawColor(180, 215, 245);
  doc.roundedRect(15, curY, 180, 28, 2, 2, 'S');

  doc.setFillColor(0, 140, 220);
  doc.rect(15, curY, 180, 6.5, 'F');
  doc.setFillColor(150, 220, 255);
  doc.rect(15, curY, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PLANO ESTRATÉGICO — COMO VENCER O JOGO', 20, curY + 4.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 30, 52);
  const gpLines = doc.splitTextToSize(
    scout.gamePlan || 'Foco nas transições rápidas, rigor tático nas bolas paradas e pressão organizada.',
    174
  );
  doc.text(gpLines.slice(0, 4), 18, curY + 12);

  curY += 32;

  // Box 6: Notas e Observações Gerais
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(15, curY, 180, 32, 2, 2, 'F');
  doc.setDrawColor(215, 225, 235);
  doc.roundedRect(15, curY, 180, 32, 2, 2, 'S');

  doc.setFillColor(40, 55, 75);
  doc.rect(15, curY, 180, 6.5, 'F');
  doc.setFillColor(0, 210, 255);
  doc.rect(15, curY, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('NOTAS, OBSERVAÇÕES & BOLAS PARADAS', 20, curY + 4.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 40, 50);

  let notesText = '';
  if (scout.setPiecesNotes) notesText += `[Bolas Paradas]: ${scout.setPiecesNotes}\n`;
  if (scout.tacticalNotes) notesText += `[Dinâmica]: ${scout.tacticalNotes}\n`;
  if (scout.notes) notesText += `[Observações]: ${scout.notes}`;
  if (!notesText) notesText = 'Sem observações adicionais registadas.';

  const noteLines = doc.splitTextToSize(notesText, 174);
  doc.text(noteLines.slice(0, 5), 18, curY + 11);

  addBolaComVisaoPageFooters(doc);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Scouting_${sanitize(myClub)}_vs_${sanitize(scout.opponentName)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
