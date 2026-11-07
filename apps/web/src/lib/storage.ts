import { useSyncExternalStore } from "react";

/* Browser storage can be empty or blocked (private mode, in-app browsers): never let it break a screen. */

const CHANGED = "kiralah-storage";

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
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Storage full or blocked: the screen keeps working, it just will not resume later.
  }
}

export function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Same as above.
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}

/** A stored value that re-renders when it changes. Null on the server. */
export function useStored<T>(key: string): T | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const STORAGE_KEYS = {
  itemisedDraft: "kiralah:draft:itemised",
  equalDraft: "kiralah:draft:equal",
  editDraft: (billId: string) => `kiralah:edit:${billId}`,
  payer: "kiralah:payer",
  editToken: (billId: string) => `kiralah:bill:${billId}`,
  /** Which name this phone picked on a bill, and the token that proves it. */
  person: (billId: string) => `kiralah:person:${billId}`,
};

export type StoredPerson = { personId: string; token: string };

/** Not secret: only needs to be unique within one bill. */
export function newLocalId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
