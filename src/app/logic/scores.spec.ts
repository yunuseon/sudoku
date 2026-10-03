import {
  addScore,
  isScore,
  isWon,
  parseScores,
  rankScores,
  Score,
  ScoreEntry,
  toScore
} from './scores';
import { createGameState, gameReducer, GameSettings, GameState } from './sudoku.logic';

const settings: GameSettings = {
  xDimension: 3,
  yDimension: 3,
  level: 'easy',
  seed: 3,
  mistakeMode: 'marked',
  mistakeLimit: 1
};

const enter = (state: GameState, cell: number, value: string, time: number) =>
  gameReducer(
    gameReducer(state, ['select', { x: cell % 9, y: Math.floor(cell / 9) }], time),
    ['set', value],
    time
  );

const start = createGameState(settings, 1000);
const open = start.game.givens.flatMap((isGiven, cell) => (isGiven ? [] : [cell]));

const score = (id: string, elapsed: number, finishedAt: number): Score => ({
  id,
  level: 'easy',
  elapsed,
  mistakes: 0,
  mistakeMode: 'marked',
  moves: 40,
  finishedAt
});

describe('scores', () => {
  it('counts a solved game as won, but not a lost or running one', () => {
    const solved = open.reduce<GameState>(
      (state, cell, i) => enter(state, cell, start.game.solution[cell], 2000 + i),
      start
    );
    const wrong = start.game.alphabet.find(value => value !== start.game.solution[open[0]])!;
    const lost = enter(start, open[0], wrong, 2000);

    expect(isWon(solved.game)).toBe(true);
    expect(isWon(lost.game)).toBe(false);
    expect(isWon(start.game)).toBe(false);
  });

  it('records time, mistakes, mode and moves of a solved game', () => {
    const solved = open.reduce<GameState>(
      (state, cell, i) => enter(state, cell, start.game.solution[cell], 2000 + i),
      start
    );

    expect(toScore(solved.game, 'a', 123)).toEqual({
      id: 'a',
      level: solved.game.level,
      elapsed: 1000 + open.length - 1,
      mistakes: 0,
      mistakeMode: 'marked',
      moves: open.length,
      finishedAt: 123
    });
  });

  it('ranks by time and gives a tie to the earlier game', () => {
    expect(
      rankScores([score('slow', 9000, 1), score('later', 5000, 3), score('earlier', 5000, 2)]).map(
        s => s.id
      )
    ).toEqual(['earlier', 'later', 'slow']);
  });

  it('accepts only complete scores', () => {
    expect(isScore(score('a', 1, 2))).toBe(true);
    expect(isScore({ ...score('a', 1, 2), level: 'insane' })).toBe(false);
    expect(isScore({ id: 'a' })).toBe(false);
  });
});

describe('score lists', () => {
  const entry = (id: string, elapsed: number, level: Score['level'] = 'easy'): ScoreEntry => ({
    ...score(id, elapsed, elapsed),
    level,
    replay: id
  });

  it('ranks a new entry within its level and keeps only the best', () => {
    const two = addScore(addScore([], entry('b', 5000), 2).entries, entry('a', 3000), 2);
    expect(two.rank).toBe(1);

    const third = addScore(two.entries, entry('c', 4000), 2);
    expect(third.rank).toBe(2);
    expect(third.entries.map(e => e.id).sort()).toEqual(['a', 'c']);

    const tooSlow = addScore(third.entries, entry('d', 9000), 2);
    expect(tooSlow.rank).toBeNull();
    expect(tooSlow.entries).toEqual(third.entries);
  });

  it('keeps the levels apart', () => {
    const full = [entry('a', 1000), entry('b', 2000)];
    const hard = addScore(full, entry('h', 9000, 'hard'), 2);

    expect(hard.rank).toBe(1);
    expect(hard.entries.length).toBe(3);
  });

  it('reads only complete entries back', () => {
    expect(parseScores([entry('a', 1), score('b', 1, 1), 'x'])).toEqual([entry('a', 1)]);
    expect(parseScores(null)).toEqual([]);
  });
});
