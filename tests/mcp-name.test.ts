import { describe, expect, test } from "claude-code/testing";
import { mcpCommandName } from "../hooks/mcp-name";

describe("the MCP command name", () => {
  test("MN1 a plugin server whose plugin and server names differ is named plugin:plugin:server", () => {
    expect(["plugin_github_gh", "plugin_runpod_runpod"].map(mcpCommandName)).toEqual([
      "plugin:github:gh",
      "plugin:runpod:runpod",
    ]);
  });

  test("MN2 a _ in the server name stays whole; a _ in the plugin name, as in plugin_a_b_c, cannot be told from the server's and is not tested", () => {
    expect(mcpCommandName("plugin_github_my_server")).toBe("plugin:github:my_server");
  });

  test("MN3 hyphens in the plugin and server names stay whole", () => {
    expect(mcpCommandName("plugin_claude-code_my-server")).toBe("plugin:claude-code:my-server");
  });

  test("MN4 a plain server name stays as it is, also with _ or plugin_ inside it", () => {
    const names = ["claude-in-chrome", "my_server", "my_plugin_a_b"];

    expect(names.map(mcpCommandName)).toEqual(names);
  });

  test("MN5 a name with no plugin part or no server part (plugin_x, plugin_x_, plugin__x) is not rewritten", () => {
    const names = ["plugin_x", "plugin_x_", "plugin__x"];

    expect(names.map(mcpCommandName)).toEqual(names);
  });
});
