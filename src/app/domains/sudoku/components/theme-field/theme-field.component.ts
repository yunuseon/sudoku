import { Component, input, output } from '@angular/core';
import { ThemeField } from '../../theme/theme';

type FieldValue = string | number | boolean;

const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');

@Component({
  selector: 'hks-theme-field',
  templateUrl: './theme-field.component.html',
  styleUrl: './theme-field.component.scss'
})
export class ThemeFieldComponent {
  public readonly field = input.required<ThemeField>();
  public readonly value = input.required<FieldValue>();

  public readonly valueChange = output<FieldValue>();

  // Colours can carry an alpha channel (#rrggbbaa), the native colour input only edits #rrggbb
  protected color() {
    return String(this.value()).slice(0, 7);
  }

  protected alpha() {
    const value = String(this.value());
    return value.length === 9 ? parseInt(value.slice(7), 16) / 255 : null;
  }

  protected changeColor(color: string) {
    const alpha = this.alpha();
    this.valueChange.emit(alpha === null ? color : color + toHex(alpha * 255));
  }

  protected changeAlpha(alpha: number) {
    this.valueChange.emit(this.color() + toHex(alpha * 255));
  }

  protected number(event: Event) {
    return Number((event.target as HTMLInputElement).value);
  }

  protected text(event: Event) {
    return (event.target as HTMLInputElement).value;
  }

  protected checked(event: Event) {
    return (event.target as HTMLInputElement).checked;
  }
}
