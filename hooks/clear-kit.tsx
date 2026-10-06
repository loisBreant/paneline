import type { ElementTable, RenderElement } from "claude-code";

import { header, paneHeaderLook } from "./pane-kit";

type Ui = ElementTable;

const CLEAR_LABEL = "clear";
const CLEAR_CELLS = CLEAR_LABEL.length + 1;

export function clearButton({ Button }: Ui, onPress: () => void): RenderElement {
  return <Button key="clear" label={CLEAR_LABEL} plain dimColor onPress={onPress} />;
}

export function headerWithClear(
  ui: Ui,
  label: string,
  width: number,
  onClear: () => void,
): RenderElement {
  const { Box } = ui;
  return (
    <Box flexDirection="row" width={width} height={1}>
      <Box flexShrink={0}>{header(ui, label, paneHeaderLook(), width - CLEAR_CELLS)}</Box>
      <Box flexShrink={0} marginLeft={1}>
        {clearButton(ui, onClear)}
      </Box>
    </Box>
  );
}

export function withoutCleared<T extends { id: string }>(list: T[], clearedIds: string[]): T[] {
  const cleared = new Set(clearedIds);
  return list.filter((entry) => !cleared.has(entry.id));
}
