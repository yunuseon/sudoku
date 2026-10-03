import { GameSettings, generateSudoku } from './sudoku.logic';

addEventListener('message', ({ data }: MessageEvent<GameSettings>) => {
  postMessage(generateSudoku(data));
});
