import { type Level, levels } from './difficulty';
import { elapsed, Game, isLost, isStopped, MistakeMode, mistakeModes } from './sudoku.logic';
import { isNumber, isOneOf, isShape, isString } from '../core/validation';
import type { Json } from '../core/storage/local-storage';

export type Score = {
  id: string;
  level: Level;
  elapsed: number;
  mistakes: number;
  mistakeMode: MistakeMode;
  moves: number;
  finishedAt: number;
};

export const isWon = (game: Game) => isStopped(game.timer) && !isLost(game);

export const toScore = (game: Game, id: string, finishedAt: number): Score => ({
  id,
  level: game.level,
  elapsed: elapsed(game.timer, game.timer.stoppedAt ?? 0),
  mistakes: game.mistakes.length,
  mistakeMode: game.settings.mistakeMode,
  moves: game.cursor,
  finishedAt
});

export type NewScore = { score: Score; rank: number | null };

export type ScoreEntry = Score & { replay: string };

export const rankScores = <T extends Score>(scores: T[]) =>
  [...scores].sort((a, b) => a.elapsed - b.elapsed || a.finishedAt - b.finishedAt);

export const addScore = (entries: ScoreEntry[], entry: ScoreEntry, limit: number) => {
  const kept = rankScores([...entries.filter(other => other.level === entry.level), entry]).slice(
    0,
    limit
  );
  const index = kept.findIndex(other => other.id === entry.id);

  return {
    entries: [...entries.filter(other => other.level !== entry.level), ...kept],
    rank: index === -1 ? null : index + 1
  };
};

const scoreShape = {
  id: isString,
  level: isOneOf(levels),
  elapsed: isNumber,
  mistakes: isNumber,
  mistakeMode: isOneOf(mistakeModes),
  moves: isNumber,
  finishedAt: isNumber
};

export const isScore = isShape<Score>(scoreShape);

const isScoreEntry = isShape<ScoreEntry>({ ...scoreShape, replay: isString });

export const parseScores = (value: Json): ScoreEntry[] =>
  Array.isArray(value) ? value.filter(isScoreEntry) : [];
