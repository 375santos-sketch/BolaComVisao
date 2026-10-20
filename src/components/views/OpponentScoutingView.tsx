import React, { useState, useEffect, useMemo } from 'react';
import { AppState, OpponentScouting, ScheduledMatch, KeyPlayerInfo, TacticalPitchPlayer } from '../../types';
import { t } from '../../i18n/dict';
import { uid } from '../../lib/utils';
import { Header } from '../Header';

interface OpponentScoutingViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowToast: (msg: string) => void;
  targetOpponentId?: string;
}

// Predefinições de Futebol de 7 para o Relvado Tático
export const SEVEN_A_SIDE_PRESETS: Record<string, TacticalPitchPlayer[]> = {
  '2-3-1': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 24, y: 68 },
    { id: 'p3', role: 'DD', name: 'Defesa Dir.', x: 76, y: 68 },
    { id: 'p4', role: 'ME', name: 'Ala / Médio Esq.', x: 18, y: 44 },
    { id: 'p5', role: 'MC', name: 'Médio Centro', x: 50, y: 46 },
    { id: 'p6', role: 'MD', name: 'Ala / Médio Dir.', x: 82, y: 44 },
    { id: 'p7', role: 'PL', name: 'Avançado', x: 50, y: 18 }
  ],
  '3-2-1': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 20, y: 68 },
    { id: 'p3', role: 'DC', name: 'Defesa Central', x: 50, y: 72 },
    { id: 'p4', role: 'DD', name: 'Defesa Dir.', x: 80, y: 68 },
    { id: 'p5', role: 'MC', name: 'Médio Esq.', x: 35, y: 44 },
    { id: 'p6', role: 'MC', name: 'Médio Dir.', x: 65, y: 44 },
    { id: 'p7', role: 'PL', name: 'Avançado', x: 50, y: 18 }
  ],
  '2-1-2-1': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 26, y: 70 },
    { id: 'p3', role: 'DD', name: 'Defesa Dir.', x: 74, y: 70 },
    { id: 'p4', role: 'MDF', name: 'Médio Defensivo', x: 50, y: 56 },
    { id: 'p5', role: 'ME', name: 'Ala Esq.', x: 20, y: 38 },
    { id: 'p6', role: 'MD', name: 'Ala Dir.', x: 80, y: 38 },
    { id: 'p7', role: 'PL', name: 'Avançado', x: 50, y: 18 }
  ],
  '3-1-2': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 20, y: 68 },
    { id: 'p3', role: 'DC', name: 'Defesa Central', x: 50, y: 72 },
    { id: 'p4', role: 'DD', name: 'Defesa Dir.', x: 80, y: 68 },
    { id: 'p5', role: 'MC', name: 'Médio Centro', x: 50, y: 46 },
    { id: 'p6', role: 'AV', name: 'Avançado Esq.', x: 35, y: 18 },
    { id: 'p7', role: 'AV', name: 'Avançado Dir.', x: 65, y: 18 }
  ],
  '2-2-2': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DE', name: 'Defesa Esq.', x: 26, y: 70 },
    { id: 'p3', role: 'DD', name: 'Defesa Dir.', x: 74, y: 70 },
    { id: 'p4', role: 'ME', name: 'Médio Esq.', x: 30, y: 45 },
    { id: 'p5', role: 'MD', name: 'Médio Dir.', x: 70, y: 45 },
    { id: 'p6', role: 'AV', name: 'Avançado Esq.', x: 35, y: 18 },
    { id: 'p7', role: 'AV', name: 'Avançado Dir.', x: 65, y: 18 }
  ],
  '1-3-2': [
    { id: 'p1', role: 'GR', name: 'GR', x: 50, y: 88 },
    { id: 'p2', role: 'DC', name: 'Defesa Central', x: 50, y: 70 },
    { id: 'p3', role: 'ME', name: 'Ala Esq.', x: 18, y: 45 },
    { id: 'p4', role: 'MC', name: 'Médio Centro', x: 50, y: 46 },
    { id: 'p5', role: 'MD', name: 'Ala Dir.', x: 82, y: 45 },
    { id: 'p6', role: 'AV', name: 'Avançado Esq.', x: 35, y: 18 },
    { id: 'p7', role: 'AV', name: 'Avançado Dir.', x: 65, y: 18 }
  ]
};

export const COMMON_ROLES = ['GR', 'DC', 'DE', 'DD', 'MDF', 'MC', 'MO', 'ME', 'MD', 'ALA', 'EXT', 'PL', 'AV'];

export function formatMatchCompetition(match?: ScheduledMatch | null): string {
  if (!match) return 'Campeonato';
  const typeMap: Record<string, string> = {
    campeonato: 'Campeonato',
    torneio: match.tournamentName ? `Torneio: ${match.tournamentName}` : 'Torneio',
    amigavel: 'Jogo Amigável'
  };
  const baseType = typeMap[match.type] || match.type || 'Campeonato';
  if (match.phase && match.phase.trim()) {
    if (match.phase.toLowerCase().includes(baseType.toLowerCase())) {
      return match.phase;
    }
    return `${baseType} - ${match.phase}`;
  }
  return baseType;
}

export function getEffectiveTacticalPitch(scout?: OpponentScouting | null): TacticalPitchPlayer[] {
  if (scout?.ourTacticalPitch && Array.isArray(scout.ourTacticalPitch) && scout.ourTacticalPitch.length === 7) {
    return scout.ourTacticalPitch;
  }
  const formKey = scout?.ourFormation || '2-3-1';
  return SEVEN_A_SIDE_PRESETS[formKey] || SEVEN_A_SIDE_PRESETS['2-3-1'];
}

function createDefaultScoutingReport(match?: ScheduledMatch, myClubStadium?: string): OpponentScouting {
  const compFormatted = match ? formatMatchCompetition(match) : 'Jornada';
  return {
    id: match ? `scout-${match.id}` : 'temp-scout-default',
    matchId: match?.id,
    opponentName: match?.opponent || 'Próximo Adversário',
    date: match?.date || '2026-09-19',
    time: match?.time || '10:30',
    location: match?.location || 'casa',
    matchType: match?.type || 'campeonato',
    phase: compFormatted,
    stadium: match?.venue || (match?.location === 'casa' ? (myClubStadium || 'Campo Municipal') : 'Campo Adversário'),
    ourFormation: '2-3-1',
    ourPlayingModel: 'Pressão Alta e Domínio Posicional',
    ourDefensiveBlock: 'medio',
    ourTacticalPitch: SEVEN_A_SIDE_PRESETS['2-3-1'],
    formation: '2-3-1',
    playingStyle: 'Bloco Médio com transições rápidas pelas alas',
    strengths: ['Transições rápidas', 'Bolas paradas ofensivas fortes ao 1º poste'],
    weaknesses: ['Espaço nas costas dos defesas', 'Dificuldade na saída sob pressão alta'],
    keyPlayer: { name: '', number: undefined, positions: '', dominantFoot: 'Direito', threats: '', howToStop: '' },
    tacticalNotes: '',
    setPiecesNotes: '',
    gamePlan: '',
    notes: '',
    updatedAt: 0
  };
}

export const OpponentScoutingView: React.FC<OpponentScoutingViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowToast,
  targetOpponentId
}) => {
  const scoutingList: OpponentScouting[] = state.opponentScouting || [];
  const scheduleList: ScheduledMatch[] = state.schedule || [];
  const myClubName = state.myClubName || 'A Minha Equipa';

  // Jogos da Agenda que ainda não têm um relatório de scouting associado
  const availableScheduledMatches: ScheduledMatch[] = useMemo(() => {
    const linkedMatchIds = new Set(scoutingList.map((s) => s.matchId).filter(Boolean));
    return scheduleList
      .filter((m) => !linkedMatchIds.has(m.id))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [scheduleList, scoutingList]);

  // Determine active report
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const currentScout: OpponentScouting = useMemo(() => {
    if (targetOpponentId) {
      const found = scoutingList.find((s) => s.id === targetOpponentId || s.matchId === targetOpponentId);
      if (found) return found;
    }
    if (selectedReportId) {
      const found = scoutingList.find((s) => s.id === selectedReportId);
      if (found) return found;
    }
    if (scoutingList.length > 0) {
      return scoutingList[0];
    }
    // Fallback if no report in state: create a virtual report from next match so the pitch image NEVER disappears
    const nextMatch = scheduleList[0];
    return createDefaultScoutingReport(nextMatch, state.myClubStadium);
  }, [scoutingList, targetOpponentId, selectedReportId, scheduleList, state.myClubStadium]);

  const setActiveReportId = (id: string) => setSelectedReportId(id);

  // Match from Agenda associated with the current scouting report (if any)
  const linkedMatch: ScheduledMatch | undefined = useMemo(() => {
    if (!currentScout) return undefined;
    return scheduleList.find(
      (m) =>
        m.id === currentScout.matchId ||
        (m.opponent && currentScout.opponentName && m.opponent.trim().toLowerCase() === currentScout.opponentName.trim().toLowerCase())
    );
  }, [scheduleList, currentScout]);

  // Standalone reports (not linked to any current scheduled match)
  const standaloneReports: OpponentScouting[] = useMemo(() => {
    return scoutingList.filter((s) => !s.matchId || !scheduleList.some((m) => m.id === s.matchId));
  }, [scoutingList, scheduleList]);

  const [newCustomStrength, setNewCustomStrength] = useState<string>('');
  const [newCustomWeakness, setNewCustomWeakness] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const isFinalized = Boolean(currentScout?.scoutingFinalized);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const isEditing = Boolean(currentScout && editingReportId === currentScout.id);

  const handleFinalizeScouting = () => {
    if (!currentScout) return;
    const now = Date.now();
    const updatedScouting = scoutingList.map((s) => {
      if (s.id === currentScout.id) {
        return {
          ...s,
          scoutingFinalized: true,
          scoutingFinalizedAt: now,
          updatedAt: now
        };
      }
      return s;
    });

    let updatedSchedule = scheduleList;
    if (currentScout.matchId) {
      updatedSchedule = scheduleList.map((m) => {
        if (m.id === currentScout.matchId) {
          return {
            ...m,
            scoutingFinalized: true,
            scoutingFinalizedAt: now
          };
        }
        return m;
      });
    }

    onUpdateState({
      opponentScouting: updatedScouting,
      schedule: updatedSchedule
    });
    setEditingReportId(null);
    onShowToast('Scouting do Adversário finalizado com sucesso! ✓');
  };

  const handleStartEditingScouting = () => {
    if (currentScout) {
      setEditingReportId(currentScout.id);
    }
    onShowToast('Modo de edição do Adversário ativado ✓');
  };

  // Ensure default report exists if empty and cleanup dummy 'Adversário 1'
  useEffect(() => {
    if (state.opponentScouting && state.opponentScouting.some((s) => s.opponentName === 'Adversário 1')) {
      const cleaned = state.opponentScouting.filter((s) => s.opponentName !== 'Adversário 1');
      if (cleaned.length === 0 && scheduleList.length > 0) {
        const initialReport = {
          ...createDefaultScoutingReport(scheduleList[0], state.myClubStadium),
          id: uid(),
          updatedAt: Date.now()
        };
        onUpdateState({ opponentScouting: [initialReport] });
      } else {
        onUpdateState({ opponentScouting: cleaned });
      }
    } else if (!state.opponentScouting || state.opponentScouting.length === 0) {
      const nextMatch = scheduleList[0];
      const initialReport = {
        ...createDefaultScoutingReport(nextMatch, state.myClubStadium),
        id: uid(),
        updatedAt: Date.now()
      };
      onUpdateState({ opponentScouting: [initialReport] });
    }
  }, [state.opponentScouting, scheduleList, state.myClubStadium, onUpdateState]);

  // Clean standalone reports created by user (excluding dummy 'Adversário 1')
  const customBlankReports: OpponentScouting[] = useMemo(() => {
    return scoutingList.filter(
      (s) =>
        s.opponentName !== 'Adversário 1' &&
        (!s.matchId || !scheduleList.some((m) => m.id === s.matchId))
    );
  }, [scoutingList, scheduleList]);

  // Update current active report helper
  const handleUpdateCurrentReport = (fields: Partial<OpponentScouting>) => {
    if (!currentScout) return;
    const updated = scoutingList.map((s) => {
      if (s.id === currentScout.id) {
        return { ...s, ...fields, updatedAt: Date.now() };
      }
      return s;
    });
    onUpdateState({ opponentScouting: updated });
  };

  // Create new scouting report
  const handleCreateNewCustomReport = () => {
    const newReport: OpponentScouting = {
      id: uid(),
      opponentName: 'Adversário (em branco)',
      date: new Date().toISOString().slice(0, 10),
      time: '10:30',
      location: 'casa',
      matchType: 'campeonato',
      phase: 'Jornada',
      ourFormation: '2-3-1',
      ourPlayingModel: 'Pressão Alta e Domínio Posicional',
      ourDefensiveBlock: 'medio',
      ourTacticalPitch: SEVEN_A_SIDE_PRESETS['2-3-1'],
      formation: '2-3-1',
      playingStyle: 'Bloco Médio',
      strengths: ['Transições rápidas'],
      weaknesses: ['Espaço entrelinhas'],
      keyPlayer: { name: '', number: undefined, positions: '', dominantFoot: 'Direito', threats: '', howToStop: '' },
      tacticalNotes: '',
      setPiecesNotes: '',
      gamePlan: '',
      notes: '',
      updatedAt: Date.now()
    };

    const updated = [newReport, ...scoutingList];
    onUpdateState({ opponentScouting: updated });
    setActiveReportId(newReport.id);
    onShowToast(`Novo relatório de scouting do adversário criado ✓`);
  };

  // Create a new scouting report pre-preenchido a partir de um jogo agendado na Agenda
  const handleCreateReportFromMatch = (matchId: string) => {
    const match = scheduleList.find((m) => m.id === matchId);
    if (!match) return;

    const compFormatted = formatMatchCompetition(match);

    const newReport: OpponentScouting = {
      id: uid(),
      matchId: match.id,
      opponentName: match.opponent || `Adversário ${scoutingList.length + 1}`,
      date: match.date || '',
      time: match.time || '10:30',
      location: match.location || 'casa',
      matchType: match.type || 'campeonato',
      phase: compFormatted,
      stadium: match.venue || (match.location === 'casa' ? (state.myClubStadium || 'Campo Municipal') : 'Campo Adversário'),
      ourFormation: '2-3-1',
      ourPlayingModel: 'Pressão Alta e Domínio Posicional',
      ourDefensiveBlock: 'medio',
      ourTacticalPitch: SEVEN_A_SIDE_PRESETS['2-3-1'],
      formation: '2-3-1',
      playingStyle: 'Bloco Médio com transições rápidas pelas alas',
      strengths: ['Transições rápidas', 'Bolas paradas ofensivas fortes ao 1º poste'],
      weaknesses: ['Espaço nas costas dos defesas', 'Dificuldade na saída sob pressão alta'],
      keyPlayer: { name: '', number: undefined, positions: '', dominantFoot: 'Direito', threats: '', howToStop: '' },
      tacticalNotes: '',
      setPiecesNotes: '',
      gamePlan: '',
      notes: '',
      updatedAt: Date.now()
    };

    const updated = [newReport, ...scoutingList];
    onUpdateState({ opponentScouting: updated });
    setActiveReportId(newReport.id);
    onShowToast(`Relatório de scouting criado a partir do jogo vs ${match.opponent}! 📅`);
  };

  // Sync current report with data from the linked match in Agenda (Nome, Data, Hora, Local, Campo, Competição)
  const handleSyncWithAgendaMatch = (matchId?: string) => {
    if (!currentScout) return;
    const targetMatchId = matchId || currentScout.matchId;
    const match = scheduleList.find(
      (m) =>
        m.id === targetMatchId ||
        (m.opponent && currentScout.opponentName && m.opponent.trim().toLowerCase() === currentScout.opponentName.trim().toLowerCase())
    );
    if (!match) {
      onShowToast('Nenhum jogo correspondente encontrado na Agenda.');
      return;
    }

    const compFormatted = formatMatchCompetition(match);

    handleUpdateCurrentReport({
      matchId: match.id,
      opponentName: match.opponent,
      date: match.date,
      time: match.time || '10:30',
      location: match.location || 'casa',
      matchType: match.type || 'campeonato',
      phase: compFormatted,
      stadium: match.venue || (match.location === 'casa' ? (state.myClubStadium || 'Campo Municipal') : 'Campo Adversário')
    });

    onShowToast(`Informação do jogo vs ${match.opponent} importada da Agenda com sucesso! 📅✓`);
  };

  // Delete current scouting report
  const handleDeleteCurrentReport = () => {
    if (!currentScout) return;
    const remaining = scoutingList.filter((s) => s.id !== currentScout.id);
    onUpdateState({ opponentScouting: remaining });
    if (remaining.length > 0) {
      setActiveReportId(remaining[0].id);
    } else {
      setActiveReportId('none');
    }
    setShowDeleteModal(false);
    onShowToast('Relatório de scouting do adversário removido com sucesso ✓');
  };

  // Export PDF for OPPONENT SCOUTING
  const handleExportOpponentPDF = async () => {
    if (!currentScout) return;
    const linkedMatch = scheduleList.find(
      (m) => m.id === currentScout.matchId || m.opponent.toLowerCase() === currentScout.opponentName.toLowerCase()
    );
    try {
      const { generateOpponentScoutingPDF } = await import('../../lib/pdfUtils');
      generateOpponentScoutingPDF(currentScout, state, linkedMatch);
      onShowToast('PDF de Scouting do Adversário gerado com sucesso! 📄✓');
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao gerar PDF de Scouting.');
    }
  };

  // Share Opponent Scouting on WhatsApp
  const handleShareOpponentWhatsApp = () => {
    if (!currentScout) return;
    const opp = currentScout.opponentName || 'Adversário';
    const dateFmt = currentScout.date ? currentScout.date.split('-').reverse().join('/') : '';
    const loc = currentScout.location === 'casa' ? 'Em Casa 🏟️' : 'Fora ✈️';

    let msg = `🛡️ *RELATÓRIO DE SCOUTING — ADVERSÁRIO*\n`;
    msg += `⚽ *${myClubName}* vs *${opp}*\n`;
    if (dateFmt) msg += `📅 *Data:* ${dateFmt} às ${currentScout.time || ''}h | ${loc}\n`;
    if (currentScout.stadium) msg += `🏟️ *Campo:* ${currentScout.stadium}\n`;
    msg += `\n`;

    msg += `⚡ *SISTEMA & DINÂMICA DO ADVERSÁRIO:*\n`;
    msg += `• Formação: ${currentScout.formation || 'A definir'}\n`;
    if (currentScout.playingStyle) msg += `• Estilo de Jogo: ${currentScout.playingStyle}\n`;
    if (currentScout.tacticalNotes) msg += `• Dinâmica: ${currentScout.tacticalNotes}\n`;
    msg += `\n`;

    if (currentScout.keyPlayer?.name) {
      msg += `⭐ *JOGADOR CHAVE DO ADVERSÁRIO:*\n`;
      msg += `• Atleta: ${currentScout.keyPlayer.name} ${currentScout.keyPlayer.number ? `(#${currentScout.keyPlayer.number})` : ''}\n`;
      if (currentScout.keyPlayer.positions) msg += `• Posição: ${currentScout.keyPlayer.positions}\n`;
      if (currentScout.keyPlayer.dominantFoot) msg += `• Pé Dominante: ${currentScout.keyPlayer.dominantFoot}\n`;
      if (currentScout.keyPlayer.threats) msg += `• Perigo: ${currentScout.keyPlayer.threats}\n`;
      if (currentScout.keyPlayer.howToStop) msg += `• Como Anular: ${currentScout.keyPlayer.howToStop}\n`;
      msg += `\n`;
    }

    if (currentScout.strengths && currentScout.strengths.length > 0) {
      msg += `🟢 *PONTOS FORTES (ATENÇÃO):*\n`;
      currentScout.strengths.forEach((s) => {
        msg += `• ${s}\n`;
      });
      msg += `\n`;
    }

    if (currentScout.weaknesses && currentScout.weaknesses.length > 0) {
      msg += `🔴 *PONTOS FRACOS (A EXPLORAR):*\n`;
      currentScout.weaknesses.forEach((w) => {
        msg += `• ${w}\n`;
      });
      msg += `\n`;
    }

    if (currentScout.gamePlan) {
      msg += `🎯 *ESTRATÉGIA PARA ANULAR O ADVERSÁRIO:*\n${currentScout.gamePlan}\n\n`;
    }

    if (currentScout.setPiecesNotes) {
      msg += `🚩 *BOLAS PARADAS DO ADVERSÁRIO:*\n${currentScout.setPiecesNotes}\n\n`;
    }

    if (currentScout.notes) {
      msg += `📝 *OBSERVAÇÕES:*\n${currentScout.notes}\n\n`;
    }

    msg += `_BolaComVisão — Gestão de Plantel_`;

    navigator.clipboard
      .writeText(msg)
      .then(() => onShowToast('Scouting do adversário copiado para WhatsApp! 💬✓'))
      .catch(() => onShowToast('Erro ao copiar para WhatsApp.'));
  };

  return (
    <div className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] animate-fadeIn">
      <Header
        title="O Adversário (Scouting)"
        subtitle="Análise do oponente, jogador chave, pontos fortes, vulnerabilidades e estratégias de anulação"
        onOpenSettings={onOpenSettings}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
      />

      {/* TOP CONTEXT & ACTION BAR */}
      <div className="card mb-4 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-cyan-500/30 p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 font-bold text-xl shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-['Chakra_Petch'] font-black uppercase text-white tracking-wider">
                  Relatório de Scouting & Análise do Oponente
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold">
                  SCOUTING
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Dossiê tático sobre o adversário, pontos vulneráveis e marcação a jogadores chave
              </p>
            </div>
          </div>

          {/* Action Buttons: Finalize, PDF, WhatsApp, Switch to Our Team */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {isFinalized && !isEditing ? (
              <button
                type="button"
                onClick={handleStartEditingScouting}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Reabrir Scouting do Adversário para edição"
              >
                <span>✏️</span>
                <span>Editar Adversário</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizeScouting}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Finalizar Análise e Scouting do Adversário"
              >
                <span>✓</span>
                <span>Finalizar Adversário</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportOpponentPDF}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all flex items-center gap-2 active:scale-95"
              title="Gerar PDF Oficial de Scouting do Adversário"
            >
              <span>📄</span>
              <span>Gerar PDF Scouting</span>
            </button>

            <button
              type="button"
              onClick={handleShareOpponentWhatsApp}
              className="px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1.5 shadow-sm"
              title="Copiar Scouting do Adversário formatado para WhatsApp"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('prejogo', currentScout?.id)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1.5"
              title="Ir para o menu de A Nossa Equipa (Plano Pré-Jogo)"
            >
              <span>⚡</span>
              <span>A nossa equipa ➔</span>
            </button>
          </div>
        </div>

        {/* Opponent Selector Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-xs font-mono text-amber-400 font-bold whitespace-nowrap">
              ADVERSÁRIO EM ANÁLISE:
            </span>
            <select
              value={currentScout ? currentScout.id : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__blank__') {
                  handleCreateNewCustomReport();
                } else if (val.startsWith('create_match:')) {
                  const mId = val.replace('create_match:', '');
                  handleCreateReportFromMatch(mId);
                } else if (val) {
                  setActiveReportId(val);
                }
              }}
              className="bg-slate-950 border border-amber-500/50 text-amber-300 font-['Chakra_Petch'] font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400 cursor-pointer shadow-md min-w-[260px] max-w-full truncate"
            >
              {scheduleList.length > 0 && (
                <optgroup label="📅 JOGOS DA AGENDA">
                  {scheduleList.map((m) => {
                    const linkedReport = scoutingList.find(
                      (s) =>
                        s.matchId === m.id ||
                        (s.opponentName && s.opponentName.trim().toLowerCase() === m.opponent.trim().toLowerCase())
                    );
                    const dateStr = m.date ? m.date.split('-').reverse().join('/') : '';
                    return (
                      <option
                        key={`sched-${m.id}`}
                        value={linkedReport ? linkedReport.id : `create_match:${m.id}`}
                      >
                        vs {m.opponent}{dateStr ? ` (${dateStr})` : ''}
                      </option>
                    );
                  })}
                </optgroup>
              )}

              {customBlankReports.length > 0 && (
                <optgroup label="✏️ RELATÓRIOS CRIADOS">
                  {customBlankReports.map((scout) => (
                    <option key={`scout-${scout.id}`} value={scout.id}>
                      🛡️ {scout.opponentName} {scout.date ? `(${scout.date.split('-').reverse().join('/')})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}

              <option value="__blank__">✏️ + Criar Relatório em Branco...</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {currentScout && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/50 border border-rose-500/40 transition-colors"
              >
                <span>🗑️</span>
                <span>Apagar Relatório</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scouting Finalization Banner */}
      {isFinalized && !isEditing ? (
        <div className="card mb-4 p-3.5 bg-emerald-950/70 border-emerald-500/50 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl shrink-0">✅</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-['Chakra_Petch'] font-black uppercase tracking-wider text-emerald-300">
                    Análise do Adversário Finalizada
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    {currentScout.opponentName}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5">
                  O relatório de scouting e pontos vulneráveis do adversário está concluído. Clica em "Editar" se precisares de efetuar alterações.
                  {currentScout.scoutingFinalizedAt
                    ? ` • Finalizado a ${new Date(currentScout.scoutingFinalizedAt).toLocaleDateString('pt-PT')} às ${new Date(currentScout.scoutingFinalizedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartEditingScouting}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0 cursor-pointer"
              title="Reabrir relatório de scouting para edição"
            >
              <span>✏️</span>
              <span>Editar Adversário</span>
            </button>
          </div>
        </div>
      ) : isFinalized && isEditing ? (
        <div className="card mb-4 p-3.5 bg-amber-950/70 border-amber-500/50 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl shrink-0">✏️</span>
              <div>
                <span className="text-xs font-['Chakra_Petch'] font-black uppercase tracking-wider text-amber-300">
                  Modo de Edição Ativo (Adversário)
                </span>
                <div className="text-[11px] text-amber-400/80 font-mono mt-0.5">
                  Podes ajustar sistema tático rival, pontos fortes, pontos fracos e marcações. Quando concluíres, clica em "Finalizar".
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinalizeScouting}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0 cursor-pointer"
              title="Concluir e finalizar Scouting"
            >
              <span>✓</span>
              <span>Finalizar Adversário</span>
            </button>
          </div>
        </div>
      ) : null}

      {currentScout ? (
        <div className="space-y-4">
          {/* 1. DADOS DO JOGO & ADVERSÁRIO */}
          <div className="card bg-slate-900 border-amber-500/30 p-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏟️</span>
                <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-white tracking-wider">
                  Dados do Confronto & Informação do Adversário
                </h3>
              </div>

              {linkedMatch && (
                <button
                  type="button"
                  onClick={() => handleSyncWithAgendaMatch(linkedMatch.id)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1.5 active:scale-95"
                  title="Atualizar Nome do Adversário, Data, Hora, Local e Competição da Agenda"
                >
                  <span>🔄</span>
                  <span>Sincronizar da Agenda</span>
                </button>
              )}
            </div>

            {/* Sincronização / Ligação à Agenda */}
            {linkedMatch ? (
              <div className="mb-3.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-900 border border-amber-500/40 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <div className="text-xs font-mono">
                    <span className="text-amber-400 font-bold">Ligado ao Jogo da Agenda:</span>{' '}
                    <span className="text-white font-bold">vs {linkedMatch.opponent}</span>{' '}
                    <span className="text-slate-400">
                      • {linkedMatch.date.split('-').reverse().join('/')} às {linkedMatch.time || '10:30'}h ({linkedMatch.location === 'casa' ? 'Casa' : 'Fora'} - {formatMatchCompetition(linkedMatch)})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSyncWithAgendaMatch(linkedMatch.id)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-['Chakra_Petch'] font-bold uppercase transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span>🔄</span>
                  <span>Recarregar Dados da Agenda</span>
                </button>
              </div>
            ) : scheduleList.length > 0 ? (
              <div className="mb-3.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-base">ℹ️</span>
                  <span className="text-xs font-mono text-slate-400">
                    Relatório não associado à Agenda. Desejas importar dados de um jogo agendado?
                  </span>
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleSyncWithAgendaMatch(e.target.value);
                  }}
                  className="bg-slate-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-xl px-2.5 py-1 font-['Chakra_Petch'] font-bold cursor-pointer"
                >
                  <option value="" disabled>
                    📅 Importar de Jogo da Agenda...
                  </option>
                  {scheduleList.map((m) => (
                    <option key={m.id} value={m.id}>
                      vs {m.opponent} ({m.date.split('-').reverse().join('/')} - {formatMatchCompetition(m)})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Nome do Adversário:</label>
                <input
                  type="text"
                  value={currentScout.opponentName}
                  onChange={(e) => handleUpdateCurrentReport({ opponentName: e.target.value })}
                  placeholder="Ex: CF Os Belenenses"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Data & Hora:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={currentScout.date || ''}
                    onChange={(e) => handleUpdateCurrentReport({ date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                  <input
                    type="time"
                    value={currentScout.time || ''}
                    onChange={(e) => handleUpdateCurrentReport({ time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Local / Campo:</label>
                <div className="flex gap-2">
                  <select
                    value={currentScout.location || 'casa'}
                    onChange={(e) => handleUpdateCurrentReport({ location: e.target.value as any })}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                  >
                    <option value="casa">Casa 🏟️</option>
                    <option value="fora">Fora ✈️</option>
                  </select>
                  <input
                    type="text"
                    value={currentScout.stadium || ''}
                    onChange={(e) => handleUpdateCurrentReport({ stadium: e.target.value })}
                    placeholder="Estádio/Recinto"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Competição / Fase:</label>
                <input
                  type="text"
                  value={currentScout.phase || ''}
                  onChange={(e) => handleUpdateCurrentReport({ phase: e.target.value })}
                  placeholder="Ex: Campeonato - Jornada 5"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* 2. SISTEMA TÁTICO DO ADVERSÁRIO & JOGADOR CHAVE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Sistema Tático do Adversário */}
            <div className="lg:col-span-6 card bg-slate-900 border-amber-500/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-white tracking-wider">
                    Sistema Tático & Dinâmicas do Adversário
                  </h3>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-amber-400 block mb-1 font-bold">
                  Formação Base Típica:
                </label>
                <input
                  type="text"
                  value={currentScout.formation || '2-3-1'}
                  onChange={(e) => handleUpdateCurrentReport({ formation: e.target.value })}
                  placeholder="Ex: 2-3-1, 3-2-1, 4-3-3, 4-4-2"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold font-mono focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-amber-400 block mb-1 font-bold">
                  Estilo de Jogo do Rival:
                </label>
                <input
                  type="text"
                  value={currentScout.playingStyle || ''}
                  onChange={(e) => handleUpdateCurrentReport({ playingStyle: e.target.value })}
                  placeholder="Ex: Bloco Médio com saídas rápidas pelas alas / Futebol direto no ponta de lança"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-amber-400 block mb-1 font-bold">
                  Comportamentos & Dinâmica Tática:
                </label>
                <textarea
                  rows={3}
                  value={currentScout.tacticalNotes || ''}
                  onChange={(e) => handleUpdateCurrentReport({ tacticalNotes: e.target.value })}
                  placeholder="Ex: Como constroem a partir de trás, onde pressionam, como se comportam em vantagem ou desvantagem..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:border-amber-400"
                />
              </div>
            </div>

            {/* Jogador Chave do Adversário */}
            <div className="lg:col-span-6 card bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900/90 border-amber-500/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-amber-400 tracking-wider">
                  Jogador Chave do Adversário (Atenção Redobrada)
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Nome do Atleta:</label>
                  <input
                    type="text"
                    value={currentScout.keyPlayer?.name || ''}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        keyPlayer: { ...currentScout.keyPlayer, name: e.target.value }
                      })
                    }
                    placeholder="Ex: Bernardo Silva"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Número (Dorsal):</label>
                  <input
                    type="text"
                    value={currentScout.keyPlayer?.number || ''}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        keyPlayer: { ...currentScout.keyPlayer, number: e.target.value }
                      })
                    }
                    placeholder="Ex: 10"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Posição / Setor:</label>
                  <input
                    type="text"
                    value={currentScout.keyPlayer?.positions || ''}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        keyPlayer: { ...currentScout.keyPlayer, positions: e.target.value }
                      })
                    }
                    placeholder="Ex: Ala Direito / Médio Ofensivo"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Pé Dominante:</label>
                  <select
                    value={currentScout.keyPlayer?.dominantFoot || 'Direito'}
                    onChange={(e) =>
                      handleUpdateCurrentReport({
                        keyPlayer: { ...currentScout.keyPlayer, dominantFoot: e.target.value }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value="Direito">Direito 🦶</option>
                    <option value="Esquerdo">Esquerdo (Canhoto) 🦶</option>
                    <option value="Ambidestro">Ambidestro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-amber-400 block mb-1 font-bold">
                  Principal Perigo / Ameaça:
                </label>
                <input
                  type="text"
                  value={currentScout.keyPlayer?.threats || ''}
                  onChange={(e) =>
                    handleUpdateCurrentReport({
                      keyPlayer: { ...currentScout.keyPlayer, threats: e.target.value }
                    })
                  }
                  placeholder="Ex: Drible rápido para dentro, remate forte de meia distância e bolas paradas."
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-emerald-400 block mb-1 font-bold">
                  Como Anular / Estratégia de Marcação:
                </label>
                <input
                  type="text"
                  value={currentScout.keyPlayer?.howToStop || ''}
                  onChange={(e) =>
                    handleUpdateCurrentReport({
                      keyPlayer: { ...currentScout.keyPlayer, howToStop: e.target.value }
                    })
                  }
                  placeholder="Ex: Fechar o pé dominante, orientar para a linha lateral e fazer cobertura constante."
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* 3. PONTOS FORTES & PONTOS FRACOS (VULNERABILIDADES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pontos Fortes (Atenção redobrada) */}
            <div className="card bg-slate-900 border-emerald-500/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🟢</span>
                  <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-emerald-400 tracking-wider">
                    Pontos Fortes do Adversário (Atenção)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">{currentScout.strengths?.length || 0} itens</span>
              </div>

              <div className="space-y-1.5">
                {(currentScout.strengths || []).map((str, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-200 font-mono"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{str}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = (currentScout.strengths || []).filter((_, i) => i !== idx);
                        handleUpdateCurrentReport({ strengths: filtered });
                      }}
                      className="text-slate-500 hover:text-rose-400 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCustomStrength}
                  onChange={(e) => setNewCustomStrength(e.target.value)}
                  placeholder="Adicionar ponto forte (ex: Cantos perigosos)..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCustomStrength.trim()) {
                      e.preventDefault();
                      const current = currentScout.strengths || [];
                      handleUpdateCurrentReport({ strengths: [...current, newCustomStrength.trim()] });
                      setNewCustomStrength('');
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCustomStrength.trim()) return;
                    const current = currentScout.strengths || [];
                    handleUpdateCurrentReport({ strengths: [...current, newCustomStrength.trim()] });
                    setNewCustomStrength('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-['Chakra_Petch']"
                >
                  +
                </button>
              </div>
            </div>

            {/* Pontos Fracos (Oportunidades a explorar) */}
            <div className="card bg-slate-900 border-rose-500/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔴</span>
                  <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-rose-400 tracking-wider">
                    Pontos Fracos do Adversário (A Explorar)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">{currentScout.weaknesses?.length || 0} itens</span>
              </div>

              <div className="space-y-1.5">
                {(currentScout.weaknesses || []).map((wk, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950 border border-rose-500/30 text-xs text-slate-200 font-mono"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{wk}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = (currentScout.weaknesses || []).filter((_, i) => i !== idx);
                        handleUpdateCurrentReport({ weaknesses: filtered });
                      }}
                      className="text-slate-500 hover:text-rose-400 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCustomWeakness}
                  onChange={(e) => setNewCustomWeakness(e.target.value)}
                  placeholder="Adicionar ponto fraco (ex: Espaço nas costas)..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCustomWeakness.trim()) {
                      e.preventDefault();
                      const current = currentScout.weaknesses || [];
                      handleUpdateCurrentReport({ weaknesses: [...current, newCustomWeakness.trim()] });
                      setNewCustomWeakness('');
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCustomWeakness.trim()) return;
                    const current = currentScout.weaknesses || [];
                    handleUpdateCurrentReport({ weaknesses: [...current, newCustomWeakness.trim()] });
                    setNewCustomWeakness('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-['Chakra_Petch']"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 4. PLANO ESTRATÉGICO DE ANULAÇÃO & BOLAS PARADAS DO ADVERSÁRIO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Como Vencer / Estratégia de Anulação */}
            <div className="card bg-slate-900 border-cyan-500/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎯</span>
                <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-cyan-400 tracking-wider">
                  Estratégia de Anulação (Como Vencer)
                </h3>
              </div>
              <textarea
                rows={4}
                value={currentScout.gamePlan || ''}
                onChange={(e) => handleUpdateCurrentReport({ gamePlan: e.target.value })}
                placeholder="Plano para explorar as debilidades do adversário e neutralizar as suas principais armas..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Bolas Paradas e Observações do Adversário */}
            <div className="card bg-slate-900 border-amber-500/30 p-4 space-y-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🚩</span>
                  <label className="text-xs font-['Chakra_Petch'] font-bold uppercase text-amber-400 tracking-wider">
                    Bolas Paradas do Adversário:
                  </label>
                </div>
                <input
                  type="text"
                  value={currentScout.setPiecesNotes || ''}
                  onChange={(e) => handleUpdateCurrentReport({ setPiecesNotes: e.target.value })}
                  placeholder="Ex: Cantos ofensivos ao 1º poste; defensivamente marcam à zona na pequena área."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Notas Gerais & Histórico:</label>
                <textarea
                  rows={2}
                  value={currentScout.notes || ''}
                  onChange={(e) => handleUpdateCurrentReport({ notes: e.target.value })}
                  placeholder="Observações adicionais sobre o terreno, árbitro, ambiente ou jogos anteriores..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>

          {/* BOTTOM ACTION BAR */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {isFinalized && !isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEditingScouting}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <span>✏️</span>
                  <span>Editar Adversário</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalizeScouting}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <span>✓</span>
                  <span>Finalizar Adversário</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportOpponentPDF}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all flex items-center gap-2 active:scale-95"
              >
                <span>📄</span>
                <span>Exportar PDF de Scouting</span>
              </button>

              <button
                type="button"
                onClick={handleShareOpponentWhatsApp}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 font-['Chakra_Petch'] font-bold text-xs uppercase hover:bg-emerald-900 transition-all flex items-center gap-1.5"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('convocatoria', currentScout.matchId)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-['Chakra_Petch'] font-bold text-xs uppercase hover:border-slate-500 transition-all flex items-center gap-1.5"
              >
                <span>📋</span>
                <span>Convocatória</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('prejogo', currentScout.id)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 border border-cyan-500/40 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase hover:border-cyan-400 transition-all flex items-center gap-2"
            >
              <span>⚡</span>
              <span>Abrir Plano Pré-Jogo da Nossa Equipa ➔</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <span className="text-4xl mb-3 block">🛡️</span>
          <h3 className="text-base font-['Chakra_Petch'] font-bold uppercase text-white mb-2">
            Nenhum Relatório de Scouting Selecionado
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 font-mono">
            Cria um novo relatório de scouting ou seleciona um jogo no calendário.
          </p>
          {availableScheduledMatches.length > 0 && (
            <div className="max-w-xs mx-auto mb-3">
              <label className="block text-[10px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">
                Criar a partir de um jogo agendado
              </label>
              <select
                value=""
                onChange={(e) => e.target.value && handleCreateReportFromMatch(e.target.value)}
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-['Chakra_Petch'] font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="" disabled>
                  📅 Escolher jogo da Agenda...
                </option>
                {availableScheduledMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    vs {m.opponent} ({m.date.split('-').reverse().join('/')})
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={handleCreateNewCustomReport}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-['Chakra_Petch'] font-bold text-xs uppercase"
          >
            + Criar Relatório em Branco
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentScout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-['Chakra_Petch'] font-bold uppercase text-white">
                Apagar Relatório de Scouting?
              </h3>
            </div>
            <p className="text-sm text-slate-300 font-mono mb-6 leading-relaxed">
              Tens a certeza que desejas apagar a análise e scouting do adversário{' '}
              <strong>{currentScout.opponentName}</strong>? Esta ação é irreversível.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrentReport}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                <span>🗑️</span>
                <span>Sim, Apagar Scouting</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
