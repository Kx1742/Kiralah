import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ms", "zh-CN"],
  defaultLocale: "en",
  // Links stay short and identical in every language (/b/x7Kp2): the locale
  // comes from the cookie, then the phone's Accept-Language header.
  localePrefix: "never",
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
