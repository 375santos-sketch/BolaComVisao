/**
 * P1-05 — The club's AI switch: on by default, and when it is off nothing is sent to the AI routes of the server.
 * The choice is saved with the club, so it reaches every device of the club. Fictitious data only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppState } from '../types';

vi.mock('../services/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token-teste' } } }));

const { AI_OFF_MESSAGE, isAiEnabled, setAiSwitch } = await import('../lib/aiSwitch');
const { writeChronicle, writeNewsletterIntro } = await import('../services/chronicle');
const { readPrintData } = await import('../lib/readPrint');
const { createExerciseIdea } = await import('../services/exerciseIdea');
const { extractRecords, CLUB_DOC_ID } = await import('../lib/recordSync');
const { initialDefaultState } = await import('../lib/storage');

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ success: true, text: 'Texto.' }) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  setAiSwitch(true);
  vi.unstubAllGlobals();
});

describe('P1-05 — interruptor de IA do clube', () => {
  it('está ligado por defeito e só um "false" o desliga', () => {
    expect(isAiEnabled({})).toBe(true);
    expect(isAiEnabled({ aiEnabled: undefined })).toBe(true);
    expect(isAiEnabled({ aiEnabled: true })).toBe(true);
    expect(isAiEnabled({ aiEnabled: false })).toBe(false);
  });

  it('desligado, nenhum pedido sai da app e o treinador recebe o aviso', async () => {
    setAiSwitch(false);
    const facts = {} as never;
    await expect(writeChronicle(facts, 'pais', [])).rejects.toThrow(AI_OFF_MESSAGE);
    await expect(writeNewsletterIntro(facts, [])).rejects.toThrow(AI_OFF_MESSAGE);
    await expect(readPrintData('data:image/png;base64,AAAA', 'resultados')).rejects.toThrow(AI_OFF_MESSAGE);
    await expect(createExerciseIdea({} as never)).rejects.toThrow(AI_OFF_MESSAGE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ligado outra vez, os pedidos voltam a sair', async () => {
    setAiSwitch(false);
    setAiSwitch(true);
    await readPrintData('data:image/png;base64,AAAA', 'resultados').catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a escolha fica guardada com o clube (chega a todos os aparelhos)', () => {
    const state = { ...initialDefaultState, aiEnabled: false } as AppState;
    const club = extractRecords(state).get(CLUB_DOC_ID);
    expect(club?.data.aiEnabled).toBe(false);
  });
});
