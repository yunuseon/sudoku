import { afterNextRender, Component, signal } from '@angular/core';
import { Pane } from 'tweakpane';
import { PageDirective } from '../../../../core/directives/page.directive';
import { SudokuBoardComponent } from '../../components/sudoku-board/sudoku-board.component';

const defaultBoardConfig = {
  "height": 1000,
  "width": 1000,
  "clientWidth": 800,
  "clientHeight": 800,
  "xDimension": 3,
  "yDimension": 3,
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

  boardValues: new Array(3 * 3 * 3 * 3).fill('1'),
  boardHints: new Array(3 * 3 * 3 * 2 * 3 * 3).fill('1'),
  selectedPosition: {
    x: 0,
    y: 0
  }
};

export type BoardConfig = typeof defaultBoardConfig;

@Component({
  selector: 'hks-page-sudoku',
  imports: [SudokuBoardComponent],
  templateUrl: './page-sudoku.component.html',
  styleUrl: './page-sudoku.component.scss',
  hostDirectives: [PageDirective]
})
export class PageSudokuComponent {

  public readonly boardConfig = signal(defaultBoardConfig);

  constructor() {
    afterNextRender(() => {
      this.setupDebug();
    });
  }

  public set(value: string) {
    this.boardConfig.update(config => {
      const selectedPosition = config.selectedPosition.y * (config.xDimension * config.xDimension) + config.selectedPosition.x;

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
    this.boardConfig.update(config => ({ ...config, selectedPosition: position }));
  }


  private setupDebug(): void {
    const PARAMS = this.boardConfig();

    const pane = new Pane();


    const btn = pane.addButton({
      title: 'copy configs',
    });

    btn.on('click', (x) => {
      navigator.clipboard.writeText(JSON.stringify(this.boardConfig()));
    });

    const generalFolder = pane.addFolder({
      title: 'General'
    });

    generalFolder.addBinding(PARAMS, 'height', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, height: ev.value })));
    generalFolder.addBinding(PARAMS, 'width', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, width: ev.value })));
    generalFolder.addBinding(PARAMS, 'xDimension', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, xDimension: ev.value })));
    generalFolder.addBinding(PARAMS, 'yDimension', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, yDimension: ev.value })));
    generalFolder.addBinding(PARAMS, 'backgroundColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, backgroundColor: ev.value })));

    const mainFolder = pane.addFolder({
      title: 'Main Grid'
    });

    mainFolder.addBinding(PARAMS, 'mainBorderColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, mainBorderColor: ev.value })));
    mainFolder.addBinding(PARAMS, 'mainGridBorderWidth', { step: 1, min: 0 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, mainGridBorderWidth: ev.value })));

    const valueFolder = pane.addFolder({
      title: 'Value Grid'
    });

    valueFolder.addBinding(PARAMS, 'valueFontSize', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, valueFontSize: ev.value })));
    valueFolder.addBinding(PARAMS, 'valueFont').on('change', (ev) => this.boardConfig.update(config => ({ ...config, valueFont: ev.value })));
    valueFolder.addBinding(PARAMS, 'valueFontColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, valueFontColor: ev.value })));
    valueFolder.addBinding(PARAMS, 'valueGridBorderColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, valueGridBorderColor: ev.value })));
    valueFolder.addBinding(PARAMS, 'valueGridBorderWidth', { step: 1, min: 0 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, valueGridBorderWidth: ev.value })));
    valueFolder.addBinding(PARAMS, 'renderTextBoundingBoxLineWidth', { step: 1, min: 0 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, renderTextBoundingBoxLineWidth: ev.value })));
    valueFolder.addBinding(PARAMS, 'renderTextBoundingBoxColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, renderTextBoundingBoxColor: ev.value })));

    const hintFolder = pane.addFolder({
      title: 'Hint Grid'
    });

    hintFolder.addBinding(PARAMS, 'hintFontSize', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, hintFontSize: ev.value })));
    hintFolder.addBinding(PARAMS, 'hintFont').on('change', (ev) => this.boardConfig.update(config => ({ ...config, hintFont: ev.value })));
    hintFolder.addBinding(PARAMS, 'hintFontColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, hintFontColor: ev.value })));
    hintFolder.addBinding(PARAMS, 'hintGridBorderWidth', { step: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, hintGridBorderWidth: ev.value })));
    hintFolder.addBinding(PARAMS, 'hintGridBorderColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, hintGridBorderColor: ev.value })));
  }
}

