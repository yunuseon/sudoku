import { Component, input, output } from '@angular/core';
import { NewScore } from '../../logic/scores';
import { GameAction, isStopped } from '../../logic/sudoku.logic';
import { ReplayAction } from '../../logic/replay';
import { BoardConfig } from '../../pages/page-sudoku/page-sudoku.component';

@Component({
  selector: 'hks-game-tools',
  templateUrl: './game-tools.component.html',
  styleUrl: './game-tools.component.scss'
})
export class GameToolsComponent {
  public readonly config = input.required<BoardConfig>();
  public readonly newScore = input.required<NewScore | null>();

  public readonly action = output<GameAction | ReplayAction>();

  protected readonly isStopped = isStopped;
}
