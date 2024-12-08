import { afterNextRender, Component, signal } from '@angular/core';
import { PageDirective } from '../../../../core/directives/page.directive';
import { SudokuBoardComponent } from '../../components/sudoku-board/sudoku-board.component';
import { Pane } from 'tweakpane';

const defaultBoardConfig = {
  height: 2000,
  width: 2000,
  mainGridBorderWidth: 8,
  subGridBorderWidth: 4,
  subSubGridBorderWidth: 2,
  xDimension: 3,
  yDimension: 3,

  backgroundColor: '#ffffff',
  mainBorderColor: '#000000',
  subGridBorderColor: '#ff0000',
  subSubGridBorderColor: '#666666',

  valueFontSize: 220,
  valueFont: 'monospace',
  valueFontColor: '#ff00ff',

  hintFontSize: 30,
  hintFont: 'monospace',
  hintFontColor: '#2070a0',

  renderTextBoundingBoxLineWidth: 1,
  renderTextBoundingBoxColor: '#00ff00',

  boardValues: [
    '', '1', '2', '3', '', '', '6', '', '8',
    '0', '1', '2', '3', '4', '5', '6', '7', '8',
    '0', '1', '2', '3', '4', '5', '6', '7', '8',
    '0', '1', '2', '3', '4', '5', '6', '7', '8',
    '0', '1', '2', '3', '4', '5', '6', '7', '8',
    '0', '1', '2', '3', '4', '5', '6', '7', '8',
    '0', '1', '2', '3', '4', '5', '6', '7', '8',
    '0', '1', '2', '3', '4', '5', '6', '7', '8',
    '0', '1', '2', '3', '4', '5', '6', '7', '8',
  ],
  boardHints: [
    '1', '2', '3', '4', '5', '6', '7', '8', '9',
  ]
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
      const PARAMS = this.boardConfig();

      const pane = new Pane();

      const generalFolder = pane.addFolder({
        title: 'General'
      });

      generalFolder.addBinding(PARAMS, 'height', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, height: ev.value })));
      generalFolder.addBinding(PARAMS, 'width', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, width: ev.value })));
      generalFolder.addBinding(PARAMS, 'subGridBorderWidth', { step: 1, min: 0 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, subGridBorderWidth: ev.value })));
      generalFolder.addBinding(PARAMS, 'xDimension', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, xDimension: ev.value })));
      generalFolder.addBinding(PARAMS, 'yDimension', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, yDimension: ev.value })));
      generalFolder.addBinding(PARAMS, 'backgroundColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, backgroundColor: ev.value })));


      const mainFolder = pane.addFolder({
        title: 'Main'
      });

      mainFolder.addBinding(PARAMS, 'mainBorderColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, mainBorderColor: ev.value })));
      mainFolder.addBinding(PARAMS, 'mainGridBorderWidth', { step: 1, min: 0 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, mainGridBorderWidth: ev.value })));


      const valueFolder = pane.addFolder({
        title: 'Value'
      });

      valueFolder.addBinding(PARAMS, 'valueFontSize', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, valueFontSize: ev.value })));
      valueFolder.addBinding(PARAMS, 'valueFont').on('change', (ev) => this.boardConfig.update(config => ({ ...config, valueFont: ev.value })));
      valueFolder.addBinding(PARAMS, 'valueFontColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, valueFontColor: ev.value })));
      valueFolder.addBinding(PARAMS, 'subGridBorderColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, subGridBorderColor: ev.value })));
      valueFolder.addBinding(PARAMS, 'subSubGridBorderWidth', {step: 1}).on('change', (ev) => this.boardConfig.update(config => ({ ...config, subSubGridBorderWidth: ev.value })));
      valueFolder.addBinding(PARAMS, 'subSubGridBorderColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, subSubGridBorderColor: ev.value })));
      valueFolder.addBinding(PARAMS, 'renderTextBoundingBoxLineWidth', { step: 1, min: 0}).on('change', (ev) => this.boardConfig.update(config => ({ ...config, renderTextBoundingBoxLineWidth: ev.value })));
      valueFolder.addBinding(PARAMS, 'renderTextBoundingBoxColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, renderTextBoundingBoxColor: ev.value })));



      const hintFolder = pane.addFolder({
        title: 'Hint'
      });

      hintFolder.addBinding(PARAMS, 'hintFontSize', { step: 1, min: 1 }).on('change', (ev) => this.boardConfig.update(config => ({ ...config, hintFontSize: ev.value })));
      hintFolder.addBinding(PARAMS, 'hintFont').on('change', (ev) => this.boardConfig.update(config => ({ ...config, hintFont: ev.value })));
      hintFolder.addBinding(PARAMS, 'hintFontColor').on('change', (ev) => this.boardConfig.update(config => ({ ...config, hintFontColor: ev.value })));




    })
  }
}

