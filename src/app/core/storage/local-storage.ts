export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

export const readStorage = (key: string): Json => {
  try {
    const stored = localStorage.getItem(key);
    const parsed: Json = stored === null ? null : JSON.parse(stored);
    return parsed;
  } catch {
    return null;
  }
};

export const writeStorage = (key: string, value: Json): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
