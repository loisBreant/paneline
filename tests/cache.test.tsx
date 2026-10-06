import { describe, expect, test } from "claude-code/testing";
import type { EngineInterface, On } from "claude-code";

import { palette } from "../hooks/palette";
import { register } from "../hooks/register";
import { ENGINE_DEFAULT_GREY, accentOf } from "../hooks/session-color";

type Tree = { type: string; props?: Record<string, unknown>; children?: unknown[] };
type Hook = (...args: unknown[]) => unknown;
type RenderedProps = { text: string; isFirstOfReply?: boolean };

const NARROW = 80;
const WIDE = 200;

describe("reply drawing cache", () => {
  test("K1 a reply that did not change is drawn again as the very same drawing", async () => {
    const text = "K1 first paragraph\n\nK1 second paragraph";

    const first = await drawReply({ text });
    const again = await drawReply({ text });

    expect(again).toBe(first);
  });

  test("K2 a streaming reply keeps its earlier paragraphs and draws only the last one anew", async () => {
    const settled = "K2 settled opening paragraph\n\nK2 settled middle paragraph";

    const before = blocksOf(await drawReply({ text: `${settled}\n\nK2 growing par` }));
    const after = blocksOf(await drawReply({ text: `${settled}\n\nK2 growing paragraph arrives` }));

    expect(after).toHaveLength(3);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[2]).not.toBe(before[2]);
  });

  test("K3 a new paragraph starting in a streaming reply keeps every earlier paragraph", async () => {
    const settled = "K3 settled opening paragraph\n\nK3 settled middle paragraph";

    const before = blocksOf(await drawReply({ text: settled }));
    const after = blocksOf(await drawReply({ text: `${settled}\n\nK3 fresh paragraph` }));

    expect(after).toHaveLength(3);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });

  test("K4 the same reply in a wider window is drawn for that width", async () => {
    const text = "K4 paragraph\n\n---";

    const narrow = await drawReply({ text }, { columns: NARROW });
    const wide = await drawReply({ text }, { columns: WIDE });

    expect(wide).not.toBe(narrow);
    expect(ruleOf(blocksOf(wide)[1]!).length).toBeGreaterThan(ruleOf(blocksOf(narrow)[1]!).length);
  });

  test("K7 the same text as a continuation of a reply has no CLAUDE header", async () => {
    const text = "K7 paragraph";

    const first = await drawReply({ text, isFirstOfReply: true });
    const continuation = await drawReply({ text, isFirstOfReply: false });

    expect(shownText(first)).toContain("CLAUDE");
    expect(shownText(continuation)).not.toContain("CLAUDE");
  });
});

describe("reply accent", () => {
  const text = "# K8 heading\n\nK8 **loud** words\n\n- K8 item";

  test("K8 a reply is drawn again in the new session colour, never from the old drawing", async () => {
    const red = await drawReply({ text }, { colorName: "red" });
    const blue = await drawReply({ text }, { colorName: "blue" });

    expect(blue).not.toBe(red);
    for (const [drawn, color] of [
      [red, accentOf("red")],
      [blue, accentOf("blue")],
    ] as const) {
      expect(colorOf(drawn, "CLAUDE")).toBe(color);
      expect(colorOf(drawn, "K8 heading")).toBe(color);
      expect(colorOf(drawn, "loud")).toBe(color);
      expect(colorOf(drawn, "• ")).toBe(color);
    }
  });

  test("K9 with no session colour the heading and bullets take the engine default grey and bold text is plain white", async () => {
    const drawn = await drawReply({ text: `${text} K9` }, { colorName: "default" });

    expect(colorOf(drawn, "CLAUDE")).toBe(ENGINE_DEFAULT_GREY);
    expect(colorOf(drawn, "loud")).toBe(palette.userText);
    expect(colorOf(drawn, "• ")).toBe(ENGINE_DEFAULT_GREY);
  });
});

describe("user message drawing cache", () => {
  test("K5 a prompt that did not change is drawn again at the same width as the very same drawing", async () => {
    const text = "K5 the prompt";

    const first = await drawUser(text, NARROW);
    const again = await drawUser(text, NARROW);

    expect(again).toBe(first);
  });

  test("K10 the same prompt in a wider window is drawn for that width", async () => {
    const text = "K4 the prompt";

    const narrow = await drawUser(text, NARROW);
    const wide = await drawUser(text, WIDE);

    expect(wide).not.toBe(narrow);
    expect(wide.props?.width).toBeGreaterThan(narrow.props?.width as number);
  });

  test("K6 an edited prompt is drawn with its new text", async () => {
    await drawUser("K6 old words", NARROW);

    const edited = await drawUser("K6 new words", NARROW);

    expect(shownText(edited)).toContain("K6 new words");
    expect(shownText(edited)).not.toContain("K6 old words");
  });
});

function drawReply(
  props: RenderedProps,
  { columns = NARROW, colorName = "default" }: { columns?: number; colorName?: string } = {},
): Promise<Tree> {
  return renderWith("AssistantMessage", { isFirstOfReply: true, ...props }, columns, colorName);
}

function drawUser(text: string, columns: number): Promise<Tree> {
  return renderWith(
    "UserMessage",
    { text, origin: { kind: "composer" }, isExpanded: false },
    columns,
    "default",
  );
}

async function renderWith(
  component: string,
  props: object,
  columns: number,
  colorName: string,
): Promise<Tree> {
  const hook = hookFor(component);
  const elements = new Proxy({}, { get: (_, name) => String(name) });
  const engine = {
    ui: { resolve: () => elements },
    state: { get: async () => ({ value: colorName, version: 1 }) },
  } as unknown as EngineInterface;
  const event = { component, surface: "terminal", props, viewport: { columns, rows: 24 } };
  return (await hook(engine, event, () => {
    throw new Error("the plugin passed the render on to the engine");
  })) as Tree;
}

function hookFor(component: string): Hook {
  const hooks: { component: unknown; hook: Hook }[] = [];
  const on = (event: string, matcher: { component?: unknown } | Hook, hook?: Hook) => {
    if (event === "ui.render")
      hooks.push({
        component: (matcher as { component?: unknown }).component,
        hook: hook ?? (matcher as Hook),
      });
  };
  register(on as unknown as On, {});
  return hooks.find((entry) => entry.component === component)!.hook;
}

function blocksOf(reply: Tree): Tree[] {
  const column = children(reply).at(-1)!;
  return children(column);
}

function ruleOf(heading: Tree): string {
  return shownText(heading).replace(/[^─]/g, "");
}

function children(tree: Tree): Tree[] {
  return (tree.children ?? []).filter(
    (child): child is Tree => typeof child === "object" && child !== null,
  );
}

function shownText(tree: Tree): string {
  return (tree.children ?? [])
    .map((child) => (typeof child === "string" ? child : shownText(child as Tree)))
    .join("");
}

function colorOf(tree: Tree, text: string): unknown {
  if ((tree.children ?? []).includes(text)) return tree.props?.color;
  for (const child of children(tree)) {
    const found = colorOf(child, text);
    if (found !== undefined) return found;
  }
  return undefined;
}
