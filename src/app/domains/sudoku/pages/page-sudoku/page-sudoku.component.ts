import { Component, inject, PLATFORM_ID, DOCUMENT } from '@angular/core';
import { Pane } from 'tweakpane';
import { PageDirective } from '../../../../core/directives/page.directive';
import { SudokuBoardComponent } from '../../components/sudoku-board/sudoku-board.component';
import { defer, distinctUntilChanged, EMPTY, expand, filter, fromEvent, map, merge, Observable, of, scan, share, shareReplay, startWith, Subject, switchMap, timer, withLatestFrom } from 'rxjs';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfigureGameAction, createGameState, elapsed, GameAction, gameReducer, GameState, getHighlightedCells, getMatchingCells, HintModeAction, isPaused, isRunning, isStopped, MoveAction, SetAction, Timer, TogglePauseAction } from '../../logic/sudoku.logic';
import { fromBinding$, fromButton$ } from '../../../../core/tweakpane/tweakpane-rx';

type KeyAction = SetAction | MoveAction | TogglePauseAction;

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
};

// unlike Date.now() this cannot jump when the system clock changes
const now = () => performance.timeOrigin + performance.now();

// emits the elapsed time now and then exactly when the next full second is reached, nothing while paused or stopped
const elapsedSeconds$ = (gameTimer: Timer): Observable<number> => !isRunning(gameTimer)
  ? of(elapsed(gameTimer, now()))
  : defer(() => of(elapsed(gameTimer, now()))).pipe(
    expand(current => timer(1000 - current % 1000).pipe(
      map(() => elapsed(gameTimer, now()))
    ))
  );

const formatElapsed = (elapsed: number) => {
  const seconds = Math.floor(elapsed / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const gameSettings = {
  "xDimension": 3,
  "yDimension": 3,
  "givensRatio": 0.31,
};

const boardSettings = {
  "height": 1000,
  "width": 1000,
  "clientWidth": 600,
  "clientHeight": 600,
  "backgroundColor": "#213555",
  "cellPaddingRatio": 0.33,
  "mainBorderColor": "#d8c4b6",
  "mainGridBorderWidth": 12,
  "valueFont": "system-ui",
  "valueFontColor": "#f5efe7",
  "enteredValueFontColor": "#8ec5ff",
  "valueGridBorderColor": "#3e5879",
  "valueGridBorderWidth": 4,
  "hintFont": "system-ui",
  "hintFontColor": "#d8c4b6",
  "hintGridBorderColor": "#eac0c0",
  "hintGridBorderWidth": 0,
  "renderTextBoundingBoxLineWidth": 0,
  "renderTextBoundingBoxColor": "#00ff00",
  "highlightColor": '#18263c',
  "selectedCellHighlightColor": '#030509',
  "highlightFontColor": '#ff0ff0',
  "enteredHighlightFontColor": '#ff9cf7',
}

type BoardSettings = typeof boardSettings;

const createRandomSeed = () => Math.floor(Math.random() * 2 ** 32);

type PageState = GameState & { boardSettings: BoardSettings };

type TimedAction<A> = [A, number];

const pageReducer = (state: PageState, [action, time]: TimedAction<StateAction>): PageState => action[0] === 'configureBoard'
  ? { ...state, boardSettings: { ...state.boardSettings, ...action[1] } }
  : { ...state, ...gameReducer(state, action, time) };

export const createPageState = (seed: number, time: number): PageState => ({
  ...createGameState({ ...gameSettings, seed }, time),
  boardSettings
});

export const toBoardConfig = (state: PageState) => ({
  ...state.game.settings,
  ...state.boardSettings,
  ...state.game,
  highlightedCells: getHighlightedCells(state.game.settings.xDimension, state.game.selectedPosition),
  matchingCells: getMatchingCells(state.game.boardValues, state.game.selectedPosition)
});

export type BoardConfig = ReturnType<typeof toBoardConfig>;

const createDebugPane$ = (config: BoardConfig): Observable<DebugAction> => new Observable(subscriber => {
  // Tweakpane writes into the bound object, so it must not be the state
  const PARAMS = { ...config };

  const pane = new Pane();

  const generalFolder = pane.addFolder({
    title: 'General'
  });

  const general$ = merge(
    fromBinding$(generalFolder, PARAMS, 'height', { step: 1, min: 1 }),
    fromBinding$(generalFolder, PARAMS, 'width', { step: 1, min: 1 }),
    fromBinding$(generalFolder, PARAMS, 'clientWidth', { step: 1, min: 1 }),
    fromBinding$(generalFolder, PARAMS, 'clientHeight', { step: 1, min: 1 }),
    fromBinding$(generalFolder, PARAMS, 'backgroundColor'),
    fromBinding$(generalFolder, PARAMS, 'cellPaddingRatio', { min: 0, max: 0.49, step: 0.01 })
  );

  const gameFolder = pane.addFolder({
    title: 'Game Settings'
  });

  const game$ = merge(
    fromBinding$(gameFolder, PARAMS, 'xDimension', { step: 1, min: 1 }),
    fromBinding$(gameFolder, PARAMS, 'yDimension', { step: 1, min: 1 }),
    fromBinding$(gameFolder, PARAMS, 'givensRatio', { min: 0, max: 1, step: 0.01 }),
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

  const copyConfig$ = fromButton$(pane, 'copy configs');

  const newGameSubscription = newGame$.subscribe(() => {
    PARAMS.seed = createRandomSeed();
    pane.refresh();
  });

  const actionSubscription = merge(
    merge(general$, mainGrid$, valueGrid$, hintGrid$, highlight$).pipe(
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
  imports: [SudokuBoardComponent, AsyncPipe],
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

  private readonly debugActions$ = this.isBrowser ? defer(() => createDebugPane$(toBoardConfig(this.initialState))) : EMPTY;

  private readonly actions$ = merge(
    this.keyActions$,
    this.templateActions$,
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

  private readonly copyConfigEffect = this.actions$.pipe(
    filter(([[type]]) => type === 'copyConfig'),
    withLatestFrom(this.boardConfig$),
    takeUntilDestroyed()
  ).subscribe(([, config]) => navigator.clipboard.writeText(JSON.stringify(config)));
}
