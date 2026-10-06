import { atom, read, update } from "claude-code";
import type { EngineInterface, On, SessionContextBreakdown } from "claude-code";

import { markContextStale, mcpBreakdown } from "./breakdown";
import { singleLine } from "./format";
import { mcpCommandName } from "./mcp-name";
import { mcpTab } from "./mcp-draw";
import { PANE } from "./pane-tab";
import { isShownTab, justEntered } from "./shown-tab";
import { disabledServersOf, projectRootOf, scopeIndexOf } from "./servers";
import type { McpAction, ScopeIndex } from "./servers";

export const MCP_TAB = { id: "mcp", label: "MCP" };

const DARK_THEME_PREFIX = "dark";
const UNSAFE_SERVER_NAME = /[\s\p{Cc}]/u;

const themeAtom = atom({ plugin: "paneline", key: "theme" } as const, "dark");
const mcpSeenAtom = atom({ plugin: "paneline", key: "mcpSeen" } as const, [] as string[]);
const mcpSelectedAtom = atom(
  { plugin: "paneline", key: "mcpSelected" } as const,
  null as string | null,
);
const mcpQueuedAtom = atom({ plugin: "paneline", key: "mcpQueued" } as const, [] as string[]);

const CLAUDE_CONFIG_FILE = ".claude.json";
const PROJECT_MCP_FILE = ".mcp.json";

type McpConfig = { disabled: string[]; scopes: ScopeIndex };

let configured: McpConfig | null = null;

export function registerMcpTab(on: On): void {
  on("session.measure", async ($, e, next) => {
    if (e.changed.length === 0 && isShownTab(MCP_TAB.id)) {
      markContextStale();
      $.ui.invalidate("ui.render");
    }
    return next(e);
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e, next) => {
    if (!isShownTab(MCP_TAB.id)) return next(e);
    if (justEntered(MCP_TAB.id)) {
      markContextStale();
      configured = null;
    }
    const [loaded, context, seen, queuedServers, selectedServer, theme] = await Promise.all([
      configured ?? loadConfig($),
      mcpBreakdown((args) => $.session.usage(args)),
      read($, mcpSeenAtom),
      read($, mcpQueuedAtom),
      read($, mcpSelectedAtom),
      read($, themeAtom),
    ]);
    configured = loaded;
    return mcpTab($.ui.resolve(e), {
      context,
      width: e.props.bodyColumns,
      disabledServers: [...new Set([...seen, ...loaded.disabled])],
      scopes: loaded.scopes,
      queuedServers,
      selectedServer,
      isDarkTheme: theme.startsWith(DARK_THEME_PREFIX),
      select: (server) => void update($, mcpSelectedAtom, () => server),
      act: (action, server) => void requestMcp($, action, server, context),
    });
  });
}

async function loadConfig($: EngineInterface): Promise<McpConfig> {
  const home = await $.env.get("HOME");
  const cwd = await $.session.cwd();
  const configText = await readText($, `${home ?? ""}/${CLAUDE_CONFIG_FILE}`);
  const projectMcpText = await readText($, `${projectRootOf(configText, cwd)}/${PROJECT_MCP_FILE}`);
  return {
    disabled: disabledServersOf(configText, cwd),
    scopes: scopeIndexOf(configText, projectMcpText, cwd),
  };
}

function readText($: EngineInterface, path: string): Promise<string> {
  return $.fs.read(path).catch(() => "");
}

async function rememberServers(
  $: EngineInterface,
  breakdown: SessionContextBreakdown | null,
): Promise<void> {
  const live = (breakdown?.mcpTools ?? []).map((tool) => mcpCommandName(tool.serverName));
  await update($, mcpSeenAtom, (list) => [...new Set([...list, ...live])]);
}

async function finishMcp($: EngineInterface, server: string): Promise<void> {
  await update($, mcpQueuedAtom, (list) => list.filter((name) => name !== server));
  configured = null;
  markContextStale();
  $.ui.invalidate("ui.render");
}

async function requestMcp(
  $: EngineInterface,
  action: McpAction,
  server: string,
  breakdown: SessionContextBreakdown | null,
): Promise<void> {
  if (UNSAFE_SERVER_NAME.test(server)) {
    $.ui.toast(
      `Cannot ${action} "${singleLine(server)}": the name has spaces or control characters`,
    );
    return;
  }
  await rememberServers($, breakdown);
  await update($, mcpQueuedAtom, (list) => [...list, server]);
  $.ui.invalidate("ui.render");
  void $.command
    .run({ command: "mcp", args: `${action} ${server}` })
    .catch((error: unknown) => $.ui.toast(`/mcp ${action} ${server} failed: ${String(error)}`))
    .finally(() => finishMcp($, server));
}
