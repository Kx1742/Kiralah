import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

/** False while rendering on the server, true in the browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

/** The current step lives in the URL hash, so the phone's Back button moves between steps. */
export function useHashStep<Step extends string>(
  steps: readonly Step[],
  fallback: Step,
) {
  const step = useSyncExternalStore(
    subscribeToHash,
    () => {
      const hash = window.location.hash.slice(1);
      return steps.find((option) => option === hash) ?? fallback;
    },
    () => fallback,
  );
  const goTo = (next: Step) => {
    window.location.hash = next;
  };
  return [step, goTo] as const;
}
