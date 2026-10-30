import { SessionBlock } from '../types';

/**
 * 💧 Pausas de hidratação com calor: when the forecast for the training's hour is hot, water breaks go between the
 * plan's blocks (never in the middle of an exercise). The training keeps its length: the last block gives up the
 * minutes of the breaks.
 */

/** From this temperature (°C) the app suggests water breaks. */
const HOT_C = 28;
/** From this one, more often and a little longer. */
const VERY_HOT_C = 32;

export function breakRule(temperature: number): { every: number; minutes: number } | null {
  if (temperature < HOT_C) return null;
  return temperature >= VERY_HOT_C ? { every: 15, minutes: 3 } : { every: 20, minutes: 2 };
}

type TimelineItem =
  | { kind: 'bloco'; title: string; start: number; end: number; shortened?: number }
  | { kind: 'agua'; start: number; end: number };

/** The plan with the water breaks between blocks: a break once `every` minutes have gone by without one. */
export function withWaterBreaks(blocks: SessionBlock[], temperature: number): TimelineItem[] {
  const rule = breakRule(temperature);
  const items: TimelineItem[] = [];
  const list = (blocks || []).filter((b) => b && (b.durationMinutes || 0) > 0);
  let t = 0;
  let sinceBreak = 0;
  let added = 0;
  list.forEach((b, i) => {
    const d = b.durationMinutes || 0;
    items.push({ kind: 'bloco', title: b.title || 'Bloco', start: t, end: t + d });
    t += d;
    sinceBreak += d;
    if (rule && i < list.length - 1 && sinceBreak >= rule.every - 5) {
      items.push({ kind: 'agua', start: t, end: t + rule.minutes });
      t += rule.minutes;
      added += rule.minutes;
      sinceBreak = 0;
    }
  });
  // Same total: the last block is shortened by the breaks (but never below 5 minutes)
  const last = [...items].reverse().find((x) => x.kind === 'bloco') as
    Extract<TimelineItem, { kind: 'bloco' }> | undefined;
  if (last && added > 0) {
    const cut = Math.min(added, Math.max(0, last.end - last.start - 5));
    last.end -= cut;
    if (cut) last.shortened = cut;
  }
  return items;
}

/** Message for the parents' group on a hot training day. */
export function heatMessage(date: string, time: string | undefined, temperature: number): string {
  const day = new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  return [
    `☀️ Treino de ${day}${time ? ` às ${time}` : ''}: previsão de ${Math.round(temperature)} °C.`,
    'Por favor, tragam uma garrafa de água de 1 L (de preferência cheia e fresca), boné e protetor solar.',
    'Vamos fazer pausas para beber água ao longo do treino. Obrigado! 💧'
  ].join('\n');
}
