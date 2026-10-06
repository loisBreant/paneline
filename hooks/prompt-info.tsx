import type { ElementTable, RenderElement } from "claude-code";

import type { PromptInfo, UsageSnap } from "../types";
import { shortModel } from "./format";
import { palette } from "./palette";
import { tildePath } from "./paths";
import { accentOf, chipColors } from "./session-color";

const MIN_PATH_COLUMNS = 8;
const MIN_PATH_COLUMNS_BEFORE_DROP = 12;
const CHIP_PADDING = 2;
const PANE_TOGGLE_COLUMNS = 5;
const GAUGE_LEVELS = "▁▂▃▄▅▆▇█";
const METER_GAP = 2;
const ROW_GAP = 2;
const DROP_STEPS = [[], ["7d"], ["7d", "5h"]];
const NO_METERS: MeterLayout = { meters: [], withGauges: false, shortensPath: false };

type Meter = { label: string; percent: number };

export function metersOf(usage: UsageSnap): Meter[] {
  return [
    ...(usage.context === null ? [] : [{ label: "ctx", percent: usage.context }]),
    ...usage.limits,
  ].map((meter) => ({
    label: meter.label,
    percent: Math.max(0, Math.min(100, Math.round(meter.percent))),
  }));
}

type MeterLayout = { meters: Meter[]; withGauges: boolean; shortensPath: boolean };

export function promptInfoRow(
  ui: ElementTable,
  { model, effort, cwd }: PromptInfo,
  home: string | undefined,
  totalColumns: number,
  colorName: string,
  meters: Meter[],
): RenderElement {
  const { Box, Text } = ui;
  const columns = totalColumns - PANE_TOGGLE_COLUMNS;
  const lead = [shortModel(model), effort].filter((label): label is string => !!label);
  const leadWidth = lead.reduce((width, label) => width + label.length + CHIP_PADDING, 0);
  const path = tildePath(cwd, home);
  const layout = fittingLayout(meters, columns - leadWidth - CHIP_PADDING, path.length);
  const room = Math.max(columns - leadWidth - CHIP_PADDING - rightWidth(layout), MIN_PATH_COLUMNS);
  const { background, text } = chipColors(colorName);
  const labels = [...lead, shortenPath(path, room)];
  return (
    <Box width={totalColumns} paddingRight={PANE_TOGGLE_COLUMNS} justifyContent="space-between">
      <Text wrap="truncate-end">
        {labels.map((label) => (
          <Text key={label} color={text} backgroundColor={background}>{` ${label} `}</Text>
        ))}
      </Text>
      {layout.meters.length === 0 ? null : meterText(ui, layout, accentOf(colorName))}
    </Box>
  );
}

function meterText(
  { Box, Text }: ElementTable,
  { meters, withGauges }: MeterLayout,
  accent: string,
): RenderElement {
  return (
    <Box flexShrink={0} columnGap={METER_GAP}>
      {meters.map((meter) => (
        <Text key={meter.label} wrap="truncate-end">
          <Text color={palette.muted}>{`${meter.label} `}</Text>
          {withGauges ? <Text color={accent}>{`${gaugeOf(meter.percent)} `}</Text> : null}
          <Text bold color={accent}>{`${meter.percent}%`}</Text>
        </Text>
      ))}
    </Box>
  );
}

function gaugeOf(percent: number): string {
  return GAUGE_LEVELS[
    Math.min(GAUGE_LEVELS.length - 1, Math.floor((percent / 100) * GAUGE_LEVELS.length))
  ] as string;
}

function fittingLayout(
  meters: Meter[],
  roomForPathAndMeters: number,
  pathLength: number,
): MeterLayout {
  const layouts = layoutsOf(meters);
  const fitting = layouts.find((layout) => {
    const needed = layout.shortensPath
      ? Math.min(pathLength, MIN_PATH_COLUMNS_BEFORE_DROP)
      : pathLength;
    return roomForPathAndMeters - rightWidth(layout) >= needed;
  });
  return fitting ?? layouts.at(-1) ?? NO_METERS;
}

function layoutsOf(meters: Meter[]): MeterLayout[] {
  if (meters.length === 0) return [];
  return [
    { meters, withGauges: true, shortensPath: false },
    { meters, withGauges: false, shortensPath: false },
    ...DROP_STEPS.map((dropped) => ({
      meters: meters.filter((meter) => !dropped.includes(meter.label)),
      withGauges: false,
      shortensPath: true,
    })),
  ];
}

function rightWidth(layout: MeterLayout): number {
  return layout.meters.length === 0 ? 0 : ROW_GAP + metersWidth(layout);
}

function metersWidth({ meters, withGauges }: MeterLayout): number {
  const segments = meters.map(
    (meter) => meter.label.length + 1 + (withGauges ? 2 : 0) + `${meter.percent}%`.length,
  );
  return segments.reduce((sum, width) => sum + width, 0) + METER_GAP * (segments.length - 1);
}

function shortenPath(path: string, room: number): string {
  if (path.length <= room) return path;
  const segments = path.split("/").filter((segment) => segment !== "");
  const last = segments.at(-1) ?? path;
  for (let kept = segments.length - 1; kept >= 1; kept--) {
    const candidate = `…/${segments.slice(-kept).join("/")}`;
    if (candidate.length <= room) return candidate;
  }
  return last.length + 2 <= room ? `…/${last}` : `…${last.slice(-(room - 1))}`;
}
