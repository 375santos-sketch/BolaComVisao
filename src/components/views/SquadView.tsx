import React from 'react';
import { AppState } from '../../types';
import { TabType } from '../Navbar';
import { t } from '../../i18n/dict';
import { Header } from '../Header';
import { AttendanceSection } from '../AttendanceSection';
import { BirthdaySection } from '../BirthdaySection';
import { StaffSection } from '../StaffSection';
import { StaffChatSection } from './StaffChatSection';
import { StaffHighlightSection } from '../StaffHighlightSection';
import { StaffModal } from '../StaffModal';
import { ImportExcelPlayersModal } from '../ImportExcelPlayersModal';

import { SquadTab, SquadViewMode, SquadSortBy, SquadSortDirection } from './squad/types';
import { useSquadRoster } from './squad/hooks/useSquadRoster';
import { SquadTabsNav } from './squad/SquadTabsNav';
import { SquadHeaderBanner } from './squad/SquadHeaderBanner';
import { SquadFilters } from './squad/SquadFilters';
import { SquadListView } from './squad/SquadListView';
import { SquadGridView } from './squad/SquadGridView';
import { SquadPlayerFormModal } from './squad/SquadPlayerFormModal';
import { SquadPlayerDetailModal } from './squad/SquadPlayerDetailModal';

interface SquadViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (view: TabType) => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onOpenSync: () => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast: (msg: string) => void;
  initialSquadTab?: SquadTab;
}

export const SquadView: React.FC<SquadViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowConfirm,
  onShowToast,
  initialSquadTab = 'jogadores'
}) => {
  const squad = useSquadRoster({
    state,
    onUpdateState,
    onShowConfirm,
    onShowToast,
    initialTab: initialSquadTab
  });

  const selectedPlayerObj = squad.selectedPlayerId
    ? squad.activeRoster.find((p) => p.id === squad.selectedPlayerId) || null
    : null;
  const selectedPlayerStats = squad.selectedPlayerId ? squad.calcPlayerStats(squad.selectedPlayerId) : null;

  return (
    <div className="squad-view animate-fade-in pb-28">
      <Header
        title={t(state.lang, 'pl_title')}
        lang={state.lang}
        onGoHome={() => onNavigate('home')}
        onOpenSettings={onOpenSettings}
        onOpenDatabase={() => onNavigate('teams')}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
        syncInfo={state.syncInfo}
        currentUser={state.currentUser}
        clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
      />

      {/* Squad Submenu Navigation */}
      <SquadTabsNav
        activeSquadTab={squad.activeSquadTab}
        setActiveSquadTab={squad.setActiveSquadTab}
        activeRosterCount={squad.activeRoster.length}
        staffCount={(state.staffMembers || []).length}
        staffMessagesCount={(state.staffMessages || []).length}
        allBirthdaysList={squad.allBirthdaysList}
        todayBirthdaysCount={squad.todayBirthdaysCount}
      />

      {/* ASSIDUIDADE SECTION (SUBMENU) */}
      {squad.activeSquadTab === 'assiduidade' && (
        <AttendanceSection
          state={state}
          onNavigate={onNavigate}
          onShowToast={onShowToast}
          onSelectPlayer={(id) => {
            squad.setActiveSquadTab('jogadores');
            squad.setSelectedPlayerId(id);
          }}
        />
      )}

      {/* ANIVERSÁRIOS SECTION (SUBMENU) */}
      {squad.activeSquadTab === 'aniversarios' && (
        <BirthdaySection
          state={state}
          onUpdateState={onUpdateState}
          onEditPlayer={(p) => squad.handleOpenEditModal(p)}
          onEditStaff={(s) => squad.handleEditStaffMember(s)}
          onNavigateToPlayers={() => squad.setActiveSquadTab('jogadores')}
          onNavigateToStaff={() => squad.setActiveSquadTab('equipa_tecnica')}
          onShowToast={onShowToast}
        />
      )}

      {/* STAFF SECTION (SUBMENU) */}
      {squad.activeSquadTab === 'equipa_tecnica' && (
        <StaffSection
          state={state}
          onUpdateState={onUpdateState}
          onShowConfirm={onShowConfirm}
          onShowToast={onShowToast}
          onNavigateToChat={() => squad.setActiveSquadTab('chat_staff')}
        />
      )}

      {/* STAFF CHAT & RECADOS SECTION (SUBMENU) */}
      {squad.activeSquadTab === 'chat_staff' && (
        <StaffChatSection
          state={state}
          onUpdateState={onUpdateState}
          onShowConfirm={onShowConfirm}
          onShowToast={onShowToast}
          onNavigateToCalendar={() => onNavigate('calendario')}
        />
      )}

      {/* PLAYERS SECTION */}
      {squad.activeSquadTab === 'jogadores' && (
        <>
          {/* Roster Header Banner with Export & Mode Switcher */}
          <SquadHeaderBanner
            state={state}
            activeRosterCount={squad.activeRoster.length}
            viewMode={squad.viewMode}
            setViewMode={squad.setViewMode}
            statusCounts={squad.statusCounts}
            statusFilter={squad.statusFilter}
            setStatusFilter={squad.setStatusFilter}
            onOpenCreateModal={squad.handleOpenCreateModal}
            onOpenImportExcel={() => squad.setIsImportExcelOpen(true)}
            onUpdateState={onUpdateState}
            onShowConfirm={onShowConfirm}
            onShowToast={onShowToast}
          />

          {/* Search & Sort / Filter Bar */}
          <SquadFilters
            searchQuery={squad.searchQuery}
            setSearchQuery={squad.setSearchQuery}
            statusFilter={squad.statusFilter}
            setStatusFilter={squad.setStatusFilter}
            sortBy={squad.sortBy}
            setSortBy={squad.setSortBy}
            sortDirection={squad.sortDirection}
            setSortDirection={squad.setSortDirection}
          />

          {/* Players Content Area */}
          {squad.sortedRoster.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl my-4">
              <div className="text-3xl mb-2">⚽</div>
              <p className="text-sm font-['Chakra_Petch'] text-cyan-300 uppercase font-bold">
                {squad.activeRoster.length === 0
                  ? 'Nenhum jogador registado no plantel.'
                  : 'Nenhum jogador encontrado com os filtros selecionados.'}
              </p>
              <p className="text-xs font-mono text-slate-500 mt-1 mb-4">
                {squad.activeRoster.length === 0
                  ? 'Comece por adicionar o primeiro atleta da equipa.'
                  : 'Tente pesquisar com outro termo ou limpar os filtros.'}
              </p>
              {squad.activeRoster.length === 0 && (
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={squad.handleOpenCreateModal}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase font-['Chakra_Petch'] transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)]"
                  >
                    ➕ Criar Jogador Manualmente
                  </button>
                  <button
                    onClick={() => squad.setIsImportExcelOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 font-bold text-xs uppercase font-['Chakra_Petch'] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    <span>📥</span>
                    <span>Importar Plantel de Excel</span>
                  </button>
                </div>
              )}
            </div>
          ) : squad.viewMode === 'lista' ? (
            <SquadListView
              state={state}
              sortedRoster={squad.sortedRoster}
              sortBy={squad.sortBy}
              sortDirection={squad.sortDirection}
              onSelectPlayer={squad.setSelectedPlayerId}
              onEditPlayer={squad.handleOpenEditModal}
              onRemovePlayer={squad.handleRemovePlayer}
            />
          ) : (
            <SquadGridView
              state={state}
              sortedRoster={squad.sortedRoster}
              sortBy={squad.sortBy}
              sortDirection={squad.sortDirection}
              onSelectPlayer={squad.setSelectedPlayerId}
              onEditPlayer={squad.handleOpenEditModal}
              onRemovePlayer={squad.handleRemovePlayer}
            />
          )}

          {/* Highlight Area: EQUIPA TÉCNICA at bottom of Squad page */}
          <StaffHighlightSection
            state={state}
            onUpdateState={onUpdateState}
            onNavigateToStaffSection={() => squad.setActiveSquadTab('equipa_tecnica')}
            onShowToast={onShowToast}
          />
        </>
      )}

      {/* CREATE / EDIT PLAYER MODAL */}
      <SquadPlayerFormModal
        isOpen={squad.isModalOpen}
        onClose={() => squad.setIsModalOpen(false)}
        editingPlayerId={squad.editingPlayerId}
        formName={squad.formName}
        setFormName={squad.setFormName}
        formNumber={squad.formNumber}
        setFormNumber={squad.setFormNumber}
        formPosition={squad.formPosition}
        setFormPosition={squad.setFormPosition}
        formBirthDate={squad.formBirthDate}
        setFormBirthDate={squad.setFormBirthDate}
        formDominantFoot={squad.formDominantFoot}
        setFormDominantFoot={squad.setFormDominantFoot}
        formHeight={squad.formHeight}
        setFormHeight={squad.setFormHeight}
        formWeight={squad.formWeight}
        setFormWeight={squad.setFormWeight}
        formPhone={squad.formPhone}
        setFormPhone={squad.setFormPhone}
        formEmail={squad.formEmail}
        setFormEmail={squad.setFormEmail}
        formEmergencyContact={squad.formEmergencyContact}
        setFormEmergencyContact={squad.setFormEmergencyContact}
        formStatus={squad.formStatus}
        setFormStatus={squad.setFormStatus}
        formPhotoUrl={squad.formPhotoUrl}
        setFormPhotoUrl={squad.setFormPhotoUrl}
        onPhotoFileUpload={squad.handlePhotoFileUpload}
        onSavePlayer={squad.handleSavePlayer}
      />

      {/* FULL PLAYER PROFILE DRAWER / MODAL */}
      <SquadPlayerDetailModal
        player={selectedPlayerObj}
        stats={selectedPlayerStats}
        state={state}
        onClose={() => squad.setSelectedPlayerId(null)}
        onEdit={squad.handleOpenEditModal}
        onShowToast={onShowToast}
        onUpdateState={onUpdateState}
      />

      {/* Import Excel Modal */}
      <ImportExcelPlayersModal
        isOpen={squad.isImportExcelOpen}
        onClose={() => squad.setIsImportExcelOpen(false)}
        state={state}
        onUpdateState={onUpdateState}
        onShowToast={onShowToast}
      />

      {/* Staff Member Modal */}
      <StaffModal
        isOpen={squad.isStaffModalOpen}
        onClose={() => {
          squad.setIsStaffModalOpen(false);
          squad.setStaffToEdit(null);
        }}
        staffToEdit={squad.staffToEdit}
        onSave={squad.handleSaveStaffMember}
        onShowToast={onShowToast}
      />
    </div>
  );
};
