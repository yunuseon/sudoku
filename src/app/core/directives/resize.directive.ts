import { Directive, ElementRef, inject } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable } from 'rxjs';

export type Size = { width: number; height: number };

@Directive({
  selector: '[hksResize]'
})
export class ResizeDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly resize$: Observable<Size> =
    typeof ResizeObserver !== 'undefined'
      ? new Observable<Size>(subscriber => {
          const observer = new ResizeObserver(([entry]) =>
            subscriber.next({ width: entry.contentRect.width, height: entry.contentRect.height })
          );

          observer.observe(this.element);
          return () => observer.disconnect();
        })
      : EMPTY;

  public readonly hksResize = outputFromObservable(this.resize$);
}
