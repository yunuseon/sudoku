import { afterRenderEffect, Component, ElementRef, inject, input } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { filter, fromEvent, map } from 'rxjs';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';
import { boardGeometry, positionAt } from './board-geometry';
import { measureFonts, paint } from './board-paint';
import { scene } from './board-scene';

@Component({
  selector: 'canvas[hks-sudoku-board]',
  imports: [],
  templateUrl: './sudoku-board.component.html',
  styleUrl: './sudoku-board.component.scss',
  host: {
    '[attr.width]': 'Math.round(config().clientWidth * config().pixelRatio)',
    '[attr.height]': 'Math.round(config().clientHeight * config().pixelRatio)',
    '[style.width.px]': 'config().clientWidth',
    '[style.height.px]': 'config().clientHeight'
  }
})
export class SudokuBoardComponent {
  private readonly canvas = inject<ElementRef<HTMLCanvasElement>>(ElementRef).nativeElement;

  public readonly config = input.required<BoardConfig>();

  protected readonly Math = Math;

  private readonly selectPosition$ = fromEvent<MouseEvent>(this.canvas, 'click').pipe(
    map(event => {
      const config = this.config();

      const x = (event.offsetX * config.width) / this.canvas.clientWidth;
      const y = (event.offsetY * config.height) / this.canvas.clientHeight;

      return positionAt(boardGeometry(config), config, x, y);
    }),
    filter(Boolean)
  );

  public readonly selectPosition = outputFromObservable(this.selectPosition$);

  constructor() {
    afterRenderEffect(() => this.render());
  }

  private render(): void {
    const config = this.config();
    const geometry = boardGeometry(config);
    const context = this.canvas.getContext('2d')!;

    context.setTransform(
      this.canvas.width / config.width,
      0,
      0,
      this.canvas.height / config.height,
      0,
      0
    );

    paint(context, scene({ config, geometry, fonts: measureFonts(context, config, geometry) }));
  }
}
