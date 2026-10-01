import { afterRenderEffect, Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { animationFrames, EMPTY, fromEvent, map, merge, of, switchMap } from 'rxjs';
import { elapsed, isRunning, Move, Timer } from '../../logic/sudoku.logic';
import { now } from '../../../../core/time/now';

const padding = 16;
const nowAnchor = 0.75;
const minLabelDistance = 60;
const minorTicksPerLabel = 5;
const labelIntervals = [1, 2, 5, 10, 15, 30, 60, 120, 300].map(seconds => seconds * 1000);

const labelIntervalFor = (pixelsPerSecond: number) =>
  labelIntervals.find(interval => interval / 1000 * pixelsPerSecond >= minLabelDistance) ?? labelIntervals[labelIntervals.length - 1];

const formatTime = (elapsed: number) => {
  const seconds = Math.round(elapsed / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

@Component({
  selector: 'hks-sudoku-timeline',
  templateUrl: './sudoku-timeline.component.html',
  styleUrl: './sudoku-timeline.component.scss',
  host: {
    '[style.--playhead]': 'playheadColor()'
  }
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
  public readonly playheadColor = input.required<string>();

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
      const moves = this.moves();

      this.detached = cursor === moves.length ? null : 'seek';

      if (this.detached === 'seek') {
        this.host.scrollTo({ left: this.x(moves[cursor - 1]?.elapsed ?? 0) - this.host.clientWidth / 2, behavior: 'smooth' });
      }
    });
  }

  protected x(elapsed: number) {
    return padding + elapsed / 1000 * this.pixelsPerSecond();
  }

  private followScrollLeft() {
    return parseFloat(this.nowLine().nativeElement.style.left || '0') - this.host.clientWidth * nowAnchor;
  }

  private showTime(elapsedNow: number) {
    const x = this.x(elapsedNow);

    this.nowLine().nativeElement.style.left = `${x}px`;
    this.track().nativeElement.style.minWidth = `${x + this.host.clientWidth * (1 - nowAnchor)}px`;

    if (this.detached === null) {
      this.host.scrollLeft = x - this.host.clientWidth * nowAnchor;
    }
  }

  protected ticks() {
    const end = Math.max(this.elapsed(), this.moves().at(-1)?.elapsed ?? 0) + 60000;
    const tickInterval = labelIntervalFor(this.pixelsPerSecond()) / minorTicksPerLabel;

    return Array.from({ length: Math.floor(end / tickInterval) + 1 }, (_, i) => ({
      x: this.x(i * tickInterval),
      label: i % minorTicksPerLabel === 0 ? formatTime(i * tickInterval) : null
    }));
  }
}
