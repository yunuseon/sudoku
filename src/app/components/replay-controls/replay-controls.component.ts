import { Component, input, output } from '@angular/core';
import { isRunningAtCursor, Replay, ReplayAction } from '../../logic/replay';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';

@Component({
  selector: 'hks-replay-controls',
  templateUrl: './replay-controls.component.html',
  styleUrl: './replay-controls.component.scss'
})
export class ReplayControlsComponent {
  public readonly config = input.required<BoardConfig>();
  public readonly replay = input.required<Replay>();
  public readonly speeds = input.required<number[]>();

  public readonly action = output<ReplayAction>();

  protected readonly isRunningAtCursor = isRunningAtCursor;
}
