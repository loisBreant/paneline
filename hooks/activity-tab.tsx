import { atom, read, update } from "claude-code";
import type { On } from "claude-code";

import type { CallRecord, RunningCall } from "../types";
import { activityTab } from "./activity-draw";
import { failureText } from "./command-failure";
import { isLightTheme } from "./pane-kit";
import { PANE } from "./pane-tab";
import { isShownTab } from "./shown-tab";

export const ACTIVITY_TAB = { id: "activity", label: "Activity" };

const callsAtom = atom({ plugin: "paneline", key: "calls" } as const, [] as CallRecord[]);
const activityAtom = atom({ plugin: "paneline", key: "activity" } as const, []);
const runningAtom = atom({ plugin: "paneline", key: "running" } as const, [] as RunningCall[]);
const totalMsAtom = atom({ plugin: "paneline", key: "totalMs" } as const, 0);
const themeAtom = atom({ plugin: "paneline", key: "theme" } as const, "dark");
const openCallAtom = atom({ plugin: "paneline", key: "openCall" } as const, null as string | null);

export function registerActivityTab(on: On): void {
  on("command.run", { command: "session" }, async ($, e, next) => {
    try {
      await update($, openCallAtom, () => null);
      return await next(e);
    } catch (error) {
      const text = failureText(error);
      $.ui.log(text, { to: "debug" });
      return { text };
    }
  });

  on("ui.close", { id: PANE }, async ($, e, next) => {
    if (e.origin.kind !== "person" || (await read($, openCallAtom)) === null) return next(e);
    await update($, openCallAtom, () => null);
    return { value: undefined };
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e, next) => {
    if (!isShownTab(ACTIVITY_TAB.id)) return next(e);
    const [activity, calls, running, totalMs, cwd, openCallId, theme] = await Promise.all([
      read($, activityAtom),
      read($, callsAtom),
      read($, runningAtom),
      read($, totalMsAtom),
      $.session.cwd(),
      read($, openCallAtom),
      read($, themeAtom),
    ]);
    return activityTab($.ui.resolve(e), {
      activity,
      calls,
      running,
      totalMs,
      cwd,
      width: e.props.bodyColumns,
      openCallId,
      openCall: (id) => void update($, openCallAtom, () => id),
      closeCall: () => void update($, openCallAtom, () => null),
      isLightTheme: isLightTheme(theme),
    });
  });
}
