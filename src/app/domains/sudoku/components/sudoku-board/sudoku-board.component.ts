import { afterNextRender, Component, effect, ElementRef, inject, Injector, input, signal } from '@angular/core';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';



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

  public readonly config = input.required<BoardConfig>();


  constructor() {
    afterNextRender(() => {
      effect(() => {
        this.render();
      }, { injector: this.injector })
    });
  }

  private render(): void {
    console.log('render');
    const config = this.config();

    const context = this.canvas.getContext('2d')!;

    // draw background
    context.fillStyle = config.backgroundColor;
    context.fillRect(0, 0, config.width, config.height);

    // draw main grid



    const subGridWidth = (config.width - (config.xDimension + 1) * config.mainGridBorderWidth) / config.xDimension;
    const subGridHeight = (config.height - (config.yDimension + 1) * config.mainGridBorderWidth) / config.yDimension;


    if (config.subGridBorderWidth > 0) {
      // render subgrid
      new Array(config.xDimension).fill(0).forEach((_, x) => {
        new Array(config.yDimension).fill(0).forEach((_, y) => {
          drawGrid(context, {
            x0: (x + 1) * config.mainGridBorderWidth + x * subGridWidth,
            x1: (x + 1) * config.mainGridBorderWidth + (x + 1) * subGridWidth,
            y0: (y + 1) * config.mainGridBorderWidth + y * subGridHeight,
            y1: (y + 1) * config.mainGridBorderWidth + (y + 1) * subGridHeight
          }, {
            lineWidth: config.subGridBorderWidth,
            gridColor: config.subGridBorderColor,
            horizontalSegmentation: config.yDimension,
            verticalSegmentation: config.xDimension
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
        verticalSegmentation: config.xDimension,
        horizontalSegmentation: config.yDimension
      });
    }

    const subSubGridWidth = subGridWidth / config.xDimension;
    const subSubGridHeight = subGridHeight / config.yDimension;


    // render board values
    context.font = `${config.valueFontSize}px ${config.valueFont}`;
    context.fillStyle = config.valueFontColor;
    context.textAlign = 'center';
    context.textBaseline = 'top';

    context.strokeStyle = config.renderTextBoundingBoxColor;
    context.lineWidth = config.renderTextBoundingBoxLineWidth;

    config.boardValues.forEach((val, i) => {
      if (val.length === 0) return;

      const { x, y } = boardIndexToBoardGridCoordinate(i, config.xDimension, config.yDimension);
      console.log(`(${x}, ${y})`);

      const cummulativeMainGridWidth = (Math.floor(x / config.xDimension) + 1) * config.mainGridBorderWidth;
      const cummulativeMainGridHeight = (Math.floor(y / config.yDimension) + 1) * config.mainGridBorderWidth;

      const textMetrics = context.measureText(val);
      const textRenderHeight = textMetrics.actualBoundingBoxAscent - textMetrics.actualBoundingBoxDescent;


      const alX = (x + 1) * (subSubGridWidth) - (subSubGridWidth / 2) + cummulativeMainGridWidth;
      const alY = (y + 1) * (subSubGridHeight) - (subSubGridHeight / 2) + cummulativeMainGridHeight + textRenderHeight / 2;

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
    });

    /*

    // render hint values

    const subSubSubGridWidth = subSubGridWidth / config.xDimension;
    const subSubSubGridHeight = subSubGridHeight / config.yDimension;

    context.font = `${config.hintFontSize}px ${config.hintFont}`;
    context.fillStyle = config.hintFontColor;
    context.textAlign = 'center';
    context.textBaseline = 'top';

    context.strokeStyle = config.renderTextBoundingBoxColor;
    context.lineWidth = config.renderTextBoundingBoxLineWidth;

    config.boardHints.forEach((val, i) => {
      if (val.length === 0) return;

      const { x, y } = boardHintIndexToBoardGridCoordinate(i, config.xDimension, config.yDimension);
      console.log(`Hint coord (${x}, ${y}): ${val}`);

      const cummulativeMainGridWidth = (Math.floor(x / (config.xDimension * config.xDimension)) + 1) * config.mainGridBorderWidth;
      const cummulativeMainGridHeight = (Math.floor(y / (config.yDimension * config.yDimension)) + 1) * config.mainGridBorderWidth;

      const textMetrics = context.measureText(val);
      const textRenderHeight = textMetrics.actualBoundingBoxAscent - textMetrics.actualBoundingBoxDescent;


      const alX = (x + 1) * (subSubSubGridWidth) - (subSubSubGridWidth / 2) + cummulativeMainGridWidth;
      const alY = (y + 1) * (subSubSubGridHeight) - (subSubSubGridHeight / 2) + cummulativeMainGridHeight + textRenderHeight / 2;

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
    });

    */

    if (config.subSubGridBorderWidth > 0) {
      // render subgrid
      new Array(config.xDimension).fill(0).forEach((_, mainGridX) => {
        new Array(config.yDimension).fill(0).forEach((_, mainGridY) => {

          new Array(config.xDimension).fill(0).forEach((_, valueGridX) => {
            new Array(config.yDimension).fill(0).forEach((_, valueGridY) => {
              const mainGridWidthSum = (mainGridX + 1) * config.mainGridBorderWidth;

              drawGrid(context, {
                x0: (mainGridX * subGridWidth) + (mainGridX + 1) * config.mainGridBorderWidth + valueGridX * subSubGridWidth,
                x1: (mainGridX * subGridHeight) + (mainGridX + 1) * config.mainGridBorderWidth + (valueGridX + 1) * subSubGridWidth,
                y0: (mainGridY * subGridWidth) + (mainGridY + 1) * config.mainGridBorderWidth + valueGridY * subSubGridHeight,
                y1: (mainGridY * subGridHeight) + (mainGridY + 1) * config.mainGridBorderWidth + (valueGridY + 1) * subSubGridHeight
              }, {
                lineWidth: config.subSubGridBorderWidth,
                gridColor: config.subSubGridBorderColor,
                horizontalSegmentation: config.yDimension,
                verticalSegmentation: config.xDimension
              })
            })
          })
        })
      });
    }

    // draw outer border
    context.strokeStyle = config.mainBorderColor;
    context.lineWidth = config.mainGridBorderWidth;

    context.beginPath();
    context.moveTo(0,0);

    context.lineTo(
      config.width - (config.mainGridBorderWidth / 2),
      0 + (config.mainGridBorderWidth / 2)
    );
    context.lineTo(
      config.width -  (config.mainGridBorderWidth / 2),
      config.height -  (config.mainGridBorderWidth / 2)
    );
    context.lineTo(
      0 +  (config.mainGridBorderWidth / 2),
      config.height -  (config.mainGridBorderWidth / 2)
    );
    context.closePath();
    context.stroke();
  }
}

const boardIndexToBoardGridCoordinate = (index: number, xDimension: number, yDimension: number) => ({
  x: index % (xDimension * xDimension),
  y: Math.floor(index / (xDimension * xDimension))
});

const boardHintIndexToBoardGridCoordinate = (index: number, xDimension: number, yDimension: number) => {
  return {
    x: index % (xDimension * xDimension * xDimension),
    y: Math.floor(index / (xDimension * xDimension * xDimension))
  }
}
