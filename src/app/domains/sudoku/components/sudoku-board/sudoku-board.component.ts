import { afterNextRender, Component, effect, ElementRef, inject, Injector, input, signal } from '@angular/core';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';



const drawGrid = (context: CanvasRenderingContext2D, coords: {
  x0: number; x1: number; y0: number; y1: number;},
  config: {
    lineWidth: number;
    gridColor: string;
    verticalSegmentation: number;
    horizontalSegmentation: number;
  }): void => {
  context.lineWidth = config.lineWidth;
  context.strokeStyle = config.gridColor;

  const width = coords.x1 - coords.x0;
  const height = coords.y1 - coords.y0;

  const horizontalLines = new Array(config.horizontalSegmentation + 1).fill(0).map((_, i) => {
    const segmentHeight = (height - config.lineWidth) / config.horizontalSegmentation;
    const segmentY = i * segmentHeight + config.lineWidth / 2;


    return {
      from: {
        x: 0 + coords.x0,
        y: segmentY + coords.y0
      },
      to: {
        x: width + coords.x0,
        y: coords.y0 + segmentY
      }
    } as const
  })


  horizontalLines.forEach(({from, to}) => drawLine(context, from, to));

  const verticalLines = new Array(config.verticalSegmentation + 1).fill(0).map((_, i) => {
    const segmentHeight = (width - config.lineWidth) / config.verticalSegmentation;
    const segmentX = i * segmentHeight + config.lineWidth / 2;

    return {
      from: {
        x: segmentX + coords.x0,
        y: 0 + coords.y0
      },
      to: {
        x: segmentX + coords.x0,
        y: height + coords.y0
      }
    } as const
  })


  verticalLines.forEach(({from, to}) => drawLine(context, from, to));
}

const drawLine = (context: CanvasRenderingContext2D, from: {x: number; y: number}, to: {x: number; y: number}): void => {
  // console.log(`(${from.x}, ${from.y}) ->`, `(${to.x}, ${to.y})`);
  context.beginPath(); // Start a new path
  context.moveTo(from.x, from.y); // Move the pen to (30, 50)
  context.lineTo(to.x, to.y); // Draw a line to (150, 100)
  context.stroke(); // Render the path
}

@Component({
  selector: 'canvas[hks-sudoku-board]',
  imports: [],
  templateUrl: './sudoku-board.component.html',
  styleUrl: './sudoku-board.component.scss',
  host: {
    '[attr.width]': 'config().width',
    '[attr.height]': 'config().height',
    '[style.width.px]': '800',
    '[style.height.px]': '800'
  }
})
export class SudokuBoardComponent {
  private readonly canvas = inject(ElementRef).nativeElement as HTMLCanvasElement;
  private readonly injector = inject(Injector);

  public readonly config = input.required<BoardConfig>();


  constructor() {
    afterNextRender(() => {
      effect(() => {
        this.render();
      }, { injector: this.injector})
    });


  }

  private render(): void {
    console.log('rendered');
    const config = this.config();

    const context = this.canvas.getContext('2d')!;

    // draw background
    context.fillStyle = config.backgroundColor;
    context.fillRect(0, 0, config.width, config.height);

    // draw main grid



    if (config.subGridBorderWidth > 0) {
    // render subgrid

    const subGridWidth = (config.width - (config.verticalSegmentation + 1) * config.mainGridBorderWidth) / config.verticalSegmentation;
    const subGridHeight = (config.height - (config.horizontalSegmentation + 1) * config.mainGridBorderWidth) / config.horizontalSegmentation;


    new Array(config.verticalSegmentation).fill(0).forEach((_, x) => {
      new Array(config.horizontalSegmentation).fill(0).forEach((_, y) => {
        drawGrid(context, {
          x0: (x + 1) * config.mainGridBorderWidth - config.subGridBorderWidth + x * subGridWidth,
          x1: (x + 1) * config.mainGridBorderWidth + config.subGridBorderWidth + (x + 1) * subGridWidth,
          y0: (y + 1) * config.mainGridBorderWidth - config.subGridBorderWidth + y * subGridHeight,
          y1: (y + 1) * config.mainGridBorderWidth + config.subGridBorderWidth + (y + 1) * subGridHeight
        }, {
          lineWidth: config.subGridBorderWidth,
          gridColor: config.subGridBorderColor,
          horizontalSegmentation: config.horizontalSegmentation,
          verticalSegmentation: config.verticalSegmentation
        })
      })
    });
    }




    if (config.mainGridBorderWidth > 0) {

    // render main grid
    drawGrid(context, {
      x0: 0, x1: config.width, y0: 0, y1: config.height
    }, {
      lineWidth: config.mainGridBorderWidth,
      gridColor: config.mainBorderColor,
      verticalSegmentation: config.verticalSegmentation,
      horizontalSegmentation: config.horizontalSegmentation
    });
    }

  }


}
