/**
 * P1-05 — What actually goes to the server when the coach asks the AI for a crónica or for the weekly note: no name
 * of the roster in the request, and the names back in the text shown. Plus the server's minimal usage line.
 * Fictitious data only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Player } from '../types';

vi.mock('../services/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token-teste' } } }));

const { writeChronicle, writeNewsletterIntro } = await import('../services/chronicle');
const { aiOutcomeOf, aiUsageLine } = await import('../lib/aiAccess');

const roster = [
  { id: 'p1', name: 'Rui Silva', number: 9 },
  { id: 'p2', name: 'Tomás Gonçalves', number: 7, nickname: 'Tomé' },
  { id: 'p3', name: 'Inês Araújo', number: 1 }
] as Player[];
const NAMES = ['Rui', 'Silva', 'Tomás', 'Gonçalves', 'Tomé', 'Inês', 'Araújo'];

let sent: string[] = [];
let answer = '';
beforeEach(() => {
  sent = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      sent.push(init.body);
      return { ok: true, json: async () => ({ success: true, text: answer }) };
    })
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('P1-05 — a IA não recebe nomes de atletas', () => {
  it('crónica: o pedido leva códigos e o texto mostrado tem os nomes', async () => {
    const facts = {
      club: 'Clube Teste',
      category: 'Sub-11',
      opponent: 'Adversário FC',
      home: true,
      date: '2026-11-07',
      competition: 'Campeonato',
      scored: 2,
      conceded: 1,
      goals: [
        { side: 'nós' as const, minute: "20'", scorer: 'Tomé' },
        { side: 'eles' as const, minute: "25'" },
        { side: 'nós' as const, minute: "31'", scorer: 'Rui' },
        { side: 'nós' as const, minute: "40'", scorer: 'autogolo' }
      ],
      cameBack: false,
      calledUp: 3,
      allPlayed: true
    };
    answer = 'Vitória! Golos de J2 e J1, e ainda um autogolo.';
    const text = await writeChronicle(facts, 'pais', roster);
    expect(sent).toHaveLength(1);
    for (const n of NAMES) expect(sent[0]).not.toContain(n);
    expect(JSON.parse(sent[0]).facts.goals.map((g: { scorer?: string }) => g.scorer)).toEqual([
      'J2',
      undefined,
      'J1',
      'autogolo'
    ]);
    expect(text).toBe('Vitória! Golos de Tomé e Rui, e ainda um autogolo.');
    // The coach's own facts are not changed (the app's plain text keeps the names)
    expect(facts.goals[0].scorer).toBe('Tomé');
  });

  it('resumo da semana: marcadores e destaques vão em código', async () => {
    const facts = {
      equipa: 'Sub-11 A',
      semana: '17 a 23 nov',
      resultados: [
        {
          dia: 'Sáb 22/11',
          adversario: 'Adversário FC',
          local: 'casa',
          nos: 3,
          eles: 1,
          competicao: 'Campeonato',
          marcadores: 'Tomé (2), Rui'
        }
      ],
      presencas: { trainings: 2, percent: 90 },
      destaques: ['Primeiro golo do Rui nesta época', 'A Inês Araújo fez grandes defesas'],
      proximosJogos: []
    };
    answer = 'Que semana! J2 bisou, J1 estreou-se a marcar e J3 brilhou na baliza.';
    const text = await writeNewsletterIntro(facts, roster);
    for (const n of NAMES) expect(sent[0]).not.toContain(n);
    const body = JSON.parse(sent[0]);
    expect(body.kind).toBe('resumo');
    expect(body.facts.resultados[0].marcadores).toBe('J2 (2), J1');
    expect(body.facts.destaques).toEqual(['Primeiro golo do J1 nesta época', 'A J3 fez grandes defesas']);
    expect(text).toBe('Que semana! Tomé bisou, Rui estreou-se a marcar e Inês brilhou na baliza.');
  });
});

describe('P1-05 — registo mínimo de uso', () => {
  it('uma linha com a rota, a conta em hash curto, o resultado e a data; nunca o uid', () => {
    const uid = 'uidFicticio123456';
    const line = aiUsageLine('cronica', uid, 'ok', new Date('2026-11-25T10:00:00Z'));
    const parsed = JSON.parse(line);
    expect(parsed).toEqual({
      ia: 'cronica',
      conta: expect.stringMatching(/^[0-9a-f]{10}$/),
      resultado: 'ok',
      em: '2026-11-25T10:00:00.000Z'
    });
    expect(line).not.toContain(uid);
    expect(aiUsageLine('resumo', uid, 'ok')).toContain(parsed.conta); // the same account, the same hash
    expect(JSON.parse(aiUsageLine('ler-jornada', undefined, 'recusado')).conta).toBe('-');
  });

  it('o resultado vem do código HTTP da resposta', () => {
    expect([200, 401, 403, 429, 400, 502, 503, 500].map(aiOutcomeOf)).toEqual([
      'ok',
      'recusado',
      'recusado',
      'limite',
      'invalido',
      'erro',
      'erro',
      'erro'
    ]);
  });
});
