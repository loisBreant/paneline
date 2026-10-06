export const MS_PER_SECOND = 1000;

const SECONDS_PER_MINUTE = 60;
const TOKENS_PER_K = 1000;
const CONTROL_CHARACTERS = /\p{Cc}/gu;
const LINE_BREAK = /\r?\n|\r/;

export function singleLine(text: string): string {
  const [first = ""] = text.split(LINE_BREAK);
  return first.replace(/\t/g, " ").replace(CONTROL_CHARACTERS, "");
}

export function formatSeconds(seconds: number): string {
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s`;
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}m ${String(seconds % SECONDS_PER_MINUTE).padStart(2, "0")}s`;
}

export function formatDuration(ms: number): string {
  if (ms < MS_PER_SECOND) return `${Math.round(ms)}ms`;
  return formatSeconds(Math.round(ms / MS_PER_SECOND));
}

export function formatTokens(tokens: number): string {
  if (tokens < TOKENS_PER_K) return String(tokens);
  return `${(tokens / TOKENS_PER_K).toFixed(1).replace(/\.0$/, "")}k`;
}

export function shortModel(model: string): string {
  const [name = "", ...version] = model
    .replace(/^claude-/, "")
    .replace(/-\d{8}$/, "")
    .split("-");
  return version.length > 0 ? `${name} ${version.join(".")}` : name;
}
