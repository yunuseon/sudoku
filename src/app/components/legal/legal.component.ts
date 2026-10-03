import { Component } from '@angular/core';

@Component({
  selector: 'hks-legal',
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss'
})
export class LegalComponent {
  protected readonly operator = 'Yunus Öztürk';
  protected readonly contact = 'https://github.com/yunuseon/sudoku/issues';
}
