import {
  createReplay,
  cursorAt,
  duration,
  isAtEnd,
  isPlaying,
  isRunningAtCursor,
  Replay,
  replayFrame,
  replayReducer,
  replayTime
} from './replay';
import { createGameState, gameReducer, GameSettings, GameState, isStopped } from './sudoku.logic';

const settings: GameSettings = {
  xDimension: 3,
  yDimension: 3,
  level: 'medium',
  seed: 1,
  mistakeMode: 'unmarked',
  mistakeLimit: null
};

const enter = (state: GameState, cell: number, value: string, time: number) =>
  gameReducer(
    gameReducer(state, ['select', { x: cell % 9, y: Math.floor(cell / 9) }], time),
    ['set', value],
    time
  );

const start = createGameState(settings, 0);
const [a, b, c] = start.game.givens.flatMap((isGiven, index) => (isGiven ? [] : [index]));
const played = enter(enter(enter(start, a, '1', 1000), b, '2', 3000), c, '3', 6000);

describe('replay', () => {
  const replay = createReplay(played.game, 100000);

  it('starts playing from the beginning at normal speed', () => {
    expect(isPlaying(replay.playback)).toBe(true);
    expect(replayTime(replay, 100000)).toBe(0);
    expect(duration(replay.game)).toBe(6000);
  });

  it('derives the replay time from the anchor and the speed, and stops at the end', () => {
    expect(replayTime(replay, 102500)).toBe(2500);
    expect(replayTime(replayReducer(replay, ['speed', 2], 100000), 101000)).toBe(2000);
    expect(replayTime(replay, 200000)).toBe(6000);
    expect(isAtEnd(replay, 200000)).toBe(true);
  });

  it('counts the moves reached at a replay time', () => {
    expect([0, 999, 1000, 2999, 3000, 6000].map(time => cursorAt(replay.game.moves, time))).toEqual(
      [0, 0, 1, 1, 2, 3]
    );
  });

  it('keeps the position when pausing and changing the speed', () => {
    const paused = replayReducer(replay, ['pause', null], 102000);
    expect(isPlaying(paused.playback)).toBe(false);
    expect(replayTime(paused, 109000)).toBe(2000);

    const fast = replayReducer(replayReducer(paused, ['play', null], 110000), ['speed', 4], 110500);
    expect(replayTime(fast, 110500)).toBe(2500);
    expect(replayTime(fast, 111000)).toBe(4500);
  });

  it('steps to the next and previous move', () => {
    const paused = replayReducer(replay, ['pause', null], 102000);
    const next = replayReducer(paused, ['step', 1], 102000);
    expect(replayTime(next, 102000)).toBe(3000);
    expect(replayTime(replayReducer(next, ['step', 1], 102000), 102000)).toBe(6000);
    expect(replayTime(replayReducer(next, ['step', -1], 102000), 102000)).toBe(1000);
    expect(replayTime(replayReducer(paused, ['step', -1], 102000), 102000)).toBe(0);
  });

  it('seeks to a move and starts over when played at the end', () => {
    const seeked = replayReducer(replay, ['seek', 2], 101000);
    expect(replayTime(seeked, 101000)).toBe(3000);
    expect(isPlaying(seeked.playback)).toBe(true);

    const restarted = replayReducer(replay, ['toggle', null], 200000);
    expect(replayTime(restarted, 200000)).toBe(0);
    expect(isPlaying(restarted.playback)).toBe(true);
  });

  it('counts as running only while moves are left', () => {
    expect(isRunningAtCursor(replay, 2)).toBe(true);
    expect(isRunningAtCursor(replay, 3)).toBe(false);
    expect(isRunningAtCursor(replayReducer(replay, ['pause', null], 101000), 1)).toBe(false);
  });

  it('stays paused when stepping, seeking or changing speed after reaching the end', () => {
    expect(isPlaying(replayReducer(replay, ['step', -1], 200000).playback)).toBe(false);
    expect(isPlaying(replayReducer(replay, ['seek', 1], 200000).playback)).toBe(false);
    expect(isPlaying(replayReducer(replay, ['speed', 2], 200000).playback)).toBe(false);
  });

  it('ignores moves that were undone before the replay started', () => {
    const undone = gameReducer(played, ['undo', null], 7000);
    expect(createReplay(undone.game, 0).game.moves.length).toBe(2);
  });

  it('counts only the mistakes made up to the replayed move', () => {
    const marked = createGameState({ ...settings, mistakeMode: 'marked' }, 0);
    const wrong = marked.game.alphabet.find(value => value !== marked.game.solution[a])!;
    const game = enter(enter(marked, a, wrong, 1000), b, marked.game.solution[b], 3000).game;
    const replayed = createReplay(game, 0);

    expect([0, 1, 2].map(cursor => replayFrame(replayed, cursor).mistakes.length)).toEqual([
      0, 1, 1
    ]);
  });

  it('shows the board at a cursor with a running timer until the last move', () => {
    const solvedLike: Replay = {
      ...replay,
      game: { ...replay.game, timer: { ...replay.game.timer, stoppedAt: 6000 } }
    };
    const middle = replayFrame(solvedLike, 2);

    expect(middle.boardValues[a]).toBe('1');
    expect(middle.boardValues[b]).toBe('2');
    expect(middle.boardValues[c]).toBe('');
    expect(isStopped(middle.timer)).toBe(false);
    expect(isStopped(replayFrame(solvedLike, 3).timer)).toBe(true);
  });
});
