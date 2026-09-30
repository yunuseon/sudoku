import { afterNextRender, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { Pane } from 'tweakpane';
import { PageDirective } from '../../../../core/directives/page.directive';
import { SudokuBoardComponent } from '../../components/sudoku-board/sudoku-board.component';
import { filter, fromEvent, map, withLatestFrom } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { createNumericAlphabet, createSudoku, getHighlightedCells, getMatchingCells } from '../../logic/sudoku.logic';

type SetAction = ['set', string];

type MoveDirection = 'left' | 'right' | 'up' | 'down';
type MoveAction = ['move', MoveDirection];

type KeyAction = SetAction | MoveAction;

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
};

const gameSettings = {
  "xDimension": 3,
  "yDimension": 3,
  "givens": 25,
};

const boardSettings = {
  "height": 1000,
  "width": 1000,
  "clientWidth": 600,
  "clientHeight": 600,
  "backgroundColor": "#213555",
  "mainBorderColor": "#d8c4b6",
  "mainGridBorderWidth": 12,
  "valueFontSize": 50,
  "valueFont": "system-ui",
  "valueFontColor": "#f5efe7",
  "valueGridBorderColor": "#3e5879",
  "valueGridBorderWidth": 4,
  "hintFontSize": 21,
  "hintFont": "system-ui",
  "hintFontColor": "#d8c4b6",
  "hintGridBorderColor": "#eac0c0",
  "hintGridBorderWidth": 0,
  "renderTextBoundingBoxLineWidth": 0,
  "renderTextBoundingBoxColor": "#00ff00",
  "highlightColor": '#18263c',
  "selectedCellHighlightColor": '#030509',
  "highlightFontColor": '#ff0ff0',
}

// The only impure part of the game setup, the generator itself is deterministic for a given seed
const createRandomSeed = () => Math.floor(Math.random() * 2 ** 32);

export type BoardConfig = ReturnType<PageSudokuComponent['boardConfig']>;

@Component({
  selector: 'hks-page-sudoku',
  imports: [SudokuBoardComponent],
  templateUrl: './page-sudoku.component.html',
  styleUrl: './page-sudoku.component.scss',
  hostDirectives: [PageDirective]
})
export class PageSudokuComponent {
  private readonly document = inject(DOCUMENT);

  private readonly gameStateConfig = signal({ ...gameSettings, seed: createRandomSeed() });
  private readonly preConfig = signal(boardSettings);
  private readonly keyboardSettings = signal(keyboardSettings);

  private readonly keyboardSettings$ = toObservable(this.keyboardSettings).pipe(
    map(keyBindings => Object.entries(keyBindings))
  );

  private readonly gameState = linkedSignal(() => {
    const config = this.gameStateConfig();
    const alphabet = createNumericAlphabet(config.xDimension, config.yDimension);
    return {
      boardValues: createSudoku({ dimension: config.xDimension, alphabet, givens: config.givens, seed: config.seed }).puzzle,
      boardHints: new Array(
        config.xDimension * config.xDimension * config.xDimension *
        config.yDimension * config.yDimension * config.yDimension
      ).fill(''),
      selectedPosition: {
        x: 0,
        y: 0
      },
      hintMode: false,
      alphabet: alphabet
    };
  })

  public readonly boardConfig = computed(() => {
    const gameStateConfig = this.gameStateConfig();
    const gameState = this.gameState();

    return {
      ...gameStateConfig,
      ...this.preConfig(),
      ...gameState,
      highlightedCells: getHighlightedCells(gameStateConfig.xDimension, gameState.selectedPosition),
      matchingCells: getMatchingCells(gameState.boardValues, gameState.selectedPosition)
    };
  });

  private readonly pressedKeys$ = fromEvent(this.document, 'keydown').pipe(
    filter((ev): ev is KeyboardEvent => ev instanceof KeyboardEvent),
    map(ev => ev.code)
  );


  private readonly keys$ = this.pressedKeys$.pipe(
    withLatestFrom(this.keyboardSettings$),
    map(([code, keyboardSettings]) => keyboardSettings.find(([key]) => key === code)?.[1]),
    filter(Boolean),
    takeUntilDestroyed()
  ).subscribe(keyAction => this.executeAction(keyAction));

  constructor() {
    afterNextRender(() => {
      this.setupDebug();
    });
  }

  public set(value: string) {
    const { xDimension } = this.gameStateConfig();

    this.gameState.update(config => {
      const selectedValuePosition = config.selectedPosition.y * (xDimension * xDimension) + config.selectedPosition.x;
      const selectedValue = config.boardValues[selectedValuePosition];

      if (config.hintMode) {

        // If the selected position has a value on it, do not add hints to it, because the player won't be able to see them
        if (selectedValue !== '') {
          return config;
        }

        const setCharacterIndex = config.alphabet.findIndex(character => character === value);
        if (setCharacterIndex === -1) {
          return config;
        }

        const selectedPosition = config.selectedPosition.y * (xDimension * xDimension * xDimension * xDimension) + (config.selectedPosition.x * xDimension) + Math.floor(setCharacterIndex / xDimension) * (xDimension * xDimension * xDimension) + setCharacterIndex % xDimension;

        const newValue = config.boardHints[selectedPosition] === String(value) ? '' : String(value);
        return {
          ...config,
          boardHints: [
            ...config.boardHints.slice(0, selectedPosition),
            newValue,
            ...config.boardHints.slice(selectedPosition + 1)
          ]
        };
      }

      const newValue = selectedValue === String(value) ? '' : String(value);
      return {
        ...config,
        boardValues: [
          ...config.boardValues.slice(0, selectedValuePosition),
          newValue,
          ...config.boardValues.slice(selectedValuePosition + 1)
        ]
      };
    })
  }

  public updatePosition(position: { x: number, y: number }) {
    this.gameState.update(config => ({ ...config, selectedPosition: position }));
  }

  private setupDebug(): void {
    const PARAMS = this.boardConfig();

    const pane = new Pane();

    const generalFolder = pane.addFolder({
      title: 'General'
    });

    generalFolder.addBinding(PARAMS, 'height', { step: 1, min: 1 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, height: ev.value })));
    generalFolder.addBinding(PARAMS, 'width', { step: 1, min: 1 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, width: ev.value })));
    generalFolder.addBinding(PARAMS, 'clientWidth', { step: 1, min: 1 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, clientWidth: ev.value })));
    generalFolder.addBinding(PARAMS, 'clientHeight', { step: 1, min: 1 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, clientHeight: ev.value })));


    generalFolder.addBinding(PARAMS, 'backgroundColor').on('change', (ev) => this.preConfig.update(config => ({ ...config, backgroundColor: ev.value })));

    const gameFolder = pane.addFolder({
      title: 'Game Settings'
    });

    gameFolder.addBinding(PARAMS, 'xDimension', { step: 1, min: 1 }).on('change', (ev) => this.gameStateConfig.update(config => ({ ...config, xDimension: ev.value })));
    gameFolder.addBinding(PARAMS, 'yDimension', { step: 1, min: 1 }).on('change', (ev) => this.gameStateConfig.update(config => ({ ...config, yDimension: ev.value })));
    gameFolder.addBinding(PARAMS, 'givens', { step: 1, min: 0 }).on('change', (ev) => this.gameStateConfig.update(config => ({ ...config, givens: ev.value })));
    const seedBinding = gameFolder.addBinding(PARAMS, 'seed', { step: 1 }).on('change', (ev) => this.gameStateConfig.update(config => ({ ...config, seed: ev.value })));
    gameFolder.addButton({ title: 'new game' }).on('click', () => {
      PARAMS.seed = createRandomSeed();
      seedBinding.refresh();
    });
    gameFolder.addBinding(PARAMS, 'hintMode').on('change', (ev) => this.gameState.update(config => ({ ...config, hintMode: ev.value })));

    const mainFolder = pane.addFolder({
      title: 'Main Grid'
    });

    mainFolder.addBinding(PARAMS, 'mainBorderColor').on('change', (ev) => this.preConfig.update(config => ({ ...config, mainBorderColor: ev.value })));
    mainFolder.addBinding(PARAMS, 'mainGridBorderWidth', { step: 1, min: 0 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, mainGridBorderWidth: ev.value })));

    const valueFolder = pane.addFolder({
      title: 'Value Grid'
    });

    valueFolder.addBinding(PARAMS, 'valueFontSize', { step: 1, min: 1 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, valueFontSize: ev.value })));
    valueFolder.addBinding(PARAMS, 'valueFont').on('change', (ev) => this.preConfig.update(config => ({ ...config, valueFont: ev.value })));
    valueFolder.addBinding(PARAMS, 'valueFontColor').on('change', (ev) => this.preConfig.update(config => ({ ...config, valueFontColor: ev.value })));
    valueFolder.addBinding(PARAMS, 'valueGridBorderColor').on('change', (ev) => this.preConfig.update(config => ({ ...config, valueGridBorderColor: ev.value })));
    valueFolder.addBinding(PARAMS, 'valueGridBorderWidth', { step: 1, min: 0 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, valueGridBorderWidth: ev.value })));
    valueFolder.addBinding(PARAMS, 'renderTextBoundingBoxLineWidth', { step: 1, min: 0 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, renderTextBoundingBoxLineWidth: ev.value })));
    valueFolder.addBinding(PARAMS, 'renderTextBoundingBoxColor').on('change', (ev) => this.preConfig.update(config => ({ ...config, renderTextBoundingBoxColor: ev.value })));

    const hintFolder = pane.addFolder({
      title: 'Hint Grid'
    });

    hintFolder.addBinding(PARAMS, 'hintFontSize', { step: 1, min: 1 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, hintFontSize: ev.value })));
    hintFolder.addBinding(PARAMS, 'hintFont').on('change', (ev) => this.preConfig.update(config => ({ ...config, hintFont: ev.value })));
    hintFolder.addBinding(PARAMS, 'hintFontColor').on('change', (ev) => this.preConfig.update(config => ({ ...config, hintFontColor: ev.value })));
    hintFolder.addBinding(PARAMS, 'hintGridBorderWidth', { step: 1 }).on('change', (ev) => this.preConfig.update(config => ({ ...config, hintGridBorderWidth: ev.value })));
    hintFolder.addBinding(PARAMS, 'hintGridBorderColor').on('change', (ev) => this.preConfig.update(config => ({ ...config, hintGridBorderColor: ev.value })));

    const highlightFolder = pane.addFolder({
      title: 'Highlight Settings'
    });

    highlightFolder.addBinding(PARAMS, 'highlightColor').on('change', ev => this.preConfig.update(config => ({ ...config, highlightColor: ev.value })));
    highlightFolder.addBinding(PARAMS, 'selectedCellHighlightColor').on('change', ev => this.preConfig.update(config => ({ ...config, selectedCellHighlightColor: ev.value })));
    highlightFolder.addBinding(PARAMS, 'highlightFontColor').on('change', ev => this.preConfig.update(config => ({ ...config, highlightFontColor: ev.value })));

    const copyConfigsButton = pane.addButton({
      title: 'copy configs',
    });

    copyConfigsButton.on('click', () => navigator.clipboard.writeText(JSON.stringify(this.boardConfig())));
  }

  private executeAction(keyAction: KeyAction): void {
    const [type, value] = keyAction;

    switch (type) {
      case 'set': {
        this.set(value);
        return;
      }
      case 'move': {
        this.move(value);
        return;
      }
    }
  }

  private move(value: MoveDirection) {
    switch (value) {
      case 'left':
        this.moveLeft();
        return;
      case 'right':
        this.moveRight();
        return;
      case 'up':
        this.moveUp();
        return;
      case 'down':
        this.moveDown();
        return;
    }
  }

  private moveLeft(): void {
    this.gameState.update(gameState => {
      if (gameState.selectedPosition.x === 0) {
        return gameState;
      }

      return {
        ...gameState,
        selectedPosition: {
          ...gameState.selectedPosition,
          x: gameState.selectedPosition.x - 1
        }
      }
    });
  }

  private moveRight(): void {
    const { xDimension } = this.gameStateConfig();

    this.gameState.update(gameState => {
      if (gameState.selectedPosition.x < (xDimension * xDimension) - 1) {
        return {
          ...gameState,
          selectedPosition: {
            ...gameState.selectedPosition,
            x: gameState.selectedPosition.x + 1
          }
        }
      }

      return gameState;
    });
  }

  private moveUp(): void {
    this.gameState.update(gameState => {
      if (gameState.selectedPosition.y === 0) {
        return gameState;
      }

      return {
        ...gameState,
        selectedPosition: {
          ...gameState.selectedPosition,
          y: gameState.selectedPosition.y - 1
        }
      };
    });
  }

  private moveDown(): void {
    const { yDimension } = this.gameStateConfig();


    this.gameState.update(gameState => {
      if (gameState.selectedPosition.y < (yDimension * yDimension) - 1) {
        return {
          ...gameState,
          selectedPosition: {
            ...gameState.selectedPosition,
            y: gameState.selectedPosition.y + 1
          }
        }
      }

      return gameState;
    });
  }
}

