const FLOWCHART_ARROW = /\s*(-->|---|-\.->|-\.-|==>|===)\s*(?:\|([^|]*)\|)?\s*/;
const SPOKEN_EDGE_LABEL = /(--|==)\s+([^-=>|\n]+?)\s+(-->|==>)/;
const FLOWCHART_NON_EDGE =
  /^\s*(flowchart|graph|subgraph|end\b|classDef|class\s|style|linkStyle|direction|click|%%)/i;
const FLOWCHART_NODE = /^([\w.-]+)\s*(?:[[({]+"?(.*?)"?[\])}]+)?(?::::\w+)?$/;
const SEQUENCE_PARTICIPANT = /^\s*(?:participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/;
const SEQUENCE_MESSAGE =
  /^\s*([^\s:]+?)\s*(?:-->>|->>|-->|->|--\)|-\)|--x|-x)\s*[+-]?([^\s:]+?)\s*:\s*(.*)$/;

type Edge = { from: string; to: string; label: string };

export function textList(source: string): string[] {
  if (/^\s*sequenceDiagram\b/.test(source)) return messageLines(source);
  if (/^\s*(flowchart|graph)\b/.test(source)) return edgeLines(source);
  return [];
}

function edgeLines(source: string): string[] {
  const names = new Map<string, string>();
  const edges = source
    .split(/[\n;]/)
    .filter((line) => line.trim() !== "" && !FLOWCHART_NON_EDGE.test(line))
    .flatMap(edgesOf);
  const nameOf = (raw: string): string => {
    const [, id = raw, label] = FLOWCHART_NODE.exec(raw.trim()) ?? [];
    if (label) names.set(id, label);
    return id;
  };
  const resolved = edges.map((edge) => ({ ...edge, from: nameOf(edge.from), to: nameOf(edge.to) }));
  return resolved.map(
    ({ from, to, label }) =>
      `${names.get(from) ?? from} → ${names.get(to) ?? to}${label ? ` (${label})` : ""}`,
  );
}

function edgesOf(line: string): Edge[] {
  const parts = line.replace(SPOKEN_EDGE_LABEL, "$3|$2|").split(FLOWCHART_ARROW);
  const edges: Edge[] = [];
  for (let i = 0; i + 3 < parts.length; i += 3)
    edges.push({ from: parts[i]!, label: parts[i + 2]?.trim() ?? "", to: parts[i + 3]! });
  return edges;
}

function messageLines(source: string): string[] {
  const aliases = new Map<string, string>();
  const lines = source.split("\n");
  for (const line of lines) {
    const [, id, alias] = SEQUENCE_PARTICIPANT.exec(line) ?? [];
    if (id && alias) aliases.set(id, alias.trim());
  }
  return lines.flatMap((line) => {
    const [, from, to, text] = SEQUENCE_MESSAGE.exec(line) ?? [];
    return from && to ? [`${aliases.get(from) ?? from} → ${aliases.get(to) ?? to}: ${text}`] : [];
  });
}
