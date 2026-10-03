import { Component, ElementRef, inject, input, output } from '@angular/core';
import { levels } from '../../logic/difficulty';
import { NewGameOptions } from '../../logic/persistence';

@Component({
  selector: 'hks-new-game',
  templateUrl: './new-game.component.html',
  styleUrl: './new-game.component.scss',
  host: {
    popover: ''
  }
})
export class NewGameComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  public readonly options = input.required<NewGameOptions | null>();
  public readonly mistakeLimits = input.required<(number | null)[]>();

  public readonly optionsChange = output<Partial<NewGameOptions>>();
  public readonly start = output();

  protected readonly levels = levels;

  public open() {
    this.host.showPopover();
  }

  protected startGame() {
    this.start.emit();
    this.host.hidePopover();
  }
}
