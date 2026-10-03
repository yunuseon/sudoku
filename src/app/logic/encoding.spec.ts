import { decodeGame, encodeGame } from './encoding';
import { SavedGame, toSavedGame } from './persistence';
import { createGameState, gameReducer, GameSettings, GameState, solveSudoku } from './sudoku.logic';

const settings: GameSettings = {
  xDimension: 3,
  yDimension: 3,
  level: 'medium',
  seed: 4242,
  mistakeMode: 'marked',
  mistakeLimit: null
};

const enter = (state: GameState, cell: number, value: string, time: number) =>
  gameReducer(
    gameReducer(state, ['select', { x: cell % 9, y: Math.floor(cell / 9) }], time),
    ['set', value],
    time
  );

const note = (state: GameState, cell: number, value: string, time: number) =>
  gameReducer(
    enter(gameReducer(state, ['hintMode', true], time), cell, value, time),
    ['hintMode', false],
    time
  );

const start = createGameState(settings, 0);
const open = start.game.givens.flatMap((isGiven, cell) => (isGiven ? [] : [cell]));
const wrongAt = (cell: number) =>
  start.game.alphabet.find(value => value !== start.game.solution[cell])!;

const played = gameReducer(
  gameReducer(
    enter(
      gameReducer(
        enter(
          note(note(note(start, open[0], '3', 1200.4), open[0], '7', 2500), open[0], '3', 3100),
          open[1],
          wrongAt(open[1]),
          4000.7
        ),
        ['undo', null],
        5000
      ),
      open[2],
      start.game.solution[open[2]],
      6100
    ),
    ['set', ''],
    7000
  ),
  ['undo', null],
  8000
);

const rounded = (saved: SavedGame): SavedGame => ({
  ...saved,
  elapsed: Math.round(saved.elapsed),
  moves: saved.moves.map(move => ({ ...move, elapsed: Math.round(move.elapsed) })),
  mistakes: saved.mistakes.map(mistake => ({ ...mistake, elapsed: Math.round(mistake.elapsed) }))
});

describe('game encoding', () => {
  it("brings back everything but the clock's fractions of a millisecond", () => {
    const saved = toSavedGame(played.game, 9876.5);

    expect(saved.mistakes.length).toBe(1);
    expect(saved.cursor).toBeLessThan(saved.moves.length);
    expect(decodeGame(encodeGame(saved))).toEqual(rounded(saved));
  });

  it('keeps finished games, unmarked games and other board sizes', () => {
    const small = createGameState(
      { ...settings, xDimension: 2, yDimension: 2, mistakeMode: 'unmarked', mistakeLimit: 3 },
      0
    );
    const solved = small.game.givens
      .flatMap((isGiven, cell) => (isGiven ? [] : [cell]))
      .reduce(
        (state, cell, i) =>
          gameReducer(
            gameReducer(state, ['select', { x: cell % 4, y: Math.floor(cell / 4) }], i),
            ['set', small.game.solution[cell]],
            1000 * (i + 1)
          ),
        small
      );
    const saved = toSavedGame(solved.game, 99999);

    expect(saved.finished).toBe(true);
    expect(decodeGame(encodeGame(saved))).toEqual(rounded(saved));
  });

  it('stays small for a whole game with notes', () => {
    const solved = open.reduce(
      (state, cell, i) =>
        enter(
          note(state, cell, wrongAt(cell), 1000 + i * 3000),
          cell,
          start.game.solution[cell],
          2500 + i * 3000
        ),
      start
    );

    expect(solved.game.moves.length).toBe(open.length * 2);
    expect(encodeGame(toSavedGame(solved.game, 999999)).length).toBeLessThan(1000);
  });

  it('rejects anything it did not write', () => {
    const encoded = encodeGame(toSavedGame(played.game, 9876));

    [
      '',
      'not base64!',
      'AAAA',
      encoded.slice(0, encoded.length / 2),
      'B' + encoded.slice(1),
      null,
      42,
      { moves: [] }
    ].forEach(value => expect(decodeGame(value)).toBeNull());
  });
});

describe('solveSudoku', () => {
  it('solves a puzzle and rejects one with contradicting givens', () => {
    const { puzzle, solution, alphabet } = start.game;
    const given = puzzle.findIndex(value => value !== '');
    const row = Math.floor(given / 9);
    const contradiction = puzzle.map((value, cell) =>
      cell !== given && Math.floor(cell / 9) === row && value === '' ? puzzle[given] : value
    );

    expect(solveSudoku(puzzle, alphabet, 3)).toEqual(solution);
    expect(solveSudoku(contradiction, alphabet, 3)).toBeNull();
  });
});
