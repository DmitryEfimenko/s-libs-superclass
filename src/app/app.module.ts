import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { SimpleAutocompleteComponent } from './simple-autocomplete/simple-autocomplete.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ReactiveFormsModule } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';

@NgModule({
  declarations: [
    AppComponent,
    SimpleAutocompleteComponent,
  ],
  imports: [
    ReactiveFormsModule,
    BrowserModule,
    BrowserAnimationsModule,
    MatAutocompleteModule,
    MatOptionModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
