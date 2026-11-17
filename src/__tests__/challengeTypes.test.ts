import { describe, expect, it } from 'vitest';
import {
  canLeaveTeam,
  challengeTypeOf,
  contentProblems,
  emptyPrompt,
  publishProblems,
  rightsProblems,
  suitsAgeGroup
} from '../lib/challenges';
import { cleanSession, newSession, sessionsOf, withSession } from '../lib/vjLibrary';
import { familySessionsOf } from '../lib/familyView';
import { vjStatsFor } from '../lib/vjCompetencies';
import { isKnownCompetency } from '../lib/competencies';
import { withGoal } from '../lib/playerEvolution';
import { assembleState, extractRecords } from '../lib/recordSync';
import { normalizeClubState } from '../lib/storage';
import { Player, VjSession } from '../types';

// Fictitious data, only for this test
const NOW = '2026-11-17T10:00:00.000Z';
const base = (id: string, patch: Partial<VjSession> = {}): VjSession => ({
  ...newSession({ id, title: `Desafio ${id}`, now: NOW }),
  ...patch
});
const ownRights = { kind: 'proprio' as const, confirmedBy: 'Treinador Exemplo', confirmedAt: NOW };
const question = (id: string, patch: Partial<VjSession> = {}) =>
  base(id, {
    challengeType: 'pergunta',
    prompt: {
      ...emptyPrompt(),
      question: 'Para onde orientar a receção?',
      options: [
        { id: 'a', text: 'Para a frente', correct: true, explanation: 'Ganha tempo' },
        { id: 'b', text: 'Para trás', correct: false }
      ]
    },
    ...patch
  });
const practical = (id: string, patch: Partial<VjSession> = {}) =>
  base(id, { challengeType: 'pratico', exerciseId: 'ex1', completionCriteria: '5 seguidas', ...patch });
const reflection = (id: string, patch: Partial<VjSession> = {}) =>
  base(id, { challengeType: 'reflexao', reflection: { prompts: ['O que correu bem?'] }, ...patch });
const video = (id: string, patch: Partial<VjSession> = {}) =>
  base(id, { items: [{ id: 'v1', kind: 'video', youtubeId: 'dQw4w9WgXcQ', pauses: [] }], ...patch });

describe('MC1a — formatos de desafio', () => {
  it('old records without the new fields are video sessions, and keep working', () => {
    const old = base('antigo');
    expect(challengeTypeOf(old)).toBe('video');
    const clean = cleanSession(video('v'), NOW);
    expect(clean.items).toHaveLength(1);
    expect(challengeTypeOf(clean)).toBe('video');
  });

  it('every challenge keeps format «sessao» (the envelope the older app versions keep)', () => {
    for (const s of [question('q'), practical('p'), reflection('r')]) {
      const c = cleanSession(s, NOW);
      expect(c.format).toBe('sessao');
      expect(c.challengeType).toBe(s.challengeType);
    }
  });

  it('each type keeps only its own content (no videos or runs outside video)', () => {
    const q = cleanSession(
      question('q', {
        items: [{ id: 'v1', kind: 'video', youtubeId: 'dQw4w9WgXcQ' }],
        runs: [{ id: 'r', date: '2026-11-10', answers: {} }],
        exerciseId: 'ex1',
        reflection: { prompts: ['x'] }
      }),
      NOW
    );
    expect(q.items).toEqual([]);
    expect(q.runs).toBeUndefined();
    expect(q.exerciseId).toBeUndefined();
    expect(q.reflection).toBeUndefined();
    expect(q.prompt?.question).toBe('Para onde orientar a receção?');
    const r = cleanSession(reflection('r', { reflection: { prompts: ['', 'a', 'b', 'c', 'd', 'e', 'f'] } }), NOW);
    expect(r.reflection?.prompts).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(JSON.stringify(cleanSession(video('v'), NOW))).not.toContain('undefined');
  });

  it('age groups and difficulty only accept valid values', () => {
    const c = cleanSession(question('q', { ageGroups: ['Sub-11', 'Sub-99', 'Sub-11'], difficulty: 7 as never }), NOW);
    expect(c.ageGroups).toEqual(['Sub-11']);
    expect(c.difficulty).toBeUndefined();
    expect(cleanSession(question('q', { difficulty: 2 }), NOW).difficulty).toBe(2);
    expect(suitsAgeGroup({ ageGroups: ['Sub-11'] }, 'Sub-13')).toBe(false);
    expect(suitsAgeGroup({ ageGroups: [] }, 'Sub-13')).toBe(true);
  });

  it('a too big image is not kept', () => {
    const big = `data:image/jpeg;base64,${'A'.repeat(300_000)}`;
    const c = cleanSession(question('q', { prompt: { ...question('x').prompt!, image: big } }), NOW);
    expect(c.prompt?.image).toBeUndefined();
  });
});

describe('MC1a — publicar exige o conteúdo completo e os direitos', () => {
  it('without rights it cannot be published (draft and review do not need them)', () => {
    expect(publishProblems(question('q'))).toContain('Indique os direitos do conteúdo.');
    expect(publishProblems(question('q', { rights: ownRights }))).toEqual([]);
  });

  it('licensed content needs the source and the licence; external needs the source', () => {
    expect(rightsProblems(question('q', { rights: { kind: 'licenciado', source: 'Livro' } }))).toHaveLength(1);
    expect(
      rightsProblems(question('q', { rights: { kind: 'licenciado', source: 'Livro', licence: 'Autorizado' } }))
    ).toEqual([]);
    expect(rightsProblems(question('q', { rights: { kind: 'externo' } }))).toHaveLength(1);
  });

  it('an external video needs the confirmation «sem crianças identificáveis»', () => {
    const v = video('v', { rights: { kind: 'externo', source: 'https://youtu.be/dQw4w9WgXcQ' } });
    expect(rightsProblems(v)).toEqual(['Confirme que o vídeo ou a imagem não mostra crianças identificáveis.']);
    expect(rightsProblems({ ...v, rights: { ...v.rights!, noIdentifiableChildren: true } })).toEqual([]);
  });

  it('each type must be complete', () => {
    expect(contentProblems(question('q', { prompt: { ...emptyPrompt() } }))).toEqual(['Escreva a pergunta.']);
    expect(
      contentProblems(
        question('q', { prompt: { ...question('x').prompt!, options: [{ id: 'a', text: 'x', correct: false }] } })
      )
    ).toEqual(['Marque pelo menos uma resposta certa.']);
    expect(contentProblems(practical('p', { exerciseId: undefined }))).toEqual([
      'Escolha o exercício da biblioteca da equipa.'
    ]);
    expect(contentProblems(reflection('r', { reflection: { prompts: [] } }))).toEqual([
      'Escreva pelo menos uma pergunta.'
    ]);
    expect(contentProblems(video('v', { items: [] }))).toEqual(['Junte pelo menos um vídeo.']);
  });

  it('D2: a practical challenge stays in the team (it uses an exercise of the team)', () => {
    expect(canLeaveTeam(practical('p'))).toBe(false);
    expect(canLeaveTeam(question('q'))).toBe(true);
  });
});

describe('MC1a — prático referencia o exercício sem o copiar', () => {
  it('what the editor saves holds only the exerciseId, never the exercise', () => {
    // The editor's picker sets only `exerciseId`; the exercise stays in the team's library
    const c = cleanSession(practical('p'), NOW);
    expect(c.exerciseId).toBe('ex1');
    for (const field of ['name', 'image', 'durationMinutes', 'material', 'coachingPoints'])
      expect(c).not.toHaveProperty(field);
  });
});

describe('MC1a — compatibilidade com as versões instaladas (risco R1)', () => {
  it('an older app saving a session never drops the new challenges, nor their fields', () => {
    // What the app before MC1a does: it reads the team's sessions (format «sessao»), changes one, writes the list
    const team = { vjSessions: [video('v'), cleanSession(question('q'), NOW), cleanSession(practical('p'), NOW)] };
    const oldRead = sessionsOf(team);
    expect(oldRead.map((s) => s.id)).toEqual(['v', 'q', 'p']);
    const oldClean = (s: VjSession) => ({ ...s, title: s.title.trim() }); // the old cleanSession keeps every field
    const saved = withSession(oldRead, oldClean({ ...oldRead[0], title: 'Mudado' }));
    expect(saved.map((s) => s.id).sort()).toEqual(['p', 'q', 'v']);
    expect(saved.find((s) => s.id === 'q')?.prompt?.question).toBe('Para onde orientar a receção?');
    expect(saved.find((s) => s.id === 'p')?.exerciseId).toBe('ex1');
  });

  it('the new challenges go to the cloud and come back the same (the same «challenge» record)', () => {
    const state = normalizeClubState({
      activeTeamId: 'eq1',
      teams: [
        {
          id: 'eq1',
          clubName: 'Clube Exemplo',
          category: 'Sub-11',
          season: '2026/2027',
          roster: [],
          vjSessions: [cleanSession(question('q', { rights: ownRights }), NOW), cleanSession(reflection('r'), NOW)]
        }
      ]
    } as never);
    const records = extractRecords(state);
    expect([...records.values()].filter((r) => r.kind === 'challenge')).toHaveLength(2);
    const back = assembleState(records, { ...state, teams: [] } as never);
    const sessions = back.teams.find((t) => t.id === 'eq1')?.vjSessions || [];
    expect(sessions.find((s) => s.id === 'q')).toMatchObject({
      challengeType: 'pergunta',
      rights: { kind: 'proprio' }
    });
  });
});

describe('MC1a — VJ5 e VJ6 iguais, sem respostas individuais', () => {
  const published = (s: VjSession) => ({ ...s, status: 'publicado' as const, rights: ownRights });
  it('«Ver em casa» only takes video sessions', () => {
    const list = familySessionsOf([published(video('v')), published(question('q')), published(reflection('r'))]);
    expect(list.map((s) => s.id)).toEqual(['v']);
  });

  it('the competencies (VJ5) only count runs, which only video sessions have', () => {
    const q = cleanSession(
      question('q', {
        competencies: ['decisao'],
        runs: [{ id: 'r', date: '2026-11-10', answers: {}, presentIds: ['p1'] }]
      }),
      NOW
    );
    expect(q.runs).toBeUndefined();
    expect(vjStatsFor('p1', [q], [])).toEqual({});
  });

  it('no field of a challenge keeps answers of athletes', () => {
    for (const s of [question('q'), practical('p'), reflection('r')]) {
      const c = cleanSession(s, NOW);
      expect(c.runs).toBeUndefined();
      expect(JSON.stringify(c)).not.toMatch(/presentIds|answers/);
    }
  });
});

describe('MC1a — objetivo ligado a uma competência', () => {
  const player = {
    id: 'p1',
    name: 'Atleta Exemplo',
    number: 7,
    positions: '',
    birthDate: null,
    active: true
  } as Player;
  it('keeps a known competency, drops an unknown one, and old goals stay the same', () => {
    expect(isKnownCompetency('rececao_orientada')).toBe(true);
    expect(isKnownCompetency('x:Jogo aéreo')).toBe(true);
    expect(isKnownCompetency('inventada')).toBe(false);
    const a = withGoal(player, {
      id: 'g1',
      text: 'Receber orientado',
      createdAt: '2026-11-17',
      competencyId: 'rececao_orientada'
    });
    expect(a.individualGoals?.[0].competencyId).toBe('rececao_orientada');
    const b = withGoal(player, { id: 'g2', text: 'Outro', createdAt: '2026-11-17', competencyId: 'inventada' });
    expect(b.individualGoals?.[0].competencyId).toBeUndefined();
    const c = withGoal(player, { id: 'g3', text: 'Sem competência', createdAt: '2026-11-17' });
    expect(c.individualGoals?.[0]).not.toHaveProperty('competencyId');
  });
});
