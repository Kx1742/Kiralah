import { describe, expect, it } from "vitest";
import { whatsAppUrl } from "./share";

describe("whatsAppUrl", () => {
  it("keeps the emoji, spaces and link intact", () => {
    const text =
      "🍛 Makan — RM41.14 & pay Ali: https://splitlah.app/b/x7Kp2?a=1";
    const url = new URL(whatsAppUrl(text));
    expect(url.origin).toBe("https://wa.me");
    expect(url.searchParams.get("text")).toBe(text);
  });
});
