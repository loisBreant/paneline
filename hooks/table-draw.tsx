import type { ElementTable, RenderElement } from "claude-code";

import type { Align, Run, TableBlock } from "./markdown";
import { inlineElements, withStyle } from "./inline-draw";
import type { ReplyLook } from "./reply-look";
import { displayWidth, wrapRuns } from "./text-width";

type Ui = ElementTable;

type Cell = Run[];

const MIN_COLUMN_WIDTH = 3;

const LONGEST_WHOLE_WORD = 24;

const NO_RUN_STYLE = { strong: false, emphasis: false, strike: false, code: false };

export function tableView(
  ui: Ui,
  block: TableBlock,
  look: ReplyLook,
  width: number,
  key: string,
): RenderElement {
  const { Box } = ui;
  const columns = block.header.length;
  const header = block.header.map((inline) => withStyle(inline, { strong: true }));
  const rows = block.rows.map((row) => block.header.map((_, c) => withStyle(row[c] ?? [], {})));
  const widths = columnWidths([header, ...rows], width);
  const lines =
    widths === null
      ? recordLines(ui, header, rows, look, width, key)
      : gridLines(ui, { header, rows, widths, align: block.align, columns }, look, key);
  return (
    <Box key={key} flexDirection="column">
      {lines}
    </Box>
  );
}

function columnWidths(allRows: Cell[][], width: number): number[] | null {
  const columns = allRows[0]!.length;
  const natural = Array.from({ length: columns }, (_, c) =>
    Math.max(MIN_COLUMN_WIDTH, ...allRows.map((row) => displayWidth(plainOfRuns(row[c]!)))),
  );
  const available = width - (columns + 1) - 2 * columns;
  if (sum(natural) <= available) return natural;
  const minimum = natural.map((n, c) =>
    Math.min(n, Math.max(MIN_COLUMN_WIDTH, ...allRows.map((row) => longestWord(row[c]!)))),
  );
  if (sum(minimum) > available) return null;
  return shareExtra(natural, minimum, available - sum(minimum));
}

function longestWord(cell: Cell): number {
  const widest = Math.max(...plainOfRuns(cell).split(/\s+/).map(displayWidth));
  return Math.min(LONGEST_WHOLE_WORD, widest);
}

function shareExtra(natural: number[], minimum: number[], extra: number): number[] {
  const wanted = natural.map((n, c) => n - minimum[c]!);
  const totalWanted = sum(wanted);
  const widths = minimum.map((m, c) => m + Math.floor((extra * wanted[c]!) / totalWanted));
  let leftover = extra - sum(widths) + sum(minimum);
  const widest = natural.map((_, c) => c).sort((a, b) => natural[b]! - natural[a]!);
  for (const c of widest) {
    if (leftover === 0) break;
    if (widths[c]! >= natural[c]!) continue;
    widths[c]!++;
    leftover--;
  }
  return widths;
}

type Grid = {
  header: Cell[];
  rows: Cell[][];
  widths: number[];
  align: Align[];
  columns: number;
};

function gridLines(ui: Ui, grid: Grid, look: ReplyLook, key: string): RenderElement[] {
  const { Text } = ui;
  const { header, rows, widths } = grid;
  const wrapped = [header, ...rows].map((row) => row.map((cell, c) => wrapCell(cell, widths[c]!)));
  const hasWrappedCell = wrapped.some((row) => row.some((cell) => cell.length > 1));
  const border = (left: string, fill: string, cross: string, right: string, k: string) => (
    <Text key={k} color={look.rule} wrap="truncate-end">
      {left + widths.map((w) => fill.repeat(w + 2)).join(cross) + right}
    </Text>
  );
  const out: RenderElement[] = [border("┌", "─", "┬", "┐", `${key}.top`)];
  out.push(...rowLines(ui, wrapped[0]!, grid, look, `${key}.h`));
  out.push(border("╞", "═", "╪", "╡", `${key}.head`));
  wrapped.slice(1).forEach((row, r) => {
    if (r > 0 && hasWrappedCell) out.push(border("├", "─", "┼", "┤", `${key}.s${r}`));
    out.push(...rowLines(ui, row, grid, look, `${key}.r${r}`));
  });
  out.push(border("└", "─", "┴", "┘", `${key}.bottom`));
  return out;
}

function wrapCell(cell: Cell, width: number): Cell[] {
  if (displayWidth(plainOfRuns(cell)) <= width) return [cell];
  const lines = wrapRuns(cell, width);
  return lines.length === 0 ? [[]] : lines;
}

function rowLines(
  ui: Ui,
  cells: Cell[][],
  { widths, align }: Grid,
  look: ReplyLook,
  key: string,
): RenderElement[] {
  const { Text } = ui;
  const height = Math.max(...cells.map((cell) => cell.length));
  return Array.from({ length: height }, (_, line) => (
    <Text key={`${key}.${line}`} color={look.prose} wrap="truncate-end">
      {cells.map((cell, c) => {
        const runs = cell[line] ?? [];
        const [before, after] = paddingOf(widths[c]! - displayWidth(plainOfRuns(runs)), align[c]);
        return [
          <Text key={`${c}.l`} color={look.rule}>
            {"│"}
          </Text>,
          " ".repeat(before + 1),
          ...inlineElements(ui, runs, look, look.prose, `${key}.${line}.${c}`),
          " ".repeat(after + 1),
        ];
      })}
      <Text color={look.rule}>{"│"}</Text>
    </Text>
  ));
}

function paddingOf(space: number, align: Align | undefined): [number, number] {
  if (align === "right") return [space, 0];
  if (align === "center") return [Math.floor(space / 2), Math.ceil(space / 2)];
  return [0, space];
}

function recordLines(
  ui: Ui,
  header: Cell[],
  rows: Cell[][],
  look: ReplyLook,
  width: number,
  key: string,
): RenderElement[] {
  const { Text } = ui;
  if (rows.length === 0) return headerRecord(ui, header, look, width, key);
  return rows.flatMap((row, r) => {
    const lines = row.flatMap((cell, c) =>
      wrapRuns([...header[c]!, { text: ": ", style: NO_RUN_STYLE }, ...cell], width),
    );
    const drawn = lines.map((runs, i) => (
      <Text key={`${key}.r${r}.${i}`} color={look.prose} wrap="truncate-end">
        {inlineElements(ui, runs, look, look.prose, `${key}.r${r}.${i}`)}
      </Text>
    ));
    if (r === rows.length - 1) return drawn;
    return [
      ...drawn,
      <Text key={`${key}.r${r}.rule`} color={look.rule} wrap="truncate-end">
        {"─".repeat(width)}
      </Text>,
    ];
  });
}

function headerRecord(
  ui: Ui,
  header: Cell[],
  look: ReplyLook,
  width: number,
  key: string,
): RenderElement[] {
  const { Text } = ui;
  const separator = { text: " │ ", style: NO_RUN_STYLE };
  const runs = header.flatMap((cell, c) => (c === 0 ? cell : [separator, ...cell]));
  return wrapRuns(runs, width).map((line, i) => (
    <Text key={`${key}.h${i}`} color={look.prose} wrap="truncate-end">
      {inlineElements(ui, line, look, look.prose, `${key}.h${i}`)}
    </Text>
  ));
}

function plainOfRuns(runs: Cell): string {
  return runs.map((run) => run.text).join("");
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
