"use client";

import { useEffect } from "react";

/** Registers the offline fallback page. Production only, so development never caches. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a bonus: the app works the same without it.
      });
    }
  }, []);
  return null;
}
