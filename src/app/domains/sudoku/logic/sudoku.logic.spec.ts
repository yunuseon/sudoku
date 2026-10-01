import { createGameState, gameReducer, GameState } from './sudoku.logic';

const settings = { xDimension: 3, yDimension: 3, givensRatio: 0.31, seed: 1 };

const selectCell = (state: GameState, given: boolean): GameState => {
  const index = state.game.givens.findIndex(isGiven => isGiven === given);
  return gameReducer(state, ['select', { x: index % 9, y: Math.floor(index / 9) }], 0);
}

const selectedIndex = (state: GameState) => state.game.selectedPosition.y * 9 + state.game.selectedPosition.x;

describe('gameReducer', () => {
  it('ignores setting and deleting a given value', () => {
    const state = selectCell(createGameState(settings, 0), true);
    const given = state.game.boardValues[selectedIndex(state)];

    const otherValue = given === '1' ? '2' : '1';

    expect(gameReducer(state, ['set', otherValue], 0).game.boardValues[selectedIndex(state)]).toBe(given);
    expect(gameReducer(state, ['set', ''], 0).game.boardValues[selectedIndex(state)]).toBe(given);
  });

  it('sets, toggles and deletes an entered value', () => {
    const state = selectCell(createGameState(settings, 0), false);
    const index = selectedIndex(state);

    const entered = gameReducer(state, ['set', '5'], 0);
    expect(entered.game.boardValues[index]).toBe('5');
    expect(entered.game.givens[index]).toBe(false);

    expect(gameReducer(entered, ['set', '5'], 0).game.boardValues[index]).toBe('');
    expect(gameReducer(entered, ['set', ''], 0).game.boardValues[index]).toBe('');
  });

  it('ignores hints on a given value', () => {
    const state = selectCell(gameReducer(createGameState(settings, 0), ['hintMode', true], 0), true);

    expect(gameReducer(state, ['set', '5'], 0).game.boardHints).toEqual(state.game.boardHints);
  });
});
