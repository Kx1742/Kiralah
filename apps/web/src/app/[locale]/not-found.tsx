import { useTranslations } from "next-intl";
import { Waves } from "@/components/illustrations";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="flex min-h-dvh flex-col justify-between">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-10">
        <div className="rounded-card bg-white p-6 shadow-float">
          <h1 className="text-2xl font-extrabold text-ocean">{t("title")}</h1>
          <p className="mt-2 text-lg text-ink-soft">{t("body")}</p>
          <Link
            href="/"
            className="mt-6 flex min-h-14 items-center justify-center rounded-full bg-coral px-6 text-lg font-extrabold text-white"
          >
            {t("home")}
          </Link>
        </div>
      </div>
      <Waves className="block h-24 w-full rotate-180" />
    </main>
  );
}
