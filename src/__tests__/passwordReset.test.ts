import { describe, expect, it } from 'vitest';
import { resetTargetFor } from '../lib/passwordReset';
import { MASTER_ADMIN_EMAIL, MASTER_ADMIN_USERNAME } from '../lib/constants';

describe('resetTargetFor', () => {
  it('asks for something when the field is empty', () => {
    expect(resetTargetFor('   ')).toEqual({ kind: 'empty' });
  });

  it('sends to a real email, trimmed and in lower case', () => {
    expect(resetTargetFor('  Treinador@Gmail.com ')).toEqual({ kind: 'email', email: 'treinador@gmail.com' });
  });

  it('sends the admin aliases to the admin email', () => {
    for (const alias of [MASTER_ADMIN_USERNAME, 'admin', 'Santos']) {
      expect(resetTargetFor(alias)).toEqual({ kind: 'email', email: MASTER_ADMIN_EMAIL });
    }
  });

  it('cannot send to a username-only account', () => {
    expect(resetTargetFor('joao')).toEqual({ kind: 'username-only' });
    expect(resetTargetFor('joao@bolacomvisao.app')).toEqual({ kind: 'username-only' });
  });
});
