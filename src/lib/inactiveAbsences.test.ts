import { describe, expect, it } from 'vitest';
import { withInactiveAbsences } from './inactiveAbsences';
import { Player, Training } from '../types';

const p = (id: string, extra: Partial<Player> = {}): Player =>
  ({ id, name: id, number: 1, positions: '', birthDate: '', active: true, ...extra }) as Player;
const t = (id: string, date: string, absences: string[] = []): Training => ({ id, date, notes: '', absences });

describe('atletas inativos contam sempre como falta', () => {
  it('a partir do dia em que ficam inativos, todos os treinos contam como falta "Inativo"', () => {
    const out = withInactiveAbsences(
      [p('rui', { status: 'inativo' }), p('ana')],
      [t('passado', '2026-11-01'), t('hoje', '2026-11-05'), t('futuro', '2026-11-09', ['ana'])],
      '2026-11-05'
    )!;
    expect(out.roster[0].inactiveSince).toBe('2026-11-05');
    expect(out.trainings.map((x) => x.absences)).toEqual([[], ['rui'], ['ana', 'rui']]);
    expect(out.trainings[1].absenceReasons).toEqual({ rui: 'inativo' });
    // already applied: nothing more to change
    expect(withInactiveAbsences(out.roster, out.trainings, '2026-11-05')).toBeNull();
  });

  it('não é possível marcá-lo presente enquanto estiver inativo', () => {
    const roster = [p('rui', { status: 'inativo', inactiveSince: '2026-11-01' })];
    const out = withInactiveAbsences(roster, [t('x', '2026-11-03', [])], '2026-11-05')!;
    expect(out.trainings[0].absences).toEqual(['rui']);
  });

  it('quando volta a estar ativo, os treinos daí em diante deixam de contar; os anteriores ficam', () => {
    const roster = [p('rui', { status: 'disponivel', inactiveSince: '2026-11-01' })];
    const trainings: Training[] = [
      { ...t('antes', '2026-11-03', ['rui']), absenceReasons: { rui: 'inativo' } },
      { ...t('depois', '2026-11-12', ['rui']), absenceReasons: { rui: 'inativo' } },
      { ...t('doente', '2026-11-12', ['rui']), absenceReasons: { rui: 'doente' } }
    ];
    const out = withInactiveAbsences(roster, trainings, '2026-11-10')!;
    expect(out.roster[0].inactiveSince).toBeUndefined();
    expect(out.trainings.map((x) => x.absences)).toEqual([['rui'], [], ['rui']]);
    expect(out.trainings[1].absenceReasons).toEqual({});
  });

  it('sem atletas inativos não muda nada', () => {
    expect(withInactiveAbsences([p('ana')], [t('a', '2026-11-05')], '2026-11-05')).toBeNull();
    expect(withInactiveAbsences(undefined, undefined, '2026-11-05')).toBeNull();
  });
});
