import { atom, memberOf, update } from "claude-code";
import type { EngineInterface, On, ToolCallInput, ToolCallResult } from "claude-code";

import type { Activity, AgentEdit, CallRecord, RunningCall, TurnStats } from "../types";
import { callRecord } from "./activity-calls";
import { isEditTool, targetOf } from "./tools";

const KEPT_CALLS = 50;
const KEPT_ACTIVITY = 400;
const KEPT_AGENT_EDITS = 400;
export const UNMEASURED_MS = -1;

const activityAtom = atom({ plugin: "paneline", key: "activity" } as const, []);
const agentEditsAtom = atom({ plugin: "paneline", key: "agentEdits" } as const, [] as AgentEdit[]);
const totalMsAtom = atom({ plugin: "paneline", key: "totalMs" } as const, 0);
const callsAtom = atom({ plugin: "paneline", key: "calls" } as const, [] as CallRecord[]);
const runningAtom = atom({ plugin: "paneline", key: "running" } as const, [] as RunningCall[]);
const toolMsAtom = atom({ plugin: "paneline", key: "toolMs" } as const, UNMEASURED_MS);
const turnStatsAtom = atom({ plugin: "paneline", key: "turnStats" } as const, null);

let turnActivity: Activity[] = [];

export function trackActivity(on: On): void {
  on("turn.start", ($, e, next) => {
    turnActivity = [];
    return next(e);
  });

  on("tool.call", async ($, e, next) => {
    const startedAt = await $.clock.now();
    const ran = await (e.agentId === undefined ? runningMainCall($, e, next) : next(e));
    const entry = activityOf(e, ran, (await $.clock.now()) - startedAt);
    const recorded = update($, callsAtom, (list) =>
      [...list, callRecord(e, entry, ran, e.agentId)].slice(-KEPT_CALLS),
    );
    await Promise.all([
      recorded,
      e.agentId === undefined
        ? recordMainCall($, e.tool_use_id, entry)
        : recordAgentCall($, e.agentId, entry),
    ]);
    return ran;
  });

  on("turn.complete", async ($, e, next) => {
    if (e.agentId !== undefined) return next(e);
    const stats = turnStats(turnActivity);
    await update($, memberOf(turnStatsAtom, { requestId: String(e.durationMs) }), () => stats);
    await update($, totalMsAtom, (total) => total + e.durationMs);
    return next(e);
  });
}

function runningMainCall(
  $: EngineInterface,
  e: ToolCallInput,
  next: (e: ToolCallInput) => Promise<ToolCallResult>,
): Promise<ToolCallResult> {
  return update($, runningAtom, (list) => [
    ...list,
    { callId: e.tool_use_id, tool: e.tool, target: targetOf(e) },
  ]).then(() =>
    next(e).finally(() =>
      update($, runningAtom, (list) => list.filter((one) => one.callId !== e.tool_use_id)),
    ),
  );
}

async function recordMainCall($: EngineInterface, callId: string, entry: Activity): Promise<void> {
  turnActivity = [...turnActivity, entry];
  await Promise.all([
    update($, memberOf(toolMsAtom, { requestId: callId }), () => entry.ms),
    update($, activityAtom, (list) => [...list, entry].slice(-KEPT_ACTIVITY)),
  ]);
}

async function recordAgentCall(
  $: EngineInterface,
  agentId: string,
  entry: Activity,
): Promise<void> {
  if (!isEditTool(entry.tool) || entry.isErrored) return;
  await update($, agentEditsAtom, (list) =>
    [...list, { ...entry, agentId }].slice(-KEPT_AGENT_EDITS),
  );
}

function activityOf(
  call: { tool: string; tool_use_id: string },
  ran: ToolCallResult,
  ms: number,
): Activity {
  const patched = diffstat(ran.result);
  const diff =
    patched.added + patched.removed > 0
      ? patched
      : (createdFileStat(call.tool, Reflect.get(call, "content")) ?? patched);
  return {
    id: call.tool_use_id,
    tool: call.tool,
    target: targetOf(call),
    ms,
    isErrored: ran.deny !== undefined || ran.isError === true,
    added: diff.added,
    removed: diff.removed,
  };
}

function createdFileStat(
  tool: string,
  content: unknown,
): { added: number; removed: number } | null {
  if (tool !== "Write" || typeof content !== "string" || content === "") return null;
  return { added: content.replace(/\n$/, "").split("\n").length, removed: 0 };
}

export function diffstat(result: unknown): { added: number; removed: number } {
  const patch = (result as { structuredPatch?: unknown } | null)?.structuredPatch;
  if (!Array.isArray(patch)) return { added: 0, removed: 0 };
  const lines = patch.flatMap((hunk) => {
    const hunkLines = (hunk as { lines?: unknown } | null)?.lines;
    return Array.isArray(hunkLines)
      ? hunkLines.filter((line): line is string => typeof line === "string")
      : [];
  });
  return {
    added: lines.filter((line) => line.startsWith("+")).length,
    removed: lines.filter((line) => line.startsWith("-")).length,
  };
}

function turnStats(activity: Activity[]): TurnStats {
  return {
    reads: activity.filter((entry) => entry.tool === "Read").length,
    commands: activity.filter((entry) => entry.tool === "Bash").length,
    changedFiles: new Set(
      activity
        .filter((entry) => isEditTool(entry.tool) && !entry.isErrored)
        .map((entry) => entry.target),
    ).size,
  };
}
