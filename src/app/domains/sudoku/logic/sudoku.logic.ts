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

const setValue = (board: Board, position: number, value: string): Board => board.map((current, i) => i === position ? value : current);

const getCandidates = (board: Board, position: number, alphabet: string[]) => alphabet.filter(value => checkRules(ruleSetSudoku)(board, position, value));

const getMostConstrainedPosition = (board: Board, alphabet: string[]) => board
  .map((value, position) => ({ value, position }))
  .filter(({ value }) => value === '')
  .map(({ position }) => ({ position, candidates: getCandidates(board, position, alphabet) }))
  .reduce<{ position: number, candidates: string[] } | null>((best, current) => best === null || current.candidates.length < best.candidates.length ? current : best, null);

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

const countSolutions = (board: Board, alphabet: string[], limit: number): number => {
  const next = getMostConstrainedPosition(board, alphabet);

  if (next === null) {
    return 1;
  }

  return next.candidates.reduce((count, value) => count >= limit ? count : count + countSolutions(setValue(board, next.position, value), alphabet, limit - count), 0);
}

const hasUniqueSolution = (board: Board, alphabet: string[]) => countSolutions(board, alphabet, 2) === 1;

const carvePuzzle = (solution: Board, alphabet: string[], givens: number): Random<Board> => seed => {
  const [positions, nextSeed] = shuffle(solution.map((_, i) => i))(seed);

  const puzzle = positions.reduce((board, position) => {
    const remainingValues = board.filter(value => value !== '').length;
    if (remainingValues <= givens) {
      return board;
    }

    const candidate = setValue(board, position, '');
    return hasUniqueSolution(candidate, alphabet) ? candidate : board;
  }, solution);

  return [puzzle, nextSeed];
}

export const createSudoku = (config: { dimension: number, alphabet: string[], givens: number, seed: number }) => {
  const n = config.dimension * config.dimension;

  if (config.alphabet.length !== n) {
    throw new Error(`Alphabet must have exactly ${n} characters`);
  }

  const [solution, nextSeed] = createSolution(config.dimension, config.alphabet)(config.seed);
  const [puzzle] = carvePuzzle(solution, config.alphabet, config.givens)(nextSeed);

  return { solution, puzzle };
}

export type GameSettings = {
  xDimension: number;
  yDimension: number;
  givens: number;
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
    boardValues: createSudoku({ dimension: settings.xDimension, alphabet, givens: settings.givens, seed: settings.seed }).puzzle,
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

export const isPlayable = (settings: GameSettings) =>
  Number.isInteger(settings.xDimension) && settings.xDimension >= 1 && settings.xDimension === settings.yDimension;

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
