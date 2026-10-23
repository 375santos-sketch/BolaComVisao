import { describe, expect, it } from 'vitest';
import { oversizedPhotos, replacePhotos, PHOTO_SHRINK_THRESHOLD } from '../lib/photoShrink';
import { AppState } from '../types';

const big = `data:image/png;base64,${'A'.repeat(Math.ceil((PHOTO_SHRINK_THRESHOLD * 4) / 3) + 100)}`;
const small = 'data:image/jpeg;base64,AAAA';

const state = {
  roster: [
    { id: 'a', name: 'A', number: 1, positions: '', birthDate: null, active: true, photoUrl: big },
    { id: 'b', name: 'B', number: 2, positions: '', birthDate: null, active: true, photoUrl: small }
  ],
  staffMembers: [{ id: 's', name: 'S', role: 'Treinador', photoUrl: 'https://exemplo.pt/foto.jpg' }],
  teams: [
    {
      id: 't1',
      roster: [{ id: 'a', name: 'A', number: 1, positions: '', birthDate: null, active: true, photoUrl: big }]
    }
  ]
} as unknown as AppState;

describe('Fotos antigas em tamanho original', () => {
  it('finds each oversized photo once (data URLs only)', () => {
    expect(oversizedPhotos(state)).toEqual([big]);
  });

  it('swaps them everywhere (roster and the team copy) and keeps the rest', () => {
    const tiny = 'data:image/jpeg;base64,BBBB';
    const updates = replacePhotos(state, new Map([[big, tiny]]))!;
    expect(updates.roster!.map((p) => p.photoUrl)).toEqual([tiny, small]);
    expect(updates.teams![0].roster![0].photoUrl).toBe(tiny);
    expect(updates.staffMembers![0].photoUrl).toBe('https://exemplo.pt/foto.jpg');
    expect(oversizedPhotos({ ...state, ...updates })).toEqual([]);
  });

  it('changes nothing when no photo was reduced', () => {
    expect(replacePhotos(state, new Map())).toBeNull();
  });
});
