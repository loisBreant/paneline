import { atom, read } from "claude-code";
import type { On } from "claude-code";

import type { AgentTree } from "../types";
import { agentsTab } from "./agents-draw";
import { PANE } from "./pane-tab";
import { isShownTab } from "./shown-tab";

export const AGENTS_TAB = { id: "agents", label: "Agents" };

const agentsAtom = atom({ plugin: "paneline", key: "agents" } as const, {} as AgentTree);
const sessionUsdAtom = atom(
  { plugin: "paneline", key: "sessionUsd" } as const,
  null as number | null,
);

export function registerAgentsTab(on: On): void {
  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e, next) => {
    if (!isShownTab(AGENTS_TAB.id)) return next(e);
    const [agents, sessionUsd, model, now] = await Promise.all([
      read($, agentsAtom),
      read($, sessionUsdAtom),
      $.session.model(),
      $.clock.now(),
    ]);
    return agentsTab($.ui.resolve(e), {
      agents,
      sessionUsd,
      model,
      now,
      width: e.props.bodyColumns,
      height: e.props.scroll.bodyRows,
    });
  });
}
