import type { ElementTable, RenderElement, SessionContextBreakdown } from "claude-code";

import { singleLine } from "./format";
import { mcpCommandName } from "./mcp-name";
import { labelButton, plural } from "./pane-kit";
import { paneInk } from "./pane-ink";
import { SCOPE_GROUPS, scopeOf, serversOf } from "./servers";
import type { McpAction, McpScope, ScopeIndex, Server } from "./servers";

type Ui = ElementTable;

export type McpView = {
  context: SessionContextBreakdown | null;
  width: number;
  disabledServers: string[];
  scopes: ScopeIndex;
  queuedServers: string[];
  selectedServer: string | null;
  select: (server: string) => void;
  act: (action: McpAction, server: string) => void;
  isDarkTheme: boolean;
};

type Card = {
  name: string;
  scope: McpScope;
  detail: string;
  isLive: boolean;
  actions: McpAction[];
};

type Group = { scope: McpScope; heading: string; cards: Card[] };

const ACTIONS_INDENT_CELLS = 2;

export function mcpTab(ui: Ui, view: McpView): RenderElement {
  const { Box, Text } = ui;
  const { context } = view;
  if (context === null) {
    return (
      <Text color={paneInk().muted} wrap="truncate-end">
        no MCP data yet
      </Text>
    );
  }
  const groups = groupsOf(cardsOf(serversOf(context.mcpTools), view));
  const cards = groups.flatMap((group) => group.cards);
  if (cards.length === 0) {
    return (
      <Text color={paneInk().muted} wrap="truncate-end">
        no MCP servers
      </Text>
    );
  }
  const detailCells = Math.max(...cards.map((card) => card.detail.length));
  const nameCells = Math.max(...cards.map((card) => card.name.length));
  const selected =
    view.selectedServer !== null && cards.some((card) => card.name === view.selectedServer)
      ? view.selectedServer
      : cards[0]?.name;
  return (
    <Box flexDirection="column" width={view.width}>
      <Text bold color={paneInk().text} wrap="truncate-end">
        Manage MCP servers
      </Text>
      <Text color={paneInk().muted} wrap="truncate-end">
        {`${cards.length} ${plural("server", cards.length)}`}
      </Text>
      <Box height={1} />
      {groups.flatMap((group, index) => [
        ...(index > 0 ? [<Box key={`${group.scope}-gap`} height={1} />] : []),
        headingRow(ui, group, view),
        ...group.cards.flatMap((card) =>
          cardRows(ui, card, { view, detailCells, nameCells, isSelected: card.name === selected }),
        ),
      ])}
    </Box>
  );
}

function headingRow(ui: Ui, group: Group, { width, isDarkTheme }: McpView): RenderElement {
  const { Box, Text } = ui;
  const ruleCells = Math.max(0, width - group.heading.length - 1);
  return (
    <Box key={`${group.scope}-heading`} flexDirection="row" width={width} height={1} columnGap={1}>
      <Text bold color={isDarkTheme ? paneInk().section : paneInk().text} wrap="truncate-end">
        {group.heading}
      </Text>
      <Text color={paneInk().rule} wrap="truncate-end">
        {"─".repeat(ruleCells)}
      </Text>
    </Box>
  );
}

function groupsOf(cards: Card[]): Group[] {
  return SCOPE_GROUPS.map(({ scope, heading }) => ({
    scope,
    heading,
    cards: cards.filter((card) => card.scope === scope),
  })).filter((group) => group.cards.length > 0);
}

function cardsOf(live: Server[], view: McpView): Card[] {
  const named = live.map((server) => ({
    ...server,
    name: singleLine(mcpCommandName(server.name)),
  }));
  const liveNames = new Set(named.map((server) => server.name));
  const disabled = view.disabledServers.filter((name) => !liveNames.has(name));
  return [
    ...named.map((server) => ({
      name: server.name,
      scope: scopeOf(server.name, view.scopes),
      detail: `${server.tools} ${plural("tool", server.tools)}`,
      isLive: true,
      actions: ["reconnect", "disable"] as McpAction[],
    })),
    ...disabled.map((name) => ({
      name,
      scope: scopeOf(name, view.scopes),
      detail: "",
      isLive: false,
      actions: ["enable"] as McpAction[],
    })),
  ].map((card) =>
    view.queuedServers.includes(card.name) ? { ...card, detail: "queued", actions: [] } : card,
  );
}

type RowLook = { view: McpView; detailCells: number; nameCells: number; isSelected: boolean };

function cardRows(
  ui: Ui,
  card: Card,
  { view, detailCells, nameCells, isSelected }: RowLook,
): RenderElement[] {
  const { Box, Button, Text } = ui;
  const rows: RenderElement[] = [
    <Box key={`${card.name}-name`} flexDirection="row" width={view.width} height={1} columnGap={1}>
      <Text color={card.isLive ? paneInk().ok : paneInk().muted} wrap="truncate-end">
        {card.isLive ? "✔" : "○"}
      </Text>
      <Box width={nameCells} flexShrink={1} minWidth={0} marginRight={1}>
        {labelButton(ui, {
          key: card.name,
          label: card.name,
          isLight: !view.isDarkTheme,
          onPress: () => view.select(card.name),
        })}
      </Box>
      <Box width={detailCells} flexShrink={0} justifyContent="flex-end">
        <Text color={paneInk().muted} wrap="truncate-end">
          {card.detail}
        </Text>
      </Box>
    </Box>,
  ];
  if (!isSelected || card.actions.length === 0) return rows;
  rows.push(
    <Box
      key={`${card.name}-actions`}
      flexDirection="row"
      columnGap={2}
      marginLeft={ACTIONS_INDENT_CELLS}
      height={1}
      overflow="hidden"
    >
      {card.actions.map((action) => (
        <Button
          key={`${card.name}-${action}`}
          label={action}
          plain
          dimColor
          onPress={() => view.act(action, card.name)}
        />
      ))}
    </Box>,
  );
  return rows;
}
