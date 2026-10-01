import { createGameState, createNumericAlphabet, createSudokuForLevel, elapsed, gameReducer, GameState, getConflictingCells, getRemainingCounts, isSolved } from './sudoku.logic';

const settings = { xDimension: 3, yDimension: 3, level: 'medium' as const, seed: 1 };

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
    const { solution } = createSudokuForLevel({ dimension: 3, alphabet: createNumericAlphabet(3, 3), level: settings.level, seed: settings.seed });
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

describe('getConflictingCells', () => {
  it('marks every value that breaks a rule and nothing else', () => {
    const board = new Array(81).fill('');
    board[0] = '5';
    board[8] = '5';
    board[10] = '3';
    board[72] = '7';

    const conflicts = getConflictingCells(board);

    expect(conflicts.flatMap((isConflict, index) => isConflict ? [index] : [])).toEqual([0, 8]);
  });
});

describe('getRemainingCounts', () => {
  it('counts how many of each symbol are still missing', () => {
    const board = new Array(81).fill('');
    board[0] = '1';
    board[10] = '1';
    board[20] = '9';

    expect(getRemainingCounts(board, createNumericAlphabet(3, 3))).toEqual([7, 9, 9, 9, 9, 9, 9, 9, 8]);
  });
});

describe('undo, redo and seek', () => {
  const emptyCells = (state: GameState) => state.game.givens.flatMap((isGiven, index) => isGiven ? [] : [index]);

  const enter = (state: GameState, cell: number, value: string, time: number) => gameReducer(
    gameReducer(state, ['select', { x: cell % 9, y: Math.floor(cell / 9) }], time),
    ['set', value], time
  );

  const start = createGameState(settings, 0);
  const [a, b] = emptyCells(start);
  const played = enter(enter(start, a, '1', 1000), b, '2', 3000);

  it('records board changes with their elapsed time, but not selections or ignored input', () => {
    const withIgnored = gameReducer(played, ['select', { x: 0, y: 0 }], 4000);

    expect(withIgnored.game.moves.map(move => [move.cell, move.value, move.elapsed])).toEqual([[a, '1', 1000], [b, '2', 3000]]);
    expect(withIgnored.game.cursor).toBe(2);
  });

  it('undoes and redoes moves and selects the affected cell', () => {
    const undone = gameReducer(played, ['undo', null], 5000);
    expect(undone.game.boardValues[b]).toBe('');
    expect(undone.game.boardValues[a]).toBe('1');
    expect(undone.game.cursor).toBe(1);
    expect(undone.game.selectedPosition).toEqual({ x: a % 9, y: Math.floor(a / 9) });

    const redone = gameReducer(undone, ['redo', null], 6000);
    expect(redone.game.boardValues).toEqual(played.game.boardValues);
    expect(redone.game.cursor).toBe(2);

    expect(gameReducer(redone, ['redo', null], 7000)).toBe(redone);
    expect(gameReducer(start, ['undo', null], 7000)).toBe(start);
  });

  it('seeks to any point and replaces the undone moves with a new one', () => {
    const atStart = gameReducer(played, ['seek', 0], 5000);
    expect(atStart.game.boardValues).toEqual(start.game.boardValues);

    const branched = enter(atStart, b, '3', 6000);
    expect(branched.game.moves.map(move => move.value)).toEqual(['3']);
    expect(branched.game.boardValues[a]).toBe('');
    expect(branched.game.boardValues[b]).toBe('3');
  });

  it('stops the timer when a redo solves the board', () => {
    const { solution } = createSudokuForLevel({ dimension: 3, alphabet: createNumericAlphabet(3, 3), level: settings.level, seed: settings.seed });
    const open = emptyCells(start);
    const almost = open.slice(0, -1).reduce((state, cell, i) => enter(state, cell, solution[cell], 1000 + i), start);
    const last = open[open.length - 1];
    const solved = enter(almost, last, solution[last], 9000);

    const undone = { ...solved, game: { ...solved.game, timer: { ...solved.game.timer, stoppedAt: null } } };
    const back = gameReducer(undone, ['undo', null], 10000);
    expect(isSolved(back.game.boardValues)).toBe(false);

    const redone = gameReducer(back, ['redo', null], 11000);
    expect(isSolved(redone.game.boardValues)).toBe(true);
    expect(redone.game.timer.stoppedAt).toBe(11000);
  });
});
