import { Component, input, output } from '@angular/core';
import { formatElapsed } from '../format-elapsed';
import { duration, Replay, ReplayAction } from '../../logic/replay';
import { isPaused, isStopped, TogglePauseAction } from '../../logic/sudoku.logic';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';

@Component({
  selector: 'hks-game-bar',
  templateUrl: './game-bar.component.html',
  styleUrl: './game-bar.component.scss'
})
export class GameBarComponent {
  public readonly config = input.required<BoardConfig>();
  public readonly elapsed = input.required<number>();
  public readonly replay = input.required<Replay | null>();

  public readonly action = output<TogglePauseAction | ReplayAction>();
  public readonly openSettings = output();
  public readonly openScores = output();
  public readonly openNewGame = output();

  protected readonly formatElapsed = formatElapsed;
  protected readonly duration = duration;
  protected readonly isPaused = isPaused;
  protected readonly isStopped = isStopped;
}
