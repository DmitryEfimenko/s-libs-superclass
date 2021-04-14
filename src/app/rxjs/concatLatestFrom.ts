import { ObservedValueOf, of, OperatorFunction, pipe } from 'rxjs';
import { Observable } from 'rxjs';
import { concatMap, withLatestFrom } from 'rxjs/operators';

// https://github.com/ngrx/platform/pull/2760/commits/6e6e1463aa046d29786a8491ac32a68ae0b12786
// this operator is available as of RxJS 7

export function concatLatestFrom<
  T extends Observable<unknown>[] | Observable<unknown>,
  V,
  R = [
    V,
    ...(T extends Observable<unknown>[]
      ? { [i in keyof T]: ObservedValueOf<T[i]> }
      : [ObservedValueOf<T>])
  ]
>(observablesFactory: (value: V) => T): OperatorFunction<V, R> {
  return pipe(
    concatMap((value) => {
      const observables = observablesFactory(value);
      const observablesAsArray = Array.isArray(observables)
        ? observables
        : [observables];
      return of(value).pipe(
        withLatestFrom(...observablesAsArray)
      ) as Observable<R>;
    })
  );
}
