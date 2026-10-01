import { Component, inject, isDevMode, PLATFORM_ID, DOCUMENT } from '@angular/core';
import { Pane } from 'tweakpane';
import { PageDirective } from '../../../../core/directives/page.directive';
import { SudokuBoardComponent } from '../../components/sudoku-board/sudoku-board.component';
import { SudokuTimelineComponent } from '../../components/sudoku-timeline/sudoku-timeline.component';
import { formatElapsed } from '../../components/format-elapsed';
import { type Level, levels } from '../../logic/difficulty';
import { BoardSettings, boardSettings, createSampleState } from '../../theme/theme';
import { ThemeMenuComponent } from '../../components/theme-menu/theme-menu.component';
import { ResizeDirective, Size } from '../../../../core/directives/resize.directive';
import { now } from '../../../../core/time/now';
import { defer, distinctUntilChanged, EMPTY, expand, filter, fromEvent, map, merge, Observable, of, scan, share, shareReplay, startWith, Subject, switchMap, timer, withLatestFrom } from 'rxjs';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfigureGameAction, createGameState, elapsed, GameAction, gameReducer, GameState, getConflictingCells, getHighlightedCells, getMatchingCells, getRemainingCounts, HintModeAction, isPaused, isRunning, isStopped, MoveAction, RedoAction, SetAction, Timer, TogglePauseAction, UndoAction } from '../../logic/sudoku.logic';
import { fromBinding$, fromButton$ } from '../../../../core/tweakpane/tweakpane-rx';

type KeyAction = SetAction | MoveAction | TogglePauseAction | UndoAction | RedoAction;

type ConfigureBoardAction = ['configureBoard', Partial<BoardSettings>];
type CopyConfigAction = ['copyConfig', null];

type DebugAction = ConfigureBoardAction | ConfigureGameAction | HintModeAction | CopyConfigAction;

type PageAction = GameAction | ConfigureBoardAction | CopyConfigAction;
type StateAction = Exclude<PageAction, CopyConfigAction>;

type KeyBindings = Record<string, KeyAction>;

const keyboardSettings: KeyBindings = {
  'Digit1': ['set', '1'],
  'Digit2': ['set', '2'],
  'Digit3': ['set', '3'],
  'Digit4': ['set', '4'],
  'Digit5': ['set', '5'],
  'Digit6': ['set', '6'],
  'Digit7': ['set', '7'],
  'Digit8': ['set', '8'],
  'Digit9': ['set', '9'],
  'Backspace': ['set', ''],
  'ArrowLeft': ['move', 'left'],
  'ArrowRight': ['move', 'right'],
  'ArrowUp': ['move', 'up'],
  'ArrowDown': ['move', 'down'],
  'KeyP': ['togglePause', null],
  'KeyZ': ['undo', null],
  'KeyY': ['redo', null],
};


// emits the elapsed time now and then exactly when the next full second is reached, nothing while paused or stopped
const elapsedSeconds$ = (gameTimer: Timer): Observable<number> => !isRunning(gameTimer)
  ? of(elapsed(gameTimer, now()))
  : defer(() => of(elapsed(gameTimer, now()))).pipe(
    expand(current => timer(1000 - current % 1000).pipe(
      map(() => elapsed(gameTimer, now()))
    ))
  );


const gameSettings = {
  "xDimension": 3,
  "yDimension": 3,
  "level": 'medium' as Level,
};



const createRandomSeed = () => Math.floor(Math.random() * 2 ** 32);

type PageState = GameState & { boardSettings: BoardSettings };

type TimedAction<A> = [A, number];

const pageReducer = (state: PageState, [action, time]: TimedAction<StateAction>): PageState => action[0] === 'configureBoard'
  ? { ...state, boardSettings: { ...state.boardSettings, ...action[1] } }
  : { ...state, ...gameReducer(state, action, time) };

const previewSize = 220;

// at most 9 symbols per row, spread evenly over the rows
const padColumns = (symbols: number) => Math.ceil(symbols / Math.ceil(symbols / 9));

export const createPageState = (seed: number, time: number): PageState => ({
  ...createGameState({ ...gameSettings, seed }, time),
  boardSettings
});

export const toBoardConfig = (state: PageState) => ({
  ...state.game.settings,
  ...state.boardSettings,
  ...state.game,
  highlightedCells: getHighlightedCells(state.game.settings.xDimension, state.game.selectedPosition),
  matchingCells: getMatchingCells(state.game.boardValues, state.game.selectedPosition),
  conflictingCells: getConflictingCells(state.game.boardValues),
  remainingCounts: getRemainingCounts(state.game.boardValues, state.game.alphabet)
});

export type BoardConfig = ReturnType<typeof toBoardConfig>;

const createDebugPane$ = (config: BoardConfig): Observable<DebugAction> => new Observable(subscriber => {
  // Tweakpane writes into the bound object, so it must not be the state
  const PARAMS = { ...config };

  const pane = new Pane({ title: 'debug', expanded: false });

  const generalFolder = pane.addFolder({
    title: 'General'
  });

  const general$ = merge(
    fromBinding$(generalFolder, PARAMS, 'height', { step: 1, min: 1 }),
    fromBinding$(generalFolder, PARAMS, 'width', { step: 1, min: 1 }),
    fromBinding$(generalFolder, PARAMS, 'backgroundColor'),
    fromBinding$(generalFolder, PARAMS, 'cellPaddingRatio', { min: 0, max: 0.49, step: 0.01 })
  );

  const gameFolder = pane.addFolder({
    title: 'Game Settings'
  });

  const game$ = merge(
    fromBinding$(gameFolder, PARAMS, 'xDimension', { step: 1, min: 1 }),
    fromBinding$(gameFolder, PARAMS, 'yDimension', { step: 1, min: 1 }),
    fromBinding$(gameFolder, PARAMS, 'level', { options: Object.fromEntries(levels.map(level => [level, level])) }),
    fromBinding$(gameFolder, PARAMS, 'seed', { step: 1 })
  );
  const newGame$ = fromButton$(gameFolder, 'new game');
  const hintMode$ = fromBinding$(gameFolder, PARAMS, 'hintMode');

  const mainFolder = pane.addFolder({
    title: 'Main Grid'
  });

  const mainGrid$ = merge(
    fromBinding$(mainFolder, PARAMS, 'mainBorderColor'),
    fromBinding$(mainFolder, PARAMS, 'mainGridBorderWidth', { step: 1, min: 0 })
  );

  const valueFolder = pane.addFolder({
    title: 'Value Grid'
  });

  const valueGrid$ = merge(
    fromBinding$(valueFolder, PARAMS, 'valueFont'),
    fromBinding$(valueFolder, PARAMS, 'valueFontColor'),
    fromBinding$(valueFolder, PARAMS, 'enteredValueFontColor'),
    fromBinding$(valueFolder, PARAMS, 'valueGridBorderColor'),
    fromBinding$(valueFolder, PARAMS, 'valueGridBorderWidth', { step: 1, min: 0 }),
    fromBinding$(valueFolder, PARAMS, 'renderTextBoundingBoxLineWidth', { step: 1, min: 0 }),
    fromBinding$(valueFolder, PARAMS, 'renderTextBoundingBoxColor')
  );

  const hintFolder = pane.addFolder({
    title: 'Hint Grid'
  });

  const hintGrid$ = merge(
    fromBinding$(hintFolder, PARAMS, 'hintFont'),
    fromBinding$(hintFolder, PARAMS, 'hintFontColor'),
    fromBinding$(hintFolder, PARAMS, 'hintGridBorderWidth', { step: 1 }),
    fromBinding$(hintFolder, PARAMS, 'hintGridBorderColor')
  );

  const highlightFolder = pane.addFolder({
    title: 'Highlight Settings'
  });

  const highlight$ = merge(
    fromBinding$(highlightFolder, PARAMS, 'highlightColor'),
    fromBinding$(highlightFolder, PARAMS, 'selectedCellHighlightColor'),
    fromBinding$(highlightFolder, PARAMS, 'highlightFontColor'),
    fromBinding$(highlightFolder, PARAMS, 'enteredHighlightFontColor')
  );

  const gameStateFolder = pane.addFolder({
    title: 'Game State Display'
  });

  const gameStateDisplay$ = merge(
    fromBinding$(gameStateFolder, PARAMS, 'showConflicts'),
    fromBinding$(gameStateFolder, PARAMS, 'conflictFontColor'),
    fromBinding$(gameStateFolder, PARAMS, 'solvedOverlayColor'),
    fromBinding$(gameStateFolder, PARAMS, 'solvedFontColor'),
    fromBinding$(gameStateFolder, PARAMS, 'timelinePixelsPerSecond', { min: 1, step: 1 }),
    fromBinding$(gameStateFolder, PARAMS, 'timelinePlayheadColor')
  );

  const copyConfig$ = fromButton$(pane, 'copy configs');

  const newGameSubscription = newGame$.subscribe(() => {
    PARAMS.seed = createRandomSeed();
    pane.refresh();
  });

  const actionSubscription = merge(
    merge(general$, mainGrid$, valueGrid$, hintGrid$, highlight$, gameStateDisplay$).pipe(
      map((changes): DebugAction => ['configureBoard', changes])
    ),
    game$.pipe(
      map((changes): DebugAction => ['configureGame', changes])
    ),
    hintMode$.pipe(
      map(({ hintMode }): DebugAction => ['hintMode', hintMode])
    ),
    copyConfig$.pipe(
      map((): DebugAction => ['copyConfig', null])
    )
  ).subscribe(subscriber);

  return () => {
    actionSubscription.unsubscribe();
    newGameSubscription.unsubscribe();
    pane.dispose();
  };
});

@Component({
  selector: 'hks-page-sudoku',
  imports: [SudokuBoardComponent, SudokuTimelineComponent, ThemeMenuComponent, AsyncPipe, ResizeDirective],
  templateUrl: './page-sudoku.component.html',
  styleUrl: './page-sudoku.component.scss',
  hostDirectives: [PageDirective]
})
export class PageSudokuComponent {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly initialState = createPageState(createRandomSeed(), now());

  private readonly keyboardSettings$ = of(keyboardSettings).pipe(
    map(keyBindings => Object.entries(keyBindings))
  );

  private readonly pressedKeys$ = fromEvent(this.document, 'keydown').pipe(
    filter((ev): ev is KeyboardEvent => ev instanceof KeyboardEvent),
    map(ev => ev.code)
  );

  private readonly keyActions$ = this.pressedKeys$.pipe(
    withLatestFrom(this.keyboardSettings$),
    map(([code, keyboardSettings]) => keyboardSettings.find(([key]) => key === code)?.[1]),
    filter(Boolean)
  );

  public readonly templateActions$ = new Subject<GameAction>();

  public readonly newGame$ = new Subject<Level>();

  private readonly newGameActions$ = this.newGame$.pipe(
    map((level): GameAction => ['configureGame', { seed: createRandomSeed(), level }])
  );

  public readonly resize$ = new Subject<Size>();

  private readonly resizeActions$ = this.resize$.pipe(
    map(({ width, height }): ConfigureBoardAction => {
      const size = Math.floor(Math.min(width, height));
      return ['configureBoard', { clientWidth: size, clientHeight: size, pixelRatio: window.devicePixelRatio }];
    })
  );

  public readonly themeChanges$ = new Subject<Partial<BoardSettings>>();

  private readonly themeActions$ = this.themeChanges$.pipe(
    map((settings): ConfigureBoardAction => ['configureBoard', settings])
  );

  private readonly debugActions$ = this.isBrowser && isDevMode() ? defer(() => createDebugPane$(toBoardConfig(this.initialState))) : EMPTY;

  private readonly actions$ = merge(
    this.keyActions$,
    this.templateActions$,
    this.newGameActions$,
    this.resizeActions$,
    this.themeActions$,
    this.debugActions$
  ).pipe(
    map((action): TimedAction<PageAction> => [action, now()]),
    share()
  );

  private readonly state$ = this.actions$.pipe(
    filter((timed): timed is TimedAction<StateAction> => timed[0][0] !== 'copyConfig'),
    scan(pageReducer, this.initialState),
    startWith(this.initialState),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly formatElapsed = formatElapsed;
  protected readonly padColumns = padColumns;
  protected readonly levels = levels;
  protected readonly isPaused = isPaused;
  protected readonly isStopped = isStopped;

  // the server renders the elapsed time once, a running clock would keep it from ever finishing
  public readonly elapsed$ = this.state$.pipe(
    map(state => state.game.timer),
    distinctUntilChanged(),
    switchMap(gameTimer => this.isBrowser ? elapsedSeconds$(gameTimer) : of(elapsed(gameTimer, now())))
  );

  public readonly boardConfig$ = this.state$.pipe(
    map(toBoardConfig)
  );

  private readonly sampleState = createSampleState();

  public readonly previewConfig$ = this.state$.pipe(
    map(state => ({ ...toBoardConfig({ ...this.sampleState, boardSettings: state.boardSettings }), clientWidth: previewSize, clientHeight: previewSize }))
  );

  private readonly copyConfigEffect = this.actions$.pipe(
    filter(([[type]]) => type === 'copyConfig'),
    withLatestFrom(this.boardConfig$),
    takeUntilDestroyed()
  ).subscribe(([, config]) => navigator.clipboard.writeText(JSON.stringify(config)));
}
