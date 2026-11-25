import { AppState } from '../types';
import { IconName } from '../components/ui/Icon';
import { HomeNotice, minutesBehind, recentForm, seasonSummary } from './homeSummary';
import { addDaysISO, localDateISO } from './trainingQuick';
import { availabilityOn } from './availability';

/**
 * Início (design · etapa 1): "Tarefas", everything waiting for the coach in one list, by urgency, and "A equipa",
 * four figures that each lead to a decision. Both read only what the app already keeps (nothing new is saved).
 */

export type TaskAction =
  | { kind: 'tab'; tab: HomeNotice['tab'] | 'treinos' | 'analise_jogos'; targetId?: string }
  | { kind: 'newsletter' }
  | { kind: 'adminUsers' };

export interface HomeTask {
  id: string;
  icon: IconName;
  tone: 'warning' | 'danger' | 'brand' | 'neutral';
  /** Short title; `detail` goes on the line below (a notice "Título: detalhe" is cut at the first ": "). */
  title: string;
  detail: string;
  action: TaskAction;
}

const NOTICE_LOOK: Record<HomeNotice['id'], { icon: IconName; tone: HomeTask['tone'] }> = {
  convocatoria: { icon: 'clipboard', tone: 'warning' },
  presencas: { icon: 'check', tone: 'warning' },
  castigos: { icon: 'alert', tone: 'danger' },
  minutos: { icon: 'whistle', tone: 'warning' },
  assiduidade: { icon: 'users', tone: 'warning' },
  aniversarios: { icon: 'cake', tone: 'neutral' }
};

/** Most urgent first: what blocks today's or the next game, then what is due, then what is good to know. */
const ORDER = [
  'convocatoria',
  'presencas',
  'castigos',
  'resumo',
  'acessos',
  'treino',
  'minutos',
  'assiduidade',
  'foco',
  'aniversarios'
];

export function splitNotice(text: string): { title: string; detail: string } {
  const cut = text.indexOf(': ');
  return cut > 0 ? { title: text.slice(0, cut), detail: text.slice(cut + 2) } : { title: text, detail: '' };
}

/** No training planned from today to 7 days ahead: time to plan the next one. */
export function needsNextTraining(trainings: AppState['trainings'], today: string = localDateISO()): boolean {
  const until = addDaysISO(today, 7);
  return !(trainings || []).some((t) => {
    const d = (t?.date || '').slice(0, 10);
    return d >= today && d <= until;
  });
}

export function buildHomeTasks(input: {
  notices: HomeNotice[];
  /** The week of the summary waiting to be sent ("16 a 22 nov"), if any. */
  newsletterWeek?: string | null;
  pendingUsers?: { count: number; latest?: string };
  noTrainingSoon?: boolean;
  focus?: { recommendation: string; title: string } | null;
}): HomeTask[] {
  const tasks: HomeTask[] = input.notices.map((n) => ({
    id: n.id,
    ...NOTICE_LOOK[n.id],
    ...splitNotice(n.text),
    action: { kind: 'tab', tab: n.tab, targetId: n.targetId }
  }));
  if (input.newsletterWeek) {
    tasks.push({
      id: 'resumo',
      icon: 'mail',
      tone: 'brand',
      title: 'Enviar o resumo da semana',
      detail: `${input.newsletterWeek} · pronto a rever`,
      action: { kind: 'newsletter' }
    });
  }
  if (input.pendingUsers && input.pendingUsers.count > 0) {
    const n = input.pendingUsers.count;
    tasks.push({
      id: 'acessos',
      icon: 'users',
      tone: 'warning',
      title: n === 1 ? 'Aprovar 1 pedido de acesso' : `Aprovar ${n} pedidos de acesso`,
      detail: input.pendingUsers.latest ? `${input.pendingUsers.latest} aguarda validação` : 'Aguardam validação',
      action: { kind: 'adminUsers' }
    });
  }
  if (input.noTrainingSoon) {
    tasks.push({
      id: 'treino',
      icon: 'calendar',
      tone: 'neutral',
      title: 'Marcar o próximo treino',
      detail: 'Não há treinos nos próximos 7 dias',
      action: { kind: 'tab', tab: 'treinos' }
    });
  }
  if (input.focus) {
    tasks.push({
      id: 'foco',
      icon: 'zap',
      tone: 'neutral',
      title: input.focus.recommendation,
      detail: `Foco da semana · ${input.focus.title}`,
      action: { kind: 'tab', tab: 'analise_jogos' }
    });
  }
  return tasks.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
}

export type FormLetter = 'V' | 'E' | 'D';

/** "A equipa": the last results, who can play today, training attendance and who is short of minutes. */
export function teamPulse(
  state: Pick<AppState, 'schedule' | 'matches' | 'trainings' | 'roster' | 'season' | 'category' | 'staffMembers'>,
  today: string = localDateISO()
) {
  const form: FormLetter[] = recentForm(state, 5).map((g) =>
    g.scored > g.conceded ? 'V' : g.scored === g.conceded ? 'E' : 'D'
  );
  const active = (state.roster || []).filter((p) => p && p.active !== false && p.status !== 'inativo');
  const available = active.filter((p) => availabilityOn(p, today).available).length;
  const minutes = minutesBehind(state);
  return {
    form,
    available,
    squad: active.length,
    attendance: seasonSummary(state, today).attendance,
    shortOfMinutes: minutes.behind.length
  };
}
