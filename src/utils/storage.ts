export const saveLocal = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

export const loadLocal = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
};
