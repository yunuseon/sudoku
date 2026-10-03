import { parseNewGameOptions, restoreGame, toSavedGame } from './persistence';
import {
  createGameState,
  elapsed,
  gameReducer,
  GameSettings,
  GameState,
  isPaused,
  isStopped
} from './sudoku.logic';

const settings: GameSettings = {
  xDimension: 3,
  yDimension: 3,
  level: 'easy',
  seed: 7,
  mistakeMode: 'marked',
  mistakeLimit: 3
};

const enter = (state: GameState, cell: number, value: string, time: number) =>
  gameReducer(
    gameReducer(state, ['select', { x: cell % 9, y: Math.floor(cell / 9) }], time),
    ['set', value],
    time
  );

const start = createGameState(settings, 1000);
const [a, b, c, d, e] = start.game.givens.flatMap((isGiven, cell) => (isGiven ? [] : [cell]));
const wrongAt = (cell: number) =>
  start.game.alphabet.find(value => value !== start.game.solution[cell])!;

const withNote = gameReducer(
  enter(gameReducer(start, ['hintMode', true], 1000), c, '4', 2000),
  ['hintMode', false],
  2000
);
const played = gameReducer(
  enter(enter(withNote, a, wrongAt(a), 3000), b, start.game.solution[b], 5000),
  ['undo', null],
  6000
);

describe('saved games', () => {
  it('restores board, notes, moves, mistakes and elapsed time, paused', () => {
    const saved = toSavedGame(played.game, 9000);
    const restored = restoreGame(saved, 500);

    expect(played.game.mistakes.length).toBe(1);
    expect(played.game.boardHints.some(hint => hint !== '')).toBe(true);
    expect(saved.elapsed).toBe(8000);
    expect(restored.boardValues).toEqual(played.game.boardValues);
    expect(restored.boardHints).toEqual(played.game.boardHints);
    expect(restored.moves).toEqual(played.game.moves);
    expect(restored.cursor).toBe(played.game.cursor);
    expect(restored.mistakes).toEqual(played.game.mistakes);
    expect(isPaused(restored.timer)).toBe(true);
    expect(elapsed(restored.timer, 99999)).toBe(8000);
  });

  it('keeps counting from the saved time once resumed', () => {
    const resumed = gameReducer(
      { settings, game: restoreGame(toSavedGame(played.game, 9000), 500) },
      ['togglePause', null],
      700
    );
    expect(elapsed(resumed.game.timer, 1700)).toBe(9000);
  });

  it('restores a finished game as stopped', () => {
    const finished = [d, e].reduce(
      (state, cell, i) => enter(state, cell, wrongAt(cell), 7000 + i * 1000),
      played
    );
    const restored = restoreGame(toSavedGame(finished.game, 20000), 0);

    expect(isStopped(finished.game.timer)).toBe(true);
    expect(isStopped(restored.timer)).toBe(true);
    expect(elapsed(restored.timer, 50000)).toBe(elapsed(finished.game.timer, 50000));
  });
});

describe('new game options', () => {
  const limits = [3, 5, null];

  it('accepts stored options with an offered limit', () => {
    expect(
      parseNewGameOptions({ level: 'hard', mistakeMode: 'unmarked', mistakeLimit: null }, limits)
    ).toEqual({ level: 'hard', mistakeMode: 'unmarked', mistakeLimit: null });
  });

  it('rejects unknown levels, modes and limits', () => {
    [
      { level: 'insane', mistakeMode: 'marked', mistakeLimit: 3 },
      { level: 'easy', mistakeMode: 'strict', mistakeLimit: 3 },
      { level: 'easy', mistakeMode: 'marked', mistakeLimit: 4 },
      null
    ].forEach(value => expect(parseNewGameOptions(value, limits)).toBeNull());
  });
});
