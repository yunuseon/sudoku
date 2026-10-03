import { getHighlightedCells, getWrongCells } from '../logic/sudoku.logic';
import {
  boardSettings,
  createSampleState,
  parseTheme,
  pickTheme,
  themeGroups,
  themePresets
} from './theme';

describe('createSampleState', () => {
  const { game } = createSampleState();

  it('shows entered numbers, a mistake, notes and a selection', () => {
    const entered = game.boardValues.filter((value, cell) => value !== '' && !game.givens[cell]);

    expect(entered.length).toBe(3);
    expect(getWrongCells(game).filter(Boolean).length).toBe(1);
    expect(game.boardHints.filter(hint => hint !== '')).toEqual(['1', '4', '7']);
    expect(getHighlightedCells(3, game.selectedPosition).filter(Boolean).length).toBe(21);
  });
});

describe('themePresets', () => {
  it('set every themed field', () => {
    const keys = themeGroups.flatMap(group => group.fields.map(field => field.key));

    themePresets.forEach(preset =>
      expect(Object.keys(preset.settings).sort()).toEqual([...keys].sort())
    );
    expect(keys.every(key => key in boardSettings)).toBe(true);
  });
});

describe('stored themes', () => {
  it('reads back a picked theme without the layout values', () => {
    const changed = { ...boardSettings, backgroundColor: '#000000', clientWidth: 321 };
    const stored = JSON.parse(JSON.stringify(pickTheme(changed)));

    expect(parseTheme(stored)['backgroundColor']).toBe('#000000');
    expect('clientWidth' in parseTheme(stored)).toBe(false);
  });

  it('drops unknown fields and values of the wrong type', () => {
    expect(
      parseTheme({ backgroundColor: 5, mainGridBorderWidth: 8, clientWidth: 10, extra: 'x' })
    ).toEqual({ mainGridBorderWidth: 8 });
    expect(parseTheme('navy')).toEqual({});
  });
});
