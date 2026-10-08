import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'hks-about',
  imports: [RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  protected readonly repository = 'https://git.yunusozturk.de/yunus/sudoku';
}
