import { describe, expect, test } from "claude-code/testing";

import {
  API_KEY,
  BACKGROUND_NOTE,
  BEFORE_TRACKING,
  OPUS,
  SONNET,
  SPLIT_TITLE,
  agentOwner,
  beginSession,
  blocks,
  mainTurn,
  noteRowOf,
  reloadPlugin,
  setSessionCost,
  spendPane,
  splitOf,
  worldOf,
} from "./spend-world";

const MAIN_OPUS_4_USD = 1_000_000;
const AGENT_SONNET_2_USD = 1_000_000;
const COST_WITH_ONE_UNTRACKED = 5;
const UNTRACKED_AT_START = 1;
const COST_WITH_AGENT_AND_ONE_UNTRACKED = 7;
const RESUMED_COST = 80;
const COST_AFTER_TRACKING = 86;
const MAIN_AND_BACKGROUND = [
  ["main · opus 5.5", "~$4.00", "80%"],
  ["background", "~$1.00", "20%"],
];

describe("spend of a session the plugin saw start", () => {
  test("F1 a new session whose first cost arrives after its first turn shows the untracked $1 as background, not as before tracking", async ($, on) => {
    const world = worldOf(on, API_KEY);
    await beginSession($, world, "startup");
    await mainTurn($, world, { model: OPUS, tokens: { input: MAIN_OPUS_4_USD } });
    await setSessionCost($, world, COST_WITH_ONE_UNTRACKED);

    const pane = await spendPane($);

    expect(await splitOf(pane)).toEqual(MAIN_AND_BACKGROUND);
    expect(noteRowOf((await blocks(pane))[SPLIT_TITLE])?.text).toBe(BACKGROUND_NOTE);
  });

  test("F2 a new session whose first cost of $1 arrives before any turn shows that $1 as background after the first turn, not as before tracking", async ($, on) => {
    const world = worldOf(on, API_KEY);
    await beginSession($, world, "startup");
    await setSessionCost($, world, UNTRACKED_AT_START);
    await mainTurn($, world, { model: OPUS, tokens: { input: MAIN_OPUS_4_USD } });
    await setSessionCost($, world, COST_WITH_ONE_UNTRACKED);

    const pane = await spendPane($);

    expect(await splitOf(pane)).toEqual(MAIN_AND_BACKGROUND);
  });

  test("F3 after /clear a first cost that arrives after the first turn shows the untracked $1 as background, not as before tracking", async ($, on) => {
    const world = worldOf(on, API_KEY);
    await beginSession($, world, "clear");
    await mainTurn($, world, { model: OPUS, tokens: { input: MAIN_OPUS_4_USD } });
    await setSessionCost($, world, COST_WITH_ONE_UNTRACKED);

    const pane = await spendPane($);

    expect(await splitOf(pane)).toEqual(MAIN_AND_BACKGROUND);
  });

  test("F4 a plugin reload after a new session's first turn and before its first cost still shows the untracked $1 as background, not as before tracking", async ($, on) => {
    const world = worldOf(on, API_KEY);
    await beginSession($, world, "startup");
    await mainTurn($, world, { model: OPUS, tokens: { input: MAIN_OPUS_4_USD } });

    await reloadPlugin($, world);
    await setSessionCost($, world, COST_WITH_ONE_UNTRACKED);

    const pane = await spendPane($);

    expect(await splitOf(pane)).toEqual(MAIN_AND_BACKGROUND);
  });

  test("F5 a new session never shows a before tracking row, whatever the order of cost and turns, with an agent turn counted too", async ($, on) => {
    const world = worldOf(on, API_KEY);
    await beginSession($, world, "startup");
    await agentOwner($, world, "implementer", SONNET, { input: AGENT_SONNET_2_USD });
    await mainTurn($, world, { model: OPUS, tokens: { input: MAIN_OPUS_4_USD } });
    await setSessionCost($, world, COST_WITH_AGENT_AND_ONE_UNTRACKED);

    const pane = await spendPane($);

    const names = (await splitOf(pane)).map(([name]) => name);
    expect(names).not.toContain(BEFORE_TRACKING);
    expect(names).toContain("background");
  });

  test("F6 a resumed session whose first cost of $80 arrives before its tracked turns still shows before tracking ~$80.00", async ($, on) => {
    const world = worldOf(on, API_KEY);
    await beginSession($, world, "resume");
    await setSessionCost($, world, RESUMED_COST);
    await mainTurn($, world, { model: OPUS, tokens: { input: MAIN_OPUS_4_USD } });
    await agentOwner($, world, "implementer", SONNET, { input: AGENT_SONNET_2_USD });
    await setSessionCost($, world, COST_AFTER_TRACKING);

    const pane = await spendPane($);

    expect(await splitOf(pane)).toEqual([
      [BEFORE_TRACKING, "~$80.00", "93%"],
      ["main · opus 5.5", "~$4.00", "5%"],
      ["implementer", "~$2.00", "2%"],
    ]);
  });
});
