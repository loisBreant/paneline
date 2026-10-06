export type Inline =
  | { kind: "text" | "code"; text: string }
  | { kind: "strong" | "emphasis" | "strike"; children: Inline[] }
  | { kind: "link"; href: string; children: Inline[] };

export type RunStyle = {
  strong: boolean;
  emphasis: boolean;
  strike: boolean;
  code: boolean;
  href?: string;
};
export type Run = { text: string; style: RunStyle };

export type AlertLevel = "note" | "tip" | "important" | "warning" | "caution";
export type Align = "left" | "center" | "right";

type HeadingBlock = { kind: "heading"; level: number; inline: Inline[]; raw: string };
type ParagraphBlock = { kind: "paragraph"; inline: Inline[]; raw: string };
type RuleBlock = { kind: "rule"; raw: string };
export type QuoteBlock = { kind: "quote"; lines: Inline[][]; raw: string };
export type AlertBlock = {
  kind: "alert";
  level: AlertLevel;
  title: Inline[];
  lines: Inline[][];
  raw: string;
};
export type ListItem = {
  depth: number;
  ordered: boolean;
  marker: string;
  task: "open" | "done" | null;
  inline: Inline[];
};
export type ListBlock = { kind: "list"; items: ListItem[]; raw: string };
export type TableBlock = {
  kind: "table";
  header: Inline[][];
  align: Align[];
  rows: Inline[][][];
  raw: string;
};
export type CodeBlock = {
  kind: "code";
  lang: string;
  file?: string;
  lines: string[];
  isClosed: boolean;
  raw: string;
};
export type Block =
  | HeadingBlock
  | ParagraphBlock
  | RuleBlock
  | QuoteBlock
  | AlertBlock
  | ListBlock
  | TableBlock
  | CodeBlock;

type Unrawed<B> = B extends unknown ? Omit<B, "raw"> : never;
type Step = { block: Unrawed<Block> | null; next: number };

const MAX_LINE_LENGTH = 10_000;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

const FENCE = /^\s*(`{3,}|~{3,})\s*([\w+#.-]*)(.*)$/;
const FENCE_CLOSE = /^(`{3,}|~{3,})$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const HEADING_CLOSER = /\s+#+\s*$/;
const ALERT = /^\s*>\s*\[!(\w+)\]\s*(.*)$/;
const QUOTE_MARKERS = /^(?:\s*>\s?)+/;
const QUOTE_LINE = /^\s*>/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const LIST_CONTINUATION = /^\s+\S/;
const TASK_BOX = /^\[([ xX])\](?:\s+|$)/;
const MAX_LIST_DEPTH = 3;
const DIVIDER_CELL = /^:?-+:?$/;
const THEMATIC_BREAK = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const BLOCK_START =
  /^(#{1,6}\s|\s*```|\s*~~~|\s*[-*+]\s|\s*\d+[.)]\s|\s*>|\s*\||\s*([-*_])(?:\s*\2){2,}\s*$)/;
const ALERT_LEVELS: readonly string[] = ["note", "tip", "important", "warning", "caution"];
const FILE_LINE = /^\s*(?:\/\/|#|--)\s*([\w./-]+\.\w+)\s*$/;
const TITLE = /title=["']?([^"'\s]+)/;

export function parse(text: string): Block[] {
  const lines = cleanText(text).split("\n");
  const blocks: Block[] = [];
  let at = 0;
  while (at < lines.length) {
    const step = readBlock(lines, at);
    if (step.block) blocks.push({ ...step.block, raw: lines.slice(at, step.next).join("\n") });
    at = step.next;
  }
  return blocks;
}

export function cleanText(text: string): string {
  return text
    .replace(CONTROL_CHARACTERS, "")
    .split("\n")
    .map((line) => (line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) : line))
    .join("\n");
}

export function plainOf(inline: Inline[]): string {
  return runsOf(inline)
    .map((run) => run.text)
    .join("");
}

export function runsOf(inline: Inline[]): Run[] {
  return inline.flatMap((node) => runsOfNode(node, PLAIN_STYLE));
}

const PLAIN_STYLE: RunStyle = { strong: false, emphasis: false, strike: false, code: false };

function runsOfNode(node: Inline, style: RunStyle): Run[] {
  switch (node.kind) {
    case "text":
      return [{ text: node.text, style }];
    case "code":
      return [{ text: node.text, style: { ...style, code: true } }];
    case "strong":
      return node.children.flatMap((child) => runsOfNode(child, { ...style, strong: true }));
    case "emphasis":
      return node.children.flatMap((child) => runsOfNode(child, { ...style, emphasis: true }));
    case "strike":
      return node.children.flatMap((child) => runsOfNode(child, { ...style, strike: true }));
    case "link":
      return node.children.flatMap((child) => runsOfNode(child, { ...style, href: node.href }));
  }
}

type Mark = "**" | "__" | "*" | "_" | "~~";
type Delimiter = { kind: "mark"; mark: Mark; canOpen: boolean; canClose: boolean };
type Item = Inline | Delimiter;
type Open = { mark: Mark; at: number };

const ESCAPABLE = "\\`*_~[]()|#>";
const URL_START = /https?:\/\/\S/y;
const LINK_TARGET = /\(([^\s)]{1,2000})\)/y;
const MAX_LABEL_LENGTH = 500;
const URL_TRAILER = /[.,;:!?)*_~]+$/;
const ALNUM = /[\p{L}\p{N}]/u;
const SPACE = /\s/;
const MARK_KIND = {
  "**": "strong",
  __: "strong",
  "*": "emphasis",
  _: "emphasis",
  "~~": "strike",
} as const;

function parseInline(text: string): Inline[] {
  const items: Item[] = [];
  const opens: Open[] = [];
  const closerlessTicks = new Set<number>();
  let at = 0;
  const pushText = (value: string) => {
    const last = items[items.length - 1];
    if (last?.kind === "text") last.text += value;
    else items.push({ kind: "text", text: value });
  };
  const closeWith = (mark: Mark): boolean => {
    let found = opens.length - 1;
    while (found >= 0 && opens[found]!.mark !== mark) found--;
    if (found < 0) return false;
    const open = opens[found]!;
    const children = settle(items.splice(open.at + 1));
    items.pop();
    items.push({ kind: MARK_KIND[mark], children });
    opens.length = found;
    return true;
  };
  while (at < text.length) {
    const char = text[at]!;
    if (char === "\\" && ESCAPABLE.includes(text[at + 1] ?? "")) {
      pushText(text[at + 1]!);
      at += 2;
      continue;
    }
    if (char === "`") {
      const run = backtickRunAt(text, at);
      const end = closerlessTicks.has(run) ? -1 : findBacktickClose(text, at + run, run);
      if (end === -1) {
        closerlessTicks.add(run);
        pushText("`".repeat(run));
        at += run;
        continue;
      }
      items.push({ kind: "code", text: codeSpanText(text.slice(at + run, end)) });
      at = end + run;
      continue;
    }
    const link = char === "[" ? linkAt(text, at) : null;
    if (link) {
      items.push({ kind: "link", href: link.href, children: parseInline(link.label) });
      at = link.end;
      continue;
    }
    const url = bareUrlAt(text, at);
    if (url) {
      items.push({ kind: "link", href: url, children: [{ kind: "text", text: url }] });
      at += url.length;
      continue;
    }
    const mark = markAt(text, at);
    if (mark === null) {
      pushText(char);
      at++;
      continue;
    }
    const delimiter = delimiterOf(text, at, mark);
    at += mark.length;
    if (delimiter.canClose && closeWith(mark)) continue;
    if (delimiter.canOpen) {
      opens.push({ mark, at: items.length });
      items.push(delimiter);
      continue;
    }
    pushText(mark);
  }
  return settle(items);
}

function settle(items: Item[]): Inline[] {
  const settled: Inline[] = [];
  for (const item of items) {
    const node: Inline = item.kind === "mark" ? { kind: "text", text: item.mark } : item;
    const last = settled[settled.length - 1];
    if (node.kind === "text" && last?.kind === "text") last.text += node.text;
    else settled.push(node);
  }
  return settled;
}

function markAt(text: string, at: number): Mark | null {
  const char = text[at];
  if (char === "~") return text[at + 1] === "~" ? "~~" : null;
  if (char !== "*" && char !== "_") return null;
  if (text[at + 1] !== char) return char;
  const opensTriple = text[at + 2] === char && startsWord(text, at);
  return opensTriple ? char : (`${char}${char}` as Mark);
}

function startsWord(text: string, at: number): boolean {
  const before = text[at - 1];
  return before === undefined || SPACE.test(before);
}

function delimiterOf(text: string, at: number, mark: Mark): Delimiter {
  const before = text[at - 1];
  const after = text[at + mark.length];
  const spaceBefore = before === undefined || SPACE.test(before);
  const spaceAfter = after === undefined || SPACE.test(after);
  const isUnderscore = mark.startsWith("_");
  return {
    kind: "mark",
    mark,
    canOpen: !spaceAfter && !(isUnderscore && before !== undefined && ALNUM.test(before)),
    canClose: !spaceBefore && !(isUnderscore && after !== undefined && ALNUM.test(after)),
  };
}

function backtickRunAt(text: string, at: number): number {
  let end = at;
  while (text[end] === "`") end++;
  return end - at;
}

function findBacktickClose(text: string, from: number, run: number): number {
  let at = text.indexOf("`", from);
  while (at !== -1) {
    const length = backtickRunAt(text, at);
    if (length === run) return at;
    at = text.indexOf("`", at + length);
  }
  return -1;
}

function codeSpanText(inner: string): string {
  const isPadded = inner.length > 1 && inner.startsWith(" ") && inner.endsWith(" ");
  return isPadded ? inner.slice(1, -1) : inner;
}

type Link = { label: string; href: string; end: number };

function linkAt(text: string, at: number): Link | null {
  const close = findLabelEnd(text, at);
  if (close === -1 || text[close + 1] !== "(") return null;
  LINK_TARGET.lastIndex = close + 1;
  const target = LINK_TARGET.exec(text);
  if (!target) return null;
  return { label: text.slice(at + 1, close), href: target[1]!, end: close + 1 + target[0].length };
}

function findLabelEnd(text: string, open: number): number {
  const limit = Math.min(text.length, open + MAX_LABEL_LENGTH);
  let depth = 0;
  for (let at = open; at < limit; at++) {
    const char = text[at];
    if (char === "\\") at++;
    else if (char === "[") depth++;
    else if (char === "]" && --depth === 0) return at;
  }
  return -1;
}

function bareUrlAt(text: string, at: number): string | null {
  URL_START.lastIndex = at;
  if (!URL_START.test(text)) return null;
  const whole = text.slice(at).split(/\s/, 1)[0]!;
  return whole.replace(URL_TRAILER, "");
}

function readBlock(lines: string[], at: number): Step {
  const line = lines[at] ?? "";
  if (line.trim() === "") return { block: null, next: at + 1 };
  if (THEMATIC_BREAK.test(line)) return { block: { kind: "rule" }, next: at + 1 };
  return (
    readFence(lines, at) ??
    readHeading(line, at) ??
    readAlert(lines, at) ??
    readQuote(lines, at) ??
    readTable(lines, at) ??
    readList(lines, at) ??
    readParagraph(lines, at)
  );
}

function readFence(lines: string[], at: number): Step | null {
  const open = lines[at]?.match(FENCE);
  if (!open) return null;
  const close = findFenceClose(lines, at + 1, open[1]!);
  const end = close === -1 ? lines.length : close;
  const body = lines.slice(at + 1, end);
  return { block: codeBlock(open[2] ?? "", open[3] ?? "", body, close !== -1), next: end + 1 };
}

function findFenceClose(lines: string[], from: number, opening: string): number {
  for (let i = from; i < lines.length; i++) {
    const mark = FENCE_CLOSE.exec(lines[i]!.trim())?.[1];
    if (mark && mark.startsWith(opening.charAt(0)) && mark.length >= opening.length) return i;
  }
  return -1;
}

function codeBlock(
  lang: string,
  info: string,
  body: string[],
  isClosed: boolean,
): Unrawed<CodeBlock> {
  const titled = TITLE.exec(info)?.[1];
  if (titled) return { kind: "code", lang, file: titled, lines: body, isClosed };
  const named = body[0]?.match(FILE_LINE)?.[1];
  if (named) return { kind: "code", lang, file: named, lines: body.slice(1), isClosed };
  return { kind: "code", lang, lines: body, isClosed };
}

function readHeading(line: string, at: number): Step | null {
  const match = HEADING.exec(line);
  if (!match) return null;
  const text = (match[2] ?? "").replace(HEADING_CLOSER, "");
  return {
    block: { kind: "heading", level: match[1]!.length, inline: parseInline(text) },
    next: at + 1,
  };
}

const withoutQuoteMarkers = (line: string): string => line.replace(QUOTE_MARKERS, "");

function readAlert(lines: string[], at: number): Step | null {
  const open = lines[at]?.match(ALERT);
  const level = open?.[1]?.toLowerCase();
  if (!open || !level || !ALERT_LEVELS.includes(level)) return null;
  const body = takeWhile(lines, at + 1, (line) => QUOTE_LINE.test(line));
  return {
    block: {
      kind: "alert",
      level: level as AlertLevel,
      title: parseInline(open[2] ?? ""),
      lines: body.map((line) => parseInline(withoutQuoteMarkers(line))),
    },
    next: at + 1 + body.length,
  };
}

function readQuote(lines: string[], at: number): Step | null {
  const body = takeWhile(lines, at, (line) => QUOTE_LINE.test(line));
  if (body.length === 0) return null;
  return {
    block: { kind: "quote", lines: body.map((line) => parseInline(withoutQuoteMarkers(line))) },
    next: at + body.length,
  };
}

function readTable(lines: string[], at: number): Step | null {
  const head = lines[at] ?? "";
  const divider = lines[at + 1] ?? "";
  if (!head.includes("|") || !isDividerFor(divider, splitCells(head).length)) return null;
  const header = splitCells(head).map(parseInline);
  const body = takeWhile(lines, at + 2, (line) => line.includes("|"));
  const align = splitCells(divider).map(alignOf);
  const rowOf = (line: string): Inline[][] => {
    const cells = splitCells(line);
    return header.map((_, c) => parseInline(cells[c] ?? ""));
  };
  return {
    block: {
      kind: "table",
      header,
      align: header.map((_, c) => align[c] ?? "left"),
      rows: body.map(rowOf),
    },
    next: at + 2 + body.length,
  };
}

function isDividerFor(divider: string, columns: number): boolean {
  const cells = splitCells(divider);
  return cells.length === columns && cells.every((cell) => DIVIDER_CELL.test(cell.trim()));
}

function splitCells(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  const trimmed = line.trim();
  for (let at = 0; at < trimmed.length; at++) {
    const char = trimmed[at]!;
    if (char === "\\" && trimmed[at + 1] === "|") {
      cell += "\\|";
      at++;
    } else if (char === "|") {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  cells.push(cell);
  if (trimmed.startsWith("|")) cells.shift();
  if (trimmed.endsWith("|") && !trimmed.endsWith("\\|")) cells.pop();
  return cells.map((text) => text.trim());
}

function alignOf(divider: string): Align {
  if (divider.startsWith(":") && divider.endsWith(":")) return "center";
  return divider.endsWith(":") ? "right" : "left";
}

function readList(lines: string[], at: number): Step | null {
  if (!LIST_ITEM.test(lines[at] ?? "")) return null;
  const body = takeWhile(
    lines,
    at,
    (line) => LIST_ITEM.test(line) || (LIST_CONTINUATION.test(line) && !FENCE.test(line)),
  );
  const sources: ListSource[] = [];
  for (const line of body) {
    const match = LIST_ITEM.exec(line);
    if (match)
      sources.push({ indent: match[1] ?? "", marker: match[2] ?? "-", text: match[3] ?? "" });
    else sources[sources.length - 1]!.text += ` ${line.trim()}`;
  }
  return { block: { kind: "list", items: sources.map(listItem) }, next: at + body.length };
}

type ListSource = { indent: string; marker: string; text: string };

function listItem({ indent, marker, text }: ListSource): ListItem {
  const box = TASK_BOX.exec(text);
  const task = box === null ? null : box[1] === " " ? "open" : "done";
  return {
    depth: Math.min(MAX_LIST_DEPTH, Math.floor(indent.length / 2)),
    ordered: /\d/.test(marker),
    marker,
    task,
    inline: parseInline(box === null ? text : text.slice(box[0].length)),
  };
}

function readParagraph(lines: string[], at: number): Step {
  const rest = takeWhile(lines, at + 1, (line) => line.trim() !== "" && !BLOCK_START.test(line));
  const text = [lines[at] ?? "", ...rest].map((line) => line.trim()).join(" ");
  return { block: { kind: "paragraph", inline: parseInline(text) }, next: at + 1 + rest.length };
}

function takeWhile(lines: string[], from: number, isPart: (line: string) => boolean): string[] {
  let end = from;
  while (end < lines.length && isPart(lines[end]!)) end++;
  return lines.slice(from, end);
}
