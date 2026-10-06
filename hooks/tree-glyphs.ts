const GLYPH_WIDTH = 2;

export function treeGlyphs(rows: { depth: number; isLast: boolean }[]): string[] {
  const lastAtDepth: boolean[] = [];
  return rows.map(({ depth, isLast }) => {
    lastAtDepth[depth] = isLast;
    if (depth === 0) return "";
    const guides = lastAtDepth.slice(1, depth).map((isLastAbove) => (isLastAbove ? "  " : "│ "));
    return [...guides, isLast ? "└─" : "├─"].join("");
  });
}

export function guideUnder(glyph: string, isLast: boolean): string {
  if (glyph === "") return "";
  return glyph.slice(0, -GLYPH_WIDTH) + (isLast ? "  " : "│ ");
}

export function guideBetween(glyph: string): string {
  return `${glyph.slice(0, -GLYPH_WIDTH)}│ `;
}
