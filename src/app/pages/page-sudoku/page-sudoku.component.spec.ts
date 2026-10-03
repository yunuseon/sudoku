import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { createPageState, PageSudokuComponent, pageReducer } from './page-sudoku.component';
import { toSavedGame } from '../../logic/persistence';
import { elapsed, gameReducer, generateSudoku, isPaused } from '../../logic/sudoku.logic';

describe('PageSudokuComponent', () => {
  let component: PageSudokuComponent;
  let fixture: ComponentFixture<PageSudokuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageSudokuComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PageSudokuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('createPageState', () => {
  const played = createPageState(1, 0);
  const cell = played.game.givens.findIndex(isGiven => !isGiven);
  const withMove = gameReducer(
    gameReducer(played, ['select', { x: cell % 9, y: Math.floor(cell / 9) }], 1000),
    ['set', played.game.solution[cell]],
    4000
  );

  it('continues an unfinished saved game, paused at its time', () => {
    const restored = createPageState(2, 50000, {
      game: toSavedGame(withMove.game, 6000),
      theme: {},
      newGame: null,
      preferences: {}
    });

    expect(restored.game.puzzle).toEqual(played.game.puzzle);
    expect(restored.game.boardValues[cell]).toBe(played.game.solution[cell]);
    expect(isPaused(restored.game.timer)).toBe(true);
    expect(elapsed(restored.game.timer, 90000)).toBe(6000);
  });

  it('applies the stored theme and preferences and starts a new game with the stored options', () => {
    const state = createPageState(2, 0, {
      game: null,
      theme: { backgroundColor: '#000000' },
      newGame: { level: 'easy', mistakeMode: 'unmarked', mistakeLimit: null },
      preferences: { highlightMatchingCells: false }
    });

    expect(state.boardSettings.backgroundColor).toBe('#000000');
    expect(state.preferences.highlightMatchingCells).toBe(false);
    expect(state.pending).toEqual(
      expect.objectContaining({ level: 'easy', mistakeMode: 'unmarked', seed: 2 })
    );
    expect(state.newGame.level).toBe('easy');
    expect(state.scoresLevel).toBe('easy');
  });

  it('starts a new game instead of a finished one', () => {
    const finished = { ...toSavedGame(withMove.game, 6000), finished: true };
    const state = createPageState(2, 50000, {
      game: finished,
      theme: {},
      newGame: null,
      preferences: {}
    });

    expect(state.pending?.seed).toBe(2);
    expect(state.game.puzzle).not.toEqual(played.game.puzzle);
  });
});

describe('generating a new game', () => {
  const running = createPageState(1, 0, {
    game: toSavedGame(createPageState(1, 0).game, 0),
    theme: {},
    newGame: null,
    preferences: {}
  });
  const requested = pageReducer(running, [['generateGame', 42], 1000]);
  const settings = requested.pending!;
  const sudoku = generateSudoku(settings);

  it('asks for a game with the chosen options and a new seed', () => {
    expect(running.pending).toBeNull();
    expect(settings).toEqual(expect.objectContaining({ ...running.newGame, seed: 42 }));
  });

  it('ignores input while generating', () => {
    expect(pageReducer(requested, [['togglePause', null], 2000])).toBe(requested);
  });

  it('starts the generated game, but not one that was asked for earlier', () => {
    const stale = pageReducer(requested, [
      ['startNewGame', { settings: { ...settings, seed: 7 }, sudoku }],
      3000
    ]);
    expect(stale).toBe(requested);

    const started = pageReducer(requested, [['startNewGame', { settings, sudoku }], 3000]);
    expect(started.pending).toBeNull();
    expect(started.game.puzzle).toEqual(sudoku.puzzle);
    expect(started.game.timer.startedAt).toBe(3000);
  });
});
