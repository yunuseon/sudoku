import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'sudoku',
    loadChildren: () => import('./domains/sudoku/sudoku.routes')
  }
];
