import { boardGeometry } from './board-geometry';
import { RenderTask, Fonts, scene, TextStyle } from './board-scene';
import { createPageState, toBoardConfig } from '../../pages/page-sudoku/page-sudoku.component';
import { GameAction, gameReducer } from '../../logic/sudoku.logic';

const metrics = {
  actualBoundingBoxLeft: 5,
  actualBoundingBoxRight: 5,
  actualBoundingBoxAscent: 10,
  actualBoundingBoxDescent: 0
} as TextMetrics;

const style = (font: string): TextStyle => ({
  font,
  metrics: new Map(
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Paused'].map(symbol => [symbol, metrics])
  )
});

const fonts: Fonts = {
  value: style('value'),
  matchingValue: style('matching'),
  hint: style('hint'),
  overlay: style('overlay')
};

const start = createPageState(1, 0);
const open = start.game.givens.flatMap((isGiven, cell) => (isGiven ? [] : [cell]));
const given = start.game.givens.findIndex(Boolean);

const play = (state: typeof start, ...actions: GameAction[]) =>
  actions.reduce(
    (current, action) => ({ ...current, ...gameReducer(current, action, 1000) }),
    state
  );

const draw = (state: typeof start) => {
  const config = toBoardConfig(state);
  return scene({ config, geometry: boardGeometry(config), fonts });
};

const texts = (commands: RenderTask[], font: string) =>
  commands.flatMap(command =>
    command.kind === 'text' && command.font === font ? [command.text] : []
  );

describe('board scene', () => {
  it('draws a number for every filled cell, the selected number and its matches in bold', () => {
    const selected = play(start, ['select', { x: given % 9, y: Math.floor(given / 9) }]);
    const commands = draw(selected);
    const value = start.game.puzzle[given];
    const filled = start.game.puzzle.filter(symbol => symbol !== '');

    expect(commands[0]).toEqual(
      expect.objectContaining({ kind: 'fill', color: selected.boardSettings.backgroundColor })
    );
    expect(texts(commands, 'matching').every(symbol => symbol === value)).toBe(true);
    expect([...texts(commands, 'value'), ...texts(commands, 'matching')].length).toBe(
      filled.length
    );
  });

  it('draws notes only in empty cells', () => {
    const noted = [open[0], given].reduce(
      (state, cell) =>
        play(
          state,
          ['hintMode', true],
          ['select', { x: cell % 9, y: Math.floor(cell / 9) }],
          ['set', '5']
        ),
      start
    );

    expect(texts(draw(noted), 'hint')).toEqual(['5']);
  });

  it('hides numbers and notes while paused and puts the overlay on top', () => {
    const paused = play(start, ['pause', null]);
    const commands = draw(paused);

    expect(texts(commands, 'value')).toEqual([]);
    expect(texts(commands, 'overlay')).toEqual(['Paused']);
    expect(commands.at(-1)).toEqual(expect.objectContaining({ kind: 'text', text: 'Paused' }));
  });

  it('leaves out the lines whose width is zero', () => {
    const lines = (state: typeof start) =>
      draw(state).filter(command => command.kind === 'line').length;
    const withoutLines = {
      ...start,
      boardSettings: { ...start.boardSettings, valueGridBorderWidth: 0, mainGridBorderWidth: 0 }
    };

    expect(lines(start)).toBeGreaterThan(0);
    expect(lines(withoutLines)).toBe(0);
  });
});
