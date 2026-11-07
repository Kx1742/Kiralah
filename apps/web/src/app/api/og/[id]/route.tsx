import { calculateBill, formatRinggit } from "@kiralah/core";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getBill } from "@/lib/bills";

const JADE = "#0e5a4a";
const JADE_DEEP = "#0a4437";
const CREAM = "#f8f1e3";
const KAYA = "#e3b23c";
const CHILLI = "#b3301c";

/** Fetches only the letters needed, so Chinese names render without a huge font. */
async function loadFont(
  family: string,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
    const css = await (
      await fetch(url, { signal: AbortSignal.timeout(2500) })
    ).text();
    const source = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(
      css,
    )?.[1];
    if (!source) return null;
    return await (
      await fetch(source, { signal: AbortSignal.timeout(2500) })
    ).arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const saved = await getBill(id);
  if (!saved) return new Response(null, { status: 404 });

  const locale =
    routing.locales.find((option) => option === saved.locale) ??
    routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "bill" });
  const brand = "KiraLah";
  const title = saved.restaurantName
    ? t("makanAt", { place: saved.restaurantName })
    : t("makanBill");
  const total = formatRinggit(calculateBill(saved.bill).totalSen);
  const subtitle = t("linkPreviewBody", { payer: saved.payerName });

  const [brandFont, textFont] = await Promise.all([
    loadFont("Caveat+Brush", brand),
    loadFont("Noto+Sans+SC:wght@800", `${title}${total}${subtitle}`),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: JADE,
        color: CREAM,
        fontFamily: "text",
      }}
    >
      <div style={{ display: "flex", height: 56 }}>
        {Array.from({ length: 20 }, (_, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              background: index % 2 === 0 ? CHILLI : CREAM,
              borderBottomLeftRadius: 30,
              borderBottomRightRadius: 30,
            }}
          />
        ))}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 64px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            background: JADE_DEEP,
            border: `8px solid ${KAYA}`,
            borderRadius: 28,
            padding: "2px 40px 10px",
            fontFamily: "brand",
            fontSize: 84,
          }}
        >
          {brand}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 50,
            fontWeight: 800,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 8,
            fontSize: 96,
            fontWeight: 800,
            color: KAYA,
          }}
        >
          {total}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 8,
            fontSize: 36,
            fontWeight: 800,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        ...(brandFont
          ? [{ name: "brand", data: brandFont, weight: 400 as const }]
          : []),
        ...(textFont
          ? [{ name: "text", data: textFont, weight: 800 as const }]
          : []),
      ],
      headers: { "Cache-Control": "public, max-age=3600" },
    },
  );
}
