import type { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';
import { BoardGeometry } from './board-geometry';
import { RenderTask, Fonts, overlayText, TextStyle } from './board-scene';

type Box = { width: number; height: number };

const paddedBox = ({ width, height }: Box, paddingRatio: number): Box => ({
  width: width * (1 - 2 * paddingRatio),
  height: height * (1 - 2 * paddingRatio)
});

const fitFontSize = (
  context: CanvasRenderingContext2D,
  font: string,
  symbols: string[],
  box: Box
): number => {
  const measuringFontSize = box.height;
  context.font = `bold ${measuringFontSize}px ${font}`;

  const largestSymbol = symbols
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

const textStyle = (
  context: CanvasRenderingContext2D,
  font: string,
  symbols: string[]
): TextStyle => {
  context.font = font;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  return { font, metrics: new Map(symbols.map(symbol => [symbol, context.measureText(symbol)])) };
};

export const measureFonts = (
  context: CanvasRenderingContext2D,
  config: BoardConfig,
  geometry: BoardGeometry
): Fonts => {
  const valueSize = fitFontSize(
    context,
    config.valueFont,
    config.alphabet,
    paddedBox(geometry.valueGrid, config.cellPaddingRatio)
  );
  const hintSize = fitFontSize(
    context,
    config.hintFont,
    config.alphabet,
    paddedBox(geometry.hintGrid, config.cellPaddingRatio)
  );
  const text = overlayText(config);
  const overlaySize =
    text === null
      ? 0
      : fitFontSize(
          context,
          config.valueFont,
          [text],
          paddedBox({ width: config.width, height: config.height / 5 }, config.cellPaddingRatio)
        );

  return {
    value: textStyle(context, `${valueSize}px ${config.valueFont}`, config.alphabet),
    matchingValue: textStyle(context, `bold ${valueSize}px ${config.valueFont}`, config.alphabet),
    hint: textStyle(context, `${hintSize}px ${config.hintFont}`, config.alphabet),
    overlay:
      text === null ? null : textStyle(context, `bold ${overlaySize}px ${config.valueFont}`, [text])
  };
};

const draw = (context: CanvasRenderingContext2D, command: RenderTask) => {
  switch (command.kind) {
    case 'fill':
      context.fillStyle = command.color;
      context.fillRect(command.rect.x, command.rect.y, command.rect.width, command.rect.height);
      return;
    case 'line':
      context.lineWidth = command.width;
      context.strokeStyle = command.color;
      context.beginPath();
      context.moveTo(command.from.x, command.from.y);
      context.lineTo(command.to.x, command.to.y);
      context.stroke();
      return;
    case 'outline':
      context.lineWidth = command.width;
      context.strokeStyle = command.color;
      context.strokeRect(command.rect.x, command.rect.y, command.rect.width, command.rect.height);
      return;
    case 'text':
      context.font = command.font;
      context.fillStyle = command.color;
      context.fillText(command.text, command.at.x, command.at.y);
  }
};

export const paint = (context: CanvasRenderingContext2D, commands: RenderTask[]) => {
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  commands.forEach(command => draw(context, command));
};
