import { describe, expect, test } from "claude-code/testing";

import {
  API_KEY,
  BACKGROUND_NOTE,
  CACHE_TITLE,
  NO_RENT,
  OPUS,
  RENT_TITLE,
  SPLIT_TITLE,
  blocks,
  bodyOf,
  lines,
  mainTurn,
  sessionWithAllBlocks,
  setSessionCost,
  spendPane,
  startFreshSession,
  totalsOf,
  worldOf,
} from "./spend-world";

const MAIN_OPUS_4_USD = 1_000_000;

describe("spend tab edges", () => {
  test("F1 every drawn line of the tab starts at one left column: totals, headings, summary, spend rows, background note, miss rows and tool-result rows", async ($, on) => {
    const world = worldOf(on, API_KEY);
    await sessionWithAllBlocks($, world);

    const body = bodyOf(await lines(await spendPane($))).filter((line) => line.text !== "");

    expect(body.length).toBeGreaterThanOrEqual(12);
    expect(new Set(body.map((line) => line.indent)).size).toBe(1);
  });

  test("F2 a tab with no cache misses and no tool results still starts every line at one left column, the empty-state lines too", async ($, on) => {
    const world = worldOf(on, API_KEY);
    await startFreshSession($, world);
    await mainTurn($, world, { model: OPUS, tokens: { input: MAIN_OPUS_4_USD } });
    await setSessionCost($, world, 4);

    const shown = await lines(await spendPane($));

    const body = bodyOf(shown).filter((line) => line.text !== "");
    expect(body.map((line) => line.text)).toContain(NO_RENT);
    expect(new Set(body.map((line) => line.indent)).size).toBe(1);
  });

  test("F3 the right-aligned numbers of the spend rows, miss rows and tool-result rows end at the same right edge as the totals row across the pane", async ($, on) => {
    const world = worldOf(on, API_KEY);
    await sessionWithAllBlocks($, world);

    const pane = await spendPane($);

    const found = await blocks(pane);
    const rows = [
      ...(found[SPLIT_TITLE]?.rows ?? []).filter((row) => row.text !== BACKGROUND_NOTE),
      ...(found[CACHE_TITLE]?.rows ?? []).slice(1),
      ...(found[RENT_TITLE]?.rows ?? []),
    ];
    const edges = rows.map((row) => row.edge);
    const totalsEdge = totalsOf(await lines(pane))?.values.edge;
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(new Set(edges)).toEqual(new Set([totalsEdge]));
  });
});
