"use client";

import { useLocale, useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  // The pill moves on tap, even if the new language takes a moment on slow data.
  const [shown, setShown] = useOptimistic<string>(locale);

  return (
    <nav
      aria-label={t("label")}
      className="relative flex rounded-full bg-marble p-1 shadow-md"
      aria-busy={isPending}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 w-12 rounded-full bg-jade transition-transform duration-300"
        style={{
          transform: `translateX(${routing.locales.findIndex((option) => option === shown) * 100}%)`,
        }}
      />
      {routing.locales.map((option) => {
        const isCurrent = option === shown;
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
                setShown(option);
                router.replace(pathname, { locale: option });
                router.refresh();
              });
            }}
            className={`relative min-h-11 w-12 rounded-full text-sm font-extrabold transition-colors duration-300 ${
              isCurrent ? "text-white" : "text-ink"
            }`}
          >
            {t(`${option}.short`)}
          </button>
        );
      })}
    </nav>
  );
}
