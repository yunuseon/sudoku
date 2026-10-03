import { Component, input, output } from '@angular/core';
import { Field, FieldValue } from './field';

const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');

@Component({
  selector: 'hks-field',
  templateUrl: './field.component.html',
  styleUrl: './field.component.scss'
})
export class FieldComponent {
  public readonly field = input.required<Field>();
  public readonly value = input.required<FieldValue>();

  public readonly valueChange = output<FieldValue>();

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
}
