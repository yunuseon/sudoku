import { isNumber, isOneOf, isShape, isString, pickValid } from './validation';

describe('validation', () => {
  it('accepts only finite numbers and listed values', () => {
    expect([1, NaN, Infinity, '1'].map(isNumber)).toEqual([true, false, false, false]);
    expect(['easy', 'insane', null].map(isOneOf(['easy', 'hard'] as const))).toEqual([
      true,
      false,
      false
    ]);
    expect(isOneOf([3, null])(null)).toBe(true);
  });

  it('checks every field of a shape', () => {
    const isPoint = isShape<{ x: number; name: string }>({ x: isNumber, name: isString });

    expect(isPoint({ x: 1, name: 'a', extra: true })).toBe(true);
    expect(isPoint({ x: '1', name: 'a' })).toBe(false);
    expect(isPoint({ x: 1 })).toBe(false);
    expect(isPoint([1, 'a'])).toBe(false);
  });

  it('keeps the stored settings that still have the type of their default', () => {
    const defaults = { color: '#000', width: 4, on: true };

    expect(
      pickValid(defaults, ['color', 'width', 'on'], { color: 5, width: 8, on: false, other: 1 })
    ).toEqual({ width: 8, on: false });
    expect(pickValid(defaults, ['width'], { width: NaN })).toEqual({});
    expect(pickValid(defaults, ['color'], 'theme')).toEqual({});
  });
});
