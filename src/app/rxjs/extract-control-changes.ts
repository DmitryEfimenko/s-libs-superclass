import { AbstractControl } from '@angular/forms';
import { wrapMethod } from '@s-libs/js-core';
import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

type AbstractControlMethods = 'markAsTouched' | 'markAsUntouched' | 'markAsDirty' | 'markAsPristine';
type EmitValue = boolean;
type Methods = Partial<Record<AbstractControlMethods, EmitValue>>;

/**
 * Patches the method to first execute the provided function and then
 * the original functionality
 * @param obj Object with the method of interest
 * @param methodName Method name to patch
 * @param fn Function to execute before the original functionality
 */
export function patchObjectMethodWith<
  T,
  K extends MethodNames<T>,
>(obj: T, methodName: K, fn: TypeOfClassMethod<T, K>) {
  const originalFn = (obj[methodName] as Function).bind(obj) as Function;

  function updatedFn(...args: [ArgumentsType<T[K]>]) {
    fn(...args);
    originalFn(...args);
  }

  obj[methodName] = updatedFn as T[K];
}

/**
 * Extract a touched changed observable from an abstract control
 * @param control AbstractControl
 *
 * @usage
 * ```
 * const formControl = new FormControl();
 * const touchedChanged$ = extractTouchedChanges(formControl);
 * ```
 */
export function extractTouchedChanges(control: AbstractControl): Observable<boolean> {
  const methods: Methods = {
    markAsTouched: true,
    markAsUntouched: false
  };
  return extractMethodsIntoObservable(control, methods).pipe(
    distinctUntilChanged()
  );
};

/**
 * Extract a dirty changed observable from an abstract control
 * @param control AbstractControl
 *
 * @usage
 * ```
 * const formControl = new FormControl();
 * const dirtyChanged$ = extractDirtyChanges(formControl);
 * ```
 */
 export function extractDirtyChanges (control: AbstractControl): Observable<boolean> {
  const methods: Methods = {
    markAsDirty: true,
    markAsPristine: false
  };
  return extractMethodsIntoObservable(control, methods).pipe(
    distinctUntilChanged()
  );
};

function extractMethodsIntoObservable(control: AbstractControl, methods: Methods) {
  const changes$ = new Subject<EmitValue>();

  Object.keys(methods).forEach((methodName) => {
    const emitValue = methods[methodName];

    patchObjectMethodWith(control, methodName, () => {
      changes$.next(emitValue);
    });
  });

  return changes$.asObservable();
}
