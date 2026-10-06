export type Activity = {
  id: string;
  tool: string;
  target: string;
  ms: number;
  isErrored: boolean;
  added: number;
  removed: number;
};

export type AgentEdit = Activity & { agentId: string };

export type GitChange = { target: string; added: number; removed: number; label: string };

export type CallRecord = Activity & { agentId?: string; input: string; output: string };

export type RunningCall = { callId: string; tool: string; target: string };

export type TurnStats = { reads: number; commands: number; changedFiles: number };

export type UsageSnap = { context: number | null; limits: { label: string; percent: number }[] };

export type PromptInfo = { model: string; effort: string | null; cwd: string };

export type AgentStatus = "running" | "waiting" | "idle" | "done" | "failed" | "stopped" | "killed";

export type AgentNode = {
  id: string;
  parentId?: string;
  type: string;
  description: string;
  name?: string;
  background: boolean;
  model: string;
  effort?: string;
  status: AgentStatus;
  startedAt: number;
  endedAt?: number;
  ctxTokens: number;
  tokensIn: number;
  tokensOut: number;
  running: RunningCall[];
  branch?: string;
  worktree?: string;
};

export type AgentTree = Record<string, AgentNode>;

declare module "claude-code" {
  interface PluginState {
    paneline: {
      activity: Activity[];
      agentEdits: AgentEdit[];
      gitChanges: GitChange[];
      gitBranches: Record<string, string>;
      calls: CallRecord[];
      openCall: string | null;
      running: RunningCall[];
      toolMs: StateFamily<number>;
      turnStats: StateFamily<TurnStats | null>;
      totalMs: number;
      usage: UsageSnap;
      tab: string;
      filesFolded: Record<string, boolean>;
      mcpSeen: string[];
      mcpQueued: string[];
      mcpSelected: string | null;
      agents: Record<string, AgentNode>;
      sessionUsd: number | null;
      promptInfo: PromptInfo;
      sessionColor: string;
      theme: string;
      transcriptPath: string;
    };
  }
}
