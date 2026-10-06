import { memo } from "./memo";
import { textList } from "./diagram-list";
import { renderArt } from "./diagram-source";
import { TANGLED_DIAGRAM } from "./vendor/mermaid-text.js";

const MAX_SOURCE_LINES = 80;
const MAX_SOURCE_CHARS = 8000;
const CACHE_LIMIT = 100;
const DIAGRAM_PADDING = 4;
const LABEL_WRAP = 22;
const LEADING_COMMENTS = /^(\s*%%[^\n]*\n)+/;
const FLOWCHART_HEADER = /^\s*(flowchart|graph)\s+(LR|RL|TD|TB|BT)\b/i;
const HORIZONTAL_HEADER = /^(\s*(?:flowchart|graph)\s+)(?:LR|RL)\b/i;

const diagramCache = memo<Diagram>(CACHE_LIMIT);

type Diagram =
  | { kind: "art"; art: string }
  | { kind: "list"; lines: string[] }
  | { kind: "failed"; reason: string };

export function drawDiagram(source: string, columns: number): Diagram {
  return diagramCache(`${columns}:${source}`, () =>
    safeDiagram(source.replace(LEADING_COMMENTS, ""), columns),
  );
}

function safeDiagram(source: string, columns: number): Diagram {
  try {
    return buildDiagram(source, columns);
  } catch (error) {
    if (error instanceof Error && error.message === TANGLED_DIAGRAM)
      return fallback(source, TANGLED_DIAGRAM);
    return { kind: "failed", reason: reasonOf(error) };
  }
}

function buildDiagram(source: string, columns: number): Diagram {
  const limit = columns - DIAGRAM_PADDING;
  if (source.trim() === "") return { kind: "failed", reason: "the diagram is empty" };
  if (source.length > MAX_SOURCE_CHARS || source.split("\n").length > MAX_SOURCE_LINES)
    return { kind: "failed", reason: "the source is too large" };
  const art = firstFittingArt(source, columns, limit);
  if (art !== undefined) return { kind: "art", art };
  return fallback(source, `the drawing is wider than ${limit} columns`);
}

function firstFittingArt(source: string, columns: number, limit: number): string | undefined {
  for (const candidate of new Set(candidates(source))) {
    const art = renderArt(candidate, columns);
    if (widestLine(art) <= limit) return art;
  }
  return undefined;
}

function fallback(source: string, reason: string): Diagram {
  const lines = textList(source);
  return lines.length > 0 ? { kind: "list", lines } : { kind: "failed", reason };
}

function reasonOf(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split(". Expected")[0]!;
}

function candidates(source: string): string[] {
  if (!FLOWCHART_HEADER.test(source)) return [source];
  const wrapped = wrapLabels(source);
  return [
    source,
    wrapped,
    ...(HORIZONTAL_HEADER.test(wrapped) ? [wrapped.replace(HORIZONTAL_HEADER, "$1TD")] : []),
  ];
}

function wrapLabels(source: string): string {
  return source.replace(/(?<=[[({]"?)[^\])}\n"|]{25,}(?="?[\])}])/g, (label) =>
    wrapWords(label, LABEL_WRAP).join("<br/>"),
  );
}

function wrapWords(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines.length - 1;
    const current = lines[last];
    if (current !== undefined && current.length + word.length < width)
      lines[last] = `${current} ${word}`;
    else lines.push(word);
  }
  return lines;
}

const widestLine = (art: string): number =>
  Math.max(...art.split("\n").map((line) => [...line].length));
