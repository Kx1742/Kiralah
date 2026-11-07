import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { RECEIPT_MODEL, readReceipt } from "@/lib/receipt/read";
import {
  type ExpectedReceipt,
  type ReceiptScore,
  scoreReceipt,
} from "@/lib/receipt/score";

const directory = path.join(import.meta.dirname, "receipts");
const MEDIA_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

const cases = readdirSync(directory)
  .filter((file) => path.extname(file).toLowerCase() in MEDIA_TYPES)
  .map((file) => ({
    file,
    mediaType:
      MEDIA_TYPES[path.extname(file).toLowerCase() as keyof typeof MEDIA_TYPES],
    expected: JSON.parse(
      readFileSync(
        path.join(directory, `${path.parse(file).name}.expected.json`),
        "utf8",
      ),
    ) as ExpectedReceipt,
  }));

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const results: ({ file: string; source: string; language: string } & (
  ReceiptScore | { error: string }
))[] = [];

describe(`receipt reading with ${RECEIPT_MODEL}`, () => {
  it("has a receipt image and an answer for every case", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.skipIf(!hasKey).each(cases)(
    "$file",
    async ({ file, mediaType, expected }) => {
      const image = readFileSync(path.join(directory, file)).toString("base64");
      const outcome = await readReceipt(image, mediaType);
      const row = {
        file,
        source: expected.source,
        language: expected.language,
      };
      results.push(
        outcome.ok
          ? { ...row, ...scoreReceipt(expected, outcome.receipt) }
          : { ...row, error: outcome.error },
      );
    },
  );

  afterAll(() => {
    if (!hasKey) {
      console.log(
        "\nSet ANTHROPIC_API_KEY to run the receipt eval. Nothing was sent.\n",
      );
      return;
    }
    const scored = results.filter(
      (row): row is (typeof results)[number] & ReceiptScore =>
        !("error" in row),
    );
    const sum = (pick: (row: ReceiptScore) => number) =>
      scored.reduce((total, row) => total + pick(row), 0);
    const percent = (part: number, whole: number) =>
      whole === 0 ? "n/a" : `${Math.round((part / whole) * 100)}%`;
    const expectedItems = sum((row) => row.itemsExpected);

    const summary = {
      model: RECEIPT_MODEL,
      receipts: results.length,
      real: results.filter((row) => row.source === "real").length,
      failedToRead: results.length - scored.length,
      itemsFound: percent(
        sum((row) => row.itemsFound),
        expectedItems,
      ),
      pricesCorrect: percent(
        sum((row) => row.pricesCorrect),
        expectedItems,
      ),
      extraItems: sum((row) => row.extraItems),
      chargesCorrect: percent(
        scored.filter((row) => row.chargesCorrect).length,
        scored.length,
      ),
      totalCorrect: percent(
        scored.filter((row) => row.totalCorrect).length,
        scored.length,
      ),
    };
    console.table(results);
    console.table([summary]);

    const out = path.join(import.meta.dirname, "results");
    mkdirSync(out, { recursive: true });
    writeFileSync(
      path.join(out, "latest.json"),
      `${JSON.stringify({ summary, results }, null, 2)}\n`,
    );
  });
});
