export type Guard<T> = (value: unknown) => value is T;

export const isString: Guard<string> = (value): value is string => typeof value === 'string';

export const isBoolean: Guard<boolean> = (value): value is boolean => typeof value === 'boolean';

export const isNumber: Guard<number> = (value): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isRecord: Guard<Record<string, unknown>> = (value): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isOneOf =
  <T>(values: readonly T[]): Guard<T> =>
  (value): value is T =>
    values.some(each => each === value);

export const isShape =
  <T>(shape: { [K in keyof T]-?: Guard<T[K]> }): Guard<T> =>
  (value): value is T =>
    isRecord(value) &&
    Object.entries<Guard<unknown>>(shape).every(([key, guard]) => guard(value[key]));

type Setting = string | number | boolean;

const isLike =
  <V extends Setting>(example: V): Guard<V> =>
  (value): value is V =>
    typeof value === typeof example && (typeof value !== 'number' || Number.isFinite(value));

export const pickValid = <T extends Record<string, Setting>>(
  defaults: T,
  keys: readonly (keyof T & string)[],
  value: unknown
): Partial<T> => {
  if (!isRecord(value)) {
    return {};
  }

  return keys.reduce<Partial<T>>((valid, key) => {
    const stored = value[key];
    return isLike(defaults[key])(stored) ? { ...valid, [key]: stored } : valid;
  }, {});
};
