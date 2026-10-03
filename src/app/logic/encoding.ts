import type { Json } from '../core/storage/local-storage';
import { isString } from '../core/validation';
import { levels } from './difficulty';
import { SavedGame } from './persistence';
import {
  createNumericAlphabet,
  GameSettings,
  hintIndex,
  isPlayable,
  Mistake,
  Move,
  solveSudoku
} from './sudoku.logic';

const formatVersion = 1;

const base64url = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const range = (length: number) => Array.from({ length }, (_, i) => i);

const bitsFor = (values: number) => Math.max(1, Math.ceil(Math.log2(values)));

const field = (value: number, width: number) => {
  if (!Number.isInteger(value) || value < 0 || value >= 2 ** width) {
    throw new RangeError(`${value} does not fit ${width} bits`);
  }
  return value.toString(2).padStart(width, '0');
};

const varint = (value: number): string =>
  value < 128
    ? '0' + field(value, 7)
    : '1' + field(value % 128, 7) + varint(Math.floor(value / 128));

type Reader<T> = (bits: string, at: number) => [T, number];

const readField =
  (width: number): Reader<number> =>
  (bits, at) => {
    if (at + width > bits.length) {
      throw new RangeError('unexpected end');
    }
    return [parseInt(bits.slice(at, at + width), 2), at + width];
  };

const readVarint: Reader<number> = (bits, at) => {
  const [more, afterFlag] = readField(1)(bits, at);
  const [low, next] = readField(7)(bits, afterFlag);

  if (more === 0) {
    return [low, next];
  }

  const [high, end] = readVarint(bits, next);
  return [low + high * 128, end];
};

const readList =
  <T>(item: Reader<T>): Reader<T[]> =>
  (bits, at) => {
    const [count, start] = readVarint(bits, at);

    if (count > bits.length - start) {
      throw new RangeError('list longer than the data');
    }

    return range(count).reduce<[T[], number]>(
      ([items, position]) => {
        const [value, next] = item(bits, position);
        return [[...items, value], next];
      },
      [[], start]
    );
  };

const deltas = (times: number[]) => times.map((time, i) => time - (i === 0 ? 0 : times[i - 1]));

const sums = (differences: number[]) =>
  differences.reduce<number[]>(
    (times, difference) => [...times, (times.at(-1) ?? 0) + difference],
    []
  );

type Layout = {
  cells: number;
  symbols: number;
  cellBits: number;
  symbolBits: number;
  valueBits: number;
};

const layoutOf = (settings: Pick<GameSettings, 'xDimension' | 'yDimension'>): Layout => {
  const symbols = settings.xDimension * settings.yDimension;
  const cells = symbols * symbols;

  return {
    cells,
    symbols,
    cellBits: bitsFor(cells),
    symbolBits: bitsFor(symbols),
    valueBits: bitsFor(symbols + 1)
  };
};

export const encodeGame = (saved: SavedGame): string => {
  const { settings } = saved;
  const layout = layoutOf(settings);
  const alphabet = createNumericAlphabet(settings.xDimension, settings.yDimension);
  const valueOf = (value: string) => (value === '' ? 0 : alphabet.indexOf(value) + 1);
  const moveTimes = deltas(saved.moves.map(move => Math.round(move.elapsed)));
  const mistakeTimes = deltas(saved.mistakes.map(mistake => Math.round(mistake.elapsed)));

  const noteSymbol = (move: Move) =>
    range(layout.symbols).findIndex(
      symbol => hintIndex(settings.xDimension, move.cell, symbol) === move.index
    );

  const kindBits = (move: Move) =>
    move.kind === 'value'
      ? '0' + field(valueOf(move.value), layout.valueBits)
      : '1' + field(noteSymbol(move), layout.symbolBits) + (move.value === '' ? '0' : '1');

  const moveBits = (move: Move, i: number) =>
    field(move.cell, layout.cellBits) + kindBits(move) + varint(moveTimes[i]);

  const bits = [
    field(formatVersion, 8),
    field(settings.xDimension, 4),
    field(settings.yDimension, 4),
    field(levels.indexOf(settings.level), 2),
    field(levels.indexOf(saved.level), 2),
    settings.mistakeMode === 'marked' ? '1' : '0',
    saved.finished ? '1' : '0',
    varint(settings.mistakeLimit === null ? 0 : settings.mistakeLimit + 1),
    varint(settings.seed),
    varint(Math.round(saved.elapsed)),
    ...saved.puzzle.map(value => field(valueOf(value), layout.valueBits)),
    varint(saved.moves.length),
    ...saved.moves.map(moveBits),
    varint(saved.cursor),
    varint(saved.mistakes.length),
    ...saved.mistakes.map(
      (mistake, i) =>
        field(mistake.cell, layout.cellBits) +
        field(valueOf(mistake.value), layout.valueBits) +
        varint(mistakeTimes[i])
    )
  ].join('');

  return range(Math.ceil(bits.length / 6))
    .map(i => base64url[parseInt(bits.slice(i * 6, i * 6 + 6).padEnd(6, '0'), 2)])
    .join('');
};

const decodeBits = (bits: string): SavedGame | null => {
  const [version, a] = readField(8)(bits, 0);
  if (version !== formatVersion) {
    return null;
  }

  const [xDimension, b] = readField(4)(bits, a);
  const [yDimension, c] = readField(4)(bits, b);
  const [requestedLevel, d] = readField(2)(bits, c);
  const [ratedLevel, e] = readField(2)(bits, d);
  const [marked, f] = readField(1)(bits, e);
  const [finished, g] = readField(1)(bits, f);
  const [limit, h] = readVarint(bits, g);
  const [seed, i] = readVarint(bits, h);
  const [elapsed, j] = readVarint(bits, i);

  const settings: GameSettings = {
    xDimension,
    yDimension,
    level: levels[requestedLevel],
    seed,
    mistakeMode: marked === 1 ? 'marked' : 'unmarked',
    mistakeLimit: limit === 0 ? null : limit - 1
  };

  if (!isPlayable(settings)) {
    return null;
  }

  const layout = layoutOf(settings);
  const alphabet = createNumericAlphabet(xDimension, yDimension);
  const readValue: Reader<string> = (source, at) => {
    const [value, next] = readField(layout.valueBits)(source, at);
    if (value > layout.symbols) {
      throw new RangeError('unknown symbol');
    }
    return [value === 0 ? '' : alphabet[value - 1], next];
  };
  const readCell: Reader<number> = (source, at) => {
    const [cell, next] = readField(layout.cellBits)(source, at);
    if (cell >= layout.cells) {
      throw new RangeError('cell outside the board');
    }
    return [cell, next];
  };

  const [puzzle, k] = range(layout.cells).reduce<[string[], number]>(
    ([cells, position]) => {
      const [value, next] = readValue(bits, position);
      return [[...cells, value], next];
    },
    [[], j]
  );

  const readMove: Reader<Omit<Move, 'elapsed'> & { delta: number }> = (source, at) => {
    const [cell, afterCell] = readCell(source, at);
    const [kind, afterKind] = readField(1)(source, afterCell);

    if (kind === 0) {
      const [value, afterValue] = readValue(source, afterKind);
      const [delta, end] = readVarint(source, afterValue);
      return [{ cell, kind: 'value', index: cell, value, delta }, end];
    }

    const [symbol, afterSymbol] = readField(layout.symbolBits)(source, afterKind);
    const [on, afterOn] = readField(1)(source, afterSymbol);
    const [delta, end] = readVarint(source, afterOn);
    if (symbol >= layout.symbols) {
      throw new RangeError('unknown note');
    }
    return [
      {
        cell,
        kind: 'hint',
        index: hintIndex(xDimension, cell, symbol),
        value: on === 1 ? alphabet[symbol] : '',
        delta
      },
      end
    ];
  };

  const readMistake: Reader<Omit<Mistake, 'elapsed'> & { delta: number }> = (source, at) => {
    const [cell, afterCell] = readCell(source, at);
    const [value, afterValue] = readValue(source, afterCell);
    const [delta, end] = readVarint(source, afterValue);
    return [{ cell, value, delta }, end];
  };

  const [readMoves, l] = readList(readMove)(bits, k);
  const [cursor, m] = readVarint(bits, l);
  const [readMistakes] = readList(readMistake)(bits, m);

  const moveTimes = sums(readMoves.map(move => move.delta));
  const mistakeTimes = sums(readMistakes.map(mistake => mistake.delta));
  const solution = solveSudoku(puzzle, alphabet, xDimension);

  return solution === null || cursor > readMoves.length
    ? null
    : {
        settings,
        level: levels[ratedLevel],
        puzzle,
        solution,
        moves: readMoves.map(({ delta, ...move }, n) => ({ ...move, elapsed: moveTimes[n] })),
        cursor,
        mistakes: readMistakes.map(({ delta, ...mistake }, n) => ({
          ...mistake,
          elapsed: mistakeTimes[n]
        })),
        elapsed,
        finished: finished === 1
      };
};

export const decodeGame = (encoded: Json): SavedGame | null => {
  if (!isString(encoded) || encoded.length === 0) {
    return null;
  }

  const sextets = [...encoded].map(character => base64url.indexOf(character));

  if (sextets.includes(-1)) {
    return null;
  }

  try {
    return decodeBits(sextets.map(sextet => sextet.toString(2).padStart(6, '0')).join(''));
  } catch {
    return null;
  }
};
