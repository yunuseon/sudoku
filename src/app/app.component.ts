import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'hks-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: ':host { display: block; height: 100%; }'
})
export class AppComponent {}
