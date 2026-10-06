import type { ElementTable, RenderElement } from "claude-code";

import { header, labelButton, paneHeaderLook, plural } from "./pane-kit";
import { paneInk } from "./pane-ink";
import type { UseEntry } from "./use-counts";

type Ui = ElementTable;

export type SkillOwner = "user" | "project" | "plugin" | "built-in";

export type SkillEntry = {
  name: string;
  description: string;
  owner: SkillOwner;
  plugin?: string;
};

export type SkillsView = {
  width: number;
  isLightTheme: boolean;
  top: readonly UseEntry[];
  allUsed: readonly UseEntry[];
  statsOpen: boolean;
  toggleStats: () => void;
  clearUses: () => void;
  skills: readonly SkillEntry[];
  expanded: ReadonlySet<string>;
  toggle: (name: string) => void;
  insert: (name: string) => void;
};

type Block = { title: string; skills: readonly SkillEntry[] };

const OPEN_GLYPH = "▾";
const FOLDED_GLYPH = "▸";
const GLYPH_CELLS = 1;
const DESCRIPTION_INDENT_CELLS = 2;
const TOP_TITLE = "Top used";
const CLEAR_LABEL = "clear";
const OWNER_TITLES: Record<SkillOwner, string> = {
  user: "User",
  project: "Project",
  plugin: "Plugins",
  "built-in": "Built-in",
};

export function skillsTab(ui: Ui, view: SkillsView): RenderElement {
  const { Box, Text } = ui;
  if (view.skills.length === 0) {
    return (
      <Text color={paneInk().muted} wrap="truncate-end">
        no skills
      </Text>
    );
  }
  const sections = [
    ...(view.top.length === 0 ? [] : [topSection(ui, view)]),
    ...blocksOf(view.skills).map((block) => ownerSection(ui, block, view)),
  ];
  return (
    <Box flexDirection="column" width={view.width}>
      {sections.flatMap((section, index) => [
        ...(index > 0 ? [<Box key={`gap-${index}`} height={1} />] : []),
        section,
      ])}
    </Box>
  );
}

function blocksOf(skills: readonly SkillEntry[]): Block[] {
  const plugins = [
    ...new Set(skills.flatMap((skill) => (skill.owner === "plugin" ? [pluginOf(skill)] : []))),
  ].sort((left, right) => left.localeCompare(right));
  const blocks: Block[] = [
    { title: OWNER_TITLES.user, skills: ownedBy(skills, "user") },
    { title: OWNER_TITLES.project, skills: ownedBy(skills, "project") },
    ...plugins.map((plugin) => ({
      title: plugin,
      skills: ownedBy(skills, "plugin").filter((skill) => pluginOf(skill) === plugin),
    })),
    { title: OWNER_TITLES["built-in"], skills: ownedBy(skills, "built-in") },
  ];
  return blocks.filter((block) => block.skills.length > 0);
}

function ownedBy(skills: readonly SkillEntry[], owner: SkillOwner): SkillEntry[] {
  return skills
    .filter((skill) => skill.owner === owner)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function pluginOf(skill: SkillEntry): string {
  return skill.plugin ?? OWNER_TITLES.plugin;
}

function topSection(ui: Ui, view: SkillsView): RenderElement {
  const { Box, Button } = ui;
  const entries = view.statsOpen ? view.allUsed : view.top;
  const label = view.statsOpen
    ? `${OPEN_GLYPH} top ${view.top.length}`
    : `${FOLDED_GLYPH} all ${view.allUsed.length} used`;
  return (
    <Box key="top" flexDirection="column" width={view.width}>
      <Box flexDirection="row" width={view.width} height={1} columnGap={1}>
        <Box flexGrow={1} flexShrink={1} minWidth={0}>
          {header(ui, TOP_TITLE, paneHeaderLook(), view.width - CLEAR_LABEL.length - 1)}
        </Box>
        <Box flexShrink={0}>
          <Button key="top-clear" label={CLEAR_LABEL} plain dimColor onPress={view.clearUses} />
        </Box>
      </Box>
      {entries.map((entry) => useRow(ui, entry, view.width))}
      {view.allUsed.length > view.top.length ? (
        <Button key="top-stats" label={label} plain dimColor onPress={view.toggleStats} />
      ) : null}
    </Box>
  );
}

function useRow({ Box, Text }: Ui, entry: UseEntry, width: number): RenderElement {
  return (
    <Box key={`top-${entry.name}`} flexDirection="row" width={width} height={1} columnGap={1}>
      <Box flexGrow={1} flexShrink={1} minWidth={0}>
        <Text color={paneInk().text} wrap="truncate-end">
          {entry.name}
        </Text>
      </Box>
      <Box flexShrink={0}>
        <Text color={paneInk().muted} wrap="truncate-end">
          {`${entry.uses} ${plural("use", entry.uses)}`}
        </Text>
      </Box>
    </Box>
  );
}

function ownerSection(ui: Ui, block: Block, view: SkillsView): RenderElement {
  const { Box, Text } = ui;
  const count = `${block.skills.length} ${plural("skill", block.skills.length)}`;
  return (
    <Box key={`block-${block.title}`} flexDirection="column" width={view.width}>
      <Box flexDirection="row" width={view.width} height={1} columnGap={1}>
        <Box flexGrow={1} flexShrink={1} minWidth={0}>
          {header(ui, block.title, paneHeaderLook(), view.width - count.length - 1)}
        </Box>
        <Box flexShrink={0}>
          <Text color={paneInk().muted} wrap="truncate-end">
            {count}
          </Text>
        </Box>
      </Box>
      {block.skills.flatMap((skill) => skillRows(ui, skill, view))}
    </Box>
  );
}

function skillRows(ui: Ui, skill: SkillEntry, view: SkillsView): RenderElement[] {
  const { Box, Button, Text } = ui;
  const isOpen = view.expanded.has(skill.name);
  const rows: RenderElement[] = [
    <Box key={`${skill.name}-row`} flexDirection="row" width={view.width} height={1} columnGap={1}>
      {skill.description === "" ? (
        <Box width={GLYPH_CELLS} />
      ) : (
        <Button
          key={`${skill.name}-toggle`}
          label={isOpen ? OPEN_GLYPH : FOLDED_GLYPH}
          plain
          dimColor
          onPress={() => view.toggle(skill.name)}
        />
      )}
      <Box flexShrink={1} minWidth={0}>
        {labelButton(ui, {
          key: skill.name,
          label: skill.name,
          onPress: () => view.insert(skill.name),
        })}
      </Box>
    </Box>,
  ];
  if (!isOpen || skill.description === "") return rows;
  rows.push(
    <Box
      key={`${skill.name}-description`}
      marginLeft={DESCRIPTION_INDENT_CELLS}
      width={view.width - DESCRIPTION_INDENT_CELLS}
    >
      <Text color={paneInk().muted} wrap="wrap">
        {skill.description}
      </Text>
    </Box>,
  );
  return rows;
}
