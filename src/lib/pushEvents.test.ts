import { describe, expect, it } from 'vitest';
import {
  cleanNoticeRequest,
  cleanPrefs,
  cleanSubscription,
  testResult,
  matchPushMessage,
  subscriptionsToNotify
} from './pushEvents';
import { Match } from '../types';

const m = (extra: Partial<Match> = {}): Match =>
  ({
    id: 'm1',
    opponent: 'AD Tramagal',
    finished: false,
    matchPhase: 'parte1',
    goals: [],
    ...extra
  }) as unknown as Match;
const names = (id: string | null | undefined) => (id === 'p1' ? 'Rui' : '');

describe('avisos do jogo: o que é enviado', () => {
  it('início, golo, golo sofrido e fim', () => {
    expect(matchPushMessage(m({ matchPhase: 'nao_iniciado' }), m(), 'Dragões')).toEqual({
      kind: 'inicio',
      title: '⚽ Começou o jogo',
      body: 'Dragões vs AD Tramagal',
      tag: 'jogo-m1'
    });
    const goal = m({
      goals: [{ id: 'g', type: 'scored', scorerId: 'p1', assistId: null, minute: 31 }]
    } as Partial<Match>);
    expect(matchPushMessage(m(), goal, 'Dragões', names)).toMatchObject({
      kind: 'golo',
      title: '⚽ Golo! Dragões 1 – 0',
      body: "Rui, 31' · vs AD Tramagal"
    });
    const conceded = m({
      goals: [
        { id: 'g', type: 'scored', scorerId: 'p1', assistId: null, minute: 31 },
        { id: 'h', type: 'conceded', scorerId: null, assistId: null, minute: 40 }
      ]
    } as Partial<Match>);
    expect(matchPushMessage(goal, conceded, 'Dragões', names)).toMatchObject({
      kind: 'golo',
      title: 'Golo sofrido · 1 – 1',
      body: "Dragões 1 – 1 AD Tramagal (40')"
    });
    expect(matchPushMessage(conceded, { ...conceded, finished: true }, 'Dragões')).toMatchObject({
      kind: 'fim',
      title: '🏁 Fim do jogo',
      body: 'Dragões 1 – 1 AD Tramagal'
    });
  });

  it('outras mudanças (cartão, substituição, pausa) não enviam aviso', () => {
    expect(matchPushMessage(m(), m({ cornersFor: 2 }), 'Dragões')).toBeNull();
    expect(matchPushMessage(null, m(), 'Dragões')).toBeNull();
  });
});

describe('avisos do jogo: no servidor', () => {
  it('pedido verificado', () => {
    expect(
      cleanNoticeRequest({
        clubId: 'main',
        teamId: 'sub11',
        kind: 'golo',
        title: ' ⚽ Golo! ',
        body: 'Rui',
        tag: 'jogo-1'
      })
    ).toEqual({ clubId: 'main', teamId: 'sub11', kind: 'golo', title: '⚽ Golo!', body: 'Rui', tag: 'jogo-1' });
    expect(cleanNoticeRequest({ clubId: '../x', teamId: 'a', kind: 'golo', title: 'x' })).toBeNull();
    expect(cleanNoticeRequest({ clubId: 'main', teamId: 'a', kind: 'spam', title: 'x' })).toBeNull();
    expect(cleanNoticeRequest(null)).toBeNull();
  });

  const sub = (id: string, uid: string, prefs: object = {}, teamIds: string[] = ['sub11']) =>
    cleanSubscription(id, {
      uid,
      endpoint: `https://web.push.apple.com/${id}`,
      keys: { p256dh: 'k', auth: 'a' },
      prefs,
      teamIds
    })!;

  it('vai para os outros treinadores da equipa que o querem; o teste só para quem o pediu', () => {
    const subs = [
      sub('bruno', 'u-bruno'),
      sub('diretor', 'u-diretor'),
      sub('adjunto', 'u-adjunto', { golo: false }),
      sub('outra', 'u-outra', {}, ['sub13'])
    ];
    expect(subscriptionsToNotify(subs, 'u-diretor', { kind: 'golo', teamId: 'sub11' }).map((s) => s.id)).toEqual([
      'bruno'
    ]);
    expect(subscriptionsToNotify(subs, 'u-diretor', { kind: 'inicio', teamId: 'sub11' }).map((s) => s.id)).toEqual([
      'bruno',
      'adjunto'
    ]);
    expect(subscriptionsToNotify(subs, 'u-bruno', { kind: 'teste', teamId: 'sub11' }).map((s) => s.id)).toEqual([
      'bruno'
    ]);
  });

  it('subscrições incompletas ficam de fora; preferências em falta ficam ligadas', () => {
    expect(
      cleanSubscription('x', { uid: 'u', endpoint: 'http://inseguro', keys: { p256dh: 'k', auth: 'a' } })
    ).toBeNull();
    expect(cleanSubscription('x', { uid: 'u', endpoint: 'https://a' })).toBeNull();
    expect(cleanPrefs({ golo: false })).toEqual({ inicio: true, golo: false, fim: true });
  });
});

describe('testResult', () => {
  it('says what the test notice did', () => {
    expect(testResult({ sent: 1, phones: 1, failed: [] })).toMatch(/aceite/);
    expect(testResult({ sent: 0, phones: 0, failed: [] })).toMatch(/não aparece registado/);
    expect(testResult({ sent: 0, phones: 1, failed: [{ status: 403, reason: 'BadJwtToken' }] })).toMatch(
      /recusou a chave/
    );
    expect(testResult({ sent: 0, phones: 1, failed: [{ status: 400, reason: 'BadDeviceToken' }] })).toMatch(
      /código 400: BadDeviceToken/
    );
  });
});
