import { Component, input, output } from '@angular/core';
import { SudokuBoardComponent } from '../sudoku-board/sudoku-board.component';
import { ThemeFieldComponent } from '../theme-field/theme-field.component';
import { BoardSettings, themeGroups, themePresets } from '../../theme/theme';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';

@Component({
  selector: 'hks-theme-menu',
  imports: [SudokuBoardComponent, ThemeFieldComponent],
  templateUrl: './theme-menu.component.html',
  styleUrl: './theme-menu.component.scss'
})
export class ThemeMenuComponent {
  public readonly settings = input.required<BoardSettings>();
  public readonly preview = input.required<BoardConfig>();

  public readonly themeChange = output<Partial<BoardSettings>>();

  protected readonly groups = themeGroups;
  protected readonly presets = themePresets;

  protected changeField(key: keyof BoardSettings, value: string | number | boolean) {
    this.themeChange.emit({ [key]: value });
  }
}
