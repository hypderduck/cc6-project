// Every browser-storage call is wrapped: storage can be blocked or empty.
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function clientId() {
  let id = load<string | null>('ww.client', null);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    save('ww.client', id);
  }
  return id;
}
