"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  applyDisplay,
  DEFAULT_DISPLAY,
  type Display,
  DISPLAY_KEY,
} from "@/lib/display";
import { useStored, writeStored } from "@/lib/storage";
import { Choice } from "./ui";

/** Text size and colours, one tap from every screen. Remembered on this phone. */
export function DisplaySettings() {
  const t = useTranslations("display");
  const [open, setOpen] = useState(false);
  const display = {
    ...DEFAULT_DISPLAY,
    ...useStored<Partial<Display>>(DISPLAY_KEY),
  };

  const change = (next: Partial<Display>) => {
    const updated = { ...display, ...next };
    writeStored(DISPLAY_KEY, updated);
    applyDisplay(updated);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={t("open")}
        onClick={() => setOpen(!open)}
        className="grid h-11 min-w-11 cursor-pointer place-items-center rounded-full bg-marble px-2 text-base font-extrabold text-ink shadow-md"
      >
        <span aria-hidden>{t("icon")}</span>
      </button>
      {open && (
        <div
          role="group"
          aria-label={t("title")}
          className="fixed inset-x-3 top-24 z-50 ml-auto flex max-w-xs flex-col gap-3 rounded-2xl bg-marble p-4 text-ink shadow-xl ring-2 ring-jade"
        >
          <p className="text-sm font-extrabold">{t("textSize")}</p>
          <Choice
            label={t("textSize")}
            value={display.text}
            onChange={(text) => change({ text })}
            options={[
              { value: "normal", label: t("normal") },
              { value: "large", label: t("large") },
            ]}
          />
          <p className="text-sm font-extrabold">{t("colours")}</p>
          <Choice
            label={t("colours")}
            value={display.theme}
            onChange={(theme) => change({ theme })}
            options={[
              { value: "system", label: t("auto") },
              { value: "light", label: t("light") },
              { value: "dark", label: t("dark") },
            ]}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 cursor-pointer rounded-full bg-jade px-4 font-extrabold text-white"
          >
            {t("done")}
          </button>
        </div>
      )}
    </div>
  );
}
