import type { Field } from '../components/field/field';
import type { Json } from '../core/storage/local-storage';
import { pickValid } from '../core/validation';

export type Preferences = {
  highlightMatchingCells: boolean;
};

export const defaultPreferences: Preferences = {
  highlightMatchingCells: true
};

export const preferenceFields: Field<keyof Preferences>[] = [
  { key: 'highlightMatchingCells', label: 'Highlight matching numbers', type: 'toggle' }
];

export const parsePreferences = (value: Json) =>
  pickValid(
    defaultPreferences,
    preferenceFields.map(field => field.key),
    value
  );
