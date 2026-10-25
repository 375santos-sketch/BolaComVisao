import React, { useState } from 'react';
import { BirthdayImageModal } from './birthday/BirthdayImageModal';
import { AppState, Player, StaffMember } from '../types';
import {
  BirthdayPerson,
  BirthdayTypeFilter,
  BirthdayPeriodFilter,
  getAllBirthdays,
  filterBirthdays,
  getBirthdayGreetingMessage
} from '../lib/birthdayUtils';

interface BirthdaySectionProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onEditPlayer?: (player: Player) => void;
  onEditStaff?: (staff: StaffMember) => void;
  onNavigateToPlayers?: () => void;
  onNavigateToStaff?: () => void;
  onShowToast: (msg: string) => void;
}

export const BirthdaySection: React.FC<BirthdaySectionProps> = ({ state, onEditPlayer, onEditStaff, onShowToast }) => {
  const [typeFilter, setTypeFilter] = useState<BirthdayTypeFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<BirthdayPeriodFilter>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMissingAlert, setShowMissingAlert] = useState(false);

  const roster = (state.roster || []).filter((p) => p && p.active !== false);
  const staffMembers = state.staffMembers || [];

  // All birthdays sorted by proximity
  const allBirthdays = getAllBirthdays(roster, staffMembers);

  // Today's birthdays
  const todayBirthdays = allBirthdays.filter((b) => b.isToday);

  // Next 7 days & 30 days counts
  const next7DaysCount = allBirthdays.filter((b) => b.daysUntil <= 7).length;
  const next30DaysCount = allBirthdays.filter((b) => b.daysUntil <= 30).length;

  // People missing birthDate
  const playersMissingDate = roster.filter((p) => !p.birthDate);
  const staffMissingDate = staffMembers.filter((s) => !s.birthDate);
  const totalMissing = playersMissingDate.length + staffMissingDate.length;

  // Filtered list
  const filteredList = filterBirthdays(allBirthdays, typeFilter, periodFilter).filter((person) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      person.name.toLowerCase().includes(term) ||
      person.roleOrPosition.toLowerCase().includes(term) ||
      person.formattedDayMonth.toLowerCase().includes(term)
    );
  });

  const [imagePerson, setImagePerson] = useState<BirthdayPerson | null>(null);

  const handleShareWhatsApp = (person: BirthdayPerson) => {
    const text = getBirthdayGreetingMessage(person, state.myClubName);
    const cleanPhone = person.phone ? person.phone.replace(/\D/g, '') : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
    onShowToast(`Mensagem de parabéns aberta para ${person.name}! 💬🎉`);
  };

  const handleCopyGreeting = (person: BirthdayPerson) => {
    const text = getBirthdayGreetingMessage(person, state.myClubName);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        onShowToast(`Mensagem de parabéns de ${person.name} copiada! 📋✓`);
      })
      .catch(() => {
        onShowToast('Erro ao copiar mensagem.');
      });
  };

  const getDaysUntilLabel = (days: number, isToday: boolean) => {
    if (isToday) {
      return {
        text: '🎉 HOJE!',
        badgeBg: 'bg-fuchsia-500 text-slate-950 font-black animate-pulse shadow-[0_0_15px_rgba(217,70,239,0.6)]'
      };
    }
    if (days === 1) {
      return {
        text: '⚡ Amanhã',
        badgeBg: 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
      };
    }
    if (days <= 7) {
      return { text: `Em ${days} dias`, badgeBg: 'bg-cyan-950 text-cyan-300 border border-cyan-500/50' };
    }
    if (days <= 30) {
      return { text: `Em ${days} dias`, badgeBg: 'bg-slate-900 text-slate-300 border border-slate-700' };
    }
    return { text: `Em ${days} dias`, badgeBg: 'bg-slate-950 text-slate-400 border border-slate-800' };
  };

  return (
    <div className="space-y-5 animate-fade-in text-left">
      {/* ========================================================================= */}
      {/* 1. TOP STATS & QUICK HIGHLIGHT BANNER */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Card Hoje */}
        <div
          onClick={() => {
            setPeriodFilter('hoje');
            setTypeFilter('todos');
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            todayBirthdays.length > 0
              ? 'bg-gradient-to-br from-fuchsia-950/90 to-purple-950/80 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:scale-[1.02]'
              : 'bg-slate-900/80 border-cyan-500/20 hover:border-cyan-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xl">🎂</span>
            {todayBirthdays.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-fuchsia-500 text-slate-950 text-[10px] font-black uppercase font-mono animate-bounce">
                Hoje!
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] text-white">{todayBirthdays.length}</div>
          <div className="text-[11px] font-mono text-fuchsia-300 font-semibold uppercase tracking-wider">
            Aniversários Hoje
          </div>
        </div>

        {/* Card 7 Dias */}
        <div
          onClick={() => {
            setPeriodFilter('7dias');
            setTypeFilter('todos');
          }}
          className="ui-card p-3.5 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xl">⚡</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30">
              7 Dias
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] text-cyan-300">{next7DaysCount}</div>
          <div className="text-[11px] font-mono text-slate-400">Próximos 7 dias</div>
        </div>

        {/* Card 30 Dias */}
        <div
          onClick={() => {
            setPeriodFilter('30dias');
            setTypeFilter('todos');
          }}
          className="ui-card p-3.5 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xl">📅</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30">
              30 Dias
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] text-white">{next30DaysCount}</div>
          <div className="text-[11px] font-mono text-slate-400">Próximos 30 dias</div>
        </div>

        {/* Card Total Registados */}
        <div
          onClick={() => {
            setPeriodFilter('todos');
            setTypeFilter('todos');
          }}
          className="ui-card p-3.5 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xl">👥</span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              Total
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] text-white">{allBirthdays.length}</div>
          <div className="text-[11px] font-mono text-slate-400">Datas Registadas</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FESTIVE BANNER: ANIVERSÁRIOS DE HOJE                                   */}
      {/* ========================================================================= */}
      {todayBirthdays.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-fuchsia-950/95 via-purple-950/90 to-slate-950 border-2 border-fuchsia-500 relative overflow-hidden">
          {/* Subtle party icon decorations */}
          <div className="absolute top-2 right-3 text-4xl opacity-20 pointer-events-none select-none">🎉🎈✨</div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl p-2 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-300 animate-bounce">
              🎂
            </span>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fuchsia-300 block">
                FESTA NO BALNEÁRIO • ALERTA AUTOMÁTICO
              </span>
              <h2 className="text-base sm:text-xl font-['Chakra_Petch'] font-black text-white">
                {todayBirthdays.length === 1
                  ? `🎉 Hoje é o aniversário de ${todayBirthdays[0].name}!`
                  : `🎉 Hoje temos ${todayBirthdays.length} aniversários no clube!`}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {todayBirthdays.map((person) => (
              <div key={person.id} className="ui-inset p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Photo / Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border-2 border-fuchsia-400 flex items-center justify-center overflow-hidden">
                      {person.photoUrl ? (
                        <img
                          src={person.photoUrl}
                          alt={person.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xl">{person.type === 'jogador' ? '🏃' : '👔'}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-xs">🎉</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-['Chakra_Petch'] font-bold text-white text-sm sm:text-base truncate">
                        {person.name}
                      </span>
                      {person.jerseyNumber !== undefined && person.jerseyNumber !== null && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                          #{person.jerseyNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono text-fuchsia-200 mt-0.5">
                      <span className="px-1.5 py-0.2 rounded bg-fuchsia-950/80 border border-fuchsia-500/40 text-[10px] font-bold">
                        {person.type === 'jogador' ? 'Jogador' : person.roleOrPosition}
                      </span>
                      <span>—</span>
                      <strong className="text-white font-bold text-xs sm:text-sm">{person.nextAge} anos</strong>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setImagePerson(person)}
                    className="px-2.5 py-1.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-black text-xs shadow transition-all"
                    title="Imagem de parabéns para partilhar"
                    aria-label={`Imagem de parabéns para ${person.name}`}
                  >
                    🖼️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(person)}
                    className="ui-btn ui-btn-success px-2.5 py-1.5 text-xs flex items-center gap-1"
                    title="Felicitar pelo WhatsApp"
                  >
                    <span>💬</span>
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyGreeting(person)}
                    className="ui-btn ui-btn-soft p-1.5 text-xs"
                    title="Copiar mensagem de felicitação"
                  >
                    📋
                  </button>

                  {person.type === 'jogador' && person.rawPlayer && onEditPlayer && (
                    <button
                      type="button"
                      onClick={() => onEditPlayer(person.rawPlayer!)}
                      className="ui-btn ui-btn-secondary p-1.5 text-xs"
                      title="Ver Ficha do Jogador"
                    >
                      👤
                    </button>
                  )}

                  {person.type === 'equipa_tecnica' && person.rawStaff && onEditStaff && (
                    <button
                      type="button"
                      onClick={() => onEditStaff(person.rawStaff!)}
                      className="ui-btn ui-btn-secondary p-1.5 text-xs"
                      title="Ver Ficha da Equipa Técnica"
                    >
                      👔
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FILTERS & SEARCH TOOLBAR                                              */}
      {/* ========================================================================= */}
      <div className="ui-card p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filter 1: Type (Todos | Jogadores | Equipa Técnica) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-bold mr-1 shrink-0">Ver:</span>

            <button
              type="button"
              onClick={() => setTypeFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                typeFilter === 'todos'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>🌟 Todos</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 text-current">
                {allBirthdays.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('jogadores')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                typeFilter === 'jogadores'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>🏃 Jogadores</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 text-current">
                {allBirthdays.filter((b) => b.type === 'jogador').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('equipa_tecnica')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                typeFilter === 'equipa_tecnica'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>👔 Equipa Técnica</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 text-current">
                {allBirthdays.filter((b) => b.type === 'equipa_tecnica').length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-64">
            <input
              type="text"
              placeholder="Pesquisar por nome ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ui-input w-full text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter 2: Period (Hoje | Próximos 7 dias | Próximos 30 dias | Todos) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-800/60">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold mr-1 shrink-0">Período:</span>

          <button
            type="button"
            onClick={() => setPeriodFilter('hoje')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
              periodFilter === 'hoje'
                ? 'bg-fuchsia-500 text-slate-950 font-bold'
                : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            🎂 Hoje ({todayBirthdays.length})
          </button>

          <button
            type="button"
            onClick={() => setPeriodFilter('7dias')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
              periodFilter === '7dias'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            ⚡ Próximos 7 dias ({next7DaysCount})
          </button>

          <button
            type="button"
            onClick={() => setPeriodFilter('30dias')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
              periodFilter === '30dias'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            📅 Próximos 30 dias ({next30DaysCount})
          </button>

          <button
            type="button"
            onClick={() => setPeriodFilter('todos')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
              periodFilter === 'todos'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            🗓️ Todos os Aniversários ({allBirthdays.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BIRTHDAYS LIST / CARDS                                                 */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-lg">📅</span>
            <h3 className="font-['Chakra_Petch'] font-bold text-base text-white uppercase tracking-wider">
              {periodFilter === 'hoje'
                ? 'Aniversários de Hoje'
                : periodFilter === '7dias'
                  ? 'Próximos 7 Dias'
                  : periodFilter === '30dias'
                    ? 'Próximos 30 Dias'
                    : 'Próximos Aniversários'}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
              {filteredList.length}
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Ordenado por proximidade da data
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border-2 border-dashed border-slate-800 text-center">
            <div className="text-4xl mb-2">🎈</div>
            <h4 className="font-['Chakra_Petch'] font-bold text-white text-sm uppercase mb-1">
              Nenhum aniversário encontrado para este filtro
            </h4>
            <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto mb-3">
              Experimenta selecionar outro período ou limpar o termo de pesquisa.
            </p>
            <button
              type="button"
              onClick={() => {
                setPeriodFilter('todos');
                setTypeFilter('todos');
                setSearchTerm('');
              }}
              className="ui-btn ui-btn-soft px-3 py-1.5 text-xs"
            >
              Ver Todos os Aniversários
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredList.map((person) => {
              const isPlayer = person.type === 'jogador';
              const daysInfo = getDaysUntilLabel(person.daysUntil, person.isToday);

              return (
                <div
                  key={person.id}
                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between group ${
                    person.isToday
                      ? 'bg-gradient-to-br from-fuchsia-950/90 via-slate-900 to-slate-950 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.25)]'
                      : isPlayer
                        ? 'bg-slate-900/80 border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-900'
                        : 'bg-slate-900/80 border-amber-500/30 hover:border-amber-400 hover:bg-slate-900'
                  }`}
                >
                  {/* Top Row: Avatar, Name, Role & Days Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border-2 shadow-sm ${
                              person.isToday
                                ? 'bg-slate-900 border-fuchsia-400'
                                : isPlayer
                                  ? 'bg-slate-950 border-cyan-400/60'
                                  : 'bg-slate-950 border-amber-400/60'
                            }`}
                          >
                            {person.photoUrl ? (
                              <img
                                src={person.photoUrl}
                                alt={person.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-xl">{isPlayer ? '🏃' : '👔'}</span>
                            )}
                          </div>
                        </div>

                        {/* Name and Tag */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-['Chakra_Petch'] font-bold text-white text-sm sm:text-base leading-tight group-hover:text-cyan-300 transition-colors truncate">
                              {person.name}
                            </h4>
                            {person.jerseyNumber !== undefined && person.jerseyNumber !== null && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                                #{person.jerseyNumber}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {isPlayer ? (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-semibold flex items-center gap-1">
                                <span>🏃 Jogador</span>
                                {person.roleOrPosition && person.roleOrPosition !== 'Jogador' && (
                                  <span>• {person.roleOrPosition}</span>
                                )}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-semibold flex items-center gap-1">
                                <span>👔 {person.roleOrPosition}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Countdown badge */}
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-mono shrink-0 ${daysInfo.badgeBg}`}>
                        {daysInfo.text}
                      </span>
                    </div>

                    {/* Birthday Info Card */}
                    <div className="ui-inset p-2.5 space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>🎂 Data:</span>
                        </span>
                        <span className="font-bold text-white">{person.formattedDayMonth}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>📆 Nascimento:</span>
                        </span>
                        <span className="text-slate-300">{person.formattedBirthDate}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">
                          {person.isToday ? '🎉 Completa hoje:' : '🎉 Irá completar:'}
                        </span>
                        <span className="font-bold text-amber-300 text-sm">{person.nextAge} anos</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setImagePerson(person)}
                        className="ui-btn ui-btn-soft px-2.5 py-1 text-xs"
                        title="Imagem de parabéns para partilhar"
                        aria-label={`Imagem de parabéns para ${person.name}`}
                      >
                        🖼️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(person)}
                        className="ui-btn ui-btn-soft-success px-2.5 py-1 text-xs flex items-center gap-1"
                        title="Enviar mensagem no WhatsApp"
                      >
                        <span>💬</span>
                        <span className="text-[11px]">WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyGreeting(person)}
                        className="ui-btn ui-btn-secondary p-1.5 text-xs"
                        title="Copiar texto de parabéns"
                      >
                        📋
                      </button>
                    </div>

                    {isPlayer && person.rawPlayer && onEditPlayer && (
                      <button
                        type="button"
                        onClick={() => onEditPlayer(person.rawPlayer!)}
                        className="ui-btn ui-btn-soft px-2.5 py-1 text-[11px]"
                        title="Editar ficha do jogador"
                      >
                        Ficha ➔
                      </button>
                    )}

                    {!isPlayer && person.rawStaff && onEditStaff && (
                      <button
                        type="button"
                        onClick={() => onEditStaff(person.rawStaff!)}
                        className="ui-btn ui-btn-soft-warning px-2.5 py-1 text-[11px]"
                        title="Editar ficha técnica"
                      >
                        Ficha ➔
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. HELPER ALERT: MISSING BIRTHDAYS NOTICE                                 */}
      {/* ========================================================================= */}
      {totalMissing > 0 && (
        <div className="ui-inset p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base">⚠️</span>
              <span className="font-['Chakra_Petch'] font-bold text-xs uppercase text-amber-300">
                {totalMissing}{' '}
                {totalMissing === 1 ? 'membro sem data de nascimento' : 'membros sem data de nascimento registada'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowMissingAlert(!showMissingAlert)}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
            >
              {showMissingAlert ? 'Ocultar detalhes ▲' : 'Ver quem falta ▼'}
            </button>
          </div>

          <p className="text-xs text-slate-400 font-mono">
            Para que o sistema consiga emitir os alertas automáticos e notificações de aniversário, preenche a data de
            nascimento na ficha correspondente.
          </p>

          {showMissingAlert && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 animate-fadeIn">
              {playersMissingDate.length > 0 && (
                <div className="ui-card p-2.5">
                  <span className="text-[11px] font-mono font-bold text-cyan-400 block mb-1">
                    🏃 Jogadores ({playersMissingDate.length}):
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                    {playersMissingDate.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs font-mono text-slate-300">
                        <span className="truncate">
                          {p.name} {p.number !== null ? `(#${p.number})` : ''}
                        </span>
                        {onEditPlayer && (
                          <button
                            type="button"
                            onClick={() => onEditPlayer(p)}
                            className="text-[10px] text-cyan-400 hover:underline shrink-0 ml-2"
                          >
                            + Registar Data
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {staffMissingDate.length > 0 && (
                <div className="ui-card p-2.5">
                  <span className="text-[11px] font-mono font-bold text-amber-400 block mb-1">
                    👔 Equipa Técnica ({staffMissingDate.length}):
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                    {staffMissingDate.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs font-mono text-slate-300">
                        <span className="truncate">
                          {s.name} ({s.role})
                        </span>
                        {onEditStaff && (
                          <button
                            type="button"
                            onClick={() => onEditStaff(s)}
                            className="text-[10px] text-amber-400 hover:underline shrink-0 ml-2"
                          >
                            + Registar Data
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {imagePerson && (
        <BirthdayImageModal
          person={imagePerson}
          state={state}
          onShowToast={onShowToast}
          onClose={() => setImagePerson(null)}
        />
      )}
    </div>
  );
};
