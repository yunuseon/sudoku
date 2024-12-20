import { afterNextRender, Component, computed, linkedSignal, signal } from '@angular/core';
import { Pane } from 'tweakpane';
import { PageDirective } from '../../../../core/directives/page.directive';
import { SudokuBoardComponent } from '../../components/sudoku-board/sudoku-board.component';

const gameSettings = {
  "xDimension": 3,
  "yDimension": 3,
};

const boardSettings = {
  "height": 1000,
  "width": 1000,
  "clientWidth": 800,
  "clientHeight": 800,
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
}

export type BoardConfig = ReturnType<PageSudokuComponent['boardConfig']>;

@Component({
  selector: 'hks-page-sudoku',
  imports: [SudokuBoardComponent],
  templateUrl: './page-sudoku.component.html',
  styleUrl: './page-sudoku.component.scss',
  hostDirectives: [PageDirective]
})
export class PageSudokuComponent {

  private readonly dimensionConfig = signal(gameSettings);
  private readonly preConfig = signal(boardSettings);

  private readonly gameState = linkedSignal(() => {
    const config = this.dimensionConfig();

    return {
      boardValues: new Array(
        config.xDimension * config.xDimension *
        config.yDimension * config.yDimension
      ).fill(''),
      boardHints: new Array(
        config.xDimension * config.xDimension * config.xDimension *
        config.yDimension * config.yDimension * config.yDimension
      ).fill(''),
      selectedPosition: {
        x: 0,
        y: 0
      }
    };
  })

  public readonly boardConfig = computed(() => ({
    ...this.dimensionConfig(),
    ...this.preConfig(),
    ...this.gameState(),
  }));

  constructor() {
    afterNextRender(() => {
      this.setupDebug();
    });
  }

  public set(value: string) {
    const {xDimension} = this.dimensionConfig();

    this.gameState.update(config => {
      const selectedPosition = config.selectedPosition.y * (xDimension * xDimension) + config.selectedPosition.x;

      return {
        ...config, boardValues: [
          ...config.boardValues.slice(0, selectedPosition),
          String(value),
          ...config.boardValues.slice(selectedPosition + 1)
        ]
      };
    })
  }

  updatePosition(position: { x: number, y: number }) {
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
    generalFolder.addBinding(PARAMS, 'backgroundColor').on('change', (ev) => this.preConfig.update(config => ({ ...config, backgroundColor: ev.value })));

    const gameFolder = pane.addFolder({
      title: 'Game Settings'
    });

    gameFolder.addBinding(PARAMS, 'xDimension', { step: 1, min: 1 }).on('change', (ev) => this.dimensionConfig.update(config => ({ ...config, xDimension: ev.value })));
    gameFolder.addBinding(PARAMS, 'yDimension', { step: 1, min: 1 }).on('change', (ev) => this.dimensionConfig.update(config => ({ ...config, yDimension: ev.value })));

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

    const copyConfigsButton = pane.addButton({
      title: 'copy configs',
    });

    copyConfigsButton.on('click', () => navigator.clipboard.writeText(JSON.stringify(this.boardConfig())));
  }
}

