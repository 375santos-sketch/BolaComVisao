import React, { useEffect, useState } from 'react';
import { Forecast, forecastable, forecastText, getForecast } from '../lib/weather';

interface WeatherBadgeProps {
  date: string;
  time?: string;
  /** Places to try, in order (pitch, opponent's town, club's town). */
  places: string[];
}

/** Forecast for the event's hour ("🌧️ 14° · 💧70% · 💨25 km/h"); nothing when there is no forecast or no internet. */
export const WeatherBadge: React.FC<WeatherBadgeProps> = ({ date, time, places }) => {
  // The forecast is kept with the event it belongs to, so a card never shows another event's weather
  const [result, setResult] = useState<{ id: string; forecast: Forecast | null } | null>(null);
  const id = `${places.join('|')}|${date}|${time || ''}`;
  useEffect(() => {
    let cancelled = false;
    if (!forecastable(date) || !places.some((p) => p.trim())) return;
    getForecast(id.split('|').slice(0, places.length), date, time).then(
      (forecast) => !cancelled && setResult({ id, forecast })
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `id` already carries the places, date and time
  }, [id]);
  const forecast = result?.id === id ? result.forecast : null;
  if (!forecast) return null;
  return (
    <span
      aria-label="Previsão do tempo"
      title={forecast.label}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] text-slate-200"
    >
      {forecastText(forecast)}
    </span>
  );
};
