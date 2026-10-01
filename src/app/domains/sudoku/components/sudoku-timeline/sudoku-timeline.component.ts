import { afterRenderEffect, Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { animationFrames, EMPTY, fromEvent, map, merge, of, switchMap } from 'rxjs';
import { elapsed, isRunning, Move, Timer } from '../../logic/sudoku.logic';
import { now } from '../../../../core/time/now';

type PlacedMove = { x: number; offset: number; elapsed: number };

const padding = 16;
const markerSpacing = 24;
const tickInterval = 10000;
const nowAnchor = 0.75;

// Moves sit at their time, but never closer than one marker to the previous one. A push shifts everything after it,
// so the offset of the last move before a point in time also applies to the ticks and the current time.
const placeMoves = (moves: Move[], pixelsPerSecond: number): PlacedMove[] => moves.reduce<PlacedMove[]>((placed, move) => {
  const previous = placed.at(-1);
  const timeX = padding + move.elapsed / 1000 * pixelsPerSecond;
  const x = Math.max(timeX + (previous?.offset ?? 0), (previous?.x ?? padding) + markerSpacing);

  return [...placed, { x, offset: x - timeX, elapsed: move.elapsed }];
}, []);

const positionAt = (placed: PlacedMove[], pixelsPerSecond: number, elapsed: number) =>
  padding + elapsed / 1000 * pixelsPerSecond + (placed.filter(move => move.elapsed <= elapsed).at(-1)?.offset ?? 0);

@Component({
  selector: 'hks-sudoku-timeline',
  templateUrl: './sudoku-timeline.component.html',
  styleUrl: './sudoku-timeline.component.scss'
})
export class SudokuTimelineComponent {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly nowLine = viewChild.required<ElementRef<HTMLElement>>('now');

  public readonly moves = input.required<Move[]>();
  public readonly cursor = input.required<number>();
  public readonly elapsed = input.required<number>();
  public readonly timer = input.required<Timer>();
  public readonly pixelsPerSecond = input.required<number>();

  public readonly seek = output<number>();

  // view state only: null while the timeline keeps the current time in view, otherwise why it stopped
  private detached: 'user' | 'seek' | null = null;

  constructor() {
    const userScroll$ = merge(
      fromEvent(this.host, 'pointerdown'),
      fromEvent(this.host, 'wheel'),
      fromEvent(this.host, 'touchstart')
    );

    userScroll$.pipe(takeUntilDestroyed()).subscribe(() => this.detached = 'user');

    // only a user can scroll back to the current time, a seek scrolls on its own
    fromEvent(this.host, 'scroll').pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.detached === 'user' && this.host.scrollLeft >= this.followScrollLeft() - 4) {
        this.detached = null;
      }
    });

    // a display clock for smooth scrolling, it never goes through the game state
    toObservable(this.timer).pipe(
      switchMap(timer => typeof requestAnimationFrame === 'undefined'
        ? EMPTY
        : isRunning(timer) ? animationFrames().pipe(map(() => elapsed(timer, now()))) : of(elapsed(timer, now()))),
      takeUntilDestroyed()
    ).subscribe(elapsedNow => this.showTime(elapsedNow));

    afterRenderEffect(() => {
      const cursor = this.cursor();
      const placed = placeMoves(this.moves(), this.pixelsPerSecond());

      this.detached = cursor === placed.length ? null : 'seek';

      if (this.detached === 'seek') {
        this.host.scrollTo({ left: (placed[cursor - 1]?.x ?? padding) - this.host.clientWidth / 2, behavior: 'smooth' });
      }
    });
  }

  private followScrollLeft() {
    return parseFloat(this.nowLine().nativeElement.style.left || '0') - this.host.clientWidth * nowAnchor;
  }

  private showTime(elapsedNow: number) {
    const x = positionAt(placeMoves(this.moves(), this.pixelsPerSecond()), this.pixelsPerSecond(), elapsedNow);

    this.nowLine().nativeElement.style.left = `${x}px`;
    this.track().nativeElement.style.minWidth = `${x + this.host.clientWidth * (1 - nowAnchor)}px`;

    if (this.detached === null) {
      this.host.scrollLeft = x - this.host.clientWidth * nowAnchor;
    }
  }

  protected layout() {
    const pixelsPerSecond = this.pixelsPerSecond();
    const placed = placeMoves(this.moves(), pixelsPerSecond);
    const end = Math.max(this.elapsed(), this.moves().at(-1)?.elapsed ?? 0) + 60000;
    const at = (elapsed: number) => positionAt(placed, pixelsPerSecond, elapsed);

    return {
      start: padding,
      moves: placed.map(move => move.x),
      ticks: Array.from({ length: Math.floor(end / tickInterval) + 1 }, (_, i) => ({
        x: at(i * tickInterval),
        label: i * tickInterval % 60000 === 0 ? `${i * tickInterval / 60000}:00` : null
      }))
    };
  }
}
