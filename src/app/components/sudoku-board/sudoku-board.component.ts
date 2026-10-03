import { afterRenderEffect, Component, ElementRef, inject, input } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { filter, fromEvent, map } from 'rxjs';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';
import { elapsed, isPaused, isStopped, Position } from '../../logic/sudoku.logic';
import { formatElapsed } from '../format-elapsed';

type Rect = { x: number; y: number; width: number; height: number };

const segmentSize = (length: number, count: number, gap: number) =>
  (length - (count - 1) * gap) / count;
const segmentStart = (start: number, index: number, size: number, gap: number) =>
  start + index * (size + gap);

const center = (rect: Rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

const boardGeometry = (config: {
  width: number;
  height: number;
  xDimension: number;
  yDimension: number;
  mainGridBorderWidth: number;
  valueGridBorderWidth: number;
  hintGridBorderWidth: number;
}) => {
  const mainGrid = {
    width: segmentSize(
      config.width - 2 * config.mainGridBorderWidth,
      config.xDimension,
      config.mainGridBorderWidth
    ),
    height: segmentSize(
      config.height - 2 * config.mainGridBorderWidth,
      config.yDimension,
      config.mainGridBorderWidth
    )
  };

  const valueGrid = {
    width: segmentSize(mainGrid.width, config.xDimension, config.valueGridBorderWidth),
    height: segmentSize(mainGrid.height, config.yDimension, config.valueGridBorderWidth)
  };

  const hintGrid = {
    width: segmentSize(valueGrid.width, config.xDimension, config.hintGridBorderWidth),
    height: segmentSize(valueGrid.height, config.yDimension, config.hintGridBorderWidth)
  };

  const board: Rect = {
    x: config.mainGridBorderWidth,
    y: config.mainGridBorderWidth,
    width: config.width - 2 * config.mainGridBorderWidth,
    height: config.height - 2 * config.mainGridBorderWidth
  };

  const mainGridRect = (mainGridX: number, mainGridY: number): Rect => ({
    x: segmentStart(board.x, mainGridX, mainGrid.width, config.mainGridBorderWidth),
    y: segmentStart(board.y, mainGridY, mainGrid.height, config.mainGridBorderWidth),
    ...mainGrid
  });

  const valueGridRect = (valueX: number, valueY: number): Rect => {
    const main = mainGridRect(
      Math.floor(valueX / config.xDimension),
      Math.floor(valueY / config.yDimension)
    );

    return {
      x: segmentStart(
        main.x,
        valueX % config.xDimension,
        valueGrid.width,
        config.valueGridBorderWidth
      ),
      y: segmentStart(
        main.y,
        valueY % config.yDimension,
        valueGrid.height,
        config.valueGridBorderWidth
      ),
      ...valueGrid
    };
  };

  const hintGridRect = (
    valueX: number,
    valueY: number,
    hintGridX: number,
    hintGridY: number
  ): Rect => {
    const value = valueGridRect(valueX, valueY);

    return {
      x: segmentStart(value.x, hintGridX, hintGrid.width, config.hintGridBorderWidth),
      y: segmentStart(value.y, hintGridY, hintGrid.height, config.hintGridBorderWidth),
      ...hintGrid
    };
  };

  return { board, mainGrid, valueGrid, hintGrid, mainGridRect, valueGridRect, hintGridRect };
};

type BoardGeometry = ReturnType<typeof boardGeometry>;

const valueIndexAt = (
  pixel: number,
  start: number,
  count: number,
  mainGridSize: number,
  mainGridBorderWidth: number,
  valueGridSize: number,
  valueGridBorderWidth: number
): number | null => {
  const local = pixel - start;
  const mainIndex = Math.floor(local / (mainGridSize + mainGridBorderWidth));
  const inMainGrid = local - mainIndex * (mainGridSize + mainGridBorderWidth);

  if (local < 0 || mainIndex >= count || inMainGrid >= mainGridSize) {
    return null;
  }

  const valueIndex = Math.floor(inMainGrid / (valueGridSize + valueGridBorderWidth));
  const inValueGrid = inMainGrid - valueIndex * (valueGridSize + valueGridBorderWidth);

  return inValueGrid >= valueGridSize ? null : mainIndex * count + valueIndex;
};

const positionAt = (
  geometry: BoardGeometry,
  config: BoardConfig,
  x: number,
  y: number
): Position | null => {
  const valueX = valueIndexAt(
    x,
    geometry.board.x,
    config.xDimension,
    geometry.mainGrid.width,
    config.mainGridBorderWidth,
    geometry.valueGrid.width,
    config.valueGridBorderWidth
  );
  const valueY = valueIndexAt(
    y,
    geometry.board.y,
    config.yDimension,
    geometry.mainGrid.height,
    config.mainGridBorderWidth,
    geometry.valueGrid.height,
    config.valueGridBorderWidth
  );

  return valueX === null || valueY === null ? null : { x: valueX, y: valueY };
};

const highlightCells = (
  context: CanvasRenderingContext2D,
  geometry: BoardGeometry,
  highlightedCells: boolean[],
  selectedPosition: Position,
  config: {
    xDimension: number;
    highlightColor: string;
    selectedCellHighlightColor: string;
  }
): void => {
  const n = config.xDimension * config.xDimension;

  const fillValueGrid = (valueX: number, valueY: number) => {
    const rect = geometry.valueGridRect(valueX, valueY);
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  };

  context.fillStyle = config.highlightColor;
  highlightedCells.forEach(
    (isHighlighted, i) => isHighlighted && fillValueGrid(i % n, Math.floor(i / n))
  );

  context.fillStyle = config.selectedCellHighlightColor;
  fillValueGrid(selectedPosition.x, selectedPosition.y);
};

const drawGrid = (
  context: CanvasRenderingContext2D,
  rect: Rect,
  config: {
    lineWidth: number;
    gridColor: string;
    verticalSegmentation: number;
    horizontalSegmentation: number;
  }
): void => {
  context.lineWidth = config.lineWidth;
  context.strokeStyle = config.gridColor;

  const segmentWidth = segmentSize(rect.width, config.verticalSegmentation, config.lineWidth);
  const segmentHeight = segmentSize(rect.height, config.horizontalSegmentation, config.lineWidth);

  const borderCenter = (start: number, index: number, size: number) =>
    segmentStart(start, index, size, config.lineWidth) - config.lineWidth / 2;

  new Array(config.horizontalSegmentation - 1).fill(0).forEach((_, i) => {
    const y = borderCenter(rect.y, i + 1, segmentHeight);
    drawLine(context, { x: rect.x, y }, { x: rect.x + rect.width, y });
  });

  new Array(config.verticalSegmentation - 1).fill(0).forEach((_, i) => {
    const x = borderCenter(rect.x, i + 1, segmentWidth);
    drawLine(context, { x, y: rect.y }, { x, y: rect.y + rect.height });
  });
};

const drawLine = (
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number }
): void => {
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
};

const fitFontSize = (
  context: CanvasRenderingContext2D,
  font: string,
  alphabet: string[],
  box: Box
): number => {
  const measuringFontSize = box.height;
  context.font = `bold ${measuringFontSize}px ${font}`;

  const largestSymbol = alphabet
    .map(symbol => context.measureText(symbol))
    .reduce(
      (largest, metrics) => ({
        width: Math.max(
          largest.width,
          metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
        ),
        height: Math.max(
          largest.height,
          metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        )
      }),
      { width: 0, height: 0 }
    );

  return (
    measuringFontSize * Math.min(box.width / largestSymbol.width, box.height / largestSymbol.height)
  );
};

type Box = { width: number; height: number };

const paddedBox = ({ width, height }: Box, paddingRatio: number): Box => ({
  width: width * (1 - 2 * paddingRatio),
  height: height * (1 - 2 * paddingRatio)
});

type SymbolMetrics = Map<string, TextMetrics>;

const measureSymbols = (
  context: CanvasRenderingContext2D,
  font: string,
  alphabet: string[]
): SymbolMetrics => {
  context.font = font;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  return new Map(alphabet.map(symbol => [symbol, context.measureText(symbol)]));
};

type SymbolStyle = {
  font: string;
  color: string;
  metrics: SymbolMetrics;
  boundingBoxColor: string;
  boundingBoxLineWidth: number;
};

const drawSymbol = (
  context: CanvasRenderingContext2D,
  symbol: string,
  center: { x: number; y: number },
  style: SymbolStyle
): void => {
  context.font = style.font;
  context.fillStyle = style.color;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  const metrics = style.metrics.get(symbol) ?? context.measureText(symbol);

  const x = center.x + (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2;
  const y = center.y + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;

  context.fillText(symbol, x, y);

  if (style.boundingBoxLineWidth > 0) {
    context.strokeStyle = style.boundingBoxColor;
    context.lineWidth = style.boundingBoxLineWidth;
    context.strokeRect(
      x - metrics.actualBoundingBoxLeft,
      y - metrics.actualBoundingBoxAscent,
      metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    );
  }
};

const valueColor = (config: BoardConfig, highlighted: boolean[], index: number) => {
  if (config.wrongCells[index]) {
    return config.mistakeFontColor;
  }

  if (config.givens[index]) {
    return highlighted[index] ? config.highlightFontColor : config.valueFontColor;
  }

  return highlighted[index] ? config.enteredHighlightFontColor : config.enteredValueFontColor;
};

const endText = (config: BoardConfig) =>
  config.lost
    ? 'Out of mistakes'
    : `Solved in ${formatElapsed(elapsed(config.timer, config.timer.stoppedAt ?? 0))}`;

const drawOverlay = (context: CanvasRenderingContext2D, config: BoardConfig, text: string) => {
  context.fillStyle = config.overlayColor;
  context.fillRect(0, 0, config.width, config.height);

  const fontSize = fitFontSize(
    context,
    config.valueFont,
    [text],
    paddedBox({ width: config.width, height: config.height / 5 }, config.cellPaddingRatio)
  );
  const font = `bold ${fontSize}px ${config.valueFont}`;

  drawSymbol(
    context,
    text,
    { x: config.width / 2, y: config.height / 2 },
    {
      font,
      color: config.overlayFontColor,
      metrics: measureSymbols(context, font, [text]),
      boundingBoxColor: config.renderTextBoundingBoxColor,
      boundingBoxLineWidth: 0
    }
  );
};

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

    context.fillStyle = config.backgroundColor;
    context.fillRect(0, 0, config.width, config.height);

    const valueFontSize = fitFontSize(
      context,
      config.valueFont,
      config.alphabet,
      paddedBox(geometry.valueGrid, config.cellPaddingRatio)
    );
    const hintFontSize = fitFontSize(
      context,
      config.hintFont,
      config.alphabet,
      paddedBox(geometry.hintGrid, config.cellPaddingRatio)
    );

    const valueFont = `${valueFontSize}px ${config.valueFont}`;
    const matchingValueFont = `bold ${valueFontSize}px ${config.valueFont}`;
    const hintFont = `${hintFontSize}px ${config.hintFont}`;

    const valueMetrics = measureSymbols(context, valueFont, config.alphabet);
    const matchingValueMetrics = measureSymbols(context, matchingValueFont, config.alphabet);
    const hintMetrics = measureSymbols(context, hintFont, config.alphabet);

    const hintStyle: SymbolStyle = {
      font: hintFont,
      metrics: hintMetrics,
      color: config.hintFontColor,
      boundingBoxColor: config.renderTextBoundingBoxColor,
      boundingBoxLineWidth: config.renderTextBoundingBoxLineWidth
    };

    const highlighted = config.highlightedCells.map(
      (isHighlighted, i) =>
        isHighlighted || (config.highlightMatchingCells && config.matchingCells[i])
    );

    highlightCells(context, geometry, highlighted, config.selectedPosition, {
      xDimension: config.xDimension,
      highlightColor: config.highlightColor,
      selectedCellHighlightColor: config.selectedCellHighlightColor
    });

    new Array(config.xDimension).fill(0).forEach((_, mainGridX) => {
      new Array(config.yDimension).fill(0).forEach((_, mainGridY) => {
        new Array(config.xDimension).fill(0).forEach((_, valueGridX) => {
          new Array(config.yDimension).fill(0).forEach((_, valueGridY) => {
            const valueX = mainGridX * config.xDimension + valueGridX;
            const valueY = mainGridY * config.yDimension + valueGridY;

            const boardIndex = valueY * (config.xDimension * config.xDimension) + valueX;
            const val = config.boardValues[boardIndex];

            if (isPaused(config.timer)) {
              return;
            }

            if (val !== '') {
              const isMatching = config.matchingCells[boardIndex];

              drawSymbol(context, val, center(geometry.valueGridRect(valueX, valueY)), {
                font: isMatching ? matchingValueFont : valueFont,
                metrics: isMatching ? matchingValueMetrics : valueMetrics,
                color: valueColor(config, highlighted, boardIndex),
                boundingBoxColor: config.renderTextBoundingBoxColor,
                boundingBoxLineWidth: config.renderTextBoundingBoxLineWidth
              });

              return;
            }

            if (config.hintGridBorderWidth > 0) {
              drawGrid(context, geometry.valueGridRect(valueX, valueY), {
                lineWidth: config.hintGridBorderWidth,
                gridColor: config.hintGridBorderColor,
                horizontalSegmentation: config.yDimension,
                verticalSegmentation: config.xDimension
              });
            }

            new Array(config.xDimension).fill(0).forEach((_, hintGridX) => {
              new Array(config.yDimension).fill(0).forEach((_, hintGridY) => {
                const hintX = valueX * config.xDimension + hintGridX;
                const hintY = valueY * config.yDimension + hintGridY;

                const hintIndex =
                  hintY * (config.xDimension * config.xDimension * config.xDimension) + hintX;
                const hint = config.boardHints[hintIndex];

                if (hint !== '') {
                  drawSymbol(
                    context,
                    hint,
                    center(geometry.hintGridRect(valueX, valueY, hintGridX, hintGridY)),
                    hintStyle
                  );
                }
              });
            });
          });
        });

        if (config.valueGridBorderWidth > 0) {
          drawGrid(context, geometry.mainGridRect(mainGridX, mainGridY), {
            lineWidth: config.valueGridBorderWidth,
            gridColor: config.valueGridBorderColor,
            horizontalSegmentation: config.yDimension,
            verticalSegmentation: config.xDimension
          });
        }
      });
    });

    if (config.mainGridBorderWidth > 0) {
      drawGrid(context, geometry.board, {
        lineWidth: config.mainGridBorderWidth,
        gridColor: config.mainBorderColor,
        verticalSegmentation: config.xDimension,
        horizontalSegmentation: config.yDimension
      });

      context.strokeStyle = config.mainBorderColor;
      context.lineWidth = config.mainGridBorderWidth;
      context.strokeRect(
        config.mainGridBorderWidth / 2,
        config.mainGridBorderWidth / 2,
        config.width - config.mainGridBorderWidth,
        config.height - config.mainGridBorderWidth
      );
    }

    if (config.generating) {
      drawOverlay(context, config, 'Generating…');
    } else if (isStopped(config.timer)) {
      drawOverlay(context, config, endText(config));
    } else if (isPaused(config.timer)) {
      drawOverlay(context, config, 'Paused');
    }
  }
}
