import type { SessionContextBreakdown, SessionUsage, SessionUsageArgs } from "claude-code";

import { singleFlight } from "./single-flight";

export type UsageFetch = (args: SessionUsageArgs) => Promise<SessionUsage>;

type Snapshot = { columns: number; breakdown: SessionContextBreakdown };

const FULL_GRID_COLUMNS = 80;
const SUMMARY_SNAPSHOT_COLUMNS = 0;

const oneFetchAtATime = singleFlight();
let snapshot: Snapshot | undefined;
let isStale = true;
let knownThreshold: number | undefined;

export function markContextStale(): void {
  isStale = true;
}

export function forgetThreshold(): void {
  knownThreshold = undefined;
}

function freshContext(columns: number): SessionContextBreakdown | null {
  return snapshot?.columns === columns && !isStale ? snapshot.breakdown : null;
}

function keepContext(columns: number, breakdown: SessionContextBreakdown): SessionContextBreakdown {
  snapshot = { columns, breakdown };
  isStale = false;
  return breakdown;
}

export async function contextBreakdown(
  usage: UsageFetch,
  paneColumns: number,
): Promise<SessionContextBreakdown | null> {
  const columns = Math.max(paneColumns, FULL_GRID_COLUMNS);
  const fresh = freshContext(columns);
  if (fresh !== null) return fresh;
  const breakdown = await oneFetchAtATime(`full-${columns}`, async () => {
    const { context } = await usage({ breakdown: "full", columns });
    return context.breakdown;
  });
  return breakdown === undefined ? null : keepContext(columns, breakdown);
}

export async function mcpBreakdown(usage: UsageFetch): Promise<SessionContextBreakdown | null> {
  const fresh = freshContext(SUMMARY_SNAPSHOT_COLUMNS);
  if (fresh !== null) return fresh;
  const breakdown = await summaryBreakdown(usage);
  return breakdown === null ? null : keepContext(SUMMARY_SNAPSHOT_COLUMNS, breakdown);
}

export async function compactThreshold(usage: UsageFetch): Promise<number | undefined> {
  if (knownThreshold !== undefined) return knownThreshold;
  const breakdown = await summaryBreakdown(usage);
  knownThreshold = breakdown?.autoCompactThreshold;
  return knownThreshold;
}

function summaryBreakdown(usage: UsageFetch): Promise<SessionContextBreakdown | null> {
  return oneFetchAtATime("summary", async () => {
    const { context } = await usage({ breakdown: "summary" });
    return context.breakdown ?? null;
  });
}
