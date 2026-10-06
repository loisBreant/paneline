import type { ElementTable, RenderElement } from "claude-code";

import { filesModel, unfoldedRows } from "./files-model";
import type { AgentTotal, Change, FileTreeRow, FilesSource } from "./files-model";
import { header, paneRow, paneHeaderLook, plural } from "./pane-kit";
import type { Part } from "./pane-kit";
import { clipStart, displayWidth } from "./text-width";
import { treeGlyphs } from "./tree-glyphs";
import { paneInk } from "./pane-ink";

type Ui = ElementTable;

export type FilesView = FilesSource & {
  width: number;
  folded: Record<string, boolean>;
  toggleFolder: (key: string, isFolded: boolean) => void;
};

const AUTO_FOLD_ROWS = 60;

const MARK_CELLS = 2;

const COUNTS_GAP_CELLS = 1;

const OPEN_GLYPH = "▾";

const FOLDED_GLYPH = "▸";

export function filesTab(ui: Ui, view: FilesView): RenderElement {
  const { Box, Text } = ui;
  const model = filesModel(view);
  const isFolded = (row: FileTreeRow): boolean =>
    view.folded[row.key] ?? (model.fileCount > AUTO_FOLD_ROWS && row.depth >= 1);
  const rows = unfoldedRows(model.rows, isFolded);
  const glyphs = treeGlyphs(rows);
  return (
    <Box flexDirection="column">
      {header(ui, "Files", paneHeaderLook(), view.width)}
      {model.fileCount === 0 ? (
        <Text color={paneInk().muted} wrap="truncate-end">
          No files touched yet.
        </Text>
      ) : (
        <Box flexDirection="column">
          {summary(ui, model.totals, view.width)}
          {rows.map((row, i) => fileRow(ui, row, glyphs[i] ?? "", isFolded(row), view))}
        </Box>
      )}
    </Box>
  );
}

function fileRow(
  ui: Ui,
  row: FileTreeRow,
  glyph: string,
  isFolded: boolean,
  view: FilesView,
): RenderElement {
  if (row.total !== undefined) return folderRow(ui, row, row.total, glyph, isFolded, view);
  const { file } = row;
  return paneRow(ui, {
    prefix: glyph === "" ? undefined : glyph,
    guide: paneInk().rule,
    middle: { text: row.name, color: file?.isEdited ? paneInk().text : paneInk().muted },
    middleWrap: "truncate-end",
    right: file?.isEdited ? changeParts(file) : undefined,
    width: view.width,
  });
}

function folderRow(
  ui: Ui,
  row: FileTreeRow,
  total: Change,
  glyph: string,
  isFolded: boolean,
  view: FilesView,
): RenderElement {
  const { Box, Button, Text } = ui;
  const mark = isFolded ? FOLDED_GLYPH : OPEN_GLYPH;
  const counts = isFolded && total.added + total.removed > 0 ? changeParts(total) : [];
  const countsCells = counts.reduce((cells, part) => cells + part.text.length, 0);
  const nameCells =
    view.width -
    displayWidth(glyph) -
    MARK_CELLS -
    (countsCells === 0 ? 0 : countsCells + COUNTS_GAP_CELLS);
  return (
    <Box key={row.key} flexDirection="row" width={view.width} height={1}>
      <Box flexShrink={0}>
        <Text color={paneInk().rule} wrap="truncate-end">
          {glyph}
        </Text>
      </Box>
      <Box flexShrink={1} minWidth={0}>
        <Button
          label={`${mark} ${clipStart(row.name, nameCells)}`}
          plain
          dimColor
          onPress={() => view.toggleFolder(row.key, !isFolded)}
        />
      </Box>
      <Box flexGrow={1} flexShrink={1} minWidth={0}>
        <Text color={paneInk().muted} wrap="truncate-end">
          {row.branch === undefined ? "" : ` · ${row.branch}`}
        </Text>
      </Box>
      {counts.length === 0 ? null : (
        <Box flexShrink={0}>
          <Text wrap="truncate-end">{counts.map(changePiece(ui))}</Text>
        </Box>
      )}
    </Box>
  );
}

function changePiece({ Text }: Ui): (part: Part) => RenderElement {
  return (part) => (
    <Text key={part.text} color={part.color} wrap="truncate-end">
      {part.text}
    </Text>
  );
}

function changeParts(change: Change): Part[] {
  return [
    { text: `+${change.added}`, color: paneInk().ok },
    { text: ` -${change.removed}`, color: paneInk().failed },
  ];
}

function summary(ui: Ui, totals: AgentTotal[], width: number): RenderElement | null {
  const { Box, Text } = ui;
  if (totals.length === 0) return null;
  const files = new Set(totals.flatMap((total) => [...total.files])).size;
  const change = {
    added: totals.reduce((sum, total) => sum + total.added, 0),
    removed: totals.reduce((sum, total) => sum + total.removed, 0),
  };
  return (
    <Box flexDirection="column">
      {paneRow(ui, {
        middle: { text: `${files} ${plural("file", files)} changed`, color: paneInk().text },
        middleWrap: "truncate-end",
        right: changeParts(change),
        width,
      })}
      {totals.map((total) =>
        paneRow(ui, {
          middle: { text: total.label, color: paneInk().muted },
          middleWrap: "truncate-end",
          right: [
            {
              text: `${total.files.size} ${plural("file", total.files.size)} +${total.added} -${total.removed}`,
              color: paneInk().muted,
            },
          ],
          width,
        }),
      )}
      <Text wrap="truncate-end"> </Text>
    </Box>
  );
}
