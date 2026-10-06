import { describe, expect, test } from "claude-code/testing";

import { categoryColors, palette } from "../hooks/palette";
import { chipColors } from "../hooks/session-color";

const SUBAGENT_COLOR_NAMES = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];

describe("look lock: the theme key behind each colour never changes", () => {
  test("LL1 every palette entry keeps its theme key", () => {
    expect(palette).toEqual({
      text: "text",
      userText: "text",
      muted: "inactive",
      rule: "subtle",
      meterEmpty: "subtle",
      section: "permission",
      tool: "permission",
      button: "background",
      identifier: "briefLabelYou",
      keyword: "merged",
      ok: "success",
      failed: "error",
      alert: "warning",
      user: "claude",
      userBand: "userMessageBackground",
      panel: "composerSidebarBackground",
      addedBand: "diffAdded",
      removedBand: "diffRemoved",
    });
  });

  test("LL2 the diagram hues keep their keys and their order", () => {
    expect(categoryColors).toEqual([
      "permission",
      "success",
      "warning",
      "merged",
      "background",
      "error",
      "claude",
      "planMode",
    ]);
  });

  test("LL3 the text on every /color accent stays clawd_background", () => {
    const chipTexts = SUBAGENT_COLOR_NAMES.map((name) => chipColors(name).text);

    expect(chipTexts).toEqual(SUBAGENT_COLOR_NAMES.map(() => "clawd_background"));
  });
});
