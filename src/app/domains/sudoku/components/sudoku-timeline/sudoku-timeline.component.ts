import { afterRenderEffect, Component, ElementRef, inject, input, output } from '@angular/core';
import { Move } from '../../logic/sudoku.logic';

type PlacedMove = { x: number; offset: number; elapsed: number };

const padding = 16;
const markerSize = 28;
const markerGap = 4;

// Moves sit at their time, but never closer than one marker to the previous one. A push shifts everything after it,
// so the offset of the last move before a point in time also applies to the ticks and the current time.
const placeMoves = (moves: Move[], pixelsPerSecond: number): PlacedMove[] => moves.reduce<PlacedMove[]>((placed, move) => {
  const previous = placed.at(-1);
  const timeX = padding + move.elapsed / 1000 * pixelsPerSecond;
  const x = Math.max(timeX + (previous?.offset ?? 0), (previous?.x ?? padding) + markerSize + markerGap);

  return [...placed, { x, offset: x - timeX, elapsed: move.elapsed }];
}, []);

const positionAt = (placed: PlacedMove[], pixelsPerSecond: number, elapsed: number) =>
  padding + elapsed / 1000 * pixelsPerSecond + (placed.filter(move => move.elapsed <= elapsed).at(-1)?.offset ?? 0);

@Component({
  selector: 'hks-sudoku-timeline',
  templateUrl: './sudoku-timeline.component.html',
  styleUrl: './sudoku-timeline.component.scss',
  host: {
    '[style.--marker-size.px]': 'markerSize'
  }
})
export class SudokuTimelineComponent {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;

  public readonly moves = input.required<Move[]>();
  public readonly cursor = input.required<number>();
  public readonly elapsed = input.required<number>();
  public readonly pixelsPerSecond = input.required<number>();

  public readonly seek = output<number>();

  protected readonly markerSize = markerSize;

  constructor() {
    afterRenderEffect(() => {
      const cursor = this.cursor();
      const placed = placeMoves(this.moves(), this.pixelsPerSecond());
      const focus = cursor === 0 ? padding : placed[cursor - 1].x;

      this.host.scrollTo({ left: focus - this.host.clientWidth / 2, behavior: 'smooth' });
    });
  }

  protected layout() {
    const pixelsPerSecond = this.pixelsPerSecond();
    const placed = placeMoves(this.moves(), pixelsPerSecond);
    const end = Math.max(this.elapsed(), this.moves().at(-1)?.elapsed ?? 0);
    const at = (elapsed: number) => positionAt(placed, pixelsPerSecond, elapsed);

    return {
      start: padding,
      moves: placed.map(move => move.x),
      now: at(this.elapsed()),
      ticks: Array.from({ length: Math.floor(end / 60000) + 1 }, (_, minute) => ({ minute, x: at(minute * 60000) })),
      width: Math.max(at(end), placed.at(-1)?.x ?? 0) + markerSize + padding
    };
  }
}
