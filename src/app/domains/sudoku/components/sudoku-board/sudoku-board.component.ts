import { afterNextRender, Component, effect, ElementRef, inject, Injector, signal } from '@angular/core';

const boardConfigs = {
  height: 2000,
  width: 2000,
  mainGridWidth: 8,
  subGridWidth: 4,

  backgroundColor: '#ffffff',
  mainBorderColor: '#000000'
}

const drawGrid = (context: CanvasRenderingContext2D, coords: {
  x0: number; x1: number; y0: number; y1: number;}, config: {lineWidth: number; gridColor: string;}): void => {
  context.lineWidth = config.lineWidth;
  context.strokeStyle = config.gridColor;

  const width = coords.x1 - coords.x0;
  const height = coords.y1 - coords.y0;

  const horizontalLines = new Array(4).fill(0).map((_, i) => {
    const segmentHeight = (height - config.lineWidth) / 3;
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

  const verticalLines = new Array(4).fill(0).map((_, i) => {
    const segmentHeight = (width - config.lineWidth) / 3;
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
  console.log(`(${from.x}, ${from.y}) ->`, `(${to.x}, ${to.y})`);
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
    '[attr.width]': 'configs().width',
    '[attr.height]': 'configs().height',
    '[style.width.px]': '800',
    '[style.height.px]': '800'
  }
})
export class SudokuBoardComponent {
  private readonly canvas = inject(ElementRef).nativeElement as HTMLCanvasElement;
  private readonly injector = inject(Injector);
  private readonly configs = signal(boardConfigs);


  constructor() {
    afterNextRender(() => {
      effect(() => {
        this.render();
      }, { injector: this.injector})
    });


  }

  private render(): void {
    console.log('rendered');
    const config = this.configs();

    const context = this.canvas.getContext('2d')!;

    // draw background
    context.fillStyle = config.backgroundColor;
    context.fillRect(0, 0, config.width, config.height);

    // draw main grid



    const subGridWidth = (config.width - 4 * config.mainGridWidth) / 3;
    const subGridHeight = (config.height - 4 * config.mainGridWidth) / 3


    // render subgrid
    new Array(3).fill(0).forEach((_, x) => {
      new Array(3).fill(0).forEach((_, y) => {
        drawGrid(context, {
          x0: (x + 1) * config.mainGridWidth - config.subGridWidth + x * subGridWidth,
          x1: (x + 1) * config.mainGridWidth + config.subGridWidth + (x + 1) * subGridWidth,
          y0: (y + 1) * config.mainGridWidth - config.subGridWidth + y * subGridWidth,
          y1: (y + 1) * config.mainGridWidth + config.subGridWidth + (y + 1) * subGridHeight
        }, {
          lineWidth: config.subGridWidth,
          gridColor: 'grey'
        })
      })
    });



    // render main grid
    drawGrid(context, {
      x0: 0, x1: config.width, y0: 0, y1: config.height
    }, {lineWidth: config.mainGridWidth, gridColor: config.mainBorderColor});
  }


}
