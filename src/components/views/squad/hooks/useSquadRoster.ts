import { useState, useMemo } from 'react';
import { AppState, Player, PlayerStatus, DominantFoot, StaffMember } from '../../../../types';
import { SquadTab, SquadViewMode, SquadSortBy, SquadSortDirection, POSITION_OPTIONS } from '../types';
import { getPositionRank, sortPlayerObjs, uid, calcPlayerMinutes } from '../../../../lib/utils';
import { withPlayableDurations } from '../../../../lib/playingTime';
import { t } from '../../../../i18n/dict';
import { getAllBirthdays } from '../../../../lib/birthdayUtils';

interface UseSquadRosterProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast: (msg: string) => void;
  initialTab?: SquadTab;
}

export function useSquadRoster({
  state,
  onUpdateState,
  onShowConfirm,
  onShowToast,
  initialTab = 'jogadores'
}: UseSquadRosterProps) {
  // Submenu Tab
  const [activeSquadTab, setActiveSquadTab] = useState<SquadTab>(initialTab);

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);

  // View Mode: 'lista' | 'grelha'
  const [viewMode, setViewMode] = useState<SquadViewMode>('lista');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Sorting
  const [sortBy, setSortBy] = useState<SquadSortBy>('posicao');
  const [sortDirection, setSortDirection] = useState<SquadSortDirection>('asc');

  // Player Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  // Player Detail Drawer State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState<string>('');
  const [formPosition, setFormPosition] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formDominantFoot, setFormDominantFoot] = useState<DominantFoot>('Direito');
  const [formHeight, setFormHeight] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formEmergencyContact, setFormEmergencyContact] = useState('');
  const [formStatus, setFormStatus] = useState<PlayerStatus>('disponivel');
  const [formStatusUntil, setFormStatusUntil] = useState('');
  const [formStatusNote, setFormStatusNote] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');

  // Active Roster
  const activeRoster = useMemo(
    () => sortPlayerObjs((state.roster || []).filter((p) => p.active !== false)),
    [state.roster]
  );

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return activeRoster.filter((p) => {
      const matchName =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.number !== null && p.number !== undefined && String(p.number).includes(q)) ||
        (p.positions || '').toLowerCase().includes(q);
      const pStatus = p.status || 'disponivel';
      const matchStatus = statusFilter === 'todos' || pStatus === statusFilter;
      return matchName && matchStatus;
    });
  }, [activeRoster, searchQuery, statusFilter]);

  // Sorted Roster
  const sortedRoster = useMemo(() => {
    return [...filteredRoster].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'posicao') {
        const rankA = getPositionRank(a.positions);
        const rankB = getPositionRank(b.positions);
        if (rankA !== rankB) {
          diff = rankA - rankB;
        } else {
          const numA =
            a.number !== null && a.number !== undefined && !isNaN(Number(a.number)) ? Number(a.number) : 9999;
          const numB =
            b.number !== null && b.number !== undefined && !isNaN(Number(b.number)) ? Number(b.number) : 9999;
          diff = numA - numB;
        }
      } else if (sortBy === 'numero') {
        const hasNumA = a.number !== null && a.number !== undefined && !isNaN(Number(a.number));
        const hasNumB = b.number !== null && b.number !== undefined && !isNaN(Number(b.number));
        if (hasNumA && hasNumB) {
          diff = Number(a.number) - Number(b.number);
        } else if (hasNumA && !hasNumB) {
          diff = -1;
        } else if (!hasNumA && hasNumB) {
          diff = 1;
        } else {
          diff = (a.name || '').localeCompare(b.name || '', 'pt-PT');
        }
      } else if (sortBy === 'nome') {
        diff = (a.name || '').localeCompare(b.name || '', 'pt-PT', { sensitivity: 'base' });
      }

      return sortDirection === 'asc' ? diff : -diff;
    });
  }, [filteredRoster, sortBy, sortDirection]);

  // Status breakdown count
  const statusCounts = useMemo(() => {
    return activeRoster.reduce(
      (acc, p) => {
        const st = p.status || 'disponivel';
        acc[st] = (acc[st] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [activeRoster]);

  // Birthdays count
  const allBirthdaysList = useMemo(
    () => getAllBirthdays(state.roster || [], state.staffMembers || []),
    [state.roster, state.staffMembers]
  );
  const todayBirthdaysCount = useMemo(() => allBirthdaysList.filter((b) => b.isToday).length, [allBirthdaysList]);

  // Open Modal to create new player
  const handleOpenCreateModal = () => {
    setEditingPlayerId(null);
    setFormName('');
    setFormNumber('');
    setFormPosition(POSITION_OPTIONS[1]);
    setFormBirthDate('');
    setFormDominantFoot('Direito');
    setFormHeight('');
    setFormWeight('');
    setFormPhone('');
    setFormEmail('');
    setFormEmergencyContact('');
    setFormStatus('disponivel');
    setFormStatusUntil('');
    setFormStatusNote('');
    setFormPhotoUrl('');
    setIsModalOpen(true);
  };

  // Open Modal to edit player
  const handleOpenEditModal = (player: Player) => {
    setEditingPlayerId(player.id);
    setFormName(player.name || '');
    setFormNumber(player.number !== null && player.number !== undefined ? String(player.number) : '');
    setFormPosition(player.positions || '');
    setFormBirthDate(player.birthDate || '');
    setFormDominantFoot(player.dominantFoot || 'Direito');
    setFormHeight(player.height || '');
    setFormWeight(player.weight || '');
    setFormPhone(player.phone || '');
    setFormEmail(player.email || '');
    setFormEmergencyContact(player.emergencyContact || '');
    setFormStatus(player.status || 'disponivel');
    setFormStatusUntil(player.statusUntil || '');
    setFormStatusNote(player.statusNote || '');
    setFormPhotoUrl(player.photoUrl || '');
    setIsModalOpen(true);
  };

  // Handle Photo File Upload
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('A foto deve ser inferior a 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormPhotoUrl(event.target.result as string);
        onShowToast('Foto carregada com sucesso! 📷');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Return date and reason only make sense while injured or suspended (cleared otherwise)
  const statusDetails = () =>
    formStatus === 'lesionado' || formStatus === 'suspenso'
      ? { statusUntil: formStatusUntil || '', statusNote: formStatusNote.trim() }
      : { statusUntil: '', statusNote: '' };

  // Save Player
  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      onShowToast('O nome do jogador é obrigatório.');
      return;
    }

    const parsedNumber = formNumber.trim() !== '' ? parseInt(formNumber, 10) : null;

    if (editingPlayerId) {
      // Update existing player
      const updatedRoster = (state.roster || []).map((p) => {
        if (p.id === editingPlayerId) {
          return {
            ...p,
            name: formName.trim(),
            number: parsedNumber,
            positions: formPosition.trim(),
            birthDate: formBirthDate.trim() || null,
            dominantFoot: formDominantFoot,
            height: formHeight.trim(),
            weight: formWeight.trim(),
            phone: formPhone.trim(),
            email: formEmail.trim(),
            emergencyContact: formEmergencyContact.trim(),
            status: formStatus,
            ...statusDetails(),
            photoUrl: formPhotoUrl.trim()
          };
        }
        return p;
      });

      onUpdateState({ roster: updatedRoster });
      onShowToast(`Jogador "${formName.trim()}" atualizado com sucesso! ⚽`);
    } else {
      // Create new player
      const newPlayer: Player = {
        id: uid(),
        name: formName.trim(),
        number: parsedNumber,
        positions: formPosition.trim(),
        birthDate: formBirthDate.trim() || null,
        dominantFoot: formDominantFoot,
        height: formHeight.trim(),
        weight: formWeight.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        emergencyContact: formEmergencyContact.trim(),
        status: formStatus,
        ...statusDetails(),
        photoUrl: formPhotoUrl.trim(),
        active: true
      };

      onUpdateState({ roster: [...(state.roster || []), newPlayer] });
      onShowToast(`Novo jogador "${formName.trim()}" adicionado ao plantel! 🎉`);
    }

    setIsModalOpen(false);
  };

  // Remove / Soft delete player
  const handleRemovePlayer = (id: string) => {
    onShowConfirm(t(state.lang, 'msg_del_pl'), () => {
      const updated = (state.roster || []).map((p) => (p.id === id ? { ...p, active: false } : p));
      onUpdateState({ roster: updated });
      if (selectedPlayerId === id) setSelectedPlayerId(null);
      setIsModalOpen(false);
      onShowToast('Jogador removido do plantel com sucesso.');
    });
  };

  // Calculate Match & Training Stats for a Player
  const calcPlayerStats = (playerId: string) => {
    let golos = 0,
      assistencias = 0,
      amarelos = 0,
      vermelhos = 0,
      somaAvaliacoes = 0,
      numAvaliacoes = 0,
      faltasTreino = 0,
      jogosTitular = 0,
      titularSegundaParte = 0,
      partesTitular = 0,
      totalJogosRealizados = 0,
      minutos = 0;

    (state.matches || []).forEach((m) => {
      if (m.finished) {
        const isStarter1 = (m.lineup || []).includes(playerId);
        const isStarter2 = (m.lineupSecondHalf || []).includes(playerId);
        const enteredAsSub = (m.subs || []).some((s) => s.inId === playerId);
        const hasRating = m.ratings && m.ratings[playerId] !== undefined;
        const playerMins = state.trackSubs ? calcPlayerMinutes(withPlayableDurations(m, state.category), playerId) : 0;
        const participated = isStarter1 || isStarter2 || enteredAsSub || hasRating || playerMins > 0;
        if (participated) {
          totalJogosRealizados++;
        }

        if (state.trackSubs) {
          if (isStarter1) jogosTitular++;
          if (isStarter2) titularSegundaParte++;
          partesTitular += (isStarter1 ? 1 : 0) + (isStarter2 ? 1 : 0);
          minutos += playerMins;
        }
      }
      (m.goals || []).forEach((g) => {
        if (g.type === 'scored' && g.scorerId === playerId) golos++;
        if (g.type === 'scored' && g.assistId === playerId) assistencias++;
      });
      (m.cards || []).forEach((c) => {
        if (c.playerId === playerId) {
          if (c.color === 'Amarelo') amarelos++;
          else vermelhos++;
        }
      });
      if (m.ratings && m.ratings[playerId]) {
        somaAvaliacoes += m.ratings[playerId];
        numAvaliacoes++;
      }
    });

    (state.trainings || []).forEach((tr) => {
      if (tr.completed !== false && tr.absences && tr.absences.includes(playerId)) faltasTreino++;
    });

    return {
      golos,
      assistencias,
      amarelos,
      vermelhos,
      media: numAvaliacoes > 0 ? (somaAvaliacoes / numAvaliacoes).toFixed(1) : '-',
      faltasTreino,
      jogosTitular,
      titularSegundaParte,
      partesTitular,
      totalJogosRealizados,
      jogosRealizados: totalJogosRealizados,
      minutos
    };
  };

  // Staff handlers
  const handleEditStaffMember = (staff: StaffMember) => {
    setStaffToEdit(staff);
    setIsStaffModalOpen(true);
  };

  const handleSaveStaffMember = (updatedStaff: StaffMember) => {
    const existing = state.staffMembers || [];
    const idx = existing.findIndex((s) => s.id === updatedStaff.id);
    let updatedList: StaffMember[];
    if (idx >= 0) {
      updatedList = existing.map((s) => (s.id === updatedStaff.id ? updatedStaff : s));
      onShowToast(`Elemento "${updatedStaff.name}" atualizado com sucesso! ✓`);
    } else {
      updatedList = [...existing, updatedStaff];
      onShowToast(`Novo elemento "${updatedStaff.name}" adicionado com sucesso! ✓`);
    }
    onUpdateState({ staffMembers: updatedList });
  };

  return {
    activeSquadTab,
    setActiveSquadTab,
    isStaffModalOpen,
    setIsStaffModalOpen,
    staffToEdit,
    setStaffToEdit,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    isModalOpen,
    setIsModalOpen,
    isImportExcelOpen,
    setIsImportExcelOpen,
    editingPlayerId,
    selectedPlayerId,
    setSelectedPlayerId,
    formName,
    setFormName,
    formNumber,
    setFormNumber,
    formPosition,
    setFormPosition,
    formBirthDate,
    setFormBirthDate,
    formDominantFoot,
    setFormDominantFoot,
    formHeight,
    setFormHeight,
    formWeight,
    setFormWeight,
    formPhone,
    setFormPhone,
    formEmail,
    setFormEmail,
    formEmergencyContact,
    setFormEmergencyContact,
    formStatus,
    setFormStatus,
    formStatusUntil,
    setFormStatusUntil,
    formStatusNote,
    setFormStatusNote,
    formPhotoUrl,
    setFormPhotoUrl,
    activeRoster,
    filteredRoster,
    sortedRoster,
    statusCounts,
    allBirthdaysList,
    todayBirthdaysCount,
    handleOpenCreateModal,
    handleOpenEditModal,
    handlePhotoFileUpload,
    handleSavePlayer,
    handleRemovePlayer,
    calcPlayerStats,
    handleEditStaffMember,
    handleSaveStaffMember
  };
}
