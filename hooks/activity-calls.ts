import type { Activity, CallRecord } from "../types";
import { cleanText } from "./markdown";

const OUTPUT_LINE_CAP = 400;

const ENGINE_FIELDS = new Set(["tool", "tool_use_id", "agentId"]);

type Outcome = { deny?: string; text?: string; result?: unknown };

export function callRecord(
  call: object,
  entry: Activity,
  outcome: Outcome,
  agentId: string | undefined,
): CallRecord {
  return {
    ...entry,
    agentId,
    input: cappedLines(inputOf(call)),
    output: cappedLines(outputOf(outcome)),
  };
}

function inputOf(call: object): string {
  const fields = Object.entries(call).filter(
    ([name, value]) => !ENGINE_FIELDS.has(name) && value !== undefined,
  );
  const [only] = fields;
  if (fields.length === 1 && typeof only?.[1] === "string") return only[1];
  return fields
    .map(([name, value]) => `${name}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n");
}

function outputOf(outcome: Outcome): string {
  if (outcome.deny !== undefined) return outcome.deny;
  if (outcome.text !== undefined) return outcome.text;
  return typeof outcome.result === "string"
    ? outcome.result
    : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      (JSON.stringify(outcome.result, null, 2) ?? "");
}

function cappedLines(text: string): string {
  const lines = cleanText(text).split("\n");
  if (lines.length <= OUTPUT_LINE_CAP) return lines.join("\n");
  return [
    ...lines.slice(0, OUTPUT_LINE_CAP),
    `… ${lines.length - OUTPUT_LINE_CAP} more lines`,
  ].join("\n");
}
