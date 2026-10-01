import { NgZone } from '@angular/core';
import { MonoTypeOperatorFunction, Observable } from 'rxjs';

// Timers scheduled inside the zone keep the app from ever becoming stable, which breaks hydration event replay
export const runOutsideAngular = <T>(zone: NgZone): MonoTypeOperatorFunction<T> => source$ =>
  new Observable<T>(subscriber => zone.runOutsideAngular(() => source$.subscribe(subscriber)));
