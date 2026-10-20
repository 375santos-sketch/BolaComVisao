import React, { useState, useEffect, useMemo } from 'react';
import {
  AppState,
  OpponentScouting,
  ScheduledMatch,
  SetPieceTakers,
  MatchScheduleTimes,
  TeamKitInfo,
  TacticalPitchPlayer
} from '../../types';
import { t } from '../../i18n/dict';
import { uid } from '../../lib/utils';
import { Header } from '../Header';
import { SEVEN_A_SIDE_PRESETS, COMMON_ROLES, getEffectiveTacticalPitch, formatMatchCompetition } from './OpponentScoutingView';

interface PreMatchPlanViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowToast: (msg: string) => void;
  targetOpponentId?: string;
}

function createDefaultPreMatchReport(match?: ScheduledMatch, myClubStadium?: string, rosterNames?: string[]): OpponentScouting {
  const compFormatted = match ? formatMatchCompetition(match) : 'Jornada';
  return {
    id: match ? `report-${match.id}` : 'temp-report-default',
    matchId: match?.id,
    opponentName: match?.opponent || 'Próximo Adversário',
    date: match?.date || '2026-09-19',
    time: match?.time || '10:30',
    location: match?.location || 'casa',
    matchType: match?.type || 'campeonato',
    phase: compFormatted,
    stadium: match?.venue || (match?.location === 'casa' ? (myClubStadium || 'Campo Municipal') : 'Campo Adversário'),
    ourFormation: '2-3-1',
    ourPlayingModel: 'Pressão Alta, Domínio Posicional e Reação Agressiva na Perda',
    ourDefensiveBlock: 'medio',
    ourTacticalPitch: SEVEN_A_SIDE_PRESETS['2-3-1'],
    offensiveOrganization: [
      'Construção apoiada a 3 com saída limpa a partir de trás',
      'Explorar a largura dos alas para desequilibrar no 1v1',
      'Paciência na circulação para atrair e acelerar entrelinhas'
    ],
    defensiveTransition: [
      'Pressão sufocante imediata nos primeiros 5 segundos da perda',
      'Fechar o corredor central e orientar o rival para as linhas',
      'Falta tática inteligente longe do nosso terço defensivo'
    ],
    defensiveOrganization: [
      'Bloco compacto com distâncias curtas entre linhas (15 metros)',
      'Basculação agressiva para o lado da bola e cobertura mútua',
      'Controlo rigoroso das costas dos defesas'
    ],
    offensiveTransition: [
      'Primeiro passe vertical para a frente no momento da recuperação',
      'Ataque rápido à profundidade e diagonais de rutura dos alas',
      'Chegada de médios à área para ganhar ressaltos e segundas bolas'
    ],
    setPieceTakers: {
      leftCorner: rosterNames?.[0] || 'Nº 10 / Ala Esq.',
      rightCorner: rosterNames?.[1] || 'Nº 7 / Ala Dir.',
      directFreekick: rosterNames?.[2] || 'Nº 8 / Médio Centro',
      penalties: rosterNames?.[3] || 'Nº 9 / Avançado'
    },
    ourOffensiveSetPieces: 'Sinal 1: Canto ao 1º poste com desvio do central. Sinal 2: Bola tensa ao 2º poste.',
    ourDefensiveSetPieces: 'Marcação mista: 2 homens em zona na pequena área + marcação individual.',
    teamMotto: 'Intensidade Máxima, Solidariedade e Foco Total do 1º ao último minuto!',
    keyObjectives: [
      'Ganhar todos os duelos individuais e segundas bolas nos primeiros 10 minutos',
      'Comunicação constante e entreajuda ativa em todas as fases do jogo',
      'Zero golos sofridos de bola parada e eficácia na finalização'
    ],
    lockerRoomTalk: 'Entrar com coragem, impor o nosso ritmo desde o apito inicial e confiar no nosso trabalho de treino.',
    scheduleTimes: {
      meetingTime: match?.meetingTime || '09:15',
      talkTime: '09:45',
      warmupTime: '10:00',
      entryTime: '10:25'
    },
    teamKit: {
      jerseyColor: 'Azul',
      shortsColor: 'Branco',
      socksColor: 'Azul',
      gkColor: 'Amarelo'
    },
    formation: '2-3-1',
    playingStyle: 'Bloco Médio com transições rápidas pelas alas',
    strengths: ['Transições rápidas'],
    weaknesses: ['Espaço entrelinhas'],
    keyPlayer: { name: '', number: undefined, positions: '', dominantFoot: 'Direito', threats: '', howToStop: '' },
    tacticalNotes: '',
    setPiecesNotes: '',
    gamePlan: '',
    notes: '',
    updatedAt: 0
  };
}

export const PreMatchPlanView: React.FC<PreMatchPlanViewProps> = ({
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
  const roster = state.roster || [];
  const myClubName = state.myClubName || 'A Minha Equipa';

  // Determine active report
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const rosterNames = useMemo(() => roster.map((r) => r.name), [roster]);

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
    return createDefaultPreMatchReport(nextMatch, state.myClubStadium, rosterNames);
  }, [scoutingList, targetOpponentId, selectedReportId, scheduleList, state.myClubStadium, rosterNames]);

  const setActiveReportId = (id: string) => setSelectedReportId(id);

  // Standalone reports created by user (excluding dummy 'Adversário 1')
  const customBlankReports: OpponentScouting[] = useMemo(() => {
    return scoutingList.filter(
      (s) =>
        s.opponentName !== 'Adversário 1' &&
        (!s.matchId || !scheduleList.some((m) => m.id === s.matchId))
    );
  }, [scoutingList, scheduleList]);

  const [newCustomObjective, setNewCustomObjective] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('p1');
  const isFinalized = Boolean(currentScout?.preMatchFinalized);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const isEditing = Boolean(currentScout && editingReportId === currentScout.id);

  const handleFinalizePreMatch = () => {
    if (!currentScout) return;
    const now = Date.now();
    const updatedScouting = scoutingList.map((s) => {
      if (s.id === currentScout.id) {
        return {
          ...s,
          preMatchFinalized: true,
          preMatchFinalizedAt: now,
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
            preMatchFinalized: true,
            preMatchFinalizedAt: now
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
    onShowToast('Plano Pré-Jogo finalizado com sucesso! ✓');
  };

  const handleStartEditingPreMatch = () => {
    if (currentScout) {
      setEditingReportId(currentScout.id);
    }
    onShowToast('Modo de edição do Pré-Jogo ativado ✓');
  };

  // Ensure default report exists if empty and cleanup dummy 'Adversário 1'
  useEffect(() => {
    if (state.opponentScouting && state.opponentScouting.some((s) => s.opponentName === 'Adversário 1')) {
      const cleaned = state.opponentScouting.filter((s) => s.opponentName !== 'Adversário 1');
      if (cleaned.length === 0 && scheduleList.length > 0) {
        const initialReport = {
          ...createDefaultPreMatchReport(scheduleList[0], state.myClubStadium, rosterNames),
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
        ...createDefaultPreMatchReport(nextMatch, state.myClubStadium, rosterNames),
        id: uid(),
        updatedAt: Date.now()
      };
      onUpdateState({ opponentScouting: [initialReport] });
    }
  }, [state.opponentScouting, scheduleList, state.myClubStadium, rosterNames, onUpdateState]);

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

  // Change Formation preset for pitch
  const handleFormationChange = (formation: string) => {
    const preset = SEVEN_A_SIDE_PRESETS[formation] || SEVEN_A_SIDE_PRESETS['2-3-1'];
    // Merge existing custom names if matching roles
    const currentPitch = getEffectiveTacticalPitch(currentScout);
    const newPitch = preset.map((p, idx) => ({
      ...p,
      name: currentPitch[idx]?.name || p.name
    }));

    handleUpdateCurrentReport({
      ourFormation: formation,
      ourTacticalPitch: newPitch
    });
    onShowToast(`Formação da Nossa Equipa alterada para ${formation} ✓`);
  };

  // Linked match from Agenda
  const linkedMatch: ScheduledMatch | undefined = useMemo(() => {
    if (!currentScout) return undefined;
    return scheduleList.find(
      (m) =>
        m.id === currentScout.matchId ||
        (m.opponent && currentScout.opponentName && m.opponent.trim().toLowerCase() === currentScout.opponentName.trim().toLowerCase())
    );
  }, [scheduleList, currentScout]);

  // Create a new report/plan from a scheduled match
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
      ourPlayingModel: 'Pressão Alta, Domínio Posicional e Reação Agressiva na Perda',
      ourDefensiveBlock: 'medio',
      ourTacticalPitch: SEVEN_A_SIDE_PRESETS['2-3-1'],
      offensiveOrganization: [
        'Construção apoiada a 3 com saída limpa a partir de trás',
        'Explorar a largura dos alas para desequilibrar no 1v1',
        'Paciência na circulação para atrair e acelerar entrelinhas'
      ],
      defensiveTransition: [
        'Pressão sufocante imediata nos primeiros 5 segundos da perda',
        'Fechar o corredor central e orientar o rival para as linhas',
        'Falta tática inteligente longe do nosso terço defensivo'
      ],
      defensiveOrganization: [
        'Bloco compacto com distâncias curtas entre linhas (15 metros)',
        'Basculação agressiva para o lado da bola e cobertura mútua',
        'Controlo rigoroso das costas dos defesas'
      ],
      offensiveTransition: [
        'Primeiro passe vertical para a frente no momento da recuperação',
        'Ataque rápido à profundidade e diagonais de rutura dos alas',
        'Chegada de médios à área para ganhar ressaltos e segundas bolas'
      ],
      setPieceTakers: {
        leftCorner: roster[0]?.name || 'Nº 10 / Ala Esq.',
        rightCorner: roster[1]?.name || 'Nº 7 / Ala Dir.',
        directFreekick: roster[2]?.name || 'Nº 8 / Médio Centro',
        penalties: roster[3]?.name || 'Nº 9 / Avançado'
      },
      ourOffensiveSetPieces: 'Sinal 1: Canto ao 1º poste com desvio do central. Sinal 2: Bola tensa ao 2º poste.',
      ourDefensiveSetPieces: 'Marcação mista: 2 homens em zona na pequena área + marcação individual.',
      teamMotto: 'Intensidade Máxima, Solidariedade e Foco Total do 1º ao último minuto!',
      keyObjectives: [
        'Ganhar todos os duelos individuais e segundas bolas nos primeiros 10 minutos',
        'Comunicação constante e entreajuda ativa em todas as fases do jogo',
        'Zero golos sofridos de bola parada e eficácia na finalização'
      ],
      lockerRoomTalk: 'Entrar com coragem, impor o nosso ritmo desde o apito inicial e confiar no nosso trabalho de treino.',
      scheduleTimes: {
        meetingTime: match.meetingTime || '09:15',
        talkTime: '09:45',
        warmupTime: '10:00',
        entryTime: '10:25'
      },
      teamKit: {
        jerseyColor: 'Azul',
        shortsColor: 'Branco',
        socksColor: 'Azul',
        gkColor: 'Amarelo'
      },
      formation: '2-3-1',
      playingStyle: 'Bloco Médio com transições rápidas pelas alas',
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
    onShowToast(`Plano pré-jogo criado a partir da Agenda: vs ${match.opponent}! 📅✓`);
  };

  // Create a new blank report
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
      teamMotto: 'Foco e Atitude!',
      keyObjectives: ['Ganhar duelos', 'Comunicação', 'Finalizar'],
      formation: '2-3-1',
      playingStyle: 'Bloco Médio',
      strengths: ['Transições'],
      weaknesses: ['Espaço'],
      keyPlayer: { name: '', number: undefined, positions: '', dominantFoot: 'Direito', threats: '', howToStop: '' },
      tacticalNotes: '',
      gamePlan: '',
      notes: '',
      updatedAt: Date.now()
    };

    const updated = [newReport, ...scoutingList];
    onUpdateState({ opponentScouting: updated });
    setActiveReportId(newReport.id);
    onShowToast(`Novo plano pré-jogo criado ✓`);
  };

  // Move or Edit Pitch Player
  const handleUpdatePitchPlayer = (playerId: string, updates: Partial<TacticalPitchPlayer>) => {
    if (!currentScout) return;
    const currentPitch = getEffectiveTacticalPitch(currentScout);
    const newPitch = currentPitch.map((p) => (p.id === playerId ? { ...p, ...updates } : p));
    handleUpdateCurrentReport({ ourTacticalPitch: newPitch });
  };

  // Export PDF for OUR TEAM
  const handleExportOurTeamPDF = async () => {
    if (!currentScout) return;
    try {
      const { generatePreMatchReportPDF } = await import('../../lib/pdfUtils');
      generatePreMatchReportPDF(currentScout, state, linkedMatch);
      onShowToast('PDF do Plano Pré-Jogo da Nossa Equipa gerado com sucesso! 📄✓');
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao gerar PDF do Plano Pré-Jogo.');
    }
  };

  // Share Pre-Match on WhatsApp
  const handleShareOurTeamWhatsApp = () => {
    if (!currentScout) return;
    const opp = currentScout.opponentName || 'Adversário';
    const dateFmt = currentScout.date ? currentScout.date.split('-').reverse().join('/') : '';
    const form = currentScout.ourFormation || '2-3-1';

    let msg = `⚡ *PLANO PRÉ-JOGO — A NOSSA EQUIPA*\n`;
    msg += `⚽ *${myClubName}* vs *${opp}*\n`;
    if (dateFmt) msg += `📅 *Data:* ${dateFmt} às ${currentScout.time || ''}h\n`;
    if (currentScout.stadium) msg += `🏟️ *Estádio/Campo:* ${currentScout.stadium}\n`;
    msg += `\n`;

    if (currentScout.teamMotto) {
      msg += `🔥 *PALAVRA DE ORDEM:* "${currentScout.teamMotto}"\n\n`;
    }

    msg += `📋 *ESTRUTURA TÁTICA DA NOSSA EQUIPA:*\n`;
    msg += `• Formação: ${form} (Futebol de 7)\n`;
    msg += `• Bloco Defensivo: ${currentScout.ourDefensiveBlock === 'alto' ? 'Bloco Alto' : currentScout.ourDefensiveBlock === 'baixo' ? 'Bloco Baixo' : 'Bloco Médio'}\n`;
    if (currentScout.ourPlayingModel) {
      msg += `• Modelo: ${currentScout.ourPlayingModel}\n`;
    }
    msg += `\n`;

    if (currentScout.keyObjectives && currentScout.keyObjectives.length > 0) {
      msg += `🎯 *3 OBJETIVOS INEGOCIÁVEIS:*\n`;
      currentScout.keyObjectives.forEach((obj, idx) => {
        msg += `${idx + 1}. ${obj}\n`;
      });
      msg += `\n`;
    }

    if (currentScout.setPieceTakers) {
      msg += `🎯 *BATEDORES DE BOLAS PARADAS:*\n`;
      if (currentScout.setPieceTakers.leftCorner) msg += `• Cantos Esq.: ${currentScout.setPieceTakers.leftCorner}\n`;
      if (currentScout.setPieceTakers.rightCorner) msg += `• Cantos Dir.: ${currentScout.setPieceTakers.rightCorner}\n`;
      if (currentScout.setPieceTakers.directFreekick)
        msg += `• Livres: ${currentScout.setPieceTakers.directFreekick}\n`;
      if (currentScout.setPieceTakers.penalties) msg += `• Penáltis: ${currentScout.setPieceTakers.penalties}\n`;
      msg += `\n`;
    }

    if (currentScout.lockerRoomTalk) {
      msg += `💬 *PRELEÇÃO TÉCNICA:*\n"${currentScout.lockerRoomTalk}"\n\n`;
    }

    msg += `_BolaComVisão — Gestão de Plantel_`;

    navigator.clipboard
      .writeText(msg)
      .then(() => onShowToast('Plano Pré-Jogo copiado para WhatsApp! 💬✓'))
      .catch(() => onShowToast('Erro ao copiar para WhatsApp.'));
  };

  const pitchPlayers = getEffectiveTacticalPitch(currentScout);
  const activePitchPlayer = pitchPlayers.find((p) => p.id === selectedPlayerId) || pitchPlayers[0];

  return (
    <div className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] animate-fadeIn">
      <Header
        title="A Nossa Equipa (Plano Pré-Jogo)"
        subtitle="Modelo tático, relvado interativo, 4 momentos, bolas paradas e preleção"
        onOpenSettings={onOpenSettings}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
      />

      {/* TOP ACTION & CONTEXT BAR */}
      <div className="card mb-4 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-cyan-500/30 p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-300 font-bold text-xl shadow-[0_0_15px_rgba(0,210,255,0.25)]">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-['Chakra_Petch'] font-black uppercase text-white tracking-wider">
                  Plano Estratégico & Modelo de Jogo
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono font-bold">
                  {myClubName}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Documento de preparação interna da equipa técnica e balneário
              </p>
            </div>
          </div>

          {/* Quick PDF & WhatsApp & Finalize & Switch to Scouting Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {isFinalized && !isEditing ? (
              <button
                type="button"
                onClick={handleStartEditingPreMatch}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Reabrir Pré-Jogo para edição"
              >
                <span>✏️</span>
                <span>Editar Pré-Jogo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizePreMatch}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Finalizar Plano Pré-Jogo da nossa equipa"
              >
                <span>✓</span>
                <span>Finalizar Pré-Jogo</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportOurTeamPDF}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_20px_rgba(0,210,255,0.35)] transition-all flex items-center gap-2 active:scale-95"
              title="Gerar PDF Oficial do Plano Pré-Jogo da Nossa Equipa"
            >
              <span>📄</span>
              <span>Gerar PDF Plano Pré-Jogo</span>
            </button>

            <button
              type="button"
              onClick={handleShareOurTeamWhatsApp}
              className="px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1.5 shadow-sm"
              title="Copiar Plano Pré-Jogo formatado para WhatsApp"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('adversario', currentScout?.id)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1.5"
              title="Ir para o menu do Adversário (Scouting)"
            >
              <span>🛡️</span>
              <span>Adversário ➔</span>
            </button>
          </div>
        </div>

        {/* Match Selector Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-xs font-mono text-cyan-400 font-bold whitespace-nowrap">
              JOGO A PREPARAR:
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
              className="bg-slate-950 border border-cyan-500/50 text-cyan-300 font-['Chakra_Petch'] font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer shadow-md min-w-[260px] max-w-full truncate"
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
                <optgroup label="✏️ PLANOS CRIADOS">
                  {customBlankReports.map((scout) => (
                    <option key={`scout-${scout.id}`} value={scout.id}>
                      ⚡ {scout.opponentName} {scout.date ? `(${scout.date.split('-').reverse().join('/')})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}

              <option value="__blank__">✏️ + Criar Plano em Branco...</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            {currentScout?.opponentName && (
              <span className="text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                Adversário: <strong className="text-cyan-400">{currentScout.opponentName}</strong>
              </span>
            )}
            {currentScout?.date && (
              <span className="text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                Data:{' '}
                <strong className="text-slate-200">
                  {currentScout.date.split('-').reverse().join('/')}{' '}
                  {currentScout.time ? `às ${currentScout.time}h` : ''}
                </strong>
              </span>
            )}
            {currentScout?.phase && (
              <span className="text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 hidden sm:inline-block">
                Competição: <strong className="text-amber-400">{currentScout.phase}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pre-Match Finalization Banner */}
      {isFinalized && !isEditing ? (
        <div className="card mb-4 p-3.5 bg-emerald-950/70 border-emerald-500/50 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl shrink-0">✅</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-['Chakra_Petch'] font-black uppercase tracking-wider text-emerald-300">
                    Plano Pré-Jogo Finalizado
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    {currentScout.ourFormation || '2-3-1'}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5">
                  O plano estratégico e preleção técnica estão concluídos. Clica em "Editar" se precisares de efetuar alterações.
                  {currentScout.preMatchFinalizedAt
                    ? ` • Finalizado a ${new Date(currentScout.preMatchFinalizedAt).toLocaleDateString('pt-PT')} às ${new Date(currentScout.preMatchFinalizedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartEditingPreMatch}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0 cursor-pointer"
              title="Reabrir Pré-Jogo para edição"
            >
              <span>✏️</span>
              <span>Editar Pré-Jogo</span>
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
                  Modo de Edição Ativo (Pré-Jogo)
                </span>
                <div className="text-[11px] text-amber-400/80 font-mono mt-0.5">
                  Podes ajustar a formação, modelo, bolas paradas e preleção técnica. Quando concluíres, clica em "Finalizar".
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinalizePreMatch}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0 cursor-pointer"
              title="Concluir e finalizar Pré-Jogo"
            >
              <span>✓</span>
              <span>Finalizar Pré-Jogo</span>
            </button>
          </div>
        </div>
      ) : null}

      {currentScout && (
        <div className="space-y-4">
          {/* 1. LEMA DE BALNEÁRIO & 3 OBJETIVOS INEGOCIÁVEIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lema da Equipa */}
            <div className="card bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900/90 border-amber-500/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔥</span>
                <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-amber-400 tracking-wider">
                  Palavra de Ordem / Lema do Jogo
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mb-2">
                A frase marcante que deve estar no quadro do balneário antes de entrar em campo:
              </p>
              <input
                type="text"
                value={currentScout.teamMotto || ''}
                onChange={(e) => handleUpdateCurrentReport({ teamMotto: e.target.value })}
                placeholder="Ex: Intensidade Máxima, Solidariedade e Foco Total do 1º ao último minuto!"
                className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* 3 Objetivos Inegociáveis */}
            <div className="card bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900/90 border-emerald-500/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-emerald-400 tracking-wider">
                    3 Objetivos Inegociáveis
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400/80">
                  {currentScout.keyObjectives?.length || 0}/3
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mb-2">
                Os 3 pilares que a equipa tem de cumprir rigorosamente:
              </p>
              <div className="space-y-1.5 mb-2">
                {(currentScout.keyObjectives || []).map((obj, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950 border border-emerald-500/30 text-xs text-slate-200 font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{obj}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = (currentScout.keyObjectives || []).filter((_, i) => i !== idx);
                        handleUpdateCurrentReport({ keyObjectives: filtered });
                      }}
                      className="text-slate-500 hover:text-rose-400 text-xs px-1.5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {(currentScout.keyObjectives || []).length < 3 && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCustomObjective}
                    onChange={(e) => setNewCustomObjective(e.target.value)}
                    placeholder="Adicionar objetivo inegociável..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCustomObjective.trim()) {
                        e.preventDefault();
                        const current = currentScout.keyObjectives || [];
                        handleUpdateCurrentReport({ keyObjectives: [...current, newCustomObjective.trim()] });
                        setNewCustomObjective('');
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCustomObjective.trim()) return;
                      const current = currentScout.keyObjectives || [];
                      handleUpdateCurrentReport({ keyObjectives: [...current, newCustomObjective.trim()] });
                      setNewCustomObjective('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-['Chakra_Petch']"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. RELVADO TÁTICO VERTICAL & MODELO DE JOGO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Relvado Tático (Futebol de 7 Interativo) */}
            <div className="lg:col-span-6 card bg-slate-900 border-cyan-500/30 p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏟️</span>
                  <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-white tracking-wider">
                    Relvado Tático (Futebol de 7)
                  </h3>
                </div>

                {/* Formação Preset Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-cyan-400">Sistema:</span>
                  <select
                    value={currentScout.ourFormation || '2-3-1'}
                    onChange={(e) => handleFormationChange(e.target.value)}
                    className="bg-slate-950 border border-cyan-500/50 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono font-bold focus:outline-none"
                  >
                    {Object.keys(SEVEN_A_SIDE_PRESETS).map((form) => (
                      <option key={form} value={form}>
                        {form}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pitch Board Container */}
              <div className="relative w-full aspect-[3/4] max-h-[440px] mx-auto rounded-2xl overflow-hidden border-2 border-emerald-400/40 shadow-2xl bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-900">
                {/* Grass stripes */}
                <div className="absolute inset-0 grid grid-rows-8 pointer-events-none opacity-25">
                  <div className="bg-emerald-900"></div>
                  <div className="bg-emerald-600"></div>
                  <div className="bg-emerald-900"></div>
                  <div className="bg-emerald-600"></div>
                  <div className="bg-emerald-900"></div>
                  <div className="bg-emerald-600"></div>
                  <div className="bg-emerald-900"></div>
                  <div className="bg-emerald-600"></div>
                </div>

                {/* Pitch Markings */}
                <div className="absolute inset-2 border-2 border-white/60 pointer-events-none">
                  {/* Halfway line & center circle */}
                  <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/60"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white/60"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"></div>

                  {/* Opponent Area (Top) */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-14 border-b-2 border-x-2 border-white/60"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-6 border-b-2 border-x-2 border-white/60"></div>

                  {/* Our Defense Area (Bottom) */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-14 border-t-2 border-x-2 border-white/60"></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-6 border-t-2 border-x-2 border-white/60"></div>

                  {/* Attack Direction Indicator */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-emerald-200/80 uppercase tracking-widest">
                    ▲ SENTIDO DE ATAQUE ▲
                  </div>
                </div>

                {/* 7 Tactical Players on Pitch */}
                {pitchPlayers.map((p) => {
                  const isSelected = selectedPlayerId === p.id;
                  const isGK = p.role === 'GR';

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlayerId(p.id)}
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      className={`absolute cursor-pointer transition-transform hover:scale-110 flex flex-col items-center z-10 select-none group`}
                    >
                      {/* Player Circle */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-['Chakra_Petch'] font-black text-[11px] shadow-lg border-2 ${
                          isGK
                            ? 'bg-amber-400 text-slate-950 border-white'
                            : isSelected
                              ? 'bg-cyan-400 text-slate-950 border-white ring-4 ring-cyan-400/40 animate-pulse'
                              : 'bg-cyan-600 text-white border-white'
                        }`}
                      >
                        {p.role}
                      </div>

                      {/* Player Name Tag */}
                      <div
                        className={`mt-0.5 px-1.5 py-0.5 rounded bg-slate-950/90 border text-[9px] font-mono font-bold text-white whitespace-nowrap shadow-md ${
                          isSelected ? 'border-cyan-400 text-cyan-300' : 'border-slate-700'
                        }`}
                      >
                        {p.name || p.role}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Edit Selected Player Controls */}
              {activePitchPlayer && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      EDITAR POSIÇÃO / ATLETA ({activePitchPlayer.role})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      X: {activePitchPlayer.x}% | Y: {activePitchPlayer.y}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Função / Sigla:</label>
                      <select
                        value={activePitchPlayer.role}
                        onChange={(e) => handleUpdatePitchPlayer(activePitchPlayer.id, { role: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      >
                        {COMMON_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Nome / Atleta:</label>
                      <input
                        type="text"
                        value={activePitchPlayer.name || ''}
                        onChange={(e) => handleUpdatePitchPlayer(activePitchPlayer.id, { name: e.target.value })}
                        placeholder="Ex: João (1)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Posição X (%):</label>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={activePitchPlayer.x}
                        onChange={(e) => handleUpdatePitchPlayer(activePitchPlayer.id, { x: parseInt(e.target.value) })}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Posição Y (%):</label>
                      <input
                        type="range"
                        min="10"
                        max="92"
                        value={activePitchPlayer.y}
                        onChange={(e) => handleUpdatePitchPlayer(activePitchPlayer.id, { y: parseInt(e.target.value) })}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modelo de Jogo & Bloco Defensivo */}
            <div className="lg:col-span-6 space-y-4">
              {/* Modelo de Jogo */}
              <div className="card bg-slate-900 border-cyan-500/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⚡</span>
                  <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-cyan-400 tracking-wider">
                    Modelo de Jogo & Identidade da Equipa
                  </h3>
                </div>
                <textarea
                  rows={3}
                  value={currentScout.ourPlayingModel || ''}
                  onChange={(e) => handleUpdateCurrentReport({ ourPlayingModel: e.target.value })}
                  placeholder="Ex: Pressão Alta e sufocante nos primeiros 10 minutos, circulação rápida a dois toques e largura total pelos alas..."
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Altura do Bloco Defensivo */}
              <div className="card bg-slate-900 border-cyan-500/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-white tracking-wider">
                      Altura do Bloco Defensivo
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono font-bold uppercase">
                    {currentScout.ourDefensiveBlock === 'alto'
                      ? 'Bloco Alto'
                      : currentScout.ourDefensiveBlock === 'baixo'
                        ? 'Bloco Baixo'
                        : 'Bloco Médio'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentReport({ ourDefensiveBlock: 'alto' })}
                    className={`p-2.5 rounded-xl border text-xs font-['Chakra_Petch'] font-bold transition-all flex flex-col items-center gap-1 ${
                      currentScout.ourDefensiveBlock === 'alto'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>🔺 BLOCO ALTO</span>
                    <span className="text-[9px] font-mono font-normal opacity-80">Pressão Total</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentReport({ ourDefensiveBlock: 'medio' })}
                    className={`p-2.5 rounded-xl border text-xs font-['Chakra_Petch'] font-bold transition-all flex flex-col items-center gap-1 ${
                      currentScout.ourDefensiveBlock === 'medio' || !currentScout.ourDefensiveBlock
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>🔹 BLOCO MÉDIO</span>
                    <span className="text-[9px] font-mono font-normal opacity-80">Equilíbrio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentReport({ ourDefensiveBlock: 'baixo' })}
                    className={`p-2.5 rounded-xl border text-xs font-['Chakra_Petch'] font-bold transition-all flex flex-col items-center gap-1 ${
                      currentScout.ourDefensiveBlock === 'baixo'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>🔻 BLOCO BAIXO</span>
                    <span className="text-[9px] font-mono font-normal opacity-80">Linhas Juntas</span>
                  </button>
                </div>
              </div>

              {/* Bolas Paradas da Nossa Equipa (Batedores) */}
              <div className="card bg-slate-900 border-cyan-500/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🎯</span>
                  <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-white tracking-wider">
                    Batedores de Bolas Paradas
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <div>
                    <label className="text-[10px] font-mono text-cyan-400 block mb-1">
                      Cantos Esq. (Canhoto/Destro):
                    </label>
                    <input
                      type="text"
                      value={currentScout.setPieceTakers?.leftCorner || ''}
                      onChange={(e) =>
                        handleUpdateCurrentReport({
                          setPieceTakers: { ...currentScout.setPieceTakers, leftCorner: e.target.value }
                        })
                      }
                      placeholder="Ex: João (10)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-cyan-400 block mb-1">
                      Cantos Dir. (Destro/Canhoto):
                    </label>
                    <input
                      type="text"
                      value={currentScout.setPieceTakers?.rightCorner || ''}
                      onChange={(e) =>
                        handleUpdateCurrentReport({
                          setPieceTakers: { ...currentScout.setPieceTakers, rightCorner: e.target.value }
                        })
                      }
                      placeholder="Ex: Martim (7)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-cyan-400 block mb-1">Livres Diretos:</label>
                    <input
                      type="text"
                      value={currentScout.setPieceTakers?.directFreekick || ''}
                      onChange={(e) =>
                        handleUpdateCurrentReport({
                          setPieceTakers: { ...currentScout.setPieceTakers, directFreekick: e.target.value }
                        })
                      }
                      placeholder="Ex: Afonso (8)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-cyan-400 block mb-1">Grandes Penalidades:</label>
                    <input
                      type="text"
                      value={currentScout.setPieceTakers?.penalties || ''}
                      onChange={(e) =>
                        handleUpdateCurrentReport({
                          setPieceTakers: { ...currentScout.setPieceTakers, penalties: e.target.value }
                        })
                      }
                      placeholder="Ex: Rodrigo (9)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-300 block mb-1 font-bold">
                      Rotinas Ofensivas (Cantos/Livres):
                    </label>
                    <input
                      type="text"
                      value={currentScout.ourOffensiveSetPieces || ''}
                      onChange={(e) => handleUpdateCurrentReport({ ourOffensiveSetPieces: e.target.value })}
                      placeholder="Ex: Sinal 1: Canto tenso ao 1º poste com desvio do central. Sinal 2: Bola corrida."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-300 block mb-1 font-bold">
                      Sistema Defensivo (Marcação):
                    </label>
                    <input
                      type="text"
                      value={currentScout.ourDefensiveSetPieces || ''}
                      onChange={(e) => handleUpdateCurrentReport({ ourDefensiveSetPieces: e.target.value })}
                      placeholder="Ex: Marcação mista: 2 atletas em zona na pequena área + marcação individual."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. OS 4 MOMENTOS DE JOGO DA NOSSA EQUIPA */}
          <div className="card bg-slate-900 border-cyan-500/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔄</span>
              <div>
                <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-white tracking-wider">
                  Os 4 Momentos de Jogo
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Instruções táticas para quando temos a bola, perdemos, recuperamos ou defendemos
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Organização Ofensiva */}
              <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30">
                <span className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider block mb-1.5">
                  1. Organização Ofensiva (Com Bola)
                </span>
                <textarea
                  rows={2}
                  value={(currentScout.offensiveOrganization || []).join('\n')}
                  onChange={(e) =>
                    handleUpdateCurrentReport({
                      offensiveOrganization: e.target.value.split('\n').filter(Boolean)
                    })
                  }
                  placeholder="Instruções para a construção e criação de oportunidades..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 font-mono"
                />
              </div>

              {/* 2. Transição Defensiva */}
              <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/30">
                <span className="text-xs font-['Chakra_Petch'] font-bold text-rose-400 uppercase tracking-wider block mb-1.5">
                  2. Transição Defensiva (Perda da Bola)
                </span>
                <textarea
                  rows={2}
                  value={(currentScout.defensiveTransition || []).join('\n')}
                  onChange={(e) =>
                    handleUpdateCurrentReport({
                      defensiveTransition: e.target.value.split('\n').filter(Boolean)
                    })
                  }
                  placeholder="Reação imediata nos 5 segundos pós-perda..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 font-mono"
                />
              </div>

              {/* 3. Organização Defensiva */}
              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30">
                <span className="text-xs font-['Chakra_Petch'] font-bold text-amber-400 uppercase tracking-wider block mb-1.5">
                  3. Organização Defensiva (Sem Bola)
                </span>
                <textarea
                  rows={2}
                  value={(currentScout.defensiveOrganization || []).join('\n')}
                  onChange={(e) =>
                    handleUpdateCurrentReport({
                      defensiveOrganization: e.target.value.split('\n').filter(Boolean)
                    })
                  }
                  placeholder="Coordenação de linhas e coberturas mútuas..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 font-mono"
                />
              </div>

              {/* 4. Transição Ofensiva */}
              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                <span className="text-xs font-['Chakra_Petch'] font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                  4. Transição Ofensiva (Recuperação da Bola)
                </span>
                <textarea
                  rows={2}
                  value={(currentScout.offensiveTransition || []).join('\n')}
                  onChange={(e) =>
                    handleUpdateCurrentReport({
                      offensiveTransition: e.target.value.split('\n').filter(Boolean)
                    })
                  }
                  placeholder="Passe vertical de saída e ataque à profundidade..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 4. PRELEÇÃO TÉCNICA & DISCURSO DE BALNEÁRIO */}
          <div className="card bg-slate-900 border-cyan-500/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🗣️</span>
              <h3 className="text-sm font-['Chakra_Petch'] font-bold uppercase text-white tracking-wider">
                Preleção Técnica & Discurso de Balneário
              </h3>
            </div>
            <textarea
              rows={4}
              value={currentScout.lockerRoomTalk || ''}
              onChange={(e) => handleUpdateCurrentReport({ lockerRoomTalk: e.target.value })}
              placeholder="Discurso motivacional e lembretes táticos essenciais antes de subir ao relvado..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* BOTTOM ACTION BAR */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {isFinalized && !isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEditingPreMatch}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <span>✏️</span>
                  <span>Editar Pré-Jogo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalizePreMatch}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <span>✓</span>
                  <span>Finalizar Pré-Jogo</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportOurTeamPDF}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-[0_0_20px_rgba(0,210,255,0.35)] transition-all flex items-center gap-2 active:scale-95"
              >
                <span>📄</span>
                <span>Exportar PDF do Plano Pré-Jogo</span>
              </button>

              <button
                type="button"
                onClick={handleShareOurTeamWhatsApp}
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
              onClick={() => onNavigate('adversario', currentScout.id)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 border border-cyan-500/40 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase hover:border-cyan-400 transition-all flex items-center gap-2"
            >
              <span>🛡️</span>
              <span>Abrir Scouting do Adversário ➔</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
