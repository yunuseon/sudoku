import { Component } from '@angular/core';
import { PageDirective } from '../../../../core/directives/page.directive';
import { SudokuBoardComponent } from '../../components/sudoku-board/sudoku-board.component';

@Component({
  selector: 'hks-page-sudoku',
  imports: [SudokuBoardComponent],
  templateUrl: './page-sudoku.component.html',
  styleUrl: './page-sudoku.component.scss',
  hostDirectives: [PageDirective]
})
export class PageSudokuComponent {

}

