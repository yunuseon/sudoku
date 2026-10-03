import { type Level, levels, rateDifficulty } from './difficulty';

export type Board = string[];

export type Position = { x: number; y: number };

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
};

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
};

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
};

export const ruleSetSudoku = [ruleRow, ruleColumn, ruleGrid];

export const checkRules =
  (ruleSet: BoardRule[]) => (board: Board, position: number, value: string) =>
    ruleSet.every(rule => rule(board, position, value));

export const createNumericAlphabet = (n: number, m: number) =>
  new Array(n * m).fill('').map((_, i) => String(i + 1));

const isRelatedPosition = (dimension: number, position: Position) => (x: number, y: number) =>
  x === position.x ||
  y === position.y ||
  (Math.floor(x / dimension) === Math.floor(position.x / dimension) &&
    Math.floor(y / dimension) === Math.floor(position.y / dimension));

export const getHighlightedCells = (dimension: number, selectedPosition: Position) => {
  const n = dimension * dimension;
  const isRelated = isRelatedPosition(dimension, selectedPosition);

  return new Array(n * n).fill(false).map((_, i) => isRelated(i % n, Math.floor(i / n)));
};

export const getRemainingCounts = (board: Board, alphabet: string[]) =>
  alphabet.map(symbol =>
    Math.max(0, alphabet.length - board.filter(value => value === symbol).length)
  );

export const getVisibleHints = (game: Game): Board => {
  const xDimension = game.settings.xDimension;
  const n = xDimension * xDimension;

  const isRuledOut = (cell: number, symbol: number) => {
    const peers = getHighlightedCells(xDimension, { x: cell % n, y: Math.floor(cell / n) });
    return peers.some(
      (isPeer, other) => isPeer && game.boardValues[other] === game.alphabet[symbol]
    );
  };

  const hidden = new Set(
    game.boardValues.flatMap((_, cell) =>
      game.alphabet.flatMap((_, symbol) => {
        const index = hintIndex(xDimension, cell, symbol);
        return game.boardHints[index] !== '' && isRuledOut(cell, symbol) ? [index] : [];
      })
    )
  );

  return game.boardHints.map((hint, index) => (hidden.has(index) ? '' : hint));
};

export const getMatchingCells = (board: Board, selectedPosition: Position) => {
  const n = Math.sqrt(board.length);
  const selectedValue = board[selectedPosition.y * n + selectedPosition.x];

  return board.map(value => value !== '' && value === selectedValue);
};

type Random<T> = (seed: number) => [T, number];

const random: Random<number> = seed => {
  const nextSeed = (seed + 0x6d2b79f5) | 0;
  const a = Math.imul(nextSeed ^ (nextSeed >>> 15), 1 | nextSeed);
  const b = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;

  return [((b ^ (b >>> 14)) >>> 0) / 4294967296, nextSeed];
};

const swap = <T>(items: T[], a: number, b: number): T[] =>
  items.map((item, k) => {
    if (k === a) {
      return items[b];
    }

    return k === b ? items[a] : item;
  });

const shuffle =
  <T>(items: T[]): Random<T[]> =>
  seed =>
    items.reduceRight<[T[], number]>(
      ([shuffled, currentSeed], _, i) => {
        const [r, nextSeed] = random(currentSeed);
        const j = Math.floor(r * (i + 1));

        return [swap(shuffled, i, j), nextSeed];
      },
      [items, seed]
    );

const setValue = <T>(items: T[], position: number, value: T): T[] =>
  items.map((current, i) => (i === position ? value : current));

const range = (length: number) => new Array(length).fill(0).map((_, i) => i);

const shuffleLines =
  (dimension: number): Random<number[]> =>
  seed => {
    const [bands, bandSeed] = shuffle(range(dimension))(seed);

    return bands.reduce<[number[], number]>(
      ([lines, currentSeed], band) => {
        const [linesInBand, nextSeed] = shuffle(range(dimension))(currentSeed);
        return [[...lines, ...linesInBand.map(line => band * dimension + line)], nextSeed];
      },
      [[], bandSeed]
    );
  };

const patternIndex = (dimension: number) => (row: number, column: number) =>
  (dimension * (row % dimension) + Math.floor(row / dimension) + column) % (dimension * dimension);

const createSolution =
  (dimension: number, alphabet: string[]): Random<Board> =>
  seed => {
    const n = dimension * dimension;
    const [rows, rowSeed] = shuffleLines(dimension)(seed);
    const [columns, columnSeed] = shuffleLines(dimension)(rowSeed);
    const [symbols, nextSeed] = shuffle(alphabet)(columnSeed);

    const board = range(n * n).map(
      i => symbols[patternIndex(dimension)(rows[Math.floor(i / n)], columns[i % n])]
    );
    return [board, nextSeed];
  };

type Grid = {
  cells: number[];
  rows: number[];
  columns: number[];
  boxes: number[];
  dimension: number;
};

const boxOf = (dimension: number, cell: number) => {
  const n = dimension * dimension;
  return (
    Math.floor(Math.floor(cell / n) / dimension) * dimension + Math.floor((cell % n) / dimension)
  );
};

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
};

const toGrid = (board: Board, alphabet: string[], dimension: number): Grid => {
  const used = new Array(alphabet.length).fill(0);
  const empty: Grid = {
    cells: board.map(() => -1),
    rows: used,
    columns: used,
    boxes: used,
    dimension
  };

  return board.reduce(
    (grid, value, cell) => (value === '' ? grid : place(grid, cell, alphabet.indexOf(value))),
    empty
  );
};

const candidatesOf = (grid: Grid, cell: number) => {
  const n = grid.dimension * grid.dimension;
  const used =
    grid.rows[Math.floor(cell / n)] |
    grid.columns[cell % n] |
    grid.boxes[boxOf(grid.dimension, cell)];

  return range(n).filter(symbol => (used & (1 << symbol)) === 0);
};

const getMostConstrainedCell = (grid: Grid) =>
  grid.cells.reduce<{ cell: number; candidates: number[] } | null>((best, symbol, cell) => {
    if (symbol !== -1 || best?.candidates.length === 0) {
      return best;
    }

    const candidates = candidatesOf(grid, cell);
    return best === null || candidates.length < best.candidates.length
      ? { cell, candidates }
      : best;
  }, null);

type Search = { count: number; steps: number };

const countSolutions = (grid: Grid, limit: number, maxSteps: number): Search => {
  if (maxSteps <= 0) {
    return { count: Infinity, steps: 0 };
  }

  const next = getMostConstrainedCell(grid);

  if (next === null) {
    return { count: 1, steps: 1 };
  }

  return next.candidates.reduce<Search>(
    (search, symbol) => {
      if (search.count >= limit) {
        return search;
      }

      const branch = countSolutions(
        place(grid, next.cell, symbol),
        limit - search.count,
        maxSteps - search.steps
      );
      return { count: search.count + branch.count, steps: search.steps + branch.steps };
    },
    { count: 0, steps: 1 }
  );
};

const findSolution = (grid: Grid): Grid | null => {
  const next = getMostConstrainedCell(grid);

  return next === null
    ? grid
    : next.candidates.reduce<Grid | null>(
        (found, symbol) => found ?? findSolution(place(grid, next.cell, symbol)),
        null
      );
};

export const solveSudoku = (puzzle: Board, alphabet: string[], dimension: number): Board | null => {
  const solved = findSolution(toGrid(puzzle, alphabet, dimension));
  const solution = solved?.cells.map(symbol => alphabet[symbol]) ?? null;

  return solution !== null &&
    isSolved(solution) &&
    puzzle.every((value, cell) => value === '' || value === solution[cell])
    ? solution
    : null;
};

const maxSearchSteps = 100;

const carvePuzzle =
  (solution: Board, alphabet: string[], dimension: number, givens: number): Random<Board> =>
  seed => {
    const [positions, nextSeed] = shuffle(solution.map((_, i) => i))(seed);

    const puzzle = positions.reduce((board, position) => {
      const remainingValues = board.filter(value => value !== '').length;
      if (remainingValues <= givens) {
        return board;
      }

      const candidate = setValue(board, position, '');
      return countSolutions(toGrid(candidate, alphabet, dimension), 2, maxSearchSteps).count === 1
        ? candidate
        : board;
    }, solution);

    return [puzzle, nextSeed];
  };

export const createSudoku = (config: {
  dimension: number;
  alphabet: string[];
  givensRatio: number;
  seed: number;
}) => {
  const n = config.dimension * config.dimension;

  if (config.alphabet.length !== n) {
    throw new Error(`Alphabet must have exactly ${n} characters`);
  }

  const [solution, nextSeed] = createSolution(config.dimension, config.alphabet)(config.seed);
  const [puzzle] = carvePuzzle(
    solution,
    config.alphabet,
    config.dimension,
    Math.round(config.givensRatio * n * n)
  )(nextSeed);

  return { solution, puzzle };
};

const levelGivensRatios: Record<Level, number> = { easy: 0.45, medium: 0.36, hard: 0, expert: 0 };
const maxLevelAttempts = (dimension: number) => (dimension <= 3 ? 100 : 1);

const levelDistance = (a: Level, b: Level) => Math.abs(levels.indexOf(a) - levels.indexOf(b));

export type Sudoku = { puzzle: Board; solution: Board; level: Level };

export const createSudokuForLevel = (config: {
  dimension: number;
  alphabet: string[];
  level: Level;
  seed: number;
}): Sudoku => {
  const attempt = (k: number): Sudoku => {
    const generated = createSudoku({
      dimension: config.dimension,
      alphabet: config.alphabet,
      givensRatio: levelGivensRatios[config.level],
      seed: config.seed + k
    });
    return {
      ...generated,
      level: rateDifficulty(generated.puzzle, config.alphabet, config.dimension)
    };
  };

  const search = (k: number, best: Sudoku): Sudoku => {
    if (best.level === config.level || k === maxLevelAttempts(config.dimension)) {
      return best;
    }

    const next = attempt(k);
    return search(
      k + 1,
      levelDistance(next.level, config.level) < levelDistance(best.level, config.level)
        ? next
        : best
    );
  };

  return search(1, attempt(0));
};

export const mistakeModes = ['marked', 'unmarked'] as const;

export type MistakeMode = (typeof mistakeModes)[number];

export type GameSettings = {
  xDimension: number;
  yDimension: number;
  level: Level;
  seed: number;
  mistakeMode: MistakeMode;
  mistakeLimit: number | null;
};

export type Timer = {
  startedAt: number;
  pausedAt: number | null;
  pausedTotal: number;
  stoppedAt: number | null;
};

export const isPaused = (timer: Timer) => timer.pausedAt !== null;

export const isStopped = (timer: Timer) => timer.stoppedAt !== null;

export const isRunning = (timer: Timer) => !isPaused(timer) && !isStopped(timer);

export const elapsed = (timer: Timer, time: number) =>
  (timer.stoppedAt ?? timer.pausedAt ?? time) - timer.startedAt - timer.pausedTotal;

const togglePause = (timer: Timer, time: number): Timer =>
  timer.pausedAt === null
    ? { ...timer, pausedAt: time }
    : { ...timer, pausedAt: null, pausedTotal: timer.pausedTotal + time - timer.pausedAt };

export type Move = {
  cell: number;
  kind: 'value' | 'hint';
  index: number;
  value: string;
  elapsed: number;
};

export type Mistake = {
  cell: number;
  value: string;
  elapsed: number;
};

export type Game = {
  settings: GameSettings;
  level: Level;
  puzzle: Board;
  solution: Board;
  moves: Move[];
  mistakes: Mistake[];
  cursor: number;
  boardValues: Board;
  givens: boolean[];
  boardHints: Board;
  selectedPosition: Position;
  hintMode: boolean;
  alphabet: string[];
  timer: Timer;
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
export type TogglePauseAction = ['togglePause', null];
export type PauseAction = ['pause', null];
export type UndoAction = ['undo', null];
export type RedoAction = ['redo', null];
export type SeekAction = ['seek', number];

export type GameAction =
  | SetAction
  | MoveAction
  | SelectAction
  | HintModeAction
  | TogglePauseAction
  | PauseAction
  | UndoAction
  | RedoAction
  | SeekAction;

export const startGame = (
  settings: GameSettings,
  { puzzle, solution, level }: Sudoku,
  time: number
): Game => {
  const alphabet = createNumericAlphabet(settings.xDimension, settings.yDimension);

  return {
    settings,
    level,
    puzzle,
    solution,
    moves: [],
    mistakes: [],
    cursor: 0,
    boardValues: puzzle,
    givens: puzzle.map(value => value !== ''),
    boardHints: new Array(
      settings.xDimension *
        settings.xDimension *
        settings.xDimension *
        settings.yDimension *
        settings.yDimension *
        settings.yDimension
    ).fill(''),
    selectedPosition: {
      x: 0,
      y: 0
    },
    hintMode: false,
    alphabet,
    timer: { startedAt: time, pausedAt: null, pausedTotal: 0, stoppedAt: null }
  };
};

export const generateSudoku = (settings: GameSettings): Sudoku =>
  createSudokuForLevel({
    dimension: settings.xDimension,
    alphabet: createNumericAlphabet(settings.xDimension, settings.yDimension),
    level: settings.level,
    seed: settings.seed
  });

export const createGame = (settings: GameSettings, time: number): Game =>
  startGame(settings, generateSudoku(settings), time);

const maxDimension = 5;

export const isPlayable = (settings: GameSettings) =>
  Number.isInteger(settings.xDimension) &&
  settings.xDimension >= 1 &&
  settings.xDimension <= maxDimension &&
  settings.xDimension === settings.yDimension;

export const createGameState = (settings: GameSettings, time: number): GameState => ({
  settings,
  game: createGame(settings, time)
});

const moveFor = (game: Game, value: string, elapsedTime: number): Move | null => {
  const xDimension = game.settings.xDimension;
  const cell = game.selectedPosition.y * (xDimension * xDimension) + game.selectedPosition.x;
  const selectedValue = game.boardValues[cell];

  if (game.givens[cell]) {
    return null;
  }

  if (game.hintMode) {
    if (selectedValue !== '') {
      return null;
    }

    const symbol = game.alphabet.findIndex(character => character === value);
    if (symbol === -1) {
      return null;
    }

    const index = hintIndex(xDimension, cell, symbol);

    return {
      cell,
      kind: 'hint',
      index,
      value: game.boardHints[index] === value ? '' : value,
      elapsed: elapsedTime
    };
  }

  const newValue = selectedValue === value ? '' : value;
  return newValue === selectedValue
    ? null
    : { cell, kind: 'value', index: cell, value: newValue, elapsed: elapsedTime };
};

const applyMove = (game: Game, move: Move): Game =>
  move.kind === 'value'
    ? { ...game, boardValues: setValue(game.boardValues, move.index, move.value) }
    : { ...game, boardHints: setValue(game.boardHints, move.index, move.value) };

const positionOf = (cell: number, xDimension: number): Position => ({
  x: cell % (xDimension * xDimension),
  y: Math.floor(cell / (xDimension * xDimension))
});

export const hintIndex = (xDimension: number, cell: number, symbol: number) => {
  const n = xDimension * xDimension;
  const { x, y } = positionOf(cell, xDimension);

  return (
    y * n * n +
    x * xDimension +
    Math.floor(symbol / xDimension) * n * xDimension +
    (symbol % xDimension)
  );
};

export const seekTo = (game: Game, cursor: number): Game => {
  const replayed = game.moves.slice(0, cursor).reduce(applyMove, {
    ...game,
    cursor,
    boardValues: game.puzzle,
    boardHints: game.boardHints.map(() => '')
  });

  return cursor === 0
    ? replayed
    : {
        ...replayed,
        selectedPosition: positionOf(game.moves[cursor - 1].cell, game.settings.xDimension)
      };
};

const clamp = (min: number, max: number) => (value: number) => Math.min(max, Math.max(min, value));

const moveSelection = (
  position: Position,
  direction: MoveDirection,
  xDimension: number
): Position => {
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
};

export const isSolved = (board: Board) =>
  board.every(
    (value, position) => value !== '' && checkRules(ruleSetSudoku)(board, position, value)
  );

const pausedActions: GameAction[0][] = ['set', 'move', 'select', 'undo', 'redo', 'seek'];
const solvedActions: GameAction[0][] = ['set', 'togglePause', 'pause', 'undo', 'redo', 'seek'];

export const isLost = (game: Game) =>
  game.settings.mistakeMode === 'marked' &&
  game.settings.mistakeLimit !== null &&
  game.mistakes.length >= game.settings.mistakeLimit;

export const getWrongCells = (game: Game) =>
  game.boardValues.map(
    (value, cell) =>
      game.settings.mistakeMode === 'marked' &&
      value !== '' &&
      !game.givens[cell] &&
      value !== game.solution[cell]
  );

const isMistake = (game: Game, move: Move) =>
  game.settings.mistakeMode === 'marked' &&
  move.kind === 'value' &&
  move.value !== '' &&
  move.value !== game.solution[move.cell];

const stopWhenFinished = (game: Game, time: number): Game =>
  isSolved(game.boardValues) || isLost(game)
    ? { ...game, timer: { ...game.timer, stoppedAt: time } }
    : game;

export const gameReducer = (state: GameState, action: GameAction, time: number): GameState => {
  const [type, value] = action;

  if (
    (isPaused(state.game.timer) && pausedActions.includes(type)) ||
    (isStopped(state.game.timer) && solvedActions.includes(type))
  ) {
    return state;
  }

  switch (type) {
    case 'set': {
      const game = state.game;
      const move = moveFor(game, value, elapsed(game.timer, time));

      if (move === null) {
        return state;
      }

      const recorded = {
        ...game,
        moves: [...game.moves.slice(0, game.cursor), move],
        cursor: game.cursor + 1,
        mistakes: isMistake(game, move)
          ? [...game.mistakes, { cell: move.cell, value: move.value, elapsed: move.elapsed }]
          : game.mistakes
      };
      return { ...state, game: stopWhenFinished(applyMove(recorded, move), time) };
    }
    case 'undo':
      return state.game.cursor === 0
        ? state
        : { ...state, game: seekTo(state.game, state.game.cursor - 1) };
    case 'redo':
      return state.game.cursor === state.game.moves.length
        ? state
        : { ...state, game: stopWhenFinished(seekTo(state.game, state.game.cursor + 1), time) };
    case 'seek': {
      const cursor = Math.max(0, Math.min(state.game.moves.length, value));
      return cursor === state.game.cursor
        ? state
        : { ...state, game: stopWhenFinished(seekTo(state.game, cursor), time) };
    }
    case 'move':
      return {
        ...state,
        game: {
          ...state.game,
          selectedPosition: moveSelection(
            state.game.selectedPosition,
            value,
            state.game.settings.xDimension
          )
        }
      };
    case 'select':
      return { ...state, game: { ...state.game, selectedPosition: value } };
    case 'hintMode':
      return { ...state, game: { ...state.game, hintMode: value } };
    case 'togglePause':
      return { ...state, game: { ...state.game, timer: togglePause(state.game.timer, time) } };
    case 'pause':
      return isPaused(state.game.timer)
        ? state
        : { ...state, game: { ...state.game, timer: togglePause(state.game.timer, time) } };
  }
};
