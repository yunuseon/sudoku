import { Game, Move, seekTo } from './sudoku.logic';

export type Playback = { position: number; anchoredAt: number | null; speed: number };

export type Replay = { game: Game; playback: Playback };

export type ReplayCommand =
  | ['play', null]
  | ['pause', null]
  | ['toggle', null]
  | ['step', 1 | -1]
  | ['speed', number]
  | ['seek', number];

export type ReplayAction = ['startReplay', null] | ['exitReplay', null] | ['replay', ReplayCommand];

export const duration = (game: Game) => game.moves.at(-1)?.elapsed ?? 0;

export const isPlaying = (playback: Playback) => playback.anchoredAt !== null;

export const replayTime = ({ game, playback }: Replay, time: number) =>
  Math.min(
    duration(game),
    playback.anchoredAt === null
      ? playback.position
      : playback.position + (time - playback.anchoredAt) * playback.speed
  );

export const cursorAt = (moves: Move[], replayTime: number) => {
  const next = moves.findIndex(move => move.elapsed > replayTime);
  return next === -1 ? moves.length : next;
};

export const isAtEnd = (replay: Replay, time: number) =>
  replayTime(replay, time) >= duration(replay.game);

const isRunningAt = (replay: Replay, time: number) =>
  isPlaying(replay.playback) && !isAtEnd(replay, time);

export const isRunningAtCursor = (replay: Replay, cursor: number) =>
  isPlaying(replay.playback) && cursor < replay.game.moves.length;

export const createReplay = (game: Game, time: number): Replay => ({
  game: { ...game, moves: game.moves.slice(0, game.cursor) },
  playback: { position: 0, anchoredAt: time, speed: 1 }
});

const moveTo = (replay: Replay, position: number, time: number): Replay => ({
  ...replay,
  playback: { ...replay.playback, position, anchoredAt: isRunningAt(replay, time) ? time : null }
});

const timeOfCursor = (moves: Move[], cursor: number) =>
  cursor <= 0 ? 0 : moves[Math.min(cursor, moves.length) - 1].elapsed;

export const replayReducer = (replay: Replay, command: ReplayCommand, time: number): Replay => {
  const [type, value] = command;
  const current = replayTime(replay, time);
  const moves = replay.game.moves;

  switch (type) {
    case 'play':
      return {
        ...replay,
        playback: {
          ...replay.playback,
          position: isAtEnd(replay, time) ? 0 : current,
          anchoredAt: time
        }
      };
    case 'pause':
      return { ...replay, playback: { ...replay.playback, position: current, anchoredAt: null } };
    case 'toggle':
      return replayReducer(
        replay,
        isRunningAt(replay, time) ? ['pause', null] : ['play', null],
        time
      );
    case 'step':
      return moveTo(replay, timeOfCursor(moves, cursorAt(moves, current) + value), time);
    case 'seek':
      return moveTo(replay, timeOfCursor(moves, value), time);
    case 'speed':
      return {
        ...replay,
        playback: {
          position: current,
          anchoredAt: isRunningAt(replay, time) ? time : null,
          speed: value
        }
      };
  }
};

export const replayFrame = ({ game }: Replay, cursor: number): Game => {
  const frame = seekTo(game, cursor);
  const reached = timeOfCursor(game.moves, cursor);

  return {
    ...frame,
    mistakes: cursor === 0 ? [] : game.mistakes.filter(mistake => mistake.elapsed <= reached),
    selectedPosition: cursor === 0 ? { x: 0, y: 0 } : frame.selectedPosition,
    hintMode: false,
    timer:
      cursor === game.moves.length
        ? game.timer
        : { startedAt: 0, pausedAt: null, pausedTotal: 0, stoppedAt: null }
  };
};
