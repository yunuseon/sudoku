import { afterRenderEffect, Component, ElementRef, inject, input } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { filter, fromEvent, map } from 'rxjs';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';

const highlightCells = (context: CanvasRenderingContext2D, highlightedCells: boolean[], selectedX: number, selectedY: number, config: {
  xDimension: number;
  yDimension: number;
  mainGridBorderWidth: number;
  width: number;
  height: number;
  highlightColor: string;
  selectedCellHighlightColor: string;
}): void => {
  const mainGridWidth = (config.width - (config.xDimension + 1) * config.mainGridBorderWidth) / config.xDimension;
  const mainGridHeight = (config.height - (config.yDimension + 1) * config.mainGridBorderWidth) / config.yDimension;

  const valueGridWidth = mainGridWidth / config.xDimension;
  const valueGridHeight = mainGridHeight / config.yDimension;

  const getBoardPixelX = (x: number) => {
    const mainGridX = Math.floor(x / config.xDimension);
    return (mainGridX * mainGridWidth) + (mainGridX + 1) * config.mainGridBorderWidth + (x % config.xDimension) * valueGridWidth
  };

  const getBoardPixelY = (y: number) => {
    const mainGridY = Math.floor(y / config.yDimension);
    return (mainGridY * mainGridHeight) + (mainGridY + 1) * config.mainGridBorderWidth + (y % config.yDimension) * valueGridHeight
  };

  const n = config.xDimension * config.xDimension;

  context.fillStyle = config.highlightColor;

  highlightedCells.forEach((isHighlighted, i) => {
    if (!isHighlighted) {
      return;
    }

    context.fillRect(
      getBoardPixelX(i % n),
      getBoardPixelY(Math.floor(i / n)),
      valueGridWidth,
      valueGridHeight
    );
  });

  context.fillStyle = config.selectedCellHighlightColor;
  context.fillRect(
    getBoardPixelX(selectedX),
    getBoardPixelY(selectedY),
    valueGridWidth,
    valueGridHeight
  );
}

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


const drawValue = (context: CanvasRenderingContext2D, value: string, isMatching: boolean, isHighlighted: boolean, valueX: number, valueY: number, config: {
  valueFontSize: number;
  valueFont: string;
  valueFontColor: string;
  highlightFontColor: string;
  renderTextBoundingBoxColor: string;
  renderTextBoundingBoxLineWidth: number;
  xDimension: number;
  mainGridBorderWidth: number;
  yDimension: number;
  width: number;
  height: number;
}) => {
  context.font = `${config.valueFontSize}px ${config.valueFont}`;
  context.fillStyle = config.valueFontColor;
  context.textAlign = 'center';
  context.textBaseline = 'top';

  context.strokeStyle = config.renderTextBoundingBoxColor;
  context.lineWidth = config.renderTextBoundingBoxLineWidth;


  const mainGridWidth = (config.width - (config.xDimension + 1) * config.mainGridBorderWidth) / config.xDimension;
  const mainGridHeight = (config.height - (config.yDimension + 1) * config.mainGridBorderWidth) / config.yDimension;

  const valueGridWidth = mainGridWidth / config.xDimension;
  const valueGridHeight = mainGridHeight / config.yDimension;

  const cummulativeMainGridWidth = (Math.floor(valueX / config.xDimension) + 1) * config.mainGridBorderWidth;
  const cummulativeMainGridHeight = (Math.floor(valueY / config.yDimension) + 1) * config.mainGridBorderWidth;


  context.font = isMatching ? `bold ${config.valueFontSize}px ${config.valueFont}` : `${config.valueFontSize}px ${config.valueFont}`;
  context.fillStyle = isHighlighted ? config.highlightFontColor : config.valueFontColor;
  context.textAlign = 'center';
  context.textBaseline = 'top';

  context.strokeStyle = config.renderTextBoundingBoxColor;
  context.lineWidth = config.renderTextBoundingBoxLineWidth;

  const textMetrics = context.measureText(value);
  const textRenderHeight = textMetrics.actualBoundingBoxAscent - textMetrics.actualBoundingBoxDescent;

  const alX = (valueX + 1) * (valueGridWidth) - (valueGridWidth / 2) + cummulativeMainGridWidth;
  const alY = (valueY + 1) * (valueGridHeight) - (valueGridHeight / 2) + cummulativeMainGridHeight + textRenderHeight / 2;

  context.fillText(
    value,
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

}


@Component({
  selector: 'canvas[hks-sudoku-board]',
  imports: [],
  templateUrl: './sudoku-board.component.html',
  styleUrl: './sudoku-board.component.scss',
  host: {
    '[attr.width]': 'config().width',
    '[attr.height]': 'config().height',
    '[style.width.px]': 'config().clientWidth',
    '[style.height.px]': 'config().clientHeight'
  }
})
export class SudokuBoardComponent {
  private readonly canvas = inject(ElementRef).nativeElement as HTMLCanvasElement;

  public readonly config = input.required<BoardConfig>();

  private readonly selectPosition$ = fromEvent<MouseEvent>(this.canvas, 'click').pipe(
    map((event) => {
      const config = this.config();

      const elementRelativeX = event.offsetX;
      const elementRelativeY = event.offsetY;

      const x = elementRelativeX * this.canvas.width / this.canvas.clientWidth;
      const y = elementRelativeY * this.canvas.height / this.canvas.clientHeight;

      const mainGridBorderWidth = config.mainGridBorderWidth;

      const cellBorderWidth = config.valueGridBorderWidth;

      const mainGridSizeX = (config.width - mainGridBorderWidth * (config.xDimension + 1)) / config.xDimension;
      const mainGridSizeY = (config.height - mainGridBorderWidth * (config.yDimension + 1)) / config.yDimension;

      const cellSizeX = (mainGridSizeX - cellBorderWidth * (config.xDimension + 1)) / config.xDimension;
      const cellSizeY = (mainGridSizeY - cellBorderWidth * (config.yDimension + 1)) / config.yDimension;

      for (let j = 0; j <= config.yDimension; j++) {
        for (let i = 0; i <= config.xDimension; i++) {
          const borderPositionX = i * (mainGridSizeX + mainGridBorderWidth);
          const borderPositionY = j * (mainGridSizeY + mainGridBorderWidth);
          if (x >= borderPositionX && x <= borderPositionX + mainGridBorderWidth ||
            y >= borderPositionY && y <= borderPositionY + mainGridBorderWidth) {
            return null;
          }
        }
      }

      const gridX = Math.floor(x / (mainGridSizeX + mainGridBorderWidth));
      const gridY = Math.floor(y / (mainGridSizeY + mainGridBorderWidth));
      const localX = x % (mainGridSizeX + mainGridBorderWidth) - mainGridBorderWidth;
      const localY = y % (mainGridSizeY + mainGridBorderWidth) - mainGridBorderWidth;

      if (localX < 0 || localY < 0) {
        return null
      }

      const cellX = Math.floor(localX / (cellSizeX + cellBorderWidth));
      const cellY = Math.floor(localY / (cellSizeY + cellBorderWidth));
      const cellLocalX = localX % (cellSizeX + cellBorderWidth);
      const cellLocalY = localY % (cellSizeY + cellBorderWidth);

      if (cellLocalX < cellBorderWidth || cellLocalY < cellBorderWidth) {
        return null;
      }

      return {
        x: gridX * config.xDimension + cellX,
        y: gridY * config.yDimension + cellY
      };
    }),
    filter(Boolean)
  );

  public readonly selectPosition = outputFromObservable(this.selectPosition$);

  constructor() {
    afterRenderEffect(() => this.render());
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


    // draw highlight

    // highlight selected tile
    highlightCells(context, config.highlightedCells, config.selectedPosition.x, config.selectedPosition.y, {
      xDimension: config.xDimension,
      yDimension: config.yDimension,
      mainGridBorderWidth: config.mainGridBorderWidth,
      width: config.width,
      height: config.height,
      highlightColor: config.highlightColor,
      selectedCellHighlightColor: config.selectedCellHighlightColor
    });


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

            if (val !== '') {
              drawValue(context, val, config.matchingCells[boardIndex], config.highlightedCells[boardIndex], valueX, valueY, {
                valueFontSize: config.valueFontSize,
                valueFont: config.valueFont,
                valueFontColor: config.valueFontColor,
                highlightFontColor: config.highlightFontColor,
                renderTextBoundingBoxColor: config.renderTextBoundingBoxColor,
                renderTextBoundingBoxLineWidth: config.renderTextBoundingBoxLineWidth,
                xDimension: config.xDimension,
                mainGridBorderWidth: config.mainGridBorderWidth,
                yDimension: config.yDimension,
                width: config.width,
                height: config.height,
              });

            } else {
              // RENDER HINT
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

              context.font = `${config.hintFontSize}px ${config.hintFont}`;
              context.fillStyle = config.hintFontColor;
              context.textAlign = 'center';
              context.textBaseline = 'top';

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
