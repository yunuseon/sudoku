import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SudokuBoardComponent } from './sudoku-board.component';
import { createPageState, toBoardConfig } from '../../pages/page-sudoku/page-sudoku.component';

describe('SudokuBoardComponent', () => {
  let component: SudokuBoardComponent;
  let fixture: ComponentFixture<SudokuBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SudokuBoardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SudokuBoardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', toBoardConfig(createPageState(1, 0)));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
