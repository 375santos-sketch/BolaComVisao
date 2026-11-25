/**
 * P1-05 — The AI switch of the club (Definições → Clube → «Funções de IA»). Anyone of the club can turn it on or off;
 * it is on by default (no value saved = on), so nothing changes for the clubs that already use the AI.
 *
 * When it is off, no request leaves the app for the AI routes of the server (crónica, resumo da semana, leitura de
 * prints, exercício com IA): every caller goes through assertAiEnabled() before the fetch.
 */
import { AppState } from '../types';

export const AI_OFF_MESSAGE = 'As funções de IA estão desligadas neste clube. Pode ligá-las em Definições → Clube.';

/** The club's choice; a club that never chose has the AI on. */
export const isAiEnabled = (state: Pick<AppState, 'aiEnabled'>): boolean => state.aiEnabled !== false;

let enabled = true;

/** The app keeps this in step with the club's state (App.tsx). */
export function setAiSwitch(on: boolean) {
  enabled = on;
}

/** Throws the message for the coach when the club has the AI off. */
export function assertAiEnabled() {
  if (!enabled) throw new Error(AI_OFF_MESSAGE);
}
