import { afterNextRender, Component, DestroyRef, effect, ElementRef, inject, Injector, input, signal } from '@angular/core';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';
import { fromEvent, map } from 'rxjs';
import { outputFromObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';

const drawGrid = (context: CanvasRenderingContext2D, coords: {
  x0: number; x1: number; y0: number; y1: number;
},
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

  const horizontalLines = new Array(config.horizontalSegmentation - 1).fill(0).map((_, i) => {
    const segmentHeight = (height - config.lineWidth) / config.horizontalSegmentation;
    const segmentY = (i + 1) * segmentHeight + config.lineWidth / 2;

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


  horizontalLines.forEach(({ from, to }) => drawLine(context, from, to));

  const verticalLines = new Array(config.verticalSegmentation - 1).fill(0).map((_, i) => {
    const segmentHeight = (width - config.lineWidth) / config.verticalSegmentation;
    const segmentX = (i + 1) * segmentHeight + config.lineWidth / 2;

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


  verticalLines.forEach(({ from, to }) => drawLine(context, from, to));
}

const drawLine = (context: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }): void => {
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
  private readonly destroyRef = inject(DestroyRef);

  public readonly config = input.required<BoardConfig>();

  private readonly selectPosition$ = fromEvent<MouseEvent>(this.canvas, 'click').pipe(
    map((event) => {
      const config = this.config();

      const elementRelativeX = event.offsetX;
      const elementRelativeY = event.offsetY;
      const canvasRelativeX = elementRelativeX * this.canvas.width / this.canvas.clientWidth;
      const canvasRelativeY = elementRelativeY * this.canvas.height / this.canvas.clientHeight;

      const mainGridWidth = (config.width - (config.xDimension + 1) * config.mainGridBorderWidth) / config.xDimension;
      const mainGridHeight = (config.height - (config.yDimension + 1) * config.mainGridBorderWidth) / config.yDimension;

      const valueGridWidth = mainGridWidth / config.xDimension;
      const valueGridHeight = mainGridHeight / config.yDimension;

      return {
        x: Math.floor(canvasRelativeX / valueGridWidth),
        y: Math.floor(canvasRelativeY / valueGridHeight),
      }
    })
  );

  public readonly selectPosition = outputFromObservable(this.selectPosition$);

  constructor() {
    afterNextRender(() => {
      effect(() => {
        this.render();
      }, { injector: this.injector });
    });
  }

  private render(): void {
    const config = this.config();

    const context = this.canvas.getContext('2d')!;

    // draw background
    context.fillStyle = config.backgroundColor;
    context.fillRect(0, 0, config.width, config.height);

    const mainGridWidth = (config.width - (config.xDimension + 1) * config.mainGridBorderWidth) / config.xDimension;
    const mainGridHeight = (config.height - (config.yDimension + 1) * config.mainGridBorderWidth) / config.yDimension;

    const valueGridWidth = mainGridWidth / config.xDimension;
    const valueGridHeight = mainGridHeight / config.yDimension;

    const hintGridWidth = valueGridWidth / config.xDimension;
    const hintGridHeight = valueGridHeight / config.yDimension;



    // draw main grid
    new Array(config.xDimension).fill(0).forEach((_, mainGridX) => {
      new Array(config.yDimension).fill(0).forEach((_, mainGridY) => {

        // render subgrid
        new Array(config.xDimension).fill(0).forEach((_, valueGridX) => {
          new Array(config.yDimension).fill(0).forEach((_, valueGridY) => {

            const valueX = mainGridX * config.xDimension + valueGridX;
            const valueY = mainGridY * config.yDimension + valueGridY;

            const boardIndex = valueY * (config.xDimension * config.xDimension) + valueX;
            const val = config.boardValues[boardIndex];

            if (config.selectedPosition.x === valueX && config.selectedPosition.y === valueY) {
              // highlight selected tile
              context.fillStyle = '#f0a05033';
              context.fillRect(
                (mainGridX * mainGridWidth) + (mainGridX + 1) * config.mainGridBorderWidth + valueGridX * valueGridWidth,
                (mainGridY * mainGridHeight) + (mainGridY + 1) * config.mainGridBorderWidth + valueGridY * valueGridHeight,
                valueGridWidth,
                valueGridHeight
              );
            }

            if (val !== '') {
              // RENDER VALUE
              context.font = `${config.valueFontSize}px ${config.valueFont}`;
              context.fillStyle = config.valueFontColor;
              context.textAlign = 'center';
              context.textBaseline = 'top';

              context.strokeStyle = config.renderTextBoundingBoxColor;
              context.lineWidth = config.renderTextBoundingBoxLineWidth;

              const cummulativeMainGridWidth = (Math.floor(valueX / config.xDimension) + 1) * config.mainGridBorderWidth;
              const cummulativeMainGridHeight = (Math.floor(valueY / config.yDimension) + 1) * config.mainGridBorderWidth;

              const textMetrics = context.measureText(val);
              const textRenderHeight = textMetrics.actualBoundingBoxAscent - textMetrics.actualBoundingBoxDescent;


              const alX = (valueX + 1) * (valueGridWidth) - (valueGridWidth / 2) + cummulativeMainGridWidth;
              const alY = (valueY + 1) * (valueGridHeight) - (valueGridHeight / 2) + cummulativeMainGridHeight + textRenderHeight / 2;

              context.fillText(
                val,
                alX,
                alY,
              );

              if (config.renderTextBoundingBoxLineWidth > 0) {
                context.beginPath();
                context.moveTo(
                  alX - textMetrics.actualBoundingBoxLeft,
                  alY - textMetrics.actualBoundingBoxAscent
                );
                context.lineTo(
                  alX + textMetrics.actualBoundingBoxRight,
                  alY - textMetrics.actualBoundingBoxAscent
                );
                context.lineTo(
                  alX + textMetrics.actualBoundingBoxRight,
                  alY + textMetrics.actualBoundingBoxDescent
                );
                context.lineTo(
                  alX - textMetrics.actualBoundingBoxLeft,
                  alY + textMetrics.actualBoundingBoxDescent
                );
                context.closePath();
                context.stroke();
              }


              // RENDER VALUE
            } else {
              // RENDER HINT

              context.font = `${config.hintFontSize}px ${config.hintFont}`;
              context.fillStyle = config.hintFontColor;
              context.textAlign = 'center';
              context.textBaseline = 'top';

              context.strokeStyle = config.renderTextBoundingBoxColor;
              context.lineWidth = config.renderTextBoundingBoxLineWidth;

              if (config.hintGridBorderWidth > 0) {
                drawGrid(context, {
                  x0: (mainGridX * mainGridWidth) + (mainGridX + 1) * config.mainGridBorderWidth + valueGridX * valueGridWidth,
                  x1: (mainGridX * mainGridWidth) + (mainGridX + 1) * config.mainGridBorderWidth + (valueGridX + 1) * valueGridWidth,
                  y0: (mainGridY * mainGridHeight) + (mainGridY + 1) * config.mainGridBorderWidth + valueGridY * valueGridHeight,
                  y1: (mainGridY * mainGridHeight) + (mainGridY + 1) * config.mainGridBorderWidth + (valueGridY + 1) * valueGridHeight
                }, {
                  lineWidth: config.hintGridBorderWidth,
                  gridColor: config.hintGridBorderColor,
                  horizontalSegmentation: config.yDimension,
                  verticalSegmentation: config.xDimension
                });
              }


              new Array(config.xDimension).fill(0).forEach((_, hintGridX) => {
                new Array(config.yDimension).fill(0).forEach((_, hintGridY) => {

                  const hintX = mainGridX * config.xDimension * config.xDimension + valueGridX * config.xDimension + hintGridX;
                  const hintY = mainGridY * config.yDimension * config.yDimension + valueGridY * config.yDimension + hintGridY;

                  const cummulativeMainGridWidth = (Math.floor(hintX / (config.xDimension * config.xDimension)) + 1) * config.mainGridBorderWidth;
                  const cummulativeMainGridHeight = (Math.floor(hintY / (config.yDimension * config.yDimension)) + 1) * config.mainGridBorderWidth;

                  const hintIndex = hintY * (config.xDimension * config.xDimension * config.xDimension) + hintX;
                  const hint = config.boardHints[hintIndex];

                  const textMetrics = context.measureText(hint);
                  const textRenderHeight = textMetrics.actualBoundingBoxAscent - textMetrics.actualBoundingBoxDescent;

                  const alX = (hintX + 1) * (hintGridWidth) - (hintGridWidth / 2) + cummulativeMainGridWidth;
                  const alY = (hintY + 1) * (hintGridHeight) - (hintGridHeight / 2) + cummulativeMainGridHeight + textRenderHeight / 2;

                  context.fillText(
                    hint,
                    alX,
                    alY,
                  );

                  if (config.renderTextBoundingBoxLineWidth > 0) {
                    context.beginPath();
                    context.moveTo(
                      alX - textMetrics.actualBoundingBoxLeft,
                      alY - textMetrics.actualBoundingBoxAscent
                    );
                    context.lineTo(
                      alX + textMetrics.actualBoundingBoxRight,
                      alY - textMetrics.actualBoundingBoxAscent
                    );
                    context.lineTo(
                      alX + textMetrics.actualBoundingBoxRight,
                      alY + textMetrics.actualBoundingBoxDescent
                    );
                    context.lineTo(
                      alX - textMetrics.actualBoundingBoxLeft,
                      alY + textMetrics.actualBoundingBoxDescent
                    );
                    context.closePath();
                    context.stroke();
                  }
                })

              })

              //  RENDER HINT
            }



          })
        })

        if (config.valueGridBorderWidth > 0) {

          drawGrid(context, {
            x0: (mainGridX + 1) * config.mainGridBorderWidth + mainGridX * mainGridWidth,
            x1: (mainGridX + 1) * config.mainGridBorderWidth + (mainGridX + 1) * mainGridWidth,
            y0: (mainGridY + 1) * config.mainGridBorderWidth + mainGridY * mainGridHeight,
            y1: (mainGridY + 1) * config.mainGridBorderWidth + (mainGridY + 1) * mainGridHeight
          }, {
            lineWidth: config.valueGridBorderWidth,
            gridColor: config.valueGridBorderColor,
            horizontalSegmentation: config.yDimension,
            verticalSegmentation: config.xDimension
          });
        }

      })
    });




    if (config.mainGridBorderWidth > 0) {

      // render main grid
      drawGrid(context, {
        x0: 0, x1: config.width, y0: 0, y1: config.height
      }, {
        lineWidth: config.mainGridBorderWidth,
        gridColor: config.mainBorderColor,
        verticalSegmentation: config.xDimension,
        horizontalSegmentation: config.yDimension
      });
    }

    // draw outer border
    context.strokeStyle = config.mainBorderColor;
    context.lineWidth = config.mainGridBorderWidth;

    context.beginPath();
    context.moveTo(
      config.mainGridBorderWidth / 2,
      config.mainGridBorderWidth / 2
    );

    context.lineTo(
      config.width - (config.mainGridBorderWidth / 2),
      0 + (config.mainGridBorderWidth / 2)
    );
    context.lineTo(
      config.width - (config.mainGridBorderWidth / 2),
      config.height - (config.mainGridBorderWidth / 2)
    );
    context.lineTo(
      0 + (config.mainGridBorderWidth / 2),
      config.height - (config.mainGridBorderWidth / 2)
    );
    context.closePath();
    context.stroke();
  }
}
