import { SimpleAutocompleteComponent } from './simple-autocomplete.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { createHostFactory, SpectatorHost } from '@ngneat/spectator';

const createOption = (value: string, label: string, preferred: boolean) => ({ value, label, preferred });
const inOption = createOption('IN', 'India', false);
const idOption = createOption('ID', 'Indonesia', false);
const ioOption = createOption('IO', 'British Indian Ocean Territory', false);
const options = [ioOption, inOption, idOption];


describe('SimpleAutocompleteComponent', () => {
  let spectator: SpectatorHost<SimpleAutocompleteComponent>;
  let loader: HarnessLoader;
  let input: MatAutocompleteHarness;
  let hostControl: FormControl;

  const createHost = createHostFactory({
    component: SimpleAutocompleteComponent,
    imports: [ReactiveFormsModule, MatAutocompleteModule],
    declarations: [],
    disableAnimations: true
  });

  const template = `
  <app-simple-autocomplete
    [options]="options"
    [formControl]="control"
    name="foo"
  >
  </app-simple-autocomplete>
  `;

  beforeEach(async () => {
    hostControl = new FormControl();

    spectator = createHost(template, {
      hostProps: {
        options,
        control: hostControl,
      },
    });
    loader = TestbedHarnessEnvironment.loader(spectator.fixture);
    input = await loader.getHarness(MatAutocompleteHarness);
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
    expect(spectator.query('input[name="foo"]')).toBeTruthy();
  });

  it('should display 3 options when input is clicked', async () => {
    await input.focus();
    const opts = await input.getOptions();
    expect(opts.length).toEqual(3);
  });

  // this test fails even though described functionality works
  // potentially due to https://github.com/angular/components/issues/22428
  // it('should set input to the label value of the option corresponding to the incoming value', async () => {
  //   hostControl.setValue('IN');
  //   expect(await input.getValue()).toBe('India');
  //   const opts = await input.getOptions();
  //   expect(opts.length).toBe(2);
  // });

  it('should filter options for a country code value as if it was a label value', async () => {
    await input.enterText('o');
    await input.focus();
    const opts = await input.getOptions();
    expect(opts.length).toEqual(2);
  });

  it('should emit value when autocomplete option is selected', async () => {
    await input.selectOption({ text: 'Indonesia' });
    expect(hostControl.value).toBe('ID');
  });

  describe('PROP: allowNonOptionValue', () => {
    describe('GIVEN: allowNonOptionValue is false', () => {
      it('should not allow non option values ', async () => {
        await input.enterText('asd');
        expect(hostControl.value).toBeNull();
      });

      it('should set input text to the previous valid option label if input does not match any of the options', async () => {
        function clearInput() {
          // currently harness does not provide a method to get input. Access it the old way.
          const inputEl = spectator.query<HTMLInputElement>('input.mat-autocomplete-trigger');
          if (!inputEl) {
            throw new Error('Implementation of MatAutocomplete DOM has changed');
          }
          inputEl.value = '';
        }

        await input.selectOption({ text: 'Indonesia' });
        clearInput();
        await input.enterText('qwe');
        await input.blur();
        expect(hostControl.value).toBe('ID');
        expect(await input.getValue()).toBe('Indonesia');
      });
    });

    describe('GIVEN: allowNonOptionValue is true', () => {
      it('should allow non option values when allowNonOptionValue is true', async () => {
        spectator.setInput({ allowNonOptionValue: true });
        await input.enterText('asd');
        expect(hostControl.value).toBe('asd');
      });
    });
  });

  describe('Sync outer and inner controls', () => {
    it('should sync the outer validation errors to the inner control', () => {
      hostControl.setValidators([Validators.required]);
      hostControl.updateValueAndValidity();
  
      expect(spectator.component.formControl.errors).toEqual({ required: true });
    });
  
    it('should sync outer touched to the inner', () => {
      hostControl.markAsTouched();
      expect(spectator.component.formControl.touched).toBeTrue();
    });
  
    it('should sync inner touched to the outer', async () => {
      await input.focus();
      await input.blur();
      expect(hostControl.touched).toBeTrue();
    });
  
    it('should sync outer dirty to the inner', () => {
      hostControl.markAsDirty();  
      expect(spectator.component.formControl.dirty).toBeTrue();
    });
  
    it('should sync inner dirty to the outer', async () => {
      await input.enterText('a');
      expect(hostControl.dirty).toBeTrue();
    });
  });
});
