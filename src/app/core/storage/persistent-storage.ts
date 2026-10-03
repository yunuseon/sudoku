import { defer, from, Observable, of } from 'rxjs';

export const requestPersistence$ = (): Observable<boolean> =>
  defer(() => (navigator.storage?.persist ? from(navigator.storage.persist()) : of(false)));
