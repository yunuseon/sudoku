import { afterRenderEffect, Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { animationFrames, EMPTY, fromEvent } from 'rxjs';
import { elapsed, Move, Timer } from '../../logic/sudoku.logic';
import { now } from '../../../../core/time/now';

const padding = 16;
const playheadInset = 12;
const dragThreshold = 6;
const friction = 0.95;
const maxVelocity = 4;
const seekEasing = 0.2;
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
  private readonly playhead = viewChild.required<ElementRef<HTMLElement>>('playhead');

  public readonly moves = input.required<Move[]>();
  public readonly cursor = input.required<number>();
  public readonly elapsed = input.required<number>();
  public readonly timer = input.required<Timer>();
  public readonly pixelsPerSecond = input.required<number>();
  public readonly playheadColor = input.required<string>();

  public readonly seek = output<number>();

  // View state only, changed every frame without change detection. viewX is the track position under the playhead:
  // it follows the current time, or stays put while the user looks back.
  private viewX = 0;
  private following = true;
  private velocity = 0;
  private seekTarget: number | null = null;
  private pointer: { startX: number; lastX: number; lastTime: number; dragging: boolean } | null = null;
  private lastFrameTime: number | null = null;

  constructor() {
    const frames$ = typeof requestAnimationFrame === 'undefined' ? EMPTY : animationFrames();

    frames$.pipe(takeUntilDestroyed()).subscribe(({ elapsed: frameTime }) => this.frame(frameTime));

    fromEvent<PointerEvent>(this.host, 'pointerdown').pipe(takeUntilDestroyed()).subscribe(event => {
      this.pointer = { startX: event.clientX, lastX: event.clientX, lastTime: event.timeStamp, dragging: false };
      this.velocity = 0;
      this.seekTarget = null;
    });

    fromEvent<PointerEvent>(this.host, 'pointermove').pipe(takeUntilDestroyed()).subscribe(event => {
      const pointer = this.pointer;
      if (pointer === null) {
        return;
      }

      // only a real drag captures the pointer, so a tap still reaches the move it was on
      if (!pointer.dragging && Math.abs(event.clientX - pointer.startX) > dragThreshold) {
        pointer.dragging = true;
        this.host.setPointerCapture(event.pointerId);
      }

      if (pointer.dragging) {
        const dx = event.clientX - pointer.lastX;
        this.scrollBy(-dx);
        this.velocity = Math.max(-maxVelocity, Math.min(maxVelocity, -dx / Math.max(1, event.timeStamp - pointer.lastTime)));
      }

      pointer.lastX = event.clientX;
      pointer.lastTime = event.timeStamp;
    });

    fromEvent(this.host, 'pointerup').pipe(takeUntilDestroyed()).subscribe(() => this.pointer = null);
    fromEvent(this.host, 'pointercancel').pipe(takeUntilDestroyed()).subscribe(() => this.pointer = null);

    fromEvent<WheelEvent>(this.host, 'wheel', { passive: false }).pipe(takeUntilDestroyed()).subscribe(event => {
      event.preventDefault();
      this.seekTarget = null;
      this.scrollBy(event.deltaX || event.deltaY);
    });

    afterRenderEffect(() => {
      const cursor = this.cursor();
      const moves = this.moves();

      if (cursor === moves.length) {
        this.following = true;
        this.seekTarget = null;
      } else {
        this.following = false;
        this.seekTarget = this.x(moves[cursor - 1]?.elapsed ?? 0) + this.playheadX() - this.host.clientWidth / 2;
      }
    });
  }

  protected x(elapsed: number) {
    return padding + elapsed / 1000 * this.pixelsPerSecond();
  }

  private playheadX() {
    return this.host.clientWidth - playheadInset;
  }

  private scrollBy(dx: number) {
    this.following = false;
    this.viewX += dx;
  }

  private frame(frameTime: number) {
    const nowX = this.x(elapsed(this.timer(), now()));
    const minX = Math.min(nowX, this.playheadX());
    const dt = frameTime - (this.lastFrameTime ?? frameTime);
    this.lastFrameTime = frameTime;

    if (this.seekTarget !== null) {
      this.viewX += (this.seekTarget - this.viewX) * seekEasing;
    } else if (this.pointer === null && this.velocity !== 0) {
      this.viewX += this.velocity * dt;
      this.velocity *= Math.pow(friction, dt / 16);
      this.velocity = Math.abs(this.velocity) < 0.01 ? 0 : this.velocity;
    }

    if (this.following || this.viewX >= nowX) {
      this.following = true;
      this.viewX = nowX;
    }

    this.viewX = Math.max(minX, this.viewX);

    const offset = this.playheadX() - this.viewX;
    this.track().nativeElement.style.transform = `translateX(${offset}px)`;
    this.playhead().nativeElement.style.transform = `translateX(${offset + nowX}px)`;
  }

  protected ticks() {
    const end = Math.max(this.elapsed(), this.moves().at(-1)?.elapsed ?? 0) + 2000;
    const tickInterval = labelIntervalFor(this.pixelsPerSecond()) / minorTicksPerLabel;

    return Array.from({ length: Math.floor(end / tickInterval) + 1 }, (_, i) => ({
      x: this.x(i * tickInterval),
      label: i % minorTicksPerLabel === 0 ? formatTime(i * tickInterval) : null
    }));
  }
}
