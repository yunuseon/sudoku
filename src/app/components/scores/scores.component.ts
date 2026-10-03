import { Component, input, output } from '@angular/core';
import { formatElapsed } from '../format-elapsed';
import { type Level, levels } from '../../logic/difficulty';
import { Score } from '../../logic/scores';

const formatDate = (time: number) =>
  new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

@Component({
  selector: 'hks-scores',
  templateUrl: './scores.component.html',
  styleUrl: './scores.component.scss'
})
export class ScoresComponent {
  public readonly level = input.required<Level>();
  public readonly scores = input.required<Score[]>();
  public readonly highlightedId = input<string | null>(null);

  public readonly levelChange = output<Level>();
  public readonly selectScore = output<string>();

  protected readonly levels = levels;
  protected readonly formatElapsed = formatElapsed;
  protected readonly formatDate = formatDate;
}
