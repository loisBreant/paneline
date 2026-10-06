import { describe, expect, test } from "claude-code/testing";

import { memo } from "../hooks/memo";

describe("memo", () => {
  test("M1 an entry used again outlives older entries that were not", () => {
    const cached = memo<object>(2);
    const hot = cached("hot", () => ({}));
    cached("cold", () => ({}));
    cached("hot", () => ({}));
    cached("newest", () => ({}));

    expect(cached("hot", () => ({}))).toBe(hot);
  });

  test("M2 the cache never holds more entries than its limit", () => {
    const cached = memo<number>(3);
    const built: string[] = [];
    for (const key of ["a", "b", "c", "d"]) cached(key, () => built.push(key));
    cached("a", () => built.push("a-again"));

    expect(built).toEqual(["a", "b", "c", "d", "a-again"]);
  });
});
