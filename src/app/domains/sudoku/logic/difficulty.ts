import type { Board } from './sudoku.logic';

export const levels = ['easy', 'medium', 'hard', 'expert'] as const;

export type Level = typeof levels[number];

// Symbols are indices into the alphabet, -1 is an empty cell. Candidates are bitmasks, 0 for filled cells.
type SolveState = { cells: number[]; candidates: number[] };

type Units = { all: number[][]; ofCell: number[][][]; boxLinePairs: [number[], number[]][] };

const range = (length: number) => Array.from({ length }, (_, i) => i);

const bitCount = (mask: number): number => mask === 0 ? 0 : (mask & 1) + bitCount(mask >>> 1);

const unitsFor = (dimension: number): Units => {
  const n = dimension * dimension;
  const rows = range(n).map(row => range(n).map(column => row * n + column));
  const columns = range(n).map(column => range(n).map(row => row * n + column));
  const boxes = range(n).map(box => range(n).map(i => {
    const row = Math.floor(box / dimension) * dimension + Math.floor(i / dimension);
    const column = (box % dimension) * dimension + i % dimension;
    return row * n + column;
  }));

  const all = [...rows, ...columns, ...boxes];
  const lines = [...rows, ...columns];
  const intersects = (a: number[], b: number[]) => a.some(cell => b.includes(cell));

  return {
    all,
    ofCell: range(n * n).map(cell => all.filter(unit => unit.includes(cell))),
    boxLinePairs: boxes.flatMap(box => lines.filter(line => intersects(box, line)).flatMap(line => [[box, line], [line, box]] as [number[], number[]][]))
  };
}

const place = (state: SolveState, units: Units, cell: number, symbol: number): SolveState => {
  const peers = new Set(units.ofCell[cell].flat());

  return {
    cells: state.cells.map((current, i) => i === cell ? symbol : current),
    candidates: state.candidates.map((mask, i) => i === cell ? 0 : peers.has(i) ? mask & ~(1 << symbol) : mask)
  };
}

const initialState = (puzzle: Board, alphabet: string[], units: Units): SolveState => {
  const empty: SolveState = { cells: puzzle.map(() => -1), candidates: puzzle.map(() => (1 << alphabet.length) - 1) };
  return puzzle.reduce((state, value, cell) => value === '' ? state : place(state, units, cell, alphabet.indexOf(value)), empty);
}

const nakedSingle = (state: SolveState, units: Units): SolveState | null => {
  const cell = state.candidates.findIndex(mask => bitCount(mask) === 1);
  return cell === -1 ? null : place(state, units, cell, Math.log2(state.candidates[cell]));
}

const hiddenSingle = (state: SolveState, units: Units): SolveState | null => {
  const symbols = range(Math.round(Math.sqrt(state.candidates.length)));

  for (const unit of units.all) {
    for (const symbol of symbols) {
      const cells = unit.filter(cell => state.candidates[cell] & (1 << symbol));
      if (cells.length === 1) {
        return place(state, units, cells[0], symbol);
      }
    }
  }

  return null;
}

// Pointing and claiming: if a symbol's candidates in one unit all lie in another unit, it can't be anywhere else in that other unit.
// Naked pairs: two cells of a unit with the same two candidates take those two symbols, the rest of the unit can't have them.
const eliminate = (state: SolveState, units: Units): SolveState | null => {
  const n = Math.round(Math.sqrt(state.candidates.length));

  const removals = [
    ...units.boxLinePairs.flatMap(([from, to]) => range(n).flatMap(symbol => {
      const cells = from.filter(cell => state.candidates[cell] & (1 << symbol));
      return cells.length > 0 && cells.every(cell => to.includes(cell))
        ? to.filter(cell => !from.includes(cell)).map(cell => [cell, 1 << symbol] as const)
        : [];
    })),
    ...units.all.flatMap(unit => {
      const pairs = unit.filter(cell => bitCount(state.candidates[cell]) === 2);
      return pairs.flatMap(cell => {
        const mask = state.candidates[cell];
        const twins = pairs.filter(other => state.candidates[other] === mask);
        return twins.length === 2 ? unit.filter(other => !twins.includes(other)).map(other => [other, mask] as const) : [];
      });
    })
  ];

  const candidates = removals.reduce((masks, [cell, mask]) => masks.map((current, i) => i === cell ? current & ~mask : current), state.candidates);
  return candidates.every((mask, i) => mask === state.candidates[i]) ? null : { ...state, candidates };
}

const techniques = [nakedSingle, hiddenSingle, eliminate];

const solveLevel = (state: SolveState, units: Units, hardest: number): number => {
  if (state.cells.every(cell => cell !== -1)) {
    return hardest;
  }

  const step = techniques.reduce<{ next: SolveState; index: number } | null>(
    (found, technique, index) => found ?? (next => next === null ? null : { next, index })(technique(state, units)),
    null
  );

  return step === null ? levels.length - 1 : solveLevel(step.next, units, Math.max(hardest, step.index));
}

// The hardest technique a human needs to solve the puzzle, always using the easiest technique that makes progress
export const rateDifficulty = (puzzle: Board, alphabet: string[], dimension: number): Level => {
  const units = unitsFor(dimension);
  return levels[solveLevel(initialState(puzzle, alphabet, units), units, 0)];
}
