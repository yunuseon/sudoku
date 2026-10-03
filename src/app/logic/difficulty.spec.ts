import { levels, rateDifficulty } from './difficulty';
import { createNumericAlphabet, createSudokuForLevel, isSolved } from './sudoku.logic';

const alphabet = createNumericAlphabet(3, 3);

describe('rateDifficulty', () => {
  it('rates a board with a single empty cell as easy', () => {
    const { solution } = createSudokuForLevel({ dimension: 3, alphabet, level: 'easy', seed: 1 });

    expect(
      rateDifficulty(
        solution.map((value, i) => (i === 40 ? '' : value)),
        alphabet,
        3
      )
    ).toBe('easy');
  });
});

describe('createSudokuForLevel', () => {
  it.each(levels)('generates a valid %s puzzle', level => {
    const {
      puzzle,
      solution,
      level: rated
    } = createSudokuForLevel({ dimension: 3, alphabet, level, seed: 1 });

    expect(rated).toBe(level);
    expect(rateDifficulty(puzzle, alphabet, 3)).toBe(level);
    expect(isSolved(solution)).toBe(true);
    expect(puzzle.every((value, cell) => value === '' || value === solution[cell])).toBe(true);
  });

  it('is deterministic for a seed', () => {
    const a = createSudokuForLevel({ dimension: 3, alphabet, level: 'hard', seed: 42 });
    const b = createSudokuForLevel({ dimension: 3, alphabet, level: 'hard', seed: 42 });

    expect(a.puzzle).toEqual(b.puzzle);
  });
});
