type ChipColors = { background: string | undefined; text: string };

const TITLE_CHIP_TEXT = "clawd_background";
export const ENGINE_DEFAULT_GREY = "promptBorder";

const AGENT_COLORS: Record<string, string> = {
  red: "red_FOR_SUBAGENTS_ONLY",
  blue: "blue_FOR_SUBAGENTS_ONLY",
  green: "green_FOR_SUBAGENTS_ONLY",
  yellow: "yellow_FOR_SUBAGENTS_ONLY",
  purple: "purple_FOR_SUBAGENTS_ONLY",
  orange: "orange_FOR_SUBAGENTS_ONLY",
  pink: "pink_FOR_SUBAGENTS_ONLY",
  cyan: "cyan_FOR_SUBAGENTS_ONLY",
};

export function accentOf(colorName: string): string {
  return AGENT_COLORS[colorName] ?? ENGINE_DEFAULT_GREY;
}

export function chipColors(colorName: string): ChipColors {
  if (!(colorName in AGENT_COLORS)) return { background: undefined, text: ENGINE_DEFAULT_GREY };
  return { background: AGENT_COLORS[colorName], text: TITLE_CHIP_TEXT };
}
