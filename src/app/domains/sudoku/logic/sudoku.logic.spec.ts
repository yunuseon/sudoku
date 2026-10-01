import { createGameState, createNumericAlphabet, createSudoku, elapsed, gameReducer, GameState, isSolved } from './sudoku.logic';

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

  it('stops the timer at the move that solves the board and ignores input afterwards', () => {
    const { solution } = createSudoku({ dimension: 3, alphabet: createNumericAlphabet(3, 3), givensRatio: settings.givensRatio, seed: settings.seed });
    const start = createGameState(settings, 1000);
    const open = start.game.givens.flatMap((isGiven, index) => isGiven ? [] : [index]);

    const almost = open.slice(0, -1).reduce((state, index, i) => gameReducer(
      gameReducer(state, ['select', { x: index % 9, y: Math.floor(index / 9) }], 2000 + i),
      ['set', solution[index]], 2000 + i
    ), start);

    expect(isSolved(almost.game.boardValues)).toBe(false);
    expect(almost.game.timer.stoppedAt).toBeNull();

    const last = open[open.length - 1];
    const solved = gameReducer(
      gameReducer(almost, ['select', { x: last % 9, y: Math.floor(last / 9) }], 9000),
      ['set', solution[last]], 9000
    );

    expect(isSolved(solved.game.boardValues)).toBe(true);
    expect(solved.game.timer.stoppedAt).toBe(9000);
    expect(elapsed(solved.game.timer, 50000)).toBe(8000);

    expect(gameReducer(solved, ['set', ''], 10000)).toBe(solved);
    expect(gameReducer(solved, ['togglePause', null], 10000)).toBe(solved);
  });
});
