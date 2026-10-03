import { Component, input, output } from '@angular/core';
import { FieldComponent } from '../field/field.component';
import { FieldValue } from '../field/field';
import { preferenceFields, Preferences } from '../../settings/preferences';
import { pickValid } from '../../core/validation';

@Component({
  selector: 'hks-preferences',
  imports: [FieldComponent],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss'
})
export class PreferencesComponent {
  public readonly preferences = input.required<Preferences>();

  public readonly preferencesChange = output<Partial<Preferences>>();

  protected readonly fields = preferenceFields;

  protected changeField(key: keyof Preferences, value: FieldValue) {
    this.preferencesChange.emit(pickValid(this.preferences(), [key], { [key]: value }));
  }
}
