import { useTranslations } from "next-intl";
import { Awning } from "@/components/illustrations";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="kopitiam-wall h-16 shrink-0">
        <Awning className="relative h-9 w-full drop-shadow-md" />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-card bg-marble p-6 shadow-float">
          <h1 className="text-2xl font-extrabold text-jade">{t("title")}</h1>
          <p className="mt-2 text-lg text-ink-soft">{t("body")}</p>
          <Link
            href="/"
            className="mt-6 flex min-h-14 items-center justify-center rounded-full bg-chilli px-6 text-lg font-extrabold text-white transition hover:brightness-110 active:translate-y-0.5"
          >
            {t("home")}
          </Link>
        </div>
      </div>
      <div aria-hidden className="tile-floor h-12 shrink-0" />
    </main>
  );
}
