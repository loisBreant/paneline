import { describe, expect, test } from "claude-code/testing";
import type { On } from "claude-code";

import { register } from "../hooks/register";

describe("pane render hooks", () => {
  test("E1 every Pane render hook matches the pane's own request id, which next() may not change", () => {
    const requestIds: unknown[] = [];
    const recordingOn = ((event: string, matcher?: unknown) => {
      if (event !== "ui.render" || typeof matcher !== "object" || matcher === null) return;
      const { component, requestId } = matcher as { component?: string; requestId?: string };
      if (component === "Pane") requestIds.push(requestId);
    }) as unknown as On;

    register(recordingOn, {});

    expect(requestIds.length).toBeGreaterThan(1);
    expect(new Set(requestIds)).toEqual(new Set(["session"]));
  });
});
