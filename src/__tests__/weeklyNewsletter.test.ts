import { describe, it, expect } from 'vitest';
import {
  ARCHIVE_WEEKS,
  archiveAfter,
  attendanceOf,
  issueOf,
  newsletterFromRestDocument,
  newsletterMessage,
  newsletterDue,
  newsletterFacts,
  newsletterIntroPrompt,
  newsletterOf,
  newsletterWeeks,
  renderNewsletterPage,
  suggestedHighlights,
  suggestedIntro,
  weekLabel
} from '../lib/weeklyNewsletter';
import { Match, Player, ScheduledMatch, Training } from '../types';

const TODAY = '2026-11-24'; // terça-feira

const player = (id: string, name: string, extra: Partial<Player> = {}): Player =>
  ({
    id,
    name,
    number: 1,
    positions: '',
    birthDate: '2015-03-02',
    active: true,
    phone: '912345678',
    ...extra
  }) as Player;

const roster = [
  player('p1', 'Tomás Gomes Silva'),
  player('p2', 'Leonor Martins'),
  player('p3', 'Rafael Costa', { nickname: 'Rafa' }),
  player('p4', 'Inês Antiga', { active: false, inactiveSince: '2026-10-01' })
];

const goal = (type: 'scored' | 'conceded', scorerId: string | null = null) => ({
  id: Math.random().toString(36),
  type,
  scorerId,
  assistId: null,
  minute: 10
});

const match = (extra: Partial<Match>): Match =>
  ({
    id: 'm1',
    opponent: 'GD Vale Verde',
    date: '2026-11-22',
    type: 'campeonato',
    season: '2026/2027',
    location: 'casa',
    finished: true,
    goals: [goal('scored', 'p1'), goal('scored', 'p1'), goal('scored', 'p2'), goal('scored', 'p3'), goal('conceded')],
    subs: [],
    lineup: [],
    capitao: null,
    notes: 'Nota privada do treinador',
    ...extra
  }) as Match;

const scheduled = (extra: Partial<ScheduledMatch>): ScheduledMatch =>
  ({
    id: 's1',
    opponent: 'CF Ribeirinho',
    date: '2026-11-29',
    time: '10:00',
    type: 'campeonato',
    location: 'casa',
    callup: ['p1'],
    venue: 'Complexo Desportivo Norte',
    meetingTime: '9h15',
    callupNotes: 'Notas da convocatória',
    ...extra
  }) as ScheduledMatch;

const training = (id: string, date: string, absences: string[], completed = true): Training => ({
  id,
  date,
  time: '18:30',
  location: 'Campo 2',
  notes: 'Nota privada',
  absences,
  completed
});

const state = {
  roster,
  matches: [match({}), match({ id: 'old', date: '2026-11-01', opponent: 'Antigo' })],
  schedule: [scheduled({}), scheduled({ id: 'far', date: '2026-12-20', opponent: 'Longe' })],
  trainings: [
    training('t1', '2026-11-18', ['p2']),
    training('t2', '2026-11-20', []),
    training('t3', '2026-11-25', [], false),
    training('t4', '2026-11-27', [], false)
  ]
};

describe('newsletterOf', () => {
  const auto = newsletterOf(state, 'Sub-11 A', TODAY);

  it('covers the week that ended (Monday to Sunday) and the rest of the week that started', () => {
    expect(auto).toMatchObject({ from: '2026-11-16', to: '2026-11-22', nextFrom: '2026-11-23', nextTo: '2026-11-29' });
    expect(auto.results.map((r) => r.opponent)).toEqual(['GD Vale Verde']);
    expect(auto.upcoming.map((e) => `${e.kind} ${e.date}`)).toEqual([
      'treino 2026-11-25',
      'treino 2026-11-27',
      'jogo 2026-11-29'
    ]);
  });

  it('counts the score and lists the scorers by first name or nickname, most goals first', () => {
    expect(auto.results[0]).toMatchObject({ ours: 4, theirs: 1, home: true, scorers: 'Tomás (2), Leonor, Rafa' });
  });

  it('shows the game with the meeting time and the place', () => {
    expect(auto.upcoming[2]).toMatchObject({
      title: 'Sub-11 A vs CF Ribeirinho',
      time: '10:00',
      meeting: 'Concentração 09:15',
      place: 'Complexo Desportivo Norte'
    });
  });

  it('a game of this week that is already over is neither a result nor a next game', () => {
    const today = newsletterOf(
      {
        ...state,
        matches: [match({ date: TODAY, opponent: 'CF Ribeirinho' })],
        schedule: [scheduled({ date: TODAY })]
      },
      'Sub-11 A',
      TODAY
    );
    expect(today.results).toHaveLength(0);
    expect(today.upcoming.filter((e) => e.kind === 'jogo')).toHaveLength(0);
  });

  it('never carries private data (surnames, phones, birth dates, notes)', () => {
    const json = JSON.stringify(auto);
    for (const secret of ['Gomes', 'Martins', '912345678', '2015-03-02', 'privada', 'convocatória']) {
      expect(json).not.toContain(secret);
    }
  });
});

describe('newsletterWeeks and newsletterDue', () => {
  it('weeks run from Monday to Sunday, whatever the day it is published', () => {
    const weeks = { from: '2026-11-16', to: '2026-11-22', nextFrom: '2026-11-23', nextTo: '2026-11-29' };
    expect(newsletterWeeks('2026-11-23')).toEqual(weeks); // segunda
    expect(newsletterWeeks('2026-11-29')).toEqual(weeks); // domingo
    expect(newsletterWeeks('2026-12-01').from).toBe('2026-11-23'); // across months
  });

  it('is due from Monday at 7:00 until the week is published', () => {
    expect(newsletterDue(new Date(2026, 10, 23, 6, 59), undefined)).toBeNull();
    expect(newsletterDue(new Date(2026, 10, 23, 7, 0), undefined)).toBe('2026-11-16');
    expect(newsletterDue(new Date(2026, 10, 25, 20, 0), '2026-11-09')).toBe('2026-11-16');
    expect(newsletterDue(new Date(2026, 10, 25, 20, 0), '2026-11-16')).toBeNull();
    // Sunday night: last week's summary was sent; the next one is due on Monday
    expect(newsletterDue(new Date(2026, 10, 29, 23, 0), '2026-11-16')).toBeNull();
  });
});

describe('attendanceOf', () => {
  it('averages the athletes present in the trainings held (inactive athletes do not count)', () => {
    // t1: 2 of 3 · t2: 3 of 3 → 5/6
    expect(attendanceOf(state.trainings, roster, '2026-11-17', '2026-11-23')).toEqual({ trainings: 2, percent: 83 });
  });

  it('is empty when no training was held', () => {
    expect(attendanceOf(state.trainings, roster, '2026-11-24', '2026-11-30')).toBeNull();
  });
});

describe('issueOf and the message', () => {
  const auto = newsletterOf(state, 'Sub-11 A', TODAY);
  const issue = issueOf(
    auto,
    { intro: '  Olá!  ', highlights: '- Fair-play\n\n• Rondos 4x2\n', notices: 'Quota até dia 8' },
    1
  );

  it('cleans the coach text', () => {
    expect(issue).toMatchObject({ intro: 'Olá!', highlights: ['Fair-play', 'Rondos 4x2'], notices: 'Quota até dia 8' });
  });

  it('the WhatsApp message has the results, the next game and the link', () => {
    const msg = newsletterMessage('Sub-11 A', issue, 'https://app/semana/abc');
    expect(msg).toContain('Sub-11 A 4–1 GD Vale Verde');
    expect(msg).toContain('Próximo jogo: Dom 29/11 às 10:00');
    expect(msg).toContain('https://app/semana/abc');
  });

  it('suggests a first note from the results', () => {
    expect(suggestedIntro(issue.results)).toContain('muito positiva');
    expect(suggestedIntro([])).toContain('resumo da semana');
  });
});

describe('the page', () => {
  const auto = newsletterOf(state, 'Sub-11 A', TODAY);
  const issue = issueOf(auto, { intro: '<script>alert(1)</script>', highlights: '', notices: '' }, 1);
  const toRest = (v: unknown): any => {
    if (v === null) return { nullValue: null };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toRest) } };
    if (typeof v === 'object')
      return { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, toRest(x)])) } };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    return { stringValue: String(v) };
  };

  it('reads the published document back and renders it, escaping the text', () => {
    const page = newsletterFromRestDocument(toRest({ teamName: 'Sub-11 A', issue }).mapValue);
    expect(page?.issue?.results[0].scorers).toBe('Tomás (2), Leonor, Rafa');
    const html = renderNewsletterPage(page!);
    expect(html).toContain('16 a 22 nov');
    expect(html).toContain('Esta semana · 23 a 29 nov');
    expect(html).toContain('4 – 1');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('without a published summary it says so', () => {
    const html = renderNewsletterPage({ teamName: 'Sub-11 A', issue: null });
    expect(html).toContain('ainda não publicou');
  });

  it('is not a newsletter without a team name', () => {
    expect(newsletterFromRestDocument({ fields: {} })).toBeNull();
  });

  it('shows the earlier weeks under "Semanas anteriores", without their events and notices', () => {
    const older = { ...issue, from: '2026-11-09', to: '2026-11-15', intro: 'Semana antiga', notices: 'Aviso antigo' };
    const archive = archiveAfter({ issue: older, archive: [] }, issue);
    const page = newsletterFromRestDocument(toRest({ teamName: 'Sub-11 A', issue, archive }).mapValue);
    expect(page?.archive?.map((a) => a.from)).toEqual(['2026-11-09']);
    const html = renderNewsletterPage(page!);
    expect(html).toContain('Semanas anteriores');
    expect(html).toContain('9 a 15 nov');
    expect(html).toContain('Semana antiga');
    expect(html).not.toContain('Aviso antigo');
  });

  it('labels weeks across months', () => {
    expect(weekLabel('2026-11-28', '2026-12-04')).toBe('28 nov a 4 dez');
  });
});

describe('archiveAfter', () => {
  const week = (from: string, intro = '') =>
    issueOf(newsletterOf(state, 'Sub-11 A', from), { intro, highlights: '', notices: 'aviso' }, 1);

  it('moves the published summary to the archive, most recent first', () => {
    const a = week('2026-11-09');
    const b = week('2026-11-16');
    const c = week('2026-11-23');
    const archive = archiveAfter({ issue: b, archive: archiveAfter({ issue: a }, b) }, c);
    expect(archive.map((i) => i.from)).toEqual([b.from, a.from]);
    expect(archive.every((i) => i.upcoming.length === 0 && i.notices === '')).toBe(true);
  });

  it('publishing the same week again replaces it instead of archiving it', () => {
    const first = week('2026-11-23', 'primeira');
    const again = week('2026-11-24', 'segunda versão');
    expect(first.from).toBe(again.from);
    expect(archiveAfter({ issue: first }, again)).toEqual([]);
  });

  it('keeps at most ARCHIVE_WEEKS weeks', () => {
    let doc: { issue: ReturnType<typeof week>; archive: ReturnType<typeof week>[] } | null = null;
    for (let i = 0; i < ARCHIVE_WEEKS + 3; i++) {
      const next = week(
        `2026-${String(9 + Math.floor(i / 4)).padStart(2, '0')}-${String(1 + (i % 4) * 7).padStart(2, '0')}`
      );
      doc = { issue: next, archive: archiveAfter(doc, next) };
    }
    expect(doc!.archive).toHaveLength(ARCHIVE_WEEKS);
  });
});

describe('suggestedHighlights', () => {
  const weeks = { from: '2026-11-16', to: '2026-11-22' };

  it('suggests a run of wins, first goals of the season, a clean sheet and a full training', () => {
    const matches = [
      match({ id: 'a', date: '2026-10-25', goals: [goal('scored', 'p1')] }),
      match({ id: 'b', date: '2026-11-01', goals: [goal('scored', 'p1'), goal('scored', 'p1')] }),
      match({ id: 'c', date: '2026-11-22', goals: [goal('scored', 'p1'), goal('scored', 'p3')] })
    ];
    const trainings = [training('t1', '2026-11-18', []), training('t2', '2026-11-20', ['p2'])];
    const out = suggestedHighlights({ roster, matches, trainings }, weeks);
    expect(out).toContain('3 vitórias seguidas');
    expect(out).toContain('Primeiro golo do Rafa nesta época');
    expect(out).not.toContain('Primeiro golo do Tomás nesta época');
    expect(out).toContain('Baliza a zeros frente ao GD Vale Verde');
    expect(out).toContain('100% de presenças no treino de quarta');
    expect(out.some((h) => h.includes('sexta'))).toBe(false);
  });

  it('suggests games without losing when there are draws, and many scorers', () => {
    const draw = [goal('scored', 'p1'), goal('conceded')];
    const matches = [
      match({ id: 'a', date: '2026-11-01', goals: draw }),
      match({ id: 'b', date: '2026-11-08', goals: [goal('scored', 'p1')] }),
      match({
        id: 'c',
        date: '2026-11-21',
        goals: [
          goal('scored', 'p1'),
          goal('scored', 'p2'),
          goal('scored', 'p3'),
          goal('scored', 'x9'),
          goal('conceded')
        ]
      })
    ];
    const out = suggestedHighlights(
      { roster: [...roster, player('x9', 'Duarte Novo')], matches, trainings: [] },
      weeks
    );
    expect(out).toContain('2 vitórias seguidas');
    expect(out).toContain('4 jogadores diferentes marcaram frente ao GD Vale Verde');
  });

  it('suggests nothing about games when there was no game in the week', () => {
    expect(suggestedHighlights({ roster, matches: [match({ date: '2026-11-01' })], trainings: [] }, weeks)).toEqual([]);
  });
});

describe('the AI note', () => {
  it('gets only the facts of the summary, never private data', () => {
    const auto = newsletterOf(state, 'Sub-11 A', TODAY);
    const facts = newsletterFacts('Sub-11 A', auto, 'Fair-play\n3 vitórias seguidas');
    expect(facts.destaques).toEqual(['Fair-play', '3 vitórias seguidas']);
    expect(facts.resultados[0]).toMatchObject({ adversario: 'GD Vale Verde', nos: 4, eles: 1 });
    const prompt = newsletterIntroPrompt(facts);
    expect(prompt).toContain('português de Portugal');
    for (const secret of ['Gomes', 'Martins', '912345678', '2015-03-02', 'privada']) {
      expect(prompt).not.toContain(secret);
    }
  });
});
