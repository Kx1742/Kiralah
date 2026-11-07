import { describe, expect, it, vi } from "vitest";
import { readReceipt } from "./read";
import type { ScannedReceipt } from "./schema";

const receipt: ScannedReceipt = {
  isReceipt: true,
  restaurantName: "Restoran ABC",
  items: [{ name: "Nasi lemak", quantity: 1, lineTotal: "12.40" }],
  subtotal: "12.40",
  serviceCharge: null,
  serviceTax: null,
  pricesIncludeTax: false,
  discounts: [],
  rounding: null,
  total: "12.40",
};

const clientReturning = (response: object) => {
  const parse = vi.fn().mockResolvedValue(response);
  return { client: { messages: { parse } } as never, parse };
};

describe("readReceipt", () => {
  it("asks Claude Haiku 5.5 for structured output and returns the receipt", async () => {
    const { client, parse } = clientReturning({
      stop_reason: "end_turn",
      parsed_output: receipt,
    });
    expect(await readReceipt("aGVsbG8=", "image/jpeg", client)).toEqual({
      ok: true,
      receipt,
    });
    const request = parse.mock.calls[0]![0];
    expect(request.model).toBe("claude-haiku-5-5");
    expect(request.output_config.format).toBeDefined();
    expect(request.messages[0].content[0].source).toEqual({
      type: "base64",
      media_type: "image/jpeg",
      data: "aGVsbG8=",
    });
  });

  it.each([
    [
      "a refusal",
      { stop_reason: "refusal", parsed_output: null },
      "unreadable",
    ],
    [
      "a cut-off answer",
      { stop_reason: "max_tokens", parsed_output: null },
      "unreadable",
    ],
    [
      "output that does not parse",
      { stop_reason: "end_turn", parsed_output: null },
      "unreadable",
    ],
    [
      "a photo that is not a receipt",
      {
        stop_reason: "end_turn",
        parsed_output: { ...receipt, isReceipt: false, items: [] },
      },
      "notReceipt",
    ],
  ])("turns %s into a friendly error", async (_name, response, error) => {
    const { client } = clientReturning(response);
    expect(await readReceipt("aGVsbG8=", "image/jpeg", client)).toEqual({
      ok: false,
      error,
    });
  });

  it("treats network trouble as busy, so the payer can retry or type instead", async () => {
    const parse = vi.fn().mockRejectedValue(new Error("socket hang up"));
    const outcome = await readReceipt("aGVsbG8=", "image/jpeg", {
      messages: { parse },
    } as never);
    expect(outcome).toEqual({ ok: false, error: "busy" });
  });
});
