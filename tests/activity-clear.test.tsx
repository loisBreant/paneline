import { describe, expect, test } from "claude-code/testing";
import type { Engine } from "claude-code/testing";

import {
  FAILING_COMMAND,
  callRowKeys,
  clearButtonsOf,
  editFile,
  finishTurn,
  headingLineOf,
  isDim,
  lines,
  paneOnTab,
  pressClear,
  readFile,
  runCommand,
  texts,
  worldOf,
} from "./clear-world";
import type { World } from "./clear-world";
import type { Line } from "./skills-tree";

const KEPT_CALLS = 50;
const CALLS_BEYOND_KEPT = KEPT_CALLS + 10;
const STATS_LINE = /\d+ tools? · \d+ files? · \+\d+ · −\d+ · \d+ errors?$/;
const ELAPSED = /^(\S+) · /;
const SECTIONS = ["Now", "Tool mix", "Timeline", "Failed"];
const FIVE_SECONDS = 5_000;
const TWO_SECONDS = 2_000;

describe("activity clear button", () => {
  test("A1 after some calls the Now heading line ends with a dim clear button", async ($, on) => {
    const world = worldOf(on);
    await ranBeforeClear($, world);

    const pane = await paneOnTab($, "Activity");

    const shown = await lines(pane);
    const heading = headingLineOf(shown, "Now");
    expect(clearButtonsOf(shown)).toHaveLength(1);
    expect(heading?.parts.at(-1)).toBe(clearButtonsOf(shown)[0]);
    expect(clearButtonsOf(shown).every(isDim)).toBe(true);
  });

  test("A2 with no call there is no clear button, it shows after the first call and goes after the press", async ($, on) => {
    const world = worldOf(on);
    const pane = await paneOnTab($, "Activity");
    const beforeAnyCall = clearButtonsOf(await lines(pane)).length;

    await runCommand($, world, "echo first");
    const afterFirstCall = clearButtonsOf(await lines(pane)).length;
    await pressClear(pane, world);
    const afterPress = clearButtonsOf(await lines(pane)).length;

    expect([beforeAnyCall, afterFirstCall, afterPress]).toEqual([0, 1, 0]);
  });

  test("A3 pressing clear empties the timeline, the failed block and the tool mix", async ($, on) => {
    const world = worldOf(on);
    await ranBeforeClear($, world);
    const pane = await paneOnTab($, "Activity");

    await pressClear(pane, world);

    const shown = await texts(pane);
    expect(await callRowKeys(pane)).toEqual([]);
    expect(headingLineOf(await lines(pane), "Failed")).toBeUndefined();
    expect(shown).toContain("no calls yet");
    expect(shown).toContain("nothing run yet");
  });

  test("A4 a call that runs after the press is the only row in the timeline", async ($, on) => {
    const world = worldOf(on);
    await ranBeforeClear($, world);
    const pane = await paneOnTab($, "Activity");
    await pressClear(pane, world);

    await runCommand($, world, "echo later");

    const shown = await texts(pane);
    expect(await callRowKeys(pane)).toHaveLength(1);
    expect(shown.some((text) => text.includes("echo later"))).toBe(true);
    expect(shown.some((text) => text.includes("b.ts"))).toBe(false);
  });

  test("A5 after the press the stats line and the tool mix count only later calls", async ($, on) => {
    const world = worldOf(on);
    await ranBeforeClear($, world);
    const pane = await paneOnTab($, "Activity");
    const before = statsOf(await texts(pane));
    await pressClear(pane, world);

    await editFile($, world, "/work/c.ts", 2, 0);

    const shown = await texts(pane);
    expect(before).toMatch(/3 tools · 2 files · \+4 · −1 · 1 error$/);
    expect(statsOf(shown)).toMatch(/1 tool · 1 file · \+2 · −0 · 0 errors$/);
    expect(shown.some((text) => text.includes("Edit 1"))).toBe(true);
    expect(shown.some((text) => /Read 1|Bash 1/.test(text))).toBe(false);
  });

  test("A6 after the press the elapsed time starts again and adds only later turns", async ($, on) => {
    const world = worldOf(on);
    await runCommand($, world, "echo first");
    await finishTurn($, FIVE_SECONDS);
    const pane = await paneOnTab($, "Activity");
    const before = elapsedOf(await texts(pane));
    await pressClear(pane, world);
    const afterPress = elapsedOf(await texts(pane));

    await runCommand($, world, "echo second");
    await finishTurn($, TWO_SECONDS);

    expect([before, afterPress, elapsedOf(await texts(pane))]).toEqual(["5s", "0ms", "2s"]);
  });

  test("A7 with more calls before the press than are kept, exactly the calls after it show", async ($, on) => {
    const world = worldOf(on);
    await runCommands($, world, CALLS_BEYOND_KEPT, "old");
    const pane = await paneOnTab($, "Activity");
    await pressClear(pane, world);

    await runCommands($, world, 3, "new");

    const shown = await texts(pane);
    expect(await callRowKeys(pane)).toHaveLength(3);
    expect(shown.some((text) => text.includes("old"))).toBe(false);
    expect(statsOf(shown)).toMatch(/^\S+ · 3 tools · /);
  });

  test("A8 a second press hides what ran after the first and the stats start again", async ($, on) => {
    const world = worldOf(on);
    await runCommand($, world, "echo one");
    const pane = await paneOnTab($, "Activity");
    await pressClear(pane, world);
    await runCommand($, world, "echo two");
    await pressClear(pane, world);

    await runCommand($, world, "echo three");

    const shown = await texts(pane);
    expect(await callRowKeys(pane)).toHaveLength(1);
    expect(shown.some((text) => text.includes("echo three"))).toBe(true);
    expect(shown.some((text) => text.includes("echo two"))).toBe(false);
    expect(statsOf(shown)).toMatch(/1 tool · 0 files · \+0 · −0 · 0 errors$/);
  });

  test("A9 exactly one blank row sits above each of the Now, Tool mix, Timeline and Failed headings", async ($, on) => {
    const world = worldOf(on);
    await ranBeforeClear($, world);

    const pane = await paneOnTab($, "Activity");

    const shown = await lines(pane);
    expect(SECTIONS.map((title) => blankRowsAbove(shown, title))).toEqual([1, 1, 1, 1]);
  });
});

async function ranBeforeClear($: Engine, world: World): Promise<void> {
  await readFile($, world, "/work/a.ts");
  await editFile($, world, "/work/b.ts", 4, 1);
  await runCommand($, world, FAILING_COMMAND);
}

async function runCommands($: Engine, world: World, count: number, word: string): Promise<void> {
  for (let i = 0; i < count; i++) await runCommand($, world, `echo ${word} ${i}`);
}

function blankRowsAbove(shown: Line[], title: string): number {
  const heading = headingLineOf(shown, title);
  const at = heading === undefined ? -1 : shown.indexOf(heading);
  let blanks = 0;
  while (at - blanks - 1 >= 0 && shown[at - blanks - 1]?.text === "") blanks += 1;
  return at === -1 ? -1 : blanks;
}

function statsOf(shown: string[]): string {
  return shown.find((text) => STATS_LINE.test(text)) ?? "";
}

function elapsedOf(shown: string[]): string {
  return ELAPSED.exec(statsOf(shown))?.[1] ?? "";
}
