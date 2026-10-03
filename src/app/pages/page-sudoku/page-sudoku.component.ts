import { Component, inject, DOCUMENT } from '@angular/core';
import { SudokuBoardComponent } from '../../components/sudoku-board/sudoku-board.component';
import { SudokuTimelineComponent } from '../../components/sudoku-timeline/sudoku-timeline.component';
import { type Level } from '../../logic/difficulty';
import {
  BoardSettings,
  boardSettings,
  createSampleState,
  isSameTheme,
  parseTheme,
  pickTheme
} from '../../theme/theme';
import { ThemeMenuComponent } from '../../components/theme-menu/theme-menu.component';
import { ScoresComponent } from '../../components/scores/scores.component';
import { PreferencesComponent } from '../../components/preferences/preferences.component';
import { defaultPreferences, parsePreferences, Preferences } from '../../settings/preferences';
import { GameBarComponent } from '../../components/game-bar/game-bar.component';
import { GameToolsComponent } from '../../components/game-tools/game-tools.component';
import { ReplayControlsComponent } from '../../components/replay-controls/replay-controls.component';
import { SheetComponent } from '../../components/sheet/sheet.component';
import { NewGameComponent } from '../../components/new-game/new-game.component';
import { AboutComponent } from '../../components/about/about.component';
import { LegalComponent } from '../../components/legal/legal.component';
import { ResizeDirective, Size } from '../../core/directives/resize.directive';
import { now } from '../../core/time/now';
import {
  catchError,
  combineLatest,
  defer,
  distinctUntilChanged,
  EMPTY,
  expand,
  filter,
  fromEvent,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  scan,
  share,
  shareReplay,
  skip,
  startWith,
  Subject,
  switchMap,
  take,
  timer,
  withLatestFrom
} from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  createGameState,
  elapsed,
  GameAction,
  gameReducer,
  GameSettings,
  GameState,
  generateSudoku,
  getHighlightedCells,
  getMatchingCells,
  getRemainingCounts,
  getWrongCells,
  isLost,
  isRunning,
  MoveAction,
  RedoAction,
  SetAction,
  startGame,
  Sudoku,
  Timer,
  TogglePauseAction,
  UndoAction
} from '../../logic/sudoku.logic';
import {
  createReplay,
  cursorAt,
  duration,
  isPlaying,
  Replay,
  ReplayAction,
  replayFrame,
  replayReducer,
  replayTime
} from '../../logic/replay';
import {
  NewGameOptions,
  parseNewGameOptions,
  restoreGame,
  SavedGame,
  toSavedGame
} from '../../logic/persistence';
import { decodeGame, encodeGame } from '../../logic/encoding';
import { addScore, isWon, parseScores, rankScores, ScoreEntry, toScore } from '../../logic/scores';
import { readStorage, writeStorage } from '../../core/storage/local-storage';
import { requestPersistence$ } from '../../core/storage/persistent-storage';

type KeyAction = SetAction | MoveAction | TogglePauseAction | UndoAction | RedoAction;

export type ConfigureBoardAction = ['configureBoard', Partial<BoardSettings>];

type ReplayGameAction = ['replayGame', SavedGame];
type ScoresLevelAction = ['scoresLevel', Level];
type PreferencesAction = ['preferences', Partial<Preferences>];

type NewGameOptionsAction = ['newGameOptions', Partial<NewGameOptions>];
type GenerateGameAction = ['generateGame', number];
type StartNewGameAction = ['startNewGame', { settings: GameSettings; sudoku: Sudoku }];

type TemplateAction =
  GameAction | ReplayAction | NewGameOptionsAction | ScoresLevelAction | PreferencesAction;

type PageAction =
  | GameAction
  | ConfigureBoardAction
  | ReplayAction
  | NewGameOptionsAction
  | GenerateGameAction
  | StartNewGameAction
  | ReplayGameAction
  | ScoresLevelAction
  | PreferencesAction;

type KeyBindings = Record<string, KeyAction>;

type ReplayKeyBindings = Record<string, ReplayAction>;

const keyboardSettings: KeyBindings = {
  Digit1: ['set', '1'],
  Digit2: ['set', '2'],
  Digit3: ['set', '3'],
  Digit4: ['set', '4'],
  Digit5: ['set', '5'],
  Digit6: ['set', '6'],
  Digit7: ['set', '7'],
  Digit8: ['set', '8'],
  Digit9: ['set', '9'],
  Backspace: ['set', ''],
  ArrowLeft: ['move', 'left'],
  ArrowRight: ['move', 'right'],
  ArrowUp: ['move', 'up'],
  ArrowDown: ['move', 'down'],
  KeyJ: ['undo', null],
  KeyK: ['togglePause', null],
  KeyL: ['redo', null],
  Space: ['togglePause', null]
};

const replayKeyboardSettings: ReplayKeyBindings = {
  KeyJ: ['replay', ['step', -1]],
  KeyK: ['replay', ['toggle', null]],
  KeyL: ['replay', ['step', 1]],
  Space: ['replay', ['toggle', null]],
  ArrowLeft: ['replay', ['step', -1]],
  ArrowRight: ['replay', ['step', 1]],
  Escape: ['exitReplay', null]
};

const replaySettings = {
  speeds: [0.5, 1, 1.5, 2, 4, 8]
};

type Clock = { read: (time: number) => number; rate: number; end: number };

const gameClock = (gameTimer: Timer): Clock => ({
  read: time => elapsed(gameTimer, time),
  rate: isRunning(gameTimer) ? 1 : 0,
  end: Infinity
});

const replayClock = (replay: Replay): Clock => ({
  read: time => replayTime(replay, time),
  rate: isPlaying(replay.playback) ? replay.playback.speed : 0,
  end: duration(replay.game)
});

const clockSeconds$ = (clock: Clock): Observable<number> =>
  clock.rate === 0
    ? of(clock.read(now()))
    : defer(() => of(clock.read(now()))).pipe(
        expand(current =>
          current >= clock.end
            ? EMPTY
            : timer((1000 - (current % 1000)) / clock.rate).pipe(map(() => clock.read(now())))
        )
      );

const replayCursor$ = (replay: Replay): Observable<number> => {
  const cursorNow = () => cursorAt(replay.game.moves, replayTime(replay, now()));

  return !isPlaying(replay.playback)
    ? of(cursorNow())
    : defer(() => of(cursorNow())).pipe(
        expand(cursor =>
          cursor >= replay.game.moves.length
            ? EMPTY
            : timer(
                Math.max(0, replay.game.moves[cursor].elapsed - replayTime(replay, now())) /
                  replay.playback.speed
              ).pipe(map(cursorNow))
        ),
        distinctUntilChanged()
      );
};

const gameSettings: Omit<GameSettings, 'seed'> = {
  xDimension: 3,
  yDimension: 3,
  level: 'medium',
  mistakeMode: 'marked',
  mistakeLimit: 3
};

const newGameSettings = {
  mistakeLimits: [3, 5, null]
};

const scoreSettings = {
  limit: 10
};

const storageSettings = {
  gameKey: 'sudoku.v1.game',
  themeKey: 'sudoku.v1.theme',
  newGameKey: 'sudoku.v1.new-game',
  scoresKey: 'sudoku.v1.scores',
  preferencesKey: 'sudoku.v1.preferences'
};

type Stored = {
  game: SavedGame | null;
  theme: Partial<BoardSettings>;
  newGame: NewGameOptions | null;
  preferences: Partial<Preferences>;
};

const readScores = () => parseScores(readStorage(storageSettings.scoresKey));

const readStored = (): Stored => ({
  game: decodeGame(readStorage(storageSettings.gameKey)),
  theme: parseTheme(readStorage(storageSettings.themeKey)),
  newGame: parseNewGameOptions(
    readStorage(storageSettings.newGameKey),
    newGameSettings.mistakeLimits
  ),
  preferences: parsePreferences(readStorage(storageSettings.preferencesKey))
});

const nothingStored: Stored = { game: null, theme: {}, newGame: null, preferences: {} };

const generateSudoku$ = (settings: GameSettings): Observable<Sudoku> =>
  typeof Worker === 'undefined'
    ? timer(0).pipe(map(() => generateSudoku(settings)))
    : new Observable(subscriber => {
        const worker = new Worker(new URL('../../logic/generator.worker', import.meta.url), {
          type: 'module'
        });
        worker.addEventListener('message', ({ data }: MessageEvent<Sudoku>) => {
          subscriber.next(data);
          subscriber.complete();
        });
        worker.addEventListener('error', error => subscriber.error(error));
        worker.postMessage(settings);
        return () => worker.terminate();
      });

const createRandomSeed = () => Math.floor(Math.random() * 2 ** 32);

type BoardState = GameState & { boardSettings: BoardSettings; preferences: Preferences };

type PageState = BoardState & {
  pending: GameSettings | null;
  replay: Replay | null;
  newGame: NewGameOptions;
  scoresLevel: Level;
};

type TimedAction<A> = [A, number];

export const pageReducer = (
  state: PageState,
  [action, time]: TimedAction<PageAction>
): PageState => {
  const [type, value] = action;

  switch (type) {
    case 'configureBoard':
      return { ...state, boardSettings: { ...state.boardSettings, ...value } };
    case 'startReplay': {
      const paused = isRunning(state.game.timer)
        ? gameReducer(state, ['togglePause', null], time)
        : state;
      return { ...state, ...paused, replay: createReplay(state.game, time) };
    }
    case 'replayGame': {
      const paused = isRunning(state.game.timer)
        ? gameReducer(state, ['togglePause', null], time)
        : state;
      return { ...state, ...paused, replay: createReplay(restoreGame(value, time), time) };
    }
    case 'scoresLevel':
      return { ...state, scoresLevel: value };
    case 'preferences':
      return { ...state, preferences: { ...state.preferences, ...value } };
    case 'exitReplay':
      return { ...state, replay: null };
    case 'newGameOptions':
      return { ...state, newGame: { ...state.newGame, ...value } };
    case 'generateGame':
      return { ...state, pending: { ...state.settings, ...state.newGame, seed: value } };
    case 'startNewGame':
      return state.pending?.seed === value.settings.seed
        ? {
            ...state,
            settings: value.settings,
            game: startGame(value.settings, value.sudoku, time),
            pending: null,
            replay: null
          }
        : state;
    case 'replay':
      return state.replay === null
        ? state
        : { ...state, replay: replayReducer(state.replay, value, time) };
    default:
      return state.replay === null && state.pending === null
        ? { ...state, ...gameReducer(state, action, time) }
        : state;
  }
};

const previewSize = 220;

const padColumns = (symbols: number) => Math.ceil(symbols / Math.ceil(symbols / 9));

export const createPageState = (
  seed: number,
  time: number,
  stored: Stored = nothingStored
): PageState => {
  const newGame = stored.newGame ?? {
    level: gameSettings.level,
    mistakeMode: gameSettings.mistakeMode,
    mistakeLimit: gameSettings.mistakeLimit
  };
  const saved = stored.game;
  const settings = { ...gameSettings, ...newGame, seed };

  if (saved !== null && !saved.finished) {
    return {
      settings: saved.settings,
      game: restoreGame(saved, time),
      pending: null,
      ...restOfPageState(stored, newGame)
    };
  }

  return {
    ...createGameState({ ...settings, level: 'easy' }, time),
    pending: settings,
    ...restOfPageState(stored, newGame)
  };
};

const restOfPageState = (stored: Stored, newGame: NewGameOptions) => ({
  boardSettings: { ...boardSettings, ...stored.theme },
  preferences: { ...defaultPreferences, ...stored.preferences },
  replay: null,
  newGame,
  scoresLevel: newGame.level
});

export const toBoardConfig = (state: BoardState, generating = false) => ({
  ...state.game.settings,
  ...state.boardSettings,
  ...state.preferences,
  ...state.game,
  highlightedCells: getHighlightedCells(
    state.game.settings.xDimension,
    state.game.selectedPosition
  ),
  matchingCells: getMatchingCells(state.game.boardValues, state.game.selectedPosition),
  wrongCells: getWrongCells(state.game),
  lost: isLost(state.game),
  remainingCounts: getRemainingCounts(state.game.boardValues, state.game.alphabet),
  generating
});

export type BoardConfig = ReturnType<typeof toBoardConfig>;

@Component({
  selector: 'hks-page-sudoku',
  imports: [
    SudokuBoardComponent,
    SudokuTimelineComponent,
    ThemeMenuComponent,
    ScoresComponent,
    PreferencesComponent,
    GameBarComponent,
    GameToolsComponent,
    ReplayControlsComponent,
    SheetComponent,
    NewGameComponent,
    AboutComponent,
    LegalComponent,
    AsyncPipe,
    ResizeDirective
  ],
  templateUrl: './page-sudoku.component.html',
  styleUrl: './page-sudoku.component.scss'
})
export class PageSudokuComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  private readonly initialState = createPageState(createRandomSeed(), now(), readStored());

  private readonly keyboardSettings$ = of(keyboardSettings);

  private readonly pressedKeys$ = fromEvent(this.document, 'keydown').pipe(
    filter((ev): ev is KeyboardEvent => ev instanceof KeyboardEvent),
    filter(ev => !(ev.code === 'Space' && ev.target instanceof HTMLButtonElement)),
    map(ev => ev.code)
  );

  private readonly keyActions$ = this.pressedKeys$.pipe(
    withLatestFrom(this.keyboardSettings$),
    mergeMap(([code, keyboardSettings]) => [keyboardSettings[code], replayKeyboardSettings[code]]),
    filter(Boolean)
  );

  public readonly templateActions$ = new Subject<TemplateAction>();

  public readonly newGame$ = new Subject<void>();

  private readonly newGameActions$ = this.newGame$.pipe(
    map((): GenerateGameAction => ['generateGame', createRandomSeed()])
  );

  public readonly resize$ = new Subject<Size>();

  private readonly resizeActions$ = this.resize$.pipe(
    map(({ width, height }): ConfigureBoardAction => {
      const size = Math.floor(Math.min(width, height));
      return [
        'configureBoard',
        { clientWidth: size, clientHeight: size, pixelRatio: window.devicePixelRatio }
      ];
    })
  );

  public readonly themeChanges$ = new Subject<Partial<BoardSettings>>();

  private readonly themeActions$ = this.themeChanges$.pipe(
    map((settings): ConfigureBoardAction => ['configureBoard', settings])
  );

  private readonly visibilityActions$ = fromEvent(this.document, 'visibilitychange').pipe(
    filter(() => this.document.visibilityState === 'hidden'),
    map((): GameAction => ['pause', null])
  );

  public readonly scoreTaps$ = new Subject<string>();

  private readonly replayGameActions$ = this.scoreTaps$.pipe(
    map(id => readScores().find(entry => entry.id === id)),
    map(entry => (entry === undefined ? null : decodeGame(entry.replay))),
    filter((saved): saved is SavedGame => saved !== null),
    map((saved): ReplayGameAction => ['replayGame', saved])
  );

  private readonly generatedActions$ = new Subject<StartNewGameAction>();

  private readonly actions$ = merge(
    this.keyActions$,
    this.templateActions$,
    this.newGameActions$,
    this.resizeActions$,
    this.themeActions$,
    this.replayGameActions$,
    this.visibilityActions$,
    this.generatedActions$
  ).pipe(
    map((action): TimedAction<PageAction> => [action, now()]),
    share()
  );

  private readonly state$ = this.actions$.pipe(
    scan(pageReducer, this.initialState),
    startWith(this.initialState),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly padColumns = padColumns;
  protected readonly replaySpeeds = replaySettings.speeds;
  protected readonly mistakeLimits = newGameSettings.mistakeLimits;

  public readonly newGameOptions$ = this.state$.pipe(
    map(state => state.newGame),
    distinctUntilChanged()
  );

  public readonly preferences$ = this.state$.pipe(
    map(state => state.preferences),
    distinctUntilChanged()
  );

  public readonly replay$ = this.state$.pipe(
    map(state => state.replay),
    distinctUntilChanged()
  );

  public readonly clock$ = this.state$.pipe(
    map(state => state.replay ?? state.game.timer),
    distinctUntilChanged(),
    map(source => ('playback' in source ? replayClock(source) : gameClock(source))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public readonly elapsed$ = this.clock$.pipe(switchMap(clockSeconds$));

  public readonly boardConfig$ = this.state$.pipe(
    switchMap(state => {
      const replay = state.replay;
      return replay === null
        ? of(toBoardConfig(state, state.pending !== null))
        : replayCursor$(replay).pipe(
            map(cursor => toBoardConfig({ ...state, game: replayFrame(replay, cursor) }))
          );
    })
  );

  private readonly sampleState = createSampleState();

  public readonly previewConfig$ = this.state$.pipe(
    map(state => ({
      ...toBoardConfig({
        ...this.sampleState,
        boardSettings: state.boardSettings,
        preferences: state.preferences
      }),
      clientWidth: previewSize,
      clientHeight: previewSize
    }))
  );

  private readonly wonGames$ = this.state$.pipe(
    map(state => state.game),
    filter(isWon),
    distinctUntilChanged((a, b) => a.timer === b.timer)
  );

  private readonly savedScore$ = this.wonGames$.pipe(
    map(game => {
      const finishedAt = Date.now();
      const entry: ScoreEntry = {
        ...toScore(game, `${finishedAt}-${game.settings.seed}`, finishedAt),
        replay: encodeGame(toSavedGame(game, now()))
      };
      return { entry, ...addScore(readScores(), entry, scoreSettings.limit) };
    }),
    share()
  );

  private readonly saveScoresEffect = this.savedScore$
    .pipe(takeUntilDestroyed())
    .subscribe(({ entries }) => writeStorage(storageSettings.scoresKey, entries));

  public readonly newScore$ = merge(
    this.savedScore$.pipe(map(({ entry, rank }) => ({ score: entry, rank }))),
    this.state$.pipe(
      map(state => state.game.puzzle),
      distinctUntilChanged(),
      map(() => null)
    )
  );

  public readonly scoresLevel$ = this.state$.pipe(
    map(state => state.scoresLevel),
    distinctUntilChanged()
  );

  public readonly scores$ = combineLatest([
    this.scoresLevel$,
    merge(
      defer(() => of(readScores())),
      this.savedScore$.pipe(map(({ entries }) => entries))
    )
  ]).pipe(map(([level, entries]) => rankScores(entries.filter(entry => entry.level === level))));

  private readonly requestPersistentStorageEffect = this.savedScore$
    .pipe(
      take(1),
      switchMap(() => requestPersistence$()),
      catchError(() => EMPTY),
      takeUntilDestroyed()
    )
    .subscribe();

  private readonly generateGameEffect = this.state$
    .pipe(
      map(state => state.pending),
      distinctUntilChanged(),
      switchMap(settings =>
        settings === null
          ? EMPTY
          : generateSudoku$(settings).pipe(
              map((sudoku): StartNewGameAction => ['startNewGame', { settings, sudoku }]),
              catchError(() => EMPTY)
            )
      ),
      takeUntilDestroyed()
    )
    .subscribe(action => this.generatedActions$.next(action));

  private readonly saveGameEffect = this.state$
    .pipe(
      filter(state => state.pending === null),
      map(state => state.game),
      distinctUntilChanged(),
      takeUntilDestroyed()
    )
    .subscribe(game => writeStorage(storageSettings.gameKey, encodeGame(toSavedGame(game, now()))));

  private readonly saveThemeEffect = this.state$
    .pipe(
      map(state => state.boardSettings),
      distinctUntilChanged(isSameTheme),
      skip(1),
      takeUntilDestroyed()
    )
    .subscribe(settings => writeStorage(storageSettings.themeKey, pickTheme(settings)));

  private readonly saveNewGameEffect = this.state$
    .pipe(
      map(state => state.newGame),
      distinctUntilChanged(),
      skip(1),
      takeUntilDestroyed()
    )
    .subscribe(newGame => writeStorage(storageSettings.newGameKey, newGame));

  private readonly savePreferencesEffect = this.state$
    .pipe(
      map(state => state.preferences),
      distinctUntilChanged(),
      skip(1),
      takeUntilDestroyed()
    )
    .subscribe(preferences => writeStorage(storageSettings.preferencesKey, preferences));

  public readonly isLegal$ = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.router.url === '/legal'),
    distinctUntilChanged()
  );

  public readonly legalClosed$ = new Subject<void>();

  private readonly closeLegalEffect = this.legalClosed$
    .pipe(
      filter(() => this.router.url === '/legal'),
      takeUntilDestroyed()
    )
    .subscribe(() => this.router.navigateByUrl('/', { replaceUrl: true }));

  private readonly documentBackgroundEffect = this.state$
    .pipe(
      map(state => state.boardSettings.backgroundColor),
      distinctUntilChanged(),
      takeUntilDestroyed()
    )
    .subscribe(color => {
      this.document.documentElement.style.backgroundColor = color;
      this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    });
}
