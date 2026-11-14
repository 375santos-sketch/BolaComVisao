import { describe, expect, it } from 'vitest';
import { cleanSubscription, fromRestFields, noticeAllowed, subscriptionsToNotify } from '../lib/pushEvents';

// Fictitious data, only for this test
describe('F2.4 — quem pode enviar avisos', () => {
  it('without a membership (old access): as before, the Firestore rules decide', () => {
    expect(noticeAllowed(null, 'eqA')).toEqual({ ok: true });
  });

  it('an active member of the team (or of every team) whose role writes', () => {
    expect(noticeAllowed({ status: 'active', role: 'treinador', teamIds: ['eqA'] }, 'eqA')).toEqual({ ok: true });
    expect(noticeAllowed({ status: 'active', role: 'coordenador', teamIds: ['*'] }, 'eqB')).toEqual({ ok: true });
  });

  it('refused: another team, staff, suspended or revoked', () => {
    expect(noticeAllowed({ status: 'active', role: 'treinador', teamIds: ['eqA'] }, 'eqB')).toMatchObject({
      ok: false
    });
    expect(noticeAllowed({ status: 'active', role: 'staff', teamIds: ['eqA'] }, 'eqA')).toMatchObject({ ok: false });
    expect(noticeAllowed({ status: 'suspended', role: 'treinador', teamIds: ['eqA'] }, 'eqA')).toMatchObject({
      ok: false
    });
    expect(noticeAllowed({ status: 'revoked', role: 'owner', teamIds: ['*'] }, 'eqA')).toMatchObject({ ok: false });
  });
});

describe('F2.4 — telemóveis lidos pelo servidor (formato REST do Firestore)', () => {
  it('turns a REST document into a subscription and picks the right phones', () => {
    const fields = {
      uid: { stringValue: 'u2' },
      endpoint: { stringValue: 'https://push.example/abc' },
      keys: { mapValue: { fields: { p256dh: { stringValue: 'p' }, auth: { stringValue: 'a' } } } },
      prefs: {
        mapValue: {
          fields: { inicio: { booleanValue: true }, golo: { booleanValue: true }, fim: { booleanValue: false } }
        }
      },
      teamIds: { arrayValue: { values: [{ stringValue: 'eqA' }] } },
      updatedAt: { integerValue: '5' }
    };
    const plain = fromRestFields(fields);
    expect(plain).toMatchObject({ uid: 'u2', teamIds: ['eqA'], updatedAt: 5, prefs: { golo: true } });
    const sub = cleanSubscription('s1', plain)!;
    expect(sub).toMatchObject({ id: 's1', uid: 'u2', teamIds: ['eqA'] });
    expect(subscriptionsToNotify([sub], 'u1', { kind: 'golo', teamId: 'eqA' })).toHaveLength(1);
    expect(subscriptionsToNotify([sub], 'u1', { kind: 'golo', teamId: 'eqB' })).toHaveLength(0);
    expect(subscriptionsToNotify([sub], 'u1', { kind: 'fim', teamId: 'eqA' })).toHaveLength(0);
  });
});
