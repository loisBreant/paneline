import { describe, expect, test } from "claude-code/testing";
import type { Activity } from "../types";
import { callRecord } from "../hooks/activity-calls";

const LINE_CAP = 400;
const BELL = String.fromCharCode(7);
const ESCAPE = String.fromCharCode(27);

describe("the call record shown in the Activity tab", () => {
  test("CR1 a call that only had a command shows that command alone as its input", () => {
    const record = callRecord(
      { tool: "Bash", tool_use_id: "t1", command: "git status" },
      rowEntry(),
      { text: "" },
      undefined,
    );

    expect(record.input).toBe("git status");
  });

  test("CR2 a call with several fields shows one name: value line each, strings as written and other values as JSON", () => {
    const record = callRecord(
      { command: "ls", timeout: 5000, flags: ["-a", "-l"] },
      rowEntry(),
      { text: "" },
      undefined,
    );

    expect(record.input).toBe('command: ls\ntimeout: 5000\nflags: ["-a","-l"]');
  });

  test("CR3 the engine's own fields are not in the input", () => {
    const record = callRecord(
      {
        tool: "Grep",
        tool_use_id: "t1",
        agentId: "a1",
        pattern: "todo",
        path: "src",
      },
      rowEntry(),
      { text: "" },
      "a1",
    );

    expect(record.input).toBe("pattern: todo\npath: src");
  });

  test("CR4 a field set to nothing is not listed", () => {
    const record = callRecord(
      { command: "ls", cwd: undefined, timeout: 5000 },
      rowEntry(),
      { text: "" },
      undefined,
    );

    expect(record.input).toBe("command: ls\ntimeout: 5000");
  });

  test("CR5 a call with one field that is not text still shows the field name", () => {
    const record = callRecord({ timeout: 5000 }, rowEntry(), { text: "" }, undefined);

    expect(record.input).toBe("timeout: 5000");
  });

  test("CR6 a finished call that returned text shows that text as its output", () => {
    const record = callRecord({}, rowEntry(), { text: "3 files changed" }, undefined);

    expect(record.output).toBe("3 files changed");
  });

  test("CR7 a blocked call that also has text shows the block reason as its output", () => {
    const record = callRecord(
      {},
      rowEntry(),
      { deny: "not allowed here", text: "3 files changed" },
      undefined,
    );

    expect(record.output).toBe("not allowed here");
  });

  test("CR8 a call with text and a result shows the text as its output", () => {
    const record = callRecord(
      {},
      rowEntry(),
      { text: "3 files changed", result: { files: 3 } },
      undefined,
    );

    expect(record.output).toBe("3 files changed");
  });

  test("CR9 a call whose result is an object shows it as JSON indented by 2 spaces", () => {
    const record = callRecord({}, rowEntry(), { result: { files: 3, names: ["a"] } }, undefined);

    expect(record.output).toBe('{\n  "files": 3,\n  "names": [\n    "a"\n  ]\n}');
  });

  test("CR10 a call whose result is plain text shows the text itself, not in quotes", () => {
    const record = callRecord({}, rowEntry(), { result: "all done" }, undefined);

    expect(record.output).toBe("all done");
  });

  test("CR11 a call from a subagent carries its agent id and a main-session call carries none", () => {
    const fromAgent = callRecord({}, rowEntry(), { text: "" }, "agent-7");
    const fromMain = callRecord({}, rowEntry(), { text: "" }, undefined);

    expect(fromAgent.agentId).toBe("agent-7");
    expect(fromMain.agentId).toBeUndefined();
  });

  test("CR12 the record keeps the row's id, tool, target, run time, error flag and line counts", () => {
    const entry: Activity = {
      id: "t9",
      tool: "Edit",
      target: "src/a.ts",
      ms: 1234,
      isErrored: true,
      added: 7,
      removed: 2,
    };

    const record = callRecord({}, entry, { text: "" }, undefined);

    expect(record).toMatchObject(entry);
  });

  test("CR13 an output of exactly 400 lines is shown whole with no marker", () => {
    const output = numberedLines(LINE_CAP);

    const record = callRecord({}, rowEntry(), { text: output }, undefined);

    expect(record.output).toBe(output);
  });

  test("CR14 an output of 401 lines shows the first 400 and a last line saying 1 more", () => {
    const record = callRecord({}, rowEntry(), { text: numberedLines(LINE_CAP + 1) }, undefined);

    expect(record.output).toBe(`${numberedLines(LINE_CAP)}\n… 1 more lines`);
  });

  test("CR15 an output of 1000 lines shows the first 400 and a last line saying 600 more", () => {
    const record = callRecord({}, rowEntry(), { text: numberedLines(1000) }, undefined);

    expect(record.output).toBe(`${numberedLines(LINE_CAP)}\n… 600 more lines`);
  });

  test("CR16 an input of 401 lines is cut the same way as an output", () => {
    const record = callRecord(
      { command: numberedLines(LINE_CAP + 1) },
      rowEntry(),
      { text: "" },
      undefined,
    );

    expect(record.input).toBe(`${numberedLines(LINE_CAP)}\n… 1 more lines`);
  });

  test("CR17 a call with no result and no text has an empty output", () => {
    const record = callRecord({}, rowEntry(), {}, undefined);

    expect(record.output).toBe("");
  });

  test("CR18 control characters a tool returns are not in the shown input or output", () => {
    const record = callRecord(
      { command: `echo ${BELL}hi` },
      rowEntry(),
      { text: `${ESCAPE}[31mred${BELL}` },
      undefined,
    );

    expect(record.input).toBe("echo hi");
    expect(record.output).toBe("[31mred");
  });
});

function rowEntry(): Activity {
  return { id: "t1", tool: "Bash", target: "x", ms: 0, isErrored: false, added: 0, removed: 0 };
}

function numberedLines(count: number): string {
  return Array.from({ length: count }, (_, index) => `line ${index + 1}`).join("\n");
}
