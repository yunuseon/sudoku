import type { Field } from '../components/field/field';
import type { Json } from '../core/storage/local-storage';
import { pickValid } from '../core/validation';
import {
  createGameState,
  GameAction,
  gameReducer,
  GameSettings,
  GameState
} from '../logic/sudoku.logic';

export const boardSettings = {
  height: 1000,
  width: 1000,
  clientWidth: 600,
  clientHeight: 600,
  pixelRatio: 1,
  backgroundColor: '#213555',
  cellPaddingRatio: 0.33,
  mainBorderColor: '#d8c4b6',
  mainGridBorderWidth: 12,
  valueFont: 'system-ui',
  valueFontColor: '#f5efe7',
  enteredValueFontColor: '#8ec5ff',
  valueGridBorderColor: '#3e5879',
  valueGridBorderWidth: 4,
  hintFont: 'system-ui',
  hintFontColor: '#d8c4b6',
  hintGridBorderColor: '#eac0c0',
  hintGridBorderWidth: 0,
  renderTextBoundingBoxLineWidth: 0,
  renderTextBoundingBoxColor: '#00ff00',
  highlightColor: '#18263c',
  selectedCellHighlightColor: '#030509',
  highlightFontColor: '#f2c46d',
  enteredHighlightFontColor: '#ffdc9a',
  mistakeFontColor: '#ff5c5c',
  overlayColor: '#213555d9',
  overlayFontColor: '#f5efe7',
  timelinePixelsPerSecond: 12,
  timelinePlayheadColor: '#3b82f6'
};

export type BoardSettings = typeof boardSettings;

export type ThemeField = Field<keyof BoardSettings>;

export type ThemeGroup = { title: string; fields: ThemeField[] };

const fonts = [
  { label: 'Default', value: 'system-ui' },
  { label: 'Rounded', value: 'ui-rounded, system-ui' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' }
];

export const themeGroups: ThemeGroup[] = [
  {
    title: 'Board',
    fields: [
      { key: 'backgroundColor', label: 'Background', type: 'color' },
      { key: 'mainBorderColor', label: 'Box borders', type: 'color' },
      {
        key: 'mainGridBorderWidth',
        label: 'Box border width',
        type: 'range',
        min: 0,
        max: 30,
        step: 1
      },
      { key: 'valueGridBorderColor', label: 'Cell borders', type: 'color' },
      {
        key: 'valueGridBorderWidth',
        label: 'Cell border width',
        type: 'range',
        min: 0,
        max: 20,
        step: 1
      },
      {
        key: 'cellPaddingRatio',
        label: 'Number padding',
        type: 'range',
        min: 0,
        max: 0.45,
        step: 0.01
      }
    ]
  },
  {
    title: 'Numbers',
    fields: [
      { key: 'valueFont', label: 'Font', type: 'choice', options: fonts },
      { key: 'valueFontColor', label: 'Given numbers', type: 'color' },
      { key: 'enteredValueFontColor', label: 'Your numbers', type: 'color' }
    ]
  },
  {
    title: 'Notes',
    fields: [
      { key: 'hintFont', label: 'Font', type: 'choice', options: fonts },
      { key: 'hintFontColor', label: 'Notes', type: 'color' },
      { key: 'hintGridBorderColor', label: 'Note grid', type: 'color' },
      {
        key: 'hintGridBorderWidth',
        label: 'Note grid width',
        type: 'range',
        min: 0,
        max: 10,
        step: 1
      }
    ]
  },
  {
    title: 'Highlights',
    fields: [
      { key: 'highlightColor', label: 'Row, column and box', type: 'color' },
      { key: 'selectedCellHighlightColor', label: 'Selected cell', type: 'color' },
      { key: 'highlightFontColor', label: 'Highlighted givens', type: 'color' },
      { key: 'enteredHighlightFontColor', label: 'Highlighted numbers', type: 'color' }
    ]
  },
  {
    title: 'Game',
    fields: [
      { key: 'mistakeFontColor', label: 'Mistakes', type: 'color' },
      { key: 'overlayColor', label: 'Overlay', type: 'color' },
      { key: 'overlayFontColor', label: 'Overlay text', type: 'color' }
    ]
  },
  {
    title: 'Timeline',
    fields: [
      { key: 'timelinePixelsPerSecond', label: 'Zoom', type: 'range', min: 4, max: 60, step: 1 },
      { key: 'timelinePlayheadColor', label: 'Playhead', type: 'color' }
    ]
  }
];

const themeKeys = themeGroups.flatMap(group => group.fields.map(field => field.key));

export const pickTheme = (settings: BoardSettings) =>
  themeKeys.reduce<Partial<BoardSettings>>(
    (theme, key) => ({ ...theme, [key]: settings[key] }),
    {}
  );

export const isSameTheme = (a: BoardSettings, b: BoardSettings) =>
  themeKeys.every(key => a[key] === b[key]);

export const parseTheme = (value: Json) => pickValid(boardSettings, themeKeys, value);

const navy = pickTheme(boardSettings);

export const themePresets: { name: string; settings: Partial<BoardSettings> }[] = [
  { name: 'Navy', settings: navy },
  {
    name: 'Paper',
    settings: {
      ...navy,
      backgroundColor: '#f6f1e7',
      mainBorderColor: '#3a3632',
      valueGridBorderColor: '#cfc5b4',
      valueFontColor: '#1f1d1a',
      enteredValueFontColor: '#2f5fb3',
      hintFontColor: '#7a7062',
      hintGridBorderColor: '#e2dacb',
      highlightColor: '#ece4d4',
      selectedCellHighlightColor: '#dccfb4',
      highlightFontColor: '#b8326b',
      enteredHighlightFontColor: '#d0559a',
      mistakeFontColor: '#d23c3c',
      overlayColor: '#f6f1e7d9',
      overlayFontColor: '#1f1d1a',
      timelinePlayheadColor: '#2f5fb3'
    }
  },
  {
    name: 'Midnight',
    settings: {
      ...navy,
      backgroundColor: '#0d0f14',
      mainBorderColor: '#8b93a7',
      valueGridBorderColor: '#262b36',
      valueFontColor: '#e6e8ee',
      enteredValueFontColor: '#7cc4ff',
      hintFontColor: '#8b93a7',
      hintGridBorderColor: '#1c2029',
      highlightColor: '#161a22',
      selectedCellHighlightColor: '#2a3242',
      highlightFontColor: '#ffb454',
      enteredHighlightFontColor: '#ffd08a',
      mistakeFontColor: '#ff6b6b',
      overlayColor: '#0d0f14d9',
      overlayFontColor: '#e6e8ee',
      timelinePlayheadColor: '#7cc4ff'
    }
  }
];

const sampleSettings: GameSettings = {
  xDimension: 3,
  yDimension: 3,
  level: 'easy',
  seed: 2024,
  mistakeMode: 'marked',
  mistakeLimit: null
};

export const createSampleState = (): GameState => {
  const start = createGameState(sampleSettings, 0);
  const solution = start.game.solution;
  const at = (cell: number) => ({ x: cell % 9, y: Math.floor(cell / 9) });
  const row = (cell: number) => Math.floor(cell / 9);

  const empty = start.game.givens.flatMap((isGiven, cell) => (isGiven ? [] : [cell]));
  const [first, second, ...rest] = empty;
  const [mistake] = rest;
  const wrongValue = start.game.alphabet.find(value => value !== solution[mistake])!;
  const note = rest.find(cell => cell !== mistake && row(cell) !== row(first))!;

  const actions: GameAction[] = [
    ['select', at(first)],
    ['set', solution[first]],
    ['select', at(second)],
    ['set', solution[second]],
    ['select', at(mistake)],
    ['set', wrongValue],
    ['hintMode', true],
    ['select', at(note)],
    ['set', '1'],
    ['set', '4'],
    ['set', '7'],
    ['hintMode', false],
    ['select', at(first)]
  ];

  return actions.reduce((state, action) => gameReducer(state, action, 0), start);
};
