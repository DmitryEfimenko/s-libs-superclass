import { Observable, OperatorFunction, pipe, UnaryFunction } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Utility operator to ease debugging of observables.
 *
 * Example of usage:
 * ```
 * obs$.pipe(log('users'))
 * ```
 * @param info optional data. Usually helps to identify the logged stream
 */
export function log$<T>(
  info?: unknown,
  predicateFn?: (data: T | undefined) => any
): UnaryFunction<Observable<T | null | undefined>, Observable<T>> {
  function log(event: string, data?: T) {
    const args: unknown[] = [event];
    if (info) {
      args.unshift(info);
    }
    if (event !== 'tap.complete') {
      const toLog = predicateFn ? predicateFn(data) : data;
      args.push(toLog);
    }
    console.log(...args);
  }
  return pipe(
    tap<T>(
      (x) => {
        log('tap.next', x);
      },
      (x) => {
        log('tap.error', x);
      },
      () => {
        log('tap.complete');
      }
    ) as OperatorFunction<T | null | undefined, T>
  );
}
