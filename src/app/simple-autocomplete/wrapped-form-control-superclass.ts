import { InjectFlags, Injector } from '@angular/core';
import { FormControl, NgControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FormControlSuperclass } from '@s-libs/ng-core';
import { merge, Observable, Subject } from 'rxjs';
import { map, shareReplay, startWith, tap } from 'rxjs/operators';
import { extractDirtyChanges, extractTouchedChanges, patchObjectMethodWith } from '../rxjs/extract-control-changes';

/**
 * Extend this when creating a form control that simply wraps an existing form control, to reduce a lot of boilerplate. **Warning:** You _must_ include a constructor in your subclass.
 *
 * Example when you don't need to modify the wrapped control's value:
 * ```ts
 * @Component({
 *   template: `<input [formControl]="formControl">`,
 * })
 * class StringComponent extends WrappedFormControlSuperclass<string> {
 *   // This looks unnecessary, but is required for Angular to provide `Injector`
 *   constructor(injector: Injector) {
 *     super(injector);
 *   }
 * }
 * ```
 *
 * Example when you need to modify the wrapped control's value:
 * ```ts
 * @Component({
 *   template: `<input type="datetime-local" [formControl]="formControl">`,
 * })
 * class DateComponent extends WrappedFormControlSuperclass<Date, string> {
 *   // This looks unnecessary, but is required for Angular to provide `Injector`
 *   constructor(injector: Injector) {
 *     super(injector);
 *   }
 *
 *   protected innerToOuter(value$: Observable<string>): Observable<Date> {
 *     return value$.pipe(
 *       map(value => new Date(value + "Z"))
 *     );
 *   }
 *
 *   protected outerToInner(value$: Observable<Date>): Observable<string> {
 *     return value$.pipe(
 *       map(value => {
 *         if (value === null) {
 *           return ""; // happens during initialization
 *         }
 *         return value.toISOString().substr(0, 16);
 *       })
 *     );
 *   }
 * }
 * ```
 */
export abstract class WrappedFormControlSuperclass<
  OuterType,
  InnerType = OuterType
> extends FormControlSuperclass<OuterType> {
  private incomingValues$$ = new Subject<OuterType>();

  /**
   * A reference to the outer control
   */
  ngControl: NgControl | undefined;
  
  /** Bind this to your inner form control to make all the magic happen. */
  formControl = new FormControl();

  /**
   * Stream of values that are set on the outer control
   */
  incomingValues$ = this.incomingValues$$.asObservable();

  /**
   * Stream of values as user types in the input control starting with the current value
   */
  inputValues$ = this.formControl.valueChanges.pipe(
    startWith(this.formControl.value)
  ) as Observable<InnerType>;

  /**
   * Stream that takes all incoming values, optionally applies user-provided
   * transformation, and commits the value to the inner form control
   */
  private outerToInner$ = this.incomingValues$.pipe(
    (s) => this.outerToInner(s),
    tap(value => this.formControl.setValue(value, { emitEvent: false })),
    shareReplay(1),
  );

  /**
   * Stream that listens to values as user types in the input, optionally applies
   * user-provided transformation, and emits the result to the outer form control
   */
  private innerToOuter$ = this.formControl.valueChanges.pipe(
    (s) => this.innerToOuter(s),
    tap(value => this.emitOutgoingValue(value)),
    shareReplay(1),
  );

  /**
   * Latest value that was either set from the outside or emitted from the inside
   */
  latestValue$ = merge(this.incomingValues$, this.innerToOuter$);

  /**
   * Stream of touched/untouched changes to the outer control
   */
  touched$: Observable<boolean>;

  /**
   * Stream of dirty/pristine changes to the outer control
   */
  dirty$: Observable<boolean>;

  constructor(
    private injector: Injector,
  ) {
    super(injector);

    this.provideValueAccessor();

    this.subscribeTo(this.outerToInner$);
    this.subscribeTo(this.innerToOuter$);

    this.syncOuterAndInnerControls();
  }

  /** Called as angular propagates values changes to this `ControlValueAccessor`. You normally do not need to use it. */
  handleIncomingValue(value: OuterType): void {
    this.incomingValues$$.next(value);
  }

  /** Called as angular propagates disabled changes to this `ControlValueAccessor`. You normally do not need to use it. */
  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.formControl.disable({ emitEvent: false });
    } else {
      this.formControl.enable({ emitEvent: false });
    }
    super.setDisabledState(this.isDisabled);
  }

  /**
   * Override this to modify a value coming from the outside to the format needed within this component.  
   * In case of a simple transformation, simply assign to the RxJS map operator:
   * ```ts
   * outerToInner = map((val: OuterType) => val.toString());
   * ```
   * In case of a more complex case involving multiple streams:
   * ```ts
   * outerToInner(values$: Observable<OuterType>): Observable<InnerType> {
   *   return values$.pipe(map(val => val.toString()));
   * }
   * ```
   * @param values$ Stream of values set from the outside
   * @returns Stream of transformed values that conform to the type of inner control
   */
  protected outerToInner(values$: Observable<OuterType>): Observable<InnerType> {
    return values$ as unknown as Observable<InnerType>;
  }

  /**
   * Override this to modify a value coming from within this component to the format expected on the outside.
   * * In case of a simple transformation, simply assign to the RxJS map operator:
   * ```ts
   * outerToInner = map((val: OuterType) => parseInt(val));
   * ```
   * In case of a more complex case involving multiple streams:
   * ```ts
   * outerToInner(values$: Observable<OuterType>): Observable<InnerType> {
   *   return values$.pipe(map(val => parseInt(val)));
   * }
   * @param values$ Stream of inner formControl.valueChanges
   * @returns Stream of transformed values that conform to the type of outer control
   */
  protected innerToOuter(values$: Observable<InnerType>): Observable<OuterType> {
    return values$ as unknown as Observable<OuterType>;
  }

  /**
   * Sets the instance of this component as the valueAccessor. Since this is
   * done here, there's no need to do that on the component that extends this class.
   * https://github.com/angular/components/blob/master/guides/creating-a-custom-form-field-control.md#ngcontrol
   */
  private provideValueAccessor() {
    this.ngControl = this.injector.get(NgControl, undefined, InjectFlags.Optional | InjectFlags.Self);

    if (this.ngControl != null) {
      // Setting the value accessor directly (instead of using
      // the providers) to avoid running into a circular import.
      this.ngControl.valueAccessor = this;
    }
  }

  /**
   * Syncs the outer and inner controls for validity, errors, dirty, and touched states
   */
  private syncOuterAndInnerControls() {
    // The ngControl.control and ngControl.statusChanges used by
    // the following methods are resolved on the next tick
    setTimeout(() => {
      if (!this.ngControl?.control) { return; }
      
      this.syncOuterToInnerErrors();
      this.syncOuterAndInnerTouched();
      this.syncOuterAndInnerDirty();
      this.syncOuterToInnerPending();
    }, 0);
  }

  private syncOuterToInnerErrors() {
    const ngControl = this.ngControl;
    
    if (!ngControl || !ngControl.statusChanges) { return; }

    const syncOuterToInnerErrors$ = ngControl.statusChanges.pipe(
      startWith(ngControl.status),
      map(() => ngControl.errors),
      tap((errors) => {
        this.formControl.setValidators(syncErrorsValidator(errors));
        this.formControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
        this.changeDetectorRef.detectChanges();
      })
    );

    this.subscribeTo(syncOuterToInnerErrors$);
  }

  private syncOuterAndInnerTouched() {
    if (!this.ngControl?.control) { return; }
    const outerControl = this.ngControl.control;

    this.touched$ = extractTouchedChanges(outerControl);

    const syncOuterToInnerTouched$ = this.touched$.pipe(tap(isTouched => {
      if (isTouched) {
        this.formControl.markAsTouched({ onlySelf: true });
      } else {
        this.formControl.markAsUntouched({ onlySelf: true });
      }
    }));

    // inner to outer
    patchObjectMethodWith(this.formControl, 'markAsTouched', (args) => {
      if (!args?.onlySelf) {
        this.onTouched();
      }
    });

    this.subscribeTo(syncOuterToInnerTouched$);
  }

  private syncOuterAndInnerDirty() {
    if (!this.ngControl?.control) { return; }
    const outerControl = this.ngControl.control;
    
    this.dirty$ = extractDirtyChanges(outerControl);

    const syncOuterToInnerDirty$ = this.dirty$.pipe(tap(isDirty => {
      if (isDirty) {
        this.formControl.markAsDirty({ onlySelf: true });
      } else {
        this.formControl.markAsPristine({ onlySelf: true });
      }
    }));

    // inner to outer
    patchObjectMethodWith(this.formControl, 'markAsDirty', (args) => {
      if (!args?.onlySelf) {
        outerControl.markAsDirty();
      }
    });
    
    this.subscribeTo(syncOuterToInnerDirty$);
  }

  private syncOuterToInnerPending() {
    if (!this.ngControl?.control) { return; }

    patchObjectMethodWith(this.ngControl.control, 'markAsPending', () => {
      this.formControl.markAsPending({ onlySelf: true, emitEvent: false });
    });
  }
}

function syncErrorsValidator(errors: ValidationErrors | null): ValidatorFn {
  return () => errors;
}
