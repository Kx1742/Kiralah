/* Browser storage can be empty or blocked (private mode, in-app browsers): never let it break a screen. */

export function readStored<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the screen keeps working, it just will not resume later.
  }
}

export function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Same as above.
  }
}

export const STORAGE_KEYS = {
  itemisedDraft: "splitlah:draft:itemised",
  equalDraft: "splitlah:draft:equal",
  payer: "splitlah:payer",
  editToken: (billId: string) => `splitlah:bill:${billId}`,
};

/** Not secret: only needs to be unique within one bill. */
export function newLocalId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
