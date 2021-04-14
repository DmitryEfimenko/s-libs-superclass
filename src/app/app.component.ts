import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';

const createOption = (value: string, label: string, preferred: boolean) => ({ value, label, preferred });
const inOption = createOption('IN', 'India', false);
const idOption = createOption('ID', 'Indonesia', false);
const ioOption = createOption('IO', 'British Indian Ocean Territory', false);
const options = [ioOption, inOption, idOption];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  control = new FormControl('', Validators.required);
  options = options;

  ngOnInit() {
    this.control.markAsTouched();
  }
}
