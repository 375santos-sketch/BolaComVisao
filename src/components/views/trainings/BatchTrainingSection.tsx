import React, { useState, useMemo } from 'react';
import { Training } from '../../../types';
import { uid } from '../../../lib/utils';
import { WEEKDAY_CONFIG, QUICK_TIMES, calculateBatchTrainings } from './batchTrainingUtils';

export interface GeneratedTrainingPreview {
  date: string;
  formattedDate: string;
  dayOfWeek: number;
  dayName: string;
  dayShort: string;
  time: string;
  location: string;
  type: string;
  durationMinutes: number;
}

interface BatchTrainingSectionProps {
  existingTrainings?: Training[];
  onGenerate: (newTrainings: Training[]) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const BatchTrainingSection: React.FC<BatchTrainingSectionProps> = ({
  existingTrainings = [],
  onGenerate,
  onCancel,
  isModal = false
}) => {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  }, []);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 4]); // Terça e Quinta por defeito
  const [defaultTime, setDefaultTime] = useState('18:30');
  const [useCustomDayTimes, setUseCustomDayTimes] = useState(false);
  const [dayTimes, setDayTimes] = useState<Record<number, string>>({
    1: '18:30',
    2: '18:30',
    3: '18:30',
    4: '18:30',
    5: '18:30',
    6: '10:00',
    0: '10:00'
  });
  const [location, setLocation] = useState('Campo Sintético');
  const [type, setType] = useState('⚡ Tático');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [notes, setNotes] = useState('');
  const [completed, setCompleted] = useState(false);
  const [avoidDuplicates, setAvoidDuplicates] = useState(true);
  const [showPreviewList, setShowPreviewList] = useState(false);

  // Quick Preset Handlers
  const handleApplyPreset = (months: number) => {
    const base = startDate ? new Date(startDate) : new Date();
    base.setMonth(base.getMonth() + months);
    setEndDate(base.toISOString().slice(0, 10));
  };

  const handleApplySeasonPreset = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    // Season usually ends June 30
    const targetYear = currentMonth >= 6 ? currentYear + 1 : currentYear;
    setEndDate(`${targetYear}-06-30`);
  };

  // Toggle Day selection
  const handleToggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Keep at least one
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays(
        [...selectedDays, day].sort((a, b) => {
          const orderA = a === 0 ? 7 : a;
          const orderB = b === 0 ? 7 : b;
          return orderA - orderB;
        })
      );
    }
  };

  const handleSetDayTime = (day: number, timeVal: string) => {
    setDayTimes((prev) => ({
      ...prev,
      [day]: timeVal
    }));
  };

  // Calculate previews
  const previews = useMemo(() => {
    return calculateBatchTrainings({
      startDate,
      endDate,
      selectedDays,
      defaultTime,
      useCustomDayTimes,
      dayTimes,
      location,
      type,
      durationMinutes
    });
  }, [startDate, endDate, selectedDays, defaultTime, useCustomDayTimes, dayTimes, location, type, durationMinutes]);

  // Existing keys to check duplicates
  const existingKeys = useMemo(() => {
    return new Set(existingTrainings.map((t) => `${t.date}_${t.time || 'default'}`));
  }, [existingTrainings]);

  // Filter out duplicates if requested
  const finalTrainingsToCreate = useMemo(() => {
    if (!avoidDuplicates) return previews;
    return previews.filter((p) => !existingKeys.has(`${p.date}_${p.time}`));
  }, [previews, avoidDuplicates, existingKeys]);

  const duplicateCount = previews.length - finalTrainingsToCreate.length;

  // Breakdown by weekday
  const weekdayBreakdown = useMemo(() => {
    const counts: Record<number, { count: number; time: string; name: string }> = {};
    previews.forEach((p) => {
      if (!counts[p.dayOfWeek]) {
        counts[p.dayOfWeek] = { count: 0, time: p.time, name: p.dayName };
      }
      counts[p.dayOfWeek].count += 1;
    });
    return counts;
  }, [previews]);

  const handleGenerate = () => {
    if (finalTrainingsToCreate.length === 0) return;

    const newTrainings: Training[] = finalTrainingsToCreate.map((item) => ({
      id: uid(),
      date: item.date,
      time: item.time,
      location: location || 'Campo Sintético',
      type: type || '⚡ Tático',
      notes: notes || '',
      absences: [],
      completed,
      durationMinutes: durationMinutes || 90
    }));

    onGenerate(newTrainings);
  };

  return (
    <div className={`space-y-4 text-left ${isModal ? '' : 'animate-fadeIn'}`}>
      {/* Informative Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/40 shadow-lg relative overflow-hidden">
        <div className="flex items-start gap-3 relative z-10">
          <span className="text-2xl p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shrink-0">
            📅
          </span>
          <div>
            <h3 className="font-['Chakra_Petch'] font-black text-sm sm:text-base text-white uppercase tracking-wider">
              Adicionar Múltiplos Treinos por Período
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Define o intervalo de datas, escolhe os dias da semana e personaliza os horários para gerar toda a grelha
              de treinos automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* 1. PERÍODO DE TEMPO & ATALHOS */}
      <div className="ui-card card space-y-3 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <label className="text-xs font-['Chakra_Petch'] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🗓️ 1. Período de Tempo</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400">Início e Fim do planeamento</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="field">
            <label className="text-xs font-mono text-slate-300">Data de Início *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="ui-input w-full text-xs"
            />
          </div>

          <div className="field">
            <label className="text-xs font-mono text-slate-300">Data de Fim *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="ui-input w-full text-xs"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
            ⚡ Atalhos Rápidos de Duração:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyPreset(1)}
              className="ui-btn ui-btn-secondary px-2.5 py-1 text-[11px]"
            >
              +1 Mês
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(2)}
              className="ui-btn ui-btn-secondary px-2.5 py-1 text-[11px]"
            >
              +2 Meses
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(3)}
              className="ui-btn ui-btn-soft px-2.5 py-1 text-[11px]"
            >
              +3 Meses (Trimestre)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(6)}
              className="ui-btn ui-btn-secondary px-2.5 py-1 text-[11px]"
            >
              +6 Meses (Semestre)
            </button>
            <button
              type="button"
              onClick={handleApplySeasonPreset}
              className="ui-btn ui-btn-soft-success px-2.5 py-1 text-[11px]"
            >
              🏆 Toda a Época (até 30 Junho)
            </button>
          </div>
        </div>
      </div>

      {/* 2. DIAS DE TREINO DA SEMANA */}
      <div className="ui-card card space-y-3 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <label className="text-xs font-['Chakra_Petch'] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>📅 2. Dias de Treino da Semana</span>
          </label>
          <span className="text-[11px] font-mono text-cyan-400 font-bold">
            {selectedDays.length} {selectedDays.length === 1 ? 'dia selecionado' : 'dias selecionados'}
          </span>
        </div>

        <p className="text-xs font-mono text-slate-400">
          Clica para ativar ou desativar os dias em que a equipa tem treinos:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {WEEKDAY_CONFIG.map((d) => {
            const isSelected = selectedDays.includes(d.day);
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => handleToggleDay(d.day)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-500 to-blue-600 border-cyan-300 text-slate-950 font-black shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="text-xs font-['Chakra_Petch'] uppercase tracking-wider">{d.short}</span>
                <span className="text-[10px] font-mono opacity-90 truncate max-w-full">{d.name.split('-')[0]}</span>
                <span className="text-[11px] font-mono mt-0.5 font-bold">{isSelected ? '✓ Ativo' : '—'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. HORÁRIOS & CUSTOMIZAÇÃO POR DIA */}
      <div className="ui-card card space-y-3.5 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 flex-wrap gap-2">
          <label className="text-xs font-['Chakra_Petch'] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>⏱️ 3. Horários das Sessões</span>
          </label>

          {/* Toggle between Unified vs Per-Day Schedule */}
          <div className="ui-inset inline-flex p-0.5">
            <button
              type="button"
              onClick={() => setUseCustomDayTimes(false)}
              className={`px-3 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all ${
                !useCustomDayTimes ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Horário Único
            </button>
            <button
              type="button"
              onClick={() => setUseCustomDayTimes(true)}
              className={`px-3 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all ${
                useCustomDayTimes ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Horários por Dia
            </button>
          </div>
        </div>

        {!useCustomDayTimes ? (
          /* MODO HORÁRIO ÚNICO */
          <div className="ui-inset p-3 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-mono text-slate-300">Hora de Início para todos os dias de treino:</label>
              <input
                type="time"
                value={defaultTime}
                onChange={(e) => setDefaultTime(e.target.value)}
                className="ui-input w-32 text-xs text-center"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-500">Horas Frequentes:</span>
              {QUICK_TIMES.map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => setDefaultTime(qt)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border transition-all ${
                    defaultTime === qt
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* MODO HORÁRIOS ESPECÍFICOS POR DIA DA SEMANA */
          <div className="space-y-2">
            <p className="text-xs font-mono text-slate-400">
              Define o horário exato para cada um dos dias de treino selecionados:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectedDays.map((dow) => {
                const config = WEEKDAY_CONFIG.find((x) => x.day === dow);
                const currentTime = dayTimes[dow] || defaultTime;
                return (
                  <div key={dow} className="ui-inset p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-['Chakra_Petch'] font-bold text-cyan-300 uppercase">
                        {config?.name}
                      </span>
                      <input
                        type="time"
                        value={currentTime}
                        onChange={(e) => handleSetDayTime(dow, e.target.value)}
                        className="ui-input w-28 text-xs text-center"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {['18:00', '18:30', '19:00', '19:30', '20:00'].map((qt) => (
                        <button
                          key={qt}
                          type="button"
                          onClick={() => handleSetDayTime(dow, qt)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${
                            currentTime === qt
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {qt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. DETALHES GERAIS DA SESSÃO */}
      <div className="ui-card card space-y-3.5 p-4">
        <div className="pb-2 border-b border-cyan-500/20">
          <label className="text-xs font-['Chakra_Petch'] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚙️ 4. Detalhes Padrão das Sessões</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="field">
            <label className="text-xs font-mono text-slate-300">Local / Campo</label>
            <input
              type="text"
              placeholder="Ex: Campo Sintético, Pavilhão..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="ui-input w-full text-xs"
            />
          </div>

          <div className="field">
            <label className="text-xs font-mono text-slate-300">Foco / Tipo Principal</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="ui-input w-full text-xs">
              <option value="⚡ Tático">⚡ Tático</option>
              <option value="⚽ Técnico / Finalização">⚽ Técnico / Finalização</option>
              <option value="🏃 Físico / Condição">🏃 Físico / Condição</option>
              <option value="🛡️ Bolas Paradas">🛡️ Bolas Paradas</option>
              <option value="🏆 Jogo-Treino">🏆 Jogo-Treino</option>
              <option value="🔄 Recuperação">🔄 Recuperação</option>
              <option value="🎯 Geral">🎯 Geral</option>
            </select>
          </div>

          <div className="field">
            <label className="text-xs font-mono text-slate-300">Duração (Minutos)</label>
            <input
              type="number"
              min="30"
              max="240"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 90)}
              className="ui-input w-full text-xs"
            />
          </div>
        </div>

        <div className="field mb-0">
          <label className="text-xs font-mono text-slate-300">Observações / Objetivos Padrão (Opcional)</label>
          <input
            type="text"
            placeholder="Ex: Treino da época regular · Trazer equipamento de treino completo"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="ui-input w-full text-xs"
          />
        </div>

        {/* State Option */}
        <div className="ui-inset p-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-['Chakra_Petch'] font-bold text-white uppercase block">
              Estado Inicial das Sessões
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Recomendado: Agendado / Planeado (passa a concluído após a realização da sessão)
            </span>
          </div>

          <div className="ui-card inline-flex p-0.5">
            <button
              type="button"
              onClick={() => setCompleted(false)}
              className={`px-3 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all ${
                !completed ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400'
              }`}
            >
              🟡 Agendado
            </button>
            <button
              type="button"
              onClick={() => setCompleted(true)}
              className={`px-3 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all ${
                completed ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400'
              }`}
            >
              🟢 Concluído
            </button>
          </div>
        </div>

        {/* Duplicate Protection Option */}
        <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={avoidDuplicates}
            onChange={(e) => setAvoidDuplicates(e.target.checked)}
            className="ui-input w-4 h-4"
          />
          <span>Evitar duplicar treinos que já existam exatamente na mesma data e hora</span>
        </label>
      </div>

      {/* 5. PRÉ-VISUALIZAÇÃO & RESUMO DO CÁLCULO */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/60 border-2 border-cyan-500/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-sm">
              📊
            </span>
            <div>
              <h4 className="font-['Chakra_Petch'] font-black text-sm text-white uppercase tracking-wider">
                Resumo dos Treinos a Adicionar
              </h4>
              <p className="text-[11px] font-mono text-cyan-300/80">
                {startDate} até {endDate}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black font-mono text-cyan-300">{finalTrainingsToCreate.length}</span>
            <span className="text-xs font-['Chakra_Petch'] uppercase text-slate-400 block">treinos calculados</span>
          </div>
        </div>

        {/* Breakdown chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Object.entries(weekdayBreakdown).map(([dow, info]) => (
            <div key={dow} className="ui-inset px-2.5 py-1 text-xs font-mono text-slate-200 flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">{info.count}x</span>
              <span>{info.name}s</span>
              <span className="text-slate-400 font-normal">({info.time}h)</span>
            </div>
          ))}
          {duplicateCount > 0 && avoidDuplicates && (
            <div className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-xs font-mono text-amber-300">
              ⚠️ {duplicateCount} já existentes (omitidos)
            </div>
          )}
        </div>

        {/* Collapsible List of Dates */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPreviewList(!showPreviewList)}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-1"
          >
            <span>
              {showPreviewList
                ? '▲ Ocultar Lista Detalhada de Sessões'
                : `▼ Ver Lista de Todas as ${finalTrainingsToCreate.length} Sessões a Criar`}
            </span>
          </button>

          {showPreviewList && (
            <div className="ui-inset mt-2.5 max-h-48 overflow-y-auto p-2 space-y-1 divide-y divide-slate-900">
              {finalTrainingsToCreate.map((item, idx) => (
                <div
                  key={idx}
                  className="pt-1 first:pt-0 flex items-center justify-between text-[11px] font-mono text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">#{idx + 1}</span>
                    <span>{item.dayName}</span>
                    <span className="text-white font-bold">{item.formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300">{item.time}h</span>
                    <span className="text-slate-500">· {location}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FINAL ACTION BAR */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
        {onCancel && (
          <button type="button" onClick={onCancel} className="ui-btn ui-btn-secondary px-4 py-3 text-xs">
            Cancelar
          </button>
        )}

        <button
          type="button"
          disabled={finalTrainingsToCreate.length === 0}
          onClick={handleGenerate}
          className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs sm:text-sm uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>🚀</span>
          <span>
            Adicionar {finalTrainingsToCreate.length} {finalTrainingsToCreate.length === 1 ? 'Treino' : 'Treinos'} de
            uma Vez
          </span>
        </button>
      </div>
    </div>
  );
};
