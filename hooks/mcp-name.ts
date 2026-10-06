const PLUGIN_TOOL_PREFIX = /^plugin_([^_]+)_(.+)$/;

export function mcpCommandName(toolPrefixName: string): string {
  return toolPrefixName.replace(PLUGIN_TOOL_PREFIX, "plugin:$1:$2");
}
