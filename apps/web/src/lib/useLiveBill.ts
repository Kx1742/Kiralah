import { useCallback, useEffect, useRef, useState } from "react";
import type { SavedBill } from "./savedBill";

const POLL_MS = 3000;

/**
 * Asks for changes every 3 seconds while the page is on screen. Unchanged bills
 * answer 304 with no body, which matters on slow, metered mobile data.
 */
export function useLiveBill(initial: SavedBill) {
  const [saved, setSaved] = useState(initial);
  const [offline, setOffline] = useState(false);
  /** The payer deleted the bill, or it reached 30 days. */
  const [gone, setGone] = useState(false);
  const version = useRef(initial.version);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/bills/${initial.id}`, {
        headers: { "If-None-Match": `W/"${version.current}"` },
        cache: "no-store",
      });
      setOffline(response.status >= 500);
      if (response.status === 404) setGone(true);
      if (response.status !== 200) return;
      const next = (await response.json()) as SavedBill;
      version.current = next.version;
      setSaved(next);
    } catch {
      setOffline(true);
    }
  }, [initial.id]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  return { saved, refresh, offline, gone };
}
