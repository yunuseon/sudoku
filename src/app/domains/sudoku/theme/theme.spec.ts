import { getConflictingCells, getHighlightedCells } from '../logic/sudoku.logic';
import { boardSettings, createSampleState, themeGroups, themePresets } from './theme';

describe('createSampleState', () => {
  const { game } = createSampleState();

  it('shows entered numbers, a conflict, notes and a selection', () => {
    const entered = game.boardValues.filter((value, cell) => value !== '' && !game.givens[cell]);

    expect(entered.length).toBe(3);
    expect(getConflictingCells(game.boardValues).some(Boolean)).toBe(true);
    expect(game.boardHints.filter(hint => hint !== '')).toEqual(['1', '4', '7']);
    expect(getHighlightedCells(3, game.selectedPosition).filter(Boolean).length).toBe(21);
  });
});

describe('themePresets', () => {
  it('set every themed field', () => {
    const keys = themeGroups.flatMap(group => group.fields.map(field => field.key));

    themePresets.forEach(preset => expect(Object.keys(preset.settings).sort()).toEqual([...keys].sort()));
    expect(keys.every(key => key in boardSettings)).toBe(true);
  });
});
