import { levels } from './difficulty';
import { isOneOf, isShape } from '../core/validation';
import type { Json } from '../core/storage/local-storage';
import {
  Board,
  elapsed,
  Game,
  GameSettings,
  isStopped,
  Mistake,
  mistakeModes,
  Move,
  seekTo,
  startGame
} from './sudoku.logic';

export type NewGameOptions = Pick<GameSettings, 'level' | 'mistakeMode' | 'mistakeLimit'>;

export type SavedGame = {
  settings: GameSettings;
  level: Game['level'];
  puzzle: Board;
  solution: Board;
  moves: Move[];
  cursor: number;
  mistakes: Mistake[];
  elapsed: number;
  finished: boolean;
};

export const toSavedGame = (game: Game, time: number): SavedGame => ({
  settings: game.settings,
  level: game.level,
  puzzle: game.puzzle,
  solution: game.solution,
  moves: game.moves,
  cursor: game.cursor,
  mistakes: game.mistakes,
  elapsed: elapsed(game.timer, time),
  finished: isStopped(game.timer)
});

export const restoreGame = (saved: SavedGame, time: number): Game =>
  seekTo(
    {
      ...startGame(saved.settings, saved, time),
      moves: saved.moves,
      mistakes: saved.mistakes,
      timer: saved.finished
        ? { startedAt: time - saved.elapsed, pausedAt: null, pausedTotal: 0, stoppedAt: time }
        : { startedAt: time - saved.elapsed, pausedAt: time, pausedTotal: 0, stoppedAt: null }
    },
    saved.cursor
  );

export const parseNewGameOptions = (
  value: Json,
  mistakeLimits: readonly (number | null)[]
): NewGameOptions | null => {
  const isNewGameOptions = isShape<NewGameOptions>({
    level: isOneOf(levels),
    mistakeMode: isOneOf(mistakeModes),
    mistakeLimit: isOneOf(mistakeLimits)
  });

  return isNewGameOptions(value)
    ? { level: value.level, mistakeMode: value.mistakeMode, mistakeLimit: value.mistakeLimit }
    : null;
};
