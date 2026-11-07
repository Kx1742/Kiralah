"use client";

import { useTranslations } from "next-intl";
import { Awning } from "@/components/illustrations";

/** Shown when a page fails, for example when the database cannot be reached. */
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="kopitiam-wall h-16 shrink-0">
        <Awning className="relative h-9 w-full drop-shadow-md" />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-card bg-marble p-6 shadow-float">
          <h1 className="text-2xl font-extrabold text-jade">{t("title")}</h1>
          <p className="mt-2 text-lg text-ink-soft">{t("body")}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 flex min-h-14 w-full cursor-pointer items-center justify-center rounded-full bg-chilli px-6 text-lg font-extrabold text-white"
          >
            {t("retry")}
          </button>
          {/* A full page load, not client navigation, so a broken page cannot get in the way. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="mt-3 flex min-h-12 items-center justify-center font-extrabold text-jade underline"
          >
            {t("home")}
          </a>
        </div>
      </div>
      <div aria-hidden className="tile-floor h-12 shrink-0" />
    </main>
  );
}
