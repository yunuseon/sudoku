import type { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';
import { elapsed, isPaused, isStopped } from '../../logic/sudoku.logic';
import { formatElapsed } from '../format-elapsed';
import { BoardGeometry, center, Rect, segmentSize, segmentStart } from './board-geometry';

export type Point = { x: number; y: number };

export type TextStyle = { font: string; metrics: Map<string, TextMetrics> };

export type Fonts = {
  value: TextStyle;
  matchingValue: TextStyle;
  hint: TextStyle;
  overlay: TextStyle | null;
};

export type RenderTask =
  | { kind: 'fill'; rect: Rect; color: string }
  | { kind: 'line'; from: Point; to: Point; width: number; color: string }
  | { kind: 'outline'; rect: Rect; width: number; color: string }
  | { kind: 'text'; text: string; at: Point; font: string; color: string };

export type Frame = { config: BoardConfig; geometry: BoardGeometry; fonts: Fonts };

type Layer = (frame: Frame) => RenderTask[];

type Cell = { valueX: number; valueY: number; index: number };

const range = (length: number) => Array.from({ length }, (_, i) => i);

export const overlayText = (config: BoardConfig): string | null => {
  if (config.generating) {
    return 'Generating…';
  }

  if (isStopped(config.timer)) {
    return config.lost
      ? 'Out of mistakes'
      : `Solved in ${formatElapsed(elapsed(config.timer, config.timer.stoppedAt ?? 0))}`;
  }

  return isPaused(config.timer) ? 'Paused' : null;
};

const cells = (config: BoardConfig): Cell[] =>
  range(config.xDimension).flatMap(mainGridX =>
    range(config.yDimension).flatMap(mainGridY =>
      range(config.xDimension).flatMap(valueGridX =>
        range(config.yDimension).map(valueGridY => {
          const valueX = mainGridX * config.xDimension + valueGridX;
          const valueY = mainGridY * config.yDimension + valueGridY;
          return { valueX, valueY, index: valueY * config.xDimension * config.xDimension + valueX };
        })
      )
    )
  );

const highlighted = (config: BoardConfig) =>
  config.highlightedCells.map(
    (isHighlighted, i) =>
      isHighlighted || (config.highlightMatchingCells && config.matchingCells[i])
  );

const symbol = (
  text: string,
  at: Point,
  style: TextStyle,
  color: string,
  outline: { width: number; color: string } | null
): RenderTask[] => {
  const metrics = style.metrics.get(text);

  if (metrics === undefined) {
    return [];
  }

  const x = at.x + (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2;
  const y = at.y + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  const box: Rect = {
    x: x - metrics.actualBoundingBoxLeft,
    y: y - metrics.actualBoundingBoxAscent,
    width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
    height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  };

  return [
    { kind: 'text', text, at: { x, y }, font: style.font, color },
    ...(outline === null ? [] : [{ kind: 'outline' as const, rect: box, ...outline }])
  ];
};

const textOutline = (config: BoardConfig) =>
  config.renderTextBoundingBoxLineWidth > 0
    ? { width: config.renderTextBoundingBoxLineWidth, color: config.renderTextBoundingBoxColor }
    : null;

const grid = (
  rect: Rect,
  lines: { width: number; color: string; columns: number; rows: number }
): RenderTask[] => {
  const columnWidth = segmentSize(rect.width, lines.columns, lines.width);
  const rowHeight = segmentSize(rect.height, lines.rows, lines.width);
  const borderCenter = (start: number, index: number, size: number) =>
    segmentStart(start, index, size, lines.width) - lines.width / 2;
  const line = (from: Point, to: Point): RenderTask => ({
    kind: 'line',
    from,
    to,
    width: lines.width,
    color: lines.color
  });

  return [
    ...range(lines.rows - 1).map(i => {
      const y = borderCenter(rect.y, i + 1, rowHeight);
      return line({ x: rect.x, y }, { x: rect.x + rect.width, y });
    }),
    ...range(lines.columns - 1).map(i => {
      const x = borderCenter(rect.x, i + 1, columnWidth);
      return line({ x, y: rect.y }, { x, y: rect.y + rect.height });
    })
  ];
};

const valueColor = (config: BoardConfig, isHighlighted: boolean, index: number) => {
  if (config.wrongCells[index]) {
    return config.mistakeFontColor;
  }

  if (config.givens[index]) {
    return isHighlighted ? config.highlightFontColor : config.valueFontColor;
  }

  return isHighlighted ? config.enteredHighlightFontColor : config.enteredValueFontColor;
};

const background: Layer = ({ config }) => [
  {
    kind: 'fill',
    rect: { x: 0, y: 0, width: config.width, height: config.height },
    color: config.backgroundColor
  }
];

const highlights: Layer = ({ config, geometry }) => {
  const n = config.xDimension * config.xDimension;

  return [
    ...highlighted(config).flatMap((isHighlighted, i): RenderTask[] =>
      isHighlighted
        ? [
            {
              kind: 'fill',
              rect: geometry.valueGridRect(i % n, Math.floor(i / n)),
              color: config.highlightColor
            }
          ]
        : []
    ),
    {
      kind: 'fill',
      rect: geometry.valueGridRect(config.selectedPosition.x, config.selectedPosition.y),
      color: config.selectedCellHighlightColor
    }
  ];
};

const values: Layer = ({ config, geometry, fonts }) => {
  if (isPaused(config.timer)) {
    return [];
  }

  const isHighlighted = highlighted(config);

  return cells(config).flatMap(({ valueX, valueY, index }) => {
    const value = config.boardValues[index];

    return value === ''
      ? []
      : symbol(
          value,
          center(geometry.valueGridRect(valueX, valueY)),
          config.matchingCells[index] ? fonts.matchingValue : fonts.value,
          valueColor(config, isHighlighted[index], index),
          textOutline(config)
        );
  });
};

const noteGrids: Layer = ({ config, geometry }) =>
  isPaused(config.timer) || config.hintGridBorderWidth <= 0
    ? []
    : cells(config)
        .filter(({ index }) => config.boardValues[index] === '')
        .flatMap(({ valueX, valueY }) =>
          grid(geometry.valueGridRect(valueX, valueY), {
            width: config.hintGridBorderWidth,
            color: config.hintGridBorderColor,
            columns: config.xDimension,
            rows: config.yDimension
          })
        );

const notes: Layer = ({ config, geometry, fonts }) => {
  if (isPaused(config.timer)) {
    return [];
  }

  const n = config.xDimension * config.xDimension;

  return cells(config)
    .filter(({ index }) => config.boardValues[index] === '')
    .flatMap(({ valueX, valueY }) =>
      range(config.xDimension).flatMap(hintGridX =>
        range(config.yDimension).flatMap(hintGridY => {
          const hintX = valueX * config.xDimension + hintGridX;
          const hintY = valueY * config.yDimension + hintGridY;
          const hint = config.boardHints[hintY * n * config.xDimension + hintX];

          return hint === ''
            ? []
            : symbol(
                hint,
                center(geometry.hintGridRect(valueX, valueY, hintGridX, hintGridY)),
                fonts.hint,
                config.hintFontColor,
                textOutline(config)
              );
        })
      )
    );
};

const cellLines: Layer = ({ config, geometry }) =>
  config.valueGridBorderWidth <= 0
    ? []
    : range(config.xDimension).flatMap(mainGridX =>
        range(config.yDimension).flatMap(mainGridY =>
          grid(geometry.mainGridRect(mainGridX, mainGridY), {
            width: config.valueGridBorderWidth,
            color: config.valueGridBorderColor,
            columns: config.xDimension,
            rows: config.yDimension
          })
        )
      );

const boxLines: Layer = ({ config, geometry }) => {
  const width = config.mainGridBorderWidth;

  if (width <= 0) {
    return [];
  }

  return [
    ...grid(geometry.board, {
      width,
      color: config.mainBorderColor,
      columns: config.xDimension,
      rows: config.yDimension
    }),
    {
      kind: 'outline',
      rect: {
        x: width / 2,
        y: width / 2,
        width: config.width - width,
        height: config.height - width
      },
      width,
      color: config.mainBorderColor
    }
  ];
};

const overlay: Layer = ({ config, fonts }) => {
  const text = overlayText(config);

  if (text === null || fonts.overlay === null) {
    return [];
  }

  return [
    {
      kind: 'fill',
      rect: { x: 0, y: 0, width: config.width, height: config.height },
      color: config.overlayColor
    },
    ...symbol(
      text,
      { x: config.width / 2, y: config.height / 2 },
      fonts.overlay,
      config.overlayFontColor,
      null
    )
  ];
};

const layers: Layer[] = [
  background,
  highlights,
  values,
  noteGrids,
  notes,
  cellLines,
  boxLines,
  overlay
];

export const scene = (frame: Frame): RenderTask[] => layers.flatMap(layer => layer(frame));
