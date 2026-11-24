import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AI_DAILY_LIMIT, aiAccessFor, createDailyLimiter } from '../lib/aiAccess';

// Fictitious accounts only.
const account = (status: string, role = 'Treinador Principal') => ({
  account: { status, role, name: 'Treinador Teste' }
});

describe('P0-08: quem usa as funções de IA', () => {
  it('aceita um treinador ou adjunto aprovado', () => {
    expect(aiAccessFor(account('approved'), false).ok).toBe(true);
    expect(aiAccessFor(account('approved', 'Treinador Adjunto'), false).ok).toBe(true);
  });

  it('recusa contas pendentes, rejeitadas, sem papel ou sem perfil', () => {
    for (const doc of [account('pending'), account('rejected'), account('approved', ''), {}, null]) {
      const r = aiAccessFor(doc, false);
      expect(r.ok).toBe(false);
      if (r.ok === false) expect(r.status).toBe(403);
    }
  });

  it('aceita o Administrador reconhecido por admins/{uid}, mesmo sem perfil', () => {
    expect(aiAccessFor(null, true).ok).toBe(true);
  });
});

describe('P0-08: limite diário por conta', () => {
  it('deixa passar até ao limite e depois responde 429', () => {
    const limiter = createDailyLimiter(3, () => Date.UTC(2026, 10, 24, 12));
    expect([1, 2, 3].map(() => limiter.take('uid-a').ok)).toEqual([true, true, true]);
    const blocked = limiter.take('uid-a');
    expect(blocked.ok).toBe(false);
    if (blocked.ok === false) expect(blocked.status).toBe(429);
  });

  it('conta cada conta à parte', () => {
    const limiter = createDailyLimiter(1, () => Date.UTC(2026, 10, 24, 12));
    expect(limiter.take('uid-a').ok).toBe(true);
    expect(limiter.take('uid-b').ok).toBe(true);
    expect(limiter.take('uid-a').ok).toBe(false);
  });

  it('volta a zero no dia seguinte (UTC)', () => {
    let now = Date.UTC(2026, 10, 24, 23, 59);
    const limiter = createDailyLimiter(1, () => now);
    expect(limiter.take('uid-a').ok).toBe(true);
    expect(limiter.take('uid-a').ok).toBe(false);
    now = Date.UTC(2026, 10, 25, 0, 1);
    expect(limiter.take('uid-a').ok).toBe(true);
  });

  it('o limite por omissão é razoável para o plano grátis', () => {
    expect(AI_DAILY_LIMIT).toBeGreaterThan(0);
    expect(AI_DAILY_LIMIT).toBeLessThanOrEqual(100);
  });
});

describe('P0-08: servidor', () => {
  const server = readFileSync(new URL('../../server.ts', import.meta.url), 'utf8');
  const auth = readFileSync(new URL('../services/cloudAuthService.ts', import.meta.url), 'utf8');

  it('as três rotas de IA verificam a conta e o limite', () => {
    for (const route of ['/api/ler-jornada', '/api/cronica', '/api/exercicio-ia']) {
      const start = server.indexOf(`app.post('${route}'`);
      const body = server.slice(start, server.indexOf('app.', start + 10));
      expect(body, route).toContain('await aiCaller(req)');
      expect(body, route).toContain('aiLimiter.take(caller.uid)');
    }
  });

  it('o Administrador já não é reconhecido pelo e-mail', () => {
    expect(server).not.toContain('MASTER_ADMIN_EMAIL');
  });

  it('o create-user já não inventa uids (nem no servidor nem na app)', () => {
    expect(server).not.toMatch(/'user_'\s*\+\s*Math\.random/);
    expect(server).not.toContain('isPreAuthorizedFallback');
    expect(auth).not.toMatch(/'user_'\s*\+\s*Math\.random/);
  });
});
