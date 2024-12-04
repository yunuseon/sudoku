import { Directive } from '@angular/core';

@Directive({
  selector: '[hksPage]',
  host: {
    '[attr.page]': '""'
  }
})
export class PageDirective {
}
