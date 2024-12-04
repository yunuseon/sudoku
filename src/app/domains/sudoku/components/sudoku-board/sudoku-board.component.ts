import { afterNextRender, Component, effect, ElementRef, inject, Injector, signal } from '@angular/core';

const boardConfigs = {
  height: 2000,
  width: 2000,
  mainBoarderWidth: 8,
  backgroundColor: '#ffffff',
  mainBorderColor: '#000000'
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

    // draw horizontal lines
    context.lineWidth = config.mainBoarderWidth;
    context.strokeStyle = config.mainBorderColor;


    const horizontalLines = new Array(4).fill(0).map((_, i) => {
      const segmentHeight = (config.height - config.mainBoarderWidth) / 3;
      const segmentY = i * segmentHeight + config.mainBoarderWidth / 2;

      return {
        from: {
          x: 0,
          y: segmentY
        },
        to: {
          x: config.width,
          y: segmentY
        }
      } as const
    })


    horizontalLines.forEach(({from, to}) => drawLine(context, from, to));


    const verticalLines = new Array(4).fill(0).map((_, i) => {
      const segmentHeight = (config.width - config.mainBoarderWidth) / 3;
      const segmentX = i * segmentHeight + config.mainBoarderWidth / 2;

      return {
        from: {
          x: segmentX,
          y: 0
        },
        to: {
          x: segmentX,
          y: config.height
        }
      } as const
    })


    verticalLines.forEach(({from, to}) => drawLine(context, from, to));
  }


}
