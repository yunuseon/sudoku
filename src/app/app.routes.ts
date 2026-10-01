import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'sudoku'
  },
  {
    path: 'sudoku',
    loadChildren: () => import('./domains/sudoku/sudoku.routes')
  }
];
