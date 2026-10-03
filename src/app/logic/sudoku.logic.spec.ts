import {
  createGameState,
  createNumericAlphabet,
  createSudokuForLevel,
  elapsed,
  gameReducer,
  GameSettings,
  GameState,
  getRemainingCounts,
  getWrongCells,
  isLost,
  isSolved,
  isStopped
} from './sudoku.logic';

const settings: GameSettings = {
  xDimension: 3,
  yDimension: 3,
  level: 'medium',
  seed: 1,
  mistakeMode: 'marked',
  mistakeLimit: 3
};

const selectCell = (state: GameState, given: boolean): GameState => {
  const index = state.game.givens.findIndex(isGiven => isGiven === given);
  return gameReducer(state, ['select', { x: index % 9, y: Math.floor(index / 9) }], 0);
};

const selectedIndex = (state: GameState) =>
  state.game.selectedPosition.y * 9 + state.game.selectedPosition.x;

describe('gameReducer', () => {
  it('ignores setting and deleting a given value', () => {
    const state = selectCell(createGameState(settings, 0), true);
    const given = state.game.boardValues[selectedIndex(state)];

    const otherValue = given === '1' ? '2' : '1';

    expect(gameReducer(state, ['set', otherValue], 0).game.boardValues[selectedIndex(state)]).toBe(
      given
    );
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
    const state = selectCell(
      gameReducer(createGameState(settings, 0), ['hintMode', true], 0),
      true
    );

    expect(gameReducer(state, ['set', '5'], 0).game.boardHints).toEqual(state.game.boardHints);
  });

  it('stops the timer at the move that solves the board and ignores input afterwards', () => {
    const { solution } = createSudokuForLevel({
      dimension: 3,
      alphabet: createNumericAlphabet(3, 3),
      level: settings.level,
      seed: settings.seed
    });
    const start = createGameState(settings, 1000);
    const open = start.game.givens.flatMap((isGiven, index) => (isGiven ? [] : [index]));

    const almost = open
      .slice(0, -1)
      .reduce(
        (state, index, i) =>
          gameReducer(
            gameReducer(state, ['select', { x: index % 9, y: Math.floor(index / 9) }], 2000 + i),
            ['set', solution[index]],
            2000 + i
          ),
        start
      );

    expect(isSolved(almost.game.boardValues)).toBe(false);
    expect(almost.game.timer.stoppedAt).toBeNull();

    const last = open[open.length - 1];
    const solved = gameReducer(
      gameReducer(almost, ['select', { x: last % 9, y: Math.floor(last / 9) }], 9000),
      ['set', solution[last]],
      9000
    );

    expect(isSolved(solved.game.boardValues)).toBe(true);
    expect(solved.game.timer.stoppedAt).toBe(9000);
    expect(elapsed(solved.game.timer, 50000)).toBe(8000);

    expect(gameReducer(solved, ['set', ''], 10000)).toBe(solved);
    expect(gameReducer(solved, ['togglePause', null], 10000)).toBe(solved);
  });
});

describe('pause', () => {
  it('pauses a running game and leaves a paused one paused', () => {
    const paused = gameReducer(createGameState(settings, 0), ['pause', null], 1000);

    expect(paused.game.timer.pausedAt).toBe(1000);
    expect(gameReducer(paused, ['pause', null], 2000)).toBe(paused);
  });
});

describe('mistakes', () => {
  const start = createGameState(settings, 0);
  const open = start.game.givens.flatMap((isGiven, cell) => (isGiven ? [] : [cell]));
  const wrongValue = (cell: number) =>
    start.game.alphabet.find(value => value !== start.game.solution[cell])!;

  const enter = (state: GameState, cell: number, value: string, time: number) =>
    gameReducer(
      gameReducer(state, ['select', { x: cell % 9, y: Math.floor(cell / 9) }], time),
      ['set', value],
      time
    );

  it('records a wrong number and marks it, but not a right one', () => {
    const wrong = enter(start, open[0], wrongValue(open[0]), 1000);
    const right = enter(wrong, open[1], start.game.solution[open[1]], 2000);

    expect(right.game.mistakes).toEqual([
      { cell: open[0], value: wrongValue(open[0]), elapsed: 1000 }
    ]);
    expect(getWrongCells(right.game).flatMap((isWrong, cell) => (isWrong ? [cell] : []))).toEqual([
      open[0]
    ]);
  });

  it('keeps a mistake after it is deleted or undone', () => {
    const wrong = enter(start, open[0], wrongValue(open[0]), 1000);

    expect(gameReducer(wrong, ['set', ''], 2000).game.mistakes.length).toBe(1);
    expect(gameReducer(wrong, ['undo', null], 2000).game.mistakes.length).toBe(1);
  });

  it('ignores notes and does not count or mark anything when unmarked', () => {
    const notes = enter(
      gameReducer(start, ['hintMode', true], 0),
      open[0],
      wrongValue(open[0]),
      1000
    );
    expect(notes.game.mistakes).toEqual([]);

    const unmarked = enter(
      createGameState({ ...settings, mistakeMode: 'unmarked' }, 0),
      open[0],
      wrongValue(open[0]),
      1000
    );
    expect(unmarked.game.mistakes).toEqual([]);
    expect(getWrongCells(unmarked.game).some(Boolean)).toBe(false);
  });

  it('ends the game when the limit is reached and ignores input afterwards', () => {
    const lost = open
      .slice(0, 3)
      .reduce((state, cell, i) => enter(state, cell, wrongValue(cell), 1000 * (i + 1)), start);

    expect(isLost(lost.game)).toBe(true);
    expect(lost.game.timer.stoppedAt).toBe(3000);
    expect(enter(lost, open[3], start.game.solution[open[3]], 4000).game.boardValues).toEqual(
      lost.game.boardValues
    );
  });

  it('never ends the game without a limit', () => {
    const unlimited = createGameState({ ...settings, mistakeLimit: null }, 0);
    const played = open
      .slice(0, 5)
      .reduce((state, cell, i) => enter(state, cell, wrongValue(cell), 1000 * (i + 1)), unlimited);

    expect(played.game.mistakes.length).toBe(5);
    expect(isStopped(played.game.timer)).toBe(false);
  });
});

describe('getRemainingCounts', () => {
  it('counts how many of each symbol are still missing', () => {
    const board = new Array(81).fill('');
    board[0] = '1';
    board[10] = '1';
    board[20] = '9';

    expect(getRemainingCounts(board, createNumericAlphabet(3, 3))).toEqual([
      7, 9, 9, 9, 9, 9, 9, 9, 8
    ]);
  });
});

describe('undo, redo and seek', () => {
  const emptyCells = (state: GameState) =>
    state.game.givens.flatMap((isGiven, index) => (isGiven ? [] : [index]));

  const enter = (state: GameState, cell: number, value: string, time: number) =>
    gameReducer(
      gameReducer(state, ['select', { x: cell % 9, y: Math.floor(cell / 9) }], time),
      ['set', value],
      time
    );

  const start = createGameState(settings, 0);
  const [a, b] = emptyCells(start);
  const played = enter(enter(start, a, '1', 1000), b, '2', 3000);

  it('records board changes with their elapsed time, but not selections or ignored input', () => {
    const withIgnored = gameReducer(played, ['select', { x: 0, y: 0 }], 4000);

    expect(withIgnored.game.moves.map(move => [move.cell, move.value, move.elapsed])).toEqual([
      [a, '1', 1000],
      [b, '2', 3000]
    ]);
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
    const { solution } = createSudokuForLevel({
      dimension: 3,
      alphabet: createNumericAlphabet(3, 3),
      level: settings.level,
      seed: settings.seed
    });
    const open = emptyCells(start);
    const almost = open
      .slice(0, -1)
      .reduce((state, cell, i) => enter(state, cell, solution[cell], 1000 + i), start);
    const last = open[open.length - 1];
    const solved = enter(almost, last, solution[last], 9000);

    const undone = {
      ...solved,
      game: { ...solved.game, timer: { ...solved.game.timer, stoppedAt: null } }
    };
    const back = gameReducer(undone, ['undo', null], 10000);
    expect(isSolved(back.game.boardValues)).toBe(false);

    const redone = gameReducer(back, ['redo', null], 11000);
    expect(isSolved(redone.game.boardValues)).toBe(true);
    expect(redone.game.timer.stoppedAt).toBe(11000);
  });
});
