export type Board = string[];

export type Position = { x: number, y: number };

type BoardRule = (board: Board, position: number, value: string) => boolean;

const ruleRow: BoardRule = (board, position, value) => {
  const n = Math.sqrt(board.length);

  const { selectedX, selectedY } = { selectedX: position % n, selectedY: Math.floor(position / n) };

  for (let x = 0; x < n; x++) {
    if (selectedX === x) {
      continue;
    }

    if (board[selectedY * n + x] === value) {
      return false;
    }
  }

  return true;
}

const ruleColumn: BoardRule = (board, position, value) => {
  const n = Math.sqrt(board.length);

  const { selectedX, selectedY } = { selectedX: position % n, selectedY: Math.floor(position / n) };

  for (let y = 0; y < n; y++) {
    if (selectedY === y) {
      continue;
    }

    if (board[y * n + selectedX] === value) {
      return false;
    }
  }

  return true;
}

const ruleGrid: BoardRule = (board, position, value) => {
  const n = Math.sqrt(board.length);
  const r = Math.sqrt(n);
  const { selectedX, selectedY } = { selectedX: position % n, selectedY: Math.floor(position / n) };

  const mainGridX = Math.floor(selectedX / r);
  const mainGridY = Math.floor(selectedY / r);

  for (let y = 0; y < r; y++) {
    for (let x = 0; x < r; x++) {
      const valueX = mainGridX * r + x;
      const valueY = mainGridY * r + y;

      if (selectedX === valueX && selectedY === valueY) {
        continue;
      }

      if (board[valueY * n + valueX] === value) {
        return false;
      }
    }
  }

  return true;
}

export const ruleSetSudoku = [
  ruleRow,
  ruleColumn,
  ruleGrid
];

export const checkRules = (ruleSet: BoardRule[]) => (board: Board, position: number, value: string) => ruleSet.every(rule => rule(board, position, value));

export const createNumericAlphabet = (n: number, m: number) => new Array(n * m).fill('').map((_, i) => String(i + 1));

const isRelatedPosition = (dimension: number, position: Position) => (x: number, y: number) =>
  x === position.x ||
  y === position.y ||
  (Math.floor(x / dimension) === Math.floor(position.x / dimension) && Math.floor(y / dimension) === Math.floor(position.y / dimension));

export const getHighlightedCells = (dimension: number, selectedPosition: Position) => {
  const n = dimension * dimension;
  const isRelated = isRelatedPosition(dimension, selectedPosition);

  return new Array(n * n).fill(false).map((_, i) => isRelated(i % n, Math.floor(i / n)));
}

export const getMatchingCells = (board: Board, selectedPosition: Position) => {
  const n = Math.sqrt(board.length);
  const selectedValue = board[selectedPosition.y * n + selectedPosition.x];

  return board.map(value => value !== '' && value === selectedValue);
}

type Random<T> = (seed: number) => [T, number];

// mulberry32
const random: Random<number> = seed => {
  const nextSeed = (seed + 0x6D2B79F5) | 0;
  const a = Math.imul(nextSeed ^ (nextSeed >>> 15), 1 | nextSeed);
  const b = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;

  return [((b ^ (b >>> 14)) >>> 0) / 4294967296, nextSeed];
}

const shuffle = <T>(items: T[]): Random<T[]> => seed => items.reduceRight<[T[], number]>(([shuffled, currentSeed], _, i) => {
  const [r, nextSeed] = random(currentSeed);
  const j = Math.floor(r * (i + 1));

  return [shuffled.map((item, k) => k === i ? shuffled[j] : k === j ? shuffled[i] : item), nextSeed];
}, [items, seed]);

const setValue = <T>(items: T[], position: number, value: T): T[] => items.map((current, i) => i === position ? value : current);

const range = (length: number) => new Array(length).fill(0).map((_, i) => i);

const shuffleLines = (dimension: number): Random<number[]> => seed => {
  const [bands, bandSeed] = shuffle(range(dimension))(seed);

  return bands.reduce<[number[], number]>(([lines, currentSeed], band) => {
    const [linesInBand, nextSeed] = shuffle(range(dimension))(currentSeed);
    return [[...lines, ...linesInBand.map(line => band * dimension + line)], nextSeed];
  }, [[], bandSeed]);
}

// see https://en.wikipedia.org/wiki/Mathematics_of_Sudoku
const patternIndex = (dimension: number) => (row: number, column: number) =>
  (dimension * (row % dimension) + Math.floor(row / dimension) + column) % (dimension * dimension);

const createSolution = (dimension: number, alphabet: string[]): Random<Board> => seed => {
  const n = dimension * dimension;
  const [rows, rowSeed] = shuffleLines(dimension)(seed);
  const [columns, columnSeed] = shuffleLines(dimension)(rowSeed);
  const [symbols, nextSeed] = shuffle(alphabet)(columnSeed);

  const board = range(n * n).map(i => symbols[patternIndex(dimension)(rows[Math.floor(i / n)], columns[i % n])]);
  return [board, nextSeed];
}

// Symbols are indices into the alphabet, -1 is an empty cell. Each row, column and box keeps a bitmask of its used symbols.
type Grid = {
  cells: number[];
  rows: number[];
  columns: number[];
  boxes: number[];
  dimension: number;
};

const boxOf = (dimension: number, cell: number) => {
  const n = dimension * dimension;
  return Math.floor(Math.floor(cell / n) / dimension) * dimension + Math.floor((cell % n) / dimension);
}

const place = (grid: Grid, cell: number, symbol: number): Grid => {
  const n = grid.dimension * grid.dimension;
  const bit = 1 << symbol;
  const row = Math.floor(cell / n);
  const column = cell % n;
  const box = boxOf(grid.dimension, cell);

  return {
    ...grid,
    cells: setValue(grid.cells, cell, symbol),
    rows: setValue(grid.rows, row, grid.rows[row] | bit),
    columns: setValue(grid.columns, column, grid.columns[column] | bit),
    boxes: setValue(grid.boxes, box, grid.boxes[box] | bit)
  };
}

const toGrid = (board: Board, alphabet: string[], dimension: number): Grid => {
  const used = new Array(alphabet.length).fill(0);
  const empty: Grid = { cells: board.map(() => -1), rows: used, columns: used, boxes: used, dimension };

  return board.reduce((grid, value, cell) => value === '' ? grid : place(grid, cell, alphabet.indexOf(value)), empty);
}

const candidatesOf = (grid: Grid, cell: number) => {
  const n = grid.dimension * grid.dimension;
  const used = grid.rows[Math.floor(cell / n)] | grid.columns[cell % n] | grid.boxes[boxOf(grid.dimension, cell)];

  return range(n).filter(symbol => (used & (1 << symbol)) === 0);
}

const getMostConstrainedCell = (grid: Grid) => grid.cells.reduce<{ cell: number, candidates: number[] } | null>((best, symbol, cell) => {
  if (symbol !== -1 || best?.candidates.length === 0) {
    return best;
  }

  const candidates = candidatesOf(grid, cell);
  return best === null || candidates.length < best.candidates.length ? { cell, candidates } : best;
}, null);

type Search = { count: number, steps: number };

// A search that runs out of steps counts as having infinitely many solutions, so the value is kept
const countSolutions = (grid: Grid, limit: number, maxSteps: number): Search => {
  if (maxSteps <= 0) {
    return { count: Infinity, steps: 0 };
  }

  const next = getMostConstrainedCell(grid);

  if (next === null) {
    return { count: 1, steps: 1 };
  }

  return next.candidates.reduce<Search>((search, symbol) => {
    if (search.count >= limit) {
      return search;
    }

    const branch = countSolutions(place(grid, next.cell, symbol), limit - search.count, maxSteps - search.steps);
    return { count: search.count + branch.count, steps: search.steps + branch.steps };
  }, { count: 0, steps: 1 });
}

// Only a safety limit for a single uniqueness check, typical boards stay far below it
const maxSearchSteps = 100;

const carvePuzzle = (solution: Board, alphabet: string[], dimension: number, givens: number): Random<Board> => seed => {
  const [positions, nextSeed] = shuffle(solution.map((_, i) => i))(seed);

  const puzzle = positions.reduce((board, position) => {
    const remainingValues = board.filter(value => value !== '').length;
    if (remainingValues <= givens) {
      return board;
    }

    const candidate = setValue(board, position, '');
    return countSolutions(toGrid(candidate, alphabet, dimension), 2, maxSearchSteps).count === 1 ? candidate : board;
  }, solution);

  return [puzzle, nextSeed];
}

export const createSudoku = (config: { dimension: number, alphabet: string[], givensRatio: number, seed: number }) => {
  const n = config.dimension * config.dimension;

  if (config.alphabet.length !== n) {
    throw new Error(`Alphabet must have exactly ${n} characters`);
  }

  const [solution, nextSeed] = createSolution(config.dimension, config.alphabet)(config.seed);
  const [puzzle] = carvePuzzle(solution, config.alphabet, config.dimension, Math.round(config.givensRatio * n * n))(nextSeed);

  return { solution, puzzle };
}

export type GameSettings = {
  xDimension: number;
  yDimension: number;
  givensRatio: number;
  seed: number;
};

export type Game = {
  settings: GameSettings;
  boardValues: Board;
  boardHints: Board;
  selectedPosition: Position;
  hintMode: boolean;
  alphabet: string[];
};

export type GameState = {
  settings: GameSettings;
  game: Game;
};

export type SetAction = ['set', string];

export type MoveDirection = 'left' | 'right' | 'up' | 'down';
export type MoveAction = ['move', MoveDirection];

export type SelectAction = ['select', Position];
export type HintModeAction = ['hintMode', boolean];
export type ConfigureGameAction = ['configureGame', Partial<GameSettings>];

export type GameAction = SetAction | MoveAction | SelectAction | HintModeAction | ConfigureGameAction;

export const createGame = (settings: GameSettings): Game => {
  const alphabet = createNumericAlphabet(settings.xDimension, settings.yDimension);

  return {
    settings,
    boardValues: createSudoku({ dimension: settings.xDimension, alphabet, givensRatio: settings.givensRatio, seed: settings.seed }).puzzle,
    boardHints: new Array(
      settings.xDimension * settings.xDimension * settings.xDimension *
      settings.yDimension * settings.yDimension * settings.yDimension
    ).fill(''),
    selectedPosition: {
      x: 0,
      y: 0
    },
    hintMode: false,
    alphabet
  };
}

// the solver keeps used symbols as bitmasks, a 6x6 box would need 36 bits
const maxDimension = 5;

export const isPlayable = (settings: GameSettings) =>
  Number.isInteger(settings.xDimension) && settings.xDimension >= 1 && settings.xDimension <= maxDimension && settings.xDimension === settings.yDimension;

export const createGameState = (settings: GameSettings): GameState => ({
  settings,
  game: createGame(settings)
});

const setGameValue = (game: Game, xDimension: number, value: string): Game => {
  const selectedValuePosition = game.selectedPosition.y * (xDimension * xDimension) + game.selectedPosition.x;
  const selectedValue = game.boardValues[selectedValuePosition];

  if (game.hintMode) {

    // If the selected position has a value on it, do not add hints to it, because the player won't be able to see them
    if (selectedValue !== '') {
      return game;
    }

    const setCharacterIndex = game.alphabet.findIndex(character => character === value);
    if (setCharacterIndex === -1) {
      return game;
    }

    const selectedPosition = game.selectedPosition.y * (xDimension * xDimension * xDimension * xDimension) + (game.selectedPosition.x * xDimension) + Math.floor(setCharacterIndex / xDimension) * (xDimension * xDimension * xDimension) + setCharacterIndex % xDimension;

    const newValue = game.boardHints[selectedPosition] === value ? '' : value;
    return {
      ...game,
      boardHints: setValue(game.boardHints, selectedPosition, newValue)
    };
  }

  const newValue = selectedValue === value ? '' : value;
  return {
    ...game,
    boardValues: setValue(game.boardValues, selectedValuePosition, newValue)
  };
}

const clamp = (min: number, max: number) => (value: number) => Math.min(max, Math.max(min, value));

const moveSelection = (position: Position, direction: MoveDirection, xDimension: number): Position => {
  const clampToBoard = clamp(0, xDimension * xDimension - 1);

  switch (direction) {
    case 'left':
      return { ...position, x: clampToBoard(position.x - 1) };
    case 'right':
      return { ...position, x: clampToBoard(position.x + 1) };
    case 'up':
      return { ...position, y: clampToBoard(position.y - 1) };
    case 'down':
      return { ...position, y: clampToBoard(position.y + 1) };
  }
}

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  const [type, value] = action;

  switch (type) {
    case 'set':
      return { ...state, game: setGameValue(state.game, state.game.settings.xDimension, value) };
    case 'move':
      return { ...state, game: { ...state.game, selectedPosition: moveSelection(state.game.selectedPosition, value, state.game.settings.xDimension) } };
    case 'select':
      return { ...state, game: { ...state.game, selectedPosition: value } };
    case 'hintMode':
      return { ...state, game: { ...state.game, hintMode: value } };
    case 'configureGame': {
      const settings = { ...state.settings, ...value };
      return { settings, game: isPlayable(settings) ? createGame(settings) : state.game };
    }
  }
}
