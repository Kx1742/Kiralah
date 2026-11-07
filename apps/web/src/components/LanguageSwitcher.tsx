"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <nav
      aria-label={t("label")}
      className="flex rounded-full bg-white/95 p-1 shadow-sm"
      aria-busy={isPending}
    >
      {routing.locales.map((option) => {
        const isCurrent = option === locale;
        return (
          <button
            key={option}
            type="button"
            lang={option}
            aria-label={`${t(`${option}.short`)} ${t(`${option}.name`)}`}
            aria-current={isCurrent ? "true" : undefined}
            onClick={() => {
              if (isCurrent) return;
              startTransition(() => {
                router.replace(pathname, { locale: option });
                router.refresh();
              });
            }}
            className={`min-h-11 min-w-12 rounded-full px-3 text-sm font-extrabold transition-colors ${
              isCurrent ? "bg-ocean text-white" : "text-ink"
            }`}
          >
            {t(`${option}.short`)}
          </button>
        );
      })}
    </nav>
  );
}
