import { Observable } from 'rxjs';
import { BindingParams, FolderApi, TpChangeEvent } from 'tweakpane';

// Added right away, so the pane order follows the calls and not the subscriptions
export const fromBinding$ = <O extends Record<string, any>, K extends keyof O & string>(container: FolderApi, params: O, key: K, options?: BindingParams): Observable<Pick<O, K>> => {
  const binding = container.addBinding(params, key, options);

  return new Observable(subscriber => {
    const handler = (ev: TpChangeEvent<O[K]>) => subscriber.next({ [key]: ev.value } as Pick<O, K>);

    binding.on('change', handler);
    return () => binding.off('change', handler);
  });
}

export const fromButton$ = (container: FolderApi, title: string): Observable<void> => {
  const button = container.addButton({ title });

  return new Observable(subscriber => {
    const handler = () => subscriber.next();

    button.on('click', handler);
    return () => button.off('click', handler);
  });
}
