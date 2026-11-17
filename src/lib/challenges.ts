import { ChallengeDifficulty, ChallengeRights, ChallengeType, VjOption, VjPause, VjSession } from '../types';
import { uid } from './utils';
import { cleanPause } from './vjPauses';

/**
 * MC1a — Formatos de desafio (só para os treinadores): além da sessão de vídeo, uma pergunta (com imagem ou esquema
 * opcional), um exercício prático da biblioteca da equipa (referenciado, nunca copiado) e uma reflexão (só as
 * perguntas: as respostas nunca são guardadas). Todos ficam no mesmo registo «challenge» com `format: 'sessao'`
 * (as versões anteriores da app só guardam esse formato); o tipo verdadeiro é `challengeType`.
 */

export const CHALLENGE_TYPES: Record<ChallengeType, { label: string; icon: string; hint: string }> = {
  video: { label: 'Vídeo', icon: '🎬', hint: 'Vídeo com pausas e perguntas, para conduzir no treino' },
  pergunta: { label: 'Pergunta', icon: '❓', hint: 'Uma pergunta de decisão, com imagem ou esquema opcional' },
  pratico: { label: 'Prático', icon: '⚽', hint: 'Um exercício da biblioteca da equipa, com o critério de conclusão' },
  reflexao: {
    label: 'Reflexão',
    icon: '💭',
    hint: 'Perguntas curtas para pensar sobre o treino (sem respostas guardadas)'
  }
};
export const CHALLENGE_TYPE_ORDER: ChallengeType[] = ['video', 'pergunta', 'pratico', 'reflexao'];

/** The age groups of the app (the same list as when creating a team). */
export const AGE_GROUPS = [
  'Sub-7',
  'Sub-9',
  'Sub-10',
  'Sub-11',
  'Sub-12',
  'Sub-13',
  'Sub-14',
  'Sub-15',
  'Sub-16',
  'Sub-17',
  'Sub-19',
  'Sub-23',
  'Seniores',
  'Veteranos'
];

/** Difficulty of the challenge: names different from the competency levels, so they are never confused. */
export const DIFFICULTIES: Record<ChallengeDifficulty, string> = { 1: 'Base', 2: 'Intermédio', 3: 'Exigente' };

export const RIGHTS_KINDS: Record<ChallengeRights['kind'], string> = {
  proprio: 'Conteúdo próprio (meu ou do clube)',
  licenciado: 'Conteúdo licenciado (com autorização)',
  externo: 'Conteúdo externo (por exemplo, vídeo público do YouTube)'
};

export const MAX_REFLECTION_PROMPTS = 5;
/** About 150 KB of image (base64), the same as the exercises' pictures. */
export const MAX_IMAGE_CHARS = 210_000;

export const challengeTypeOf = (s: Pick<VjSession, 'challengeType'>): ChallengeType =>
  s.challengeType && s.challengeType in CHALLENGE_TYPES ? s.challengeType : 'video';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDifficulty = (v: unknown): v is ChallengeDifficulty => v === 1 || v === 2 || v === 3;
const isImage = (v: unknown): v is string => typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(v);

export function cleanRights(r: ChallengeRights | undefined): ChallengeRights | undefined {
  if (!r || !(r.kind in RIGHTS_KINDS)) return undefined;
  return {
    kind: r.kind,
    ...(text(r.source, 300) ? { source: text(r.source, 300) } : {}),
    ...(text(r.licence, 300) ? { licence: text(r.licence, 300) } : {}),
    ...(r.noIdentifiableChildren ? { noIdentifiableChildren: true } : {}),
    ...(text(r.confirmedBy, 120) ? { confirmedBy: text(r.confirmedBy, 120) } : {}),
    ...(text(r.confirmedAt, 40) ? { confirmedAt: text(r.confirmedAt, 40) } : {})
  };
}

/** The MC1a fields of a challenge, cleaned (the video session's own fields are cleaned by cleanSession). */
export function cleanChallengeFields(s: VjSession): Partial<VjSession> {
  const type = challengeTypeOf(s);
  const ageGroups = [...new Set((Array.isArray(s.ageGroups) ? s.ageGroups : []).filter((a) => AGE_GROUPS.includes(a)))];
  const out: Partial<VjSession> = {
    challengeType: type,
    ageGroups: ageGroups.length ? ageGroups : undefined,
    difficulty: isDifficulty(s.difficulty) ? s.difficulty : undefined,
    rights: cleanRights(s.rights),
    prompt: undefined,
    exerciseId: undefined,
    instructions: undefined,
    completionCriteria: undefined,
    reflection: undefined
  };
  if (type === 'pergunta' && s.prompt) {
    const p = cleanPause({ ...s.prompt, at: 0 });
    if (p) {
      const image = isImage(s.prompt.image) && s.prompt.image.length <= MAX_IMAGE_CHARS ? s.prompt.image : undefined;
      out.prompt = { ...p, ...(image ? { image } : {}) };
    }
  }
  if (type === 'pratico') {
    out.exerciseId = text(s.exerciseId, 128) || undefined;
    out.completionCriteria = text(s.completionCriteria, 200) || undefined;
  }
  if (type === 'reflexao') {
    const prompts = (s.reflection?.prompts || [])
      .map((q) => text(q, 160))
      .filter(Boolean)
      .slice(0, MAX_REFLECTION_PROMPTS);
    out.reflection = prompts.length
      ? { prompts, ...(s.reflection?.emojiScale ? { emojiScale: true } : {}) }
      : undefined;
  }
  if (type !== 'video') out.instructions = text(s.instructions, 600) || undefined;
  return out;
}

/** Does the challenge show media that may come from outside (videos, or an image)? */
const hasMedia = (s: VjSession) =>
  (challengeTypeOf(s) === 'video' && s.items.length > 0) || (challengeTypeOf(s) === 'pergunta' && !!s.prompt?.image);

/** What is missing in the rights (empty = valid). */
export function rightsProblems(s: VjSession): string[] {
  const r = s.rights;
  if (!r || !(r.kind in RIGHTS_KINDS)) return ['Indique os direitos do conteúdo.'];
  const p: string[] = [];
  if (r.kind === 'licenciado' && (!text(r.source, 300) || !text(r.licence, 300)))
    p.push('Conteúdo licenciado: indique a fonte e a licença ou autorização.');
  if (r.kind === 'externo' && !text(r.source, 300)) p.push('Conteúdo externo: indique a fonte (por exemplo, o link).');
  if (r.kind === 'externo' && hasMedia(s) && !r.noIdentifiableChildren)
    p.push('Confirme que o vídeo ou a imagem não mostra crianças identificáveis.');
  return p;
}

/** What is missing for the challenge to be complete (apart from the rights). */
export function contentProblems(s: VjSession): string[] {
  switch (challengeTypeOf(s)) {
    case 'video':
      return s.items.length ? [] : ['Junte pelo menos um vídeo.'];
    case 'pergunta':
      if (!s.prompt?.question?.trim()) return ['Escreva a pergunta.'];
      if (s.prompt.kind === 'escolha' && !(s.prompt.options || []).some((o) => o.correct))
        return ['Marque pelo menos uma resposta certa.'];
      return [];
    case 'pratico':
      return s.exerciseId ? [] : ['Escolha o exercício da biblioteca da equipa.'];
    case 'reflexao':
      return (s.reflection?.prompts || []).some((q) => q.trim()) ? [] : ['Escreva pelo menos uma pergunta.'];
  }
}

/**
 * Why the challenge cannot be published yet (empty = it can). The rights are required for every new publication;
 * sessions published before MC1a stay published (they show «Direitos por indicar» until someone fills them in).
 */
export const publishProblems = (s: VjSession): string[] => [...contentProblems(s), ...rightsProblems(s)];

/** D2: a practical challenge uses an exercise of the TEAM's library, so it stays in the team (no club, no platform). */
export const canLeaveTeam = (s: Pick<VjSession, 'challengeType'>) => challengeTypeOf(s) !== 'pratico';

/** Recommended for this age group (no age groups = for all). */
export const suitsAgeGroup = (s: Pick<VjSession, 'ageGroups'>, group?: string) =>
  !group || !s.ageGroups?.length || s.ageGroups.includes(group);

/** Only the video challenges are conducted with the group and go to «Ver em casa» (VJ5 and VJ6 unchanged). */
export const isVideoChallenge = (s: Pick<VjSession, 'challengeType'>) => challengeTypeOf(s) === 'video';

const emptyOption = (): VjOption => ({ id: uid(), text: '', correct: false });
/** A new question (three empty answers to fill in). */
export const emptyPrompt = (): VjPause => ({
  id: uid(),
  at: 0,
  question: '',
  kind: 'escolha',
  options: [emptyOption(), emptyOption(), emptyOption()]
});
