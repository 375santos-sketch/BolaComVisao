import React from 'react';
import { AppState } from '../../types';
import { TabType } from '../Navbar';
import { StatCard } from '../ui/StatCard';

interface DashboardStatsGridProps {
  state: AppState;
  onNavigate: (tab: TabType) => void;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ state, onNavigate }) => {
  const roster = (state.roster || []).filter((p) => p && p.active !== false);
  const matches = state.matches || [];
  const trainings = state.trainings || [];

  const totalPlayers = roster.length;
  const availablePlayers = roster.filter((p) => p.status === 'disponivel' || !p.status).length;
  const unavailablePlayers = roster.filter((p) => p.status === 'lesionado' || p.status === 'suspenso').length;

  const finishedMatches = matches.filter((m) => m.finished);
  const wins = finishedMatches.filter((m) => {
    const scored = m.goals.filter((g) => g.type === 'scored').length;
    const conceded = m.goals.filter((g) => g.type === 'conceded').length;
    return scored > conceded;
  }).length;

  const winRate = finishedMatches.length > 0 ? Math.round((wins / finishedMatches.length) * 100) : 0;

  let avgAttendance = 0;
  const completedTrainings = trainings.filter((t) => t.completed !== false);
  const completedTrainingsCount = completedTrainings.length;

  if (completedTrainingsCount > 0 && totalPlayers > 0) {
    let sumAttendancePct = 0;
    completedTrainings.forEach((tr) => {
      const absentCount = (tr.absences || []).length;
      const presentCount = Math.max(0, totalPlayers - absentCount);
      sumAttendancePct += (presentCount / totalPlayers) * 100;
    });
    avgAttendance = Math.round(sumAttendancePct / completedTrainingsCount);
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Atletas Disponíveis */}
      <div onClick={() => onNavigate('plantel')} className="cursor-pointer transition-transform hover:scale-[1.02]">
        <StatCard
          title="Plantel Disponível"
          value={`${availablePlayers}/${totalPlayers}`}
          subtitle={
            unavailablePlayers > 0 ? `${unavailablePlayers} indisponíveis (lesão/castigo)` : '100% dos atletas aptos'
          }
          icon="👥"
          color={unavailablePlayers > 0 ? 'amber' : 'cyan'}
        />
      </div>

      {/* 2. Taxa de Assiduidade */}
      <div onClick={() => onNavigate('treinos')} className="cursor-pointer transition-transform hover:scale-[1.02]">
        <StatCard
          title="Assiduidade aos Treinos"
          value={completedTrainingsCount > 0 ? `${avgAttendance}%` : '—'}
          subtitle={
            completedTrainingsCount > 0
              ? `${completedTrainingsCount} ${completedTrainingsCount === 1 ? 'sessão realizada' : 'sessões realizadas'}`
              : 'Sem sessões realizadas'
          }
          icon="🏃‍♂️"
          color="emerald"
        />
      </div>

      {/* 3. Jogos Oficiais */}
      <div onClick={() => onNavigate('jogos')} className="cursor-pointer transition-transform hover:scale-[1.02]">
        <StatCard
          title="Jogos Disputados"
          value={finishedMatches.length}
          subtitle={`${wins} vitórias conquistadas`}
          icon="🏆"
          color="cyan"
        />
      </div>

      {/* 4. Taxa de Vitória */}
      <div onClick={() => onNavigate('stats')} className="cursor-pointer transition-transform hover:scale-[1.02]">
        <StatCard
          title="Eficácia de Vitórias"
          value={`${winRate}%`}
          subtitle="Ver análise estatística"
          icon="📊"
          color="amber"
        />
      </div>
    </div>
  );
};
