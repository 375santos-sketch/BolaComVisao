import React, { useEffect, useState } from 'react';
import { Training } from '../../../types';
import { Forecast, forecastable, getForecast } from '../../../lib/weather';
import { breakRule, heatMessage, withWaterBreaks } from '../../../lib/waterBreaks';

interface HeatBreaksCardProps {
  training: Training;
  places: string[];
}

/** 💧 On a hot training day (forecast for the training's hour): water breaks in the plan and a note for the parents. */
export const HeatBreaksCard: React.FC<HeatBreaksCardProps> = ({ training, places }) => {
  const [forecast, setForecast] = useState<{ id: string; value: Forecast | null } | null>(null);
  const id = `${places.join('|')}|${training.date}|${training.time || ''}`;
  useEffect(() => {
    let cancelled = false;
    if (training.completed || !forecastable(training.date) || !places.some((p) => p.trim())) return;
    getForecast(places, training.date, training.time).then((value) => !cancelled && setForecast({ id, value }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `id` already carries the places, date and time
  }, [id, training.completed]);

  const temperature = forecast?.id === id ? forecast.value?.temperature : undefined;
  const rule = temperature !== undefined ? breakRule(temperature) : null;
  if (temperature === undefined || !rule) return null;
  const items = withWaterBreaks(training.sessionPlan?.blocks || [], temperature);
  const breaks = items.filter((i) => i.kind === 'agua').length;
  const shortened = items.find((i) => i.kind === 'bloco' && i.shortened);

  return (
    <section
      aria-label="Calor: pausas de água"
      className="rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-950/50 to-slate-900 p-3 space-y-2"
    >
      <h4 className="text-sm font-bold text-amber-300">
        🌡️ {Math.round(temperature)} °C{training.time ? ` às ${training.time}` : ''} · calor
      </h4>
      <p className="text-xs text-slate-300">
        Pausas de água de {rule.minutes} min a cada {rule.every} min
        {breaks ? ` (${breaks} ${breaks === 1 ? 'pausa' : 'pausas'} entre os exercícios)` : ''}.
        {shortened && shortened.kind === 'bloco' ? ` O último bloco fica ${shortened.shortened} min mais curto.` : ''}
      </p>
      {breaks > 0 && (
        <ol className="space-y-1">
          {items.map((it, i) =>
            it.kind === 'agua' ? (
              <li
                key={i}
                className="rounded-lg border border-dashed border-cyan-500/70 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-200"
              >
                💧 Pausa de água · {it.end - it.start} min
              </li>
            ) : (
              <li key={i} className="flex justify-between rounded-lg bg-slate-900/70 px-2.5 py-1.5 text-xs text-white">
                <span className="truncate">{it.title}</span>
                <span className="shrink-0 text-slate-400">
                  {it.start}–{it.end}'
                </span>
              </li>
            )
          )}
        </ol>
      )}
      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(heatMessage(training.date, training.time, temperature))}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ui-btn ui-btn-secondary w-full py-2 text-xs"
      >
        💬 Avisar os pais: água, boné e protetor
      </a>
    </section>
  );
};
