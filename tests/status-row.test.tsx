import { describe, expect, mock, test } from "claude-code/testing";
import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

import { palette } from "../hooks/palette";
import { ENGINE_DEFAULT_GREY, accentOf } from "../hooks/session-color";

type Drawn = { type?: string; props?: Record<string, unknown>; children?: unknown[] };

const HOME = "/Users/dev";
const PROJECT = `${HOME}/workspace/projects/paneline`;
const TRANSCRIPT = "/tmp/session.jsonl";
const SESSION_START = { cwd: PROJECT, surface: "terminal", isInteractive: true } as const;
const PANE_TOGGLE = 5;
const GREY = ENGINE_DEFAULT_GREY;
const RED = accentOf("red");
const MUTED = palette.muted;

describe("the status row", () => {
  test("R1 one blank row opens the band, chips sit at the left edge and the meters at the right edge of the last row", async ($, on) => {
    const world = worldOf(on);
    await $.session.start(SESSION_START);
    await measure($, 10);
    await $.classic.Stop({ stop_hook_active: false, effort: { level: "high" } });
    await world.settle();

    const rows = await bandRows($, 200);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.trim()).toBe("");
    expect(rows[2]).toHaveLength(200);
    expect(rows[2]?.startsWith(" opus 5.5  high  ~/workspace/projects/paneline ")).toBe(true);
    expect(rows[2]?.endsWith("ctx ▁ 10%  5h ▂ 15%  7d ▁ 4%     ")).toBe(true);
  });

  test("R2 the gauge is one of eight bars chosen by percent", async ($, on) => {
    const world = worldOf(on);
    await $.session.start(SESSION_START);
    await measure($, 62);
    await world.settle();

    expect((await bandRows($, 200))[2]?.endsWith("ctx ▅ 62%  5h ▂ 15%  7d ▁ 4%     ")).toBe(true);

    await measure($, 100);
    await world.settle();

    expect((await bandRows($, 200))[2]).toContain("ctx █ 100%");
  });

  test("R3 at 72 columns the gauges go first and the path stays whole", async ($, on) => {
    const world = worldOf(on);
    await $.session.start(SESSION_START);
    await measure($, 10);
    await world.settle();

    const row = (await bandRows($, 72))[2] as string;

    expect(row).toHaveLength(72);
    expect(row).not.toMatch(/[▁▂▃▄▅▆▇█]/);
    expect(row).toContain(" ~/workspace/projects/paneline ");
    expect(row.trimEnd().endsWith("ctx 10%  5h 15%  7d 4%")).toBe(true);
  });

  test("R4 at 60 columns the path is cut to its last segments and all three percents stay", async ($, on) => {
    const world = worldOf(on);
    await $.session.start(SESSION_START);
    await measure($, 10);
    await world.settle();

    const row = (await bandRows($, 60))[2] as string;

    expect(row).toHaveLength(60);
    expect(row).toContain(" …/");
    expect(row.trimEnd().endsWith("ctx 10%  5h 15%  7d 4%")).toBe(true);
  });

  test("R5 below that 7d is dropped first, then 5h, and the row never wraps", async ($, on) => {
    const world = worldOf(on);
    await $.session.start(SESSION_START);
    await measure($, 10);
    await world.settle();

    const noWeek = (await bandRows($, 50))[2] as string;

    expect(noWeek).toHaveLength(50);
    expect(noWeek).toContain("5h 15%");
    expect(noWeek).not.toContain("7d");

    const contextOnly = (await bandRows($, 42))[2] as string;

    expect(contextOnly).toContain("ctx 10%");
    expect(contextOnly).not.toContain("5h");
    expect(contextOnly.length).toBeLessThanOrEqual(42);
  });

  test("R5b the last segment is cut from its start when even it does not fit", async ($, on) => {
    const world = worldOf(on, { cwd: `${HOME}/${"x".repeat(60)}` });
    await $.session.start(SESSION_START);
    await measure($, 10);
    await world.settle();

    const row = (await bandRows($, 56))[2] as string;

    expect(row).toHaveLength(56);
    expect(row).toContain("…xxx");
    expect(row).toContain("ctx");
  });

  test("R6 by default gauges and percents are the grey accent and labels are muted", async ($, on) => {
    const world = worldOf(on);
    await $.session.start(SESSION_START);
    await measure($, 10);
    await world.settle();

    const meters = await coloredMeterTexts($);
    const colorsOf = (match: (text: string) => boolean) =>
      meters.filter(({ text }) => match(text)).map(({ color }) => color);

    expect(new Set(colorsOf((text) => /^[▁▂▃▄▅▆▇█] $/.test(text) || text.endsWith("%")))).toEqual(
      new Set([GREY]),
    );
    expect(new Set(colorsOf((text) => /^(ctx|5h|7d) $/.test(text)))).toEqual(new Set([MUTED]));
  });

  test("R7 after /color red the gauges and percents are red", async ($, on) => {
    const world = worldOf(on, { colorEntries: ["red"] });
    await $.session.start(SESSION_START);
    await measure($, 10);
    await $.classic.Stop({
      stop_hook_active: false,
      effort: { level: "high" },
      transcript_path: TRANSCRIPT,
    });
    await world.settle();

    const colors = (await coloredMeterTexts($))
      .filter(({ text }) => /^[▁▂▃▄▅▆▇█] $/.test(text) || text.endsWith("%"))
      .map(({ color }) => color);

    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((color) => color === RED)).toBe(true);
  });
});

type WorldOptions = { cwd?: string; engineRow?: string; colorEntries?: string[] };

function worldOf(on: On, options: WorldOptions = {}) {
  const clock = mock.clock(on);
  const cwd = options.cwd ?? PROJECT;
  const engineRow = options.engineRow ?? "engine row";
  const colorEntries = options.colorEntries ?? [];
  mock.env(on, { HOME });
  on("session.model", () => ({ value: "claude-opus-5-5" }));
  on("session.cwd", () => ({ value: cwd }));
  on("session.usage", () => ({
    value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] },
  }));
  on("session.measure", (_$, e) => ({ changed: e.changed }));
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("ui.open", () => ({ value: { isPlaced: true } }));
  on("command.register", () => ({ value: {} }) as never);
  on("classic.SessionStart", () => ({}));
  on("classic.UserPromptSubmit", () => ({}));
  on("classic.PostModelSwitch", () => ({}));
  on("classic.CwdChanged", () => ({}));
  on("classic.Stop", () => ({}));
  on("classic.PostToolUse", () => ({}));
  on("ui.render", { component: "AbovePrompt" }, ($, e) => {
    const { Text } = $.ui.resolve(e);
    return <Text>{engineRow}</Text>;
  });
  on(
    "process.run",
    () =>
      ({
        value: {
          exitCode: colorEntries.length === 0 ? 1 : 0,
          stdout: colorEntries
            .map(
              (agentColor) =>
                `{"type":"agent-color","agentColor":"${agentColor}","sessionId":"s"}\n`,
            )
            .join(""),
          stderr: "",
        },
      }) as never,
  );
  return { settle: () => clock.settle() };
}

function measure($: Engine, contextPercent: number) {
  return $.session.measure({
    context: { window: 200_000, percent: contextPercent },
    rateLimits: [
      { kind: "five_hour", percentUsed: 15 },
      { kind: "seven_day", percentUsed: 4 },
    ],
    changed: ["context", "rateLimits"],
  });
}

async function mountBand($: Engine, columns: number) {
  const band = await $.ui.mount({
    plugin: "paneline",
    surface: "terminal",
    component: "AbovePrompt",
    props: {
      hasSurvey: false,
      isWorking: false,
      maxRows: 10,
      bodyColumns: columns,
      scroll: { offset: 0, bodyRows: 10 },
      view: {},
    },
    viewport: { columns, rows: 40 },
  });
  return (await band.drawn()) as Drawn;
}

async function bandRows($: Engine, columns: number): Promise<string[]> {
  const rows = ((await mountBand($, columns)).children ?? []).filter(
    (row) => row !== null && row !== false,
  );
  return rows.map((row) => rowText(row, columns));
}

function rowText(row: unknown, columns: number): string {
  const drawn = row as Drawn;
  if (drawn.type !== "Box") return shownText(row);
  const [left, right] = drawn.children ?? [];
  const leftText = shownText(left);
  const rightText = ((right as Drawn | undefined)?.children ?? [])
    .map(shownText)
    .join(" ".repeat(2));
  return `${leftText}${" ".repeat(Math.max(columns - PANE_TOGGLE - leftText.length - rightText.length, 0))}${rightText}${" ".repeat(PANE_TOGGLE)}`;
}

async function coloredMeterTexts($: Engine): Promise<{ text: string; color: unknown }[]> {
  const row = ((await mountBand($, 200)).children ?? []).at(-1) as Drawn;
  const right = (row.children ?? []).at(-1) as Drawn;
  return coloredTexts(right).map((node) => ({ text: shownText(node), color: node.props?.color }));
}

function coloredTexts(node: unknown): Drawn[] {
  const drawn = node as Drawn;
  if (drawn.props?.color !== undefined) return [drawn];
  return (drawn.children ?? []).flatMap((child) =>
    typeof child === "string" ? [] : coloredTexts(child),
  );
}

function shownText(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(shownText).join("");
  const children = (node as { children?: unknown[] } | undefined)?.children ?? [];
  return children.map(shownText).join("");
}
