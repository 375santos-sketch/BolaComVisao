import { CompetencyEvaluation, CompetencyLevel, EvaluationArea, Player } from '../types';

/**
 * D1 — Evaluation by competency: four levels described in plain words, only the competencies the coach chose,
 * who evaluated and when. No overall score; the athlete is only ever compared with himself. The older evaluations
 * (1–5 by area) are kept as they were: they are never turned into levels (that would invent data).
 */

export const LEVELS: Array<{ value: CompetencyLevel; label: string; short: string; hint: string }> = [
  { value: 1, label: 'A descobrir', short: 'Descobrir', hint: 'ainda não faz' },
  { value: 2, label: 'A praticar', short: 'Praticar', hint: 'faz com ajuda ou sem pressão' },
  { value: 3, label: 'A consolidar', short: 'Consolidar', hint: 'faz sozinho na maioria das vezes' },
  { value: 4, label: 'Domina para a idade', short: 'Domina', hint: 'faz em jogo, para a idade' }
];

export const levelLabel = (l: CompetencyLevel) => LEVELS.find((x) => x.value === l)?.short || '';

/** The initial catalogue (approved by the Bruno); the coach can add others ("x:Name"). */
export const COMPETENCIES: Array<{ id: string; area: EvaluationArea; label: string }> = [
  { id: 'passe', area: 'tecnica', label: 'Passe' },
  { id: 'rececao_orientada', area: 'tecnica', label: 'Receção orientada' },
  { id: 'conducao', area: 'tecnica', label: 'Condução' },
  { id: 'drible', area: 'tecnica', label: 'Drible' },
  { id: 'finalizacao', area: 'tecnica', label: 'Finalização' },
  { id: 'pe_nao_dominante', area: 'tecnica', label: 'Pé não dominante' },
  { id: 'ocupacao_espacos', area: 'tatica', label: 'Ocupação de espaços' },
  { id: 'leitura_jogo', area: 'tatica', label: 'Leitura de jogo' },
  { id: 'decisao', area: 'tatica', label: 'Decisão' },
  { id: 'transicoes', area: 'tatica', label: 'Transições' },
  { id: 'velocidade', area: 'fisica', label: 'Velocidade' },
  { id: 'coordenacao', area: 'fisica', label: 'Coordenação' },
  { id: 'agilidade', area: 'fisica', label: 'Agilidade' },
  { id: 'equilibrio', area: 'fisica', label: 'Equilíbrio' },
  { id: 'concentracao', area: 'psicologica', label: 'Concentração' },
  { id: 'compromisso', area: 'psicologica', label: 'Compromisso' },
  { id: 'cooperacao', area: 'psicologica', label: 'Cooperação' },
  { id: 'confianca', area: 'psicologica', label: 'Confiança' },
  { id: 'posicionamento', area: 'jogo', label: 'Posicionamento' },
  { id: 'apoio_colega', area: 'jogo', label: 'Apoio ao colega' }
];

const CUSTOM = 'x:';
export const customCompetencyId = (name: string) => `${CUSTOM}${name.trim().slice(0, 60)}`;

/** MC1a: a competency the app knows (the catalogue, or the coach's own "x:Name"). */
export const isKnownCompetency = (id: unknown): id is string =>
  typeof id === 'string' &&
  ((id.startsWith(CUSTOM) && id.length > CUSTOM.length && id.length <= CUSTOM.length + 60) ||
    COMPETENCIES.some((c) => c.id === id));

export function competencyLabel(id: string): string {
  if (id.startsWith(CUSTOM)) return id.slice(CUSTOM.length);
  return COMPETENCIES.find((c) => c.id === id)?.label || id;
}

/** The area of a competency (the coach's own ones go to "Outras"). */
export const competencyArea = (id: string): EvaluationArea | 'outras' =>
  COMPETENCIES.find((c) => c.id === id)?.area || 'outras';

const isLevel = (v: unknown): v is CompetencyLevel => v === 1 || v === 2 || v === 3 || v === 4;

/** Valid evaluations, most recent first. */
export function competencyEvaluationsOf(player: Pick<Player, 'competencyEvaluations'>): CompetencyEvaluation[] {
  return (Array.isArray(player.competencyEvaluations) ? player.competencyEvaluations : [])
    .filter((e) => e && typeof e.id === 'string' && /^\d{4}-\d{2}-\d{2}/.test(e.date || '') && e.levels)
    .map((e) => ({
      ...e,
      levels: Object.fromEntries(Object.entries(e.levels).filter(([, v]) => isLevel(v))) as Record<
        string,
        CompetencyLevel
      >
    }))
    .filter((e) => Object.keys(e.levels).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export interface CompetencyNow {
  id: string;
  level: CompetencyLevel;
  date: string;
  evaluatorName?: string;
  /** The level of the evaluation before (of this same competency), when there was one. */
  previous?: { level: CompetencyLevel; date: string };
}

/** The latest level of each competency evaluated, and the one before it (always the athlete against himself). */
export function currentLevels(player: Pick<Player, 'competencyEvaluations'>): CompetencyNow[] {
  const byComp = new Map<string, CompetencyNow>();
  competencyEvaluationsOf(player).forEach((e) => {
    Object.entries(e.levels).forEach(([id, level]) => {
      const now = byComp.get(id);
      if (!now) byComp.set(id, { id, level, date: e.date, evaluatorName: e.evaluatorName });
      else if (!now.previous) now.previous = { level, date: e.date };
    });
  });
  return [...byComp.values()];
}

export function withCompetencyEvaluation(player: Player, e: CompetencyEvaluation): Player {
  const levels = Object.fromEntries(Object.entries(e.levels).filter(([, v]) => isLevel(v)));
  if (!Object.keys(levels).length) return player;
  const note = (e.note || '').trim().slice(0, 300);
  return {
    ...player,
    competencyEvaluations: [
      ...(player.competencyEvaluations || []).filter((x) => x.id !== e.id),
      {
        id: e.id,
        date: e.date,
        levels: levels as Record<string, CompetencyLevel>,
        ...(e.evaluatorUid ? { evaluatorUid: e.evaluatorUid } : {}),
        ...(e.evaluatorName ? { evaluatorName: e.evaluatorName } : {}),
        ...(note ? { note } : {})
      }
    ]
  };
}

export function withoutCompetencyEvaluation(player: Player, id: string): Player {
  return { ...player, competencyEvaluations: (player.competencyEvaluations || []).filter((e) => e.id !== id) };
}
