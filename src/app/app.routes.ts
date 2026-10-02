import { Routes } from '@angular/router';
import { PageSudokuComponent } from './pages/page-sudoku/page-sudoku.component';

export const routes: Routes = [
  {
    path: '',
    component: PageSudokuComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
