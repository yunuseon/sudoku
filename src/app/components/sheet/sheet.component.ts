import { Component, effect, ElementRef, inject, input, output } from '@angular/core';

@Component({
  selector: 'hks-sheet',
  templateUrl: './sheet.component.html',
  styleUrl: './sheet.component.scss',
  host: {
    popover: '',
    '(toggle)': 'toggled($event)'
  }
})
export class SheetComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  public readonly heading = input.required<string>();
  public readonly stacked = input(false);
  public readonly shown = input<boolean>();

  public readonly closed = output();

  constructor() {
    effect(() => {
      const shown = this.shown();
      this.host.popover = this.stacked() ? 'manual' : 'auto';
      if (shown !== undefined && shown !== this.host.matches(':popover-open')) {
        this.host.togglePopover(shown);
      }
    });
  }

  public open() {
    this.host.showPopover();
  }

  public close() {
    this.host.hidePopover();
  }

  protected toggled(event: ToggleEvent) {
    if (event.newState === 'closed') {
      this.closed.emit();
    }
  }
}
