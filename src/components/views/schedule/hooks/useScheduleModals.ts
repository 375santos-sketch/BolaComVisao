import { useState } from 'react';
import {
  AppState,
  ScheduledMatch,
  Match,
  Training,
  StaffUnavailability,
  ClubEvent,
  MatchType,
  MatchLocation,
  ClubEventType,
  Player
} from '../../../../types';
import { TournamentGameForm } from '../types';
import { uid, defaultSeason, seasonFromDate, playerLabel, sortPlayerObjs } from '../../../../lib/utils';
import { t } from '../../../../i18n/dict';
import { lineupStarters } from '../../../../lib/startingLineup';
import { LINEUP_SIZE } from '../../../../lib/constants';
import { getNextTrainingNumber, allocateBatchTrainingNumbers } from '../../../../lib/trainingNumbering';

export function useScheduleModals(
  state: AppState,
  onUpdateState: (updates: Partial<AppState>) => void,
  onNavigate: (tab: any, targetId?: string) => void,
  onShowConfirm: (msg: string, cb: () => void) => void,
  onShowToast: (msg: string) => void,
  todayStr: string,
  selectedDate: string,
  eligiblePlayers: Player[]
) {
  // Modals for Scheduling
  const [showMatchModal, setShowMatchModal] = useState<boolean>(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [matchForm, setMatchForm] = useState<{
    isBatch: boolean;
    opp: string;
    date: string;
    time: string;
    type: MatchType;
    loc: MatchLocation;
    phase: string;
    tournamentName: string;
    venue: string;
    meetingTime: string;
    games: TournamentGameForm[];
  }>({
    isBatch: false,
    opp: '',
    date: todayStr,
    time: '09:00',
    type: 'amigavel',
    loc: 'casa',
    phase: '',
    tournamentName: '',
    venue: '',
    meetingTime: '',
    games: []
  });

  // Modal for Scheduling Training
  const [showTrainingModal, setShowTrainingModal] = useState<boolean>(false);
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(null);
  const [trainingForm, setTrainingForm] = useState<{
    date: string;
    time: string;
    location: string;
    type: string;
    notes: string;
    completed: boolean;
    durationMinutes: number;
  }>({
    date: todayStr,
    time: '19:00',
    location: 'Campo Principal',
    type: '⚡ Tático',
    notes: '',
    completed: false,
    durationMinutes: 90
  });

  // Modal for Staff Unavailability
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<{
    name: string;
    date: string;
    endDate: string;
    reason: string;
  }>({
    name: '',
    date: todayStr,
    endDate: '',
    reason: ''
  });

  // Modal for Club Events
  const [showClubEventModal, setShowClubEventModal] = useState<boolean>(false);
  const [editingClubEventId, setEditingClubEventId] = useState<string | null>(null);
  const [clubEventForm, setClubEventForm] = useState<{
    title: string;
    type: ClubEventType;
    date: string;
    endDate: string;
    time: string;
    endTime: string;
    location: string;
    attendees: string;
    notes: string;
    isCompleted: boolean;
  }>({
    title: '',
    type: 'reuniao',
    date: todayStr,
    endDate: '',
    time: '19:30',
    endTime: '21:00',
    location: 'Sala de Reuniões',
    attendees: 'Equipa Técnica',
    notes: '',
    isCompleted: false
  });

  // Floating Action Button (FAB) & Dropdown Add Menus
  const [showFabMenu, setShowFabMenu] = useState<boolean>(false);
  const [quickAddDropdownOpen, setQuickAddDropdownOpen] = useState<boolean>(false);

  // MATCH HANDLERS
  const lastGameType = (): MatchType => {
    const games = [...(state.schedule || []), ...(state.matches || [])].filter((g) => g && g.date && g.type);
    games.sort((a, b) => b.date.localeCompare(a.date));
    return games[0]?.type || 'amigavel';
  };

  const handleOpenScheduleMatch = (presetDate?: string) => {
    setMatchForm({
      isBatch: false,
      opp: '',
      date: presetDate || selectedDate || todayStr,
      time: '09:00',
      // Most games are of the same kind as the last one (usually the league): suggest it.
      type: lastGameType(),
      loc: 'casa',
      phase: '',
      tournamentName: '',
      venue: '',
      meetingTime: '',
      games: []
    });
    setEditingMatchId(null);
    setShowMatchModal(true);
  };

  const handleEditScheduledMatch = (s: ScheduledMatch) => {
    setMatchForm({
      isBatch: false,
      opp: s.opponent,
      date: s.date,
      time: s.time,
      type: s.type,
      loc: s.location,
      phase: s.phase || '',
      tournamentName: s.tournamentName || '',
      venue: s.venue || '',
      meetingTime: s.meetingTime || '',
      games: []
    });
    setEditingMatchId(s.id);
    setShowMatchModal(true);
  };

  const handleSaveMatch = () => {
    if (editingMatchId) {
      if (!matchForm.opp.trim()) {
        onShowToast('Insere o nome do adversário!');
        return;
      }
      const updatedSchedule = (state.schedule || [])
        .map((s) => {
          if (s.id === editingMatchId) {
            return {
              ...s,
              teamId: s.teamId || state.activeTeamId,
              teamName: s.teamName || state.myClubName,
              opponent: matchForm.opp.trim(),
              date: matchForm.date || s.date,
              time: matchForm.time || s.time,
              type: matchForm.type,
              location: matchForm.loc,
              phase: (matchForm.phase || '').trim(),
              tournamentName: matchForm.type === 'torneio' ? (matchForm.tournamentName || '').trim() : '',
              venue: matchForm.venue ? matchForm.venue.trim() : undefined,
              meetingTime: matchForm.meetingTime ? matchForm.meetingTime.trim() : undefined
            };
          }
          return s;
        })
        .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

      const updatedTeams = (state.teams || []).map((t) => {
        if (t.id === state.activeTeamId) {
          return {
            ...t,
            schedule: updatedSchedule
          };
        }
        return t;
      });

      onUpdateState({ schedule: updatedSchedule, teams: updatedTeams });
      setShowMatchModal(false);
      setEditingMatchId(null);
      onShowToast('Jogo atualizado no Calendário! ⚽');
      return;
    }

    if (matchForm.isBatch) {
      if (!matchForm.tournamentName.trim()) {
        onShowToast('Insere o nome do torneio!');
        return;
      }
      const validGames = matchForm.games.filter((g) => g.opp.trim() !== '');
      if (validGames.length === 0) {
        onShowToast('Insere pelo menos um jogo no torneio!');
        return;
      }

      const newBatch: ScheduledMatch[] = validGames.map((g) => ({
        id: uid(),
        teamId: state.activeTeamId,
        teamName: state.myClubName,
        opponent: g.opp.trim(),
        date: g.date || matchForm.date || todayStr,
        time: g.time || '09:00',
        type: 'torneio',
        phase: g.phase.trim(),
        tournamentName: matchForm.tournamentName.trim(),
        season: seasonFromDate(g.date || matchForm.date || todayStr),
        location: matchForm.loc || 'fora',
        venue: matchForm.venue ? matchForm.venue.trim() : undefined,
        callup: []
      }));

      const merged = [...(state.schedule || []), ...newBatch].sort(
        (a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
      );
      const updatedTeams = (state.teams || []).map((t) => {
        if (t.id === state.activeTeamId) {
          return {
            ...t,
            schedule: merged
          };
        }
        return t;
      });
      onUpdateState({ schedule: merged, teams: updatedTeams });
      setShowMatchModal(false);
      onShowToast('Torneio agendado na Agenda! 🏆');
    } else {
      if (!matchForm.opp.trim()) {
        onShowToast('Insere o nome do adversário!');
        return;
      }

      const newMatch: ScheduledMatch = {
        id: uid(),
        teamId: state.activeTeamId,
        teamName: state.myClubName,
        opponent: matchForm.opp.trim(),
        date: matchForm.date || todayStr,
        time: matchForm.time || '09:00',
        type: matchForm.type || 'amigavel',
        phase: matchForm.type === 'campeonato' || matchForm.type === 'torneio' ? (matchForm.phase || '').trim() : '',
        tournamentName: matchForm.tournamentName || '',
        season: seasonFromDate(matchForm.date || todayStr),
        location: matchForm.loc || 'casa',
        venue: matchForm.venue ? matchForm.venue.trim() : undefined,
        meetingTime: matchForm.meetingTime ? matchForm.meetingTime.trim() : undefined,
        callup: []
      };

      const merged = [...(state.schedule || []), newMatch].sort(
        (a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
      );
      const updatedTeams = (state.teams || []).map((t) => {
        if (t.id === state.activeTeamId) {
          return {
            ...t,
            schedule: merged
          };
        }
        return t;
      });
      onUpdateState({ schedule: merged, teams: updatedTeams });
      setShowMatchModal(false);
      onShowToast('Jogo agendado com sucesso na Agenda! ⚽📅');
    }
  };

  const handleStartMatch = (schedId: string) => {
    const s = (state.schedule || []).find((x) => x.id === schedId);
    if (!s) return;

    const hasActive = (state.matches || []).some((m) => !m.finished);
    if (hasActive) {
      onShowToast(t(state.lang, 'msg_ongoing'));
      return;
    }

    const doStart = () => {
      const planned = lineupStarters(s.startingLineup, s.callup || []);
      const plannedSize = s.startingLineup?.slots.length || 0;
      const plannedStarters = plannedSize > 0 && planned.length === plannedSize ? planned : [];
      const newMatch: Match = {
        id: uid(),
        teamId: state.activeTeamId,
        teamName: state.myClubName,
        opponent: s.opponent,
        date: s.date,
        type: s.type,
        phase: s.phase || '',
        season: seasonFromDate(s.date),
        location: s.location,
        originalSchedule: s,
        tournamentName: s.tournamentName || '',
        finished: false,
        goals: [],
        cards: [],
        subs: [],
        // The starters planned in "Equipa inicial" (Convocatória) come in as the 1st-half line-up
        lineup: plannedStarters,
        ...(plannedStarters.length && plannedSize !== LINEUP_SIZE ? { lineupSize: plannedSize } : {}),
        convocados: [...(s.callup || [])],
        ratings: {},
        capitao:
          plannedStarters.length && s.startingLineup?.captainId && plannedStarters.includes(s.startingLineup.captainId)
            ? s.startingLineup.captainId
            : null,
        timer: { isRunning: false, elapsedMs: 0, lastStartTs: null }
      };

      const newSchedule = (state.schedule || []).filter((x) => x.id !== schedId);
      const newMatches = [newMatch, ...(state.matches || [])];
      const updatedTeams = (state.teams || []).map((t) => {
        if (t.id === state.activeTeamId) {
          return {
            ...t,
            matches: newMatches,
            schedule: newSchedule
          };
        }
        return t;
      });
      onUpdateState({
        matches: newMatches,
        schedule: newSchedule,
        teams: updatedTeams
      });
      onNavigate('jogo');
    };

    if ((state.schedule || []).length > 0 && state.schedule[0].id !== schedId) {
      onShowConfirm('Atenção: Este jogo não é o primeiro da lista. Iniciar fora de ordem?', doStart);
    } else {
      doStart();
    }
  };

  const handleDeleteMatch = (id: string) => {
    const newSchedule = (state.schedule || []).filter((x) => x.id !== id);
    const newMatches = (state.matches || []).filter((x) => x.id !== id);
    const updatedTeams = (state.teams || []).map((t) => {
      if (t.id === state.activeTeamId) {
        return {
          ...t,
          schedule: newSchedule,
          matches: newMatches
        };
      }
      return t;
    });
    onUpdateState({ schedule: newSchedule, matches: newMatches, teams: updatedTeams });
    onShowToast('Jogo removido da agenda com sucesso! 🗑️');
  };

  const handleCopyCallup = (s: ScheduledMatch) => {
    const dateStr = s.date.split('-').reverse().join('/');
    const timeParts = s.time.split(':');
    const d = new Date();
    d.setHours(parseInt(timeParts[0] || '10', 10), parseInt(timeParts[1] || '0', 10));
    d.setHours(d.getHours() - 1);
    const meetTime = String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');

    const compLabel =
      s.type === 'torneio'
        ? `Torneio: ${s.tournamentName}${s.phase ? ' - ' + s.phase : ''}`
        : s.type === 'campeonato'
          ? `Campeonato${s.phase ? ' - ' + s.phase : ''}`
          : 'Jogo Amigável';
    const locLabel = s.location === 'casa' ? 'Em Casa 🏟️' : 'Fora ✈️';

    const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : 'A Nossa Equipa';
    const matchTitle = s.location === 'casa' ? `${myClub} 🆚 ${s.opponent}` : `${s.opponent} 🆚 ${myClub}`;

    let text = `⚽ *${matchTitle}*\n📅 ${dateStr} às ${s.time}h\n⏱️ *Concentração:* ${s.meetingTime || meetTime}\n🏟️ *${locLabel}*\n🏆 ${compLabel}\n\n📋 *CONVOCATÓRIA:*\n`;
    const called = sortPlayerObjs(eligiblePlayers.filter((p) => s.callup.includes(p.id)));
    if (called.length === 0) text += '- A definir\n';
    called.forEach((p) => (text += `- ${playerLabel(p)}\n`));

    navigator.clipboard
      .writeText(text)
      .then(() => onShowToast('Convocatória copiada para WhatsApp! 💬✓'))
      .catch(() => onShowToast('Erro ao copiar'));
  };

  // TRAINING HANDLERS
  const handleOpenScheduleTraining = (presetDate?: string) => {
    setTrainingForm({
      date: presetDate || selectedDate || todayStr,
      time: '19:00',
      location: 'Campo Principal',
      type: '⚡ Tático',
      notes: '',
      completed: false,
      durationMinutes: 90
    });
    setEditingTrainingId(null);
    setShowTrainingModal(true);
  };

  const handleEditTraining = (tr: Training) => {
    setTrainingForm({
      date: tr.date,
      time: tr.time || '19:00',
      location: tr.location || '',
      type: tr.type || '⚡ Tático',
      notes: tr.notes || '',
      completed: tr.completed === true,
      durationMinutes: tr.durationMinutes || 90
    });
    setEditingTrainingId(tr.id);
    setShowTrainingModal(true);
  };

  const handleSaveTrainingModal = (forceStatus?: boolean) => {
    const isCompleted = forceStatus !== undefined ? forceStatus : trainingForm.completed;

    if (editingTrainingId) {
      const updated = (state.trainings || [])
        .map((tr) => {
          if (tr.id === editingTrainingId) {
            return {
              ...tr,
              date: trainingForm.date,
              time: trainingForm.time,
              location: trainingForm.location,
              type: trainingForm.type,
              notes: trainingForm.notes,
              completed: isCompleted,
              durationMinutes: trainingForm.durationMinutes
            };
          }
          return tr;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      onUpdateState({ trainings: updated });
      setShowTrainingModal(false);
      setEditingTrainingId(null);
      onShowToast(
        isCompleted ? 'Treino guardado e CONCLUÍDO (Nas Estatísticas) ✅' : 'Treino atualizado como AGENDADO 📅'
      );
      return;
    }

    const nextNum = getNextTrainingNumber(state.trainings || [], state.lastTrainingNumber);
    const newTr: Training = {
      id: uid(),
      trainingNumber: nextNum,
      date: trainingForm.date || todayStr,
      time: trainingForm.time || '19:00',
      location: trainingForm.location || 'Campo Principal',
      type: trainingForm.type || '⚡ Tático',
      notes: trainingForm.notes || '',
      absences: [],
      completed: isCompleted,
      durationMinutes: trainingForm.durationMinutes || 90,
      season: state.season || defaultSeason()
    };

    const updated = [newTr, ...(state.trainings || [])].sort((a, b) => a.date.localeCompare(b.date));
    onUpdateState({
      trainings: updated,
      lastTrainingNumber: Math.max(state.lastTrainingNumber || 0, nextNum)
    });
    setShowTrainingModal(false);
    onShowToast(
      isCompleted
        ? `Treino Nº ${nextNum} registado e concluído! 🟢`
        : `Treino Nº ${nextNum} agendado com sucesso no Calendário! 📅⚡`
    );
  };

  const handleSaveBatchTrainings = (newTrainings: Training[]) => {
    const { numbers, newMaxNumber } = allocateBatchTrainingNumbers(
      state.trainings || [],
      newTrainings.length,
      state.lastTrainingNumber
    );

    const numberedTrainings: Training[] = newTrainings.map((t, idx) => ({
      ...t,
      trainingNumber: t.trainingNumber || numbers[idx]
    }));

    const merged = [...numberedTrainings, ...(state.trainings || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    onUpdateState({
      trainings: merged,
      lastTrainingNumber: Math.max(state.lastTrainingNumber || 0, newMaxNumber)
    });
    setShowTrainingModal(false);
    onShowToast(`🎉 ${newTrainings.length} treinos adicionados com sucesso ao calendário e plano de treinos!`);
  };

  const handleToggleTrainingStatus = (trId: string, currentCompleted: boolean) => {
    const updated = (state.trainings || []).map((tr) => {
      if (tr.id === trId) {
        return { ...tr, completed: !currentCompleted };
      }
      return tr;
    });

    onUpdateState({ trainings: updated });
    if (!currentCompleted) {
      onShowToast('✓ Treino concluído! Agora contabilizado nas estatísticas.');
    } else {
      onShowToast('🟡 Treino reaberto como agendado (fora das estatísticas).');
    }
  };

  const handleDeleteTraining = (id: string) => {
    const updated = (state.trainings || []).filter((t) => t.id !== id);
    const updatedTeams = (state.teams || []).map((t) => {
      if (t.id === state.activeTeamId) {
        return {
          ...t,
          trainings: updated
        };
      }
      return t;
    });
    onUpdateState({ trainings: updated, teams: updatedTeams });
    onShowToast('Treino eliminado com sucesso! 🗑️');
  };

  // STAFF UNAVAILABILITY HANDLERS
  const handleOpenScheduleStaff = (presetDate?: string) => {
    setEditingStaffId(null);
    setStaffForm({
      name: '',
      date: presetDate || selectedDate || todayStr,
      endDate: '',
      reason: ''
    });
    setShowStaffModal(true);
  };

  const handleEditStaffUnavailability = (u: StaffUnavailability) => {
    setEditingStaffId(u.id);
    setStaffForm({
      name: u.name,
      date: u.date,
      endDate: u.endDate || '',
      reason: u.reason || ''
    });
    setShowStaffModal(true);
  };

  const handleSaveStaffModal = () => {
    if (!staffForm.name.trim()) {
      onShowToast('Por favor insere o nome do membro da equipa técnica!');
      return;
    }
    if (!staffForm.date) {
      onShowToast('Por favor seleciona a data!');
      return;
    }

    if (editingStaffId) {
      const updated = (state.staffUnavailability || []).map((u) => {
        if (u.id === editingStaffId) {
          return {
            ...u,
            name: staffForm.name.trim(),
            date: staffForm.date,
            endDate: staffForm.endDate ? staffForm.endDate : undefined,
            reason: staffForm.reason.trim() || undefined
          };
        }
        return u;
      });
      onUpdateState({ staffUnavailability: updated });
      setShowStaffModal(false);
      setEditingStaffId(null);
      onShowToast('Indisponibilidade atualizada na Agenda! 🚫');
      return;
    }

    const newUnavail: StaffUnavailability = {
      id: uid(),
      name: staffForm.name.trim(),
      date: staffForm.date,
      endDate: staffForm.endDate ? staffForm.endDate : undefined,
      reason: staffForm.reason.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    const updated = [...(state.staffUnavailability || []), newUnavail].sort((a, b) => a.date.localeCompare(b.date));
    onUpdateState({ staffUnavailability: updated });
    setShowStaffModal(false);
    onShowToast('Indisponibilidade registada na Agenda! 🚫');
  };

  const handleDeleteStaffUnavailability = (id: string) => {
    const updated = (state.staffUnavailability || []).filter((u) => u.id !== id);
    const updatedTeams = (state.teams || []).map((t) => {
      if (t.id === state.activeTeamId) {
        return {
          ...t,
          staffUnavailability: updated
        };
      }
      return t;
    });
    onUpdateState({ staffUnavailability: updated, teams: updatedTeams });
    onShowToast('Indisponibilidade removida com sucesso! 🗑️');
  };

  // CLUB EVENT HANDLERS
  const handleOpenClubEventModal = (presetDate?: string) => {
    setEditingClubEventId(null);
    setClubEventForm({
      title: '',
      type: 'reuniao',
      date: presetDate || selectedDate || todayStr,
      endDate: '',
      time: '19:30',
      endTime: '21:00',
      location: 'Sala de Reuniões',
      attendees: 'Equipa Técnica',
      notes: '',
      isCompleted: false
    });
    setShowClubEventModal(true);
  };

  const handleEditClubEvent = (ev: ClubEvent) => {
    setEditingClubEventId(ev.id);
    setClubEventForm({
      title: ev.title,
      type: ev.type || 'reuniao',
      date: ev.date,
      endDate: ev.endDate || '',
      time: ev.time || '19:30',
      endTime: ev.endTime || '',
      location: ev.location || '',
      attendees: ev.attendees || '',
      notes: ev.notes || '',
      isCompleted: ev.isCompleted === true
    });
    setShowClubEventModal(true);
  };

  const handleSaveClubEventModal = () => {
    if (!clubEventForm.title.trim()) {
      onShowToast('Por favor insere o título da reunião / formação!');
      return;
    }
    if (!clubEventForm.date) {
      onShowToast('Por favor seleciona a data!');
      return;
    }

    if (editingClubEventId) {
      const updated = (state.clubEvents || []).map((e) => {
        if (e.id === editingClubEventId) {
          return {
            ...e,
            title: clubEventForm.title.trim(),
            type: clubEventForm.type,
            date: clubEventForm.date,
            endDate: clubEventForm.endDate ? clubEventForm.endDate : undefined,
            time: clubEventForm.time || undefined,
            endTime: clubEventForm.endTime ? clubEventForm.endTime : undefined,
            location: clubEventForm.location.trim() || undefined,
            attendees: clubEventForm.attendees.trim() || undefined,
            notes: clubEventForm.notes.trim() || undefined,
            isCompleted: clubEventForm.isCompleted,
            completedAt: clubEventForm.isCompleted ? e.completedAt || new Date().toISOString() : undefined
          };
        }
        return e;
      });
      onUpdateState({ clubEvents: updated });
      setShowClubEventModal(false);
      setEditingClubEventId(null);
      onShowToast('Reunião / Formação atualizada na Agenda! 👥');
      return;
    }

    const newEvent: ClubEvent = {
      id: uid(),
      title: clubEventForm.title.trim(),
      type: clubEventForm.type,
      date: clubEventForm.date,
      endDate: clubEventForm.endDate ? clubEventForm.endDate : undefined,
      time: clubEventForm.time || undefined,
      endTime: clubEventForm.endTime ? clubEventForm.endTime : undefined,
      location: clubEventForm.location.trim() || undefined,
      attendees: clubEventForm.attendees.trim() || undefined,
      notes: clubEventForm.notes.trim() || undefined,
      isCompleted: clubEventForm.isCompleted,
      completedAt: clubEventForm.isCompleted ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    };

    const updated = [...(state.clubEvents || []), newEvent].sort((a, b) => a.date.localeCompare(b.date));
    onUpdateState({ clubEvents: updated });
    setShowClubEventModal(false);
    onShowToast('Reunião / Formação registada na Agenda! 👥');
  };

  const handleToggleClubEventStatus = (id: string, currentlyCompleted: boolean) => {
    const nextStatus = !currentlyCompleted;
    const updated = (state.clubEvents || []).map((e) => {
      if (e.id === id) {
        return {
          ...e,
          isCompleted: nextStatus,
          completedAt: nextStatus ? new Date().toISOString() : undefined
        };
      }
      return e;
    });
    onUpdateState({ clubEvents: updated });
    onShowToast(nextStatus ? 'Reunião / Formação marcada como Concluída! ✓' : 'Reunião / Formação reaberta.');
  };

  const handleDeleteClubEvent = (id: string) => {
    const updated = (state.clubEvents || []).filter((e) => e.id !== id);
    const updatedTeams = (state.teams || []).map((t) => {
      if (t.id === state.activeTeamId) {
        return {
          ...t,
          clubEvents: updated
        };
      }
      return t;
    });
    onUpdateState({ clubEvents: updated, teams: updatedTeams });
    onShowToast('Reunião / Formação removida da agenda com sucesso! 🗑️');
  };

  return {
    showMatchModal,
    setShowMatchModal,
    editingMatchId,
    matchForm,
    setMatchForm,
    handleOpenScheduleMatch,
    handleEditScheduledMatch,
    handleSaveMatch,
    handleStartMatch,
    handleDeleteMatch,
    handleCopyCallup,

    showTrainingModal,
    setShowTrainingModal,
    editingTrainingId,
    trainingForm,
    setTrainingForm,
    handleOpenScheduleTraining,
    handleEditTraining,
    handleSaveTrainingModal,
    handleSaveBatchTrainings,
    handleToggleTrainingStatus,
    handleDeleteTraining,

    showStaffModal,
    setShowStaffModal,
    editingStaffId,
    staffForm,
    setStaffForm,
    handleOpenScheduleStaff,
    handleEditStaffUnavailability,
    handleSaveStaffModal,
    handleDeleteStaffUnavailability,

    showClubEventModal,
    setShowClubEventModal,
    editingClubEventId,
    clubEventForm,
    setClubEventForm,
    handleOpenClubEventModal,
    handleEditClubEvent,
    handleSaveClubEventModal,
    handleToggleClubEventStatus,
    handleDeleteClubEvent,

    showFabMenu,
    setShowFabMenu,
    quickAddDropdownOpen,
    setQuickAddDropdownOpen
  };
}
