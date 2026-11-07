"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Says plainly when the phone has no connection, and that nothing typed is lost. */
export function OfflineBanner() {
  const t = useTranslations("offline");
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <p
      role="status"
      className="fixed inset-x-0 top-0 z-50 bg-ink px-4 py-2 text-center text-sm font-bold text-cream"
    >
      {t("banner")}
    </p>
  );
}
