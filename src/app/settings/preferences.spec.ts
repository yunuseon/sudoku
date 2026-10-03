import { parsePreferences } from './preferences';

describe('parsePreferences', () => {
  it('keeps known preferences of the right type and drops everything else', () => {
    expect(parsePreferences({ highlightMatchingCells: false, other: 1 })).toEqual({
      highlightMatchingCells: false
    });
    expect(parsePreferences({ highlightMatchingCells: 'no' })).toEqual({});
    expect(parsePreferences(null)).toEqual({});
  });
});
