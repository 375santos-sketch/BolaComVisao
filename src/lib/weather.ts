/**
 * Weather forecast for a game or training (Open-Meteo: free, no key): the hour of the event, in the club's town for
 * home games and trainings, and in the pitch's or the opponent's town for away games. Only up to 14 days ahead.
 * Results are kept for 3 hours in the phone, so the Agenda does not ask again at every visit.
 */

export interface Forecast {
  icon: string;
  label: string;
  temperature: number;
  rain: number; // probability, %
  wind: number; // km/h
}

const CACHE_KEY = 'bcv_weather_cache_v1';
const CACHE_MS = 3 * 60 * 60 * 1000;
const FORECAST_DAYS = 14;

/** WMO weather code → emoji and words. */
export function describeWeather(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: 'Céu limpo' };
  if (code <= 2) return { icon: '🌤️', label: 'Pouco nublado' };
  if (code === 3) return { icon: '☁️', label: 'Nublado' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'Nevoeiro' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'Chuvisco' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { icon: '🌧️', label: 'Chuva' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: '🌨️', label: 'Neve' };
  if (code >= 95) return { icon: '⛈️', label: 'Trovoada' };
  return { icon: '🌥️', label: 'Variável' };
}

/** Short text for a badge: "🌧️ 14° · 💧70% · 💨25 km/h". */
export const forecastText = (f: Forecast) =>
  `${f.icon} ${Math.round(f.temperature)}° · 💧${Math.round(f.rain)}% · 💨${Math.round(f.wind)} km/h`;

/** Whether the date is close enough for a forecast (today up to 14 days ahead). */
export function forecastable(date: string, today = new Date().toISOString().slice(0, 10)): boolean {
  const days = (Date.parse(date.slice(0, 10)) - Date.parse(today)) / 86_400_000;
  return days >= 0 && days <= FORECAST_DAYS;
}

type Cache = Record<string, { at: number; value: Forecast | null }>;
const readCache = (): Cache => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Cache;
  } catch {
    return {};
  }
};
const writeCache = (cache: Cache) => {
  try {
    const now = Date.now();
    const fresh = Object.fromEntries(Object.entries(cache).filter(([, v]) => now - v.at < CACHE_MS));
    localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
  } catch {
    // Storage full or blocked: the forecast is just asked again next time
  }
};

async function findPlace(name: string): Promise<{ latitude: number; longitude: number } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=pt&countryCode=PT`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const body = (await res.json()) as { results?: { latitude: number; longitude: number }[] };
  return body.results?.[0] || null;
}

/** Forecast for the first place found among `places` (e.g. pitch, opponent's town, club's town). */
export async function getForecast(places: string[], date: string, time?: string): Promise<Forecast | null> {
  const day = date.slice(0, 10);
  const hour = Math.min(23, Math.max(0, Number((time || '').slice(0, 2)) || 12));
  const names = places.map((p) => p.trim()).filter(Boolean);
  if (!names.length || !forecastable(day)) return null;
  const key = `${names.join('|').toLowerCase()}|${day}|${hour}`;
  const cache = readCache();
  if (cache[key] && Date.now() - cache[key].at < CACHE_MS) return cache[key].value;
  try {
    let place: { latitude: number; longitude: number } | null = null;
    for (const name of names) {
      place = await findPlace(name);
      if (place) break;
    }
    let value: Forecast | null = null;
    if (place) {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
        `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m` +
        `&timezone=Europe%2FLisbon&start_date=${day}&end_date=${day}`;
      const res = await fetch(url);
      if (res.ok) {
        const body = (await res.json()) as {
          hourly?: {
            temperature_2m: number[];
            precipitation_probability: (number | null)[];
            weather_code: number[];
            wind_speed_10m: number[];
          };
        };
        const h = body.hourly;
        if (h && h.temperature_2m?.[hour] !== undefined) {
          value = {
            ...describeWeather(h.weather_code[hour]),
            temperature: h.temperature_2m[hour],
            rain: h.precipitation_probability?.[hour] ?? 0,
            wind: h.wind_speed_10m?.[hour] ?? 0
          };
        }
      }
    }
    writeCache({ ...readCache(), [key]: { at: Date.now(), value } });
    return value;
  } catch {
    // No internet: no forecast (nothing is shown)
    return null;
  }
}
