import React, { lazy, Suspense } from 'react';
import type { ShowConfirm } from '../ConfirmModal';
import { AppState } from '../../types';
import { TabType } from '../Navbar';
import { t } from '../../i18n/dict';
import { Header } from '../Header';
import { AttendanceSection } from '../AttendanceSection';
import { BirthdaySection } from '../BirthdaySection';
import { StaffSection } from '../StaffSection';
import { StaffHighlightSection } from '../StaffHighlightSection';
import { StaffModal } from '../StaffModal';
import { ImportExcelPlayersModal } from '../ImportExcelPlayersModal';

import { SquadTab } from './squad/types';
import { useSquadRoster } from './squad/hooks/useSquadRoster';
import { SquadTabsNav } from './squad/SquadTabsNav';
import { SquadToolbar } from './squad/SquadToolbar';
import { SquadListView } from './squad/SquadListView';
import { SquadGridView } from './squad/SquadGridView';
import { SquadPlayerFormModal } from './squad/SquadPlayerFormModal';
import { AthleteSheet } from './squad/AthleteSheet';
import { Icon } from '../ui/Icon';

const FitnessTestsSection = lazy(() => import('./squad/FitnessTestsSection'));

interface SquadViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (view: TabType) => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onOpenSync: () => void;
  onShowConfirm: ShowConfirm;
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
        clubInfo={{
          clubName: state.myClubName,
          category: state.category,
          season: state.season,
          logoUrl: state.clubLogoUrl
        }}
      />

      {/* Squad Submenu Navigation */}
      <SquadTabsNav
        activeSquadTab={squad.activeSquadTab}
        setActiveSquadTab={squad.setActiveSquadTab}
        activeRosterCount={squad.activeRoster.length}
        staffCount={(state.staffMembers || []).length}
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

      {/* 📏 TESTES (SUBMENU) */}
      {squad.activeSquadTab === 'testes' && (
        <Suspense fallback={null}>
          <FitnessTestsSection state={state} onUpdateState={onUpdateState} onShowToast={onShowToast} />
        </Suspense>
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
        />
      )}

      {/* PLAYERS SECTION */}
      {squad.activeSquadTab === 'jogadores' && (
        <>
          {/* On a computer the athlete's sheet opens beside the list (list | sheet); on the phone it fills the screen */}
          <div
            className={
              selectedPlayerObj ? 'lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-5' : ''
            }
          >
            <div className="@container min-w-0">
              <SquadToolbar
                state={state}
                activeRosterCount={squad.activeRoster.length}
                viewMode={squad.viewMode}
                setViewMode={squad.setViewMode}
                statusCounts={squad.statusCounts}
                statusFilter={squad.statusFilter}
                setStatusFilter={squad.setStatusFilter}
                sectorFilter={squad.sectorFilter}
                setSectorFilter={squad.setSectorFilter}
                searchQuery={squad.searchQuery}
                setSearchQuery={squad.setSearchQuery}
                sortBy={squad.sortBy}
                setSortBy={squad.setSortBy}
                sortDirection={squad.sortDirection}
                setSortDirection={squad.setSortDirection}
                onOpenCreateModal={squad.handleOpenCreateModal}
                onOpenImportExcel={() => squad.setIsImportExcelOpen(true)}
                onUpdateState={onUpdateState}
                onShowConfirm={onShowConfirm}
                onShowToast={onShowToast}
              />

              {/* Players Content Area */}
              {squad.sortedRoster.length === 0 ? (
                <div className="ui-card my-4 flex flex-col items-center gap-1 p-8 text-center">
                  <Icon name="users" className="mb-1 h-7 w-7 text-ui-muted" />
                  <p className="text-ui-lead font-bold text-ui-text">
                    {squad.activeRoster.length === 0
                      ? 'Ainda não há atletas no plantel'
                      : 'Nenhum atleta com estes filtros'}
                  </p>
                  <p className="text-ui-body text-ui-muted">
                    {squad.activeRoster.length === 0
                      ? 'Começa por adicionar o primeiro atleta da equipa.'
                      : 'Experimenta outro nome ou limpa os filtros.'}
                  </p>
                  {squad.activeRoster.length === 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button onClick={squad.handleOpenCreateModal} className="ui-btn ui-btn-primary min-h-11 px-4">
                        <Icon name="plus" className="h-[18px] w-[18px]" />
                        Criar atleta
                      </button>
                      <button
                        onClick={() => squad.setIsImportExcelOpen(true)}
                        className="ui-btn ui-btn-secondary min-h-11 px-4"
                      >
                        Importar de Excel
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
            </div>
            <AthleteSheet
              player={selectedPlayerObj}
              stats={selectedPlayerStats}
              state={state}
              onClose={() => squad.setSelectedPlayerId(null)}
              onEdit={squad.handleOpenEditModal}
              onRemove={(id) => {
                squad.setSelectedPlayerId(null);
                squad.handleRemovePlayer(id);
              }}
              onShowToast={onShowToast}
              onUpdateState={onUpdateState}
            />
          </div>

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
        formStatusUntil={squad.formStatusUntil}
        setFormStatusUntil={squad.setFormStatusUntil}
        formStatusNote={squad.formStatusNote}
        setFormStatusNote={squad.setFormStatusNote}
        formPhotoUrl={squad.formPhotoUrl}
        setFormPhotoUrl={squad.setFormPhotoUrl}
        onPhotoFileUpload={squad.handlePhotoFileUpload}
        onSavePlayer={squad.handleSavePlayer}
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
