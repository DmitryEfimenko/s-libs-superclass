import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  Input,
} from '@angular/core';
import { combineLatest, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { WrappedFormControlSuperclass } from './wrapped-form-control-superclass';
import { Subjectize } from 'subjectize';
import { concatLatestFrom } from '../rxjs/concatLatestFrom';
import { FocusMonitor } from '@angular/cdk/a11y';

export type OuterType = string | null | undefined;
export type InnerType = string | null | undefined;
export type ValueSelector = ((option: AutocompleteOption) => string) | undefined;

@Component({
  selector: 'app-simple-autocomplete',
  templateUrl: './simple-autocomplete.component.html',
  styleUrls: ['./simple-autocomplete.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleAutocompleteComponent extends WrappedFormControlSuperclass<OuterType, InnerType> {

  private latestValueLabel$: Observable<string | undefined>;
  private focusOut$ = new Subject();

  filteredOptions$: Observable<AutocompleteOption[]>;

  @Input() allowNonOptionValue: boolean;

  /**
   * The name attribute to apply to the input
   */
  @Input() name: string;

  /**
   * The autocomplete attribute to apply to the input
   */
   @Input() autocomplete = 'off';

  /**
   * Whether to automatically highlight the first option when
   * displaying the autocomplete drop down. Defaults to true.
   */
  @Input() autoActivateFirstOption = true;

  @Input() options: AutocompleteOption[];
  @Subjectize('options')
  private options$ = new ReplaySubject<AutocompleteOption[]>(1);

  /**
   * Trigger a focus out on 'esc'
   */
  @HostListener('keydown.escape')
  onEscapePressed() {
    this.focusOut$.next();
  }

  constructor(
    injector: Injector,
    private focusMonitor: FocusMonitor,
    private elementRef: ElementRef<HTMLElement>,
  ) {
    super(injector);

    this.declareLatestValueLabel()
    this.declareFilteredOptions();
    this.monitorFocusOut();
    this.handleFocusOut();
  }

  innerToOuter(outgoingValues$: Observable<InnerType>) {
    return outgoingValues$.pipe(
      concatLatestFrom(() => this.options$),
      switchMap(([value, options]) => {
        if (this.allowNonOptionValue) {
          return of(value);
        } else {
          const matchingOptionValue = options.find(x => x.label === value)?.value;
          return of(matchingOptionValue).pipe(filter(x => x !== undefined));
        }
      })
    );
  }

  outerToInner(incomingValues$: Observable<OuterType>) {
    return incomingValues$.pipe(
      concatLatestFrom(() => this.options$),
      map(([value, options]) => {
        const foundOption = options.find(x => x.value === value);
        if (foundOption) {
          return foundOption.label;
        }
        return this.allowNonOptionValue ? value : '';
      })
    );
  }

  private declareLatestValueLabel() {
    this.latestValueLabel$ = this.latestValue$.pipe(
      withLatestFrom(this.options$),
      map(([value, options]) => options.find(x => x.value === value)?.label)
    );
  }

  private declareFilteredOptions() {
    // these are the streams that are used to trigger option filtering:
    // - user typing in the input
    // - an option label associated with the incomingValue
    const value$ = merge(this.inputValues$, this.latestValueLabel$).pipe(distinctUntilChanged());
    
    this.filteredOptions$ = combineLatest([
      value$,
      this.options$,
    ]).pipe(
      map(([value, options]) => {
        return this.filterOptions(options, value);
      })
    );
  }

  private filterOptions(options: AutocompleteOption[], value: InnerType) {
    if (value == null) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(value.toLowerCase()));
  }

  private monitorFocusOut() {
    this.focusMonitor
      .monitor(this.elementRef.nativeElement, true)
      .subscribe((origin) => {
        if (!origin) {
          this.focusOut$.next();
        }
      });
  }

  private handleFocusOut() {
    const resetOnFocusOut$ = this.focusOut$.pipe(
      withLatestFrom(this.latestValueLabel$),
      tap(([_, latestValueLabel]) => {
        if (this.formControl.value !== latestValueLabel) {
          this.formControl.setValue(latestValueLabel, { emitEvent: false });
        }
      })
    );

    this.subscribeTo(resetOnFocusOut$);
  }
}

/**
 * Option interface for use with this autocomplete component
 */
export interface AutocompleteOption {
  /**
   * The value to return when a valid option is selected
   */
  value: string;
  /**
   * The translated label that should be shown in the autocomplete list.
   * This is the value that the input must match in order to be considered valid.
   */
  label: string;
  /**
   * Whether the value is preferred. Preferred values will be shown in bold
   * at the top of the autocomplete list.
   */
  preferred?: boolean;
}
