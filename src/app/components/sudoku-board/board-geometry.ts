import type { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';
import { Position } from '../../logic/sudoku.logic';

export type Rect = { x: number; y: number; width: number; height: number };

export const segmentSize = (length: number, count: number, gap: number) =>
  (length - (count - 1) * gap) / count;
export const segmentStart = (start: number, index: number, size: number, gap: number) =>
  start + index * (size + gap);

export const center = (rect: Rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

export const boardGeometry = (config: {
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

export type BoardGeometry = ReturnType<typeof boardGeometry>;

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

export const positionAt = (
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
