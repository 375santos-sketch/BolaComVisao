import type { GeneratedTrainingPreview } from './BatchTrainingSection';

export const WEEKDAY_CONFIG = [
  { day: 1, short: 'Seg', name: 'Segunda-feira', icon: '1️⃣' },
  { day: 2, short: 'Ter', name: 'Terça-feira', icon: '2️⃣' },
  { day: 3, short: 'Qua', name: 'Quarta-feira', icon: '3️⃣' },
  { day: 4, short: 'Qui', name: 'Quinta-feira', icon: '4️⃣' },
  { day: 5, short: 'Sex', name: 'Sexta-feira', icon: '5️⃣' },
  { day: 6, short: 'Sáb', name: 'Sábado', icon: '6️⃣' },
  { day: 0, short: 'Dom', name: 'Domingo', icon: '7️⃣' }
];

export const QUICK_TIMES = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];

export function calculateBatchTrainings(settings: {
  startDate: string;
  endDate: string;
  selectedDays: number[];
  defaultTime: string;
  useCustomDayTimes: boolean;
  dayTimes: Record<number, string>;
  location?: string;
  type?: string;
  durationMinutes?: number;
}): GeneratedTrainingPreview[] {
  if (!settings.startDate || !settings.endDate || settings.selectedDays.length === 0) {
    return [];
  }

  const [sY, sM, sD] = settings.startDate.split('-').map(Number);
  const [eY, eM, eD] = settings.endDate.split('-').map(Number);
  if (!sY || !sM || !sD || !eY || !eM || !eD) return [];

  const start = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  if (start > end) return [];

  const DAY_NAMES = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];
  const DAY_SHORTS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const results: GeneratedTrainingPreview[] = [];
  const current = new Date(start);

  while (current <= end) {
    const dow = current.getDay();
    if (settings.selectedDays.includes(dow)) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const time =
        settings.useCustomDayTimes && settings.dayTimes[dow] ? settings.dayTimes[dow] : settings.defaultTime || '18:30';

      results.push({
        date: dateStr,
        formattedDate: `${d}/${m}/${y}`,
        dayOfWeek: dow,
        dayName: DAY_NAMES[dow],
        dayShort: DAY_SHORTS[dow],
        time,
        location: settings.location || 'Campo Sintético',
        type: settings.type || '⚡ Tático',
        durationMinutes: settings.durationMinutes || 90
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return results;
}
