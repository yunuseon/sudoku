import { readStorage, writeStorage } from './local-storage';

describe('local storage', () => {
  beforeEach(() => localStorage.clear());

  it('reads back what was written', () => {
    expect(writeStorage('test', { moves: [1, 2], name: 'a' })).toBe(true);
    expect(readStorage('test')).toEqual({ moves: [1, 2], name: 'a' });
  });

  it('reads nothing from a missing key or broken data', () => {
    localStorage.setItem('broken', '{not json');

    expect(readStorage('missing')).toBeNull();
    expect(readStorage('broken')).toBeNull();
  });
});
