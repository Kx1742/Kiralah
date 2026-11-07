import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ms from "../../messages/ms.json";
import zhCN from "../../messages/zh-CN.json";

function keysOf(messages: object, prefix = ""): string[] {
  return Object.entries(messages)
    .flatMap(([key, value]) =>
      typeof value === "object"
        ? keysOf(value, `${prefix}${key}.`)
        : `${prefix}${key}`,
    )
    .sort();
}

describe("translations", () => {
  it.each([
    ["ms", ms],
    ["zh-CN", zhCN],
  ])("%s has exactly the same keys as en", (_locale, messages) => {
    expect(keysOf(messages)).toEqual(keysOf(en));
  });
});
