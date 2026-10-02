import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageSudokuComponent } from './page-sudoku.component';

describe('PageSudokuComponent', () => {
  let component: PageSudokuComponent;
  let fixture: ComponentFixture<PageSudokuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageSudokuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageSudokuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
