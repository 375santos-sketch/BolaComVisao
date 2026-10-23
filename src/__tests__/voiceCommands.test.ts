import { describe, expect, it } from 'vitest';
import { describeVoiceCommand, normalizeSpeech, parseVoiceCommand } from '../lib/voiceCommands';
import { Player } from '../types';

const p = (id: string, name: string, number: number, extra: Partial<Player> = {}): Player => ({
  id,
  name,
  number,
  positions: '',
  birthDate: null,
  active: true,
  ...extra
});
const squad = [
  p('p1', 'Rui Silva', 9),
  p('p2', 'Tomás Gonçalves', 7),
  p('p3', 'André Lopes', 10),
  p('p4', 'Rui Pedro Costa', 4),
  p('p5', 'Martim Costa', 2, { nickname: 'Tim' })
];
const onPitch = ['p1', 'p2', 'p5'];
const cmd = (text: string) => parseVoiceCommand(text, squad, onPitch);

describe('Ditar durante o jogo', () => {
  it('normalises speech (accents, case, numbers said in words)', () => {
    expect(normalizeSpeech('Golo do Número Nove!')).toBe('golo do numero 9');
    expect(normalizeSpeech('vinte e um')).toBe('21');
  });

  it('goals: by name, number, nickname, with assist; two "Rui": the one on the pitch', () => {
    expect(cmd('Golo do Rui').command).toEqual({ kind: 'goal', scorerId: 'p1', assistId: null });
    expect(cmd('golo do número 7 assistência do André').command).toEqual({
      kind: 'goal',
      scorerId: 'p2',
      assistId: 'p3'
    });
    expect(cmd('golo do Tim, passe do Tomás').command).toEqual({ kind: 'goal', scorerId: 'p5', assistId: 'p2' });
    expect(cmd('golo do Tomas Gonsalves').command).toMatchObject({ scorerId: 'p2' }); // small slip
    expect(cmd('autogolo').command).toEqual({ kind: 'goal', scorerId: 'autogolo', assistId: null });
  });

  it('goals conceded and cards', () => {
    expect(cmd('golo sofrido').command).toEqual({ kind: 'conceded' });
    expect(cmd('sofremos golo').command).toEqual({ kind: 'conceded' });
    expect(cmd('amarelo para o 7').command).toEqual({ kind: 'card', playerId: 'p2', color: 'Amarelo' });
    expect(cmd('cartão vermelho ao André').command).toEqual({ kind: 'card', playerId: 'p3', color: 'Vermelho' });
  });

  it('substitutions in several word orders (out from the pitch, in from the bench)', () => {
    const sub = { kind: 'sub', outId: 'p1', inId: 'p3' };
    expect(cmd('sai o Rui entra o André').command).toEqual(sub);
    expect(cmd('entra o André sai o Rui').command).toEqual(sub);
    expect(cmd('substituição Rui por André').command).toEqual(sub);
    expect(cmd('entra o 10 para o lugar do 9, sai o 9').command).toEqual(sub);
  });

  it('explains what it did not understand', () => {
    expect(cmd('golo do Zé').error).toMatch(/Não encontrei "ze"/);
    expect(cmd('golo do 33').error).toMatch(/número 33/);
    expect(parseVoiceCommand('golo do Rui', squad, []).error).toMatch(/diga o número/);
    expect(cmd('bom jogo pessoal').error).toMatch(/Não percebi/);
    expect(cmd('sai o Rui entra o Tomás').error).toBeTruthy(); // Tomás is already on the pitch
  });

  it('describes the event for the confirmation banner', () => {
    expect(describeVoiceCommand({ kind: 'goal', scorerId: 'p1', assistId: 'p2' }, squad)).toBe(
      '⚽ Golo de Rui Silva (assistência Tomás Gonçalves)'
    );
    expect(describeVoiceCommand({ kind: 'sub', outId: 'p1', inId: 'p3' }, squad)).toBe(
      '🔄 Sai Rui Silva, entra André Lopes'
    );
  });
});
