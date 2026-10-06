export type Styled<S> = { text: string; style: S };

type Word<S> = { pieces: Styled<S>[]; width: number };
type Gap<S> = { gap: Styled<S> };

const MIN_PLAIN_WIDTH = 10;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const ZERO_WIDTH = /^[\p{Mn}\p{Me}\p{Cf}︀-️]+$/u;

const WIDE =
  /^[\p{Emoji_Presentation}ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦\u{20000}-\u{3FFFD}]/u;

const ELLIPSIS = "…";

const ELLIPSIS_CELLS = 1;

const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;

const PICTOGRAPHIC = /^\p{Extended_Pictographic}/u;

const EMOJI_VARIATION = "️";

export function displayWidth(text: string): number {
  if (PRINTABLE_ASCII.test(text)) return text.length;
  let columns = 0;
  for (const grapheme of graphemesOf(text)) columns += graphemeWidth(grapheme);
  return columns;
}

export function clipEnd(text: string, cells: number): string {
  if (displayWidth(text) <= cells) return text;
  return `${takeFromStart(graphemesOf(text), cells - ELLIPSIS_CELLS).join("")}${ELLIPSIS}`;
}

export function clipStart(text: string, cells: number): string {
  if (displayWidth(text) <= cells) return text;
  const kept = takeFromStart(graphemesOf(text).reverse(), cells - ELLIPSIS_CELLS);
  return `${ELLIPSIS}${kept.reverse().join("")}`;
}

export function wrapPlain(text: string, width: number): string[] {
  return text.split("\n").flatMap((line) => wrapLine(line, Math.max(MIN_PLAIN_WIDTH, width)));
}

export function wrapRuns<S>(runs: Styled<S>[], width: number): Styled<S>[][] {
  const rows: Styled<S>[][] = [];
  let row: Styled<S>[] = [];
  let rowWidth = 0;
  let pendingGap: Styled<S> | null = null;
  const endRow = () => {
    if (row.length > 0) rows.push(row);
    row = [];
    rowWidth = 0;
    pendingGap = null;
  };
  const addGrapheme = (grapheme: string, style: S) => {
    const columns = graphemeWidth(grapheme);
    if (rowWidth > 0 && rowWidth + columns > width) endRow();
    appendPiece(row, grapheme, style);
    rowWidth += columns;
  };
  for (const part of wordsOf(runs)) {
    if ("gap" in part) {
      if (rowWidth > 0) pendingGap = part.gap;
      continue;
    }
    const gapWidth = pendingGap ? displayWidth(pendingGap.text) : 0;
    if (rowWidth > 0 && rowWidth + gapWidth + part.width <= width) {
      if (pendingGap) appendPiece(row, pendingGap.text, pendingGap.style);
      rowWidth += gapWidth;
      pendingGap = null;
    } else if (rowWidth > 0) {
      endRow();
    }
    if (part.width <= width) {
      for (const piece of part.pieces) appendPiece(row, piece.text, piece.style);
      rowWidth += part.width;
      continue;
    }
    for (const piece of part.pieces)
      for (const grapheme of graphemesOf(piece.text)) addGrapheme(grapheme, piece.style);
  }
  endRow();
  return rows;
}

function graphemesOf(text: string): string[] {
  return Array.from(segmenter.segment(text), (part) => part.segment);
}

function takeFromStart(graphemes: string[], cells: number): string[] {
  const kept: string[] = [];
  let used = 0;
  for (const grapheme of graphemes) {
    used += graphemeWidth(grapheme);
    if (used > cells) break;
    kept.push(grapheme);
  }
  return kept;
}

function graphemeWidth(grapheme: string): number {
  if (ZERO_WIDTH.test(grapheme)) return 0;
  if (WIDE.test(grapheme)) return 2;
  return PICTOGRAPHIC.test(grapheme) && grapheme.includes(EMOJI_VARIATION) ? 2 : 1;
}

function wrapLine(line: string, width: number): string[] {
  const rows: string[] = [];
  let row = "";
  for (const piece of line.split(" ").flatMap((word) => breakWord(word, width))) {
    if (row !== "" && displayWidth(row) + displayWidth(piece) + 1 > width) {
      rows.push(row);
      row = piece;
      continue;
    }
    row = row === "" ? piece : `${row} ${piece}`;
  }
  return [...rows, row];
}

function breakWord(word: string, width: number): string[] {
  const pieces: string[] = [];
  let piece = "";
  for (const grapheme of graphemesOf(word)) {
    if (piece !== "" && displayWidth(piece) + graphemeWidth(grapheme) > width) {
      pieces.push(piece);
      piece = "";
    }
    piece += grapheme;
  }
  return [...pieces, piece];
}

function wordsOf<S>(runs: Styled<S>[]): (Word<S> | Gap<S>)[] {
  const parts: (Word<S> | Gap<S>)[] = [];
  let word: Word<S> | null = null;
  for (const run of runs) {
    for (const chunk of run.text.split(/( +)/)) {
      if (chunk === "") continue;
      if (chunk.startsWith(" ")) {
        word = null;
        parts.push({ gap: { text: chunk, style: run.style } });
        continue;
      }
      if (word === null) {
        word = { pieces: [], width: 0 };
        parts.push(word);
      }
      word.pieces.push({ text: chunk, style: run.style });
      word.width += displayWidth(chunk);
    }
  }
  return parts;
}

function appendPiece<S>(row: Styled<S>[], text: string, style: S): void {
  const last = row[row.length - 1];
  if (last && sameStyle(last.style, style)) last.text += text;
  else row.push({ text, style });
}

function sameStyle(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || typeof right !== "object" || !left || !right) return false;
  const leftEntries = Object.entries(left);
  return (
    leftEntries.length === Object.keys(right).length &&
    leftEntries.every(([key, value]) => Object.is(value, (right as Record<string, unknown>)[key]))
  );
}
