import { describe, expect, it } from 'vitest';
import { buildCallupMessage } from '../lib/callupMessage';
import { Player, ScheduledMatch } from '../types';

const roster = [
  { id: 'p1', name: 'Rui Silva', number: 9 },
  { id: 'p2', name: 'Tomás Gonçalves', number: 7 },
  { id: 'p3', name: 'Sem Número', number: null }
] as unknown as Player[];

const game = (extra: Partial<ScheduledMatch> = {}): ScheduledMatch =>
  ({
    id: 's1',
    opponent: 'Constância',
    date: '2026-10-25',
    time: '11:30',
    type: 'campeonato',
    phase: 'Jornada 6',
    location: 'fora',
    callup: ['p1', 'p2', 'p3', 'removido'],
    ...extra
  }) as ScheduledMatch;

describe('Mensagem da convocatória', () => {
  it('has the game, the round and the players once each, without empty fields', () => {
    const text = buildCallupMessage(game(), { myClubName: 'Dragões', roster });
    expect(text).toContain('*Constância vs Dragões*');
    expect(text).toContain('Campeonato – Jornada 6');
    expect(text).toContain('jogo às 11:30');
    expect(text).toContain('*Convocados (3):*');
    expect(text).toContain('• 7 – Tomás Gonçalves');
    expect(text).toContain('• 9 – Rui Silva');
    expect(text).toContain('• Sem Número');
    expect(text).not.toContain('Concentração'); // not set: no "--:--"
    expect(text).not.toContain('undefined');
    expect(text).not.toMatch(/9 – 9/);
  });

  it('includes the meeting time and place, venue and notes when set', () => {
    const text = buildCallupMessage(
      game({ meetingTime: '10:30', meetingPoint: 'Sede', venue: 'Campo da Constância', callupNotes: 'Trazer CC' }),
      { myClubName: 'Dragões', roster }
    );
    expect(text).toContain('⏰ Concentração às 10:30 – Sede');
    expect(text).toContain('🏟️ Campo da Constância');
    expect(text).toContain('📝 Trazer CC');
  });

  it('home game puts our club first', () => {
    expect(buildCallupMessage(game({ location: 'casa' }), { myClubName: 'Dragões', roster })).toContain(
      '*Dragões vs Constância*'
    );
  });
});
