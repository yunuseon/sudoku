export type Field<K extends string = string> = {
  key: K;
  label: string;
  type: 'color' | 'range' | 'toggle' | 'choice';
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
};

export type FieldValue = string | number | boolean;
